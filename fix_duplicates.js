const fs = require('fs');
const path = './index.html';
let content = fs.readFileSync(path, 'utf-8');

const dashboardStartMarker = '        const Dashboard = ({ db, onSelectCase }) => {';
const dashboardEndMarker = '        const GEMINI_API_KEY';

const startIdx = content.indexOf(dashboardStartMarker);
const endIdx = content.indexOf(dashboardEndMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Dashboard markers not found. Start:", startIdx, "End:", endIdx);
    // Print a bit of file to see what's wrong
    console.log("Snippet near 350:", content.substring(340, 450));
    process.exit(1);
}

const beforeDashboard = content.substring(0, startIdx);
const afterDashboard = content.substring(endIdx);

const cleanDashboard = "        const Dashboard = ({ db, onSelectCase }) => {\n" +
"            const [activeCategory, setActiveCategory] = useState(null);\n" +
"            const [modalState, setModalState] = useState({ isOpen: false, title: '', items: [] });\n" +
"            const [isExportModalOpen, setExportModalOpen] = useState(false);\n" +
"\n" +
"            const stats = useMemo(() => {\n" +
"                const overview = { totalCases: db.length, totalCourts: new Set(db.map(m => m.analysis_meta.court_normalized)).size, categories: {} };\n" +
"                const details = {};\n" +
"                db.forEach(item => {\n" +
"                    const cat = item.analysis_meta.category_normalized || '未分類';\n" +
"                    const court = item.analysis_meta.court_normalized || '其他';\n" +
"                    if (!overview.categories[cat]) overview.categories[cat] = 0;\n" +
"                    overview.categories[cat]++;\n" +
"                    if (!details[cat]) details[cat] = {};\n" +
"                    if (!details[cat][court]) details[cat][court] = { total: 0, decisions: {}, mainTexts: {}, items: [] };\n" +
"                    details[cat][court].total++;\n" +
"                    details[cat][court].items.push(item);\n" +
"                    const dType = item.decision_result || '其他';\n" +
"                    details[cat][court].decisions[dType] = (details[cat][court].decisions[dType] || 0) + 1;\n" +
"                    const mText = item.main_text_clean || '(無主文)';\n" +
"                    details[cat][court].mainTexts[mText] = (details[cat][court].mainTexts[mText] || 0) + 1;\n" +
"                });\n" +
"                return { overview, details };\n" +
"            }, [db]);\n" +
"\n" +
"            const handleChartClick = (court, type, label) => {\n" +
"                const categoryData = stats.details[activeCategory][court];\n" +
"                let filteredItems = [];\n" +
"                if (type === 'decision') filteredItems = categoryData.items.filter(m => (m.decision_result || '其他') === label);\n" +
"                else if (type === 'mainText') filteredItems = categoryData.items.filter(m => (m.main_text_clean || '(無主文)') === label);\n" +
"                setModalState({ isOpen: true, title: court + ' - ' + label, items: filteredItems });\n" +
"            };\n" +
"\n" +
"            const handleExport = (mode) => {\n" +
"                const wb = XLSX.utils.book_new();\n" +
"                const groups = {};\n" +
"                db.forEach(item => { const cat = item.analysis_meta.category_normalized || '未分類'; if (!groups[cat]) groups[cat] = []; groups[cat].push(item); });\n" +
"                const catWeights = { '戒嚴時期人民受損權利回復條例': 1, '二二八事件處理及補償條例': 2, '戒嚴時期不當叛亂暨匪諜審判案件補償條例': 3, '政黨及其附隨組織不當取得財產處理條例': 4, '促進轉型正義條例': 5, '威權統治時期國家不法行為被害者權利回復條例': 6 };\n" +
"                const sortedCats = Object.keys(groups).sort((a, b) => (catWeights[a]||99) - (catWeights[b]||99));\n" +
"                sortedCats.forEach(cat => {\n" +
"                    const rows = groups[cat].map(item => {\n" +
"                        const courtName = item.analysis_meta.court_normalized || item.meta.court || '其他';\n" +
"                        const base = { '案號': item.meta.id, '標題': item.meta.title, '法院': courtName, '判決日期': item.meta.date_minguo, '案由': item.meta.cause, '判決結果': item.decision_result, '原始連結': item.meta.source_url, '主文': item.main_text_clean };\n" +
"                        if (mode === 'summary') base['AI 摘要'] = item.ai_summary ? item.ai_summary.map((s, i) => (i+1) + '. ' + s.point).join('\\n') : '';\n" +
"                        else if (mode === 'full') base['全文內容'] = item.sections ? Object.entries(item.sections).map(([k, v]) => '【' + k + '】\\n' + v).join('\\n\\n') : '';\n" +
"                        return base;\n" +
"                    });\n" +
"                    const ws = XLSX.utils.json_to_sheet(rows);\n" +
"                    const courtStats = {}; groups[cat].forEach(i => { const c = i.analysis_meta.court_normalized || i.meta.court || '其他'; courtStats[c] = (courtStats[c]||0)+1; });\n" +
"                    const statRows = [{}, {'案號': '【法院案件量統計】'}, ...Object.entries(courtStats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>({'案號':c, '標題': n + ' 件'}))];\n" +
"                    XLSX.utils.sheet_add_json(ws, statRows, { skipHeader: true, origin: -1 });\n" +
"                    XLSX.utils.book_append_sheet(wb, ws, cat.substring(0, 31));\n" +
"                });\n" +
"                const decadalStats = {};\n" +
"                db.forEach(item => {\n" +
"                   const date = item.meta.date_iso; if(!date) return;\n" +
"                   const year = parseInt(date.split('-')[0]); if(isNaN(year)) return;\n" +
"                   const decade = Math.floor(year/10)*10 + \"年代\";\n" +
"                   const cat = item.analysis_meta.category_normalized || '未分類';\n" +
"                   if(!decadalStats[decade]) decadalStats[decade] = {}; if(!decadalStats[decade][cat]) decadalStats[decade][cat] = 0; decadalStats[decade][cat]++;\n" +
"                });\n" +
"                const trendRows = Object.keys(decadalStats).sort().map(d => { const row = { '年代區間': d }; sortedCats.forEach(c => row[c] = decadalStats[d][c] || 0); return row; });\n" +
"                const wsTrends = XLSX.utils.json_to_sheet(trendRows);\n" +
"                trendRows.forEach((row, rIdx) => { let maxV = -1, maxC = -1; sortedCats.forEach((c, cIdx) => { const v = row[c]||0; if(v > maxV && v > 0) { maxV = v; maxC = cIdx+1; } }); if(maxC !== -1) { const ref = XLSX.utils.encode_cell({r: rIdx+1, c: maxC}); if(wsTrends[ref]) wsTrends[ref].s = { fill: { fgColor: { rgb: \"FFFF00\" } }, font: { bold: true } }; } });\n" +
"                XLSX.utils.book_append_sheet(wb, wsTrends, \"年代趨勢統計\");\n" +
"                try {\n" +
"                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });\n" +
"                    const s2ab = (s) => { const buf = new ArrayBuffer(s.length); const view = new Uint8Array(buf); for (let i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; return buf; };\n" +
"                    const blob = new Blob([s2ab(wbout)], { type: \"application/octet-stream\" });\n" +
"                    const url = URL.createObjectURL(blob); const a = document.createElement(\"a\"); a.href = url; a.download = \"轉型正義判決匯出_\" + new Date().toISOString().split('T')[0] + \".xlsx\"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);\n" +
"                } catch(e) { console.error(e); XLSX.writeFile(wb, \"export.xlsx\"); }\n" +
"                setExportModalOpen(false);\n" +
"            };\n" +
"\n" +
"            return (\n" +
"                <div class=\"p-4 md:p-6 max-w-7xl mx-auto\">\n" +
"                    <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ ...modalState, isOpen: false })} title={modalState.title} items={modalState.items} onSelectCase={(id) => { setModalState({ ...modalState, isOpen: false }); onSelectCase(id); }} />\n" +
"                    <ExportModal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} onExport={handleExport} />\n" +
"                    \n" +
"                    <div class=\"flex flex-col md:flex-row md:items-center justify-between mb-8\">\n" +
"                        <h2 class=\"text-xl md:text-2xl font-bold text-slate-800\"><i class=\"fas fa-chart-pie mr-3 text-blue-600\"></i>數據儀表板</h2>\n" +
"                        <div class=\"flex space-x-2 mt-4 md:mt-0\">\n" +
"                            <button onClick={() => setExportModalOpen(true)} class=\"bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center\"><i class=\"fas fa-file-excel mr-2\"></i> 匯出 Excel</button>\n" +
"                            {activeCategory && <button onClick={() => setActiveCategory(null)} class=\"text-sm bg-gray-200 px-3 py-2 rounded text-slate-600\"><i class=\"fas fa-arrow-left mr-1\"></i> 返回總覽</button>}\n" +
"                        </div>\n" +
"                    </div>\n" +
"\n" +
"                    {!activeCategory && <KeyCasesSection db={db} onSelectCase={onSelectCase} />}\n" +
"\n" +
"                    <h3 class=\"text-lg font-bold text-slate-700 mb-4 border-l-4 border-slate-500 pl-3\">{activeCategory ? activeCategory : \"資料庫統計總覽\"}</h3>\n" +
"\n" +
"                    {!activeCategory ? (\n" +
"                        <div class=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">\n" +
"                            {Object.entries(stats.overview?.categories || {}).map(([cat, count]) => (\n" +
"                                <div key={cat} onClick={() => setActiveCategory(cat)} class=\"bg-white rounded-xl p-6 shadow-sm border hover:shadow-md cursor-pointer group hover:border-blue-300 transition-all\">\n" +
"                                    <div class=\"text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 group-hover:text-blue-600 truncate\" title={cat}>{cat}</div>\n" +
"                                    <div class=\"text-3xl font-bold text-slate-800\">{count} <span class=\"text-xs font-normal text-gray-400\">件判決</span></div>\n" +
"                                    <div class=\"mt-4 h-1 w-full bg-gray-100 rounded overflow-hidden\"><div class=\"h-full bg-blue-500\" style={{width: '30%'}}></div></div>\n" +
"                                </div>\n" +
"                            ))}\n" +
"                        </div>\n" +
"                    ) : (\n" +
"                        <div class=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">\n" +
"                            {Object.entries(stats.details[activeCategory]).map(([court, data]) => (\n" +
"                                <div key={court} class=\"bg-white rounded-xl shadow-sm border overflow-hidden\">\n" +
"                                    <div class=\"bg-slate-50 px-5 py-3 border-b flex justify-between items-center\">\n" +
"                                        <h3 class=\"font-bold text-slate-800\">{court}</h3>\n" +
"                                        <span class=\"bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black\">{data.total} CASES</span>\n" +
"                                    </div>\n" +
"                                    <div class=\"p-5 space-y-8\">\n" +
"                                        <div>\n" +
"                                            <h4 class=\"text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b\">結果分佈</h4>\n" +
"                                            <SimpleBarChart data={Object.entries(data.decisions).map(([k,v]) => ({label: k, value: v})).sort((a,b) => b.value - a.value)} colorClass=\"bg-rose-500\" onBarClick={(label) => handleChartClick(court, 'decision', label)} />\n" +
"                                        </div>\n" +
"                                        <div>\n" +
"                                            <h4 class=\"text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b\">常見主文分析</h4>\n" +
"                                            <ul class=\"space-y-1\">\n" +
"                                                {Object.entries(data.mainTexts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([text, count], idx) => (\n" +
"                                                    <li key={idx} onClick={() => handleChartClick(court, 'mainText', text)} class=\"text-xs text-gray-600 flex justify-between items-center bg-slate-50 hover:bg-blue-50 p-2 rounded cursor-pointer transition-colors\">\n" +
"                                                        <span class=\"mr-2 flex-1 font-mono truncate\">{text}</span>\n" +
"                                                        <span class=\"font-bold text-gray-300\">{count}</span>\n" +
"                                                    </li>\n" +
"                                                ))}\n" +
"                                            </ul>\n" +
"                                        </div>\n" +
"                                    </div>\n" +
"                                </div>\n" +
"                            ))}\n" +
"                        </div>\n" +
"                    )}\n" +
"                </div>\n" +
"            );\n" +
"        };\n";

fs.writeFileSync(path, beforeDashboard + cleanDashboard + afterDashboard, 'utf-8');
console.log("Dashboard cleaned up successfully");
