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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ ...modalState, isOpen: false })} title={modalState.title}>
        <div className="space-y-2">
            {modalState.items.map((item, idx) => (
                <button key={idx} onClick={() => { setModalState({ ...modalState, isOpen: false }); onSelectCase(item.meta.id); }} className="w-full text-left p-3 rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors group">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-blue-700 text-sm group-hover:underline">{item.meta.title}</span>
                        <span className="text-xs text-gray-400">{item.meta.date_minguo}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{item.main_text_clean}</div>
                </button>
            ))}
        </div>
      </Modal>
      <ExportModal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} db={db} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800"><i className="fas fa-chart-pie mr-3 text-blue-600"></i>數據儀表板</h2>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button onClick={() => setExportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center"><i className="fas fa-file-excel mr-2"></i> 匯出 Excel</button>
          {activeCategory && <button onClick={() => setActiveCategory(null)} className="text-sm bg-gray-200 px-3 py-2 rounded text-slate-600"><i className="fas fa-arrow-left mr-1"></i> 返回總覽</button>}
        </div>
      </div>

      {!activeCategory && <KeyCasesSection db={db} onSelectCase={onSelectCase} />}

      <h3 className="text-lg font-bold text-slate-700 mb-4 border-l-4 border-slate-500 pl-3">{activeCategory ? activeCategory : "資料庫統計總覽"}</h3>

      {!activeCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(stats.overview?.categories || {}).map(([cat, count]) => (
            <div key={cat} onClick={() => setActiveCategory(cat)} className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md cursor-pointer group hover:border-blue-300 transition-all">
              <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 group-hover:text-blue-600 truncate" title={cat}>{cat}</div>
              <div className="text-3xl font-bold text-slate-800">{count} <span className="text-xs font-normal text-gray-400">件判決</span></div>
              <div className="mt-4 h-1 w-full bg-gray-100 rounded overflow-hidden"><div className="h-full bg-blue-500" style={{width: '30%'}}></div></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(stats.details[activeCategory]).map(([court, data]) => (
            <div key={court} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{court}</h3>
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black">{data.total} CASES</span>
              </div>
              <div className="p-5 space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b">結果分佈</h4>
                  <SimpleBarChart data={Object.entries(data.decisions).map(([k,v]) => ({label: k, value: v})).sort((a,b) => b.value - a.value)} colorClass="bg-rose-500" onBarClick={(label) => handleChartClick(court, 'decision', label)} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b">常見主文分析</h4>
                  <ul className="space-y-1">
                    {Object.entries(data.mainTexts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([text, count], idx) => (
                      <li key={idx} onClick={() => handleChartClick(court, 'mainText', text)} className="text-xs text-gray-600 flex justify-between items-center bg-slate-50 hover:bg-blue-50 p-2 rounded cursor-pointer transition-colors">
                        <span className="mr-2 flex-1 font-mono truncate">{text}</span>
                        <span className="font-bold text-gray-300">{count}</span>
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
  );
};

export default Dashboard;
