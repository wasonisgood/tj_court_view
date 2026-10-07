import { useMemo, useState } from 'react';
import { PageHeader, Section, Tabs } from '../../../ui';
import { DataGate, useJudgments, STATUTES, short, countBy } from '../data';
import { HBarList } from '../components/charts';
import { CaseListModal } from '../components/CaseList';

const Courts = () => <DataGate><Body /></DataGate>;

// 主文常因標點或「一、」編號不同而被當成不同句子，比對前先去掉
const normMain = (t) => (t || '（無主文）').replace(/^[一二三四五六七八九十]+、/, '').replace(/[。．\s]+$/g, '').slice(0, 60);

const Body = () => {
  const { records } = useJudgments();
  const [statute, setStatute] = useState(STATUTES[0]);
  const [list, setList] = useState(null);

  const courts = useMemo(() => {
    const rs = records.filter(r => r.statutes.includes(statute));
    const by = {};
    rs.forEach(r => (by[r.court] ??= []).push(r));
    return Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([court, items]) => ({
      court, items,
      results: countBy(items, r => r.result),
      mains: countBy(items, r => normMain(r.mainText)).slice(0, 6),
    }));
  }, [records, statute]);

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判" title="法院與裁判結果"
        description="依條例檢視各法院的裁判結果分布與常見主文（原儀表板功能）。點選長條或主文可列出案件。"
      />
      <Tabs tabs={STATUTES.map(s => ({ id: s, label: short(s), count: records.filter(r => r.statutes.includes(s)).length }))} value={statute} onChange={setStatute} />
      <Section title={statute}>
        <div className="grid xl:grid-cols-2 gap-5">
          {courts.map(c => (
            <div key={c.court} className="card">
              <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-baseline">
                <h3 className="font-bold">{c.court}</h3>
                <span className="text-sm text-stone-500 tabular-nums">{c.items.length} 件</span>
              </div>
              <div className="p-4 space-y-5">
                <div>
                  <div className="text-xs text-stone-500 mb-2">裁判結果</div>
                  <HBarList data={c.results} total={c.items.length} labelWidth="w-28"
                    onSelect={l => setList({ title: `${c.court}｜${l}`, items: c.items.filter(r => r.result === l) })} />
                </div>
                <div>
                  <div className="text-xs text-stone-500 mb-2">常見主文</div>
                  <ul className="space-y-1">
                    {c.mains.map(m => (
                      <li key={m.label}>
                        <button
                          onClick={() => setList({ title: `${c.court}｜${m.label}`, items: c.items.filter(r => normMain(r.mainText) === m.label) })}
                          className="w-full flex justify-between gap-3 text-left text-[13px] px-2 py-1.5 rounded-sm bg-stone-50 hover:bg-amber-50"
                        >
                          <span className="text-stone-700 line-clamp-2">{m.label}</span>
                          <span className="tabular-nums text-stone-500 shrink-0">{m.value}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default Courts;
