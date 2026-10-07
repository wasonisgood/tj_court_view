/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react';
import { ChevronRight, List } from 'lucide-react';

/**
 * 依多個層級把案件分組成樹。level = { label, get: (r) => 值 | 值陣列 | null, color?: (值) => css 色 }
 */
export const buildTree = (items, levels, depth = 0, path = []) => {
  if (depth >= levels.length) return [];
  const lv = levels[depth];
  const groups = new Map();
  items.forEach(r => {
    const v = lv.get(r);
    const vals = Array.isArray(v) ? v : [v ?? lv.empty ?? null];
    vals.forEach(k => {
      if (k == null || k === '') return;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
  });
  return [...groups.entries()]
    .sort((a, b) => (lv.order ? lv.order(a[0], b[0]) : b[1].length - a[1].length))
    .map(([label, rs]) => ({
      id: [...path, label].join(' › '),
      label, items: rs, level: lv.label,
      color: lv.color?.(label),
      children: buildTree(rs, levels, depth + 1, [...path, label]),
    }));
};

const Node = ({ node, parentCount, color, onList, openIds, toggle }) => {
  const c = node.color || color || 'var(--color-series-1)';
  const open = openIds.has(node.id);
  const hasKids = node.children.length > 0;
  const share = parentCount ? node.items.length / parentCount : 1;
  return (
    <div className="flex items-start">
      <div className="shrink-0 w-60 card hover:border-brand-gold transition-colors" style={{ borderLeft: `4px solid ${c}` }}>
        <button
          onClick={() => (hasKids ? toggle(node.id) : onList(node))}
          className="w-full text-left px-3 pt-2 pb-1.5"
          aria-expanded={hasKids ? open : undefined}
          title={hasKids ? (open ? '收合' : '展開下一層') : '列出案件'}
        >
          <div className="text-[10px] text-stone-400">{node.level}</div>
          <div className="flex items-start gap-1">
            <span className="flex-1 text-[13px] leading-snug text-stone-800">{node.label}</span>
            {hasKids && <ChevronRight className={`w-4 h-4 mt-0.5 text-stone-400 transition-transform ${open ? 'rotate-90' : ''}`} />}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(3, share * 100)}%`, background: c }} /></span>
            <span className="text-xs tabular-nums text-stone-700">{node.items.length}</span>
            {parentCount ? <span className="text-[10px] tabular-nums text-stone-400 w-8 text-right">{Math.round(share * 100)}%</span> : null}
          </div>
        </button>
        <button onClick={() => onList(node)} className="w-full flex items-center justify-end gap-1 px-3 pb-1.5 text-[11px] text-stone-400 hover:text-brand-gold-dark">
          <List className="w-3 h-3" />列出案件
        </button>
      </div>
      {open && hasKids && (
        <div className="ml-6 pl-5 border-l border-stone-300 flex flex-col gap-2 py-1">
          {node.children.map(ch => (
            <div key={ch.id} className="relative before:content-[''] before:absolute before:-left-5 before:top-6 before:w-5 before:border-t before:border-stone-300">
              <Node node={ch} parentCount={node.items.length} color={c} onList={onList} openIds={openIds} toggle={toggle} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** 可點選展開的分類樹：方塊大小一致，長條與數字表示件數與占上一層比例 */
const TypeTree = ({ items, levels, rootLabel = '全部', onList, initialDepth = 1 }) => {
  const tree = useMemo(() => buildTree(items, levels), [items, levels]);
  const root = useMemo(() => ({ id: '__root', label: rootLabel, items, level: '', children: tree }), [items, tree, rootLabel]);
  const [openIds, setOpen] = useState(() => {
    const s = new Set(['__root']);
    const walk = (nodes, d) => nodes.forEach(n => { if (d < initialDepth) { s.add(n.id); walk(n.children, d + 1); } });
    walk(tree, 1);
    return s;
  });
  const toggle = (id) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const expandAll = () => { const s = new Set(['__root']); const walk = (ns) => ns.forEach(n => { s.add(n.id); walk(n.children); }); walk(tree); setOpen(s); };

  return (
    <div>
      <div className="flex gap-3 mb-3 text-xs">
        <button className="link" onClick={expandAll}>全部展開</button>
        <button className="link" onClick={() => setOpen(new Set(['__root']))}>只看第一層</button>
        <span className="text-stone-400">點方塊展開下一層；點「列出案件」查看該類裁判。</span>
      </div>
      <div className="overflow-x-auto scroll-thin pb-3">
        <Node node={root} onList={onList} openIds={openIds} toggle={toggle} color="#57534e" />
      </div>
    </div>
  );
};

export default TypeTree;
