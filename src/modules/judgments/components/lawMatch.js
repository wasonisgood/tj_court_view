// 把正規化後的法條（如「冤獄賠償法第13條第2項」）轉成可在原文中比對的正規表示式，
// 原文可能寫成「冤獄賠償法第十三條第二項」或使用簡稱。

const ALIASES = {
  '戒嚴時期人民受損權利回復條例': ['戒嚴時期人民受損權利回復條例', '戒嚴回復條例'],
  '二二八事件處理及補償條例': ['二二八事件處理及補償條例', '二二八條例'],
  '戒嚴時期不當叛亂暨匪諜審判案件補償條例': ['戒嚴時期不當叛亂暨匪諜審判案件補償條例', '補償條例'],
  '政黨及其附隨組織不當取得財產處理條例': ['政黨及其附隨組織不當取得財產處理條例', '黨產條例'],
  '促進轉型正義條例': ['促進轉型正義條例', '促轉條例'],
  '威權統治時期國家不法行為被害者權利回復條例': ['威權統治時期國家不法行為被害者權利回復條例', '威權條例'],
  '刑法': ['中華民國刑法', '刑法'],
  '憲法': ['中華民國憲法', '憲法'],
  '檢肅匪諜條例': ['戡亂時期檢肅匪諜條例', '檢肅匪諜條例'],
};

const D = '零一二三四五六七八九';

const chineseForms = (n) => {
  const forms = new Set([String(n), String(n).replace(/\d/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0))]);
  forms.add(String(n).split('').map(c => D[c]).join('').replace(/零/g, '[零○〇]'));
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  let s = '';
  if (h) s += D[h] + '百';
  if (t) s += (t === 1 && !h ? '' : D[t]) + '十';
  else if (h && u) s += '零';
  if (u) s += D[u];
  if (s) forms.add(s);
  return [...forms];
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (n) => `(?:${chineseForms(Number(n)).join('|')})`;

export const lawPattern = (law) => {
  const interp = law.match(/^釋字第(\d+)號$/);
  if (interp) return new RegExp(`釋字第\\s*${num(interp[1])}\\s*號`, 'g');
  const m = law.match(/^(.+?)第(\d+)條(?:之(\d+))?(?:第(\d+)項)?$/);
  if (!m) return new RegExp(esc(law), 'g');
  const names = (ALIASES[m[1]] || [m[1]]).map(esc).join('|');
  let p = `(?:${names}|同法|同條例|本條例)\\s*第\\s*${num(m[2])}\\s*條`;
  if (m[3]) p += `\\s*之\\s*${num(m[3])}`;
  if (m[4]) p += `\\s*第\\s*${num(m[4])}\\s*項`;
  return new RegExp(p, 'g');
};

export const splitByPattern = (text, re) => {
  if (!re) return [text];
  const out = [];
  let last = 0;
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    out.push(text.slice(last, m.index));
    out.push({ mark: m[0] });
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
};
