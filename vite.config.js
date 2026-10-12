import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 部署在 GitHub Pages 的 /tj_court_view/ 之下；改用 BrowserRouter 後必須用絕對路徑。
// 若部署到網域根目錄，建置時設定 BASE_PATH=/。
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.BASE_PATH || '/tj_court_view/',
})
