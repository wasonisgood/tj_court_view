import { useMemo } from 'react';
import { ROLES } from './formatPreface';

// 稱謂可能夾空白（「原 告」），長的稱謂排在前面，避免「被上訴人」被當成「上訴人」
const ALL_ROLES = ['復查申請人', ...ROLES];
const ROLE_LINE_RE = new RegExp(`^(${ALL_ROLES.map(r => r.split('').join('\\s*')).join('|')})`);
const PLAINTIFF = ['原告', '上訴人', '聲請人', '聲請覆議人', '聲請覆審人', '再審原告', '抗告人', '請求人', '申請人', '復查申請人', '當事人'];
const DEFENDANT = ['被告', '被上訴人', '相對人', '再審被告'];
const META = [['【裁判字號】', '裁判字號', 'font-classic'], ['【裁判日期】', '裁判日期', 'font-classic tabular-nums'], ['【裁判案由】', '案由', 'font-classic text-accent-700']];

// 前置：上方字號、日期、案由三欄，下方當事人；原告方深色、被告方暗紅，敘述句加左線
const PrefaceCard = ({ text }) => {
  const { meta, lines } = useMemo(() => {
    const meta = {};
    const lines = [];
    text.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      const m = META.find(([k]) => l.startsWith(k));
      if (m) meta[m[0]] = l.slice(m[0].length);
      else lines.push(l);
    });
    return { meta, lines };
  }, [text]);

  return (
    <div className="bg-paper-100/60 rounded-sm px-6 py-6 md:px-8 md:py-7 border border-brand-100">
      {META.some(([k]) => meta[k]) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 pb-6 border-b border-brand-200">
          {META.filter(([k]) => meta[k]).map(([k, label, cls]) => (
            <div key={k}>
              <div className="text-xs text-brand-400 mb-1">{label}</div>
              <div className={`${cls} font-bold text-brand-900 text-base leading-snug`}>{meta[k]}</div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3 font-classic leading-relaxed text-brand-900">
        {lines.map((line, idx) => {
          const m = line.match(ROLE_LINE_RE);
          // 「復查申請人因…」「上訴人對於…」是敘述句，不是當事人欄
          if (m && !/^\s*(因|對於|不服)/.test(line.substring(m[0].length))) {
            const role = m[0].replace(/\s+/g, '');
            const color = PLAINTIFF.includes(role) ? 'text-brand-900' : DEFENDANT.includes(role) ? 'text-rose-800' : 'text-brand-500';
            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline">
                <span className={`font-bold min-w-[6.5em] ${color}`}>{role}</span>
                <span className="flex-1 text-brand-800">{line.substring(m[0].length).replace(/^\s*[：:]\s*/, '')}</span>
              </div>
            );
          }
          return <div key={idx} className="text-brand-500 text-[15px] border-l-2 border-brand-100 pl-4 py-0.5">{line}</div>;
        })}
      </div>
    </div>
  );
};

export default PrefaceCard;
