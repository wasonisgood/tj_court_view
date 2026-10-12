import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_META, NOINDEX, SITE_NAME, SITE_DESCRIPTION } from './pageMeta';

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setCanonical = (href) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
};

/** 設定頁面標題、描述與 canonical；title 為空時只顯示網站名稱 */
export const useDocumentMeta = ({ title, description, noindex = false, skip = false } = {}) => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (skip) return;
    const full = title && title !== SITE_NAME ? `${title}｜${SITE_NAME}` : SITE_NAME;
    const desc = description || SITE_DESCRIPTION;
    document.title = full;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', desc);
    setMeta('name', 'robots', noindex ? 'noindex' : 'index,follow');
    const base = SITE_URL || window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
    // /judgments 在 GitHub Pages 上是資料夾，與建置時的靜態頁一致補上斜線
    setCanonical(base + (pathname === '/judgments' ? '/judgments/' : pathname));
  }, [title, description, noindex, skip, pathname]);
};

/** 依網址套用 PAGE_META；案件頁、人物頁自行呼叫 useDocumentMeta */
export const RouteMeta = () => {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/$/, '') || '/';
  const own = /^\/judgments\/(case|person)\//.test(path);
  const meta = PAGE_META[path] || {};
  useDocumentMeta({ ...meta, noindex: NOINDEX.includes(path), skip: own });
  return null;
};
