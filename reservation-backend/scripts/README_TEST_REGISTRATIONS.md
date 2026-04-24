# 測試報名資料生成腳本使用說明

## 概述

此腳本用於生成測試報名資料，用於測試後台管理功能（搜尋/篩選/分頁/審核/匯出/批量操作等）。

**重要**：所有測試資料都使用 `@example.com` 網域和 `[TEST]` 前綴標記，確保不影響正式資料。

## 檔案位置

- 腳本：`scripts/generate_test_registrations.js`
- 欄位對照表：`scripts/REGISTRATION_FIELDS_REFERENCE.md`

## 前置需求

### 1. 模板檔案

#### 證件照模板
腳本會使用 `scripts/template-id-photo.png` 作為證件照模板。

- 如果檔案不存在，腳本會跳過證件照生成（資料庫中 `idPhoto` 欄位為 null）
- 如果檔案存在，每筆測試資料都會複製此模板並重新命名為：`學號-姓名-證件照.png`
- 證件照檔案會儲存在 `uploads/english-test/id-photos/` 資料夾

#### B2 證書模板
腳本會使用 `scripts/template-b2-certificate.png` 作為 B2 證書模板。

- 如果檔案不存在，腳本會跳過 B2 證書生成（資料庫中 `b2CertificateFile` 欄位為 null）
- 如果檔案存在，僅為 `hasCEFRB2 = '是'` 的測試資料生成 B2 證書
- 每筆資料會隨機生成 1-3 個檔案（模擬多檔案上傳）
- 檔名格式：`學號-姓名(序號)-B2證書.png`（多檔案）或 `學號-姓名-B2證書.png`（單檔案）
- B2 證書檔案會儲存在 `uploads/english-test/certificates/` 資料夾

#### 障礙證明模板
腳本會使用以下檔案作為障礙證明模板：
- `scripts/template-disability-cert-front.png` - 障礙證明正面
- `scripts/template-disability-cert-back.png` - 障礙證明反面

- 如果檔案不存在，腳本會跳過障礙證明生成（資料庫中 `disabilityCertFront`、`disabilityCertBack` 欄位為 null）
- 如果檔案存在，僅為 `hasDisabilityCard = '是'` 的測試資料生成障礙證明
- 每筆資料會生成正面和反面兩個檔案
- 檔名格式：`學號-姓名-障礙證明正面.png` / `學號-姓名-障礙證明反面.png`
- 障礙證明檔案會儲存在 `uploads/english-test/disability-certs/` 資料夾

**注意**：模板檔案應為 PNG 或 JPG 格式，建議大小不超過 5MB。

### 2. 安裝依賴套件（可選）

腳本不強制需要 `@faker-js/faker`，但如果要使用更豐富的假資料生成，可以安裝：

```bash
# 在 reservation-backend 目錄下執行
npm install @faker-js/faker --save
```

### 3. 設定環境變數

確保 `.env` 檔案已正確設定資料庫連線：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=activity_reservation
```

## 使用方式

### 生成測試資料

#### Windows PowerShell

```powershell
# 生成預設 300 筆測試資料
cd f:\EEARS_backup_20251211\reservation-backend
node scripts\generate_test_registrations.js

# 生成指定數量（例如 500 筆）
node scripts\generate_test_registrations.js 500
```

#### Linux/Mac Bash

```bash
# 生成預設 300 筆測試資料
cd /path/to/reservation-backend
node scripts/generate_test_registrations.js

# 生成指定數量（例如 500 筆）
node scripts/generate_test_registrations.js 500
```

### 清除測試資料

#### Windows PowerShell

```powershell
cd f:\EEARS_backup_20251211\reservation-backend
node scripts\generate_test_registrations.js reset
```

#### Linux/Mac Bash

```bash
cd /path/to/reservation-backend
node scripts/generate_test_registrations.js reset
```

## 功能說明

### 生成模式

執行腳本時，會：

1. **檢查現有測試資料**：自動檢查是否已有測試資料（依 email 網域、姓名前綴、備註欄位識別）
2. **生成資料**：根據規格生成指定數量的測試報名資料
3. **批量寫入**：每批 50 筆，使用 transaction 確保資料一致性
4. **統計報告**：顯示生成結果和資料分佈統計

### Reset 模式

執行 `reset` 命令時，會：

1. **識別測試資料**：依 email 網域、姓名前綴、備註欄位識別
2. **批量刪除**：使用 transaction 安全刪除所有測試資料
3. **顯示結果**：顯示刪除的筆數

## 測試資料規格

### 資料分佈

- **報名狀態**：
  - 40% 待審核 (`pending`)
  - 45% 已通過 (`approved`)
  - 15% 已退回 (`rejected`)

- **報考項目**：
  - 平均分佈：`LRSW`（四項全考）、`LR`（聽讀）、`SW`（說寫）、`NON`（不報考）

- **CEFR B2 以上**：
  - 50% 有勾選「已達B2以上」
  - 50% 沒有（並生成偏低分數）

- **日期分佈**：
  - `createdAt` 分散在最近 10 天
  - 其中 20% 集中在最近 7 天

### 測試資料識別標記

所有測試資料都使用以下標記：

1. **Email 網域**：`@example.com`
2. **姓名前綴**：`[TEST]`
3. **備註欄位**：`"測試資料 - 由 generate_test_registrations.js 生成"`

### 資料特點

- ✅ 所有必填欄位都有值
- ✅ 學號格式正確（B/M/D/N/I/J + 9位數字）
- ✅ 身分證字號格式正確（1字母+9數字）
- ✅ 電話格式正確（09xxxxxxxx）
- ✅ 分數合理性（根據測驗類型和B2狀態）
- ✅ 學院/系所對應正確
- ✅ **包含證件照檔案**：每筆資料都會複製證件照模板並重新命名
- ✅ **包含 B2 證書檔案**：僅 `hasCEFRB2 = '是'` 的資料會生成 B2 證書（支援多檔案，1-3 個）
- ✅ **包含障礙證明檔案**：僅 `hasDisabilityCard = '是'` 的資料會生成障礙證明（正面和反面）

## 輸出範例

### 生成模式輸出

```
🚀 開始生成測試報名資料...

📊 目標數量：300 筆

📝 正在生成資料...
  ✅ 已生成 50/300 筆
  ✅ 已生成 100/300 筆
  ✅ 已生成 150/300 筆
  ✅ 已生成 200/300 筆
  ✅ 已生成 250/300 筆
  ✅ 已生成 300/300 筆

📸 正在生成證件照檔案...
  ✅ 已生成 50/300 筆證件照
  ✅ 已生成 100/300 筆證件照
  ✅ 已生成 150/300 筆證件照
  ✅ 已生成 200/300 筆證件照
  ✅ 已生成 250/300 筆證件照
  ✅ 已生成 300/300 筆證件照
  ✅ 證件照生成完成：300/300 筆

📜 正在生成 B2 證書檔案...
  ✅ 已生成 50/300 筆 B2 證書
  ✅ 已生成 100/300 筆 B2 證書
  ✅ 已生成 150/300 筆 B2 證書
  ✅ 已生成 200/300 筆 B2 證書
  ✅ 已生成 250/300 筆 B2 證書
  ✅ 已生成 300/300 筆 B2 證書
  ✅ B2 證書生成完成：150 筆（僅 hasCEFRB2 = '是' 的資料）

🪪 正在生成障礙證明檔案...
  ✅ 已生成 50/300 筆障礙證明
  ✅ 已生成 100/300 筆障礙證明
  ✅ 已生成 150/300 筆障礙證明
  ✅ 已生成 200/300 筆障礙證明
  ✅ 已生成 250/300 筆障礙證明
  ✅ 已生成 300/300 筆障礙證明
  ✅ 障礙證明生成完成：15 筆（僅 hasDisabilityCard = '是' 的資料）

💾 正在寫入資料庫...
  ✅ 已寫入 50/300 筆
  ✅ 已寫入 100/300 筆
  ✅ 已寫入 150/300 筆
  ✅ 已寫入 200/300 筆
  ✅ 已寫入 250/300 筆
  ✅ 已寫入 300/300 筆

============================================================
📊 生成結果統計
============================================================
✅ 成功：300 筆
❌ 失敗：0 筆
📝 總計：300 筆

📈 狀態分佈：
  待審核：120 筆 (40.0%)
  已通過：135 筆 (45.0%)
  已退回：45 筆 (15.0%)

📈 報考項目分佈：
  四項全考 (LRSW)：75 筆
  聽讀 (LR)：75 筆
  說寫 (SW)：75 筆
  不報考 (NON)：75 筆

📈 B2 以上分佈：
  是：150 筆 (50.0%)
  否：150 筆 (50.0%)

✅ 測試資料生成完成！
```

### Reset 模式輸出

```
🗑️  開始清除測試資料...

✅ 已清除 300 筆測試資料
✅ 已刪除 300 個證件照檔案
✅ 已刪除 450 個 B2 證書檔案
✅ 已刪除 30 個障礙證明檔案
```

## 錯誤處理

### 常見錯誤

1. **資料庫連線失敗**
   - 檢查 `.env` 設定
   - 確認 MySQL 服務是否運行

2. **套件未安裝**
   - 執行 `npm install @faker-js/faker --save`

3. **學號重複**
   - 腳本會自動重新生成學號
   - 若持續發生，可能是正式資料中有相同學號

4. **驗證錯誤**
   - 檢查欄位對照表（`REGISTRATION_FIELDS_REFERENCE.md`）
   - 確認資料格式是否符合要求

### Debug 模式

如果遇到資料驗證失敗，腳本會：

1. 嘗試逐筆寫入以找出問題資料
2. 顯示失敗資料的 `studentId`、`name` 和錯誤訊息
3. 提供最小可重現資料供 debug

## 注意事項

1. ⚠️ **不要直接修改正式資料**：腳本只會生成/刪除測試資料（依標記識別）
2. ⚠️ **備份資料庫**：執行前建議備份資料庫
3. ⚠️ **測試環境優先**：建議在測試環境執行
4. ✅ **可重複執行**：可以多次執行生成，不會重複建立（學號唯一約束）
5. ✅ **安全刪除**：reset 模式會刪除測試資料和對應的證件照、B2 證書、障礙證明檔案，不會影響正式資料
6. 📸 **證件照檔案**：每筆測試資料都會生成對應的證件照檔案，檔名格式為 `學號-姓名-證件照.png`
7. 📜 **B2 證書檔案**：僅 `hasCEFRB2 = '是'` 的測試資料會生成 B2 證書，支援多檔案（1-3 個），檔名格式為 `學號-姓名(序號)-B2證書.png`
8. 🪪 **障礙證明檔案**：僅 `hasDisabilityCard = '是'` 的測試資料會生成障礙證明，包含正面和反面兩個檔案，檔名格式為 `學號-姓名-障礙證明正面.png` / `學號-姓名-障礙證明反面.png`

## 調整筆數

### 方法 1：命令列參數

```bash
# 生成 500 筆
node scripts/generate_test_registrations.js 500

# 生成 1000 筆
node scripts/generate_test_registrations.js 1000
```

### 方法 2：修改腳本預設值

編輯 `scripts/generate_test_registrations.js`，修改：

```javascript
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'reset') {
    await resetTestRegistrations();
  } else {
    const count = parseInt(args[0]) || 300; // 修改預設值
    await generateTestRegistrations(count);
  }
  // ...
}
```

## 相關文件

- [欄位對照表](./REGISTRATION_FIELDS_REFERENCE.md)
- [Model 定義](../models/EnglishTestRegistration.js)
- [API 路由](../routes/englishTestRegistrationRouter.js)

## 支援

如有問題，請檢查：

1. 資料庫連線設定
2. 套件是否正確安裝
3. 欄位對照表是否符合實際資料庫結構
4. 錯誤訊息中的詳細資訊
