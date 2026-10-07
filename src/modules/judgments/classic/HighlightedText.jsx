import { Fragment } from 'react';
import { splitByPattern } from '../components/lawMatch';

// 原版的高亮樣式；比對改用 lawPattern，原文寫成國字數字（第二條）也標得到
const HighlightedText = ({ text, pattern }) => {
  if (!text) return null;
  if (!pattern) return <>{text}</>;
  return (
    <>
      {splitByPattern(text, pattern).map((part, i) => typeof part === 'string'
        ? <Fragment key={i}>{part}</Fragment>
        : (
          <mark key={i} className="bg-accent-500/40 text-brand-950 font-bold px-0.5 rounded-sm box-decoration-clone transition-colors shadow-[0_0_10px_rgba(197,160,101,0.2)]">
            {part.mark}
          </mark>
        ))}
    </>
  );
};

export default HighlightedText;
