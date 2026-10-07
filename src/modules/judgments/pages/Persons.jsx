/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHeader, Pager, StatTile, Empty } from '../../../ui';
import { useStore } from '../../../core/StoreContext';
import { DataGate, useJudgments } from '../data';

const Persons = () => <DataGate><Body /></DataGate>;

export const personHref = (name) => `/judgments/person/${encodeURIComponent(name)}`;

export const usePersons = () => {
  const { loadPersons } = useJudgments();
  const [persons, setPersons] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { loadPersons().then(setPersons).catch(e => setError(e.message)); }, [loadPersons]);
  return { persons, error };
};

const KIND_STYLE = { 名冊: 'bg-stone-100 text-stone-700', 決定書: 'bg-amber-50 text-amber-800 border-amber-200', 法院: 'bg-sky-50 text-sky-800 border-sky-200' };

const Body = () => {
  const { persons, error } = usePersons();
  const { links } = useStore();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const q = params.get('q') || '';
  const scope = params.get('scope') || 'linked';
  const set = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); setPage(0); };

  const manualNames = Object.keys(links?.manual || {}).filter(n => links.manual[n]?.length);
  const list = useMemo(() => {
    if (!persons) return [];
    return persons.filter(p => {
      if (q && !p.name.includes(q)) return false;
      if (scope === 'linked') return p.kinds.length > 1 || manualNames.includes(p.name);
      if (scope === 'court') return p.court.length > 0 || manualNames.includes(p.name);
      if (scope === 'decision') return p.decisions.length > 0;
      return true;
    });
  }, [persons, q, scope, manualNames]);

  if (error) return <div className="text-red-600 text-sm">全案資料讀取失敗：{error}</div>;
  if (!persons) return <div className="py-20 text-center text-sm text-stone-400">讀取全案資料…</div>;

  const pageSize = 30;
  const slice = list.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <PageHeader
        kicker="轉型正義裁判" title="全案追溯"
        description="以受難者為單位，把同一人在不同制度中的紀錄串在一起：原軍事審判有罪判決、依戒嚴回復條例或補償條例進入法院的冤獄賠償、促轉會撤銷有罪判決（公告名冊或個別決定書），以及之後的刑事補償、行政訴訟。每一條連結都標示依據，可逐條確認或排除。"
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="名冊與決定書中的人" value={persons.length.toLocaleString()} sub="公告撤銷名冊、促轉會決定書當事人" onClick={() => set('scope', 'all')} />
        <StatTile label="跨兩種以上來源" value={persons.filter(p => p.kinds.length > 1).length} sub="可串成全案者" onClick={() => set('scope', '')} />
        <StatTile label="連到法院裁判" value={persons.filter(p => p.court.length).length} sub="依案號、引用或姓名連結" onClick={() => set('scope', 'court')} />
        <StatTile label="有促轉會決定書" value={persons.filter(p => p.decisions.length).length} onClick={() => set('scope', 'decision')} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="field pl-9" value={q} onChange={e => set('q', e.target.value)} placeholder="輸入姓名" />
        </div>
        <select className="field w-auto" value={scope} onChange={e => set('scope', e.target.value === 'linked' ? '' : e.target.value)} aria-label="範圍">
          <option value="linked">跨來源（可串成全案）</option>
          <option value="court">有法院裁判</option>
          <option value="decision">有促轉會決定書</option>
          <option value="all">全部（含只在名冊中者）</option>
        </select>
      </div>

      {!list.length ? <Empty>沒有符合的人。</Empty> : (
        <div className="card divide-y divide-stone-100">
          {slice.map(p => (
            <Link key={p.name} to={personHref(p.name)} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-stone-50">
              <span className="font-serif font-bold text-[17px] w-24">{p.name}</span>
              <span className="flex gap-1.5">
                {['名冊', '決定書', '法院'].map(k => {
                  const n = k === '名冊' ? p.revocations.length : k === '決定書' ? p.decisions.length : p.court.length;
                  return n ? <span key={k} className={`chip ${KIND_STYLE[k]}`}>{k} {n}</span> : null;
                })}
              </span>
              <span className="flex-1 text-xs text-stone-500 truncate min-w-40">
                {p.revocations[0] && `${p.revocations[0].court.join('、')} ${p.revocations[0].cases.join('、')}`}
              </span>
            </Link>
          ))}
        </div>
      )}
      <Pager page={page} pageCount={Math.ceil(list.length / pageSize)} onChange={setPage} total={list.length} />
      <p className="text-xs text-stone-500 mt-4 leading-relaxed">
        說明：1990–2000 年代刑事補償法庭（原冤獄賠償覆議委員會）的決定書多已遮蔽當事人姓名，只有在全文中出現原軍事審判案號時才能連結，因此「全案」並不完整；
        若確知某件裁判屬於某人，可在其全案頁手動加入。名冊資料取自 tw-tj-decisions 專案整理的促轉會公告撤銷有罪判決名冊。
      </p>
    </div>
  );
};

export default Persons;
