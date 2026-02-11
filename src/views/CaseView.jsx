import React, { useState } from 'react';
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
      // Boundary case: '主文' section sometimes contains '事實' or '事實緣'
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

  if (!judgment) return <div className="flex flex-col items-center justify-center h-full text-slate-300"><i className="fas fa-balance-scale text-8xl mb-6 opacity-10"></i><p className="font-black uppercase tracking-widest text-sm">Select Document</p></div>;

  return (
    <div className="max-w-5xl mx-auto my-4 md:my-8 p-6 md:p-12 bg-white shadow-xl rounded-2xl min-h-[80vh]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 pb-8 border-b-2 border-slate-100">
        <div>
          <div className="flex space-x-2 mb-4">
            <button onClick={onBack} className="px-3 py-1 bg-gray-200 text-gray-600 text-[10px] font-black rounded hover:bg-gray-300 transition-colors"><i className="fas fa-arrow-left mr-1"></i> 返回</button>
            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded uppercase tracking-widest">{judgment.analysis_meta.court_normalized || judgment.meta.court}</span>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-widest border border-blue-100">{judgment.decision_result}</span>
            {judgment.ai_summary && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded uppercase tracking-widest border border-yellow-200"><i className="fas fa-star mr-1"></i>重點案例</span>}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">{judgment.meta.title}</h2>
        </div>
        <a href={judgment.meta.source_url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-600 mt-4 md:mt-0 transition-colors"><i className="fas fa-external-link-alt text-2xl"></i></a>
      </div>
      <div className="space-y-12">
        {processedSections.map(([t, c]) => (
          <div key={t}>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center">
              <span className="w-8 h-px bg-slate-200 mr-4"></span>{t}
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
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex justify-between items-center mb-4 cursor-pointer select-none group" onClick={() => setShowLaws(!showLaws)}>
            <h4 className="text-sm font-bold text-slate-700 flex items-center group-hover:text-blue-600 transition-colors">
              <i className={`fas ${showLaws ? 'fa-chevron-down' : 'fa-chevron-right'} mr-2 text-slate-400 w-4 text-center`}></i>
              引用法源標示
              <span className="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{judgment.extracted_laws.length}</span>
            </h4>
            {highlightTerm && (
              <button 
                onClick={(e) => { e.stopPropagation(); setHighlightTerm(null); }} 
                className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors"
              >
                <i className="fas fa-eraser mr-1"></i>清除高亮
              </button>
            )}
          </div>
          
          {showLaws && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <div className="flex flex-wrap gap-2">
                {judgment.extracted_laws.map(l => (
                  <button 
                    key={l} 
                    onClick={() => setHighlightTerm(l === highlightTerm ? null : l)} 
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${highlightTerm === l ? 'bg-yellow-300 text-slate-900 border-yellow-400 ring-2 ring-yellow-200 shadow-sm transform -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'}`}
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
  );
};

export default CaseView;
