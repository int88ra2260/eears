# 培力英檢相關頁面 — 卡片內容與對應顏色整理

本文整理「培力英檢報名管理」與「步驟三表單」內各卡片的用途、內容及使用的顏色（Bootstrap 類名或自訂色碼），便於維護與風格一致。

---

## 一、培力英檢管理頁（EnglishTestManagement + StatsVisualization）

### 1. 統計卡片（StatsVisualization.js）

| 卡片名稱 | 內容 | 邊框 / 主色 | 備註 |
|----------|------|-------------|------|
| **總報名人數** | 標題、總數、可選「今日新增 N」 | **藍色** `#0d6efd` | 點擊切換至「全部」篩選 |
| **審核中** | 標題、待審筆數、小進度條 | **黃色** `#ffc107`，背景高亮 `#fff9e6` | 當前標籤時 border-2 + shadow |
| **已通過** | 標題、筆數、小進度條 | **水藍色** `#0dcaf0` | 點擊切換至「已通過」篩選 |
| **請修正** | 標題、筆數、小進度條 | **紫色** `#6f42c1` | 點擊切換至「請修正」篩選 |
| **報名成功** | 標題、筆數、小進度條 | **綠色** `#198754` | 點擊切換至「報名成功」篩選 |
| **報名失敗** | 標題、筆數、小進度條 | **紅色** `#dc3545` | 點擊切換至「報名失敗」篩選 |
| **不報考** | 標題、筆數 | **黑色** `#212529` | 點擊篩選測驗類型 NON |
| **報名聽讀** | 標題、筆數 | **白色** 底 `#fff`、邊框 `#dee2e6`、文字 `#212529` | 點擊篩選測驗類型 LR |
| **報名說寫** | 標題、筆數 | **白色** 底 `#fff`、邊框 `#dee2e6`、文字 `#212529` | 點擊篩選測驗類型 SW |
| **審核進度** | 標題「審核進度」、百分比 badge、長進度條、說明文字 | 一般 `card`（預設白底） | badge：`bg-success`(100%) / `bg-warning`(0%) / `bg-primary`(其他)；進度條同色 | 僅在有意義時顯示（總數>0 等） |
| **無資料提示** | 圖示 + 「目前沒有符合篩選條件的資料」 | `alert alert-info` | Bootstrap info（淺藍） | 總數為 0 且無進度條時顯示 |

**個人報名頁統計卡片顏色（StatsVisualization）：**

- **總報名人數**：藍色 `#0d6efd`
- **審核中**：黃色 `#ffc107`
- **已通過**：水藍色 `#0dcaf0`
- **請修正**：紫色 `#6f42c1`
- **報名成功**：綠色 `#198754`
- **報名失敗**：紅色 `#dc3545`
- **不報考**：黑色 `#212529`
- **報名聽讀 / 報名說寫**：白色底、淺灰邊框 `#dee2e6`、深色文字 `#212529`

---

### 2. 其他區塊卡片（EnglishTestManagement.js）

| 區塊 | 內容 | 樣式 / 顏色 |
|------|------|-------------|
| **團體報名佔位** | 文案「團體報名功能尚未建設，敬請期待。」 | `card` + `card-body text-center py-5 text-muted` |
| **報名按鈕開關** | 說明「首頁『培力英檢報名』按鈕顯示」+ 開關 + 「已啟用/已停用」 | `card border-light`，內文 `text-muted small` |
| **載入骨架** | spinner + 「載入報名列表中...」+ 多列 placeholder | `card`，spinner `text-primary`，說明 `text-muted small` |
| **空表格** | 圖示、說明、按鈕「清除篩選條件」 | `card border-light`，圖示與文字 `text-muted`，按鈕 `btn-outline-primary` |
| **進階篩選** | 由 AdvancedFilterPanel 提供，可摺疊 | 見 AdvancedFilterPanel |
| **批量操作工具列** | 已選筆數 + 批量通過/請修正/審核中/報名成功/刪除 | `card border-primary shadow-sm`，內文 `bg-light`、主色 `text-primary` |

---

### 3. Modal / 警示

| 用途 | 內容 | 顏色 / 樣式 |
|------|------|-------------|
| 詳情 Modal 標題列 | 報名詳細資料、序位 badge、狀態 badge、關閉鈕 | `modal-header bg-primary text-white`；狀態 badge 依狀態用 `bg-warning/success/danger/secondary` |
| 拒絕原因 Modal 標題 | 選擇拒絕原因（可複選） | `modal-header bg-danger text-white` |
| 拒絕原因內警示 | 「切換至『請修正』狀態時，必須至少選擇一個拒絕原因」 | `alert alert-warning` |

---

## 二、步驟三表單（EnglishTestStep3Form.js）— 英語能力與培力資格

此頁為表單區塊，非獨立「卡片」元件，以下依區塊與用途整理顏色。

### 1. 區塊標題

| 區塊 | 內容 | 顏色 / 樣式 |
|------|------|-------------|
| 大標「英語能力與培力資格相關」 | 標題文字 | 自訂：`color: #FF6B6B`、`borderBottom: 2px solid #FF6B6B`、`paddingBottom: 0.5rem` |

### 2. 表單欄位與錯誤

| 用途 | 內容 | 顏色 / 樣式 |
|------|------|-------------|
| 必填星號 | 紅色 `*` | `color: red` 或 `style={{ color: 'red' }}` |
| 不報考（NON）選項標籤 | 提醒影響課堂成績 | 自訂：`color: #dc3545`、`fontWeight: 'bold'`（與 danger 一致） |
| 欄位錯誤外框 | 整塊輸入區錯誤時 | `border: 3px solid #dc3545`、`backgroundColor: #fff5f5`、`borderRadius: 5px` |
| 錯誤訊息區塊 | 「⚠️ + 錯誤文案」 | `text-danger`、`backgroundColor: #f8d7da`、`border: 1px solid #f5c6cb`、`fontWeight: bold` |
| B2 未達標提示 | 「此成績未達B2，若是這學期有修習英文課將無法獲得課堂成績5%」 | `text-danger`、`fontSize: 0.9rem` |
| 輔助說明 / 已選檔案列表 | 格式說明、已選擇檔案數與檔名 | `text-muted`、`small` |

### 3. 警示與按鈕

| 用途 | 內容 | 顏色 / 樣式 |
|------|------|-------------|
| 選擇不報考時警示 | 「您選擇不報考，若本學期有修習英文課程…」 | `alert alert-warning`（黃底） |
| 取消按鈕 | 「取消」 | `btn btn-secondary`（灰） |
| 下一步 / 送出 / 結束報名按鈕 | 主要送出按鈕 | `btn btn-primary`，自訂：`backgroundColor: '#FF6B6B'`、`borderColor: '#FF6B6B'`（品牌紅） |

### 4. 錯誤動畫

- 輸入框錯誤時：`getErrorStyle()` 套用 `border: 3px solid #dc3545`、`backgroundColor: #fff5f5`、`boxShadow`、`animation: errorPulse`（與 Bootstrap danger 一致）。

---

## 三、顏色對照表（快速查詢）

| 語意 | Bootstrap 類名 | 常用色碼（自訂處） |
|------|----------------|---------------------|
| 主色 / 連結 | `primary` | — |
| 成功 / 通過 | `success` | — |
| 審核中 / 注意 | `warning` | — |
| 錯誤 / 請修正 / 危險 | `danger` | `#dc3545`、`#f8d7da`、`#f5c6cb`、`#fff5f5` |
| 中性 / 報名失敗 / 不報考 | `secondary` | — |
| 資訊 / 聽讀說寫 | `info` | — |
| 輔助說明 | `text-muted` | — |
| 品牌主色（步驟三標題與按鈕） | — | `#FF6B6B` |

---

## 四、建議維護原則

1. **統計卡片**：狀態語意固定（審核中=warning、已通過/報名成功=success、請修正=danger、報名失敗/不報考=secondary、聽讀說寫=info），新增狀態時請對應到既有語意或在此表補一列。
2. **表單錯誤**：步驟三表單錯誤樣式已與 Bootstrap danger 對齊（`#dc3545`、`#f8d7da` 等），新表單可沿用相同變數或類名。
3. **品牌色**：步驟三標題與主要送出按鈕使用 `#FF6B6B`，若全站統一品牌色請集中改此處與樣式變數。

若新增卡片或區塊，建議在本文件對應章節補上「內容 + 對應顏色」一列，以利日後一致調整。
