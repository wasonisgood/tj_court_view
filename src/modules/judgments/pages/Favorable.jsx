import { useMemo, useState } from 'react';
import { PageHeader, Section, StatTile } from '../../../ui';
import { DataGate, useJudgments, countBy, PERIOD_SHORT, periodIndex } from '../data';
import { HBarList, Heatmap } from '../components/charts';
import CaseList, { CaseListModal } from '../components/CaseList';
import { NoteBlock, RefText, findBlock } from '../components/Notes';
import ExportButton from '../components/ExportButton';
import TypeTree from '../components/TypeTree';
import { DIMS } from '../components/treeDims';

const Favorable = () => <DataGate><Body /></DataGate>;

const detail = (r) => r.coding['法院有利理由分析'] || r.coding['案情摘要'] || r.mainText;

const Body = () => {
  const { records, notes } = useJudgments();
  const [list, setList] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const pos = useMemo(() => records.filter(r => r.coding?.stance === '有利'), [records]);
  const blocks = notes['財產型_有利類型統計'];
  const scenarios = findBlock(blocks, '情境說明');
  const scenarioOf = (type) => scenarios?.rows.find(r => r[0] === type);

  const s = useMemo(() => ({
    main: countBy(pos, r => r.coding['理由類型（主）']),
    second: countBy(pos, r => r.coding['理由類型（次）']),
    outcome: countBy(pos, r => r.coding['有利結果類型']),
    basis: countBy(pos, r => r.coding['請求權基礎（裁判時法制）']),
    manual: pos.filter(r => r.coding['歸類方式'] === '人工判讀').length,
  }), [pos]);

  const open = (field, label) => setList({ title: `${field}：${label}`, items: pos.filter(r => r.coding[field] === label), detail });

  const mainTypes = s.main.map(d => d.label);
  const shown = typeFilter ? pos.filter(r => r.coding['理由類型（主）'] === typeFilter) : pos;

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判｜研究歸類" title="有利案件分析"
        description="法院撤銷機關（含受託行使公權力之基金會）不利處分、命作成給付處分，或覆議／覆審撤銷原駁回決定、維持原准予賠償決定的案件。每件均歸納法院據以作成有利決定的主要理由與併同指摘的次要理由。"
        actions={<ExportButton items={pos} filename="有利案件" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatTile label="有利案件" value={pos.length} sub={`判決 ${pos.filter(r => r.docType === '判決').length}、決定書 ${pos.filter(r => r.docType === '決定書').length}`} />
        <StatTile label="最常見的主要理由" value={<span className="text-lg">{s.main[0]?.label}</span>} sub={`${s.main[0]?.value} 件`} onClick={() => open('理由類型（主）', s.main[0]?.label)} />
        <StatTile label="委員會自為准予賠償" value={s.outcome.find(d => d.label === '自為准予賠償')?.value || 0} sub="未發回、直接決定賠償" onClick={() => open('有利結果類型', '自為准予賠償')} />
        <StatTile label="人工逐件判讀" value={s.manual} sub={`其餘 ${pos.length - s.manual} 件為規則歸類後抽樣核對`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Section title="主要理由類型" note="法院據以作成有利決定的核心理由；點選列出案件。">
          <div className="card p-4"><HBarList data={s.main} total={pos.length} onSelect={l => open('理由類型（主）', l)} /></div>
        </Section>
        <Section title="次要理由類型" note="同一件併同指摘的其他理由（約三分之二案件沒有次要理由）。">
          <div className="card p-4"><HBarList data={s.second} color="var(--color-series-7)" onSelect={l => open('理由類型（次）', l)} /></div>
        </Section>
      </div>

      <Section title="分類樹" note="主要理由 → 次要理由 → 有利結果類型；點方塊逐層展開。">
        <TypeTree items={pos} levels={[DIMS.reason, DIMS.secondary, DIMS.detail]} rootLabel={`有利案件（${pos.length} 件）`} onList={n => setList({ title: n.id === '__root' ? '有利案件' : n.id, items: n.items, detail })} />
      </Section>

      <Section title="主要理由 × 時期" note="可看出各類理由集中在哪個法制階段；點選格子列出案件。">
        <div className="card p-4">
          <Heatmap
            rows={mainTypes} cols={PERIOD_SHORT.map((_, i) => i)} colLabels={PERIOD_SHORT}
            value={(t, i) => pos.filter(r => r.coding['理由類型（主）'] === t && periodIndex(r.rocYear) === i).length}
            onSelect={(t, i) => setList({ title: `${t}｜${PERIOD_SHORT[i]}`, items: pos.filter(r => r.coding['理由類型（主）'] === t && periodIndex(r.rocYear) === i), detail })}
          />
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-8">
        <Section title="有利結果類型">
          <div className="card p-4"><HBarList data={s.outcome} color="var(--color-series-3)" labelWidth="w-48" onSelect={l => open('有利結果類型', l)} /></div>
        </Section>
        <Section title="請求權基礎（裁判時法制）">
          <div className="card p-4"><HBarList data={s.basis} color="var(--color-series-3)" labelWidth="w-60" onSelect={l => open('請求權基礎（裁判時法制）', l)} /></div>
        </Section>
      </div>

      <Section title="各理由類型的情境說明" note="研究助理整理的說明與代表案例；案號可點選。">
        <div className="space-y-3">
          {mainTypes.map(t => {
            const row = scenarioOf(t);
            return (
              <details key={t} className="card group">
                <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-4">
                  <span className="font-medium">{t}</span>
                  <span className="text-sm text-stone-500 tabular-nums">{s.main.find(d => d.label === t)?.value} 件</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-stone-700 leading-relaxed space-y-2">
                  {row ? <p><RefText text={row[1]} /></p> : <p className="text-stone-400">（尚無情境說明）</p>}
                  {row?.[2] && <p className="text-xs text-stone-500">代表案例：<RefText text={row[2]} /></p>}
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title="請求權基礎之時代演變">
        <NoteBlock block={findBlock(blocks, '時代演變')} hideHeading />
      </Section>

      <Section title="研究觀察">
        <NoteBlock block={findBlock(blocks, '觀察')} hideHeading />
      </Section>

      <Section
        title="案件清單"
        actions={<select className="field w-auto text-xs py-1" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="依主要理由篩選">
          <option value="">全部主要理由</option>
          {mainTypes.map(t => <option key={t}>{t}</option>)}
        </select>}
      >
        <CaseList items={shown} detail={detail} />
      </Section>
    </div>
  );
};

export default Favorable;
