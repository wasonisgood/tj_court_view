import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Upload, Download, Pencil, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import { useStore } from '../../core/StoreContext';
import { PageHeader, Modal, Select, Empty, Pager, useDialog, download, today } from '../../ui';
import { useJudgments } from '../judgments/data';
import { caseHref } from '../judgments/components/CaseList';
import { TYPES, STATUSES, citation, toBibTeX, parseBibTeX, toRIS, parseRIS, toCSV, parseCSV, newId } from './formats';

const STATUS_STYLE = { 待讀: 'text-stone-500', 閱讀中: 'text-amber-700', 已讀: 'text-green-700', 已引用: 'text-sky-700' };
const EMPTY = { type: '期刊論文', title: '', authors: '', year: '', container: '', editors: '', volume: '', pages: '', publisher: '', doi: '', url: '', tags: [], status: '待讀', note: '', relatedCases: [] };

const Literature = () => {
  const { literature, update, canEdit } = useStore();
  const dialog = useDialog();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('year');
  const [editing, setEditing] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [page, setPage] = useState(0);
  const fileRef = useRef(null);

  const tags = useMemo(() => [...new Set(literature.flatMap(l => l.tags || []))].sort(), [literature]);
  const list = useMemo(() => {
    const out = literature.filter(l =>
      (!type || l.type === type) && (!status || l.status === status) && (!tag || (l.tags || []).includes(tag))
      && (!q || [l.title, l.authors, l.container, l.note, (l.tags || []).join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())));
    return out.sort((a, b) => sort === 'year' ? String(b.year).localeCompare(String(a.year)) : sort === 'title' ? a.title.localeCompare(b.title, 'zh-Hant') : (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [literature, q, type, status, tag, sort]);

  const pageSize = 20;
  const pageCount = Math.ceil(list.length / pageSize);
  const current = Math.min(page, Math.max(0, pageCount - 1));

  const save = (item) => {
    const stamped = { ...item, updatedAt: new Date().toISOString() };
    update('literature', ls => (item.id && ls.some(l => l.id === item.id) ? ls.map(l => (l.id === item.id ? stamped : l)) : [{ ...stamped, id: newId(), createdAt: today() }, ...ls]));
    setEditing(null);
  };

  const remove = async (item) => {
    if (await dialog.confirm(`確定刪除「${item.title}」？`)) update('literature', ls => ls.filter(l => l.id !== item.id));
  };

  const setStatusOf = (item, s) => update('literature', ls => ls.map(l => (l.id === item.id ? { ...l, status: s, updatedAt: new Date().toISOString() } : l)));

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const ext = file.name.split('.').pop().toLowerCase();
    const parsed = ext === 'bib' ? parseBibTeX(text) : ext === 'ris' ? parseRIS(text) : ext === 'csv' ? parseCSV(text) : [];
    if (!parsed.length) { await dialog.alert('沒有讀到任何文獻。支援 .bib（BibTeX）、.ris（EndNote／Zotero 匯出）與 .csv（本系統匯出格式）。'); return; }
    const existing = new Set(literature.map(l => l.title.trim()));
    const fresh = parsed.filter(p => !existing.has(p.title.trim()));
    if (!(await dialog.confirm(`讀到 ${parsed.length} 筆，其中 ${parsed.length - fresh.length} 筆題名與現有文獻相同將略過，新增 ${fresh.length} 筆。`, '匯入文獻'))) return;
    update('literature', ls => [...fresh.map(p => ({ ...EMPTY, ...p, id: newId(), status: p.status || '待讀', createdAt: today(), origin: `匯入自 ${file.name}` })), ...ls]);
  };

  return (
    <div>
      <PageHeader
        kicker="文獻清單" title="文獻清單"
        description="研究使用的論著、法規與大法官解釋。初始資料包含李怡俐老師個人網站上與轉型正義相關的著作，以及裁判研究中出現的主要法規與解釋；可自行新增、匯入 EndNote／Zotero 匯出檔。"
        actions={<>
          {canEdit && <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}><Plus className="w-4 h-4" />新增文獻</button>}
          {canEdit && <button className="btn" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" />匯入</button>}
          <button className="btn" onClick={() => setShowExport(true)}><Download className="w-4 h-4" />匯出</button>
          <input ref={fileRef} type="file" accept=".bib,.ris,.csv" className="hidden" onChange={importFile} />
        </>}
      />

      <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 mb-4">
        <label className="col-span-2 md:col-span-1">
          <span className="label">搜尋</span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="field pl-9" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="題名、作者、期刊、筆記" />
          </div>
        </label>
        <Select label="類型" value={type} onChange={v => { setType(v); setPage(0); }} options={TYPES} />
        <Select label="閱讀狀態" value={status} onChange={v => { setStatus(v); setPage(0); }} options={STATUSES} />
        <Select label="標籤" value={tag} onChange={v => { setTag(v); setPage(0); }} options={tags} />
        <Select label="排序" value={sort} onChange={setSort} allLabel={null} options={[{ value: 'year', label: '年份新到舊' }, { value: 'title', label: '題名' }, { value: 'updated', label: '最近修改' }]} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {STATUSES.map(s => <span key={s} className="chip">{s} {literature.filter(l => l.status === s).length}</span>)}
      </div>

      {!list.length ? <Empty>沒有符合條件的文獻。</Empty> : (
        <ul className="card divide-y divide-stone-100">
          {list.slice(current * pageSize, (current + 1) * pageSize).map(l => (
            <li key={l.id} className="px-4 py-3 group">
              <div className="flex items-start gap-3">
                <span className="chip shrink-0 mt-0.5">{l.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] leading-relaxed text-stone-800">{citation(l)}</p>
                  {l.note && <p className="text-[13px] text-stone-600 mt-1 whitespace-pre-line border-l-2 border-brand-gold/50 pl-2">{l.note}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {(l.tags || []).map(t => <button key={t} onClick={() => setTag(t)} className="chip hover:border-brand-gold">{t}</button>)}
                    {(l.relatedCases || []).map(id => <RelatedCase key={id} id={id} />)}
                    {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs link inline-flex items-center"><ExternalLink className="w-3 h-3 mr-0.5" />連結</a>}
                    {l.origin && <span className="text-[11px] text-stone-400">來源：{l.origin}</span>}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {canEdit
                    ? <select value={l.status || '待讀'} onChange={e => setStatusOf(l, e.target.value)} className={`text-xs bg-transparent border-0 p-0 ${STATUS_STYLE[l.status] || ''}`} aria-label="閱讀狀態">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    : <span className={`text-xs ${STATUS_STYLE[l.status] || ''}`}>{l.status}</span>}
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                    <CopyButton text={citation(l)} />
                    {canEdit && <button onClick={() => setEditing({ ...EMPTY, ...l })} className="p-1 text-stone-500 hover:text-stone-800" title="編輯"><Pencil className="w-3.5 h-3.5" /></button>}
                    {canEdit && <button onClick={() => remove(l)} className="p-1 text-stone-500 hover:text-red-600" title="刪除"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={current} pageCount={pageCount} onChange={setPage} total={list.length} />

      {editing && <EditForm item={editing} onSave={save} onClose={() => setEditing(null)} tags={tags} />}
      <Modal open={showExport} onClose={() => setShowExport(false)} title={`匯出文獻（目前篩選 ${list.length} 筆）`}>
        <div className="grid gap-2">
          <button className="btn justify-start" onClick={() => download(`文獻清單_${today()}.bib`, toBibTeX(list))}>BibTeX（.bib）— Zotero、LaTeX</button>
          <button className="btn justify-start" onClick={() => download(`文獻清單_${today()}.ris`, toRIS(list))}>RIS（.ris）— EndNote、Zotero</button>
          <button className="btn justify-start" onClick={() => download(`文獻清單_${today()}.csv`, toCSV(list), 'text/csv;charset=utf-8')}>CSV（.csv）— Excel</button>
          <button className="btn justify-start" onClick={() => download(`參考文獻_${today()}.txt`, list.map(citation).join('\n'))}>引註文字（.txt）— 可貼入論文的參考文獻</button>
        </div>
      </Modal>
    </div>
  );
};

const RelatedCase = ({ id }) => {
  const { find, status } = useJudgments();
  const r = status === 'ready' ? find(id) : null;
  return r ? <Link to={caseHref(r)} className="chip hover:border-brand-gold">{r.ref || r.caseNo}</Link> : <span className="chip">{id}</span>;
};

const CopyButton = ({ text }) => {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); })} className="p-1 text-stone-500 hover:text-stone-800" title="複製引註">
      {done ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const EditForm = ({ item, onSave, onClose, tags }) => {
  const [f, setF] = useState(item);
  const [tagInput, setTagInput] = useState('');
  const [caseInput, setCaseInput] = useState('');
  const j = useJudgments();
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const field = (k, label, props = {}) => (
    <label className={props.wide ? 'col-span-2' : ''}>
      <span className="label">{label}</span>
      <input className="field" value={f[k] || ''} onChange={e => set(k, e.target.value)} placeholder={props.placeholder} />
    </label>
  );
  const addCase = () => {
    const v = caseInput.trim();
    const r = j.find(v) || j.findRef(v.replace(/\s/g, ''));
    if (r && !(f.relatedCases || []).includes(r.id)) set('relatedCases', [...(f.relatedCases || []), r.id]);
    setCaseInput('');
  };
  return (
    <Modal
      open onClose={onClose} wide title={item.id ? '編輯文獻' : '新增文獻'}
      footer={<><button className="btn" onClick={onClose}>取消</button><button className="btn-primary" disabled={!f.title.trim()} onClick={() => onSave(f)}>儲存</button></>}
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Select label="類型" value={f.type} onChange={v => set('type', v)} options={TYPES} allLabel={null} />
        <Select label="閱讀狀態" value={f.status} onChange={v => set('status', v)} options={STATUSES} allLabel={null} />
        {field('title', '題名', { wide: true })}
        {field('authors', '作者', { placeholder: '多位作者以分號分隔' })}
        {field('year', '年份')}
        {field('container', f.type === '期刊論文' ? '期刊名稱' : '書名／會議名稱', { wide: true })}
        {field('editors', '編者')}
        {field('publisher', '出版者')}
        {field('volume', '卷期')}
        {field('pages', '頁碼')}
        {field('doi', 'DOI')}
        {field('url', '網址')}
        <div className="col-span-2">
          <span className="label">標籤</span>
          <div className="flex flex-wrap gap-1 mb-1">
            {(f.tags || []).map(t => <button key={t} onClick={() => set('tags', f.tags.filter(x => x !== t))} className="chip hover:text-red-600">{t} ×</button>)}
          </div>
          <input className="field" list="lit-tags" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = tagInput.trim(); if (t && !(f.tags || []).includes(t)) set('tags', [...(f.tags || []), t]); setTagInput(''); } }}
            placeholder="輸入後按 Enter" />
          <datalist id="lit-tags">{tags.map(t => <option key={t} value={t} />)}</datalist>
        </div>
        <div className="col-span-2">
          <span className="label">相關裁判</span>
          <div className="flex flex-wrap gap-1 mb-1">
            {(f.relatedCases || []).map(id => <button key={id} onClick={() => set('relatedCases', f.relatedCases.filter(x => x !== id))} className="chip hover:text-red-600">{j.find(id)?.ref || id} ×</button>)}
          </div>
          <div className="flex gap-2">
            <input className="field" value={caseInput} onChange={e => setCaseInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCase(); } }} placeholder="案號，例如 94台覆3 或 TPAA,111,上,420,20231116,1" />
            <button className="btn" type="button" onClick={addCase}>加入</button>
          </div>
        </div>
        <label className="col-span-2">
          <span className="label">筆記</span>
          <textarea className="field min-h-28" value={f.note || ''} onChange={e => set('note', e.target.value)} />
        </label>
      </div>
    </Modal>
  );
};

export default Literature;
