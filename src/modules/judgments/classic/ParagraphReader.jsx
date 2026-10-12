import { useMemo } from 'react';
import HighlightedText from './HighlightedText';
import GeminiSummary from './GeminiSummary';
import LegalFooter from './LegalFooter';

const ParagraphReader = ({ text, pattern, sectionTitle, savedSummary, onSaveSummary, canEdit }) => {
  const paragraphs = useMemo(() => {
    const rawLines = text.split('\n');
    const result = [];
    const punctuation = /[。！？」』)）]$/;
    for (let i = 0; i < rawLines.length; i++) {
      let content = rawLines[i];
      const originalIds = [i];
      while (content && !punctuation.test(content.trim()) && i + 1 < rawLines.length) {
        i++;
        content += rawLines[i];
        originalIds.push(i);
      }
      result.push({ id: originalIds[0], content, allIds: originalIds });
    }
    return result;
  }, [text]);

  const enableAI = sectionTitle.includes('理由');

  const isLegalFooter = (content) => {
    if (!content) return false;
    const datePattern = /中\s*華\s*民\s*國\s*[0-9０-９〇零一二三四五六七八九十百\s]+年/;
    const rolePattern = /(審判長|法官|評事|委員|主席|書記官)/;
    const proofPattern = /正本證明與原本無異/;
    return datePattern.test(content) && (rolePattern.test(content) || proofPattern.test(content));
  };

  return (
    <div className="relative">
      {enableAI && (
        <GeminiSummary
          processedParagraphs={paragraphs}
          savedSummary={savedSummary}
          onSave={onSaveSummary}
          canEdit={canEdit}
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

      <div className="space-y-6">
        {paragraphs.map(p => (
          <div
            id={`p-${sectionTitle}-${p.id}`}
            key={p.id}
            className={`transition-colors duration-700 ${!p.content.trim() ? 'h-2' : ''}`}
          >
            {isLegalFooter(p.content) ? (
              <LegalFooter text={p.content} />
            ) : (
              <div className="text-brand-900 whitespace-pre-wrap leading-[2.1] text-justify text-[17px] font-classic relative">
                {enableAI && p.content.trim() && (
                  <span className="hidden md:block absolute -left-10 top-1 w-7 text-right text-xs text-brand-300 select-none tabular-nums font-sans">
                    {p.id + 1}
                  </span>
                )}
                <HighlightedText text={p.content} pattern={pattern} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParagraphReader;
