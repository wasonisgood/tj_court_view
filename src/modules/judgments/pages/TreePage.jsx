import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../ui';
import { DataGate, useJudgments } from '../data';
import TypeTree from '../components/TypeTree';
import { CaseListModal } from '../components/CaseList';
import { DIMS, PRESETS, levelsOf } from '../components/treeDims';

const TreePage = () => <DataGate><Body /></DataGate>;

const detailOf = (r) => r.coding?.['法院有利理由分析'] || r.coding?.['判斷理由摘錄'] || Object.values(r.caseAnalysis || {})[0]?.['法院判斷原因'] || r.mainText;

const Body = () => {
  const { records } = useJudgments();
  const [params, setParams] = useSearchParams();
  const presetId = params.get('preset') || 'coding';
  const preset = PRESETS.find(p => p.id === presetId) || PRESETS[0];
  const [custom, setCustom] = useState(null);
  const [list, setList] = useState(null);
  const dims = custom || preset.dims;

  const items = useMemo(() => records.filter(preset.filter), [records, preset]);
  const levels = useMemo(() => levelsOf(dims), [dims]);

  const choosePreset = (id) => { setCustom(null); setParams({ preset: id }, { replace: true }); };
  const setDim = (i, d) => {
    const next = [...dims];
    if (d) next[i] = d; else next.splice(i, 1);
    setCustom(next.filter(Boolean));
  };

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判" title="分類樹"
        description="把研究歸類以樹狀展開：從最上層的分類一路點下去，看每一類底下還分成哪些情形、各有幾件，最後列出案件。可以選用預設的分類方式，或自行調整每一層。"
      />
      <div className="card p-4 mb-6 space-y-3">
        <label className="block">
          <span className="label">分類方式</span>
          <select className="field" value={preset.id} onChange={e => choosePreset(e.target.value)}>
            {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <div>
          <span className="label">各層（可調整）</span>
          <div className="flex flex-wrap items-center gap-2">
            {[...dims, ''].slice(0, 5).map((d, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-stone-400">→</span>}
                <select className="field w-auto py-1 text-xs" value={d} onChange={e => setDim(i, e.target.value)} aria-label={`第 ${i + 1} 層`}>
                  <option value="">{i < dims.length ? '（移除此層）' : '＋ 加一層'}</option>
                  {Object.entries(DIMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </span>
            ))}
          </div>
        </div>
      </div>
      <TypeTree
        key={dims.join('|') + preset.id}
        items={items} levels={levels} rootLabel={`${preset.label.split('：')[0]}（${items.length} 件）`}
        onList={(node) => setList({ title: node.id === '__root' ? '全部' : node.id, items: node.items, detail: detailOf })}
      />
    </div>
  );
};

export default TreePage;
