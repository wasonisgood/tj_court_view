import React from 'react';

const HighlightedText = ({ text, term }) => {
  if (!text) return null;
  if (!term) return <>{text}</>;

  try {
    const escapedTerm = term.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-accent-500/40 text-brand-950 font-bold px-0.5 rounded-sm box-decoration-clone transition-colors shadow-[0_0_10px_rgba(197,160,101,0.2)]">
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </>
    );
  } catch (e) {
    console.error("Highlight error", e);
    return <>{text}</>;
  }
};

export default HighlightedText;