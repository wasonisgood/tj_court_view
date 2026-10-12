import { useMemo } from 'react';
import { ROLES } from './formatPreface';

// 稱謂可能夾空白（「原 告」），長的稱謂排在前面，避免「被上訴人」被當成「上訴人」
const ROLE_LINE_RE = new RegExp(`^(${ROLES.map(r => r.split('').join('\\s*')).join('|')})`);
const AGENT = ['訴訟代理人', '法定代理人', '複代理人', '代理人', '代表人', '輔佐人'];

// 當事人欄：照判決書的寫法，稱謂在左、姓名在右；字號、日期、案由已在卷首，這裡不重複
const PrefaceCard = ({ text }) => {
  const lines = useMemo(() => text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('【')), [text]);

  return (
    <div className="font-classic text-[17px] leading-loose text-brand-900">
      <dl className="grid grid-cols-[6.5em_1fr] gap-x-4">
        {lines.map((line, idx) => {
          const m = line.match(ROLE_LINE_RE);
          if (!m) return null;
          const role = m[0].replace(/\s+/g, '');
          return (
            <div key={idx} className="contents">
              <dt className={AGENT.includes(role) ? 'text-brand-400 pl-4' : 'text-brand-500'}>{role}</dt>
              <dd className={AGENT.includes(role) ? 'text-brand-700' : ''}>{line.substring(m[0].length).trim()}</dd>
            </div>
          );
        })}
      </dl>
      {lines.filter(l => !ROLE_LINE_RE.test(l)).map((l, i) => <p key={i} className="mt-4 text-brand-700">{l}</p>)}
    </div>
  );
};

export default PrefaceCard;
