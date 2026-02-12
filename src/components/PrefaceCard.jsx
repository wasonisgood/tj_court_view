import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const PrefaceCard = ({ text }) => {
  const metadata = useMemo(() => {
    const lines = text.split('\n');
    const data = {};
    const otherLines = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith('【裁判字號】')) data.id = trimmed.replace('【裁判字號】', '');
      else if (trimmed.startsWith('【裁判日期】')) data.date = trimmed.replace('【裁判日期】', '');
      else if (trimmed.startsWith('【裁判案由】')) data.cause = trimmed.replace('【裁判案由】', '');
      else otherLines.push(trimmed);
    });
    
    return { data, otherLines };
  }, [text]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="bg-paper-100/50 rounded-sm p-8 md:p-10 border border-brand-100 shadow-inner relative overflow-hidden mb-12"
    >
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none select-none">
        <i className="fas fa-file-signature text-[120px] text-brand-900 -rotate-12"></i>
      </div>
      
      {/* Meta Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 border-b border-brand-200 pb-8 relative z-10">
        {metadata.data.id && (
          <motion.div variants={item} className="flex flex-col">
            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2 font-sans">Index Number / 裁判字號</span>
            <span className="font-mono font-bold text-brand-900 text-lg leading-tight">{metadata.data.id}</span>
          </motion.div>
        )}
        {metadata.data.date && (
          <motion.div variants={item} className="flex flex-col">
            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2 font-sans">Judgment Date / 裁判日期</span>
            <span className="font-mono font-bold text-brand-900 text-lg leading-tight">{metadata.data.date}</span>
          </motion.div>
        )}
        {metadata.data.cause && (
          <motion.div variants={item} className="flex flex-col">
            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-2 font-sans">Cause of Action / 案由</span>
            <span className="font-serif font-bold text-accent-700 text-lg leading-tight">{metadata.data.cause}</span>
          </motion.div>
        )}
      </div>
      
      {/* Parties involved */}
      <motion.div variants={item} className="space-y-4 font-serif leading-relaxed text-brand-900 relative z-10">
        {metadata.otherLines.map((line, idx) => {
          const roleMatch = line.match(/^(原\s*告|被\s*告|上\s*訴\s*人|被\s*上\s*訴\s*人|聲\s*請\s*人|相對人)/);
          if (roleMatch) {
            const role = roleMatch[0].replace(/\s+/g, '');
            const isPlaintiff = ['原告', '上訴人', '聲請人'].includes(role);
            const isDefendant = ['被告', '被上訴人', '相對人'].includes(role);
            
            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline group">
                <span className={`
                  font-bold min-w-[6em] mb-1 sm:mb-0 transition-colors
                  ${isPlaintiff ? 'text-brand-900' : isDefendant ? 'text-rose-800' : 'text-brand-500'}
                `}>
                  {roleMatch[0]}
                </span>
                <span className="flex-1 text-brand-800 group-hover:text-brand-950 transition-colors">{line.substring(roleMatch[0].length)}</span>
              </div>
            );
          }
          return <div key={idx} className="text-brand-500/80 italic text-sm border-l-2 border-brand-100 pl-4 py-1">{line}</div>;
        })}
      </motion.div>
    </motion.div>
  );
};

export default PrefaceCard;
