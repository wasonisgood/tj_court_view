import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Section, Tabs } from '../../../ui';
import { DataGate, useJudgments, countBy, PARTY, SENIORITY, outcomeOf, typeOf, outcomeColor, FAVOR_COLOR, TJ_COLOR } from '../data';
import { HBarList } from '../components/charts';
import { caseHref, CaseListModal } from '../components/CaseList';
import { NoteBlock, RefText } from '../components/Notes';
import TypeTree from '../components/TypeTree';
import { DIMS } from '../components/treeDims';

const Special = () => <DataGate><Body /></DataGate>;

const TOPICS = [
  { id: PARTY, label: '黨產條例' },
  { id: SENIORITY, label: '年資條例' },
  { id: '政治檔案條例', label: '政治檔案條例' },
  { id: '促進轉型正義條例', label: '促轉條例' },
];

const splitTypes = (v) => (v || '').split('、').map(s => s.trim()).filter(Boolean);
// 「財團法人國家發展基金會(代表人劉曾華)」→「財團法人國家發展基金會」
const partyName = (v) => (v || '').split(/[、]/).map(s => s.replace(/[（(,，].*$/, '').trim()).filter(Boolean);

// 統計分頁中屬於某條例的區塊
const blocksFor = (notes, topic) => {
  if (topic === SENIORITY) {
    const blocks = notes['年資條例_類型統計'] || [];
    return { own: blocks.filter(b => /^[一二三四五六七八九十]+、/.test(b.heading || '')), shared: blocks.filter(b => /案件脈絡|情境說明|觀察/.test(b.heading || '')) };
  }
  const blocks = notes['政治檔案與促轉_類型統計'] || [];
  const start = blocks.findIndex(b => b.heading?.includes(topic));
  return { own: start >= 0 ? blocks.slice(start + 1, start + 3) : [], shared: blocks.filter(b => /案件脈絡|情境說明|觀察/.test(b.heading || '')) };
};

const Body = () => {
  const { records } = useJudgments();
  const [params, setParams] = useSearchParams();
  const topic = TOPICS.some(t => t.label === params.get('topic')) ? TOPICS.find(t => t.label === params.get('topic')).id : TOPICS[0].id;
  const setTopic = (id) => setParams({ topic: TOPICS.find(t => t.id === id).label }, { replace: true });
  const [list, setList] = useState(null);

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判" title="個案分析"
        description="黨產條例、年資條例、政治檔案條例與促轉條例的案件不多，爭點集中，所以逐件整理：當事人、事實、法院怎麼判、為什麼這樣判，以及同一案在各審級之間的來回。"
      />
      <Tabs tabs={TOPICS.map(t => ({ ...t, count: records.filter(r => r.caseAnalysis?.[t.id]).length }))} value={topic} onChange={setTopic} />
      {topic === PARTY ? <PartyTopic setList={setList} /> : <GenericTopic key={topic} topic={topic} setList={setList} />}
    </div>
  );
};

/* ── 黨產條例：依 Word 整理表的四大爭點分組 ───────────────────────── */

const PartyTopic = ({ setList }) => {
  const { records, notes } = useJudgments();
  const groups = notes['黨產條例_分類'] || [];
  const cases = useMemo(() => records
    .filter(r => r.caseAnalysis?.[PARTY])
    .map(r => ({ r, a: r.caseAnalysis[PARTY] }))
    .sort((x, y) => (x.r.iso || '').localeCompare(y.r.iso || '')), [records]);
  const related = useMemo(() => records.filter(r => r.statutes.includes(PARTY) && !r.caseAnalysis?.[PARTY]), [records]);

  const byGroup = groups.map(g => ({ ...g, items: cases.filter(c => c.a['分類'] === g.label) }));
  const appellants = countBy(cases, c => partyName(c.a['上訴人']));
  const results = countBy(cases, c => c.a['結果']).map(d => ({ ...d, color: outcomeColor(d.label) }));
  const winners = countBy(cases, c => c.r.favor?.who).map(d => ({ ...d, color: FAVOR_COLOR[cases.find(c => c.r.favor?.who === d.label)?.r.favor.side] }));
  const open = (title, fn) => setList({ title, items: cases.filter(fn).map(c => c.r), detail: r => r.caseAnalysis[PARTY]['理由'] });

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Section title="有利於" className="mb-0">
          <div className="card p-4"><HBarList data={winners} total={cases.length} labelWidth="w-36" onSelect={l => open(`有利於${l}`, c => c.r.favor?.who === l)} /></div>
        </Section>
        <Section title="上訴結果" className="mb-0">
          <div className="card p-4"><HBarList data={results} total={cases.length} labelWidth="w-24" onSelect={l => open(l, c => c.a['結果'] === l)} /></div>
        </Section>
        <Section title="上訴人" className="mb-0">
          <div className="card p-4"><HBarList data={appellants} labelWidth="w-48" color="var(--color-series-4)" onSelect={l => open(`上訴人：${l}`, c => partyName(c.a['上訴人']).includes(l))} /></div>
        </Section>
      </div>

      <div className="card p-4 mb-10 text-sm leading-relaxed text-stone-700">
        <table className="w-full text-[13px]">
          <thead className="text-xs text-stone-500 border-b border-stone-200">
            <tr><th className="text-left font-medium py-2">爭點</th><th className="text-right font-medium px-3">件數</th><th className="text-right font-medium px-3">上訴駁回</th><th className="text-right font-medium px-3">發回更審</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100 tabular-nums">
            {byGroup.map(g => (
              <tr key={g.label}>
                <td className="py-2"><a href={`#g-${g.label.slice(0, 1)}`} className="hover:text-brand-gold-dark">{g.label}</a></td>
                <td className="text-right px-3">{g.items.length}</td>
                <td className="text-right px-3">{g.items.filter(c => c.a['結果'] === '駁回').length}</td>
                <td className="text-right px-3">{g.items.filter(c => c.a['結果'] === '發回更審').length || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-stone-500 mt-3">編號沿用整理表；「7-1」「10-1」這類編號是同一案的再審或更審判決，放在原案之後。</p>
      </div>

      {byGroup.map(g => (
        <Section key={g.label} title={<span id={`g-${g.label.slice(0, 1)}`} className="scroll-mt-6">{g.label}<span className="ml-2 text-sm font-normal text-stone-400">{g.items.length} 件</span></span>}>
          <div className="space-y-4">
            {[...g.items].sort((x, y) => noOrder(x.a['編號']) - noOrder(y.a['編號'])).map(({ r, a }) => <PartyCard key={r.id} r={r} a={a} />)}
          </div>
        </Section>
      ))}

      {related.length > 0 && (
        <Section title="其他黨產條例相關裁判" note="最高法院民事、刑事判決及其他未列入整理表的裁判。">
          <ul className="card divide-y divide-stone-100 text-sm">
            {related.map(r => (
              <li key={r.id} className="px-4 py-2.5 flex flex-wrap justify-between gap-2">
                <Link to={caseHref(r)} className="hover:text-brand-gold-dark">{r.title}</Link>
                <span className="text-xs text-stone-500">{r.date}・{r.cause}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
};

const FavorText = ({ f }) => f ? (
  <span>
    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: FAVOR_COLOR[f.side] }} />
    {f.who}<span className="text-stone-400">（{f.side}）</span>
    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-sm text-white" style={{ background: TJ_COLOR[f.tj] }}>{f.tj}</span>
  </span>
) : null;

const noOrder = (no) => {
  const [a, b] = String(no).split('-');
  return Number(a) * 100 + Number(b || 0);
};

const PartyCard = ({ r, a }) => (
  <article className="card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div className="flex gap-3">
        <span className="font-mono text-sm text-stone-400 pt-1 w-9 shrink-0">{a['編號']}</span>
        <div>
          <Link to={caseHref(r)} className="font-serif font-bold text-lg hover:text-brand-gold-dark">{r.title}</Link>
          <div className="text-xs text-stone-500 mt-0.5">{r.date}</div>
        </div>
      </div>
      <span className="text-xs px-2 py-1 rounded-sm text-white" style={{ background: outcomeColor(a['結果']) }}>{a['結果']}</span>
    </div>
    <dl className="grid md:grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm leading-relaxed">
      <dt className="text-stone-500">有利於</dt><dd><FavorText f={r.favor} /></dd>
      <dt className="text-stone-500">上訴人</dt><dd>{a['上訴人']}</dd>
      <dt className="text-stone-500">上訴結果</dt><dd>{a['上訴結果']}</dd>
      <dt className="text-stone-500">事實</dt><dd>{a['事實簡述']}</dd>
      <dt className="text-stone-500">理由</dt><dd className="bg-stone-50 -mx-1 px-1 whitespace-pre-line">{a['理由']}</dd>
    </dl>
  </article>
);

/* ── 年資條例、政治檔案、促轉條例：Excel 個案分析分頁 ───────────────── */

const GenericTopic = ({ topic, setList }) => {
  const { records, notes } = useJudgments();
  const cases = useMemo(() => records
    .filter(r => r.caseAnalysis?.[topic])
    .map(r => ({ r, a: r.caseAnalysis[topic] }))
    .sort((x, y) => (x.r.iso || '').localeCompare(y.r.iso || '')), [records, topic]);
  const { own, shared } = blocksFor(notes, topic);

  const outcomes = countBy(cases, c => outcomeOf(c.a)).map(d => ({ ...d, color: outcomeColor(d.label) }));
  const mainTypes = countBy(cases, c => typeOf(c.a));
  const subTypes = countBy(cases, c => splitTypes(c.a['判斷類型（次）']));
  const short = topic === SENIORITY ? '年資條例' : topic;

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <Section title="勝負" className="mb-0">
          <div className="card p-4"><HBarList data={outcomes} total={cases.length} labelWidth="w-44" onSelect={l => setList({ title: l, items: cases.filter(c => outcomeOf(c.a) === l).map(c => c.r) })} /></div>
        </Section>
        <Section title="判斷類型" className="mb-0 lg:col-span-2">
          <div className="card p-4"><HBarList data={mainTypes} labelWidth="w-80" onSelect={l => setList({ title: l, items: cases.filter(c => typeOf(c.a) === l).map(c => c.r) })} /></div>
          {subTypes.length > 0 && <p className="text-xs text-stone-500 mt-2">次要判斷類型：{subTypes.map(d => `${d.label}（${d.value}）`).join('、')}</p>}
        </Section>
      </div>

      <Section title="分類樹" note="勝負 → 判斷類型，點方塊展開。">
        <TypeTree items={cases.map(c => c.r)} levels={[{ ...DIMS.outcome, get: r => outcomeOf(r.caseAnalysis[topic]) }, { ...DIMS.judgeType, get: r => typeOf(r.caseAnalysis[topic]) }]} rootLabel={`${short}（${cases.length} 件）`} initialDepth={2} onList={n => setList({ title: n.id === '__root' ? short : n.id, items: n.items })} />
      </Section>

      <Section title="逐案整理" note="依裁判日期排列。">
        <div className="space-y-4">
          {cases.map(({ r, a }) => (
            <article key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <Link to={caseHref(r)} className="font-serif font-bold text-lg hover:text-brand-gold-dark">{r.title}</Link>
                  <div className="text-xs text-stone-500 mt-0.5">{r.date}・{a['程序']}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-sm text-white" style={{ background: outcomeColor(outcomeOf(a)) }}>{outcomeOf(a)}</span>
              </div>
              <dl className="grid md:grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm leading-relaxed">
                <dt className="text-stone-500">有利於</dt><dd><FavorText f={r.favor} /></dd>
                <dt className="text-stone-500">當事人</dt>
                <dd>{a['原告／上訴人／聲請人']} <span className="text-stone-400">對</span> {a['被告／被上訴人／原決定機關']}{a['參加人'] && <span className="text-stone-500">（參加人：{a['參加人']}）</span>}</dd>
                <dt className="text-stone-500">爭議處分或請求</dt><dd>{a['爭議處分或請求']}</dd>
                <dt className="text-stone-500">裁判結果</dt><dd>{a['裁判結果']}</dd>
                <dt className="text-stone-500">主要爭執事實</dt><dd>{a['主要爭執事實']}</dd>
                <dt className="text-stone-500">法院判斷原因</dt><dd className="bg-stone-50 -mx-1 px-1">{a['法院判斷原因']}</dd>
                <dt className="text-stone-500">判斷類型</dt>
                <dd className="flex flex-wrap gap-1">
                  <span className="chip border-brand-gold/60 bg-amber-50/50">{a['判斷類型（主）']}</span>
                  {splitTypes(a['判斷類型（次）']).map(t => <span key={t} className="chip">{t}</span>)}
                </dd>
                {a['案件脈絡（前後審）'] && <><dt className="text-stone-500">前後審</dt><dd><RefText text={a['案件脈絡（前後審）']} /></dd></>}
                {a['另見'] && <><dt className="text-stone-500">另見</dt><dd><RefText text={a['另見']} /></dd></>}
              </dl>
            </article>
          ))}
        </div>
      </Section>

      {own.map(b => <Section key={b.heading} title={b.heading.replace(/^[一二三四五六七八九十]+、/, '')}><NoteBlock block={b} hideHeading /></Section>)}
      {shared.map(b => <Section key={b.heading} title={b.heading.replace(/[【】]/g, '')}><NoteBlock block={b} hideHeading /></Section>)}
    </>
  );
};

export default Special;
