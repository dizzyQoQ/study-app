# 貓伴 V2 Project Context

## 狀態
Study App V1 已完成，目前進入貓伴 V2 開發準備。

## Repository
- GitHub: `study-app`
- 本機：`Desktop/mapp`
- `master`：V1
- `v2`：V2
- 技術：React / TypeScript / Firebase Auth / Firestore / Storage / Cloud Functions / Gemini

## 核心
共享學習目標、共同陪伴，但每個人擁有自己的學習路徑。

## AI
AI 是學習嚮導，不是監督者。用於目標理解、個人條件、拆解、個人化路線、重新規劃與回顧。普通學習操作不應每次呼叫 AI，以控制免費成本。

## 地圖
大目標 → 世界 → 區域 → 關卡 → 里程碑。
一個區域以一個階段性小目標為核心。關卡可由 AI 或使用者建立，使用者可修改、刪除。

## 學習
番茄鐘是專注工具，不是過關條件。可自訂時間。時間到未完成不算失敗。保留低壓啟動任務。

## 貓咪
每群一隻共同貓咪。完成學習目的取得貓糧；貓咪可成長、做動作、觸發事件、換服裝。共同小目標完成可取得雙倍貓糧/共同獎勵。

## 群組
可以看到今天誰學了什麼、完成什麼與進度。可以留言、按讚、分享心得、照片、PDF、筆記、提問。保留適度競爭但不以時數為唯一排名。

## 低壓
不做連續打卡懲罰。長時間未學習採溫和提醒，可重新安排、拆小或要求 AI 重規劃。

## AI 重規劃
已完成、使用者新增、使用者修改的節點保留；未完成且未修改的節點可調整。先預覽再套用。歷史成果與貓咪 XP 不清除。

## 技術方向
沿用 `groups/{groupId}/members/{uid}`。
V2 個人計畫使用：
`user_plans/{planId}`
`user_plans/{planId}/nodes/{nodeId}`
需要 planVersion、generatedAt、profileSnapshot。共享資料注意 transaction/increment，AI 輸出需受信任環境 schema validation。

## 目前工作
先讓 Claude 實際閱讀 V1 原始碼，盤點 `src/`、`functions/`、Firestore Rules、Storage Rules 與 Firebase 設定，再確認 V1 → V2 架構，最後開始 V2 實作。
