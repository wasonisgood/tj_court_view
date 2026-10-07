import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronUp, ChevronDown, Trash2, Download, Upload, RotateCcw } from 'lucide-react';
import { useStore } from '../../core/StoreContext';
import { MODULES, orderedModules } from '../../core/modules';
import { localPref } from '../../core/backend';
import { useJudgments } from '../judgments/data';
import { PageHeader, Tabs, Section, useDialog, download, today } from '../../ui';

const SystemPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('sub') || 'site';
  const tabs = [
    { id: 'site', label: '網站資訊' },
    { id: 'modules', label: '模組顯示' },
    { id: 'access', label: '帳號與權限' },
    { id: 'backup', label: '備份與還原' },
    { id: 'data', label: '資料更新' },
    { id: 'summary', label: '摘要服務' },
  ];
  return (
    <div>
      <PageHeader title="系統設定" description="網站名稱、模組排序、編輯權限與資料備份。" />
      <Tabs tabs={tabs} value={tab} onChange={v => setParams({ sub: v }, { replace: true })} />
      {tab === 'site' && <SiteTab />}
      {tab === 'modules' && <ModulesTab />}
      {tab === 'access' && <AccessTab />}
      {tab === 'backup' && <BackupTab />}
      {tab === 'data' && <DataTab />}
      {tab === 'summary' && <SummaryTab />}
    </div>
  );
};

const useSettings = () => {
  const { settings, update, canEdit } = useStore();
  return { settings, canEdit, set: (patch) => update('settings', s => ({ ...s, ...patch })) };
};

const SiteTab = () => {
  const { settings, set, canEdit } = useSettings();
  return (
    <div className="max-w-xl space-y-4">
      <label className="block"><span className="label">網站名稱</span><input className="field" disabled={!canEdit} value={settings.siteName} onChange={e => set({ siteName: e.target.value })} /></label>
      <label className="block"><span className="label">研究室／負責人（顯示在側欄與首頁）</span><input className="field" disabled={!canEdit} value={settings.owner} onChange={e => set({ owner: e.target.value })} /></label>
    </div>
  );
};

const ModulesTab = () => {
  const { settings, set, canEdit } = useSettings();
  const mods = orderedModules(settings);
  const move = (id, dir) => {
    const order = mods.map(m => m.id);
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set({ moduleOrder: order });
  };
  const toggle = (id) => {
    const hidden = settings.hiddenModules || [];
    set({ hiddenModules: hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id] });
  };
  return (
    <div className="space-y-3 max-w-3xl">
      <p className="text-sm text-stone-600">調整側欄中各研究模組的順序與名稱，或暫時隱藏尚未整理完成的模組。新增模組需由程式登記（見 src/core/modules.js）。</p>
      {mods.map((m, i) => (
        <div key={m.id} className="card p-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-col border border-stone-200 rounded-sm">
            <button disabled={!canEdit || i === 0} onClick={() => move(m.id, -1)} className="p-1 hover:bg-stone-100 disabled:opacity-30" aria-label="上移"><ChevronUp className="w-4 h-4" /></button>
            <button disabled={!canEdit || i === mods.length - 1} onClick={() => move(m.id, 1)} className="p-1 hover:bg-stone-100 disabled:opacity-30" aria-label="下移"><ChevronDown className="w-4 h-4" /></button>
          </div>
          <m.icon className="w-5 h-5 text-brand-gold-dark" />
          <label className="flex-1 min-w-48">
            <span className="label">顯示名稱（預設：{MODULES[m.id].label}）</span>
            <input className="field" disabled={!canEdit} value={settings.moduleLabels?.[m.id] || ''} placeholder={MODULES[m.id].label}
              onChange={e => set({ moduleLabels: { ...settings.moduleLabels, [m.id]: e.target.value } })} />
          </label>
          <button disabled={!canEdit} onClick={() => toggle(m.id)} className={m.hidden ? 'btn-gold' : 'btn'}>{m.hidden ? '已隱藏，點選顯示' : '隱藏'}</button>
        </div>
      ))}
    </div>
  );
};

const AccessTab = () => {
  const { settings, set, canEdit } = useSettings();
  const { backendKind, user } = useStore();
  const [email, setEmail] = useState('');
  const add = () => {
    const e = email.trim().toLowerCase();
    if (e && !settings.allowedEmails.includes(e)) set({ allowedEmails: [...settings.allowedEmails, e] });
    setEmail('');
  };
  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-4 text-sm text-stone-700 leading-relaxed">
        {backendKind === 'firebase'
          ? <>目前使用<b>雲端同步</b>。下列 Google 帳號登入後可以修改筆記、文獻與設定；其他人只能瀏覽。{user && <>目前登入：{user.email}</>}</>
          : <>目前使用<b>本機儲存</b>：所有資料存在這台電腦的瀏覽器，沒有登入機制。若要讓老師與助理共用同一份筆記，請依 README「雲端同步」一節設定 Firebase，設定後這份名單才會生效。</>}
      </div>
      <Section title="可編輯的帳號">
        {canEdit && (
          <div className="flex gap-2 mb-3">
            <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" onKeyDown={e => e.key === 'Enter' && add()} />
            <button className="btn-primary whitespace-nowrap" onClick={add}>加入</button>
          </div>
        )}
        <ul className="card divide-y divide-stone-100">
          {settings.allowedEmails.map(e => (
            <li key={e} className="px-4 py-2 flex justify-between items-center text-sm font-mono">
              {e}
              {canEdit && <button onClick={() => set({ allowedEmails: settings.allowedEmails.filter(x => x !== e) })} className="text-stone-400 hover:text-red-600" aria-label="移除"><Trash2 className="w-4 h-4" /></button>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

const BackupTab = () => {
  const { exportBackup, replaceAll, snapshots, deleteSnapshot, snapshot, canEdit } = useStore();
  const dialog = useDialog();
  const fileRef = useRef(null);
  const restore = async (data, label) => {
    if (!(await dialog.confirm(`以「${label}」取代目前的筆記、標註、文獻、研究紀錄與設定？\n目前的資料會先自動存一份快照。`, '還原資料'))) return;
    replaceAll(data);
  };
  const importFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.format !== 'tj-research-backup') throw new Error('不是本系統的備份檔');
      await restore(data, f.name);
    } catch (err) {
      await dialog.alert('讀取失敗：' + err.message);
    }
  };
  return (
    <div className="max-w-3xl space-y-8">
      <Section title="備份檔" note="包含筆記與標註、全案連結核對、文獻清單、研究紀錄與設定；裁判資料本身不在備份內。">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => download(`研究資料備份_${today()}.json`, JSON.stringify(exportBackup(), null, 1), 'application/json')}><Download className="w-4 h-4" />下載備份</button>
          {canEdit && <button className="btn" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" />從備份檔還原</button>}
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importFile} />
        </div>
      </Section>
      <Section title="快照" note="存在這台電腦的瀏覽器，最多保留 12 份。匯入或還原前會自動建立一份。" actions={canEdit && <button className="btn" onClick={() => snapshot('手動建立')}>建立快照</button>}>
        {!snapshots.length ? <p className="text-sm text-stone-400">還沒有快照。</p> : (
          <ul className="card divide-y divide-stone-100">
            {snapshots.map(s => (
              <li key={s.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="tabular-nums text-stone-500 w-40">{s.createdAt.slice(0, 16).replace('T', ' ')}</span>
                <span className="flex-1">{s.label}</span>
                {canEdit && <button className="btn text-xs py-1" onClick={() => restore(s.data, `${s.createdAt.slice(0, 16).replace('T', ' ')} 的快照`)}><RotateCcw className="w-3.5 h-3.5" />還原</button>}
                <button className="text-stone-400 hover:text-red-600" onClick={() => deleteSnapshot(s.id)} aria-label="刪除快照"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

const DataTab = () => {
  const { meta, status } = useJudgments();
  return (
    <div className="max-w-3xl space-y-4 text-sm text-stone-700 leading-relaxed">
      <div className="card p-4">
        <h3 className="font-bold mb-2">目前發布的裁判資料</h3>
        {status === 'ready' ? (
          <dl className="grid grid-cols-[9rem_1fr] gap-y-1">
            <dt className="text-stone-500">Excel 工作檔</dt><dd>{meta.source}（{meta.sourceModified?.replace('T', ' ')}）</dd>
            <dt className="text-stone-500">建置時間</dt><dd>{meta.builtAt?.replace('T', ' ')}</dd>
            <dt className="text-stone-500">文書件數</dt><dd>{meta.total}（Excel {meta.bySource?.excel}、舊版 {meta.bySource?.legacy || 0}、促轉會 {meta.bySource?.tjc || 0}）</dd>
            <dt className="text-stone-500">全案</dt><dd>{meta.persons} 人，其中 {meta.personsLinked} 人跨來源</dd>
          </dl>
        ) : <p className="text-stone-400">讀取中…</p>}
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-2">更新步驟</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>在 judge_mcp 專案更新 Excel（或於 tw-tj-decisions 更新決定書）。</li>
          <li>把三個專案放在同一層資料夾，於本專案執行 <code className="bg-stone-100 px-1">python scripts/build_data.py</code>。</li>
          <li>確認 <code className="bg-stone-100 px-1">public/data/judgments/</code> 的變動後 commit、推送到 main，GitHub Actions 會自動部署。</li>
          <li>在「研究紀錄」記下這次更新的內容。</li>
        </ol>
      </div>
    </div>
  );
};

const SummaryTab = () => {
  const [key, setKey] = useState(() => localPref.get('geminiKey', ''));
  const builtIn = !!import.meta.env.VITE_GEMINI_API_KEY;
  return (
    <div className="max-w-2xl space-y-4 text-sm text-stone-700 leading-relaxed">
      <p>案件頁「理由」段落上方的「產生理由摘要草稿」會把理由全文送到 Google Gemini 整理成條列摘要，並標示依據段落。摘要只是閱讀輔助，頁面上會註明未經人工核對。</p>
      <p>{builtIn ? '部署時已設定 API 金鑰，可直接使用。' : '部署時未設定 API 金鑰。若要使用，可在下方填入自己的金鑰（只存在這台電腦，不會同步或備份）。'}</p>
      <label className="block">
        <span className="label">Gemini API 金鑰（選填）</span>
        <input className="field font-mono" type="password" value={key} onChange={e => { setKey(e.target.value); localPref.set('geminiKey', e.target.value); }} placeholder="AIza…" />
      </label>
    </div>
  );
};

export default SystemPage;
