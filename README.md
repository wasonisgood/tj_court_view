# 轉型正義研究資料庫

臺灣轉型正義相關條例的裁判研究資料庫：左側依研究主題分模組，右上角顯示儲存狀態、自動儲存與快照。

目前有兩個模組：

- **轉型正義裁判**：八部條例（含年資條例）的法院裁判、司法院刑事補償法庭（原冤獄賠償覆議委員會）決定書，以及促轉會決定書。
  - 研究成果總覽、裁判檢索（篩選、分類樹檢視、全文檢索、Excel 匯出）
  - 全案追溯：以受難者為單位，串起原軍事審判有罪判決、冤獄賠償／補償裁判、促轉會撤銷（公告名冊或決定書）與之後的刑事補償、行政訴訟；每一條連結標示依據，可逐條確認、排除或手動加入
  - 分類樹：把有利／否定歸類、理由類型、時期等逐層展開，點選即列出案件
  - 228條例及戒嚴條例的有利／否定案件分析（Excel 舊稱「財產型」）
  - 個案分析：黨產條例（依四大爭點逐案整理）、年資條例、政治檔案條例、促轉條例
  - 每件裁判都標示「有利於誰」（請求人、國家機關、政黨及相關組織、退職政務人員……）與轉型正義一方勝敗；
    228 及戒嚴條例沿用研究歸類，黨產、年資、政治檔案、促轉條例依個案分析，其餘裁定依 `favor_manual.json`
  - 法院與裁判結果、研究筆記與方法
  - 案件頁：全文閱讀、引用法條標示（含國字數字寫法）、研究歸類與個案分析、筆記／標籤／重點／歸類疑義、理由摘要
- **文獻清單**：論著、法規與大法官解釋；閱讀狀態、標籤、筆記、相關裁判；BibTeX／RIS／CSV 匯入匯出與引註文字

另有「研究紀錄」（研究進度與資料更新流水帳）與「系統設定」（網站名稱、模組排序與隱藏、可編輯帳號、備份與快照）。

## 資料來源與更新

裁判資料由 `scripts/build_data.py` 產生，放在 `public/data/judgments/`，網站只讀不寫：

| 來源 | 內容 |
|---|---|
| `../judge_mcp/轉型正義判決匯出_含威權與政治檔案條例.xlsx` | 八部條例工作表（全文）、黨產條例相關最高法院判決、有利／否定歸類、政治檔案／促轉／年資條例個案分析、各統計表的文字說明 |
| `data_source/favor_manual.json` | 沒有研究歸類或個案分析的裁定（119 件）逐件判讀的「有利於誰」：勝訴方身分、勝訴方、依據 |
| `data_source/party_assets_analysis.json` | 黨產條例最高行政法院判決整理表（Word）轉出的事實簡述、上訴人、上訴結果、理由，依編號對應 Excel |
| `../tw-tj-decisions/parsed_results/`、`all_revocations.json` | 促轉會決定書、復查決定書、調查報告；公告撤銷有罪判決名冊 |
| `data_source/legacy_data.js` | 舊版網站資料，保留 Excel 未收錄的案件與既有摘要 |

三個專案放在同一層資料夾後執行：

```bash
python scripts/build_data.py          # 需要 openpyxl
python scripts/import_party_analysis.py 黨產條例判決整理表.docx   # Word 整理表更新時，需要 python-docx
```

找不到 `../tw-tj-decisions` 時，build_data.py 會沿用 `public/data/judgments` 既有的促轉會決定書與全案連結，只更新法院裁判。

產出：`index.json`（書目、主文、歸類）、`text/NN.json`（全文分片，閱讀時才載入）、`notes.json`（統計表文字）、`persons.json`（全案連結與依據）、`meta.json`。

全案連結的依據（`scripts/link_cases.py`）：原判決案號相同、決定書引用裁判字號、個案分析當事人、裁判當事人欄姓名相同（標示「可能同名，請核對」）。1990–2000 年代的覆議決定書多已遮蔽姓名，只能靠案號連結，因此全案不完整，可在網站上手動補。

## 筆記與標註存在哪裡

- 預設：存在使用者自己的瀏覽器（localStorage），可在「系統設定 → 備份與還原」下載／還原備份檔。
- 雲端同步（選填）：在 GitHub repository secrets 設定 `VITE_FIREBASE_CONFIG`（Firebase 網頁設定的 JSON 字串，例如 `{"apiKey":"…","authDomain":"…","projectId":"…","appId":"…"}`），重新部署後改存 Firestore 的 `research_hub` 集合（可用 `VITE_FIREBASE_COLLECTION` 改名），並以 Google 帳號登入；可編輯名單在「系統設定 → 帳號與權限」。Firestore 安全規則需允許名單內帳號寫入該集合。

## 開發與部署

```bash
npm install
npm run dev      # 本機開發
npm run build    # 產出 dist/（含每頁與每件裁判的靜態 HTML、sitemap.xml、robots.txt）
npm run lint
```

### 搜尋引擎

- 網址是一般路徑（`/tj_court_view/judgments/case/…`），舊的 `#/…` 網址會自動轉址。
- `scripts/prerender.mjs` 在建置後替每個公開頁面與每件裁判寫一個靜態 HTML：標題、描述、canonical、Open Graph、schema.org 結構化資料，以及不需執行 JavaScript 就讀得到的主文、個案分析與全文；另產生 `sitemap.xml`。
- 頁面標題與描述集中在 `src/core/pageMeta.js`。
- 網站部署在 GitHub Pages 的子路徑下，`robots.txt` 不在網域根目錄，搜尋引擎不會自動讀取；請到 Google Search Console 提交 `https://wasonisgood.github.io/tj_court_view/sitemap.xml`。
- 部署到其他網址時，建置時設定 `BASE_PATH`（如 `/`）與 `SITE_URL`、`VITE_SITE_URL`。

推送到 `main` 後，`.github/workflows/deploy.yml` 會建置並部署到 GitHub Pages。路由使用 hash（`#/judgments/...`），舊版網址 `#/case/<案號>` 會自動轉到新位置。

選填的建置環境變數：`VITE_GEMINI_API_KEY`（案件頁「產生理由摘要草稿」）、`VITE_FIREBASE_CONFIG`。注意 `VITE_` 開頭的變數會被打包進前端程式，任何人都看得到。
