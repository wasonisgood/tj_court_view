import React from 'react';

const LegalFooter = ({ text }) => {
  const dateRegex = /(中華民國\s*[0-9\uff10-\uff19〇零一二三四五六七八九十百\s]+年\s*[0-9\uff10-\uff19一二三四五六七八九十\s]+月\s*[0-9\uff10-\uff19一二三四五六七八九十\s]+日)/g;
  const proofRegex = /(右?\s*正本證明與原本無異|以上正本證明與原本無異)/;
  
  const dates = text.match(dateRegex) || [];
  const proofStatement = text.match(proofRegex)?.[0] || "";

  const roles = [
    '審判長法官', '審判長評事', '主席委員', '法院書記官', 
    '審判長', '評議員', '書記官', '法官', '評事', '委員', '主席'
  ];

  const extractPeople = (content) => {
    let results = [];
    let roleMatches = [];

    roles.forEach(role => {
      let idx = content.indexOf(role);
      while (idx !== -1) {
        if (!roleMatches.some(m => idx >= m.start && idx < m.end)) {
          roleMatches.push({ title: role, start: idx, end: idx + role.length });
        }
        idx = content.indexOf(role, idx + 1);
      }
    });

    roleMatches.sort((a, b) => a.start - b.start);

    for (let i = 0; i < roleMatches.length; i++) {
      const current = roleMatches[i];
      const next = roleMatches[i + 1];
      const nameStart = current.end;
      let nameEnd = next ? next.start : content.length;
      const subContent = content.substring(nameStart, nameEnd);
      const landmarkIdx = subContent.search(/[右正中\s]/); 
      const actualEnd = landmarkIdx !== -1 ? nameStart + landmarkIdx : nameEnd;
      let name = content.substring(nameStart, actualEnd).trim();
      const fragments = ['法', '評', '員', '委', '主'];
      if (name.length > 2) {
        fragments.forEach(f => {
          if (name.startsWith(f)) name = name.substring(1);
        });
      }
      if (name.length > 4) name = name.substring(0, 4);
      name = name.trim();
      if (name.length >= 2 && name.length <= 4) {
        results.push({ role: current.title, name });
      }
    }
    return results;
  };

  const people = extractPeople(text);
  const judges = people.filter(p => !p.role.includes('書記官'));
  const clerks = people.filter(p => p.role.includes('書記官'));

  let orgInfo = "";
  if (dates.length > 0 && people.length > 0) {
    const datePos = text.indexOf(dates[0]) + dates[0].length;
    const firstPersonPos = text.indexOf(people[0].role);
    if (firstPersonPos > datePos) {
      orgInfo = text.substring(datePos, firstPersonPos).trim();
    }
  }

  if (people.length === 0 && dates.length === 0) {
    return <div className="mt-12 p-8 bg-paper-100/50 rounded-lg text-brand-700 font-serif border-l-4 border-brand-200 italic leading-loose select-all">{text}</div>;
  }

  return (
    <div className="mt-20 relative select-text">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-brand-100/50"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-6 text-[10px] font-black text-brand-200 uppercase tracking-[0.8em] font-sans">Official Verification</span>
      </div>

      <div className="mt-12 bg-white border border-brand-100 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden transition-all hover:shadow-lg">
        <div className="bg-brand-900 h-1 w-full"></div>
        
        <div className="p-10 md:p-14">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-brand-50 pb-8 gap-6">
            <div>
              <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2 font-sans">Issuing Authority</p>
              <p className="text-2xl font-black text-brand-900 tracking-tight font-serif">{orgInfo || "司法機關決定書"}</p>
            </div>
            <div className="bg-paper-50 px-5 py-3 rounded-none border-l-4 border-accent-500">
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest text-center mb-1 font-sans">Date Issued</p>
              <p className="text-sm font-bold text-brand-800 font-mono tracking-tighter">{dates[0] || "---"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 mb-12">
            {judges.map((person, idx) => (
              <div key={idx} className="flex items-center space-x-5 group">
                <div className="w-12 h-12 rounded-full bg-paper-100 flex items-center justify-center text-brand-300 group-hover:bg-accent-50 group-hover:text-accent-600 transition-all duration-300 border border-brand-50 shadow-inner">
                  <i className="fas fa-balance-scale-right"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-accent-600 uppercase tracking-widest mb-1 font-sans opacity-70">{person.role}</p>
                  <p className="text-xl font-black text-brand-900 tracking-[0.1em] font-serif group-hover:text-accent-700 transition-colors">{person.name}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end pt-10 border-t border-brand-50 gap-10">
            <div className="flex-1">
              {proofStatement && (
                <div className="inline-flex items-center px-4 py-2 bg-paper-100 text-brand-800 border border-brand-200 rounded-sm text-[11px] font-black font-sans uppercase tracking-wider">
                  <i className="fas fa-certificate mr-3 text-accent-600"></i>
                  {proofStatement}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-12">
              {clerks.map((clerk, idx) => (
                <div key={idx} className="text-right">
                  <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-1 font-sans">{clerk.role}</p>
                  <p className="text-3xl font-serif font-black text-brand-900 tracking-[0.3em] border-b-2 border-brand-900 pb-2 transition-all hover:tracking-[0.4em]">{clerk.name}</p>
                </div>
              ))}
              
              <div className="relative w-20 h-20 flex items-center justify-center group cursor-help">
                <div className="absolute inset-0 border-2 border-rose-900/40 rounded-sm rotate-12 transition-transform group-hover:rotate-[15deg]"></div>
                <div className="absolute inset-1 border border-rose-900/30 rounded-sm -rotate-6 transition-transform group-hover:-rotate-[10deg]"></div>
                <div className="absolute inset-2 bg-rose-900/5 rounded-sm"></div>
                <span className="text-[10px] font-black text-rose-900/60 text-center leading-none uppercase tracking-tighter font-sans select-none">Official<br/>Record<br/>Seal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalFooter;
