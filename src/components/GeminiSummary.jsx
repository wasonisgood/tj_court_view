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
    
    // Use processedParagraphs if available, fallback to basic splitting
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

  // Filter out empty items or items referencing only empty paragraphs
  const displaySummary = summary ? summary.filter(item => {
    if (!item.point || !item.point.trim()) return false;
    
    // If it has refs, check if at least one referenced paragraph has content
    if (item.refs && item.refs.length > 0 && processedParagraphs) {
        const hasValidRef = item.refs.some(refId => {
            const para = processedParagraphs.find(p => p.id === refId || (p.allIds && p.allIds.includes(refId)));
            return para && para.content.trim();
        });
        // If all references point to empty paragraphs, we might still want to show the point
        // but for now let's be strict as per user request if that's what they meant.
        // Actually user said: "如果還是空白的那個段落那他應該不要在AI嘉藥的時候把那個段落顯示出來"
        // This likely means if a paragraph is empty, don't show it as a ref button.
    }
    return true;
  }) : null;

  if (!summary && !loading) {
    return (
      <div className="mb-8">
        <button onClick={handleSummarize} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center">
          <i className="fas fa-magic mr-2"></i> AI 判決摘要
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-indigo-50 rounded-xl p-6 border border-indigo-100 shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-indigo-900 flex items-center">
          <i className="fas fa-robot mr-2 text-indigo-600"></i>
          Gemini 智慧摘要
        </h3>
        {loading && <span className="text-indigo-500 text-sm animate-pulse"><i className="fas fa-spinner fa-spin mr-2"></i>分析中...</span>}
        {savedSummary && <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded">已存檔</span>}
      </div>
      
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      {displaySummary && (
        <ul className="space-y-4">
          {displaySummary.map((item, idx) => (
            <li key={idx} className="flex items-start">
              <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full mr-3 mt-1 shrink-0">{idx + 1}</span>
              <div>
                <p className="text-slate-800 text-sm leading-relaxed font-medium">
                  {item.point}
                  {item.refs && item.refs
                    .filter(refId => {
                        // Only show ref button if the referenced paragraph has content
                        if (!processedParagraphs) return true;
                        const para = processedParagraphs.find(p => p.id === refId || (p.allIds && p.allIds.includes(refId)));
                        return para && para.content.trim();
                    })
                    .map(ref => (
                    <button 
                      key={ref}
                      onClick={() => onClickRef && onClickRef(ref)}
                      className="ml-2 inline-flex items-center text-[10px] bg-white border border-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      <i className="fas fa-quote-right mr-1"></i>段落 {ref + 1}
                    </button>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GeminiSummary;
