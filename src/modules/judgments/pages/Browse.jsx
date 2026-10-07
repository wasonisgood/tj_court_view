import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, List, FolderTree, X } from 'lucide-react';
import { PageHeader, Select } from '../../../ui';
import { useStore } from '../../../core/StoreContext';
import { DataGate, useJudgments, STATUTES, short, PERIOD_SHORT, periodIndex } from '../data';
import CaseList, { caseHref } from '../components/CaseList';
import ExportButton from '../components/ExportButton';

const Browse = () => <DataGate><Body /></DataGate>;

const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));

const Body = () => {
  const { records, loadAllTexts } = useJudgments();
  const { annotations } = useStore();
  const [params, setParams] = useSearchParams();
  const [texts, setTexts] = useState(null);
  const [progress, setProgress] = useState(null);
  const [qInput, setQInput] = useState(params.get('q') || '');
  const f = Object.fromEntries(['statute', 'court', 'docType', 'result', 'stance', 'period', 'method', 'tag', 'q', 'view', 'sort'].map(k => [k, params.get(k) || '']));
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    setParams(n, { replace: true });
  };

  const options = useMemo(() => ({
    courts: uniq(records.map(r => r.court)),
    docTypes: uniq(records.map(r => r.docType)),
    results: uniq(records.map(r => r.result)),
    tags: uniq(Object.values(annotations).flatMap(a => a.tags || [])),
  }), [records, annotations]);

  const filtered = useMemo(() => {
    const q = f.q.trim();
    let out = records.filter(r =>
      (!f.statute || r.statutes.includes(f.statute))
      && (!f.court || r.court === f.court)
      && (!f.docType || r.docType === f.docType)
      && (!f.result || r.result === f.result)
      && (!f.stance || (f.stance === '未歸類' ? !r.coding : r.coding?.stance === f.stance))
      && (!f.period || periodIndex(r.rocYear) === Number(f.period))
      && (!f.method || r.coding?.['歸類方式'] === f.method)
      && (!f.tag || (annotations[r.id]?.tags || []).includes(f.tag)));
    if (q) {
      const terms = q.split(/\s+/);
      out = out.filter(r => {
        const hay = [r.title, r.id, r.cause, r.mainText, r.ref, ...Object.values(r.coding || {}),
          ...Object.values(r.caseAnalysis || {}).flatMap(a => Object.values(a)), annotations[r.id]?.note,
          texts ? Object.values(texts[r.id] || {}).join('') : ''].join('\n');
        return terms.every(t => hay.includes(t));
      });
    }
    return [...out].sort((a, b) => (f.sort === 'old' ? 1 : -1) * ((a.iso || '').localeCompare(b.iso || '')));
  }, [records, annotations, texts, f.statute, f.court, f.docType, f.result, f.stance, f.period, f.method, f.tag, f.q, f.sort]);

  const activeCount = ['statute', 'court', 'docType', 'result', 'stance', 'period', 'method', 'tag', 'q'].filter(k => f[k]).length;

  const loadTexts = async () => {
    setProgress(0);
    setTexts(await loadAllTexts(setProgress));
    setProgress(null);
  };

  return (
    <div>
      <PageHeader
        kicker="轉型正義裁判" title="裁判檢索"
        description="可依條例、法院、結果與研究歸類篩選。關鍵字預設檢索標題、主文、歸類說明與筆記；載入全文後可檢索判決全文。"
        actions={<ExportButton items={filtered} filename="裁判檢索結果" />}
      />

      <form className="flex gap-2 mb-4" onSubmit={e => { e.preventDefault(); set('q', qInput.trim()); }}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="field pl-9" value={qInput} onChange={e => setQInput(e.target.value)} placeholder="關鍵字，以空白分隔可同時符合多個詞（例如：釋字第477號 羈押）" />
        </div>
        <button className="btn-primary" type="submit">搜尋</button>
        {texts
          ? <span className="self-center text-xs text-green-700 whitespace-nowrap">已含全文</span>
          : <button type="button" className="btn whitespace-nowrap" onClick={loadTexts} disabled={progress !== null}>
              {progress !== null ? `載入全文 ${Math.round(progress * 100)}%` : '檢索全文'}
            </button>}
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
        <Select label="條例" value={f.statute} onChange={v => set('statute', v)} options={STATUTES.map(s => ({ value: s, label: short(s) }))} />
        <Select label="法院" value={f.court} onChange={v => set('court', v)} options={options.courts} />
        <Select label="文書類型" value={f.docType} onChange={v => set('docType', v)} options={options.docTypes} />
        <Select label="裁判結果" value={f.result} onChange={v => set('result', v)} options={options.results} />
        <Select label="研究歸類" value={f.stance} onChange={v => set('stance', v)} options={['有利', '否定', '未歸類']} />
        <Select label="時期" value={f.period} onChange={v => set('period', v)} options={PERIOD_SHORT.map((p, i) => ({ value: String(i), label: p }))} />
        <Select label="歸類方式" value={f.method} onChange={v => set('method', v)} options={['人工判讀', '規則歸類（抽樣核對）']} />
        <Select label="我的標籤" value={f.tag} onChange={v => set('tag', v)} options={options.tags} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm text-stone-600">
          符合 <b className="tabular-nums">{filtered.length.toLocaleString()}</b> 件
          {activeCount > 0 && <button className="ml-3 text-xs text-stone-500 hover:text-red-600 inline-flex items-center" onClick={() => { setQInput(''); setParams({}, { replace: true }); }}><X className="w-3 h-3 mr-0.5" />清除條件</button>}
        </div>
        <div className="flex items-center gap-2">
          <select className="field py-1 w-auto text-xs" value={f.sort} onChange={e => set('sort', e.target.value)} aria-label="排序">
            <option value="">日期新到舊</option>
            <option value="old">日期舊到新</option>
          </select>
          <div className="flex border border-stone-300 rounded-sm overflow-hidden">
            <button className={`px-2 py-1 ${f.view !== 'tree' ? 'bg-stone-800 text-white' : 'bg-white text-stone-600'}`} onClick={() => set('view', '')} title="清單"><List className="w-4 h-4" /></button>
            <button className={`px-2 py-1 ${f.view === 'tree' ? 'bg-stone-800 text-white' : 'bg-white text-stone-600'}`} onClick={() => set('view', 'tree')} title="分類樹"><FolderTree className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {f.view === 'tree' ? <Tree items={filtered} /> : <CaseList items={filtered} detail={f.q ? (r) => <Snippet r={r} q={f.q} texts={texts} /> : undefined} />}
    </div>
  );
};

const Snippet = ({ r, q, texts }) => {
  const term = q.split(/\s+/)[0];
  const sources = [r.mainText, r.coding?.['法院有利理由分析'], r.coding?.['判斷理由摘錄'], r.coding?.['案情摘要'], texts ? Object.values(texts[r.id] || {}).join('') : ''];
  for (const src of sources) {
    const i = src ? src.indexOf(term) : -1;
    if (i >= 0) {
      const s = Math.max(0, i - 40);
      return <>{s > 0 && '…'}{src.slice(s, i)}<mark>{term}</mark>{src.slice(i + term.length, i + term.length + 60)}…</>;
    }
  }
  return r.mainText;
};

// 分類樹：條例 → 文書類型 → 裁判結果（與舊版側欄相同的分組方式）
const Tree = ({ items }) => {
  const tree = useMemo(() => {
    const t = {};
    items.forEach(r => {
      ((t[r.statute] ??= {})[r.docType] ??= {})[r.result] ??= [];
      t[r.statute][r.docType][r.result].push(r);
    });
    return t;
  }, [items]);
  const order = [...STATUTES, ...Object.keys(tree).filter(k => !STATUTES.includes(k))].filter(k => tree[k]);
  return (
    <div className="space-y-3">
      {order.map(st => (
        <details key={st} className="card" open={order.length === 1}>
          <summary className="px-4 py-2.5 cursor-pointer font-medium flex justify-between">
            <span>{st}</span>
            <span className="text-sm text-stone-500 tabular-nums">{Object.values(tree[st]).flatMap(o => Object.values(o)).flat().length}</span>
          </summary>
          <div className="px-4 pb-3 space-y-2">
            {Object.entries(tree[st]).map(([dt, results]) => (
              <div key={dt} className="pl-3 border-l-2 border-stone-200">
                <div className="text-sm text-stone-700 mb-1">{dt}</div>
                {Object.entries(results).map(([res, rs]) => (
                  <details key={res} className="pl-3">
                    <summary className="text-[13px] text-stone-600 cursor-pointer py-0.5">{res} <span className="text-stone-400 tabular-nums">({rs.length})</span></summary>
                    <ul className="pl-4 py-1 space-y-0.5">
                      {rs.map(r => (
                        <li key={r.id}><Link to={caseHref(r)} className="text-[13px] text-stone-600 hover:text-brand-gold-dark">{r.title}</Link></li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
};

export default Browse;
