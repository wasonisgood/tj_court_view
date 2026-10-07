import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Section, Tabs } from '../../../ui';
import { DataGate, useJudgments, countBy } from '../data';
import { HBarList } from '../components/charts';
import { caseHref, CaseListModal } from '../components/CaseList';
import { NoteBlock, RefText } from '../components/Notes';
import TypeTree from '../components/TypeTree';
import { DIMS } from '../components/treeDims';

const Special = () => <DataGate><Body /></DataGate>;

const TOPICS = [
  { id: '政治檔案條例', label: '政治檔案條例' },
  { id: '促進轉型正義條例', label: '促進轉型正義條例' },
];
const OUTCOME_COLOR = { '請求人勝訴（含廢棄發回）': 'var(--color-favorable)', '一部勝訴': 'var(--color-series-3)', '請求遭駁回': 'var(--color-unfavorable)' };

const splitTypes = (v) => (v || '').split('、').map(s => s.trim()).filter(Boolean);

const Body = () => {
  const { records, notes } = useJudgments();
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [list, setList] = useState(null);
  const blocks = notes['政治檔案與促轉_類型統計'] || [];

  const cases = useMemo(() => records
    .filter(r => r.caseAnalysis?.[topic])
    .map(r => ({ r, a: r.caseAnalysis[topic] }))
    .sort((x, y) => (x.r.iso || '').localeCompare(y.r.iso || '')), [records, topic]);

  // 統計分頁的區塊順序：政治檔案（一、二）→ 促轉（一、二）→ 案件脈絡 → 情境說明 → 觀察
  const start = blocks.findIndex(b => b.heading?.includes(topic));
  const topicBlocks = start >= 0 ? blocks.slice(start + 1, start + 3) : [];
  const shared = blocks.filter(b => /案件脈絡|情境說明|觀察/.test(b.heading || ''));

  const outcomes = countBy(cases, c => c.a['勝負歸類']).map(d => ({ ...d, color: OUTCOME_COLOR[d.label] }));
  const mainTypes = countBy(cases, c => c.a['判斷類型（主）']);
  const subTypes = countBy(cases, c => splitTypes(c.a['判斷類型（次）']));

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判｜專題" title="政治檔案與促轉條例"
        description="這兩部條例的案件數量少、爭點集中，研究助理逐件撰寫個案分析：當事人、爭議處分、主要爭執事實、法院判斷原因，以及同一批檔案在各審級間的前後脈絡。"
      />
      <Tabs tabs={TOPICS.map(t => ({ ...t, count: records.filter(r => r.caseAnalysis?.[t.id]).length }))} value={topic} onChange={setTopic} />

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <Section title="勝負歸類" className="mb-0">
          <div className="card p-4"><HBarList data={outcomes} total={cases.length} labelWidth="w-36" onSelect={l => setList({ title: l, items: cases.filter(c => c.a['勝負歸類'] === l).map(c => c.r) })} /></div>
        </Section>
        <Section title="判斷類型（主）" className="mb-0 lg:col-span-2">
          <div className="card p-4"><HBarList data={mainTypes} labelWidth="w-80" onSelect={l => setList({ title: l, items: cases.filter(c => c.a['判斷類型（主）'] === l).map(c => c.r) })} /></div>
          {subTypes.length > 0 && <p className="text-xs text-stone-500 mt-2">次要判斷類型：{subTypes.map(d => `${d.label}（${d.value}）`).join('、')}</p>}
        </Section>
      </div>

      <Section title="分類樹" note="勝負歸類 → 判斷類型（主）；點方塊展開。">
        <TypeTree key={topic} items={cases.map(c => c.r)} levels={[{ ...DIMS.outcome, get: r => r.caseAnalysis[topic]['勝負歸類'] }, { ...DIMS.judgeType, get: r => r.caseAnalysis[topic]['判斷類型（主）'] }]} rootLabel={`${topic}（${cases.length} 件）`} initialDepth={2} onList={n => setList({ title: n.id === '__root' ? topic : n.id, items: n.items })} />
      </Section>

      <Section title="個案分析" note="依裁判日期排列。">
        <div className="space-y-4">
          {cases.map(({ r, a }) => (
            <article key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <Link to={caseHref(r)} className="font-serif font-bold text-lg hover:text-brand-gold-dark">{r.title}</Link>
                  <div className="text-xs text-stone-500 mt-0.5">{r.date}・{a['程序']}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-sm text-white" style={{ background: OUTCOME_COLOR[a['勝負歸類']] || '#78716c' }}>{a['勝負歸類']}</span>
              </div>
              <dl className="grid md:grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm leading-relaxed">
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

      {topicBlocks.map(b => <Section key={b.heading} title={b.heading.replace(/^[一二]、/, '')}><NoteBlock block={b} hideHeading /></Section>)}
      {shared.map(b => <Section key={b.heading} title={b.heading.replace(/[【】]/g, '')}><NoteBlock block={b} hideHeading /></Section>)}
    </div>
  );
};

export default Special;
