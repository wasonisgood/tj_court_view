import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PrefaceCard from '../components/PrefaceCard';
import ParagraphReader from '../components/ParagraphReader';

const CaseView = ({ judgment, onBack }) => {
  const [highlightTerm, setHighlightTerm] = useState(null);
  const [showLaws, setShowLaws] = useState(true);

  const processedSections = React.useMemo(() => {
    if (!judgment || !judgment.sections) return [];
    const sections = Object.entries(judgment.sections);
    const result = [];
    
    for (const [title, content] of sections) {
      if (title === '主文' && (content.includes('事實緣') || content.includes('\n事實'))) {
        const factsPattern = /\n?\s*(事實(?:緣)?.*)/s;
        const match = content.match(factsPattern);
        if (match) {
          const factsText = match[1].trim();
          const mainText = content.replace(match[0], '').trim();
          if (mainText) result.push(['主文', mainText]);
          result.push(['事實', factsText]);
          continue;
        }
      }
      result.push([title, content]);
    }
    return result;
  }, [judgment]);

  if (!judgment) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <i className="fas fa-balance-scale text-8xl mb-6 opacity-10"></i>
        <p className="font-serif font-bold text-lg italic uppercase tracking-widest">Select a Document to Open</p>
      </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto my-6 md:my-12 px-4 md:px-6"
    >
      {/* Back Button and Floating Actions */}
      <div className="mb-6 flex justify-between items-center px-4 md:px-0">
        <button 
          onClick={onBack} 
          className="group flex items-center text-xs font-bold text-brand-700 hover:text-accent-600 transition-colors uppercase tracking-[0.2em]"
        >
          <i className="fas fa-chevron-left mr-2 transform group-hover:-translate-x-1 transition-transform"></i> 
          返回卷宗列表
        </button>
        <div className="flex space-x-4">
           <a href={judgment.meta.source_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-900 transition-colors text-sm" title="原始法學檢索連結">
             <i className="fas fa-link mr-1"></i> 原始卷宗
           </a>
        </div>
      </div>
      
      {/* The "Book" Container */}
      <motion.div 
        initial={{ scaleX: 0.95, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scaleX: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm min-h-[85vh] relative flex flex-col md:flex-row border-x border-gray-100"
      >
        {/* Book Spine (Left decorative edge) */}
        <div className="hidden md:block w-1.5 bg-gradient-to-r from-gray-200 to-white absolute left-0 top-0 bottom-0 z-20"></div>
        <div className="hidden md:block w-8 bg-paper-50 absolute left-0 top-0 bottom-0 border-r border-gray-100 z-10 shadow-inner"></div>

        <div className="flex-1 p-8 md:p-16 md:pl-24 space-y-12 relative">
          
          {/* Document Header */}
          <header className="border-b-4 border-brand-900 pb-10 relative">
             <div className="flex flex-col space-y-6">
               <div className="flex flex-wrap gap-2">
                 <span className="px-2 py-1 bg-brand-900 text-white text-[10px] font-black uppercase tracking-widest">{judgment.analysis_meta.court_normalized || judgment.meta.court}</span>
                 <span className="px-2 py-1 bg-accent-100 text-accent-800 text-[10px] font-black uppercase tracking-widest border border-accent-200">{judgment.decision_result}</span>
                 {judgment.ai_summary && <span className="px-2 py-1 bg-accent-500 text-brand-950 text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-star mr-1"></i> AI 標註重點</span>}
               </div>
               
               <motion.h1 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.3, duration: 0.6 }}
                 className="text-4xl md:text-5xl font-serif font-bold text-brand-900 leading-[1.15] tracking-tight"
               >
                 {judgment.meta.title}
               </motion.h1>
               
               <div className="flex items-center text-[11px] text-brand-400 font-sans font-bold uppercase tracking-[0.2em] space-x-6">
                 <span className="flex items-center"><i className="far fa-calendar-alt mr-2 text-accent-500"></i>{judgment.meta.date_minguo}</span>
                 <span className="flex items-center"><i className="fas fa-barcode mr-2 text-accent-500"></i>{judgment.meta.id}</span>
               </div>
             </div>
          </header>

          {/* Document Content - Sections */}
          <main className="space-y-20">
            {processedSections.map(([t, c], index) => (
              <motion.section 
                key={t}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-center mb-10">
                  <span className="text-xs font-black text-accent-600 uppercase tracking-[0.4em] whitespace-nowrap">{t}</span>
                  <div className="ml-6 h-px bg-gradient-to-r from-gray-200 to-transparent flex-1"></div>
                </div>
                
                <div className="md:pl-4">
                  {t === '前置' ? <PrefaceCard text={c} /> : (
                    <ParagraphReader 
                      text={c} 
                      highlightTerm={highlightTerm} 
                      sectionTitle={t} 
                      savedSummary={t.includes('理由') ? judgment.ai_summary : null}
                    />
                  )}
                </div>
              </motion.section>
            ))}
          </main>

          {/* Laws Section */}
          <AnimatePresence>
            {judgment.extracted_laws && judgment.extracted_laws.length > 0 && (
              <motion.footer 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-20 pt-12 border-t border-dashed border-gray-200"
              >
                <div 
                  className="flex justify-between items-center mb-8 cursor-pointer group" 
                  onClick={() => setShowLaws(!showLaws)}
                >
                  <h4 className="text-xs font-black text-brand-400 uppercase tracking-widest flex items-center transition-colors group-hover:text-brand-900">
                    <i className={`fas ${showLaws ? 'fa-minus' : 'fa-plus'} mr-3 text-accent-500`}></i>
                    引用法條標註 ({judgment.extracted_laws.length})
                  </h4>
                  {highlightTerm && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setHighlightTerm(null); }} 
                      className="text-[10px] font-black text-rose-500 border border-rose-100 px-2 py-1 rounded hover:bg-rose-50 transition-colors uppercase tracking-widest"
                    >
                      <i className="fas fa-eraser mr-1"></i> 清除高亮
                    </button>
                  )}
                </div>
                
                {showLaws && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 pb-8">
                      {judgment.extracted_laws.map(l => (
                        <button 
                          key={l} 
                          onClick={() => setHighlightTerm(l === highlightTerm ? null : l)} 
                          className={`
                            px-3 py-2 text-[11px] font-bold rounded border transition-all duration-300
                            ${highlightTerm === l 
                              ? 'bg-accent-500 text-brand-950 border-accent-600 shadow-md transform -translate-y-1' 
                              : 'bg-paper-50 text-brand-600 border-gray-100 hover:border-accent-400 hover:text-accent-600'}
                          `}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.footer>
            )}
          </AnimatePresence>
        </div>
        
        {/* Right Page Edge Shadow */}
        <div className="hidden md:block w-4 bg-gradient-to-l from-black/5 to-transparent absolute right-0 top-0 bottom-0 pointer-events-none"></div>
      </motion.div>
      
      {/* Decorative Page Numbers or Footer */}
      <div className="mt-8 text-center text-[10px] font-black text-brand-200 uppercase tracking-[1em]">
        TJ COURT VIEW ARCHIVE
      </div>
    </motion.div>
  );
};

const CaseWrapper = ({ db }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const judgment = React.useMemo(() => {
    if (!id) return null;
    const decodedId = decodeURIComponent(id);
    return db.find(x => x.meta.id === decodedId || x.analysis_meta.path === decodedId);
  }, [db, id]);

  return <CaseView judgment={judgment} onBack={() => navigate(-1)} />;
};

export default CaseView;
