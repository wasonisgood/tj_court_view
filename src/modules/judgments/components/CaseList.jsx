/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Flag } from 'lucide-react';
import { useStore } from '../../../core/StoreContext';
import { Modal, Pager, Empty } from '../../../ui';
import { short } from '../data';
import ExportButton from './ExportButton';

export const caseHref = (r) => `/judgments/case/${encodeURIComponent(r.id)}`;

export const StanceTag = ({ r }) => {
  const s = r.coding?.stance;
  if (!s) return <span className="text-xs text-stone-400">未歸類</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-700">
      <span className="w-2 h-2 rounded-full" style={{ background: s === '有利' ? 'var(--color-favorable)' : 'var(--color-unfavorable)' }} />
      {s}
    </span>
  );
};

const CaseList = ({ items, pageSize = 25, detail, empty = '沒有符合條件的裁判', showStatute = true }) => {
  const [page, setPage] = useState(0);
  const { annotations } = useStore();
  const pageCount = Math.ceil(items.length / pageSize);
  const current = Math.min(page, Math.max(0, pageCount - 1));
  const slice = useMemo(() => items.slice(current * pageSize, (current + 1) * pageSize), [items, current, pageSize]);
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <div>
      <div className="card divide-y divide-stone-100">
        {slice.map(r => {
          const a = annotations[r.id];
          return (
            <Link key={r.id} to={caseHref(r)} className="block px-4 py-3 hover:bg-stone-50">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-medium text-stone-900">{r.title}</span>
                    <span className="text-xs text-stone-500 tabular-nums">{r.date?.replace('民國 ', '')}</span>
                  </div>
                  <div className="text-[13px] text-stone-600 mt-1 line-clamp-2">
                    {detail ? detail(r) : (r.mainText || '（無主文）')}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <StanceTag r={r} />
                  {showStatute && <span className="text-[11px] text-stone-400">{short(r.statute)}</span>}
                  <span className="flex gap-1.5 text-stone-400">
                    {a?.starred && <Star className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" aria-label="重點" />}
                    {a?.note && <MessageSquare className="w-3.5 h-3.5" aria-label="有筆記" />}
                    {a?.flag && <Flag className="w-3.5 h-3.5 text-red-500" aria-label="歸類有疑義" />}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Pager page={current} pageCount={pageCount} onChange={setPage} total={items.length} />
    </div>
  );
};

export const CaseListModal = ({ state, onClose }) => (
  <Modal
    open={!!state} onClose={onClose} wide
    title={state ? `${state.title}（${state.items.length} 件）` : ''}
    footer={state && <ExportButton items={state.items} filename={state.title} />}
  >
    {state && <CaseList items={state.items} detail={state.detail} pageSize={15} />}
  </Modal>
);

export default CaseList;
