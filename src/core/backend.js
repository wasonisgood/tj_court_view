// 儲存後端：預設存在本機瀏覽器（localStorage）；若建置時提供 VITE_FIREBASE_CONFIG，
// 改用 Firestore 並以 Google 帳號登入（與 yi-lee-site 相同的做法）。
// 每個資料集（settings / annotations / literature / log）各存成一份文件。

const PREFIX = 'tjrs:';

const parseFirebaseConfig = () => {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!raw) return null;
  try {
    const cfg = JSON.parse(raw);
    return cfg.apiKey && cfg.projectId ? cfg : null;
  } catch {
    console.warn('VITE_FIREBASE_CONFIG 不是有效的 JSON，改用本機儲存');
    return null;
  }
};

export const firebaseConfig = parseFirebaseConfig();
export const backendKind = firebaseConfig ? 'firebase' : 'local';

const readLocal = (name) => {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLocal = (name, value) => {
  localStorage.setItem(PREFIX + name, JSON.stringify(value));
};

const localBackend = {
  kind: 'local',
  async init() {},
  async load(name) { return readLocal(name); },
  async save(name, value) { writeLocal(name, value); },
  onAuth(cb) { cb(null); return () => {}; },
  async login() { return null; },
  async logout() {},
};

// Firebase 只在有設定時才載入，避免本機模式下載整個 SDK
const createFirebaseBackend = () => {
  let fs, authApi, db, auth;
  const collectionName = import.meta.env.VITE_FIREBASE_COLLECTION || 'research_hub';
  const ready = (async () => {
    const [{ initializeApp }, firestore, authMod] = await Promise.all([
      import('firebase/app'), import('firebase/firestore'), import('firebase/auth'),
    ]);
    const app = initializeApp(firebaseConfig);
    fs = firestore;
    authApi = authMod;
    db = firestore.getFirestore(app);
    auth = authMod.getAuth(app);
  })();

  return {
    kind: 'firebase',
    async init() { await ready; },
    async load(name) {
      await ready;
      try {
        const snap = await fs.getDoc(fs.doc(db, collectionName, name));
        const data = snap.exists() ? snap.data().value : null;
        if (data !== null) writeLocal(name, data); // 留一份本機副本，離線時仍可閱讀
        return data;
      } catch (err) {
        console.warn(`讀取雲端資料 ${name} 失敗，改用本機副本`, err);
        return readLocal(name);
      }
    },
    async save(name, value) {
      await ready;
      writeLocal(name, value);
      await fs.setDoc(fs.doc(db, collectionName, name), { value, updatedAt: new Date().toISOString() });
    },
    onAuth(cb) {
      let unsub = () => {};
      ready.then(() => { unsub = authApi.onAuthStateChanged(auth, cb); });
      return () => unsub();
    },
    async login() {
      await ready;
      const res = await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider());
      return res.user;
    },
    async logout() {
      await ready;
      await authApi.signOut(auth);
    },
  };
};

export const backend = firebaseConfig ? createFirebaseBackend() : localBackend;

// 快照只存在本機，作為誤刪時的復原點
const SNAP_KEY = PREFIX + 'snapshots';
export const listSnapshots = () => readLocal('snapshots') || [];
export const addSnapshot = (label, data) => {
  const list = [{ id: Date.now(), label, createdAt: new Date().toISOString(), data }, ...listSnapshots()].slice(0, 12);
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(list));
  } catch {
    // 空間不足時只保留最近三份
    localStorage.setItem(SNAP_KEY, JSON.stringify(list.slice(0, 3)));
  }
  return list;
};
export const removeSnapshot = (id) => {
  const list = listSnapshots().filter(s => s.id !== id);
  localStorage.setItem(SNAP_KEY, JSON.stringify(list));
  return list;
};

// 只存在這台電腦的個人設定（例如摘要服務的 API 金鑰），不會同步到雲端
export const localPref = {
  get(key, fallback = null) {
    const v = readLocal('pref:' + key);
    return v === null ? fallback : v;
  },
  set(key, value) { writeLocal('pref:' + key, value); },
};
