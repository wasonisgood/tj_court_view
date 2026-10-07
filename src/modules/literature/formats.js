// 文獻格式轉換：BibTeX、RIS、CSV 匯入匯出，以及引註文字

export const TYPES = ['期刊論文', '專書', '專書論文', '學位論文', '研討會論文', '研究報告', '法規', '釋憲', '新聞與網路資料', '其他'];
export const STATUSES = ['待讀', '閱讀中', '已讀', '已引用'];

const BIB_TYPE = { 期刊論文: 'article', 專書: 'book', 專書論文: 'incollection', 學位論文: 'phdthesis', 研討會論文: 'inproceedings', 研究報告: 'techreport' };
const BIB_TYPE_REV = { article: '期刊論文', book: '專書', incollection: '專書論文', inbook: '專書論文', phdthesis: '學位論文', mastersthesis: '學位論文', inproceedings: '研討會論文', conference: '研討會論文', techreport: '研究報告' };
const RIS_TYPE = { 期刊論文: 'JOUR', 專書: 'BOOK', 專書論文: 'CHAP', 學位論文: 'THES', 研討會論文: 'CONF', 研究報告: 'RPRT', 法規: 'STAT', 釋憲: 'CASE', 新聞與網路資料: 'ELEC' };
const RIS_TYPE_REV = Object.fromEntries(Object.entries(RIS_TYPE).map(([k, v]) => [v, k]));

export const newId = () => 'lit-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isZh = (s) => /[一-鿿]/.test(s || '');

/** 引註：中文文獻採臺灣法學常見格式，外文採 APA 簡式 */
export const citation = (it) => {
  const a = it.authors || '';
  if (it.type === '法規') return `${it.title}${it.note ? `（${it.note}）` : ''}。`;
  if (it.type === '釋憲') return `${it.title}（${it.year}）。`;
  if (isZh(it.title)) {
    const tail = [it.volume && `${it.volume}`, it.pages && `頁 ${it.pages}`].filter(Boolean).join('，');
    if (it.type === '專書') return `${a}（${it.year}），《${it.title}》${it.publisher ? `，${it.publisher}` : ''}。`;
    if (it.type === '專書論文') return `${a}（${it.year}），〈${it.title}〉，收於：${it.editors ? it.editors + '（編），' : ''}《${it.container}》${it.pages ? `，頁 ${it.pages}` : ''}${it.publisher ? `，${it.publisher}` : ''}。`;
    return `${a}（${it.year}），〈${it.title}〉，《${it.container || ''}》${tail ? `，${tail}` : ''}。`;
  }
  const tail = [it.volume, it.pages].filter(Boolean).join(', ');
  if (it.type === '專書') return `${a} (${it.year}). ${it.title}. ${it.publisher || ''}`.trim();
  if (it.type === '專書論文') return `${a} (${it.year}). ${it.title}. In ${it.editors ? it.editors + ' (Eds.), ' : ''}${it.container}${it.pages ? ` (pp. ${it.pages})` : ''}. ${it.publisher || ''}`.trim();
  return `${a} (${it.year}). ${it.title}. ${it.container || ''}${tail ? `, ${tail}` : ''}.${it.doi ? ` https://doi.org/${it.doi}` : ''}`;
};

export const toBibTeX = (items) => items.map(it => {
  const key = ((it.authors || 'anon').split(/[;；、,\s]/)[0] + (it.year || '')).replace(/[^\w一-鿿]/g, '') || it.id;
  const f = {
    title: it.title, author: (it.authors || '').split(/[;；、]/).map(s => s.trim()).filter(Boolean).join(' and '), year: it.year,
    journal: it.type === '期刊論文' ? it.container : undefined, booktitle: ['專書論文', '研討會論文'].includes(it.type) ? it.container : undefined,
    editor: it.editors, volume: it.volume, pages: it.pages, publisher: it.publisher, doi: it.doi, url: it.url, keywords: (it.tags || []).join(', '), note: it.note,
  };
  const body = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `  ${k} = {${String(v).replace(/[{}]/g, '')}}`).join(',\n');
  return `@${BIB_TYPE[it.type] || 'misc'}{${key},\n${body}\n}`;
}).join('\n\n');

export const parseBibTeX = (src) => {
  const out = [];
  const entryRe = /@(\w+)\s*\{\s*([^,]*),([\s\S]*?)\n\}/g;
  for (const m of src.matchAll(entryRe)) {
    const fields = {};
    for (const f of m[3].matchAll(/(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))/g)) {
      fields[f[1].toLowerCase()] = (f[2] ?? f[3] ?? f[4] ?? '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
    }
    out.push({
      type: BIB_TYPE_REV[m[1].toLowerCase()] || '其他', title: fields.title || '', authors: (fields.author || '').split(/\s+and\s+/).join('; '),
      year: fields.year || '', container: fields.journal || fields.booktitle || '', editors: fields.editor || '', volume: fields.volume || '',
      pages: fields.pages || '', publisher: fields.publisher || '', doi: fields.doi || '', url: fields.url || '',
      tags: fields.keywords ? fields.keywords.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [], note: fields.note || '',
    });
  }
  return out;
};

export const toRIS = (items) => items.map(it => {
  const lines = [`TY  - ${RIS_TYPE[it.type] || 'GEN'}`, `TI  - ${it.title}`];
  (it.authors || '').split(/[;；、]/).map(s => s.trim()).filter(Boolean).forEach(a => lines.push(`AU  - ${a}`));
  if (it.year) lines.push(`PY  - ${it.year}`);
  if (it.container) lines.push(`${it.type === '期刊論文' ? 'JO' : 'T2'}  - ${it.container}`);
  if (it.volume) lines.push(`VL  - ${it.volume}`);
  if (it.pages) lines.push(`SP  - ${it.pages}`);
  if (it.publisher) lines.push(`PB  - ${it.publisher}`);
  if (it.doi) lines.push(`DO  - ${it.doi}`);
  if (it.url) lines.push(`UR  - ${it.url}`);
  (it.tags || []).forEach(t => lines.push(`KW  - ${t}`));
  if (it.note) lines.push(`N1  - ${it.note.replace(/\n/g, ' ')}`);
  lines.push('ER  - ');
  return lines.join('\r\n');
}).join('\r\n\r\n');

export const parseRIS = (src) => {
  const out = [];
  let cur = null;
  src.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
    if (!m) return;
    const [, tag, val] = m;
    if (tag === 'TY') { cur = { type: RIS_TYPE_REV[val.trim()] || '其他', authors: [], tags: [] }; return; }
    if (!cur) return;
    if (tag === 'ER') { out.push({ ...cur, authors: cur.authors.join('; ') }); cur = null; return; }
    const map = { TI: 'title', T1: 'title', PY: 'year', Y1: 'year', JO: 'container', JF: 'container', T2: 'container', VL: 'volume', SP: 'pages', PB: 'publisher', DO: 'doi', UR: 'url', N1: 'note' };
    if (tag === 'AU' || tag === 'A1') cur.authors.push(val.trim());
    else if (tag === 'KW') cur.tags.push(val.trim());
    else if (tag === 'EP' && cur.pages) cur.pages += '-' + val.trim();
    else if (map[tag]) cur[map[tag]] = tag === 'PY' || tag === 'Y1' ? val.slice(0, 4) : val.trim();
  });
  return out;
};

const CSV_COLS = [['type', '類型'], ['title', '題名'], ['authors', '作者'], ['year', '年份'], ['container', '期刊／書名'], ['editors', '編者'], ['volume', '卷期'], ['pages', '頁碼'], ['publisher', '出版者'], ['doi', 'DOI'], ['url', '網址'], ['status', '狀態'], ['tags', '標籤'], ['note', '筆記']];

export const toCSV = (items) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + [CSV_COLS.map(c => c[1]).join(','), ...items.map(it => CSV_COLS.map(([k]) => esc(k === 'tags' ? (it.tags || []).join('; ') : it[k])).join(','))].join('\r\n');
};

export const parseCSV = (src) => {
  const rows = [];
  let row = [], field = '', q = false;
  const s = src.replace(/^\ufeff/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(Boolean));
  if (!head) return [];
  const idx = head.map(h => (CSV_COLS.find(c => c[1] === h.trim() || c[0] === h.trim().toLowerCase()) || [])[0]);
  return body.map(r => {
    const it = { tags: [] };
    idx.forEach((k, i) => { if (k) it[k] = k === 'tags' ? (r[i] || '').split(/[;；]/).map(t => t.trim()).filter(Boolean) : (r[i] || '').trim(); });
    return it;
  }).filter(it => it.title);
};
