import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Star, Flag, ChevronLeft, ChevronRight, Copy, Check, Printer } from 'lucide-react';
import { useStore } from '../../../core/StoreContext';
import { localPref } from '../../../core/backend';
import { useDialog, today } from '../../../ui';
import { DataGate, useJudgments, short } from '../data';
import { caseHref } from '../components/CaseList';
import { RefText } from '../components/Notes';
import { lawPattern, splitByPattern } from '../components/lawMatch';
import { personHref } from './Persons';

const CaseView = () => {
  const { id } = useParams();
  return <DataGate><Body key={id} /></DataGate>;
};

const STATUSES = ['未讀', '已讀', '待討論', '已確認'];
const PUNCT_END = /[。！？」』)）：]$/;

// 原始資料常在句中斷行，依句末標點把行合併成段落；保留第一行的行號給摘要引用
const toParagraphs = (text) => {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let content = lines[i];
    const ids = [i];
    while (content && !PUNCT_END.test(content.trim()) && i + 1 < lines.length) {
      i++;
      content += lines[i];
      ids.push(i);
    }
    if (content.trim()) out.push({ id: ids[0], ids, content: content.trim() });
  }
  return out;
};

const Body = () => {
  const { id } = useParams();
  const j = useJudgments();
  const r = j.find(decodeURIComponent(id));
  const [sections, setSections] = useState(null);
  const [law, setLaw] = useState(null);
  const [flashPara, setFlashPara] = useState(null);
  const navigate = useNavigate();
  const readerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    if (r) j.getText(r).then(s => alive && setSections(s || {})).catch(() => alive && setSections({}));
    return () => { alive = false; };
  }, [r, j]);

  const pattern = useMemo(() => (law ? lawPattern(law) : null), [law]);
  const hits = useMemo(() => {
    if (!pattern || !sections) return 0;
    return Object.values(sections).reduce((n, t) => n + [...t.matchAll(pattern)].length, 0);
  }, [pattern, sections]);

  useEffect(() => {
    if (!law) return;
    const t = setTimeout(() => readerRef.current?.querySelector('mark')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    return () => clearTimeout(t);
  }, [law]);

  const idx = j.records.indexOf(r);
  const prev = j.records[idx - 1];
  const next = j.records[idx + 1];

  if (!r) {
    return (
      <div className="py-20 text-center">
        <p className="text-stone-500 mb-4">找不到這件裁判（{decodeURIComponent(id)}）。</p>
        <Link to="/judgments/browse" className="btn">回到裁判檢索</Link>
      </div>
    );
  }

  const jumpTo = (paraId) => {
    const el = document.getElementById(`p-${paraId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashPara(paraId);
      setTimeout(() => setFlashPara(null), 1800);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 no-print">
        <button onClick={() => navigate(-1)} className="text-sm text-stone-500 hover:text-stone-800 inline-flex items-center"><ArrowLeft className="w-4 h-4 mr-1" />返回</button>
        <div className="flex gap-1">
          <button className="btn px-2" disabled={!prev} onClick={() => navigate(caseHref(prev))} title={prev?.title}><ChevronLeft className="w-4 h-4" />上一件</button>
          <button className="btn px-2" disabled={!next} onClick={() => navigate(caseHref(next))} title={next?.title}>下一件<ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <article className="min-w-0">
          <header className="pb-5 mb-6 border-b-2 border-brand-dark">
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
              {r.statutes.map(s => <Link key={s} to={`/judgments/browse?statute=${encodeURIComponent(s)}`} className="chip hover:border-brand-gold">{short(s)}</Link>)}
              <span className="chip">{r.docType}</span>
              <span className="chip">{r.result}</span>
              {r.source === 'legacy' && <span className="chip" title="Excel 未收錄，沿用舊版網站資料">舊版資料</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-snug">{r.title}</h1>
            <div className="mt-2 text-sm text-stone-500 flex flex-wrap gap-x-5 gap-y-1">
              <span>{r.date}</span>
              {r.cause && <span>案由：{r.cause}</span>}
              <span className="font-mono text-xs self-center">{r.id}</span>
            </div>
          </header>

          {r.coding && <CodingCard r={r} />}
          {r.tables?.length > 0 && <DecisionTables tables={r.tables} />}
          {r.caseAnalysis && Object.entries(r.caseAnalysis).map(([st, a]) => <AnalysisCard key={st} statute={st} a={a} />)}

          <div ref={readerRef}>
            {!sections && <div className="py-10 text-center text-sm text-stone-400">讀取全文…</div>}
            {sections && !Object.keys(sections).length && <div className="py-10 text-center text-sm text-stone-400">這件裁判沒有全文資料，請參考右側原始連結。</div>}
            {sections && Object.entries(sections).map(([title, text]) => (
              <section key={title} className="mb-10">
                <h2 className="text-sm font-sans font-bold text-brand-gold-dark tracking-widest mb-4 pb-1 border-b border-stone-200">{title}</h2>
                {title === '前置'
                  ? <p className="reading text-[15px] text-stone-600">{text}</p>
                  : <>
                      {title.includes('理由') && <Summary r={r} paragraphs={toParagraphs(text)} onJump={jumpTo} />}
                      <div className="space-y-4">
                        {toParagraphs(text).map(p => (
                          <p key={p.id} id={title.includes('理由') ? `p-${p.id}` : undefined}
                            className={`reading transition-colors ${flashPara === p.id && title.includes('理由') ? 'bg-amber-100' : ''}`}>
                            {splitByPattern(p.content, pattern).map((seg, i) => typeof seg === 'string' ? seg : <mark key={i}>{seg.mark}</mark>)}
                          </p>
                        ))}
                      </div>
                    </>}
              </section>
            ))}
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-4 no-print">
          <AnnotationPanel r={r} />
          {r.persons?.length > 0 && (
            <div className="card p-4 text-sm">
              <h3 className="text-sm font-bold font-sans mb-1">相關全案</h3>
              <p className="text-xs text-stone-500 mb-2">此件與下列當事人的其他紀錄（原判決、促轉會決定、其他裁判）相連：</p>
              <div className="flex flex-wrap gap-1.5">
                {r.persons.slice(0, 30).map(n => <Link key={n} to={personHref(n)} className="chip hover:border-brand-gold">{n}</Link>)}
                {r.persons.length > 30 && <span className="text-xs text-stone-400">等 {r.persons.length} 人</span>}
              </div>
            </div>
          )}
          <div className="card p-4 space-y-2 text-sm">
            {r.source === 'tjc' && <p className="text-xs text-stone-600">來源檔案：{r.sourceFile}<br /><span className="text-stone-400">行政院轉型正義業務網站公布之決定書 PDF，經 tw-tj-decisions 專案轉為文字</span></p>}
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center link"><ExternalLink className="w-4 h-4 mr-2" />司法院裁判書系統原文</a>}
            {r.pdf && <a href={r.pdf} target="_blank" rel="noopener noreferrer" className="flex items-center link"><FileText className="w-4 h-4 mr-2" />下載 PDF</a>}
            <button onClick={() => window.print()} className="flex items-center link"><Printer className="w-4 h-4 mr-2" />列印本頁</button>
          </div>
          {r.laws?.length > 0 && (
            <div className="card p-4">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-sm font-bold font-sans">引用法條（{r.laws.length}）</h3>
                {law && <button className="text-xs text-stone-500 hover:text-red-600" onClick={() => setLaw(null)}>取消標示</button>}
              </div>
              {law && <p className="text-xs text-stone-500 mb-2">全文中出現 {hits} 處{hits === 0 && '（可能以其他寫法引用）'}</p>}
              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto scroll-thin">
                {r.laws.map(l => (
                  <button key={l} onClick={() => setLaw(law === l ? null : l)}
                    className={`text-xs px-2 py-1 rounded-sm border text-left ${law === l ? 'bg-brand-gold border-brand-gold text-brand-dark' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-gold'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const Row = ({ label, children }) => children ? (
  <>
    <dt className="text-stone-500">{label}</dt>
    <dd className="text-stone-800">{children}</dd>
  </>
) : null;

const CodingCard = ({ r }) => {
  const c = r.coding;
  const pos = c.stance === '有利';
  return (
    <div className="card mb-8 border-l-4" style={{ borderLeftColor: pos ? 'var(--color-favorable)' : 'var(--color-unfavorable)' }}>
      <div className="px-4 py-2.5 border-b border-stone-100 flex flex-wrap justify-between gap-2 items-baseline">
        <h3 className="text-sm font-bold font-sans">研究歸類：{pos ? '有利於聲請人／原告' : '否定請求'}</h3>
        <span className="text-xs text-stone-500">{c['歸類方式']}</span>
      </div>
      <dl className="p-4 grid sm:grid-cols-[8.5rem_1fr] gap-x-4 gap-y-2 text-sm leading-relaxed">
        {pos ? <>
          <Row label="原處分／決定者">{c['原處分／原決定作成者']}</Row>
          <Row label="案情摘要">{c['案情摘要']}</Row>
          <Row label="原處分立場">{c['原處分／原決定立場']}</Row>
          <Row label="有利理由分析">{c['法院有利理由分析']}</Row>
          <Row label="理由類型">{[c['理由類型（主）'], c['理由類型（次）'] && `次：${c['理由類型（次）']}`].filter(Boolean).join('；')}</Row>
          <Row label="有利結果">{c['有利結果類型']}</Row>
          <Row label="請求權基礎">{c['請求權基礎（裁判時法制）']}</Row>
        </> : <>
          <Row label="否定類型">{c['否定類型（大類）']}｜{c['否定類型']}</Row>
          <Row label="判斷理由摘錄">{c['判斷理由摘錄']}</Row>
          <Row label="時期">{c['時期']}</Row>
        </>}
      </dl>
    </div>
  );
};

const DecisionTables = ({ tables }) => (
  <details className="card mb-8">
    <summary className="px-4 py-2.5 cursor-pointer text-sm font-bold">附表：參與原審判之起訴者、審判者、核定者（{tables.length} 表）</summary>
    <div className="p-4 space-y-4 overflow-x-auto scroll-thin">
      {tables.map((t, i) => (
        <table key={i} className="text-xs border border-stone-200 w-full">
          <tbody>
            {t.data.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-stone-50 font-medium' : ''}>
                {row.map((c, ci) => <td key={ci} className="border border-stone-200 px-2 py-1 align-top">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  </details>
);

const AnalysisCard = ({ statute, a }) => (
  <div className="card mb-8">
    <div className="px-4 py-2.5 border-b border-stone-100 flex justify-between items-baseline">
      <h3 className="text-sm font-bold font-sans">個案分析（{short(statute)}）</h3>
      <span className="text-xs text-stone-500">{a['勝負歸類']}</span>
    </div>
    <dl className="p-4 grid sm:grid-cols-[8.5rem_1fr] gap-x-4 gap-y-2 text-sm leading-relaxed">
      <Row label="當事人">{[a['原告／上訴人／聲請人'], a['被告／被上訴人／原決定機關']].filter(Boolean).join(' 對 ')}</Row>
      <Row label="爭議處分或請求">{a['爭議處分或請求']}</Row>
      <Row label="主要爭執事實">{a['主要爭執事實']}</Row>
      <Row label="法院判斷原因">{a['法院判斷原因']}</Row>
      <Row label="判斷類型">{[a['判斷類型（主）'], a['判斷類型（次）']].filter(Boolean).join('；')}</Row>
      <Row label="前後審">{a['案件脈絡（前後審）'] && <RefText text={a['案件脈絡（前後審）']} />}</Row>
    </dl>
  </div>
);

const AnnotationPanel = ({ r }) => {
  const { annotations, update, canEdit, user } = useStore();
  const dialog = useDialog();
  const a = annotations[r.id] || {};
  const [tagInput, setTagInput] = useState('');
  const set = (patch) => update('annotations', all => ({
    ...all,
    [r.id]: { ...all[r.id], ...patch, updatedAt: new Date().toISOString(), updatedBy: user?.email || null },
  }));

  const toggleFlag = async () => {
    if (a.flag) {
      if (await dialog.confirm('確定撤除這件的歸類疑義？')) set({ flag: false });
      return;
    }
    set({ flag: true, flagNote: a.flagNote || '' });
  };

  const addTag = (e) => {
    e.preventDefault();
    const t = tagInput.trim();
    if (t && !(a.tags || []).includes(t)) set({ tags: [...(a.tags || []), t] });
    setTagInput('');
  };

  if (!canEdit) {
    return (
      <div className="card p-4 text-sm space-y-2">
        <h3 className="font-bold font-sans text-sm">研究標註</h3>
        {a.note ? <p className="whitespace-pre-line text-stone-700">{a.note}</p> : <p className="text-stone-400">登入後可寫筆記與標記。</p>}
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold font-sans text-sm">研究標註</h3>
        <button onClick={() => set({ starred: !a.starred })} className={`inline-flex items-center gap-1 text-xs ${a.starred ? 'text-brand-gold-dark' : 'text-stone-500 hover:text-brand-gold-dark'}`}>
          <Star className={`w-4 h-4 ${a.starred ? 'fill-brand-gold text-brand-gold' : ''}`} />{a.starred ? '已標為重點' : '標為重點'}
        </button>
      </div>
      <div>
        <span className="label">閱讀狀態</span>
        <div className="grid grid-cols-4 gap-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => set({ status: s })}
              className={`text-xs py-1 rounded-sm border ${(a.status || '未讀') === s ? 'bg-brand-dark text-white border-brand-dark' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}>{s}</button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="label">筆記</span>
        <textarea className="field min-h-28 leading-relaxed" value={a.note || ''} onChange={e => set({ note: e.target.value })} placeholder="閱讀心得、可引用段落、待查事項…" />
      </label>
      <div>
        <span className="label">標籤</span>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {(a.tags || []).map(t => (
            <button key={t} onClick={() => set({ tags: a.tags.filter(x => x !== t) })} className="chip hover:border-red-300 hover:text-red-600" title="點選移除">{t} ×</button>
          ))}
        </div>
        <form onSubmit={addTag} className="flex gap-1">
          <input className="field py-1" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="新增標籤後按 Enter" />
        </form>
      </div>
      {r.coding && (
        <div className="pt-2 border-t border-stone-100">
          <button onClick={toggleFlag} className={`inline-flex items-center gap-1 text-xs ${a.flag ? 'text-red-600' : 'text-stone-500 hover:text-red-600'}`}>
            <Flag className="w-3.5 h-3.5" />{a.flag ? '已提出歸類疑義（點選撤除）' : '對歸類有疑義'}
          </button>
          {a.flag && <textarea className="field mt-2 min-h-16 text-xs" value={a.flagNote || ''} onChange={e => set({ flagNote: e.target.value })} placeholder="例如：應屬「程序錯誤」而非「未盡職權調查」" />}
        </div>
      )}
      {a.updatedAt && <p className="text-[11px] text-stone-400">最後修改 {a.updatedAt.slice(0, 16).replace('T', ' ')}{a.updatedBy && `・${a.updatedBy}`}</p>}
    </div>
  );
};

const Summary = ({ r, paragraphs, onJump }) => {
  const { annotations, update, canEdit } = useStore();
  const saved = r.summary || annotations[r.id]?.summary;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localPref.get('geminiKey', '');

  const generate = async () => {
    setBusy(true);
    setError(null);
    const numbered = paragraphs.map(p => `[${p.id}] ${p.content}`).join('\n');
    const prompt = `以下是一則臺灣法院裁判的「理由」部分，每段前有段落編號。請以條列整理：當事人主張、爭點、法院判斷與理由、結論。每一點用一兩句平實的中文寫，並註明依據的段落編號。只輸出 JSON 陣列，例如 [{"point":"…","refs":[0,2]}]。\n\n${numbered}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw).filter(x => x.point);
      update('annotations', all => ({ ...all, [r.id]: { ...all[r.id], summary: parsed, summaryAt: today() } }));
    } catch (err) {
      setError('摘要產生失敗：' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(saved.map((s, i) => `${i + 1}. ${s.point}`).join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!saved) {
    if (!canEdit || !apiKey) return null;
    return (
      <div className="mb-6 no-print">
        <button className="btn text-xs" onClick={generate} disabled={busy}>{busy ? '整理中…' : '產生理由摘要草稿'}</button>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-8 bg-stone-50 border border-stone-200 rounded-sm p-4">
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="text-sm font-bold font-sans">理由摘要</h3>
        <button onClick={copy} className="text-xs text-stone-500 hover:text-stone-800 inline-flex items-center gap-1">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? '已複製' : '複製純文字'}
        </button>
      </div>
      <ol className="space-y-2 text-sm leading-relaxed list-decimal pl-5 marker:text-stone-400">
        {saved.map((s, i) => (
          <li key={i}>
            {s.point}
            {s.refs?.filter(ref => paragraphs.some(p => p.ids.includes(ref))).map(ref => {
              const p = paragraphs.find(x => x.ids.includes(ref));
              return <button key={ref} onClick={() => onJump(p.id)} className="ml-1 text-xs link">［第{paragraphs.indexOf(p) + 1}段］</button>;
            })}
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-stone-400 mt-3">此摘要由語言模型自動整理，未經人工核對，引用前請對照原文。</p>
    </div>
  );
};

export default CaseView;
