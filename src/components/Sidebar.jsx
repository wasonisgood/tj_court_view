import React, { useMemo } from 'react';

const Sidebar = ({ db, searchTerm, setSearchTerm, isOpen, setIsOpen, navigateToCase, selectedId }) => {
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
    <div className={`fixed inset-0 z-40 bg-slate-900 text-gray-300 flex flex-col transition-transform md:translate-x-0 md:relative md:w-80 md:flex ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-4 bg-slate-800 shadow z-10 hidden md:block">
        <h1 className="font-bold text-white mb-4 flex justify-between">
          <span className="cursor-pointer">轉型正義決定系統</span>
        </h1>
        <input 
          type="text" 
          placeholder="快速檢索..." 
          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>
      <div className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-1">
        {Object.entries(sidebarData).map(([cat, jTypes]) => (
          <details key={cat} className="group">
            <summary className="flex items-center p-2 rounded hover:bg-slate-800 text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer list-none">
              <i className="fas fa-chevron-right arrow mr-2 opacity-50 transition-transform group-open:rotate-90"></i>{cat}
            </summary>
            <div className="pl-4 mt-1 space-y-1">
              {Object.entries(jTypes).map(([jType, dResults]) => (
                <details key={jType} className="group">
                  <summary className="flex items-center p-2 rounded hover:bg-slate-800 text-[10px] font-bold text-blue-400 cursor-pointer list-none">
                    <i className="fas fa-chevron-right arrow mr-2 transition-transform group-open:rotate-90"></i>{jType}
                  </summary>
                  <div className="pl-4 mt-1 space-y-1">
                    {Object.entries(dResults).map(([dResult, items]) => (
                      <details key={dResult} className="group">
                        <summary className="flex items-center p-2 rounded hover:bg-slate-800 text-[10px] text-gray-400 cursor-pointer list-none">
                          <i className="fas fa-chevron-right arrow mr-2 transition-transform group-open:rotate-90"></i>{dResult} ({items.length})
                        </summary>
                        <div className="pl-4 mt-1 space-y-0.5 border-l border-slate-700 ml-2">
                          {items.map(item => (
                            <button 
                              key={item.meta.id} 
                              onClick={() => {
                                navigateToCase(item.meta.id);
                                if (window.innerWidth < 768) setIsOpen(false);
                              }} 
                              className={`w-full text-left text-[10px] px-3 py-1.5 rounded truncate transition-colors flex items-center ${selectedId === item.meta.id ? 'bg-blue-900 text-blue-200' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              {item.ai_summary && <i className="fas fa-star text-yellow-500 mr-2 text-[8px]" title="AI 重點案例"></i>}
                              {item.meta.title}
                            </button>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
