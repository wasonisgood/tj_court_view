import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const KeyCasesSection = ({ db, onSelectCase }) => {
  const navigate = useNavigate();
  const keyCases = useMemo(() => db.filter(item => item.ai_summary).slice(0, 6), [db]);
  if (keyCases.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-serif font-bold text-brand-900 flex items-center">
          <i className="fas fa-star text-accent-500 mr-3"></i>
          重點案例
          <span className="ml-3 text-xs font-sans font-normal bg-accent-100 text-accent-800 px-2 py-0.5 rounded-full">AI 智慧摘要</span>
        </h3>
        <button 
          onClick={() => navigate('/key-cases')}
          className="text-sm font-bold text-brand-600 hover:text-accent-600 transition-colors flex items-center group uppercase tracking-wider"
        >
          查看更多
          <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {keyCases.map((item, idx) => (
          <div key={idx} onClick={() => onSelectCase(item.meta.id)} className="group bg-white rounded-xl shadow-sm border border-brand-100 hover:border-accent-300 hover:shadow-lg transition-all cursor-pointer flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent-500/50 group-hover:bg-accent-500 transition-colors"></div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.meta.court}</div>
                 <i className="fas fa-robot text-accent-200 group-hover:text-accent-500 transition-colors"></i>
              </div>
              
              <h4 className="font-serif font-bold text-lg text-brand-900 mb-4 line-clamp-2 group-hover:text-accent-700 transition-colors leading-tight">
                {item.meta.title}
              </h4>
              
              <div className="bg-paper-100 rounded-lg p-4 mb-4 border border-transparent group-hover:border-accent-100 transition-colors relative">
                <i className="fas fa-quote-left text-accent-200 absolute top-2 left-2 text-xs"></i>
                <p className="text-xs text-brand-700 line-clamp-3 leading-relaxed pl-3 indent-2">
                  {item.ai_summary[0]?.point || "點擊查看摘要詳情..."}
                </p>
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="font-mono text-gray-500">{item.meta.date_minguo}</span>
                <span className="text-brand-600 font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex items-center">
                  閱讀 <i className="fas fa-arrow-right ml-1"></i>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyCasesSection;