import literatureSeed from '../modules/literature/seed.json';

export const DEFAULT_SETTINGS = {
  siteName: '轉型正義研究資料庫',
  owner: '李怡俐老師研究室',
  // 雲端模式下可登入編輯的帳號（與 yi-lee-site 相同）
  allowedEmails: ['yili_lee@mx.nthu.edu.tw', 'wasonisgood@gmail.com'],
  moduleOrder: ['judgments', 'literature'],
  hiddenModules: [],
  moduleLabels: {},
};

// 研究紀錄的起始內容：取自 Excel 各分頁的更新說明，之後由研究室自行新增
export const DEFAULT_LOG = [
  {
    id: 'log-2026-10-07b',
    date: '2026-10-07',
    module: 'judgments',
    title: '促轉會決定書併入裁判資料庫，建立全案追溯',
    body: '將 107 件促轉會決定書、復查決定書與調查報告，以及公告撤銷有罪判決名冊，與法院裁判以原判決案號、決定書引用字號、當事人姓名連結，每條連結附依據，待逐案核對。',
    status: '待核對',
  },
  {
    id: 'log-2026-10-07',
    date: '2026-10-07',
    module: 'judgments',
    title: '補入戒嚴回復條例刑事補償法庭裁判 1,185 件並完成歸類',
    body: '有利 452 件、否定 733 件；已以其他條例收錄者 61 件不重複列入。件數多的組別抽樣閱讀、歸納規則後套用並抽樣核對，件數少的組別及規則未命中者逐件閱讀。',
    status: '完成',
  },
  {
    id: 'log-2026-02-04',
    date: '2026-02-04',
    module: 'judgments',
    title: '建立七部條例判決資料庫初版',
    body: '自司法院裁判書系統依條例名稱檢索並下載全文，整理為各條例分頁；另就政治檔案條例、促轉條例案件逐件撰寫個案分析。',
    status: '完成',
  },
];

export const DEFAULT_DATA = {
  settings: DEFAULT_SETTINGS,
  annotations: {},
  literature: literatureSeed,
  log: DEFAULT_LOG,
  // 全案連結的人工核對結果：verdicts[`${姓名}|${文書id}`] = { state: '確認'|'排除', note, by, at }；manual[姓名] = [{ id, note }]
  links: { verdicts: {}, manual: {} },
};

export const COLLECTIONS = Object.keys(DEFAULT_DATA);
