/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend, addSnapshot, listSnapshots, removeSnapshot, localPref } from './backend';
import { COLLECTIONS, DEFAULT_DATA, DEFAULT_SETTINGS } from './defaults';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const AUTOSAVE_DELAY = 1500;

// 舊版預設值的清理：不再顯示研究室名稱，文獻不再使用「本人著作」標籤
const RETIRED_OWNER = '李怡俐老師研究室';
const RETIRED_TAGS = ['本人著作'];
const migrate = (d) => {
  if (d.settings.owner === RETIRED_OWNER) d.settings.owner = '';
  if (Array.isArray(d.literature)) {
    d.literature = d.literature.map(l => {
      let n = l;
      if (l.tags?.some(t => RETIRED_TAGS.includes(t))) n = { ...n, tags: l.tags.filter(t => !RETIRED_TAGS.includes(t)) };
      if (l.origin === '李怡俐老師個人網站著作目錄') n = { ...n, origin: '作者個人網站著作目錄' };
      return n;
    });
  }
};

export const StoreProvider = ({ children }) => {
  const [data, setData] = useState(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dirty, setDirty] = useState(() => new Set());
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [autoSave, setAutoSaveState] = useState(() => localPref.get('autoSave', true));
  const [snapshots, setSnapshots] = useState(listSnapshots);
  const [user, setUser] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => backend.onAuth(setUser), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await backend.init();
      const loaded = {};
      for (const name of COLLECTIONS) {
        const v = await backend.load(name);
        loaded[name] = v ?? DEFAULT_DATA[name];
      }
      loaded.settings = { ...DEFAULT_SETTINGS, ...loaded.settings };
      migrate(loaded);
      if (alive) {
        setData(loaded);
        setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const canEdit = backend.kind === 'local'
    || (!!user && data.settings.allowedEmails.map(e => e.toLowerCase()).includes((user.email || '').toLowerCase()));

  const update = useCallback((name, valueOrFn) => {
    setData(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev[name]) : valueOrFn;
      return { ...prev, [name]: next };
    });
    setDirty(prev => new Set(prev).add(name));
  }, []);

  const save = useCallback(async (names) => {
    const targets = names || [...dirty];
    if (!targets.length) return true;
    setIsSyncing(true);
    setSaveError(null);
    try {
      for (const name of targets) await backend.save(name, dataRef.current[name]);
      setDirty(prev => {
        const n = new Set(prev);
        targets.forEach(t => n.delete(t));
        return n;
      });
      setLastSaved(new Date());
      return true;
    } catch (err) {
      console.error(err);
      setSaveError(err.message || String(err));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [dirty]);

  useEffect(() => {
    if (!autoSave || !dirty.size || !canEdit) return;
    const t = setTimeout(() => save(), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [autoSave, dirty, canEdit, save, data]);

  const setAutoSave = (v) => {
    setAutoSaveState(v);
    localPref.set('autoSave', v);
  };

  const snapshot = (label) => setSnapshots(addSnapshot(label, dataRef.current));
  const deleteSnapshot = (id) => setSnapshots(removeSnapshot(id));

  const replaceAll = (incoming) => {
    const next = {};
    for (const name of COLLECTIONS) next[name] = incoming[name] ?? dataRef.current[name];
    next.settings = { ...DEFAULT_SETTINGS, ...next.settings };
    migrate(next);
    snapshot('還原或匯入前自動備份');
    setData(next);
    setDirty(new Set(COLLECTIONS));
  };

  const exportBackup = () => ({
    format: 'tj-research-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...dataRef.current,
  });

  const value = useMemo(() => ({
    ...data,
    isLoading, isSyncing, saveError, lastSaved,
    hasUnsaved: dirty.size > 0,
    autoSave, setAutoSave,
    update, save,
    snapshots, snapshot, deleteSnapshot, replaceAll, exportBackup,
    user, canEdit, backendKind: backend.kind,
    login: backend.login, logout: backend.logout,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, isLoading, isSyncing, saveError, lastSaved, dirty, autoSave, snapshots, user, canEdit, update, save]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
