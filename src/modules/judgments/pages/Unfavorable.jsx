import { useMemo, useState } from 'react';
import { PageHeader, Section, StatTile } from '../../../ui';
import { DataGate, useJudgments, countBy, PERIODS, PERIOD_SHORT } from '../data';
import { HBarList, Heatmap } from '../components/charts';
import CaseList, { CaseListModal } from '../components/CaseList';
import { NoteBlock, RefText, findBlock } from '../components/Notes';
import ExportButton from '../components/ExportButton';
import TypeTree from '../components/TypeTree';
import { DIMS } from '../components/treeDims';

const Unfavorable = () => <DataGate><Body /></DataGate>;

const detail = (r) => r.coding['判斷理由摘錄'] || r.mainText;
const GROUPS = ['程序與救濟要件', '實體要件不符', '除外或扣除事由', '金額與基數', '檢察署覆議發回'];
const GROUP_COLOR = {
  '程序與救濟要件': 'var(--color-series-2)', '實體要件不符': 'var(--color-series-1)', '除外或扣除事由': 'var(--color-series-7)',
  '金額與基數': 'var(--color-series-4)', '檢察署覆議發回': 'var(--color-series-3)',
};

const Body = () => {
  const { records, notes } = useJudgments();
  const [list, setList] = useState(null);
  const [group, setGroup] = useState('');
  const neg = useMemo(() => records.filter(r => r.coding?.stance === '否定'), [records]);
  const blocks = notes['財產型_否定類型統計'];
  const scenarios = findBlock(blocks, '情境說明');

  const s = useMemo(() => {
    const types = countBy(neg, r => r.coding['否定類型']).map(d => {
      const g = neg.find(r => r.coding['否定類型'] === d.label)?.coding['否定類型（大類）'];
      return { ...d, group: g, color: GROUP_COLOR[g] };
    });
    return {
      groups: GROUPS.map(g => ({ label: g, value: neg.filter(r => r.coding['否定類型（大類）'] === g).length, color: GROUP_COLOR[g] })),
      types,
      manual: neg.filter(r => r.coding['歸類方式'] === '人工判讀').length,
    };
  }, [neg]);

  const byType = (t) => neg.filter(r => r.coding['否定類型'] === t);
  const shown = group ? neg.filter(r => r.coding['否定類型（大類）'] === group) : neg;
  const top = s.types[0];

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判｜研究歸類" title="否定案件分析"
        description="扣除有利案件後，其餘否定聲請人／原告請求的判決及決定書。每件只取一個主類型：程序上的障礙（期間、一事不再理、管轄）優先於實體理由；同時有多個理由時，以法院據以駁回的主要理由為準。"
        actions={<ExportButton items={neg} filename="否定案件" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatTile label="否定案件" value={neg.length.toLocaleString()} sub={`判決 ${neg.filter(r => r.docType === '判決').length}、決定書 ${neg.filter(r => r.docType === '決定書').length}`} />
        <StatTile label="最常見的否定理由" value={<span className="text-lg">{top?.label}</span>} sub={`${top?.value} 件`} onClick={() => setList({ title: top.label, items: byType(top.label), detail })} />
        <StatTile label="程序上即遭駁回" value={s.groups[0].value} sub={`占 ${Math.round((s.groups[0].value / neg.length) * 100)}%`} onClick={() => setGroup(GROUPS[0])} />
        <StatTile label="人工逐件判讀" value={s.manual} sub={`其餘 ${neg.length - s.manual} 件為規則歸類後抽樣核對`} />
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
        <Section title="否定理由大類">
          <div className="card p-4"><HBarList data={s.groups} total={neg.length} labelWidth="w-32" onSelect={l => setList({ title: l, items: neg.filter(r => r.coding['否定類型（大類）'] === l), detail })} /></div>
        </Section>
        <Section title="否定類型" note="顏色對應左側大類；點選列出案件。">
          <div className="card p-4"><HBarList data={s.types} total={neg.length} labelWidth="w-72" onSelect={l => setList({ title: l, items: byType(l), detail })} /></div>
        </Section>
      </div>

      <Section title="分類樹" note="大類 → 否定類型 → 時期；點方塊逐層展開。">
        <TypeTree items={neg} levels={[{ ...DIMS.reason, color: v => GROUP_COLOR[v] }, DIMS.detail, DIMS.period]} rootLabel={`否定案件（${neg.length} 件）`} onList={n => setList({ title: n.id === '__root' ? '否定案件' : n.id, items: n.items, detail })} />
      </Section>

      <Section title="否定類型 × 時期" note="依裁判年度劃分；可看出「請求期間經過」在 94 年後成為主要障礙，「一事不再理」在 96 年後增加。">
        <div className="card p-4">
          <Heatmap
            rows={s.types.map(t => t.label)} cols={PERIODS} colLabels={PERIOD_SHORT} rowLabelWidth="w-72"
            value={(t, p) => neg.filter(r => r.coding['否定類型'] === t && r.coding['時期'] === p).length}
            onSelect={(t, p) => setList({ title: `${t}｜${PERIOD_SHORT[PERIODS.indexOf(p)]}`, items: neg.filter(r => r.coding['否定類型'] === t && r.coding['時期'] === p), detail })}
          />
        </div>
      </Section>

      <Section title="各否定類型的情境說明" note="研究助理整理的說明與代表案例；案號可點選。">
        <div className="space-y-3">
          {GROUPS.map(g => (
            <div key={g}>
              <h3 className="text-sm font-bold text-stone-600 mt-4 mb-2 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />{g}</h3>
              {(scenarios?.rows || []).slice(1).filter(r => r[0] === g).map(r => (
                <details key={r[1]} className="card mb-2">
                  <summary className="px-4 py-2.5 cursor-pointer flex justify-between gap-4">
                    <span className="font-medium text-[15px]">{r[1]}</span>
                    <span className="text-sm text-stone-500 tabular-nums">{byType(r[1]).length} 件</span>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-stone-700 leading-relaxed space-y-2">
                    <p><RefText text={(r[2] || '').replace(new RegExp('^' + r[1].replace(/[()（）]/g, '.') + '：'), '')} /></p>
                    {r[3] && <p className="text-xs text-stone-500">代表案例：<RefText text={r[3]} /></p>}
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="研究觀察">
        <NoteBlock block={findBlock(blocks, '觀察')} hideHeading />
      </Section>

      <Section
        title="案件清單"
        actions={<select className="field w-auto text-xs py-1" value={group} onChange={e => setGroup(e.target.value)} aria-label="依大類篩選">
          <option value="">全部大類</option>
          {GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>}
      >
        <CaseList items={shown} detail={(r) => <><span className="text-stone-500">［{r.coding['否定類型']}］</span>{detail(r)}</>} />
      </Section>
    </div>
  );
};

export default Unfavorable;
