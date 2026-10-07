import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Menu, X, Home, NotebookPen, Settings, HelpCircle, LogIn, LogOut, Save, RefreshCw,
  AlertTriangle, Check, HardDrive, Cloud, Camera,
} from 'lucide-react';
import { useStore } from '../core/StoreContext';
import { orderedModules } from '../core/modules';
import { useDialog } from '../ui';
import HelpModal from './HelpModal';

const navCls = ({ isActive }) =>
  `flex items-center w-full px-3 py-2 rounded-sm text-sm transition-colors ${isActive
    ? 'bg-brand-gold text-brand-dark font-medium'
    : 'text-stone-300 hover:bg-stone-800 hover:text-white'}`;

const subNavCls = ({ isActive }) =>
  `block w-full pl-9 pr-3 py-1.5 rounded-sm text-[13px] transition-colors ${isActive
    ? 'text-brand-gold font-medium bg-white/5'
    : 'text-stone-400 hover:text-white hover:bg-white/5'}`;

const SyncStatus = () => {
  const { isSyncing, hasUnsaved, autoSave, saveError, canEdit } = useStore();
  if (!canEdit) return <span className="text-xs text-stone-500">唯讀</span>;
  if (saveError) return <span className="flex items-center text-xs text-red-600" title={saveError}><AlertTriangle className="w-3.5 h-3.5 mr-1" />儲存失敗</span>;
  if (isSyncing) return <span className="flex items-center text-xs text-brand-gold-dark"><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />儲存中</span>;
  if (hasUnsaved) return <span className={`flex items-center text-xs ${autoSave ? 'text-stone-500' : 'text-red-600'}`}><AlertTriangle className="w-3.5 h-3.5 mr-1" />{autoSave ? '有變更，稍後自動儲存' : '尚未儲存'}</span>;
  return <span className="flex items-center text-xs text-green-700"><Check className="w-3.5 h-3.5 mr-1" />已儲存</span>;
};

const ConsoleLayout = () => {
  const store = useStore();
  const { settings, canEdit, user, backendKind, autoSave, setAutoSave, hasUnsaved, save, snapshot } = store;
  const dialog = useDialog();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const modules = orderedModules(settings).filter(m => !m.hidden);

  useEffect(() => {
    const warn = (e) => { if (hasUnsaved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  const handleLogin = async () => {
    try {
      const u = await store.login();
      if (u && !settings.allowedEmails.map(e => e.toLowerCase()).includes(u.email.toLowerCase())) {
        await dialog.alert(`${u.email} 不在可編輯名單中，仍可瀏覽資料。如需編輯，請管理者在「系統設定」加入此帳號。`, '沒有編輯權限');
      }
    } catch (err) {
      await dialog.alert('登入失敗：' + err.message);
    }
  };

  const handleLogout = async () => {
    if (hasUnsaved && !(await dialog.confirm('還有變更尚未儲存，確定要登出嗎？'))) return;
    store.logout();
  };

  const takeSnapshot = async () => {
    snapshot('手動建立');
    await dialog.alert('已在這台電腦建立一份快照，可到「系統設定 → 備份與還原」查看或還原。', '快照已建立');
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      <div className="md:hidden bg-brand-dark text-white px-4 py-3 flex items-center justify-between">
        <span className="font-serif font-bold truncate">{settings.siteName}</span>
        <button onClick={() => setOpen(!open)} aria-label="選單">{open ? <X /> : <Menu />}</button>
      </div>

      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-dark flex flex-col transform transition-transform md:relative md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 border-b border-stone-700/60">
          <div className="font-serif text-lg font-bold text-white leading-snug">{settings.siteName}</div>
          <div className="text-xs text-stone-400 mt-1">{settings.owner}</div>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin p-3 space-y-1" onClick={e => e.target.closest('a') && setOpen(false)}>
          <NavLink to="/" end className={navCls}><Home className="w-4 h-4 mr-2.5" />首頁</NavLink>
          {modules.map(m => (
            <div key={m.id} className="pt-3">
              <div className="flex items-center px-3 pb-1 text-xs text-stone-500"><m.icon className="w-3.5 h-3.5 mr-2" />{m.label}</div>
              {m.nav.map(n => <NavLink key={n.path} to={n.path} end={n.end} className={subNavCls}>{n.label}</NavLink>)}
            </div>
          ))}
          <div className="pt-3 space-y-1">
            <NavLink to="/log" className={navCls}><NotebookPen className="w-4 h-4 mr-2.5" />研究紀錄</NavLink>
            <NavLink to="/system" className={navCls}><Settings className="w-4 h-4 mr-2.5" />系統設定</NavLink>
          </div>
        </nav>

        <div className="p-3 border-t border-stone-700/60 space-y-1 text-xs">
          <div className="flex items-center px-3 py-1.5 text-stone-500">
            {backendKind === 'firebase' ? <Cloud className="w-3.5 h-3.5 mr-2" /> : <HardDrive className="w-3.5 h-3.5 mr-2" />}
            {backendKind === 'firebase' ? (user ? user.email : '雲端同步（未登入）') : '資料存在這台電腦'}
          </div>
          <button onClick={() => setHelp(true)} className="w-full flex items-center px-3 py-1.5 text-stone-400 hover:text-white"><HelpCircle className="w-3.5 h-3.5 mr-2" />使用說明</button>
          {backendKind === 'firebase' && (user
            ? <button onClick={handleLogout} className="w-full flex items-center px-3 py-1.5 text-red-300 hover:text-red-200"><LogOut className="w-3.5 h-3.5 mr-2" />登出</button>
            : <button onClick={handleLogin} className="w-full flex items-center px-3 py-1.5 text-brand-gold hover:text-white"><LogIn className="w-3.5 h-3.5 mr-2" />以 Google 帳號登入</button>)}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="no-print bg-white border-b border-stone-200 px-4 md:px-6 py-2.5 flex items-center justify-end gap-3">
          <SyncStatus />
          {canEdit && (
            <>
              <label className="flex items-center gap-2 text-xs text-stone-500 select-none">
                <button
                  role="switch" aria-checked={autoSave} onClick={() => setAutoSave(!autoSave)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${autoSave ? 'bg-green-600' : 'bg-stone-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoSave ? 'translate-x-4' : ''}`} />
                </button>
                自動儲存
              </label>
              {!autoSave && <button onClick={() => save()} disabled={!hasUnsaved} className={hasUnsaved ? 'btn-gold' : 'btn'}><Save className="w-3.5 h-3.5" />儲存</button>}
              <button onClick={takeSnapshot} className="btn" title="在這台電腦建立目前資料的快照"><Camera className="w-3.5 h-3.5" /><span className="hidden sm:inline">快照</span></button>
            </>
          )}
        </header>
        <main className="flex-1 overflow-y-auto scroll-thin" id="main-scroll">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <HelpModal open={help} onClose={() => setHelp(false)} />
    </div>
  );
};

export default ConsoleLayout;
