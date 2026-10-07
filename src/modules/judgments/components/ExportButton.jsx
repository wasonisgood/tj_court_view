import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Modal, download } from '../../../ui';
import { useStore } from '../../../core/StoreContext';
import { useJudgments, STATUTES } from '../data';

const EN = {
  statute: {
    '戒嚴時期人民受損權利回復條例': "Restoration of People's Rights (Martial Law)",
    '二二八事件處理及補償條例': '228 Incident Handling & Compensation',
    '戒嚴時期不當叛亂暨匪諜審判案件補償條例': 'Improper Sedition & Espionage Trials Compensation',
    '政黨及其附隨組織不當取得財產處理條例': 'Ill-gotten Party Assets Settlement',
    '促進轉型正義條例': 'Promotion of Transitional Justice',
    '威權統治時期國家不法行為被害者權利回復條例': "Victims' Rights Restoration (Authoritarian Era)",
    '政治檔案條例': 'Political Archives',
  },
  court: {
    '司法院刑事補償法庭': 'Criminal Compensation Court, Judicial Yuan',
    '最高法院': 'Supreme Court', '最高行政法院': 'Supreme Administrative Court', '行政法院': 'Administrative Court',
    '臺北高等行政法院': 'Taipei High Administrative Court', '臺北高等行政法院 高等庭': 'Taipei High Administrative Court (High Court Div.)',
    '臺北高等行政法院 地方庭': 'Taipei High Administrative Court (District Div.)',
    '臺灣臺北地方法院': 'Taipei District Court', '臺灣新北地方法院': 'New Taipei District Court', '臺灣桃園地方法院': 'Taoyuan District Court',
  },
  result: {
    '聲請駁回': 'Petition dismissed', '撤銷原判/決定': 'Prior decision revoked', '駁回': 'Dismissed', '再審駁回': 'Retrial dismissed',
  },
  stance: { '有利': 'Favorable', '否定': 'Unfavorable' },
};

const COLS = {
  zh: ['案號', '標題', '法院', '裁判日期', '條例', '案由', '裁判結果', '主文', '歸類', '原始連結'],
  en: ['Case ID', 'Title', 'Court', 'Date', 'Statute', 'Cause', 'Outcome', 'Main text', 'Coding', 'URL'],
};

const ExportButton = ({ items, filename = '裁判清單', label = '匯出 Excel' }) => {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState('zh');
  const [mode, setMode] = useState('coding');
  const [withNotes, setWithNotes] = useState(true);
  const [busy, setBusy] = useState(false);
  const { annotations } = useStore();
  const j = useJudgments();

  const run = async () => {
    setBusy(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const texts = mode === 'full' ? await j.loadAllTexts() : null;
      const tr = (map, v) => (lang === 'en' ? EN[map][v] || v : v);
      const C = COLS[lang];
      const rowOf = (r) => {
        const row = {
          [C[0]]: r.id, [C[1]]: r.title, [C[2]]: tr('court', r.court),
          [C[3]]: lang === 'en' ? r.iso : r.date, [C[4]]: tr('statute', r.statute), [C[5]]: r.cause,
          [C[6]]: tr('result', r.result), [C[7]]: r.mainText, [C[8]]: tr('stance', r.coding?.stance || ''), [C[9]]: r.url,
        };
        if (mode === 'coding' && r.coding) {
          Object.entries(r.coding).forEach(([k, v]) => { if (!['stance', 'codingStatute'].includes(k)) row[k] = v; });
        }
        if (mode === 'coding' && r.caseAnalysis) {
          Object.values(r.caseAnalysis).forEach(a => Object.entries(a).forEach(([k, v]) => { row['個案分析：' + k] = v; }));
        }
        if (mode === 'summary') row[lang === 'en' ? 'Summary (auto-generated)' : '摘要（自動產生）'] = (r.summary || []).map((s, i) => `${i + 1}. ${s.point}`).join('\n');
        if (mode === 'full') row[lang === 'en' ? 'Full text' : '全文'] = Object.entries(texts[r.id] || {}).map(([k, v]) => `【${k}】\n${v}`).join('\n\n');
        if (withNotes) {
          const a = annotations[r.id];
          row[lang === 'en' ? 'Notes' : '研究筆記'] = a?.note || '';
          row[lang === 'en' ? 'Tags' : '標籤'] = (a?.tags || []).join('、');
          row[lang === 'en' ? 'Coding query' : '歸類疑義'] = a?.flag ? a.flagNote || '有疑義' : '';
        }
        return row;
      };

      const wb = XLSX.utils.book_new();
      const groups = STATUTES.map(s => [s, items.filter(r => r.statute === s)]).filter(([, v]) => v.length);
      const others = items.filter(r => !STATUTES.includes(r.statute));
      if (others.length) groups.push(['其他', others]);
      const header = { font: { bold: true }, fill: { fgColor: { rgb: 'F5F5F4' } } };
      groups.forEach(([s, list]) => {
        const ws = XLSX.utils.json_to_sheet(list.map(rowOf));
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let c = range.s.c; c <= range.e.c; c++) {
          const ref = XLSX.utils.encode_cell({ r: 0, c });
          if (ws[ref]) ws[ref].s = header;
        }
        ws['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, ws, (lang === 'en' ? EN.statute[s] || s : s).slice(0, 31));
      });

      // 年代 × 條例統計，最多的一格標黃（沿用舊版匯出格式）
      const decades = [...new Set(items.map(r => r.iso && Math.floor(Number(r.iso.slice(0, 4)) / 10) * 10).filter(Boolean))].sort();
      const trend = decades.map(d => {
        const row = { [lang === 'en' ? 'Decade' : '年代']: lang === 'en' ? `${d}s` : `${d}年代` };
        groups.forEach(([s, list]) => { row[lang === 'en' ? EN.statute[s] || s : s] = list.filter(r => r.iso?.startsWith(String(d).slice(0, 3))).length; });
        return row;
      });
      if (trend.length) {
        const ws = XLSX.utils.json_to_sheet(trend);
        trend.forEach((row, i) => {
          const vals = Object.values(row).slice(1);
          const m = Math.max(...vals);
          const c = vals.indexOf(m);
          const ref = XLSX.utils.encode_cell({ r: i + 1, c: c + 1 });
          if (m > 0 && ws[ref]) ws[ref].s = { fill: { fgColor: { rgb: 'FFF2A8' } }, font: { bold: true } };
        });
        XLSX.utils.book_append_sheet(wb, ws, lang === 'en' ? 'Trend by decade' : '年代趨勢統計');
      }
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      download(`${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([out], { type: 'application/octet-stream' }));
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const modes = [
    ['list', '基本清單', '案號、法院、日期、結果、主文'],
    ['coding', '含研究歸類', '加上有利／否定歸類欄位與個案分析'],
    ['summary', '含摘要', '加上已產生的摘要（多數案件沒有）'],
    ['full', '含全文', '加上判決全文，檔案較大'],
  ];

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)} disabled={!items.length}><FileSpreadsheet className="w-4 h-4 text-green-700" />{label}</button>
      <Modal
        open={open} onClose={() => setOpen(false)} title={`匯出 Excel（${items.length} 件）`}
        footer={<><button className="btn" onClick={() => setOpen(false)}>取消</button><button className="btn-primary" onClick={run} disabled={busy}>{busy ? '產生中…' : '下載'}</button></>}
      >
        <div className="space-y-4 text-sm">
          <div>
            <div className="label">欄位語言</div>
            <div className="flex gap-2">
              {[['zh', '中文'], ['en', 'English']].map(([v, l]) => (
                <button key={v} onClick={() => setLang(v)} className={lang === v ? 'btn-primary' : 'btn'}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">內容</div>
            <div className="space-y-1.5">
              {modes.map(([v, l, d]) => (
                <label key={v} className={`flex items-start gap-2 p-2 border rounded-sm cursor-pointer ${mode === v ? 'border-brand-gold bg-amber-50/40' : 'border-stone-200'}`}>
                  <input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} className="mt-1" />
                  <span><span className="font-medium">{l}</span><span className="block text-xs text-stone-500">{d}</span></span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={withNotes} onChange={e => setWithNotes(e.target.checked)} />附上研究筆記、標籤與歸類疑義</label>
        </div>
      </Modal>
    </>
  );
};

export default ExportButton;
