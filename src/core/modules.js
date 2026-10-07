import { Scale, BookMarked } from 'lucide-react';

// 研究模組登記表：新增模組時在這裡登記導覽項目，並於 App.jsx 加上路由。
// 「系統設定 → 模組顯示」可以調整排序、隱藏或改名。
export const MODULES = {
  judgments: {
    id: 'judgments',
    label: '轉型正義裁判',
    icon: Scale,
    description: '七部轉型正義相關條例的法院裁判、刑事補償法庭決定書與促轉會決定書，含有利／否定歸類、個案分析與以人為單位的全案追溯。',
    nav: [
      { path: '/judgments', label: '研究成果總覽', end: true },
      { path: '/judgments/browse', label: '裁判檢索' },
      { path: '/judgments/persons', label: '全案追溯' },
      { path: '/judgments/tree', label: '分類樹' },
      { path: '/judgments/favorable', label: '有利案件分析' },
      { path: '/judgments/unfavorable', label: '否定案件分析' },
      { path: '/judgments/special', label: '政治檔案與促轉' },
      { path: '/judgments/courts', label: '法院與裁判結果' },
      { path: '/judgments/marked', label: '重點與標註' },
      { path: '/judgments/notes', label: '研究筆記與方法' },
    ],
  },
  literature: {
    id: 'literature',
    label: '文獻清單',
    icon: BookMarked,
    description: '研究使用的專書、期刊、法規與大法官解釋，可標記閱讀狀態、寫筆記並匯出引註格式。',
    nav: [
      { path: '/literature', label: '文獻清單', end: true },
    ],
  },
};

export const orderedModules = (settings) => {
  const order = [...(settings?.moduleOrder || [])];
  Object.keys(MODULES).forEach(id => { if (!order.includes(id)) order.push(id); });
  return order
    .filter(id => MODULES[id])
    .map(id => ({ ...MODULES[id], label: settings?.moduleLabels?.[id] || MODULES[id].label, hidden: (settings?.hiddenModules || []).includes(id) }));
};
