import React from 'react';

const PrefaceCard = ({ text }) => {
  if (!text) return null;

  const roles = [
    "上訴人", "被上訴人", "原告", "被告", "聲請人", "相對人", 
    "再審原告", "再審被告", "抗告人", "代表人", "訴訟代理人", 
    "辯護人", "參加人", "輔佐人"
  ];

  // 1. Find boundaries
  const boundaries = ["右當事人間", "上列當事人間", "當事人間", "上列聲請人", "因.*事件", "對本院", "不服.*決定"];
  let content = text.replace(/^前置\s*/, '');
  
  let splitIndex = -1;
  for (const b of boundaries) {
    const re = new RegExp(b);
    const match = content.match(re);
    if (match) {
      if (splitIndex === -1 || match.index < splitIndex) {
        splitIndex = match.index;
      }
    }
  }

  // Split
  let partyText = splitIndex !== -1 ? content.substring(0, splitIndex) : content;
  let narrativeText = splitIndex !== -1 ? content.substring(splitIndex) : "";

  // 2. Parse parties
  const rolePattern = new RegExp(`(${roles.join('|')})`, 'g');
  const parts = partyText.split(rolePattern);
  const parties = [];
  for (let i = 1; i < parts.length; i += 2) {
    const role = parts[i];
    let name = parts[i+1] ? parts[i+1].trim() : "";
    name = name.replace(/[，。；：\s]+$/, '').replace(/^[，。；：\s]+/, '');
    if (role && name) parties.push({ role, name });
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Party Card */}
      {parties.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              <i className="fas fa-users mr-2"></i>訴訟當事人
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {parties.map((p, idx) => (
              <div key={idx} className="flex items-center group">
                <span className={`
                  shrink-0 px-2 py-1 rounded text-[10px] font-black mr-3 w-20 text-center uppercase
                  ${['原告', '上訴人', '聲請人', '再審原告', '抗告人'].includes(p.role) ? 'bg-blue-600 text-white' : ''}
                  ${['被告', '被上訴人', '相對人', '再審被告'].includes(p.role) ? 'bg-rose-600 text-white' : ''}
                  ${['代表人', '訴訟代理人', '辯護人'].includes(p.role) ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'}
                `}>
                  {p.role}
                </span>
                <span className="text-sm text-slate-700 font-bold group-hover:text-blue-600 transition-colors">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrative */}
      {narrativeText && (
        <div className="relative pl-6 py-2">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-full"></div>
          <p className="text-sm text-slate-500 italic leading-relaxed">
            {narrativeText.trim()}
          </p>
        </div>
      )}

      {/* Fallback */}
      {parties.length === 0 && !narrativeText && (
        <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300 text-gray-400 text-sm italic text-center">
          無結構化前置資訊
        </div>
      )}
    </div>
  );
};

export default PrefaceCard;
