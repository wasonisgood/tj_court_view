import React, { useState, useEffect } from 'react';

const GeminiSummary = ({ text, onClickRef, savedSummary, processedParagraphs }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(savedSummary || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (savedSummary) setSummary(savedSummary);
  }, [savedSummary]);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    
    // Use processedParagraphs if available
    const paras = processedParagraphs || text.split('\n').map((p, i) => ({ id: i, content: p }));
    const filteredParas = paras.filter(p => p.content.trim());
    const numberedText = filteredParas.map((p) => `[${p.id}] ${p.content}`).join('\n');

    const prompt = `你是一個專業的法律助理。請根據以下法院判決的「理由」部分，生成一份重點摘要。
請遵循以下規則：
1. 用列點方式說明判決的關鍵爭點、法院的判斷理由、以及最終結論。
2. 對於每一個摘要點，**必須**具體引用支持該論點的段落編號，格式為 [ref:段落編號]。編號應使用我提供的 [編號] 標記。
3. 回傳格式必須為單純的 JSON 陣列，不要有 markdown 標記。格式範例：
[
    { "point": "原告主張...", "refs": [0, 2] },
    { "point": "法院認為...", "refs": [5] }
]

判決文本如下：
${numberedText}`;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      let rawText = data.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(rawText);
      setSummary(parsed);
    } catch (err) {
      console.error(err);
      setError("摘要生成失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const displaySummary = summary ? summary.filter(item => {
    if (!item.point || !item.point.trim()) return false;
    return true;
  }) : null;

  if (!summary && !loading) {
    return (
      <div className="mb-8 pl-4 md:pl-0">
        <button onClick={handleSummarize} className="group relative overflow-hidden bg-brand-900 text-white px-8 py-4 rounded font-serif font-bold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
          <span className="relative z-10 flex items-center">
            <i className="fas fa-magic mr-3 text-accent-400 group-hover:text-accent-300 transition-colors"></i> 
            生成 AI 判決摘要
          </span>
          <div className="absolute inset-0 bg-accent-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out"></div>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 bg-paper-100 rounded-lg p-6 md:p-8 border border-accent-200 relative overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-accent-500"></div>
      
      <div className="flex justify-between items-center mb-6 border-b border-accent-200/50 pb-4">
        <h3 className="font-serif font-bold text-brand-900 text-lg flex items-center">
          <i className="fas fa-robot mr-3 text-accent-600"></i>
          Gemini 智慧摘要
        </h3>
        <div className="flex items-center space-x-3">
            {loading && <span className="text-accent-600 text-sm animate-pulse font-mono"><i className="fas fa-circle-notch fa-spin mr-2"></i>ANALYZING...</span>}
            {savedSummary && <span className="text-[10px] bg-brand-900 text-white px-2 py-1 rounded uppercase tracking-widest font-sans">Cached</span>}
        </div>
      </div>
      
      {error && <div className="text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded border border-rose-200 mb-4">{error}</div>}
      
      {displaySummary && (
        <ul className="space-y-6">
          {displaySummary.map((item, idx) => (
            <li key={idx} className="flex items-start group">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-900 text-accent-500 text-xs font-bold mr-4 shrink-0 mt-0.5 font-mono border border-brand-700 shadow-sm">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-brand-900 text-lg leading-relaxed font-serif">
                  {item.point}
                </p>
                
                {item.refs && item.refs.length > 0 && (
                   <div className="mt-2 flex flex-wrap gap-2">
                    {item.refs
                        .filter(refId => {
                            if (!processedParagraphs) return true;
                            const para = processedParagraphs.find(p => p.id === refId || (p.allIds && p.allIds.includes(refId)));
                            return para && para.content.trim();
                        })
                        .map(ref => (
                        <button 
                          key={ref}
                          onClick={() => onClickRef && onClickRef(ref)}
                          className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold text-brand-400 hover:text-accent-600 transition-colors group/btn"
                        >
                          <i className="fas fa-paragraph mr-1 text-accent-400 group-hover/btn:text-accent-600"></i>
                          <span className="border-b border-dotted border-brand-300 group-hover/btn:border-accent-500">Ref {ref + 1}</span>
                        </button>
                      ))}
                   </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GeminiSummary;