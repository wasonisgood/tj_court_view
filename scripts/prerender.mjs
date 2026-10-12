// 建置後產生靜態頁，讓搜尋引擎不必執行 JavaScript 也讀得到內容。
//
// 每個公開頁面與每件裁判各寫一個 HTML：<title>、描述、canonical、Open Graph、結構化資料，
// 以及 #root 內可直接閱讀的文字（React 載入後會取代）。另產生 sitemap.xml、robots.txt、404.html。
//
// 用法：vite build 之後執行 node scripts/prerender.mjs（npm run build 已包含）。
// 環境變數：SITE_URL（預設 https://wasonisgood.github.io/tj_court_view）、BASE_PATH（同 vite.config.js）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_META, SITE_NAME, SITE_DESCRIPTION, caseDescription } from '../src/core/pageMeta.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(DIST, 'data', 'judgments');
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://wasonisgood.github.io/tj_court_view').replace(/\/$/, '');
const BASE = process.env.BASE_PATH || '/tj_court_view/';

const STATUTE_SHORT = {
  戒嚴時期人民受損權利回復條例: '戒嚴回復條例',
  二二八事件處理及補償條例: '二二八條例',
  戒嚴時期不當叛亂暨匪諜審判案件補償條例: '匪諜審判補償條例',
  政黨及其附隨組織不當取得財產處理條例: '黨產條例',
  促進轉型正義條例: '促轉條例',
  威權統治時期國家不法行為被害者權利回復條例: '威權條例',
  政治檔案條例: '政治檔案條例',
  公職人員年資併社團專職人員年資計發退離給與處理條例: '年資條例',
};
const short = (s) => STATUTE_SHORT[s] || s;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const caseSlug = (r) => encodeURIComponent(r.id).replace(/%2C/gi, ',');
const casePath = (r) => `/judgments/case/${caseSlug(r)}`;
// /judgments 在 GitHub Pages 上是資料夾，網址會補上結尾斜線
const canonical = (p) => SITE_URL + (p === '/' ? '/' : p === '/judgments' ? '/judgments/' : p);
const href = (p) => BASE.replace(/\/$/, '') + (p === '/judgments' ? '/judgments/' : p);

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const records = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'));
const notes = JSON.parse(fs.readFileSync(path.join(DATA, 'notes.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(DATA, 'meta.json'), 'utf8'));
const literature = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'modules', 'literature', 'seed.json'), 'utf8'));
const lastmod = (meta.builtAt || new Date().toISOString()).slice(0, 10);

// 靜態內容的最低限度樣式（React 載入前短暫顯示，或給不執行 JS 的爬蟲）
const STYLE = `<style>.pre{max-width:56rem;margin:0 auto;padding:2rem 1rem;font:16px/1.8 "Noto Sans TC",system-ui,sans-serif;color:#292524}.pre h1{font:700 1.75rem/1.3 "Noto Serif TC",serif;margin:0 0 .5rem}.pre h2{font:700 1.15rem/1.4 "Noto Serif TC",serif;margin:2rem 0 .5rem}.pre a{color:#8a7140}.pre dt{color:#78716c;font-size:.85rem}.pre dd{margin:0 0 .6rem}.pre nav a{margin-right:1rem}.pre p{white-space:pre-line}</style>`;

const page = ({ p, title, description, body, jsonLd = [], noindex = false }) => {
  const full = title && title !== SITE_NAME ? `${title}｜${SITE_NAME}` : SITE_NAME;
  const head = [
    `<link rel="canonical" href="${esc(canonical(p))}" />`,
    `<meta property="og:url" content="${esc(canonical(p))}" />`,
    ...jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
    STYLE,
  ].join('\n    ');
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description || SITE_DESCRIPTION)}`)
    .replace(/(<meta name="robots" content=")[^"]*/, `$1${noindex ? 'noindex' : 'index,follow'}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(full)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(description || SITE_DESCRIPTION)}`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><div class="pre">${body}</div></div>`);
};

const write = (rel, html) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};

const NAV = `<nav>${Object.entries(PAGE_META).map(([p, m]) => `<a href="${href(p)}">${esc(p === '/' ? '首頁' : m.title.split('：')[0])}</a>`).join('')}</nav>`;
const caseLink = (r) => `<a href="${href(casePath(r))}">${esc(r.title)}</a>`;
const caseList = (rs) => `<ul>${rs.map(r => `<li>${caseLink(r)}　${esc(r.date || '')}</li>`).join('')}</ul>`;
const breadcrumb = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: canonical(p) })),
});

// ── 各頁面主體 ──────────────────────────────────────────

const STATUTES = Object.keys(STATUTE_SHORT);
const byStatute = (st) => records.filter(r => r.statutes?.includes(st));

const bodies = {
  '/': () => `<ul>${STATUTES.map(st => `<li>${esc(st)}：${byStatute(st).length} 件</li>`).join('')}</ul><p>收錄 ${records.length.toLocaleString()} 件文書，其中 ${meta.coded?.有利 || 0} 件有利、${meta.coded?.否定 || 0} 件否定已完成歸類。</p>`,
  '/judgments': () => `<h2>各條例收錄件數</h2><ul>${STATUTES.map(st => `<li><a href="${href('/judgments/browse')}?statute=${encodeURIComponent(st)}">${esc(st)}</a>：${byStatute(st).length} 件</li>`).join('')}</ul>`,
  '/judgments/browse': () => STATUTES.map(st => `<h2>${esc(st)}</h2>${caseList(byStatute(st).filter(r => r.statute === st))}`).join(''),
  '/judgments/special': () => {
    const party = records.filter(r => r.caseAnalysis?.[STATUTES[3]]);
    const groups = notes['黨產條例_分類'] || [];
    const others = [STATUTES[7], '政治檔案條例', '促進轉型正義條例'];
    return `<h2>黨產條例</h2>${groups.map(g => `<h3>${esc(g.label)}</h3>${caseList(party.filter(r => r.caseAnalysis[STATUTES[3]]['分類'] === g.label))}`).join('')}`
      + others.map(st => `<h2>${esc(short(st))}</h2>${caseList(records.filter(r => r.caseAnalysis?.[st]))}`).join('');
  },
  '/judgments/favorable': () => caseList(records.filter(r => r.coding?.stance === '有利').slice(0, 300)),
  '/judgments/unfavorable': () => caseList(records.filter(r => r.coding?.stance === '否定').slice(0, 300)),
  '/literature': () => `<ul>${literature.map(l => `<li>${esc(l.authors)}，${esc(l.title)}${l.year ? `（${esc(l.year)}）` : ''}</li>`).join('')}</ul>`,
};

const WEBSITE_LD = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: canonical('/'), inLanguage: 'zh-Hant-TW', description: SITE_DESCRIPTION,
};
const DATASET_LD = {
  '@context': 'https://schema.org', '@type': 'Dataset', name: `${SITE_NAME}：轉型正義相關裁判`, url: canonical('/judgments'),
  description: PAGE_META['/judgments'].description, inLanguage: 'zh-Hant-TW', dateModified: lastmod,
  keywords: ['轉型正義', '二二八', '戒嚴', '黨產條例', '促轉條例', '刑事補償', '冤獄賠償', '裁判'],
  isAccessibleForFree: true,
};

// 404：任何未預先產生的路徑都由前端路由處理
write('404.html', template.replace(/(<meta name="robots" content=")[^"]*/, '$1noindex'));

const urls = [];
for (const [p, m] of Object.entries(PAGE_META)) {
  const html = page({
    p, title: m.title, description: m.description,
    body: `<h1>${esc(m.title)}</h1><p>${esc(m.description)}</p>${NAV}${bodies[p]?.() || ''}`,
    jsonLd: p === '/' ? [WEBSITE_LD] : p === '/judgments' ? [DATASET_LD, breadcrumb([['首頁', '/'], [m.title, p]])] : [breadcrumb([['首頁', '/'], [m.title, p]])],
  });
  write(p === '/' ? 'index.html' : p === '/judgments' ? 'judgments/index.html' : `${p.slice(1)}.html`, html);
  urls.push([canonical(p), p === '/' ? '1.0' : '0.8']);
}

// ── 案件頁 ──────────────────────────────────────────────

const shardCache = {};
const textOf = (r) => {
  if (r.shard == null) return null;
  shardCache[r.shard] ??= JSON.parse(fs.readFileSync(path.join(DATA, 'text', `${String(r.shard).padStart(2, '0')}.json`), 'utf8'));
  return shardCache[r.shard][r.id];
};

const dl = (pairs) => `<dl>${pairs.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

for (const r of records) {
  const p = casePath(r);
  const a = Object.values(r.caseAnalysis || {})[0];
  const sections = textOf(r) || {};
  const analysis = a ? `<h2>個案分析</h2>${dl(a['事實簡述']
    ? [['爭點', a['分類']], ['上訴人', a['上訴人']], ['事實', a['事實簡述']], ['上訴結果', a['上訴結果']], ['理由', a['理由']]]
    : [['當事人', [a['原告／上訴人／聲請人'], a['被告／被上訴人／原決定機關']].filter(Boolean).join(' 對 ')], ['爭議處分或請求', a['爭議處分或請求']], ['主要爭執事實', a['主要爭執事實']], ['法院判斷原因', a['法院判斷原因']], ['判斷類型', a['判斷類型（主）']]])}` : '';
  const coding = r.coding ? `<h2>研究歸類</h2>${dl([['歸類', r.coding.stance], ['理由類型', r.coding['理由類型（主）'] || r.coding['否定類型']], ['摘要', r.coding['法院有利理由分析'] || r.coding['判斷理由摘錄'] || r.coding['案情摘要']]])}` : '';
  const text = Object.entries(sections).map(([h, t]) => `<h2>${esc(h)}</h2><p>${esc(t)}</p>`).join('');
  const description = caseDescription(r, short(r.statute));
  const body = `<nav><a href="${href('/')}">首頁</a><a href="${href('/judgments/browse')}">裁判檢索</a></nav>`
    + `<h1>${esc(r.title)}</h1>`
    + dl([['法院／機關', r.court], ['日期', r.date], ['案由', r.cause], ['條例', (r.statutes || [r.statute]).join('、')], ['裁判結果', r.result],
      ['有利於', r.favor && `${r.favor.who}（${r.favor.side}）`], ['轉型正義一方', r.favor?.tj], ['判斷依據', r.favor?.basis], ['字號', r.id]])
    + (r.mainText ? `<h2>主文</h2><p>${esc(r.mainText)}</p>` : '')
    + analysis + coding + text
    + (r.url ? `<p><a href="${esc(r.url)}" rel="nofollow noopener">司法院裁判書系統原文</a></p>` : '');
  const ld = {
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: r.title, url: canonical(p), inLanguage: 'zh-Hant-TW',
    genre: r.docType, about: r.statutes || [r.statute], description,
    ...(r.iso ? { dateCreated: r.iso } : {}),
    author: { '@type': 'Organization', name: r.court },
    ...(r.url ? { sameAs: r.url } : {}),
    isPartOf: { '@type': 'Dataset', name: DATASET_LD.name, url: DATASET_LD.url },
  };
  write(`${p.slice(1).replace(caseSlug(r), r.id)}.html`, page({
    p, title: r.title, description, body,
    jsonLd: [ld, breadcrumb([['首頁', '/'], ['裁判檢索', '/judgments/browse'], [r.title, p]])],
  }));
  urls.push([canonical(p), a ? '0.7' : '0.5']);
}

fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr]) => `  <url><loc>${esc(u)}</loc><lastmod>${lastmod}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: ${BASE}system\nDisallow: ${BASE}log\nDisallow: ${BASE}judgments/marked\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`prerender：${Object.keys(PAGE_META).length} 個頁面、${records.length} 件裁判，sitemap ${urls.length} 筆`);
