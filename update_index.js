const fs = require('fs');

const INDEX_FILE = './index.html';
let content = fs.readFileSync(INDEX_FILE, 'utf-8');

// 1. Insert KeyCasesSection definition before Dashboard
const keyCasesDef = `
        // --- Key Cases Component ---
        const KeyCasesSection = ({ db, onSelectId }) => {
            const keyCases = useMemo(() => db.filter(item => item.ai_summary).slice(0, 6), [db]);
            if (keyCases.length === 0) return null;

            return (
                <div class="mb-12">
                    <h3 class="text-xl font-bold text-slate-800 mb-4 flex items-center">
                        <i class="fas fa-star text-yellow-500 mr-2"></i>
                        重點案例 (AI 智慧摘要)
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {keyCases.map((item, idx) => (
                            <div key={idx} onClick={() => onSelectId(item.meta.id)} class="bg-white rounded-xl shadow-md border-l-4 border-yellow-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full overflow-hidden relative">
                                <div class="absolute top-2 right-2 text-yellow-400 opacity-20 group-hover:opacity-100 transition-opacity"><i class="fas fa-robot text-3xl"></i></div>
                                <div class="p-5 flex-1">
                                    <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.meta.court}</div>
                                    <h4 class="font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{item.meta.title}</h4>
                                    <div class="bg-yellow-50 rounded p-3 mb-3 border border-yellow-100">
                                        <p class="text-xs text-slate-700 line-clamp-3 leading-relaxed"><i class="fas fa-quote-left text-yellow-300 mr-1"></i>{item.ai_summary[0]?.point || "點擊查看摘要詳情..."}</p>
                                    </div>
                                    <div class="text-xs text-gray-500 flex justify-between items-center mt-auto">
                                        <span>{item.meta.date_minguo}</span>
                                        <span class="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">閱讀詳情 <i class="fas fa-arrow-right ml-1"></i></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        const Dashboard = ({ db, onSelectCase }) => {
`;

// Replace definition
content = content.replace(
    /const Dashboard = \({ db, onSelectId }\) => {/g,
    keyCasesDef.trim()
);

// 2. Insert KeyCasesSection render inside Dashboard
const insertPoint = `{!activeCategory ? (`;
const insertion = `{!activeCategory && <KeyCasesSection db={db} onSelectId={onSelectCase} />}
                    
                    <h3 class="text-lg font-bold text-slate-700 mb-4 border-l-4 border-slate-500 pl-3">{activeCategory ? activeCategory : "資料庫統計總覽"}</h3>

                    ${insertPoint}`;

content = content.replace(insertPoint, insertion);


// 3. Replace App component with Hash Router logic
// Note: We use double backslashes before backticks to escape them in the output string
const newAppCode = `
        const App = () => {
            const db = window.JUDGMENT_DB || [];
            // Routing State
            const getHashPath = () => window.location.hash.slice(1);
            const [currentHash, setCurrentHash] = useState(getHashPath());

            useEffect(() => {
                const onHashChange = () => setCurrentHash(getHashPath());
                window.addEventListener('hashchange', onHashChange);
                return () => window.removeEventListener('hashchange', onHashChange);
            }, []);

            // Derived State
            const view = currentHash.startsWith('case/') ? 'reader' : 'dashboard';
            const selectedId = view === 'reader' ? decodeURIComponent(currentHash.replace('case/', '')) : null;

            const judgment = useMemo(() => {
                if (!selectedId) return null;
                // Find by ID first, fallback to path for backward compatibility if needed
                return db.find(x => x.meta.id === selectedId || x.analysis_meta.path === selectedId);
            }, [db, selectedId]);

            // Handlers
            const navigateToCase = (id) => {
                // Use ID for clean URL
                window.location.hash = \`case/\${encodeURIComponent(id)}\`;
            };
            const navigateHome = () => {
                window.location.hash = '';
            };

            const [searchTerm, setSearchTerm] = useState("");
            const [highlightTerm, setHighlightTerm] = useState(null);
            const [isSidebarOpen, setSidebarOpen] = useState(false);
            const [showHelp, setShowHelp] = useState(false);
            const [showLaws, setShowLaws] = useState(true);

            // Effect to reset sidebar on route change
            useEffect(() => {
                setSidebarOpen(false);
                if (view === 'reader') setHighlightTerm(null);
            }, [currentHash, view]);

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

            if (db.length === 0) return <div class="flex items-center justify-center h-screen">載入中...</div>;

            return (
                <div class="flex h-screen overflow-hidden flex-col md:flex-row">
                    <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
                    <div class="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-md">
                        <div class="font-bold truncate"><i class="fas fa-scale-balanced text-yellow-500 mr-2"></i>轉型正義系統</div>
                        <div class="flex items-center space-x-3">
                            <button onClick={() => setShowHelp(true)}><i class="fas fa-question-circle"></i></button>
                            <button onClick={() => setSidebarOpen(!isSidebarOpen)}><i class={\`fas \${isSidebarOpen ? 'fa-times' : 'fa-bars'}\`}></i></button>
                        </div>
                    </div>
                    <div class={\`fixed inset-0 z-40 bg-slate-900 text-gray-300 flex flex-col transition-transform md:translate-x-0 md:relative md:w-80 md:flex \${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}\`}>
                        <div class="p-4 bg-slate-800 shadow z-10 hidden md:block">
                            <h1 class="font-bold text-white mb-4 flex justify-between">
                                <span onClick={navigateHome} class="cursor-pointer">轉型正義決定系統</span>
                                <button onClick={() => setShowHelp(true)} class="text-gray-500"><i class="fas fa-question-circle"></i></button>
                            </h1>
                            <div class="flex bg-slate-700 rounded p-1 mb-4">
                                <button onClick={navigateHome} class={\`flex-1 py-1 text-xs font-bold rounded \${view==='dashboard'?'bg-blue-600 text-white':'hover:text-white'}\`}>統計</button>
                                <button class={\`flex-1 py-1 text-xs font-bold rounded opacity-50 cursor-not-allowed\`}>閱讀</button>
                            </div>
                            <input type="text" placeholder="快速檢索..." class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                        </div>
                        <div class="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-1">
                            {Object.entries(sidebarData).map(([cat, jTypes]) => (
                                <details key={cat} class="group">
                                    <summary class="flex items-center p-2 rounded hover:bg-slate-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        <i class="fas fa-chevron-right arrow mr-2 opacity-50"></i>{cat}
                                    </summary>
                                    <div class="pl-4 mt-1 space-y-1">
                                        {Object.entries(jTypes).map(([jType, dResults]) => (
                                            <details key={jType} class="group">
                                                <summary class="flex items-center p-2 rounded hover:bg-slate-800 text-[10px] font-bold text-blue-400">
                                                    <i class="fas fa-chevron-right arrow mr-2"></i>{jType}
                                                </summary>
                                                <div class="pl-4 mt-1 space-y-1">
                                                    {Object.entries(dResults).map(([dResult, items]) => (
                                                        <details key={dResult} class="group">
                                                            <summary class="flex items-center p-2 rounded hover:bg-slate-800 text-[10px] text-gray-400">
                                                                <i class="fas fa-chevron-right arrow mr-2"></i>{dResult} ({items.length})
                                                            </summary>
                                                            <div class="pl-4 mt-1 space-y-0.5 border-l border-slate-700 ml-2">
                                                                {items.map(item => (
                                                                    <button key={item.meta.id} onClick={()=>navigateToCase(item.meta.id)} class={\`w-full text-left text-[10px] px-3 py-1.5 rounded truncate transition-colors flex items-center \${selectedId === item.meta.id ? 'bg-blue-900 text-blue-200' : 'text-gray-500 hover:text-gray-300'}\`}>
                                                                        {item.ai_summary && <i class="fas fa-star text-yellow-500 mr-2 text-[8px]" title="AI 重點案例"></i>}
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
                    <div class="flex-1 overflow-y-auto bg-gray-100 w-full relative">
                        {view === 'dashboard' ? <Dashboard db={db} onSelectCase={navigateToCase} /> : (
                            judgment ? (
                                <div class="max-w-5xl mx-auto my-4 md:my-8 p-6 md:p-12 bg-white shadow-xl rounded-2xl min-h-[80vh]">
                                    <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-10 pb-8 border-b-2 border-slate-100">
                                        <div>
                                            <div class="flex space-x-2 mb-4">
                                                <button onClick={navigateHome} class="px-3 py-1 bg-gray-200 text-gray-600 text-[10px] font-black rounded hover:bg-gray-300 transition-colors"><i class="fas fa-arrow-left mr-1"></i> 返回</button>
                                                <span class="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded uppercase tracking-widest">{judgment.meta.court}</span>
                                                <span class="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-widest border border-blue-100">{judgment.decision_result}</span>
                                                {judgment.ai_summary && <span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded uppercase tracking-widest border border-yellow-200"><i class="fas fa-star mr-1"></i>重點案例</span>}
                                            </div>
                                            <h2 class="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">{judgment.meta.title}</h2>
                                        </div>
                                        <a href={judgment.meta.source_url} target="_blank" class="text-slate-300 hover:text-blue-600 mt-4 md:mt-0 transition-colors"><i class="fas fa-external-link-alt text-2xl"></i></a>
                                    </div>
                                    <div class="space-y-12">
                                        {judgment.sections && Object.entries(judgment.sections).map(([t, c]) => (
                                            <div key={t}>
                                                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center">
                                                    <span class="w-8 h-px bg-slate-200 mr-4"></span>{t}
                                                </h3>
                                                {t === '前置' ? <PrefaceCard text={c} /> : (
                                                    <ParagraphReader 
                                                        text={c} 
                                                        highlightTerm={highlightTerm} 
                                                        sectionTitle={t} 
                                                        savedSummary={t.includes('理由') ? judgment.ai_summary : null}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {judgment.extracted_laws && judgment.extracted_laws.length > 0 && (
                                        <div class="mt-16 pt-8 border-t border-slate-200">
                                            <div class="flex justify-between items-center mb-4 cursor-pointer select-none group" onClick={() => setShowLaws(!showLaws)}>
                                                <h4 class="text-sm font-bold text-slate-700 flex items-center group-hover:text-blue-600 transition-colors">
                                                    <i class={\`fas \${showLaws ? 'fa-chevron-down' : 'fa-chevron-right'} mr-2 text-slate-400 w-4 text-center\`}></i>
                                                    引用法源標示
                                                    <span class="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{judgment.extracted_laws.length}</span>
                                                </h4>
                                                {highlightTerm && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setHighlightTerm(null); }} 
                                                        class="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors"
                                                    >
                                                        <i class="fas fa-eraser mr-1"></i>清除高亮
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {showLaws && (
                                                <div class="bg-slate-50 rounded-xl p-6 border border-slate-100">
                                                    <div class="flex flex-wrap gap-2">
                                                        {judgment.extracted_laws.map(l => (
                                                            <button 
                                                                key={l} 
                                                                onClick={() => setHighlightTerm(l === highlightTerm ? null : l)} 
                                                                class={\`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 \${highlightTerm === l ? 'bg-yellow-300 text-slate-900 border-yellow-400 ring-2 ring-yellow-200 shadow-sm transform -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'}\`}
                                                            >
                                                                {l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : <div class="flex flex-col items-center justify-center h-full text-slate-300"><i class="fas fa-balance-scale text-8xl mb-6 opacity-10"></i><p class="font-black uppercase tracking-widest text-sm">Select Document</p></div>
                        )}
                    </div>
                </div>
            );
        };
`;

// Replace App
const appStartIdx = content.indexOf('const App = () => {');
const rootStartIdx = content.indexOf('const root = ReactDOM.createRoot');

if (appStartIdx !== -1 && rootStartIdx !== -1) {
    const beforeApp = content.substring(0, appStartIdx);
    const afterApp = content.substring(rootStartIdx);
    content = beforeApp + newAppCode.trim() + '\n        ' + afterApp;
} else {
    console.error("Could not find App component block");
    process.exit(1);
}

fs.writeFileSync(INDEX_FILE, content, 'utf-8');
console.log("Successfully updated index.html");