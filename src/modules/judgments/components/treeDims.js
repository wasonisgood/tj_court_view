import { STATUTES, STATUTE_COLOR, short, PERIOD_SHORT, periodIndex } from '../data';

const STANCE_COLOR = { 有利: 'var(--color-favorable)', 否定: 'var(--color-unfavorable)', 未歸類: '#a8a29e' };
const OUTCOME_COLOR = { '請求人勝訴（含廢棄發回）': 'var(--color-favorable)', '一部勝訴': 'var(--color-series-3)', '請求遭駁回': 'var(--color-unfavorable)' };
const periodOrder = (a, b) => PERIOD_SHORT.indexOf(a) - PERIOD_SHORT.indexOf(b);

// 可組合的分類維度
export const DIMS = {
  statute: { label: '條例', get: r => short(r.statute), color: v => STATUTE_COLOR[STATUTES.find(s => short(s) === v)], order: (a, b) => STATUTES.findIndex(s => short(s) === a) - STATUTES.findIndex(s => short(s) === b) },
  stance: { label: '研究歸類', get: r => r.coding?.stance || '未歸類', color: v => STANCE_COLOR[v] },
  reason: { label: '主要理由／否定大類', get: r => r.coding ? (r.coding.stance === '有利' ? r.coding['理由類型（主）'] : r.coding['否定類型（大類）']) : null },
  detail: { label: '結果類型／否定類型', get: r => r.coding ? (r.coding.stance === '有利' ? r.coding['有利結果類型'] : r.coding['否定類型']) : null },
  secondary: { label: '次要理由', get: r => r.coding?.['理由類型（次）'] || (r.coding?.stance === '有利' ? '（無次要理由）' : null) },
  basis: { label: '請求權基礎', get: r => r.coding?.['請求權基礎（裁判時法制）'] },
  period: { label: '時期', get: r => PERIOD_SHORT[periodIndex(r.rocYear)], order: periodOrder },
  method: { label: '歸類方式', get: r => r.coding?.['歸類方式'] },
  docType: { label: '文書類型', get: r => r.docType },
  result: { label: '裁判結果', get: r => r.result },
  court: { label: '法院／機關', get: r => r.court },
  outcome: { label: '勝負歸類', get: r => Object.values(r.caseAnalysis || {})[0]?.['勝負歸類'], color: v => OUTCOME_COLOR[v] },
  judgeType: { label: '判斷類型（主）', get: r => Object.values(r.caseAnalysis || {})[0]?.['判斷類型（主）'] },
  year: { label: '年度', get: r => (r.rocYear ? `民國 ${r.rocYear} 年` : null), order: (a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)) },
};

export const PRESETS = [
  { id: 'coding', label: '研究歸類：有利／否定 → 理由 → 結果 → 時期', dims: ['stance', 'reason', 'detail', 'period'], filter: r => r.coding },
  { id: 'favorable', label: '有利案件：主要理由 → 次要理由 → 結果類型', dims: ['reason', 'secondary', 'detail'], filter: r => r.coding?.stance === '有利' },
  { id: 'unfavorable', label: '否定案件：大類 → 否定類型 → 時期', dims: ['reason', 'detail', 'period'], filter: r => r.coding?.stance === '否定' },
  { id: 'statute', label: '收錄結構：條例 → 文書類型 → 裁判結果', dims: ['statute', 'docType', 'result'], filter: () => true },
  { id: 'special', label: '政治檔案與促轉：條例 → 勝負 → 判斷類型', dims: ['statute', 'outcome', 'judgeType'], filter: r => r.caseAnalysis },
  { id: 'tjc', label: '促轉會決定：文書類型 → 結果 → 年度', dims: ['docType', 'result', 'year'], filter: r => r.source === 'tjc' },
];

export const levelsOf = (dims) => dims.map(d => DIMS[d]);
