// 前置欄位在原始資料中是一整行（法院、字號、當事人、「右／上列…」敘述連在一起），
// 這裡依當事人稱謂斷行，並補上字號、日期、案由，讓 PrefaceCard 能分欄呈現。

export const ROLES = [
  '聲請覆議人', '聲請覆審人', '再審原告', '再審被告', '訴訟代理人', '法定代理人', '複代理人', '代理人', '代表人', '輔佐人',
  '被上訴人', '上訴人', '被告', '原告', '聲請人', '相對人', '參加人', '抗告人', '請求人', '申請人', '當事人',
];

const ROLE_RE = new RegExp(`(${ROLES.join('|')})`, 'g');
// 當事人欄結束、開始敘述的位置：「右當事人間」「上列聲請人因」「右聲請覆議人因」等
const NARRATIVE_RE = /(?:右|上列|右列|上開)(?:當事人|聲請|原告|上訴|再審|抗告|請求|申請|列|開)/;

export const formatPreface = (text, r) => {
  const flat = (text || '').replace(/\s*\n+\s*/g, '').trim();
  const meta = [
    r?.caseNo && `【裁判字號】${r.caseNo}`,
    r?.date && `【裁判日期】${r.date}`,
    r?.cause && `【裁判案由】${r.cause}`,
  ].filter(Boolean);

  const cut = flat.search(NARRATIVE_RE);
  const head = cut > 0 ? flat.slice(0, cut) : flat;
  const rest = cut > 0 ? flat.slice(cut) : '';

  const lines = [];
  let last = 0;
  for (const m of head.matchAll(ROLE_RE)) {
    const piece = head.slice(last, m.index).trim();
    if (piece) lines.push(piece);
    last = m.index;
  }
  const tail = head.slice(last).trim();
  if (tail) lines.push(tail);
  if (rest) lines.push(rest);
  return [...meta, ...lines].join('\n');
};
