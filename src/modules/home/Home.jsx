import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../core/StoreContext';
import { orderedModules } from '../../core/modules';
import { useJudgments } from '../judgments/data';
import { PageHeader, Section, StatTile } from '../../ui';

const Home = () => {
  const { settings, annotations, literature, log, links } = useStore();
  const j = useJudgments();
  const modules = orderedModules(settings).filter(m => !m.hidden);
  const anns = Object.values(annotations);
  const verdicts = Object.values(links?.verdicts || {}).filter(Boolean);

  const stats = {
    judgments: j.status === 'ready' ? [
      ['收錄文書', j.records.length.toLocaleString(), `含促轉會決定 ${j.meta.bySource?.tjc || 0} 件`],
      ['已完成歸類', (j.records.filter(r => r.coding).length).toLocaleString(), '有利／否定'],
      ['可串成全案的人', j.meta.personsLinked ?? '—', `其中 ${j.meta.personsWithCourt ?? 0} 人連到法院裁判`],
    ] : [['資料', j.status === 'error' ? '讀取失敗' : '讀取中…', '']],
    literature: [
      ['文獻', literature.length, `法規與解釋 ${literature.filter(l => ['法規', '釋憲'].includes(l.type)).length} 筆`],
      ['待讀', literature.filter(l => l.status === '待讀').length, ''],
      ['已寫筆記', literature.filter(l => l.note).length, ''],
    ],
  };

  const todo = [
    { label: '歸類疑義', value: anns.filter(a => a.flag).length, to: '/judgments/marked' },
    { label: '待討論案件', value: anns.filter(a => a.status === '待討論').length, to: '/judgments/marked' },
    { label: '重點案件', value: anns.filter(a => a.starred).length, to: '/judgments/marked' },
    { label: '已核對的全案連結', value: verdicts.length, to: '/judgments/persons' },
  ];

  return (
    <div>
      <PageHeader
        kicker={settings.owner}
        title={settings.siteName}
        description="研究資料、歸類成果與文獻集中於此。左側依研究主題分為模組；每一頁的資料都標明來源與整理方式，有疑問的地方可以直接在案件或文獻上留言。"
      />

      <Section title="待處理">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {todo.map(t => (
            <Link key={t.label} to={t.to} className="card p-4 hover:border-brand-gold">
              <div className="text-xs text-stone-500">{t.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="研究模組">
        <div className="grid lg:grid-cols-2 gap-5">
          {modules.map(m => (
            <div key={m.id} className="card p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-5 h-5 text-brand-gold-dark" />
                <h3 className="text-lg font-bold">{m.label}</h3>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">{m.description}</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(stats[m.id] || []).map(([label, value, sub]) => <StatTile key={label} label={label} value={value} sub={sub} />)}
              </div>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {m.nav.slice(0, 5).map(n => <Link key={n.path} to={n.path} className="link">{n.label}</Link>)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="研究紀錄" actions={<Link to="/log" className="text-sm link inline-flex items-center">全部紀錄<ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>}>
        <ol className="card divide-y divide-stone-100">
          {[...log].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(e => (
            <li key={e.id} className="px-4 py-3 flex gap-4">
              <span className="text-xs text-stone-500 tabular-nums w-20 shrink-0 pt-0.5">{e.date}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{e.title} {e.status && <span className="chip ml-1">{e.status}</span>}</div>
                {e.body && <p className="text-[13px] text-stone-600 mt-0.5 line-clamp-2">{e.body}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
};

export default Home;
