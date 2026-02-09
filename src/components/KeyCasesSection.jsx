import React, { useMemo } from 'react';

const KeyCasesSection = ({ db, onSelectCase }) => {
  const keyCases = useMemo(() => db.filter(item => item.ai_summary).slice(0, 6), [db]);
  if (keyCases.length === 0) return null;

  return (
    <div className="mb-12">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
        <i className="fas fa-star text-yellow-500 mr-2"></i>
        重點案例 (AI 智慧摘要)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {keyCases.map((item, idx) => (
          <div key={idx} onClick={() => onSelectCase(item.meta.id)} className="bg-white rounded-xl shadow-md border-l-4 border-yellow-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-2 right-2 text-yellow-400 opacity-20 group-hover:opacity-100 transition-opacity"><i className="fas fa-robot text-3xl"></i></div>
            <div className="p-5 flex-1">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.meta.court}</div>
              <h4 className="font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{item.meta.title}</h4>
              <div className="bg-yellow-50 rounded p-3 mb-3 border border-yellow-100">
                <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed"><i className="fas fa-quote-left text-yellow-300 mr-1"></i>{item.ai_summary[0]?.point || "點擊查看摘要詳情..."}</p>
              </div>
              <div className="text-xs text-gray-500 flex justify-between items-center mt-auto">
                <span>{item.meta.date_minguo}</span>
                <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">閱讀詳情 <i className="fas fa-arrow-right ml-1"></i></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyCasesSection;
