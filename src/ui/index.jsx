/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export const Modal = ({ open, onClose, title, children, footer, wide = false }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-stone-900/40 p-3 md:p-6 overflow-y-auto" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`bg-white w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} rounded-sm shadow-xl border border-stone-200 flex flex-col max-h-[92vh]`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700" aria-label="關閉"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto scroll-thin">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const ask = useCallback((opts) => new Promise(resolve => setState({ ...opts, resolve })), []);
  const confirm = useCallback((message, title = '請確認') => ask({ message, title, cancel: true }), [ask]);
  const alert = useCallback((message, title = '提示') => ask({ message, title, cancel: false }), [ask]);
  const close = (v) => { state?.resolve(v); setState(null); };
  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <Modal
        open={!!state} onClose={() => close(false)} title={state?.title}
        footer={<>
          {state?.cancel && <button className="btn" onClick={() => close(false)}>取消</button>}
          <button className="btn-primary" onClick={() => close(true)}>確定</button>
        </>}
      >
        <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{state?.message}</p>
      </Modal>
    </DialogContext.Provider>
  );
};

export const PageHeader = ({ title, description, actions, kicker }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 mb-6 border-b border-stone-200">
    <div className="min-w-0">
      {kicker && <div className="text-xs text-brand-gold-dark mb-1">{kicker}</div>}
      <h1 className="text-2xl md:text-[28px] font-bold leading-tight">{title}</h1>
      {description && <div className="mt-2 text-sm text-stone-600 max-w-3xl leading-relaxed">{description}</div>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Section = ({ title, note, actions, children, className = '' }) => (
  <section className={`mb-10 ${className}`}>
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {note && <p className="text-xs text-stone-500 mt-0.5">{note}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

export const StatTile = ({ label, value, sub, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`card p-4 text-left ${onClick ? 'hover:border-brand-gold transition-colors' : ''}`}>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-brand-dark tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </Tag>
  );
};

export const Empty = ({ children }) => (
  <div className="py-12 text-center text-sm text-stone-400 border border-dashed border-stone-200 rounded-sm">{children}</div>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex flex-wrap gap-1 border-b border-stone-200 mb-6" role="tablist">
    {tabs.map(t => (
      <button
        key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
        className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${value === t.id ? 'border-brand-gold text-brand-dark font-medium' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
      >
        {t.label}{t.count !== undefined && <span className="ml-1 text-xs text-stone-400 tabular-nums">{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Pager = ({ page, pageCount, onChange, total }) => {
  if (pageCount <= 1) return total !== undefined ? <div className="text-xs text-stone-500 py-3">共 {total} 筆</div> : null;
  return (
    <div className="flex items-center justify-between py-3 text-sm text-stone-600">
      <span className="text-xs text-stone-500">共 {total} 筆，第 {page + 1} / {pageCount} 頁</span>
      <div className="flex gap-1">
        <button className="btn px-2" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="上一頁"><ChevronLeft className="w-4 h-4" /></button>
        <button className="btn px-2" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} aria-label="下一頁"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

export const Select = ({ label, value, onChange, options, allLabel = '全部' }) => (
  <label className="block min-w-0">
    {label && <span className="label">{label}</span>}
    <select className="field" value={value} onChange={e => onChange(e.target.value)}>
      {allLabel !== null && <option value="">{allLabel}</option>}
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

export const highlight = (text, term) => {
  if (!term || !text) return text;
  const parts = String(text).split(term);
  if (parts.length === 1) return text;
  return parts.flatMap((p, i) => i === 0 ? [p] : [<mark key={i}>{term}</mark>, p]);
};

export const download = (filename, content, type = 'text/plain;charset=utf-8') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
};

export const today = () => new Date().toISOString().slice(0, 10);
