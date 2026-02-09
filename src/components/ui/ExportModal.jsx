import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';

const ExportModal = ({ isOpen, onClose, onExport, db }) => {
  const [mode, setMode] = useState('list');
  if (!isOpen) return null;

  // Internal export handler if not provided by parent, or use parent's
  const handleExportClick = () => {
    if (onExport) {
        onExport(mode);
        return;
    }
    
    // Logic from original file
    const wb = XLSX.utils.book_new();
    const groups = {};
    db.forEach(item => { const cat = item.analysis_meta.category_normalized || '未分類'; if (!groups[cat]) groups[cat] = []; groups[cat].push(item); });
    const catWeights = { '戒嚴時期人民受損權利回復條例': 1, '二二八事件處理及補償條例': 2, '戒嚴時期不當叛亂暨匪諜審判案件補償條例': 3, '政黨及其附隨組織不當取得財產處理條例': 4, '促進轉型正義條例': 5, '威權統治時期國家不法行為被害者權利回復條例': 6 };
    const sortedCats = Object.keys(groups).sort((a, b) => (catWeights[a]||99) - (catWeights[b]||99));
    sortedCats.forEach(cat => {
        const rows = groups[cat].map(item => {
            const courtName = item.analysis_meta.court_normalized || item.meta.court || '其他';
            const base = { '案號': item.meta.id, '標題': item.meta.title, '法院': courtName, '判決日期': item.meta.date_minguo, '案由': item.meta.cause, '判決結果': item.decision_result, '原始連結': item.meta.source_url, '主文': item.main_text_clean };
            if (mode === 'summary') base['AI 摘要'] = item.ai_summary ? item.ai_summary.map((s, i) => (i+1) + '. ' + s.point).join('\n') : '';
            else if (mode === 'full') base['全文內容'] = item.sections ? Object.entries(item.sections).map(([k, v]) => '【' + k + '】\n' + v).join('\n\n') : '';
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const courtStats = {}; groups[cat].forEach(i => { const c = i.analysis_meta.court_normalized || i.meta.court || '其他'; courtStats[c] = (courtStats[c]||0)+1; });
        const statRows = [{}, {'案號': '【法院案件量統計】'}, ...Object.entries(courtStats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>({'案號':c, '標題': n + ' 件'}))];
        XLSX.utils.sheet_add_json(ws, statRows, { skipHeader: true, origin: -1 });
        XLSX.utils.book_append_sheet(wb, ws, cat.substring(0, 31));
    });
    const decadalStats = {};
    db.forEach(item => {
        const date = item.meta.date_iso; if(!date) return;
        const year = parseInt(date.split('-')[0]); if(isNaN(year)) return;
        const decade = Math.floor(year/10)*10 + "年代";
        const cat = item.analysis_meta.category_normalized || '未分類';
        if(!decadalStats[decade]) decadalStats[decade] = {}; if(!decadalStats[decade][cat]) decadalStats[decade][cat] = 0; decadalStats[decade][cat]++;
    });
    const trendRows = Object.keys(decadalStats).sort().map(d => { const row = { '年代區間': d }; sortedCats.forEach(c => row[c] = decadalStats[d][c] || 0); return row; });
    const wsTrends = XLSX.utils.json_to_sheet(trendRows);
    trendRows.forEach((row, rIdx) => { let maxV = -1, maxC = -1; sortedCats.forEach((c, cIdx) => { const v = row[c]||0; if(v > maxV && v > 0) { maxV = v; maxC = cIdx+1; } }); if(maxC !== -1) { const ref = XLSX.utils.encode_cell({r: rIdx+1, c: maxC}); if(wsTrends[ref]) wsTrends[ref].s = { fill: { fgColor: { rgb: "FFFF00" } }, font: { bold: true } }; } });
    XLSX.utils.book_append_sheet(wb, wsTrends, "年代趨勢統計");
    try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const s2ab = (s) => { const buf = new ArrayBuffer(s.length); const view = new Uint8Array(buf); for (let i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; return buf; };
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "轉型正義判決匯出_" + new Date().toISOString().split('T')[0] + ".xlsx"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    } catch(e) { console.error(e); XLSX.writeFile(wb, "export.xlsx"); }
    
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b bg-slate-800 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg"><i className="fas fa-file-excel mr-2 text-green-400"></i>匯出 Excel 報表</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><i className="fas fa-times"></i></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">請選擇匯出的資料範圍：</p>
          <div className="space-y-2">
            {[ 
              { id: 'list', label: '基本列表 (案號、標題、結果)', icon: 'fa-list' },
              { id: 'summary', label: '包含 AI 摘要 (AI 重點摘要內容)', icon: 'fa-robot' },
              { id: 'full', label: '包含判決全文 (完整理由段落)', icon: 'fa-file-alt' }
            ].map(opt => (
              <label key={opt.id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${mode === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="exportMode" className="hidden" checked={mode === opt.id} onChange={() => setMode(opt.id)} />
                <i className={`fas ${opt.icon} mr-3 w-6 text-center ${mode === opt.id ? 'text-blue-600' : 'text-gray-400'}`}></i>
                <span className={`text-sm font-bold ${mode === opt.id ? 'text-blue-900' : 'text-gray-600'}`}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 bg-gray-50 border-t flex space-x-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-100">取消</button>
          <button onClick={handleExportClick} className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-md">開始匯出</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
