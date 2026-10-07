import { Modal } from '../ui';
import { useStore } from '../core/StoreContext';

const HelpModal = ({ open, onClose }) => {
  const { backendKind } = useStore();
  return (
    <Modal open={open} onClose={onClose} title="使用說明" wide>
      <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
        <section>
          <h4 className="font-bold mb-1">這個系統在做什麼</h4>
          <p>把研究助理整理的裁判資料、歸類結果與文獻集中在一處，讓老師可以直接看到目前的研究進度與成果，並在案件或文獻上留下意見。每個研究主題是一個「模組」，目前有「轉型正義裁判」與「文獻清單」。</p>
        </section>
        <section>
          <h4 className="font-bold mb-1">轉型正義裁判</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>研究成果總覽</b>：收錄件數、年度分布、各條例有利比例。</li>
            <li><b>裁判檢索</b>：依條例、法院、文書類型、結果、歸類篩選；可切換清單與分類樹，也可載入全文後做全文檢索。檢索結果可匯出 Excel。</li>
            <li><b>有利／否定案件分析</b>：研究助理對每件裁判所作的歸類（理由類型、結果類型、時期），點長條可列出該類案件。</li>
            <li><b>政治檔案與促轉</b>：兩部條例的個案分析，含爭點、法院判斷與前後審脈絡。</li>
            <li><b>案件頁</b>：閱讀全文、點選引用法條標記出現位置，右側可寫筆記、加標籤、標為重點，或對歸類提出疑義。</li>
          </ul>
        </section>
        <section>
          <h4 className="font-bold mb-1">關於「歸類方式」</h4>
          <p>每件裁判的歸類都標示做法：「人工判讀」是逐件閱讀；「規則歸類（抽樣核對）」是先抽樣閱讀歸納規則、套用後再抽樣核對。後者若有疑問，請在案件頁按「對歸類有疑義」，研究助理會在「重點與標註」看到。</p>
        </section>
        <section>
          <h4 className="font-bold mb-1">資料儲存</h4>
          {backendKind === 'firebase'
            ? <p>筆記、標註、文獻與研究紀錄存放在雲端資料庫；登入名單內的 Google 帳號才能修改。</p>
            : <p>目前筆記、標註、文獻與研究紀錄存在<b>這台電腦的瀏覽器</b>裡。換電腦或清除瀏覽器資料前，請到「系統設定 → 備份與還原」下載備份檔。若要多人共用，請依 README 設定雲端資料庫。</p>}
          <p className="mt-1">裁判資料本身由研究助理從 Excel 轉檔後發布，在網頁上不會被修改。</p>
        </section>
      </div>
    </Modal>
  );
};

export default HelpModal;
