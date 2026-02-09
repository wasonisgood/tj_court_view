import React, { useMemo } from 'react';
import HighlightedText from './HighlightedText';
import GeminiSummary from './GeminiSummary';

const ParagraphReader = ({ text, highlightTerm, sectionTitle, savedSummary }) => {
  const paragraphs = useMemo(() => {
    return text.split('\n').map((p, i) => ({ id: i, content: p }));
  }, [text]);

  const enableAI = sectionTitle.includes('理由');

  return (
    <div className="relative">
      {enableAI && (
        <GeminiSummary 
          text={text} 
          savedSummary={savedSummary}
          onClickRef={(id) => {
            const el = document.getElementById(`p-${sectionTitle}-${id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('bg-yellow-100');
              setTimeout(() => el.classList.remove('bg-yellow-100'), 2000);
            }
          }} 
        />
      )}
      
      <div className="space-y-4">
        {paragraphs.map((p) => (
          <div 
            id={`p-${sectionTitle}-${p.id}`}
            key={p.id} 
            className={`transition-colors duration-1000 p-1 rounded ${!p.content.trim() ? 'h-4' : ''}`}
          >
            <div className="text-slate-700 whitespace-pre-wrap leading-[2] text-justify text-base md:text-lg tracking-wide font-medium relative group">
              {enableAI && p.content.trim() && (
                <span className="absolute -left-8 top-1 text-xs text-gray-300 select-none group-hover:text-blue-400 font-mono">
                  {p.id + 1}
                </span>
              )}
              <HighlightedText text={p.content} term={highlightTerm} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParagraphReader;
