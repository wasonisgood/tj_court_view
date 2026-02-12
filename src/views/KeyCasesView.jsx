import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const KeyCasesView = ({ db, onSelectCase }) => {
  const navigate = useNavigate();
  const [filterCourt, setFilterCourt] = useState('All');
  
  const keyCases = useMemo(() => {
    let cases = db.filter(item => item.ai_summary);
    if (filterCourt !== 'All') {
      cases = cases.filter(item => (item.analysis_meta.court_normalized || item.meta.court) === filterCourt);
    }
    return cases;
  }, [db, filterCourt]);

  const courts = useMemo(() => ['All', ...new Set(db.filter(item => item.ai_summary).map(item => item.analysis_meta.court_normalized || item.meta.court))], [db]);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-brand-900/10 pb-6 gap-6">
        <div>
          <button onClick={() => navigate('/')} className="text-xs font-bold text-gray-400 hover:text-brand-800 transition-colors uppercase tracking-widest mb-4 flex items-center">
            <i className="fas fa-arrow-left mr-2"></i> Back to Dashboard
          </button>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-900 mb-2">重點案例全覽</h2>
          <p className="text-brand-700 font-sans max-w-2xl">
            收錄經過 AI 智慧分析的重點判決，提供快速摘要與關鍵爭點解析。
          </p>
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
          {courts.map(c => (
            <button 
              key={c}
              onClick={() => setFilterCourt(c)}
              className={`
                px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
                ${filterCourt === c 
                  ? 'bg-brand-900 text-white shadow-md' 
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-300 hover:text-brand-700'}
              `}
            >
              {c === 'All' ? '全部法院' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {keyCases.map((item, idx) => (
          <div key={idx} onClick={() => onSelectCase(item.meta.id)} className="group bg-white rounded-xl shadow-sm border border-brand-100 hover:border-accent-300 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden relative">
            {/* Hover Accent Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-900 to-brand-700 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
            
            <div className="p-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                 <div className="px-2 py-1 bg-brand-50 text-brand-600 rounded text-[10px] font-black uppercase tracking-widest">{item.meta.court}</div>
                 <i className="fas fa-star text-accent-200 group-hover:text-accent-500 transition-colors transform group-hover:rotate-12 duration-300"></i>
              </div>
              
              <h4 className="font-serif font-bold text-xl text-brand-900 mb-4 line-clamp-2 group-hover:text-accent-700 transition-colors leading-snug">
                {item.meta.title}
              </h4>
              
              <div className="bg-paper-50 rounded-lg p-5 mb-6 border border-transparent group-hover:border-accent-100 transition-colors relative flex-1">
                <i className="fas fa-quote-left text-accent-200 absolute top-3 left-3 text-sm opacity-50"></i>
                <p className="text-sm text-brand-800 line-clamp-4 leading-relaxed pl-2 relative z-10 font-serif">
                  {item.ai_summary[0]?.point || "點擊查看摘要詳情..."}
                </p>
              </div>
              
              <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-xs font-mono text-gray-400 group-hover:text-brand-500 transition-colors">{item.meta.date_minguo}</span>
                <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-900 group-hover:text-white transition-all duration-300 shadow-sm">
                  <i className="fas fa-arrow-right text-xs"></i>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyCasesView;