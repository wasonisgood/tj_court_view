import { PageHeader, Section, StatTile } from '../../../ui';
import { DataGate, useJudgments } from '../data';
import { NoteBlock, RefText } from '../components/Notes';

const Notes = () => <DataGate><Body /></DataGate>;

const Para = ({ text }) => {
  const m = text.match(/^【([^】]+)】(.*)$/s);
  if (m) return <h4 className="font-bold text-stone-800 mt-3">{m[1]}{m[2] && <span className="font-normal">：{m[2]}</span>}</h4>;
  return <p><RefText text={text} /></p>;
};

const Body = () => {
  const { records, notes, meta } = useJudgments();
  const coded = records.filter(r => r.coding);
  const manual = coded.filter(r => r.coding['歸類方式'] === '人工判讀').length;
  const sheets = ['財產型_有利類型統計', '財產型_否定類型統計', '年代趨勢統計'];

  return (
    <div>
      <PageHeader
        kicker="轉型正義裁判" title="研究筆記與方法"
        description="資料怎麼來、收錄標準、歸類方法，以及 Excel 中各統計表的原文。這一頁的文字取自研究助理的工作檔，未經改寫。"
      />

      <Section title="資料來源">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatTile label="Excel 工作檔" value={<span className="text-sm font-normal break-all">{meta.source}</span>} sub={`檔案時間 ${meta.sourceModified?.replace('T', ' ')}`} />
          <StatTile label="由 Excel 匯入" value={meta.bySource?.excel?.toLocaleString()} sub="七部條例工作表" />
          <StatTile label="沿用舊版網站資料" value={meta.bySource?.legacy || 0} sub="Excel 未收錄的裁定與最高法院案件" />
          <StatTile label="網站資料建置時間" value={<span className="text-base">{meta.builtAt?.replace('T', ' ')}</span>} sub="執行 scripts/build_data.py" />
        </div>
        <div className="text-sm text-stone-700 leading-relaxed space-y-2">
          <p>裁判全文由 judge_mcp 專案的爬蟲程式自司法院裁判書系統，以各條例名稱為案由或關鍵字檢索下載，整理成 Excel 後再由研究助理閱讀歸類。同一件裁判若同時出現在兩部條例的檢索結果，網站只保留一筆，但在兩部條例下都查得到。</p>
          <p>Excel 更新後，在專案目錄執行 <code className="px-1 bg-stone-100 rounded-sm">python scripts/build_data.py</code> 即可重新產生網站資料。</p>
        </div>
      </Section>

      <Section title="歸類方法">
        <div className="grid grid-cols-2 gap-3 mb-4 max-w-xl">
          <StatTile label="人工判讀" value={manual} sub="逐件閱讀理由或結論段落" />
          <StatTile label="規則歸類（抽樣核對）" value={coded.length - manual} sub="抽樣歸納規則、套用後再抽樣核對" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[['有利案件', '有利'], ['否定案件', '否定']].map(([title, k]) => (
            <div key={k} className="card p-5 text-sm text-stone-700 leading-relaxed space-y-2">
              <h3 className="font-bold text-base">{title}的收錄與歸類說明</h3>
              {(notes['編碼說明']?.[k] || []).map((t, i) => <Para key={i} text={t} />)}
            </div>
          ))}
        </div>
      </Section>

      <Section title="原始統計表" note="Excel 統計分頁的完整內容，點選標題展開。">
        <div className="space-y-3">
          {sheets.map(name => (
            <details key={name} className="card">
              <summary className="px-4 py-3 cursor-pointer font-medium">{name}</summary>
              <div className="px-4 pb-4 pt-2">
                {(notes[name] || []).map((b, i) => <NoteBlock key={i} block={b} />)}
              </div>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default Notes;
