import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceLine,
} from 'recharts';

const fmt = (n) => n.toLocaleString('zh-TW');
const pct = (n) => `${(n * 100).toFixed(1)}%`;

/** 水平長條清單：單一序列一律用同一色；數值直接標示，點擊可列出案件 */
export const HBarList = ({ data, color = 'var(--color-series-1)', onSelect, max, total, labelWidth = 'w-56' }) => {
  const top = max ?? Math.max(1, ...data.map(d => d.value));
  return (
    <ul className="space-y-1.5">
      {data.map(d => {
        const Row = onSelect ? 'button' : 'div';
        return (
          <li key={d.label}>
            <Row
              onClick={onSelect ? () => onSelect(d.label) : undefined}
              title={`${d.label}：${fmt(d.value)} 件${total ? `（${pct(d.value / total)}）` : ''}`}
              className={`w-full flex items-center gap-3 text-left group ${onSelect ? 'cursor-pointer' : ''}`}
            >
              <span className={`${labelWidth} shrink-0 text-[13px] text-stone-700 leading-snug ${onSelect ? 'group-hover:text-brand-gold-dark' : ''}`}>{d.label}</span>
              <span className="flex-1 h-3.5 bg-stone-100 rounded-r-[4px] overflow-hidden">
                <span className="block h-full rounded-r-[4px] transition-opacity group-hover:opacity-80" style={{ width: `${(d.value / top) * 100}%`, background: d.color || color }} />
              </span>
              <span className="w-20 shrink-0 text-right text-[13px] tabular-nums text-stone-700">
                {fmt(d.value)}{total ? <span className="text-stone-400 text-xs ml-1">{Math.round((d.value / total) * 100)}%</span> : null}
              </span>
            </Row>
          </li>
        );
      })}
    </ul>
  );
};

/** 有利／否定比例條：兩段之間留 2px 間隙，數字標在段內或旁邊 */
export const SplitBars = ({ rows, onSelect }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-4 text-xs text-stone-600 mb-1">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'var(--color-favorable)' }} />有利於聲請人／原告</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'var(--color-unfavorable)' }} />否定請求</span>
    </div>
    {rows.map(r => {
      const total = r.pos + r.neg;
      if (!total) return null;
      return (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 text-[13px] text-stone-700">{r.label}</span>
          <div className="flex-1 flex h-5 gap-[2px]">
            {r.pos > 0 && (
              <button
                onClick={() => onSelect?.(r.label, '有利')} title={`${r.label}｜有利 ${fmt(r.pos)} 件（${pct(r.pos / total)}）`}
                className="h-full rounded-l-[4px] hover:opacity-80" style={{ width: `${(r.pos / total) * 100}%`, background: 'var(--color-favorable)' }}
              />
            )}
            {r.neg > 0 && (
              <button
                onClick={() => onSelect?.(r.label, '否定')} title={`${r.label}｜否定 ${fmt(r.neg)} 件（${pct(r.neg / total)}）`}
                className="h-full rounded-r-[4px] hover:opacity-80" style={{ width: `${(r.neg / total) * 100}%`, background: 'var(--color-unfavorable)' }}
              />
            )}
          </div>
          <span className="w-36 shrink-0 text-right text-xs tabular-nums text-stone-600">
            有利 {pct(r.pos / total)}<span className="text-stone-400">（{fmt(r.pos)}／{fmt(total)}）</span>
          </span>
        </div>
      );
    })}
  </div>
);

const ChartTooltip = ({ active, payload, label, unit = '件', labelFmt }) => {
  if (!active || !payload?.length) return null;
  const items = payload.filter(p => p.value);
  return (
    <div className="bg-white border border-stone-200 shadow-md rounded-sm px-3 py-2 text-xs">
      <div className="font-medium text-stone-800 mb-1">{labelFmt ? labelFmt(label) : label}</div>
      {items.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 text-stone-600">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="tabular-nums text-stone-800">{typeof p.value === 'number' && unit === '%' ? pct(p.value) : `${fmt(p.value)} ${unit}`}</span>
        </div>
      ))}
    </div>
  );
};

/** 年度 × 條例堆疊長條 */
export const StackedYears = ({ data, series, onSelect, height = 280 }) => {
  const [hidden, setHidden] = useState([]);
  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-stone-600" role="list" aria-label="圖例">
        {series.map(s => (
          <button
            key={s.key} role="listitem" onClick={() => setHidden(h => h.includes(s.key) ? h.filter(x => x !== s.key) : [...h, s.key])}
            className={`flex items-center gap-1.5 ${hidden.includes(s.key) ? 'opacity-40' : ''}`} title="點擊切換顯示"
          >
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />{s.name}
          </button>
        ))}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap={1}
            onClick={e => e?.activeLabel && onSelect?.(e.activeLabel)}>
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip labelFmt={(y) => `民國 ${y} 年（${Number(y) + 1911}）`} />} cursor={{ fill: 'rgba(120,113,108,0.08)' }} />
            {series.filter(s => !hidden.includes(s.key)).map((s, i, arr) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} stroke="#fff" strokeWidth={1}
                radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0} cursor={onSelect ? 'pointer' : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/** 有利比例折線（單一量值、單一軸） */
export const RatioLine = ({ data, height = 220, average }) => (
  <div style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e7e5e4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
        <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
        {average != null && <ReferenceLine y={average} stroke="#a8a29e" strokeDasharray="4 4" label={{ value: `全體 ${pct(average)}`, position: 'insideTopRight', fontSize: 11, fill: '#78716c' }} />}
        <Tooltip content={<ChartTooltip unit="%" />} />
        <Line type="monotone" dataKey="ratio" name="有利比例" stroke="var(--color-favorable)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// 單色（藍）序列色階：數值越大越深
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'];

/** 交叉表熱圖：列 × 欄，格內直接標數字，可點格子列出案件 */
export const Heatmap = ({ rows, cols, colLabels, value, onSelect, rowLabelWidth = 'w-64' }) => {
  const max = Math.max(1, ...rows.flatMap(r => cols.map(c => value(r, c))));
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="text-xs border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className={`${rowLabelWidth}`} />
            {cols.map((c, i) => <th key={c} className="font-normal text-stone-500 px-1 pb-1 min-w-16 align-bottom">{colLabels?.[i] || c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r}>
              <th className="text-left font-normal text-stone-700 pr-2 leading-snug">{r}</th>
              {cols.map((c, i) => {
                const v = value(r, c);
                const idx = v ? Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 1))) : -1;
                return (
                  <td key={c} className="p-0">
                    <button
                      disabled={!v} onClick={() => onSelect?.(r, c)}
                      title={`${r}｜${colLabels?.[i] || c}：${v} 件`}
                      className="w-full h-8 rounded-[3px] tabular-nums disabled:cursor-default hover:ring-2 hover:ring-brand-gold"
                      style={{ background: idx < 0 ? '#f5f5f4' : RAMP[idx], color: idx > 6 ? '#fff' : '#292524' }}
                    >
                      {v || ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-500">
        <span>少</span>
        <span className="flex h-2.5 w-40 rounded-sm overflow-hidden">{RAMP.map(c => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
        <span>多（最大 {max} 件）</span>
      </div>
    </div>
  );
};
