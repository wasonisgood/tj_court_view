import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Star, Flag, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useStore } from '../../../core/StoreContext';
import { useDialog, today } from '../../../ui';
import { DataGate, useJudgments, short } from '../data';
import { caseHref } from '../components/CaseList';
import { RefText } from '../components/Notes';
import { lawPattern } from '../components/lawMatch';
import { personHref } from './Persons';
import PrefaceCard from '../classic/PrefaceCard';
import ParagraphReader from '../classic/ParagraphReader';
import { formatPreface } from '../classic/formatPreface';

// 判決頁：右側功能欄（研究標註、相關全案、原文連結、引用法條）沿用新版；
// 左側本文的呈現沿用原版設計（前置當事人卡、段落編號、署名區、摘要卡）。

const CaseView = () => {
  const { id } = useParams();
  return <DataGate><Body key={id} /></DataGate>;
};

const STATUSES = ['未讀', '已讀', '待討論', '已確認'];

// 原版的分段處理：部分舊判決把「事實」併在主文欄位裡
const splitSections = (sections) => {
  const result = [];
  for (const [title, content] of Object.entries(sections || {})) {
    if (title === '主文' && (content.includes('事實緣') || content.includes('\n事實'))) {
      const match = content.match(/\n?\s*(事實(?:緣)?.*)/s);
      if (match) {
        const mainText = content.replace(match[0], '').trim();
        if (mainText) result.push(['主文', mainText]);
        result.push(['事實', match[1].trim()]);
        continue;
      }
    }
    result.push([title, content]);
  }
  return result;
};

const SectionTitle = ({ children }) => (
  <div className="flex items-center mb-8">
    <span className="text-xs font-black text-accent-600 uppercase tracking-[0.4em] whitespace-nowrap">{children}</span>
    <div className="ml-6 h-px bg-gradient-to-r from-gray-200 to-transparent flex-1"></div>
  </div>
);

const Body = () => {
  const { id } = useParams();
  const j = useJudgments();
  const r = j.find(decodeURIComponent(id));
  const navigate = useNavigate();
  const { annotations, update, canEdit } = useStore();
  const [sections, setSections] = useState(null);
  const [law, setLaw] = useState(null);

  useEffect(() => {
    let alive = true;
    if (r) j.getText(r).then(s => alive && setSections(s || {})).catch(() => alive && setSections({}));
    return () => { alive = false; };
  }, [r, j]);

  const pattern = useMemo(() => (law ? lawPattern(law) : null), [law]);
  const processed = useMemo(() => splitSections(sections), [sections]);
  const hits = useMemo(() => (pattern && sections ? Object.values(sections).reduce((n, t) => n + [...t.matchAll(pattern)].length, 0) : 0), [pattern, sections]);

  useEffect(() => {
    if (!law) return;
    const t = setTimeout(() => document.querySelector('#case-text mark')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    return () => clearTimeout(t);
  }, [law]);

  if (!r) {
    return (
      <div className="py-20 text-center">
        <p className="text-stone-500 mb-4">找不到這件裁判（{decodeURIComponent(id)}）。</p>
        <Link to="/judgments/browse" className="btn">回到裁判檢索</Link>
      </div>
    );
  }

  const idx = j.records.indexOf(r);
  const prev = j.records[idx - 1];
  const next = j.records[idx + 1];
  const a = annotations[r.id] || {};
  const savedSummary = r.summary || a.summary;
  const saveSummary = (summary) => update('annotations', all => ({ ...all, [r.id]: { ...all[r.id], summary, summaryAt: today() } }));

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
        <article id="case-text" className="min-w-0 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-sm border border-gray-100 p-6 md:p-12 space-y-12">
          {/* 卷首 */}
          <header className="border-b-4 border-brand-900 pb-8">
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="px-2 py-1 bg-brand-900 text-white text-[10px] font-black tracking-widest">{r.court}</span>
              <span className="px-2 py-1 bg-accent-100 text-accent-800 text-[10px] font-black tracking-widest border border-accent-200">{r.result}</span>
              {r.statutes.map(s => (
                <Link key={s} to={`/judgments/browse?statute=${encodeURIComponent(s)}`} className="px-2 py-1 bg-paper-100 text-brand-700 text-[10px] font-black tracking-widest border border-brand-100 hover:border-accent-400">{short(s)}</Link>
              ))}
              <span className="px-2 py-1 bg-paper-100 text-brand-700 text-[10px] font-black tracking-widest border border-brand-100">{r.docType}</span>
              {r.source === 'legacy' && <span className="px-2 py-1 bg-paper-100 text-brand-400 text-[10px] font-black tracking-widest border border-brand-100" title="Excel 未收錄，沿用舊版網站資料">舊版資料</span>}
              {a.starred && <span className="px-2 py-1 bg-accent-500 text-brand-950 text-[10px] font-black tracking-widest"><Star className="w-3 h-3 inline -mt-0.5 mr-1 fill-current" />重點案例</span>}
            </div>
            <h1 className="text-3xl md:text-4xl font-classic font-bold text-brand-900 leading-[1.2] tracking-tight">{r.title}</h1>
            <div className="mt-4 flex flex-wrap items-center text-[11px] text-brand-400 font-bold tracking-[0.15em] gap-x-6 gap-y-1">
              {r.date && <span>{r.date}</span>}
              {r.cause && <span>案由：{r.cause}</span>}
              <span className="font-mono tracking-normal">{r.id}</span>
            </div>
          </header>

          {r.coding && <CodingCard r={r} />}
          {r.caseAnalysis && Object.entries(r.caseAnalysis).map(([st, an]) => <AnalysisCard key={st} statute={st} a={an} />)}
          {r.tables?.length > 0 && <DecisionTables tables={r.tables} />}

          <div className="space-y-16">
            {!sections && <div className="py-10 text-center text-brand-300 font-classic italic">讀取全文…</div>}
            {sections && !processed.length && <div className="py-10 text-center text-brand-300 font-classic italic">這件裁判沒有全文資料，請參考右側原始連結。</div>}
            {processed.map(([title, text]) => (
              <section key={title}>
                <SectionTitle>{title}</SectionTitle>
                <div className="md:pl-8">
                  {title === '前置'
                    ? <PrefaceCard text={formatPreface(text, r)} />
                    : <ParagraphReader
                        text={text}
                        pattern={pattern}
                        sectionTitle={title}
                        savedSummary={title.includes('理由') ? savedSummary : null}
                        onSaveSummary={saveSummary}
                        canEdit={canEdit}
                      />}
                </div>
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

const Field = ({ label, children }) => children ? (
  <div>
    <p className="text-[10px] font-black text-brand-300 tracking-widest mb-1.5 font-sans">{label}</p>
    <div className="font-classic text-brand-900 leading-relaxed text-[15px]">{children}</div>
  </div>
) : null;

const ClassicCard = ({ title, side, children, accent = 'var(--color-accent-500)' }) => (
  <div className="bg-paper-100/50 rounded-sm border border-brand-100 shadow-inner relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: accent }}></div>
    <div className="px-6 md:px-8 pt-5 pb-3 border-b border-brand-200/60 flex flex-wrap justify-between items-baseline gap-2">
      <span className="text-xs font-black text-accent-600 tracking-[0.3em]">{title}</span>
      {side && <span className="text-[10px] font-bold text-brand-400 tracking-widest">{side}</span>}
    </div>
    <div className="p-6 md:p-8 grid md:grid-cols-2 gap-x-10 gap-y-5">{children}</div>
  </div>
);

const CodingCard = ({ r }) => {
  const c = r.coding;
  const pos = c.stance === '有利';
  return (
    <ClassicCard title={pos ? '研究歸類・有利聲請人' : '研究歸類・否定請求'} side={c['歸類方式']} accent={pos ? 'var(--color-favorable)' : 'var(--color-unfavorable)'}>
      {pos ? <>
        <Field label="案情摘要">{c['案情摘要']}</Field>
        <Field label="原處分／原決定立場">{c['原處分／原決定立場']}{c['原處分／原決定作成者'] && <span className="text-brand-400 text-sm">（{c['原處分／原決定作成者']}）</span>}</Field>
        <div className="md:col-span-2"><Field label="法院有利理由分析">{c['法院有利理由分析']}</Field></div>
        <Field label="理由類型">{c['理由類型（主）']}{c['理由類型（次）'] && <span className="text-brand-400 text-sm">；次：{c['理由類型（次）']}</span>}</Field>
        <Field label="有利結果">{c['有利結果類型']}</Field>
        <div className="md:col-span-2"><Field label="請求權基礎（裁判時法制）">{c['請求權基礎（裁判時法制）']}</Field></div>
      </> : <>
        <Field label="否定類型">{c['否定類型']}<span className="text-brand-400 text-sm">（{c['否定類型（大類）']}）</span></Field>
        <Field label="時期">{c['時期']}</Field>
        <div className="md:col-span-2"><Field label="判斷理由摘錄">{c['判斷理由摘錄']}</Field></div>
      </>}
    </ClassicCard>
  );
};

const AnalysisCard = ({ statute, a }) => (
  <ClassicCard title={`個案分析・${short(statute)}`} side={a['勝負歸類']}>
    <Field label="當事人">{[a['原告／上訴人／聲請人'], a['被告／被上訴人／原決定機關']].filter(Boolean).join(' 對 ')}</Field>
    <Field label="爭議處分或請求">{a['爭議處分或請求']}</Field>
    <div className="md:col-span-2"><Field label="主要爭執事實">{a['主要爭執事實']}</Field></div>
    <div className="md:col-span-2"><Field label="法院判斷原因">{a['法院判斷原因']}</Field></div>
    <Field label="判斷類型">{[a['判斷類型（主）'], a['判斷類型（次）']].filter(Boolean).join('；')}</Field>
    <Field label="前後審">{a['案件脈絡（前後審）'] && <RefText text={a['案件脈絡（前後審）']} />}</Field>
  </ClassicCard>
);

const DecisionTables = ({ tables }) => (
  <details className="bg-paper-100/50 rounded-sm border border-brand-100">
    <summary className="px-6 md:px-8 py-4 cursor-pointer text-xs font-black text-accent-600 tracking-[0.3em]">附表・參與原審判者（{tables.length} 表）</summary>
    <div className="px-6 md:px-8 pb-6 space-y-4 overflow-x-auto">
      {tables.map((t, i) => (
        <table key={i} className="text-sm font-classic border border-brand-200 w-full bg-white">
          <tbody>
            {t.data.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-paper-100 text-[11px] font-sans font-black text-brand-400 tracking-widest' : 'text-brand-900'}>
                {row.map((c, ci) => <td key={ci} className="border border-brand-100 px-3 py-2 align-top">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  </details>
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

export default CaseView;
