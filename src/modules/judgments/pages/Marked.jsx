import { useMemo, useState } from 'react';
import { PageHeader, Tabs } from '../../../ui';
import { useStore } from '../../../core/StoreContext';
import { DataGate, useJudgments } from '../data';
import CaseList from '../components/CaseList';
import ExportButton from '../components/ExportButton';

const Marked = () => <DataGate><Body /></DataGate>;

const Body = () => {
  const { records } = useJudgments();
  const { annotations } = useStore();
  const [tab, setTab] = useState('starred');

  const groups = useMemo(() => {
    const withA = records.filter(r => annotations[r.id]);
    const byUpdated = (a, b) => (annotations[b.id]?.updatedAt || '').localeCompare(annotations[a.id]?.updatedAt || '');
    return {
      starred: withA.filter(r => annotations[r.id].starred).sort(byUpdated),
      discuss: withA.filter(r => annotations[r.id].status === '待討論').sort(byUpdated),
      flag: withA.filter(r => annotations[r.id].flag).sort(byUpdated),
      note: withA.filter(r => annotations[r.id].note).sort(byUpdated),
      summary: records.filter(r => r.summary?.length),
    };
  }, [records, annotations]);

  const tabs = [
    { id: 'starred', label: '重點案件', count: groups.starred.length },
    { id: 'discuss', label: '待討論', count: groups.discuss.length },
    { id: 'flag', label: '歸類有疑義', count: groups.flag.length },
    { id: 'note', label: '有筆記', count: groups.note.length },
    { id: 'summary', label: '已有摘要', count: groups.summary.length },
  ];

  const detail = {
    flag: (r) => <><span className="text-red-600">疑義：</span>{annotations[r.id].flagNote || '（未填說明）'}<span className="text-stone-400">｜原歸類：{r.coding?.['理由類型（主）'] || r.coding?.['否定類型'] || '—'}</span></>,
    note: (r) => annotations[r.id].note,
    starred: (r) => annotations[r.id].note || r.mainText,
    discuss: (r) => annotations[r.id].note || r.mainText,
    summary: (r) => r.summary[0]?.point,
  }[tab];

  const empty = {
    starred: '還沒有標為重點的案件。在案件頁右側按「標為重點」即會出現在這裡。',
    discuss: '還沒有標為「待討論」的案件。',
    flag: '目前沒有歸類疑義。',
    note: '還沒有寫過筆記的案件。',
    summary: '沒有已產生摘要的案件。',
  }[tab];

  return (
    <div>
      <PageHeader
        kicker="轉型正義裁判" title="重點與標註"
        description="老師與研究助理在案件頁留下的標記、筆記與歸類疑義集中在這裡，方便討論時逐一檢視。"
        actions={<ExportButton items={groups[tab]} filename={tabs.find(t => t.id === tab).label} />}
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <CaseList items={groups[tab]} detail={detail} empty={empty} />
    </div>
  );
};

export default Marked;
