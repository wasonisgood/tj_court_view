// 判決末尾的日期、法庭、法官與書記官署名。依判決書原本的版面靠右排列，不加裝飾。

const DATE_RE = /(中華民國\s*[0-9０-９〇零一二三四五六七八九十百\s]+年\s*[0-9０-９一二三四五六七八九十\s]+月\s*[0-9０-９一二三四五六七八九十\s]+日)/g;
const PROOF_RE = /(右?\s*正本證明與原本無異|以上正本證明與原本無異|本件正本證明與原本無異)/;
const ROLES = ['審判長法官', '審判長評事', '主席委員', '法院書記官', '審判長', '評議員', '書記官', '法官', '評事', '委員', '主席'];

const extractPeople = (content) => {
  const matches = [];
  ROLES.forEach(role => {
    let idx = content.indexOf(role);
    while (idx !== -1) {
      if (!matches.some(m => idx >= m.start && idx < m.end)) matches.push({ title: role, start: idx, end: idx + role.length });
      idx = content.indexOf(role, idx + 1);
    }
  });
  matches.sort((a, b) => a.start - b.start);
  const people = [];
  matches.forEach((cur, i) => {
    const end = matches[i + 1] ? matches[i + 1].start : content.length;
    const sub = content.substring(cur.end, end);
    const stop = sub.search(/[右正中以本\s]/);
    let name = (stop !== -1 ? sub.slice(0, stop) : sub).trim();
    if (name.length > 2 && /^[法評員委主]/.test(name)) name = name.slice(1);
    name = name.slice(0, 4).trim();
    if (name.length >= 2) people.push({ role: cur.title, name });
  });
  return people;
};

const LegalFooter = ({ text }) => {
  const dates = text.match(DATE_RE) || [];
  const proof = text.match(PROOF_RE)?.[0]?.replace(/\s+/g, '') || '';
  const people = extractPeople(text);
  if (!people.length && !dates.length) return <p className="font-classic text-brand-700 leading-loose">{text}</p>;

  let org = '';
  if (dates.length && people.length) {
    const after = text.indexOf(dates[0]) + dates[0].length;
    const first = text.indexOf(people[0].role, after);
    if (first > after) org = text.substring(after, first).trim();
  }
  const judges = people.filter(p => !p.role.includes('書記官'));
  const clerks = people.filter(p => p.role.includes('書記官'));

  return (
    <div className="mt-6 pt-6 border-t border-brand-100 font-classic text-[16px] leading-loose text-brand-800 text-right">
      {dates[0] && <p>{dates[0].replace(/\s+/g, ' ')}</p>}
      {org && <p>{org}</p>}
      {judges.map((p, i) => <p key={i}><span className="text-brand-500 mr-3">{p.role}</span>{p.name}</p>)}
      {proof && <p className="mt-4 text-brand-500 text-sm">{proof}</p>}
      {clerks.map((p, i) => <p key={i}><span className="text-brand-500 mr-3">{p.role}</span>{p.name}</p>)}
      {dates[1] && <p className="text-brand-500 text-sm">{dates[1].replace(/\s+/g, ' ')}</p>}
    </div>
  );
};

export default LegalFooter;
