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
          <mark key={i} className="bg-accent-200 text-brand-950 px-0.5 box-decoration-clone">
            {part.mark}
          </mark>
        ))}
    </>
  );
};

export default HighlightedText;
