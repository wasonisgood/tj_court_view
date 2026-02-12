import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import HighlightedText from './HighlightedText';
import GeminiSummary from './GeminiSummary';
import LegalFooter from './LegalFooter';

const ParagraphReader = ({ text, highlightTerm, sectionTitle, savedSummary }) => {
  const paragraphs = useMemo(() => {
    const rawLines = text.split('\n');
    const result = [];
    const punctuation = /[。！？」』\)\uff09]$/; 

    for (let i = 0; i < rawLines.length; i++) {
      let content = rawLines[i];
      let originalIds = [i];
      
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

  const isLegalFooter = (content) => {
    if (!content) return false;
    const datePattern = /中華民國\s*[0-9\uff10-\uff19〇零一二三四五六七八九十百\s]+年/;
    const rolePattern = /(審判長|法官|評事|委員|主席|書記官)/;
    const proofPattern = /正本證明與原本無異/;
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
            const targetPara = paragraphs.find(p => p.allIds.includes(id));
            const finalId = targetPara ? targetPara.id : id;
            const el = document.getElementById(`p-${sectionTitle}-${finalId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('bg-accent-100');
              setTimeout(() => el.classList.remove('bg-accent-100'), 2000);
            }
          }} 
        />
      )}
      
      <div className="space-y-10">
        {paragraphs.map((p, idx) => (
          <motion.div 
            id={`p-${sectionTitle}-${p.id}`}
            key={p.id} 
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.3) }}
            className={`transition-colors duration-1000 rounded ${!p.content.trim() ? 'h-4' : ''}`}
          >
            {isLegalFooter(p.content) ? (
              <LegalFooter text={p.content} />
            ) : (
              <div className="text-brand-900 whitespace-pre-wrap leading-[2.2] text-justify text-lg font-serif relative group pl-4 md:pl-0">
                {enableAI && p.content.trim() && (
                  <span className="absolute -left-6 md:-left-12 top-2 text-[10px] text-brand-200 select-none group-hover:text-accent-500 font-sans font-bold transition-colors w-8 text-right opacity-0 md:opacity-100">
                    {p.id + 1}
                  </span>
                )}
                <HighlightedText text={p.content} term={highlightTerm} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ParagraphReader;
