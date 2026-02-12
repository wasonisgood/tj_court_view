import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ db, searchTerm, setSearchTerm, isOpen, setIsOpen, navigateToCase, selectedId }) => {
  const navigate = useNavigate();
  
  const sidebarData = useMemo(() => {
    const grouped = {};
    db.forEach(item => {
      const name = item.meta.title;
      if (searchTerm && !name.includes(searchTerm)) return;
      
      const cat = item.analysis_meta.category_normalized;
      const jType = item.analysis_meta.judgment_type_normalized || '其他';
      const dResult = item.decision_result || '其他';
      
      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][jType]) grouped[cat][jType] = {};
      if (!grouped[cat][jType][dResult]) grouped[cat][jType][dResult] = [];
      grouped[cat][jType][dResult].push(item);
    });
    return grouped;
  }, [db, searchTerm]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-40 w-80 bg-brand-950 text-gray-300 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-r border-white/5 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 bg-brand-950 shrink-0 border-b border-white/10">
          <div className="flex items-center space-x-3 mb-6 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded bg-accent-500 flex items-center justify-center text-brand-950">
              <i className="fas fa-scale-balanced text-lg"></i>
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-white leading-none tracking-wide">轉型正義</h1>
              <span className="text-[10px] uppercase tracking-[0.2em] text-accent-500">Judicial Decisions</span>
            </div>
          </div>

          <div className="relative group">
            <i className="fas fa-search absolute left-3 top-2.5 text-gray-500 group-focus-within:text-accent-500 transition-colors text-sm"></i>
            <input 
              type="text" 
              placeholder="檢索判決書..." 
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500 transition-all" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>

          <button 
            onClick={() => {
              navigate('/key-cases');
              if (window.innerWidth < 768) setIsOpen(false);
            }}
            className="w-full mt-4 flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-white/5 hover:bg-accent-500/10 border border-white/10 hover:border-accent-500/50 text-xs font-bold text-gray-300 hover:text-accent-500 uppercase tracking-wider transition-all duration-200 group"
          >
            <i className="fas fa-star text-accent-500 group-hover:scale-110 transition-transform"></i>
            <span>重點案例全覽</span>
          </button>
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {Object.entries(sidebarData).length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              無符合資料
            </div>
          ) : (
            Object.entries(sidebarData).map(([cat, jTypes]) => (
              <div key={cat} className="animate-fade-in">
                <h3 className="px-2 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">{cat}</h3>
                <div className="space-y-1">
                  {Object.entries(jTypes).map(([jType, dResults]) => (
                    <div key={jType} className="mb-2">
                      <details className="group" open>
                        <summary className="flex items-center px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer list-none text-sm text-gray-300 transition-colors">
                          <i className="fas fa-folder text-brand-700 mr-2 group-open:text-accent-500 transition-colors text-xs"></i>
                          <span className="font-medium">{jType}</span>
                          <i className="fas fa-chevron-right ml-auto text-[10px] text-gray-600 transition-transform group-open:rotate-90"></i>
                        </summary>
                        <div className="pl-3 mt-1 space-y-1 border-l border-white/5 ml-3.5">
                          {Object.entries(dResults).map(([dResult, items]) => (
                            <details key={dResult} className="group/sub">
                              <summary className="flex items-center px-2 py-1 rounded hover:bg-white/5 cursor-pointer list-none text-xs text-gray-400 hover:text-gray-200 transition-colors">
                                <span className="flex-1 truncate">{dResult}</span>
                                <span className="text-[10px] bg-white/10 px-1.5 rounded-full ml-2">{items.length}</span>
                              </summary>
                              <div className="pl-2 mt-1 space-y-0.5">
                                {items.map(item => (
                                  <button 
                                    key={item.meta.id} 
                                    onClick={() => {
                                      navigateToCase(item.meta.id);
                                      if (window.innerWidth < 768) setIsOpen(false);
                                    }} 
                                    className={`
                                      w-full text-left text-[11px] px-3 py-2 rounded-md truncate transition-all duration-200 relative
                                      ${selectedId === item.meta.id 
                                        ? 'bg-accent-500/10 text-accent-500 font-medium pl-4 border-l-2 border-accent-500' 
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                                    `}
                                  >
                                    {item.ai_summary && <i className="fas fa-star text-accent-500 mr-1.5 text-[8px]" title="AI 重點案例"></i>}
                                    {item.meta.title}
                                  </button>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer Info */}
        <div className="p-4 border-t border-white/10 text-[10px] text-gray-600 text-center">
          TJ-Court-View v1.0
        </div>
      </div>
    </>
  );
};

export default Sidebar;