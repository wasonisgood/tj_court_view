/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const BASE = import.meta.env.BASE_URL + 'data/judgments/';

export const STATUTES = [
  '戒嚴時期人民受損權利回復條例', '二二八事件處理及補償條例', '戒嚴時期不當叛亂暨匪諜審判案件補償條例',
  '政黨及其附隨組織不當取得財產處理條例', '促進轉型正義條例', '威權統治時期國家不法行為被害者權利回復條例', '政治檔案條例',
];
export const STATUTE_SHORT = {
  '戒嚴時期人民受損權利回復條例': '戒嚴回復條例',
  '二二八事件處理及補償條例': '二二八條例',
  '戒嚴時期不當叛亂暨匪諜審判案件補償條例': '匪諜審判補償條例',
  '政黨及其附隨組織不當取得財產處理條例': '黨產條例',
  '促進轉型正義條例': '促轉條例',
  '威權統治時期國家不法行為被害者權利回復條例': '威權條例',
  '政治檔案條例': '政治檔案條例',
};
// 條例 → 固定色（依條例指派，篩選時不改色）
export const STATUTE_COLOR = Object.fromEntries(STATUTES.map((s, i) => [s, `var(--color-series-${i + 1})`]));
export const short = (s) => STATUTE_SHORT[s] || s;

export const PERIODS = [
  '≤89年（原第6條、二二八一級一審）', '90–92年', '93–95年（89年修正第6條、請求高峰）',
  '96–99年（冤獄賠償法修正後）', '100–111年（刑事補償法）', '112年以後（威權條例）',
];
export const PERIOD_SHORT = ['89年以前', '90–92年', '93–95年', '96–99年', '100–111年', '112年以後'];
export const periodIndex = (rocYear) => {
  if (!rocYear) return -1;
  if (rocYear <= 89) return 0;
  if (rocYear <= 92) return 1;
  if (rocYear <= 95) return 2;
  if (rocYear <= 99) return 3;
  if (rocYear <= 111) return 4;
  return 5;
};

export const stanceOf = (r) => r.coding?.stance || null;

const cache = {};
const fetchJSON = (path) => {
  if (!cache[path]) {
    cache[path] = fetch(BASE + path).then(res => {
      if (!res.ok) throw new Error(`${path}：${res.status}`);
      return res.json();
    }).catch(err => { delete cache[path]; throw err; });
  }
  return cache[path];
};

const Ctx = createContext(null);
export const useJudgments = () => useContext(Ctx);

export const JudgmentsProvider = ({ children }) => {
  const [state, setState] = useState({ status: 'loading', records: [], notes: {}, meta: {} });

  useEffect(() => {
    Promise.all([fetchJSON('index.json'), fetchJSON('notes.json'), fetchJSON('meta.json')])
      .then(([records, notes, meta]) => setState({ status: 'ready', records, notes, meta }))
      .catch(err => setState(s => ({ ...s, status: 'error', error: err.message })));
  }, []);

  const value = useMemo(() => {
    const byId = new Map();
    state.records.forEach(r => {
      byId.set(r.id, r);
      byId.set(r.id.split(',').slice(0, 5).join(','), r);
    });
    const byRef = new Map(state.records.map(r => [r.ref, r]));
    return {
      ...state,
      find: (id) => byId.get(id) || byId.get(String(id).split(',').slice(0, 5).join(',')),
      findRef: (ref) => byRef.get(ref),
      getText: async (r) => (r?.shard == null ? null : (await fetchJSON(`text/${String(r.shard).padStart(2, '0')}.json`))[r.id]),
      loadPersons: () => fetchJSON('persons.json'),
      loadAllTexts: async (onProgress) => {
        const shards = [...new Set(state.records.map(r => r.shard).filter(s => s != null))];
        const merged = {};
        let done = 0;
        await Promise.all(shards.map(async s => {
          Object.assign(merged, await fetchJSON(`text/${String(s).padStart(2, '0')}.json`));
          onProgress?.(++done / shards.length);
        }));
        return merged;
      },
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// 各頁面共用：資料還沒載入時顯示的狀態
export const DataGate = ({ children }) => {
  const j = useJudgments();
  if (j.status === 'loading') return <div className="py-20 text-center text-sm text-stone-400">讀取裁判資料…</div>;
  if (j.status === 'error') return <div className="py-20 text-center text-sm text-red-600">裁判資料讀取失敗：{j.error}</div>;
  return children;
};

export const countBy = (items, fn) => {
  const m = new Map();
  items.forEach(it => {
    const keys = fn(it);
    (Array.isArray(keys) ? keys : [keys]).forEach(k => {
      if (k == null || k === '') return;
      m.set(k, (m.get(k) || 0) + 1);
    });
  });
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
