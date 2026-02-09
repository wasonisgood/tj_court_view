import React from 'react';

const SimpleBarChart = ({ data, colorClass = "bg-blue-500", onBarClick }) => {
  if (!data || data.length === 0) return <div className="text-xs text-gray-400 italic">無數據</div>;
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center text-sm group cursor-pointer" onClick={() => onBarClick && onBarClick(item.label)}>
          <div className="w-[140px] text-xs text-gray-600 mr-2 text-right group-hover:text-blue-600 truncate" title={item.label}>{item.label}</div>
          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div className={`h-full border-r-2 border-white transition-all duration-500 ${colorClass}`} style={{ width: `${(item.value / maxVal) * 100}%` }}></div>
          </div>
          <div className="w-12 text-right text-xs text-gray-500 ml-2 group-hover:font-bold">{item.value}</div>
        </div>
      ))}
    </div>
  );
};

export default SimpleBarChart;
