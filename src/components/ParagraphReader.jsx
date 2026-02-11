import React, { useMemo } from 'react';
import HighlightedText from './HighlightedText';
import GeminiSummary from './GeminiSummary';
import LegalFooter from './LegalFooter';

const ParagraphReader = ({ text, highlightTerm, sectionTitle, savedSummary }) => {
  const paragraphs = useMemo(() => {
    const rawLines = text.split('\n');
    const result = [];
    const punctuation = /[。！？」』\)\uff09]$/; // Common sentence endings in legal text

    for (let i = 0; i < rawLines.length; i++) {
      let content = rawLines[i];
      let originalIds = [i];
      
      // If line doesn't end with punctuation and there is a next line, merge it
      while (content && !punctuation.test(content.trim()) && i + 1 < rawLines.length) {
        i++;
        content += rawLines[i];
        originalIds.push(i);
      }
      
      result.push({ 
        id: originalIds[0], 
        content,
        allIds: originalIds 
      });
    }
    return result;
  }, [text]);

  const enableAI = sectionTitle.includes('理由');

  // Helper to detect if a paragraph is actually a legal footer (judges, dates, clerk)
  const isLegalFooter = (content) => {
    if (!content) return false;
    const datePattern = /中華民國\s*[0-9\uff10-\uff19〇零一二三四五六七八九十百\s]+年/;
    const rolePattern = /(審判長|法官|評事|委員|主席|書記官)/;
    const proofPattern = /正本證明與原本無異/;
    
    // Must contain a date and either roles or the proof statement
    return datePattern.test(content) && (rolePattern.test(content) || proofPattern.test(content));
  };

  return (
    <div className="relative">
      {enableAI && (
        <GeminiSummary 
          text={text} 
          processedParagraphs={paragraphs}
          savedSummary={savedSummary}
          onClickRef={(id) => {
            // Find which merged paragraph contains this original ID
            const targetPara = paragraphs.find(p => p.allIds.includes(id));
            const finalId = targetPara ? targetPara.id : id;
            const el = document.getElementById(`p-${sectionTitle}-${finalId}`);
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
            {isLegalFooter(p.content) ? (
              <LegalFooter text={p.content} />
            ) : (
              <div className="text-slate-700 whitespace-pre-wrap leading-[2] text-justify text-base md:text-lg tracking-wide font-medium relative group">
                {enableAI && p.content.trim() && (
                  <span className="absolute -left-8 top-1 text-xs text-gray-300 select-none group-hover:text-blue-400 font-mono">
                    {p.id + 1}
                  </span>
                )}
                <HighlightedText text={p.content} term={highlightTerm} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParagraphReader;
