# 共學地圖

和朋友連線共學：Google 登入、AI 拆解目標、關卡地圖、共用寵物。

## 本機

```bash
npm install
cp .env.example .env
# 填入 VITE_FIREBASE_* 
npm run dev
```

沒有 Firebase 時，開發模式可用「本機開發登入」（資料只在此瀏覽器記憶體，重新整理會清空）。正式多人共學請設定 Firebase 並部署 Functions。

## Gemini

金鑰設在 Cloud Functions 環境變數 `GEMINI_API_KEY`，不要加 `VITE_` 前綴。

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy
```

部署前在 `functions` 目錄執行 `npm install && npm run build`。

## 測試

```bash
npm test
```
