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
            <span key={i} className="bg-yellow-300 text-slate-900 font-bold px-0.5 rounded box-decoration-clone">
              {part}
            </span>
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
