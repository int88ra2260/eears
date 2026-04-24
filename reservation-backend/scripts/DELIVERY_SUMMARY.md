# 測試報名資料生成腳本 - 交付總結

## 📋 交付內容

### 1. 主要腳本檔案

**檔案**：`scripts/generate_test_registrations.js`

**功能**：
- 生成指定數量的測試報名資料（預設 300 筆）
- 支援 reset 模式清除所有測試資料
- 自動統計資料分佈
- 使用 transaction 確保資料一致性
- 完整的錯誤處理和 debug 資訊

### 2. 文件檔案

#### a) 欄位對照表
**檔案**：`scripts/REGISTRATION_FIELDS_REFERENCE.md`

**內容**：
- 完整的欄位對照表（欄位名、型別、必填、說明、範例值、生成規則）
- 測試資料識別標記說明
- 資料分佈規格
- 唯一性約束說明
- 注意事項

#### b) 使用說明
**檔案**：`scripts/README_TEST_REGISTRATIONS.md`

**內容**：
- 前置需求（套件安裝、環境變數設定）
- 使用方式（Windows PowerShell + Linux Bash）
- 功能說明（生成模式、Reset 模式）
- 測試資料規格
- 輸出範例
- 錯誤處理
- 注意事項
- 調整筆數方法

## 📦 依賴套件

需要安裝：
```bash
npm install @faker-js/faker --save
```

## 🚀 快速開始

### 1. 安裝依賴

```bash
cd reservation-backend
npm install @faker-js/faker --save
```

### 2. 生成測試資料

**Windows PowerShell**:
```powershell
node scripts\generate_test_registrations.js
```

**Linux/Mac Bash**:
```bash
node scripts/generate_test_registrations.js
```

### 3. 清除測試資料

**Windows PowerShell**:
```powershell
node scripts\generate_test_registrations.js reset
```

**Linux/Mac Bash**:
```bash
node scripts/generate_test_registrations.js reset
```

## ✅ 功能特點

### 資料生成規格

1. **報名狀態分佈**：
   - 40% 待審核 (`pending`)
   - 45% 已通過 (`approved`)
   - 15% 已退回 (`rejected`)

2. **報考項目**：
   - 平均分佈：`LRSW`（四項全考）、`LR`（聽讀）、`SW`（說寫）、`NON`（不報考）

3. **CEFR B2 以上**：
   - 50% 有勾選「已達B2以上」
   - 50% 沒有（並生成偏低分數）

4. **分數合理性**：
   - 根據測驗類型（TOEIC/TOEFL/IELTS）生成合理分數
   - 達B2：高分區間
   - 未達B2：低分區間

5. **日期分佈**：
   - `createdAt` 分散在最近 10 天
   - 其中 20% 集中在最近 7 天

6. **學院/系所**：
   - 8 個學院平均分佈
   - 科系依學院對應

### 安全特性

1. **測試資料標記**：
   - Email 使用 `@example.com` 網域
   - 姓名使用 `[TEST]` 前綴
   - 備註欄位標記測試資料來源

2. **不影響正式資料**：
   - Reset 模式只刪除測試資料（依標記識別）
   - 生成時檢查學號唯一性，避免衝突

3. **Transaction 保護**：
   - 所有資料庫操作使用 transaction
   - 發生錯誤時自動回滾

## 📊 輸出範例

執行腳本後會顯示：

1. **生成進度**：每 50 筆顯示一次進度
2. **寫入進度**：每批 50 筆顯示寫入進度
3. **統計報告**：
   - 成功/失敗筆數
   - 狀態分佈（待審核/已通過/已退回）
   - 報考項目分佈
   - B2 以上分佈

## 🔧 技術細節

### 資料庫操作

- 使用 Sequelize ORM
- 批量寫入（每批 50 筆）
- Transaction 確保原子性
- 自動處理唯一性約束錯誤

### 錯誤處理

- 批量寫入失敗時，自動切換為逐筆寫入
- 顯示失敗資料的詳細資訊（studentId, name, error）
- 提供最小可重現資料供 debug

### 資料驗證

- 所有必填欄位都有值
- 格式驗證（學號、身分證字號、電話）
- 分數合理性（根據測驗類型和B2狀態）
- 學院/系所對應正確

## 📝 注意事項

1. ⚠️ **環境變數**：確保 `.env` 檔案已正確設定資料庫連線
2. ⚠️ **套件安裝**：需要先安裝 `@faker-js/faker`
3. ⚠️ **測試環境**：建議在測試環境執行
4. ✅ **可重複執行**：可以多次執行生成，不會重複建立
5. ✅ **安全刪除**：reset 模式只會刪除測試資料

## 📚 相關文件

- [欄位對照表](./REGISTRATION_FIELDS_REFERENCE.md)
- [使用說明](./README_TEST_REGISTRATIONS.md)
- [Model 定義](../models/EnglishTestRegistration.js)
- [API 路由](../routes/englishTestRegistrationRouter.js)

## 🎯 使用情境

此腳本適用於：

1. **後台功能測試**：
   - 搜尋功能
   - 篩選功能（狀態、報考項目、日期範圍等）
   - 分頁功能
   - 排序功能

2. **審核流程測試**：
   - 單筆審核
   - 批量審核
   - 拒絕原因設定

3. **匯出功能測試**：
   - Excel 匯出
   - 證件照 ZIP 匯出

4. **批量操作測試**：
   - 批量更新狀態
   - 批量刪除

5. **效能測試**：
   - 大量資料的查詢效能
   - 分頁效能
   - 匯出效能

## ✨ 後續優化建議

1. **支援更多測試情境**：
   - 支援自訂資料分佈比例
   - 支援指定特定狀態/報考項目的數量

2. **檔案上傳測試**：
   - 生成測試用證件照檔案
   - 生成測試用 B2 證書檔案

3. **進階功能**：
   - 支援匯入 CSV/Excel 生成資料
   - 支援從範本生成資料

## 📞 問題回報

如遇到問題，請檢查：

1. 資料庫連線設定（`.env`）
2. 套件是否正確安裝
3. 欄位對照表是否符合實際資料庫結構
4. 錯誤訊息中的詳細資訊

---

**建立日期**：2025-01-23  
**版本**：1.0.0  
**維護者**：EEARS 開發團隊
