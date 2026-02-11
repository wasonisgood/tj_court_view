import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';

const ExportModal = ({ isOpen, onClose, onExport, db }) => {
  const [mode, setMode] = useState('list');
  const [lang, setLang] = useState('zh');
  
  if (!isOpen) return null;

  const translations = {
    zh: {
      '案號': '案號', '標題': '標題', '法院': '法院', '判決日期': '判決日期', '案由': '案由', 
      '判決結果': '判決結果', '原始連結': '原始連結', '主文': '主文', 'AI 摘要': 'AI 摘要', '全文內容': '全文內容',
      '【法院案件量統計】': '【法院案件量統計】', '年代趨勢統計': '年代趨勢統計', '年代區間': '年代區間',
      '未分類': '未分類', '其他': '其他', '年代': '年代'
    },
    en: {
      '案號': 'Case ID', '標題': 'Title', '法院': 'Court', '判決日期': 'Date', '案由': 'Cause', 
      '判決結果': 'Decision', '原始連結': 'URL', '主文': 'Main Text', 'AI 摘要': 'AI Summary', '全文內容': 'Full Content',
      '【法院案件量統計】': '[Court Statistics]', '年代趨勢統計': 'Trend Statistics', '年代區間': 'Decade',
      '未分類': 'Unclassified', '其他': 'Other', '年代': 's'
    }
  };

  const catMap = {
    '戒嚴時期人民受損權利回復條例': 'Restoration of People\'s Rights (Martial Law)',
    '二二八事件處理及補償條例': '228 Incident Handling & Compensation',
    '戒嚴時期不當叛亂暨匪諜審判案件補償條例': 'Improper Trials Compensation (Martial Law)',
    '政黨及其附隨組織不當取得財產處理條例': 'Ill-gotten Assets Settlement',
    '促進轉型正義條例': 'Promoting Transitional Justice',
    '威權統治時期國家不法行為被害者權利回復條例': 'Victims\' Rights Restoration (Authoritarian Rule)'
  };

  const courtMap = {
    '司法院刑事補償法庭': 'Criminal Compensation Court of the Judicial Yuan',
    '最高法院': 'Supreme Court',
    '最高行政法院': 'Supreme Administrative Court',
    '臺北高等行政法院': 'Taipei High Administrative Court',
    '臺中高等行政法院': 'Taichung High Administrative Court',
    '臺南高等行政法院': 'Tainan High Administrative Court',
    '高雄高等行政法院': 'Kaohsiung High Administrative Court',
    '臺灣高等法院': 'Taiwan High Court',
    '臺灣臺北地方法院': 'Taiwan Taipei District Court',
    '臺灣新北地方法院': 'Taiwan New Taipei District Court',
    '臺灣桃園地方法院': 'Taiwan Taoyuan District Court',
    '臺灣臺中地方法院': 'Taiwan Taichung District Court',
    '臺灣臺南地方法院': 'Taiwan Tainan District Court',
    '臺灣高雄地方法院': 'Taiwan Kaohsiung District Court'
  };

  const decisionMap = {
    '駁回': 'Dismissed',
    '聲請駁回': 'Petition Dismissed',
    '覆審駁回': 'Review Dismissed',
    '撤銷': 'Revoked / Overturned',
    '撤銷原判/決定': 'Original Judgment/Decision Revoked',
    '給予補償': 'Compensation Granted',
    '原處分撤銷': 'Original Disposition Revoked',
    '不受理': 'Inadmissible',
    '移送': 'Transferred',
    '司法院刑事補償法庭': 'Criminal Compensation Court of the Judicial Yuan'
  };

  const t = (key) => translations[lang][key] || key;
  const tc = (cat) => lang === 'en' ? (catMap[cat] || cat) : cat;
  const tCourt = (court) => lang === 'en' ? (courtMap[court] || court) : court;
  const tDec = (dec) => lang === 'en' ? (decisionMap[dec] || dec) : dec;

  // Internal export handler if not provided by parent, or use parent's
  const handleExportClick = () => {
    if (onExport) {
        onExport(mode, lang);
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
            const base = { 
                [t('案號')]: item.meta.id, 
                [t('標題')]: item.meta.title, 
                [t('法院')]: tCourt(courtName), 
                [t('判決日期')]: lang === 'en' ? item.meta.date_iso : item.meta.date_minguo, 
                [t('案由')]: item.meta.cause, 
                [t('判決結果')]: tDec(item.decision_result), 
                [t('原始連結')]: item.meta.source_url, 
                [t('主文')]: item.main_text_clean 
            };
            if (mode === 'summary') base[t('AI 摘要')] = item.ai_summary ? item.ai_summary.map((s, i) => (i+1) + '. ' + s.point).join('\n') : '';
            else if (mode === 'full') base[t('全文內容')] = item.sections ? Object.entries(item.sections).map(([k, v]) => '【' + k + '】\n' + v).join('\n\n') : '';
            return base;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const courtStats = {}; groups[cat].forEach(i => { const c = i.analysis_meta.court_normalized || i.meta.court || '其他'; courtStats[c] = (courtStats[c]||0)+1; });
        const statRows = [{}, {[t('案號')]: t('【法院案件量統計】')}, ...Object.entries(courtStats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>({[t('案號')]: tCourt(c), [t('標題')]: n + (lang === 'en' ? ' cases' : ' 件')}))];
        XLSX.utils.sheet_add_json(ws, statRows, { skipHeader: true, origin: -1 });
        XLSX.utils.book_append_sheet(wb, ws, tc(cat).substring(0, 31));
    });
    
    const decadalStats = {};
    db.forEach(item => {
        const date = item.meta.date_iso; if(!date) return;
        const year = parseInt(date.split('-')[0]); if(isNaN(year)) return;
        const decade = Math.floor(year/10)*10 + t('年代');
        const cat = item.analysis_meta.category_normalized || '未分類';
        if(!decadalStats[decade]) decadalStats[decade] = {}; if(!decadalStats[decade][cat]) decadalStats[decade][cat] = 0; decadalStats[decade][cat]++;
    });
    
    const trendRows = Object.keys(decadalStats).sort().map(d => { 
        const row = { [t('年代區間')]: d }; 
        sortedCats.forEach(c => row[tc(c)] = decadalStats[d][c] || 0); 
        return row; 
    });
    
    const wsTrends = XLSX.utils.json_to_sheet(trendRows);
    trendRows.forEach((row, rIdx) => { 
        let maxV = -1, maxC = -1; 
        sortedCats.forEach((c, cIdx) => { 
            const v = row[tc(c)]||0; 
            if(v > maxV && v > 0) { maxV = v; maxC = cIdx+1; } 
        }); 
        if(maxC !== -1) { 
            const ref = XLSX.utils.encode_cell({r: rIdx+1, c: maxC}); 
            if(wsTrends[ref]) wsTrends[ref].s = { fill: { fgColor: { rgb: "FFFF00" } }, font: { bold: true } }; 
        } 
    });
    
    XLSX.utils.book_append_sheet(wb, wsTrends, t('年代趨勢統計'));
    
    try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const s2ab = (s) => { const buf = new ArrayBuffer(s.length); const view = new Uint8Array(buf); for (let i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; return buf; };
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = (lang === 'en' ? "Transitional_Justice_Export_" : "轉型正義判決匯出_") + new Date().toISOString().split('T')[0] + ".xlsx"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
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
          <div>
            <p className="text-sm text-gray-500 mb-2">請選擇匯出語言：</p>
            <div className="flex space-x-2">
              <button onClick={() => setLang('zh')} className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${lang === 'zh' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>繁體中文</button>
              <button onClick={() => setLang('en')} className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${lang === 'en' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>English</button>
            </div>
          </div>

          <p className="text-sm text-gray-500">請選擇匯出的資料範圍：</p>
          <div className="space-y-2">
            {[ 
              { id: 'list', label: lang === 'en' ? 'Basic List' : '基本列表 (案號、標題、結果)', icon: 'fa-list' },
              { id: 'summary', label: lang === 'en' ? 'With AI Summary' : '包含 AI 摘要 (AI 重點摘要內容)', icon: 'fa-robot' },
              { id: 'full', label: lang === 'en' ? 'With Full Text' : '包含判決全文 (完整理由段落)', icon: 'fa-file-alt' }
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
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded font-bold text-gray-600 hover:bg-gray-100">{lang === 'en' ? 'Cancel' : '取消'}</button>
          <button onClick={handleExportClick} className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-md">{lang === 'en' ? 'Export' : '開始匯出'}</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
