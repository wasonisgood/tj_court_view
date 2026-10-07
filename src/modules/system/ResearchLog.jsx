import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../../core/StoreContext';
import { MODULES } from '../../core/modules';
import { PageHeader, Modal, Select, Empty, useDialog, today } from '../../ui';

const STATUSES = ['進行中', '完成', '待核對', '待討論'];
const STATUS_COLOR = { 進行中: 'text-amber-700', 完成: 'text-green-700', 待核對: 'text-sky-700', 待討論: 'text-red-600' };

const ResearchLog = () => {
  const { log, update, canEdit, user } = useStore();
  const dialog = useDialog();
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');
  const entries = [...log].filter(e => !filter || e.module === filter).sort((a, b) => b.date.localeCompare(a.date));

  const save = (e) => {
    update('log', l => (l.some(x => x.id === e.id) ? l.map(x => (x.id === e.id ? e : x)) : [{ ...e, id: 'log-' + Date.now() }, ...l]));
    setEditing(null);
  };
  const remove = async (e) => { if (await dialog.confirm(`刪除「${e.title}」這筆紀錄？`)) update('log', l => l.filter(x => x.id !== e.id)); };

  return (
    <div>
      <PageHeader
        title="研究紀錄"
        description="研究進度、資料更新與待討論事項的流水帳。資料重新整理或歸類有變動時，在這裡記一筆，方便日後回溯每個數字是什麼時候、怎麼來的。"
        actions={canEdit && <button className="btn-primary" onClick={() => setEditing({ date: today(), module: 'judgments', title: '', body: '', status: '進行中', by: user?.email || '' })}><Plus className="w-4 h-4" />新增紀錄</button>}
      />
      <div className="max-w-xs mb-4">
        <Select label="模組" value={filter} onChange={setFilter} options={[...Object.values(MODULES).map(m => ({ value: m.id, label: m.label })), { value: 'general', label: '一般' }]} />
      </div>
      {!entries.length ? <Empty>還沒有紀錄。</Empty> : (
        <ol className="relative border-l-2 border-stone-200 ml-3 space-y-5">
          {entries.map(e => (
            <li key={e.id} className="pl-6 relative group">
              <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-brand-gold ring-4 ring-brand-bg" />
              <div className="text-xs text-stone-500 tabular-nums">{e.date}・{MODULES[e.module]?.label || '一般'}{e.by && `・${e.by}`}</div>
              <div className="flex items-start gap-3">
                <h3 className="text-base font-bold flex-1">{e.title} <span className={`text-xs font-sans font-normal ml-1 ${STATUS_COLOR[e.status] || ''}`}>{e.status}</span></h3>
                {canEdit && (
                  <span className="flex gap-1 opacity-50 group-hover:opacity-100">
                    <button className="p-1 text-stone-500 hover:text-stone-800" onClick={() => setEditing(e)} title="編輯"><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="p-1 text-stone-500 hover:text-red-600" onClick={() => remove(e)} title="刪除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                )}
              </div>
              {e.body && <p className="text-sm text-stone-700 leading-relaxed mt-1 whitespace-pre-line">{e.body}</p>}
            </li>
          ))}
        </ol>
      )}
      {editing && <LogForm entry={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
};

const LogForm = ({ entry, onSave, onClose }) => {
  const [f, setF] = useState(entry);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal open onClose={onClose} title={entry.id ? '編輯紀錄' : '新增紀錄'}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn-primary" disabled={!f.title.trim()} onClick={() => onSave(f)}>儲存</button></>}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label><span className="label">日期</span><input type="date" className="field" value={f.date} onChange={e => set('date', e.target.value)} /></label>
        <Select label="狀態" value={f.status} onChange={v => set('status', v)} options={STATUSES} allLabel={null} />
        <div className="col-span-2"><Select label="模組" value={f.module} onChange={v => set('module', v)} allLabel={null} options={[...Object.values(MODULES).map(m => ({ value: m.id, label: m.label })), { value: 'general', label: '一般' }]} /></div>
        <label className="col-span-2"><span className="label">標題</span><input className="field" value={f.title} onChange={e => set('title', e.target.value)} /></label>
        <label className="col-span-2"><span className="label">內容</span><textarea className="field min-h-32" value={f.body} onChange={e => set('body', e.target.value)} /></label>
      </div>
    </Modal>
  );
};

export default ResearchLog;
