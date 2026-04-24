# 培力英檢報名管理頁面 - 快速開始指南

## 🚀 啟用新功能（3 步驟）

### 步驟 1：確認後端服務運行
```bash
cd reservation-backend
npm start
```

### 步驟 2：確認前端服務運行
```bash
cd reservation-frontend
npm start
```

### 步驟 3：啟用 Feature Flags

**方法 A：透過 API（推薦，立即生效）**

```bash
# 啟用增強 UI
curl -X PUT http://localhost:3000/api/admin/feature-flags/ENGLISH_TEST_ENHANCED_UI \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'

# 啟用批量操作
curl -X PUT http://localhost:3000/api/admin/feature-flags/ENGLISH_TEST_BULK_OPERATIONS \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'
```

**方法 B：透過管理介面**

1. 登入後台管理系統
2. 前往「設定」或「Feature Flags」頁面
3. 找到 `ENGLISH_TEST_ENHANCED_UI` 和 `ENGLISH_TEST_BULK_OPERATIONS`
4. 將兩者設為「啟用」

**方法 C：透過環境變數（需要重啟）**

```bash
# .env
FEATURE_ENGLISH_TEST_ENHANCED_UI=true
FEATURE_ENGLISH_TEST_BULK_OPERATIONS=true
```

---

## ✨ 新功能使用說明

### 1. 高級篩選

**位置**：報名列表上方

**功能**：
- 📅 **日期範圍**：選擇報名日期範圍
- 📝 **測驗類型**：可複選（聽讀/說寫/四項全考/不報考）
- 👤 **特殊身分**：中低收入戶、身心障礙
- 🔍 **搜尋高亮**：關鍵字自動高亮顯示
- 📊 **結果數量**：顯示符合條件的記錄數

**使用方式**：
1. 選擇日期範圍
2. 勾選測驗類型（可多選）
3. 選擇特殊身分
4. 輸入搜尋關鍵字
5. 系統自動套用篩選

---

### 2. 增強型表格

**功能**：

#### 欄位自訂
- 點擊右上角「顯示欄位」按鈕
- 勾選要顯示的欄位
- 拖曳調整欄位順序
- 設定會自動儲存

#### 排序功能
- 點擊欄位標題即可排序
- 再次點擊切換升序/降序
- 按住 Ctrl/Cmd 可多欄位排序
- 預設：報名時間最新優先

#### 響應式設計
- **桌面**：完整表格顯示
- **手機**：自動切換為卡片式佈局
- 證件照縮圖直接顯示在列表中

#### 批量選擇
- 勾選表格第一列的選擇框可全選
- 勾選個別行可單選
- 選擇後會顯示批量操作工具列

---

### 3. 批量操作

**觸發條件**：選擇至少一筆記錄

**可用操作**：
- ✅ **批量通過**：一次通過多筆記錄
- ❌ **批量拒絕**：需選擇拒絕原因
- ⏰ **批量待審核**：設為待審核狀態
- 🗑️ **批量刪除**：帶確認提示

**使用方式**：
1. 勾選要操作的記錄
2. 點擊批量操作按鈕
3. 確認操作

---

### 4. 詳細資料檢視

**桌面版**：
- 使用 **Tabs** 分頁：
  - 基本資料
  - 學籍資訊
  - 特殊身分
  - 檔案附件

**手機版**：
- 使用 **Accordion**（可摺疊區塊）
- 點擊標題展開/收起

**證件照功能**：
- 🔍 **放大鏡**：滑鼠懸停顯示放大效果
- 📏 **尺寸比對**：自動檢查是否符合標準尺寸
- 🔎 **拖曳放大**：調整縮放級別
- 🖼️ **全螢幕檢視**：點擊按鈕全螢幕查看

**導航功能**：
- 使用左右箭頭按鈕切換上一筆/下一筆
- 僅在當前列表範圍內導航

---

### 5. 快速審核模式

**位置**：頁面右上角「快速審核模式」按鈕

**功能**：
- 📸 大圖顯示證件照
- 📋 關鍵資訊突出顯示
- ✅ 一鍵通過
- ❌ 一鍵拒絕（需選擇原因）
- ➡️ 自動跳轉下一筆待審核項目

**使用方式**：
1. 點擊「快速審核模式」按鈕
2. 檢視證件照和關鍵資訊
3. 點擊「通過」或「拒絕」
4. 系統自動跳轉下一筆

**資料完整性檢查**：
- 自動檢查必填欄位
- 顯示缺少的資料項目
- 提醒需要補件的項目

---

### 6. 統計視覺化

**功能**：
- 📊 **統計卡片**：點擊自動套用對應篩選
- 📈 **進度條**：顯示審核進度百分比
- 📅 **今日新增**：顯示今日新增的報名數
- 🎯 **狀態分布**：視覺化各狀態數量

**使用方式**：
- 點擊統計卡片自動套用篩選
- 查看審核進度條了解整體進度

---

## 🔄 回滾方式

### 立即回滾（推薦）

```bash
# 關閉增強 UI
curl -X PUT http://localhost:3000/api/admin/feature-flags/ENGLISH_TEST_ENHANCED_UI \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": false}'

# 關閉批量操作
curl -X PUT http://localhost:3000/api/admin/feature-flags/ENGLISH_TEST_BULK_OPERATIONS \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": false}'
```

**效果**：立即切換回舊版 UI，所有舊功能正常運作。

---

## 📋 功能檢查清單

### 基本功能
- [ ] 舊版功能正常運作（Feature Flag 關閉時）
- [ ] 新版功能正常運作（Feature Flag 啟用時）
- [ ] Feature Flag 開關測試

### 篩選功能
- [ ] 日期範圍篩選
- [ ] 測驗類型篩選（可複選）
- [ ] 特殊身分篩選
- [ ] 搜尋結果高亮
- [ ] 搜尋結果數量顯示

### 表格功能
- [ ] 欄位自訂
- [ ] 欄位排序
- [ ] 證件照縮圖顯示
- [ ] 響應式設計（桌面/手機）

### 批量操作
- [ ] 全選/取消全選
- [ ] 批量通過
- [ ] 批量拒絕
- [ ] 批量刪除

### 詳細資料
- [ ] Tabs 分頁（桌面）
- [ ] Accordion 摺疊（手機）
- [ ] 證件照放大鏡
- [ ] 照片尺寸比對
- [ ] 導航功能

### 其他功能
- [ ] 快速審核模式
- [ ] 統計視覺化
- [ ] 資料完整性檢查

---

## 🐛 常見問題

### Q1: 新功能沒有顯示？
**A**: 檢查 Feature Flags 是否已啟用
```bash
GET /api/admin/feature-flags
```

### Q2: 批量操作失敗？
**A**: 確認已啟用 `ENGLISH_TEST_BULK_OPERATIONS` Feature Flag

### Q3: 手機版顯示異常？
**A**: 確認 `useMediaQuery` Hook 正常運作，檢查瀏覽器寬度是否 < 768px

### Q4: 如何重置欄位顯示設定？
**A**: 清除瀏覽器 localStorage 中的 `englishTestTableColumns` 鍵值

---

## 📞 技術支援

如有問題，請檢查：
1. 瀏覽器控制台錯誤訊息
2. 後端日誌
3. Feature Flags 狀態
4. API 回應格式

---

**最後更新**：2024-12-11
