import React from 'react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg"><i className="fas fa-book-reader mr-2"></i>系統操作說明</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h4 className="text-blue-600 font-bold border-b pb-2 mb-3">資料視覺化</h4>
            <p className="text-sm text-gray-600 leading-relaxed">儀表板展示了轉型正義案件在各法院的決定傾向。您可以點擊任何統計圖表來調閱相關的案號清單。</p>
          </section>
          <section>
            <h4 className="text-blue-600 font-bold border-b pb-2 mb-3">法條智慧標示</h4>
            <p className="text-sm text-gray-600 leading-relaxed">在閱讀判決時，點擊底部的法條標籤，系統會自動在內文中標示出該法條出現的所有段落。</p>
          </section>
        </div>
        <div className="p-4 bg-gray-50 border-t text-right">
          <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">關閉</button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
