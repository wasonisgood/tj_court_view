import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Section, StatTile } from '../../../ui';
import { DataGate, useJudgments, STATUTES, STATUTE_COLOR, short, PERIOD_SHORT, periodIndex } from '../data';
import { StackedYears, SplitBars, RatioLine } from '../components/charts';
import { CaseListModal } from '../components/CaseList';

const Overview = () => <DataGate><Body /></DataGate>;

const Body = () => {
  const { records, meta } = useJudgments();
  const [list, setList] = useState(null);

  const s = useMemo(() => {
    const coded = records.filter(r => r.coding);
    const pos = coded.filter(r => r.coding.stance === '有利');
    const manual = coded.filter(r => r.coding['歸類方式'] === '人工判讀').length;
    const years = {};
    records.forEach(r => {
      if (!r.rocYear) return;
      years[r.rocYear] ??= { year: r.rocYear };
      years[r.rocYear][r.statute] = (years[r.rocYear][r.statute] || 0) + 1;
    });
    const minY = Math.min(...Object.keys(years).map(Number));
    const maxY = Math.max(...Object.keys(years).map(Number));
    const yearData = [];
    for (let y = minY; y <= maxY; y++) yearData.push(years[y] || { year: y });

    const byStatute = STATUTES.map(st => {
      const c = coded.filter(r => (r.coding.codingStatute || r.statute) === st);
      return { label: short(st), full: st, pos: c.filter(r => r.coding.stance === '有利').length, neg: c.filter(r => r.coding.stance === '否定').length };
    }).filter(r => r.pos + r.neg);

    const byPeriod = PERIOD_SHORT.map((label, i) => {
      const c = coded.filter(r => periodIndex(r.rocYear) === i);
      return { label, ratio: c.length ? c.filter(r => r.coding.stance === '有利').length / c.length : null, n: c.length };
    }).filter(p => p.n);

    const table = STATUTES.map(st => {
      const rs = records.filter(r => r.statutes.includes(st));
      return {
        st, total: rs.length,
        判決: rs.filter(r => r.docType === '判決').length,
        決定書: rs.filter(r => r.docType === '決定書').length,
        裁定: rs.filter(r => r.docType === '裁定').length,
        coded: rs.filter(r => r.coding).length,
        analysis: rs.filter(r => r.caseAnalysis).length,
      };
    });
    return { coded, pos, manual, yearData, byStatute, byPeriod, table };
  }, [records]);

  const series = STATUTES.map(st => ({ key: st, name: short(st), color: STATUTE_COLOR[st] }));

  return (
    <div>
      <CaseListModal state={list} onClose={() => setList(null)} />
      <PageHeader
        kicker="轉型正義裁判"
        title="研究成果總覽"
        description={<>資料來源為研究助理整理的「{meta.source}」（{meta.sourceModified?.replace('T', ' ')} 版），包含七部條例的法院判決、裁定與司法院刑事補償法庭（原冤獄賠償覆議委員會）決定書。</>}
        actions={<Link to="/judgments/browse" className="btn-primary">進入裁判檢索</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatTile label="收錄裁判" value={records.length.toLocaleString()} sub={`全文 ${meta.withText?.toLocaleString()} 件`} />
        <StatTile label="已完成有利／否定歸類" value={s.coded.length.toLocaleString()} sub={`占 ${Math.round((s.coded.length / records.length) * 100)}%，其中人工判讀 ${s.manual} 件`} />
        <StatTile label="有利於聲請人／原告" value={s.pos.length.toLocaleString()} sub={`占已歸類 ${((s.pos.length / s.coded.length) * 100).toFixed(1)}%`} onClick={() => setList({ title: '有利於聲請人／原告', items: s.pos })} />
        <StatTile label="逐件個案分析" value={records.filter(r => r.caseAnalysis).length} sub="政治檔案條例、促轉條例" onClick={() => setList({ title: '個案分析案件', items: records.filter(r => r.caseAnalysis) })} />
      </div>

      <Section title="裁判年度分布" note="依裁判日期（民國年）統計，顏色代表所屬條例；點選年度可列出當年案件。">
        <div className="card p-4">
          <StackedYears
            data={s.yearData} series={series}
            onSelect={(y) => setList({ title: `民國 ${y} 年裁判`, items: records.filter(r => r.rocYear === Number(y)) })}
          />
        </div>
        <p className="text-xs text-stone-500 mt-2">93 至 95 年度的高峰，對應戒嚴回復條例第 6 條第 2 項五年請求期間（至 94 年 2 月 4 日）屆滿前後湧入的冤獄賠償覆議案件。</p>
      </Section>

      <div className="grid lg:grid-cols-2 gap-8">
        <Section title="各條例有利比例" note="僅計入已歸類案件（財產型請求）；點選色段可列出案件。">
          <div className="card p-4">
            <SplitBars
              rows={s.byStatute}
              onSelect={(label, stance) => {
                const full = s.byStatute.find(r => r.label === label)?.full;
                setList({ title: `${label}｜${stance}`, items: s.coded.filter(r => (r.coding.codingStatute || r.statute) === full && r.coding.stance === stance) });
              }}
            />
          </div>
        </Section>
        <Section title="各時期有利比例" note="時期依裁判年度劃分，對應請求權基礎的法制變動。">
          <div className="card p-4">
            <RatioLine data={s.byPeriod} average={s.pos.length / s.coded.length} />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-2 text-[11px] text-stone-500 text-center tabular-nums">
              {s.byPeriod.map(p => <span key={p.label}>{p.label}<br />n={p.n}</span>)}
            </div>
          </div>
        </Section>
      </div>

      <Section title="各條例收錄情形" note="同一件裁判可能同時出現在兩部條例的檢索結果中，故各列加總會略多於總件數。">
        <div className="card overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="text-left font-medium px-4 py-2">條例</th>
                {['合計', '判決', '決定書', '裁定', '已歸類', '個案分析'].map(h => <th key={h} className="text-right font-medium px-3 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {s.table.map(t => (
                <tr key={t.st} className="hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <Link to={`/judgments/browse?statute=${encodeURIComponent(t.st)}`} className="flex items-center gap-2 hover:text-brand-gold-dark">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STATUTE_COLOR[t.st] }} />{t.st}
                    </Link>
                  </td>
                  {[t.total, t.判決, t.決定書, t.裁定, t.coded, t.analysis].map((v, i) => <td key={i} className="text-right px-3 py-2 tabular-nums text-stone-700">{v || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default Overview;
