import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Plus, FileText } from 'lucide-react';
import { PageHeader, Empty, useDialog } from '../../../ui';
import { useStore } from '../../../core/StoreContext';
import { DataGate, useJudgments, short } from '../data';
import { caseHref, StanceTag } from '../components/CaseList';
import { usePersons } from './Persons';

const Person = () => <DataGate><Body /></DataGate>;

const LANES = {
  原判決: { color: '#57534e', label: '原有罪判決' },
  法院: { color: 'var(--color-series-1)', label: '法院裁判' },
  決定書: { color: 'var(--color-brand-gold-dark)', label: '促轉會決定' },
  公告: { color: '#a8a29e', label: '公告撤銷' },
};
const normCase = (c) => c.replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/\s+/g, '');
const yearOfCase = (c) => { const m = c.match(/^[（(]\s*(\d{2,3})/); return m ? Number(m[1]) : null; };

const Body = () => {
  const { name: raw } = useParams();
  const name = decodeURIComponent(raw);
  const { persons, error } = usePersons();
  const j = useJudgments();
  const { links, update, canEdit, user } = useStore();
  const dialog = useDialog();
  const [adding, setAdding] = useState('');
  const p = persons?.find(x => x.name === name);
  const verdicts = links?.verdicts || {};
  const manual = useMemo(() => links?.manual?.[name] || [], [links, name]);

  const events = useMemo(() => {
    if (!p) return [];
    const ev = [];
    const seenOrig = new Set();
    p.revocations.forEach(rv => {
      const key = rv.cases.map(normCase).join('、');
      if (!seenOrig.has(key)) {
        seenOrig.add(key);
        ev.push({ lane: '原判決', year: yearOfCase(rv.cases[0] || ''), title: `${rv.court.join('、')} ${rv.cases.join('、')}`, body: [rv.crime.join('、'), rv.sentence.join('、')].filter(Boolean).join('｜'), note: '依公告撤銷名冊記載' });
      }
      ev.push({ lane: '公告', year: rv.announcedYear, title: `列入促轉會公告撤銷有罪判決名冊（名冊第 ${rv.category} 類，編號 ${rv.no}）`, body: `撤銷：${rv.cases.join('、')}  ${rv.sentence.join('、')}`, note: `來源檔案：${rv.sourceFile}` });
    });
    p.decisions.forEach(id => {
      const r = j.find(id);
      if (!r) return;
      (r.origCases || []).forEach(c => {
        if ([...seenOrig].some(k => k.includes(normCase(c)))) return;
        seenOrig.add(normCase(c));
        ev.push({ lane: '原判決', year: yearOfCase(c), title: c, body: '見決定書主文', note: `依${r.caseNo}記載` });
      });
      ev.push({ lane: '決定書', year: r.rocYear, iso: r.iso, rec: r, how: ['決定書記載之當事人'] });
    });
    const courtLinks = [...p.court, ...manual.map(m => ({ id: m.id, how: [`人工加入${m.note ? '：' + m.note : ''}`], manual: true }))];
    courtLinks.forEach(c => {
      const r = j.find(c.id);
      if (r) ev.push({ lane: r.source === 'tjc' ? '決定書' : '法院', year: r.rocYear, iso: r.iso, rec: r, how: c.how, manual: c.manual, key: `${name}|${r.id}` });
    });
    return ev.sort((a, b) => (a.year ?? 999) - (b.year ?? 999) || (a.iso || '').localeCompare(b.iso || ''));
  }, [p, j, manual, name]);

  if (error) return <div className="text-red-600 text-sm">全案資料讀取失敗：{error}</div>;
  if (!persons) return <div className="py-20 text-center text-sm text-stone-400">讀取全案資料…</div>;

  const setVerdict = (key, state) => update('links', l => ({
    ...l,
    verdicts: { ...l.verdicts, [key]: state ? { state, by: user?.email || null, at: new Date().toISOString() } : undefined },
  }));

  const addManual = async (e) => {
    e.preventDefault();
    const q = adding.trim();
    const r = j.find(q) || j.records.find(x => x.caseNo && q.replace(/\s/g, '').includes(x.caseNo) && (q.includes(x.court) || !/法院|委員會/.test(q))) || j.findRef(q.replace(/\s/g, ''));
    if (!r) { await dialog.alert(`找不到「${q}」。請輸入完整案號（例如 TPCM,94,台覆,3,20050125）或簡稱（例如 94台覆3）。`); return; }
    update('links', l => ({ ...l, manual: { ...l.manual, [name]: [...(l.manual?.[name] || []).filter(m => m.id !== r.id), { id: r.id, note: '', by: user?.email || null }] } }));
    setAdding('');
  };

  const removeManual = (id) => update('links', l => ({ ...l, manual: { ...l.manual, [name]: (l.manual?.[name] || []).filter(m => m.id !== id) } }));

  if (!p && !manual.length) {
    return <div className="py-20 text-center"><p className="text-stone-500 mb-4">名冊與決定書中沒有「{name}」。</p><Link to="/judgments/persons" className="btn">回到全案追溯</Link></div>;
  }

  const years = [...new Set(events.map(e => e.year))];

  return (
    <div>
      <Link to="/judgments/persons" className="text-sm text-stone-500 hover:text-stone-800 inline-flex items-center mb-4"><ArrowLeft className="w-4 h-4 mr-1" />全案追溯</Link>
      <PageHeader
        kicker="全案" title={name}
        description={<>依年代排列此人在各制度中的紀錄。連結依據中標示「可能同名」或「同案」者尚待核對，請在每一筆右側確認或排除；排除的項目不會從資料中刪除，只會收合。</>}
      />

      <div className="flex flex-wrap gap-4 text-xs text-stone-600 mb-6">
        {Object.entries(LANES).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: v.color }} />{v.label}</span>)}
      </div>

      {!events.length ? <Empty>沒有紀錄。</Empty> : (
        <ol className="relative border-l-2 border-stone-200 ml-14 space-y-6">
          {years.map(y => (
            <li key={String(y)} className="relative">
              <div className="absolute -left-16 top-0 w-12 text-right text-xs text-stone-500 tabular-nums leading-tight">
                {y ? <>民國 {y}<br /><span className="text-stone-400">{y + 1911}</span></> : '年代不明'}
              </div>
              <div className="space-y-3 pl-6">
                {events.filter(e => e.year === y).map((e, i) => {
                  const v = e.key ? verdicts[e.key] : null;
                  const excluded = v?.state === '排除';
                  return (
                    <div key={i} className="relative">
                      <span className="absolute -left-[31px] top-3 w-3.5 h-3.5 rounded-full ring-4 ring-brand-bg" style={{ background: LANES[e.lane].color }} />
                      <div className={`card p-4 ${excluded ? 'opacity-50' : ''}`}>
                        <div className="text-[11px] text-stone-500 mb-1">{LANES[e.lane].label}{e.rec?.date && `・${e.rec.date.replace('民國 ', '')}`}</div>
                        {e.rec ? (
                          <>
                            <Link to={caseHref(e.rec)} className={`font-medium hover:text-brand-gold-dark ${excluded ? 'line-through' : ''}`}>{e.rec.title}</Link>
                            {!excluded && (
                              <>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-600">
                                  <span className="chip">{e.rec.result}</span>
                                  {e.rec.source !== 'tjc' && <span>{short(e.rec.statute)}</span>}
                                  {e.rec.coding && <StanceTag r={e.rec} />}
                                </div>
                                {e.rec.mainText && <p className="text-[13px] text-stone-700 mt-2 line-clamp-3">{e.rec.mainText}</p>}
                              </>
                            )}
                            <div className="mt-2 pt-2 border-t border-dashed border-stone-200 flex flex-wrap items-start justify-between gap-2">
                              <div className="text-[11px] text-stone-500 leading-relaxed">
                                連結依據：{e.how.join('；')}
                                {v && <span className={`ml-2 ${v.state === '確認' ? 'text-green-700' : 'text-red-600'}`}>已{v.state}{v.by && `（${v.by}）`}</span>}
                              </div>
                              {canEdit && e.key && (
                                <div className="flex gap-1 shrink-0">
                                  {e.manual
                                    ? <button className="btn text-xs py-0.5" onClick={() => removeManual(e.rec.id)}><X className="w-3 h-3" />移除</button>
                                    : <>
                                        <button className={`btn text-xs py-0.5 ${v?.state === '確認' ? 'border-green-600 text-green-700' : ''}`} onClick={() => setVerdict(e.key, v?.state === '確認' ? null : '確認')}><Check className="w-3 h-3" />確認</button>
                                        <button className={`btn text-xs py-0.5 ${excluded ? 'border-red-400 text-red-600' : ''}`} onClick={() => setVerdict(e.key, excluded ? null : '排除')}><X className="w-3 h-3" />排除</button>
                                      </>}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">{e.title}</div>
                            {e.body && <p className="text-[13px] text-stone-700 mt-1">{e.body}</p>}
                            <p className="text-[11px] text-stone-500 mt-1 flex items-center"><FileText className="w-3 h-3 mr-1" />{e.note}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}

      {canEdit && (
        <form onSubmit={addManual} className="mt-8 card p-4 flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-60">
            <span className="label">手動加入屬於此人的裁判（例如當事人姓名遭遮蔽、但已確認是同一人的冤獄賠償決定）</span>
            <input className="field" value={adding} onChange={e => setAdding(e.target.value)} placeholder="案號，例如 TPCM,94,台覆,3,20050125 或 94台覆3" />
          </label>
          <button className="btn-primary" type="submit"><Plus className="w-4 h-4" />加入</button>
        </form>
      )}
    </div>
  );
};

export default Person;
