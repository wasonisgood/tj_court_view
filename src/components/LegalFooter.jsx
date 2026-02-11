import React from 'react';

const LegalFooter = ({ text }) => {
  // Regex patterns for parsing dates and proof statements
  const dateRegex = /(中華民國\s*[0-9\uff10-\uff19〇零一二三四五六七八九十百\s]+年\s*[0-9\uff10-\uff19一二三四五六七八九十\s]+月\s*[0-9\uff10-\uff19一二三四五六七八九十\s]+日)/g;
  const proofRegex = /(右?\s*正本證明與原本無異|以上正本證明與原本無異)/;
  
  const dates = text.match(dateRegex) || [];
  const proofStatement = text.match(proofRegex)?.[0] || "";

  // Exhaustive role list
  const roles = [
    '審判長法官', '審判長評事', '主席委員', '法院書記官', 
    '審判長', '評議員', '書記官', '法官', '評事', '委員', '主席'
  ];

  // Robust extraction logic based on boundaries
  const extractPeople = (content) => {
    let results = [];
    let roleMatches = [];

    // 1. Find all occurrences of roles
    roles.forEach(role => {
      let idx = content.indexOf(role);
      while (idx !== -1) {
        // Prevent matching shorter roles if a longer one already covers this index
        if (!roleMatches.some(m => idx >= m.start && idx < m.end)) {
          roleMatches.push({ title: role, start: idx, end: idx + role.length });
        }
        idx = content.indexOf(role, idx + 1);
      }
    });

    // Sort by position in text
    roleMatches.sort((a, b) => a.start - b.start);

    // 2. Extract names between roles or between role and next landmark
    for (let i = 0; i < roleMatches.length; i++) {
      const current = roleMatches[i];
      const next = roleMatches[i + 1];
      
      const nameStart = current.end;
      // Name ends at next role start or proof statement start or date start or end of text
      let nameEnd = next ? next.start : content.length;
      
      const subContent = content.substring(nameStart, nameEnd);
      // Further restrict nameEnd by landmarks
      const landmarkIdx = subContent.search(/[右正中\s]/); // Landmark: "右正本", "中華民國", space
      const actualEnd = landmarkIdx !== -1 ? nameStart + landmarkIdx : nameEnd;
      
      let name = content.substring(nameStart, actualEnd).trim();
      
      // Basic cleanup for fragments based on user feedback
      // "法官都會多法一字", "評議員有可能多個評"
      const fragments = ['法', '評', '員', '委', '主'];
      if (name.length > 2) {
        fragments.forEach(f => {
          if (name.startsWith(f)) name = name.substring(1);
        });
      }
      
      // Truncate to reasonable length
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

  // Get organization info (text between first date and first person)
  let orgInfo = "";
  if (dates.length > 0 && people.length > 0) {
    const datePos = text.indexOf(dates[0]) + dates[0].length;
    const firstPersonPos = text.indexOf(people[0].role);
    if (firstPersonPos > datePos) {
      orgInfo = text.substring(datePos, firstPersonPos).trim();
    }
  }

  if (people.length === 0 && dates.length === 0) {
    return <div className="mt-8 p-6 bg-slate-50 rounded-xl text-slate-600 font-serif border-l-4 border-slate-300">{text}</div>;
  }

  return (
    <div className="mt-16 relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-slate-200"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-4 text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Legal Seal</span>
      </div>

      <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-800 h-1.5 w-full"></div>
        
        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-100 pb-6 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Court / Organization</p>
              <p className="text-xl font-black text-slate-800 tracking-tight">{orgInfo || "法院/委員會"}</p>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-0.5">Date of Issue</p>
              <p className="text-sm font-bold text-slate-600">{dates[0] || "---"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-10">
            {judges.map((person, idx) => (
              <div key={idx} className="flex items-center space-x-4 group">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <i className="fas fa-user-tie"></i>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-tighter leading-none mb-1">{person.role}</p>
                  <p className="text-lg font-black text-slate-800 tracking-widest">{person.name}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end pt-8 border-t border-slate-100 gap-8">
            <div className="flex-1">
              {proofStatement && (
                <div className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-md text-[11px] font-black">
                  <i className="fas fa-check-double mr-2 text-amber-500"></i>
                  {proofStatement}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-8">
              {clerks.map((clerk, idx) => (
                <div key={idx} className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{clerk.role}</p>
                  <p className="text-2xl font-serif font-black text-slate-900 tracking-[0.2em] border-b-2 border-slate-900 pb-1">{clerk.name}</p>
                </div>
              ))}
              
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-rose-500/20 rounded-sm rotate-12"></div>
                <div className="absolute inset-1 border border-rose-500/10 rounded-sm -rotate-6"></div>
                <span className="text-[9px] font-black text-rose-600/40 text-center leading-none uppercase tracking-tighter">Official<br/>Record<br/>Seal</span>
              </div>
            </div>
          </div>
          
          {dates.length > 1 && (
            <div className="mt-8 text-right">
              <span className="text-[10px] font-bold text-slate-300 font-mono italic">Recorded on: {dates[dates.length - 1]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalFooter;
