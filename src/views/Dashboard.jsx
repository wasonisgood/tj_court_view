import React, { useState, useMemo } from 'react';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import KeyCasesSection from '../components/KeyCasesSection';
import Modal from '../components/ui/Modal';
import ExportModal from '../components/ui/ExportModal';

const Dashboard = ({ db, onSelectCase }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', items: [] });
  const [isExportModalOpen, setExportModalOpen] = useState(false);

  const stats = useMemo(() => {
    const overview = { totalCases: db.length, totalCourts: new Set(db.map(m => m.analysis_meta.court_normalized)).size, categories: {} };
    const details = {};
    db.forEach(item => {
      const cat = item.analysis_meta.category_normalized || '未分類';
      const court = item.analysis_meta.court_normalized || '其他';
      if (!overview.categories[cat]) overview.categories[cat] = 0;
      overview.categories[cat]++;
      if (!details[cat]) details[cat] = {};
      if (!details[cat][court]) details[cat][court] = { total: 0, decisions: {}, mainTexts: {}, items: [] };
      details[cat][court].total++;
      details[cat][court].items.push(item);
      const dType = item.decision_result || '其他';
      details[cat][court].decisions[dType] = (details[cat][court].decisions[dType] || 0) + 1;
      const mText = item.main_text_clean || '(無主文)';
      details[cat][court].mainTexts[mText] = (details[cat][court].mainTexts[mText] || 0) + 1;
    });
    return { overview, details };
  }, [db]);

  const handleChartClick = (court, type, label) => {
    const categoryData = stats.details[activeCategory][court];
    let filteredItems = [];
    if (type === 'decision') filteredItems = categoryData.items.filter(m => (m.decision_result || '其他') === label);
    else if (type === 'mainText') filteredItems = categoryData.items.filter(m => (m.main_text_clean || '(無主文)') === label);
    setModalState({ isOpen: true, title: court + ' - ' + label, items: filteredItems });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ ...modalState, isOpen: false })} title={modalState.title}>
        <div className="space-y-3">
            {modalState.items.map((item, idx) => (
                <button key={idx} onClick={() => { setModalState({ ...modalState, isOpen: false }); onSelectCase(item.meta.id); }} className="w-full text-left p-4 rounded-lg border border-gray-100 hover:bg-brand-50 hover:border-brand-200 transition-all group shadow-sm hover:shadow-md bg-white">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-serif font-bold text-brand-800 text-lg group-hover:text-accent-600 transition-colors">{item.meta.title}</span>
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">{item.meta.date_minguo}</span>
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed truncate border-t pt-2 border-dashed border-gray-100">{item.main_text_clean}</div>
                </button>
            ))}
        </div>
      </Modal>
      <ExportModal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} db={db} />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-brand-900/10 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-900 mb-2">
            司法決定數據儀表板
          </h2>
          <p className="text-brand-700 font-sans max-w-2xl">
            透過數據分析，深入了解轉型正義司法決定的脈絡與趨勢。目前資料庫共收錄 <span className="font-bold text-accent-600 font-mono">{db.length}</span> 件判決。
          </p>
        </div>
        <div className="flex space-x-3 mt-6 md:mt-0">
          <button onClick={() => setExportModalOpen(true)} className="bg-white hover:bg-brand-50 text-brand-700 border border-brand-200 px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all flex items-center group">
            <i className="fas fa-file-excel mr-2 text-green-600 group-hover:scale-110 transition-transform"></i> 匯出數據
          </button>
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)} className="bg-brand-900 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-md transition-all flex items-center">
              <i className="fas fa-arrow-left mr-2"></i> 返回總覽
            </button>
          )}
        </div>
      </div>

      {!activeCategory && (
        <div className="animate-fade-in-up">
           <KeyCasesSection db={db} onSelectCase={onSelectCase} />
        </div>
      )}

      {/* Stats Grid */}
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
           <h3 className="text-xl font-serif font-bold text-brand-800 relative pl-4">
             <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-500 rounded-full"></span>
             {activeCategory ? activeCategory : "資料庫統計分類"}
           </h3>
           <div className="h-px bg-brand-900/10 flex-1"></div>
        </div>

        {!activeCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(stats.overview?.categories || {}).map(([cat, count]) => (
              <div key={cat} onClick={() => setActiveCategory(cat)} className="group bg-white rounded-xl p-6 shadow-sm border border-brand-100 hover:border-accent-300 hover:shadow-lg cursor-pointer transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <i className="fas fa-folder-open text-6xl text-brand-900"></i>
                </div>
                
                <div className="text-xs font-bold uppercase tracking-widest text-accent-600 mb-3">{cat}</div>
                <div className="text-4xl font-serif font-bold text-brand-900 mb-4">{count} <span className="text-sm font-sans font-normal text-gray-500">件</span></div>
                
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-900 h-full rounded-full transition-all duration-1000" style={{width: '100%'}}></div>
                </div>
                
                <div className="mt-4 flex justify-end">
                    <span className="text-sm font-medium text-brand-600 group-hover:text-accent-600 flex items-center transition-colors">
                        查看詳情 <i className="fas fa-arrow-right ml-2 text-xs group-hover:translate-x-1 transition-transform"></i>
                    </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {Object.entries(stats.details[activeCategory]).map(([court, data]) => (
              <div key={court} className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden flex flex-col h-full">
                <div className="bg-brand-50/50 px-6 py-4 border-b border-brand-100 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
                        <i className="fas fa-balance-scale"></i>
                    </div>
                    <h3 className="font-serif font-bold text-brand-900 text-lg">{court}</h3>
                  </div>
                  <span className="bg-brand-900 text-white text-xs px-3 py-1 rounded-full font-medium tracking-wide shadow-sm">{data.total} Cases</span>
                </div>
                
                <div className="p-6 space-y-8 flex-1">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                        <i className="fas fa-chart-pie mr-2"></i> 結果分佈
                    </h4>
                    <SimpleBarChart 
                        data={Object.entries(data.decisions).map(([k,v]) => ({label: k, value: v})).sort((a,b) => b.value - a.value)} 
                        colorClass="bg-brand-800" 
                        onBarClick={(label) => handleChartClick(court, 'decision', label)} 
                    />
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                        <i className="fas fa-align-left mr-2"></i> 常見主文
                    </h4>
                    <ul className="space-y-2">
                      {Object.entries(data.mainTexts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([text, count], idx) => (
                        <li key={idx} onClick={() => handleChartClick(court, 'mainText', text)} className="group flex justify-between items-start bg-gray-50 hover:bg-accent-50/30 p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:border-accent-200">
                          <span className="text-sm text-brand-700 font-medium leading-snug line-clamp-2 mr-3 group-hover:text-brand-900">{text}</span>
                          <span className="text-xs font-bold text-white bg-gray-300 group-hover:bg-accent-500 px-2 py-0.5 rounded-full min-w-[1.5rem] text-center transition-colors">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;