import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../core/StoreContext';
import { useDialog, today } from '../../../ui';
import { DataGate, useJudgments, short } from '../data';
import { caseHref } from '../components/CaseList';
import { RefText } from '../components/Notes';
import { lawPattern } from '../components/lawMatch';
import { personHref } from './Persons';
import PrefaceCard from '../classic/PrefaceCard';
import ParagraphReader from '../classic/ParagraphReader';

// 判決閱讀頁：沿用原版「卷宗」設計（書背、逐段淡入、法官署名區、法條標註），
// 研究歸類、個案分析、研究標註與相關全案以同一套視覺語彙加在卷宗內。

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
  <div className="flex items-center mb-10">
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
  const [highlightTerm, setHighlightTerm] = useState(null);
  const [showLaws, setShowLaws] = useState(true);

  useEffect(() => {
    let alive = true;
    if (r) j.getText(r).then(s => alive && setSections(s || {})).catch(() => alive && setSections({}));
    return () => { alive = false; };
  }, [r, j]);

  const pattern = useMemo(() => (highlightTerm ? lawPattern(highlightTerm) : null), [highlightTerm]);
  const processed = useMemo(() => splitSections(sections), [sections]);
  const hits = useMemo(() => (pattern && sections ? Object.values(sections).reduce((n, t) => n + [...t.matchAll(pattern)].length, 0) : 0), [pattern, sections]);

  useEffect(() => {
    if (!highlightTerm) return;
    const t = setTimeout(() => document.querySelector('#case-book mark')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    return () => clearTimeout(t);
  }, [highlightTerm]);

  if (!r) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400">
      <i className="fas fa-balance-scale text-8xl mb-6 opacity-10"></i>
      <p className="font-classic font-bold text-lg mb-6">找不到這件裁判（{decodeURIComponent(id)}）</p>
      <Link to="/judgments/browse" className="text-xs font-bold text-brand-700 hover:text-accent-600 uppercase tracking-[0.2em]">回到裁判檢索</Link>
    </div>
  );

  const idx = j.records.indexOf(r);
  const prev = j.records[idx - 1];
  const next = j.records[idx + 1];
  const a = annotations[r.id] || {};
  const savedSummary = r.summary || a.summary;
  const saveSummary = (summary) => update('annotations', all => ({ ...all, [r.id]: { ...all[r.id], summary, summaryAt: today() } }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto md:my-4"
    >
      {/* 返回與動作列 */}
      <div className="mb-6 flex flex-wrap gap-3 justify-between items-center no-print">
        <button onClick={() => navigate(-1)} className="group flex items-center text-xs font-bold text-brand-700 hover:text-accent-600 transition-colors uppercase tracking-[0.2em]">
          <i className="fas fa-chevron-left mr-2 transform group-hover:-translate-x-1 transition-transform"></i>
          返回卷宗列表
        </button>
        <div className="flex items-center space-x-5 text-sm">
          <button disabled={!prev} onClick={() => navigate(caseHref(prev))} title={prev?.title} className="text-gray-400 hover:text-brand-900 disabled:opacity-30 transition-colors"><i className="fas fa-arrow-left mr-1"></i> 上一件</button>
          <button disabled={!next} onClick={() => navigate(caseHref(next))} title={next?.title} className="text-gray-400 hover:text-brand-900 disabled:opacity-30 transition-colors">下一件 <i className="fas fa-arrow-right ml-1"></i></button>
          {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-900 transition-colors" title="原始法學檢索連結"><i className="fas fa-link mr-1"></i> 原始卷宗</a>}
          {r.pdf && <a href={r.pdf} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-900 transition-colors"><i className="far fa-file-pdf mr-1"></i> PDF</a>}
          <button onClick={() => window.print()} className="text-gray-400 hover:text-brand-900 transition-colors"><i className="fas fa-print mr-1"></i> 列印</button>
        </div>
      </div>

      {/* 卷宗本體 */}
      <motion.div
        id="case-book"
        initial={{ scaleX: 0.95, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scaleX: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm min-h-[85vh] relative flex flex-col md:flex-row border-x border-gray-100"
      >
        <div className="hidden md:block w-1.5 bg-gradient-to-r from-gray-200 to-white absolute left-0 top-0 bottom-0 z-20"></div>
        <div className="hidden md:block w-8 bg-paper-50 absolute left-0 top-0 bottom-0 border-r border-gray-100 z-10 shadow-inner"></div>

        <div className="flex-1 p-6 md:p-16 md:pl-24 space-y-12 relative min-w-0">
          {/* 卷首 */}
          <header className="border-b-4 border-brand-900 pb-10 relative">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-brand-900 text-white text-[10px] font-black uppercase tracking-widest">{r.court}</span>
                <span className="px-2 py-1 bg-accent-100 text-accent-800 text-[10px] font-black uppercase tracking-widest border border-accent-200">{r.result}</span>
                {r.statutes.map(s => (
                  <Link key={s} to={`/judgments/browse?statute=${encodeURIComponent(s)}`} className="px-2 py-1 bg-paper-100 text-brand-700 text-[10px] font-black tracking-widest border border-brand-100 hover:border-accent-400">{short(s)}</Link>
                ))}
                {r.coding && (
                  <span className="px-2 py-1 text-white text-[10px] font-black tracking-widest" style={{ background: r.coding.stance === '有利' ? 'var(--color-favorable)' : 'var(--color-unfavorable)' }}>
                    {r.coding.stance === '有利' ? '有利聲請人' : '否定請求'}
                  </span>
                )}
                {a.starred && <span className="px-2 py-1 bg-accent-500 text-brand-950 text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-star mr-1"></i> 重點案例</span>}
              </div>

              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl md:text-5xl font-classic font-bold text-brand-900 leading-[1.15] tracking-tight"
              >
                {r.title}
              </motion.h1>

              <div className="flex flex-wrap items-center text-[11px] text-brand-400 font-sans font-bold uppercase tracking-[0.2em] gap-x-6 gap-y-2">
                {r.date && <span className="flex items-center"><i className="far fa-calendar-alt mr-2 text-accent-500"></i>{r.date}</span>}
                <span className="flex items-center"><i className="fas fa-barcode mr-2 text-accent-500"></i>{r.id}</span>
                {r.cause && <span className="flex items-center"><i className="fas fa-tag mr-2 text-accent-500"></i>{r.cause}</span>}
              </div>
            </div>
          </header>

          {/* 研究歸類與個案分析 */}
          {r.coding && <CodingCard r={r} />}
          {r.caseAnalysis && Object.entries(r.caseAnalysis).map(([st, an]) => <AnalysisCard key={st} statute={st} a={an} />)}
          {r.tables?.length > 0 && <DecisionTables tables={r.tables} />}

          {/* 本文 */}
          <main className="space-y-20">
            {!sections && <div className="py-10 text-center text-brand-300 font-classic italic">卷宗展開中…</div>}
            {sections && !processed.length && <div className="py-10 text-center text-brand-300 font-classic italic">這件裁判沒有全文資料，請參考原始卷宗。</div>}
            {processed.map(([t, c], index) => (
              <motion.section
                key={t}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: Math.min(index * 0.1, 0.3) }}
                className="relative"
              >
                <SectionTitle>{t}</SectionTitle>
                <div className="md:pl-4">
                  {t === '前置' ? <PrefaceCard text={c} /> : (
                    <ParagraphReader
                      text={c}
                      pattern={pattern}
                      sectionTitle={t}
                      savedSummary={t.includes('理由') ? savedSummary : null}
                      onSaveSummary={saveSummary}
                      canEdit={canEdit}
                    />
                  )}
                </div>
              </motion.section>
            ))}
          </main>

          {/* 引用法條標註 */}
          <AnimatePresence>
            {r.laws?.length > 0 && (
              <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-20 pt-12 border-t border-dashed border-gray-200 no-print">
                <div className="flex justify-between items-center mb-8 cursor-pointer group" onClick={() => setShowLaws(!showLaws)}>
                  <h4 className="text-xs font-black text-brand-400 uppercase tracking-widest flex items-center transition-colors group-hover:text-brand-900">
                    <i className={`fas ${showLaws ? 'fa-minus' : 'fa-plus'} mr-3 text-accent-500`}></i>
                    引用法條標註 ({r.laws.length})
                    {highlightTerm && <span className="ml-4 normal-case tracking-normal font-bold text-accent-600">全文出現 {hits} 處</span>}
                  </h4>
                  {highlightTerm && (
                    <button onClick={(e) => { e.stopPropagation(); setHighlightTerm(null); }} className="text-[10px] font-black text-rose-500 border border-rose-100 px-2 py-1 rounded hover:bg-rose-50 transition-colors uppercase tracking-widest">
                      <i className="fas fa-eraser mr-1"></i> 清除高亮
                    </button>
                  )}
                </div>
                {showLaws && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap gap-2 pb-8">
                      {r.laws.map(l => (
                        <button
                          key={l}
                          onClick={() => setHighlightTerm(l === highlightTerm ? null : l)}
                          className={`px-3 py-2 text-[11px] font-bold rounded border transition-all duration-300 ${highlightTerm === l
                            ? 'bg-accent-500 text-brand-950 border-accent-600 shadow-md transform -translate-y-1'
                            : 'bg-paper-50 text-brand-600 border-gray-100 hover:border-accent-400 hover:text-accent-600'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.footer>
            )}
          </AnimatePresence>

          {/* 研究標註與相關全案 */}
          <section className="pt-12 border-t border-dashed border-gray-200 no-print">
            <SectionTitle>研究標註</SectionTitle>
            <div className="grid md:grid-cols-[1fr_16rem] gap-8">
              <AnnotationPanel r={r} />
              <div className="space-y-6">
                {r.persons?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-3 font-sans">相關全案</p>
                    <div className="flex flex-wrap gap-2">
                      {r.persons.slice(0, 30).map(n => (
                        <Link key={n} to={personHref(n)} className="px-3 py-1.5 text-[12px] font-bold font-classic rounded border bg-paper-50 text-brand-700 border-gray-100 hover:border-accent-400 hover:text-accent-600 transition-all">{n}</Link>
                      ))}
                      {r.persons.length > 30 && <span className="text-xs text-brand-300">等 {r.persons.length} 人</span>}
                    </div>
                    <p className="text-[11px] text-brand-400 mt-2 leading-relaxed">串起此人的原判決、促轉會決定與其他裁判</p>
                  </div>
                )}
                {r.source === 'tjc' && (
                  <div>
                    <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2 font-sans">來源檔案</p>
                    <p className="text-[12px] text-brand-700 leading-relaxed">{r.sourceFile}<br /><span className="text-brand-400">行政院轉型正義業務網站公布之決定書，經 tw-tj-decisions 轉為文字</span></p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="hidden md:block w-4 bg-gradient-to-l from-black/5 to-transparent absolute right-0 top-0 bottom-0 pointer-events-none"></div>
      </motion.div>

      <div className="mt-8 text-center text-[10px] font-black text-brand-200 uppercase tracking-[1em]">
        TJ COURT VIEW ARCHIVE
      </div>
    </motion.div>
  );
};

const Field = ({ label, children }) => children ? (
  <div>
    <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-1.5 font-sans">{label}</p>
    <div className="font-classic text-brand-900 leading-relaxed text-[15px]">{children}</div>
  </div>
) : null;

const ClassicCard = ({ title, side, children, accent = 'var(--color-accent-500)' }) => (
  <div className="bg-paper-100/50 rounded-sm border border-brand-100 shadow-inner relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: accent }}></div>
    <div className="px-8 pt-6 pb-4 border-b border-brand-200/60 flex flex-wrap justify-between items-baseline gap-2">
      <span className="text-xs font-black text-accent-600 uppercase tracking-[0.4em]">{title}</span>
      {side && <span className="text-[10px] font-bold text-brand-400 tracking-widest">{side}</span>}
    </div>
    <div className="p-8 grid md:grid-cols-2 gap-x-10 gap-y-6">{children}</div>
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
  <details className="bg-paper-100/50 rounded-sm border border-brand-100 group">
    <summary className="px-8 py-5 cursor-pointer list-none flex items-center">
      <span className="text-xs font-black text-accent-600 uppercase tracking-[0.4em]">附表・參與原審判者</span>
      <i className="fas fa-chevron-right ml-auto text-[10px] text-brand-300 transition-transform group-open:rotate-90"></i>
    </summary>
    <div className="px-8 pb-8 space-y-4 overflow-x-auto">
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

  if (!canEdit) {
    return a.note
      ? <p className="font-classic text-brand-900 leading-loose whitespace-pre-line">{a.note}</p>
      : <p className="text-brand-300 font-classic italic">登入後可寫筆記與標記。</p>;
  }

  const toggleFlag = async () => {
    if (a.flag) { if (await dialog.confirm('確定撤除這件的歸類疑義？')) set({ flag: false }); return; }
    set({ flag: true, flagNote: a.flagNote || '' });
  };

  const addTag = (e) => {
    e.preventDefault();
    const t = tagInput.trim();
    if (t && !(a.tags || []).includes(t)) set({ tags: [...(a.tags || []), t] });
    setTagInput('');
  };

  const label = 'text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2 font-sans block';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => set({ starred: !a.starred })}
          className={`px-3 py-2 text-[11px] font-bold rounded border transition-all duration-300 ${a.starred ? 'bg-accent-500 text-brand-950 border-accent-600 shadow-md' : 'bg-paper-50 text-brand-600 border-gray-100 hover:border-accent-400 hover:text-accent-600'}`}
        >
          <i className={`${a.starred ? 'fas' : 'far'} fa-star mr-1.5`}></i>{a.starred ? '已標為重點' : '標為重點'}
        </button>
        <span className="w-px h-6 bg-brand-100 mx-1"></span>
        {STATUSES.map(s => (
          <button key={s} onClick={() => set({ status: s })}
            className={`px-3 py-2 text-[11px] font-bold rounded border transition-all ${(a.status || '未讀') === s ? 'bg-brand-900 text-white border-brand-900' : 'bg-paper-50 text-brand-600 border-gray-100 hover:border-brand-300'}`}>
            {s}
          </button>
        ))}
      </div>
      <label className="block">
        <span className={label}>研究筆記</span>
        <textarea
          className="w-full min-h-36 p-4 bg-paper-50 border border-brand-100 rounded-sm font-classic text-brand-900 leading-loose outline-none focus:border-accent-400 transition-colors"
          value={a.note || ''} onChange={e => set({ note: e.target.value })} placeholder="閱讀心得、可引用段落、待查事項…"
        />
      </label>
      <div>
        <span className={label}>標籤</span>
        <div className="flex flex-wrap items-center gap-2">
          {(a.tags || []).map(t => (
            <button key={t} onClick={() => set({ tags: a.tags.filter(x => x !== t) })} title="點選移除"
              className="px-3 py-1.5 text-[11px] font-bold rounded border bg-paper-50 text-brand-600 border-gray-100 hover:border-rose-200 hover:text-rose-500 transition-colors">
              {t} <i className="fas fa-times ml-1 text-[9px]"></i>
            </button>
          ))}
          <form onSubmit={addTag}>
            <input className="px-3 py-1.5 text-[12px] bg-white border border-brand-100 rounded outline-none focus:border-accent-400 w-40" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="新增標籤後按 Enter" />
          </form>
        </div>
      </div>
      {r.coding && (
        <div>
          <button onClick={toggleFlag} className={`text-[11px] font-black uppercase tracking-widest transition-colors ${a.flag ? 'text-rose-500' : 'text-brand-300 hover:text-rose-500'}`}>
            <i className="fas fa-flag mr-2"></i>{a.flag ? '已提出歸類疑義（點選撤除）' : '對歸類有疑義'}
          </button>
          {a.flag && (
            <textarea className="w-full mt-3 min-h-16 p-3 bg-rose-50/40 border border-rose-100 rounded-sm text-sm text-brand-900 outline-none focus:border-rose-300"
              value={a.flagNote || ''} onChange={e => set({ flagNote: e.target.value })} placeholder="例如：應屬「程序錯誤」而非「未盡職權調查」" />
          )}
        </div>
      )}
      {a.updatedAt && <p className="text-[10px] text-brand-300 font-mono">最後修改 {a.updatedAt.slice(0, 16).replace('T', ' ')}{a.updatedBy && ` · ${a.updatedBy}`}</p>}
    </div>
  );
};

export default CaseView;
