import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const KeyCasesView = ({ db, onSelectCase }) => {
  const navigate = useNavigate();
  const keyCases = useMemo(() => db.filter(item => item.ai_summary), [db]);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-slate-200">
        <div>
          <button 
            onClick={() => navigate('/')} 
            className="mb-4 px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors flex items-center"
          >
            <i className="fas fa-arrow-left mr-2"></i> 返回儀表板
          </button>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">
            <i className="fas fa-star text-yellow-500 mr-3"></i>
            重點案例全覽
          </h2>
          <p className="text-slate-500 mt-2 font-medium">由 AI 自動摘要的核心指標性裁判書</p>
        </div>
        <div className="mt-6 md:mt-0 bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg text-blue-700 font-bold text-sm">
          共 {keyCases.length} 件案例
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {keyCases.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => onSelectCase(item.meta.id)} 
            className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer group flex flex-col h-full overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400"></div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  {item.meta.court}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {item.meta.date_minguo}
                </span>
              </div>
              
              <h4 className="text-lg font-bold text-slate-800 mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                {item.meta.title}
              </h4>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex-1">
                <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed italic">
                  <i className="fas fa-quote-left text-slate-200 mr-2 text-xl not-italic"></i>
                  {item.ai_summary[0]?.point || "點擊查看摘要詳情..."}
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-2 mt-auto border-t border-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">
                  Case ID: {item.meta.id.split(',')[0]}
                </span>
                <span className="text-blue-600 font-bold text-sm flex items-center">
                  閱讀全文 <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
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
