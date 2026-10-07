/* eslint-disable react-refresh/only-export-components */
import { Link } from 'react-router-dom';
import { useJudgments } from '../data';
import { caseHref } from './CaseList';

// 研究筆記中引用案件的寫法：「94台覆3」「111上420」「112訴更一106」或完整案號
const REF_RE = /([A-Z]{4},\d{2,3},[^,\s、；）)]+,\d+,\d{8}(?:,\d)?)|((?<![\d])\d{2,3}(?:台覆|判|訴更一|訴|上|簡|台抗|台聲|裁|聲再)\d+)/g;

export const RefText = ({ text }) => {
  const { find, findRef } = useJudgments();
  if (!text) return null;
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(REF_RE)) {
    const r = m[1] ? find(m[1]) : findRef(m[2]);
    if (!r) continue;
    out.push(String(text).slice(last, m.index));
    out.push(<Link key={m.index} to={caseHref(r)} className="link" title={r.title}>{m[0]}</Link>);
    last = m.index + m[0].length;
  }
  out.push(String(text).slice(last));
  return <>{out}</>;
};

/** 把 Excel 統計分頁中的一個區塊（表格或段落）原樣呈現 */
export const NoteBlock = ({ block, hideHeading = false }) => {
  if (!block) return null;
  return (
    <div className="mb-6">
      {!hideHeading && block.heading && <h3 className="text-base font-bold mb-2">{block.heading.replace(/^【|】$/g, '')}</h3>}
      {block.kind === 'text' ? (
        <div className="space-y-2 text-sm text-stone-700 leading-relaxed">
          {block.paragraphs.map((p, i) => <p key={i}><RefText text={p} /></p>)}
        </div>
      ) : (
        <div className="card overflow-x-auto scroll-thin">
          <table className="w-full text-[13px]">
            <thead className="bg-stone-50 text-stone-500 text-xs">
              <tr>{block.rows[0].map((h, i) => <th key={i} className="text-left font-medium px-3 py-2 align-bottom">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {block.rows.slice(1).map((row, i) => (
                <tr key={i} className="align-top">
                  {block.rows[0].map((_, j) => (
                    <td key={j} className={`px-3 py-2 leading-relaxed ${/^\d+(\.\d+)?%?$/.test(row[j] || '') ? 'tabular-nums text-right' : 'text-stone-700'} ${j === 0 ? 'min-w-40' : ''}`}>
                      <RefText text={row[j]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const findBlock = (blocks, keyword) => (blocks || []).find(b => b.heading?.includes(keyword));
