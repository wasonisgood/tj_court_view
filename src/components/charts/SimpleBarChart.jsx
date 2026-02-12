import React from 'react';

const SimpleBarChart = ({ data, colorClass = "bg-brand-500", onBarClick }) => {
  if (!data || data.length === 0) return <div className="text-xs text-gray-400 italic">無數據</div>;
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center group cursor-pointer" onClick={() => onBarClick && onBarClick(item.label)}>
          <div className="w-[120px] text-[11px] font-medium text-gray-500 mr-3 text-right group-hover:text-brand-800 truncate transition-colors" title={item.label}>{item.label}</div>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full opacity-80 group-hover:opacity-100 transition-all duration-500 ease-out ${colorClass}`} style={{ width: `${(item.value / maxVal) * 100}%` }}></div>
          </div>
          <div className="w-10 text-right text-[10px] font-bold text-gray-400 ml-2 group-hover:text-brand-600 transition-colors">{item.value}</div>
        </div>
      ))}
    </div>
  );
};

export default SimpleBarChart;