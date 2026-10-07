# 轉型正義研究資料庫

李怡俐老師研究室的研究資料管理系統。介面與管理方式比照老師個人網站（yi-lee-site）：左側依研究主題分模組，右上角顯示儲存狀態、自動儲存與快照。

目前有兩個模組：

- **轉型正義裁判**：七部條例的法院裁判、司法院刑事補償法庭（原冤獄賠償覆議委員會）決定書，以及促轉會決定書。
  - 研究成果總覽、裁判檢索（篩選、分類樹檢視、全文檢索、Excel 匯出）
  - 全案追溯：以受難者為單位，串起原軍事審判有罪判決、冤獄賠償／補償裁判、促轉會撤銷（公告名冊或決定書）與之後的刑事補償、行政訴訟；每一條連結標示依據，可逐條確認、排除或手動加入
  - 分類樹：把有利／否定歸類、理由類型、時期等逐層展開，點選即列出案件
  - 有利／否定案件分析、政治檔案與促轉條例個案分析、法院與裁判結果、研究筆記與方法
  - 案件頁：全文閱讀、引用法條標示（含國字數字寫法）、研究歸類與個案分析、筆記／標籤／重點／歸類疑義、理由摘要
- **文獻清單**：論著、法規與大法官解釋；閱讀狀態、標籤、筆記、相關裁判；BibTeX／RIS／CSV 匯入匯出與引註文字

另有「研究紀錄」（研究進度與資料更新流水帳）與「系統設定」（網站名稱、模組排序與隱藏、可編輯帳號、備份與快照）。

## 資料來源與更新

裁判資料由 `scripts/build_data.py` 產生，放在 `public/data/judgments/`，網站只讀不寫：

| 來源 | 內容 |
|---|---|
| `../judge_mcp/轉型正義判決匯出_含威權與政治檔案條例.xlsx` | 七部條例工作表（全文）、有利／否定歸類、政治檔案與促轉個案分析、各統計表的文字說明 |
| `../tw-tj-decisions/parsed_results/`、`all_revocations.json` | 促轉會決定書、復查決定書、調查報告；公告撤銷有罪判決名冊 |
| `data_source/legacy_data.js` | 舊版網站資料，保留 Excel 未收錄的案件與既有摘要 |

三個專案放在同一層資料夾後執行：

```bash
python scripts/build_data.py          # 需要 openpyxl
```

產出：`index.json`（書目、主文、歸類）、`text/NN.json`（全文分片，閱讀時才載入）、`notes.json`（統計表文字）、`persons.json`（全案連結與依據）、`meta.json`。

全案連結的依據（`scripts/link_cases.py`）：原判決案號相同、決定書引用裁判字號、個案分析當事人、裁判當事人欄姓名相同（標示「可能同名，請核對」）。1990–2000 年代的覆議決定書多已遮蔽姓名，只能靠案號連結，因此全案不完整，可在網站上手動補。

## 筆記與標註存在哪裡

- 預設：存在使用者自己的瀏覽器（localStorage），可在「系統設定 → 備份與還原」下載／還原備份檔。
- 雲端同步（選填）：在 GitHub repository secrets 設定 `VITE_FIREBASE_CONFIG`（Firebase 網頁設定的 JSON 字串，例如 `{"apiKey":"…","authDomain":"…","projectId":"…","appId":"…"}`），重新部署後改存 Firestore 的 `research_hub` 集合（可用 `VITE_FIREBASE_COLLECTION` 改名），並以 Google 帳號登入；可編輯名單在「系統設定 → 帳號與權限」。Firestore 安全規則需允許名單內帳號寫入該集合。

## 開發與部署

```bash
npm install
npm run dev      # 本機開發
npm run build    # 產出 dist/
npm run lint
```

推送到 `main` 後，`.github/workflows/deploy.yml` 會建置並部署到 GitHub Pages。路由使用 hash（`#/judgments/...`），舊版網址 `#/case/<案號>` 會自動轉到新位置。

選填的建置環境變數：`VITE_GEMINI_API_KEY`（案件頁「產生理由摘要草稿」）、`VITE_FIREBASE_CONFIG`。注意 `VITE_` 開頭的變數會被打包進前端程式，任何人都看得到。
