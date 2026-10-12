// 各頁的標題與搜尋引擎描述。網站執行時由 RouteMeta 套用，建置時由 scripts/prerender.mjs 寫進靜態 HTML。
// 這個檔案也會被 Node 直接讀取，不要 import 其他前端模組。

export const SITE_NAME = '轉型正義研究資料庫';
export const SITE_DESCRIPTION = '臺灣轉型正義八部條例的法院裁判、司法院刑事補償法庭決定書與促轉會決定書：全文檢索、有利／否定歸類、黨產與年資條例個案分析，以及以受難者為單位的全案追溯。';

export const PAGE_META = {
  '/': { title: SITE_NAME, description: SITE_DESCRIPTION },
  '/judgments': {
    title: '研究成果總覽',
    description: '二二八條例、戒嚴回復條例、匪諜審判補償條例、黨產條例、年資條例、促轉條例、威權條例與政治檔案條例的裁判件數、年度分布與各條例有利比例。',
  },
  '/judgments/browse': {
    title: '裁判檢索',
    description: '依條例、法院、文書類型、裁判結果與研究歸類篩選轉型正義相關裁判，支援全文檢索與 Excel 匯出。',
  },
  '/judgments/persons': {
    title: '全案追溯',
    description: '以受難者為單位，串起原軍事審判有罪判決、冤獄賠償與刑事補償裁判、促轉會撤銷有罪判決及後續行政訴訟。',
  },
  '/judgments/tree': {
    title: '分類樹',
    description: '把轉型正義裁判依研究歸類、理由類型、條例、時期逐層展開，點選即列出案件。',
  },
  '/judgments/favorable': {
    title: '228條例及戒嚴條例：有利案件分析',
    description: '二二八條例與戒嚴時期三部條例中，法院或刑事補償法庭作成有利於聲請人決定的案件：主要理由、次要理由、結果類型與請求權基礎。',
  },
  '/judgments/unfavorable': {
    title: '228條例及戒嚴條例：否定案件分析',
    description: '二二八條例與戒嚴時期三部條例中遭否定的請求：程序與救濟要件、實體要件、除外事由、金額與基數等否定類型與各時期分布。',
  },
  '/judgments/special': {
    title: '個案分析：黨產、年資、政治檔案與促轉條例',
    description: '黨產條例最高行政法院判決依四大爭點（附隨組織認定、命移轉為國有、追徵價額、動支財產否准）逐案整理，另有年資條例、政治檔案條例與促轉條例的個案分析。',
  },
  '/judgments/courts': {
    title: '法院與裁判結果',
    description: '各法院、刑事補償法庭與促轉會的收案件數及裁判結果分布。',
  },
  '/judgments/notes': {
    title: '研究筆記與方法',
    description: '資料來源、收錄標準、有利／否定歸類方法與各統計表原文。',
  },
  '/literature': {
    title: '文獻清單',
    description: '轉型正義研究使用的論著、法規與大法官解釋。',
  },
};

// 不需要被搜尋引擎收錄的頁面（個人標註、設定）
export const NOINDEX = ['/judgments/marked', '/log', '/system'];

const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

/** 案件頁的搜尋描述：日期、條例、案由、主文或個案分析摘要 */
export const caseDescription = (r, statuteLabel) => {
  const a = Object.values(r.caseAnalysis || {})[0];
  const gist = a?.['事實簡述'] || a?.['爭議處分或請求'] || r.coding?.['案情摘要'] || r.mainText;
  return clip([r.date, statuteLabel, r.cause && `案由：${r.cause}`, gist && (r.mainText === gist ? `主文：${gist}` : gist)].filter(Boolean).join('｜'), 160);
};
