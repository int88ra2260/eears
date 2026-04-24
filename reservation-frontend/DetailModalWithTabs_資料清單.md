# DetailModalWithTabs.js 目前顯示的資料清單

## 標題列顯示資訊
- **報名者姓名**：`registration.name`
- **狀態徽章**：`registration.status`（審核中/已通過/請修正/報名成功/報名失敗）
- **報名成功序號**：`registration.successSequence`（僅當 status === 'success' 時顯示）
- **當前序位標籤**：`positionLabel`（顯示當前篩選下的序位）

---

## Tab 1：基本資料

### 顯示欄位
1. **學號**：`registration.studentId`
2. **姓名**：`registration.name`
3. **Email**：`registration.email`
4. **電話**：`registration.phone`
5. **出生日期**：`registration.birthDate`
6. **英文姓名**：`registration.lastNameEn` + `registration.firstNameEn`（組合顯示）
7. **地址**：`registration.postalCode` + `registration.city` + `registration.district` + `registration.address`（組合顯示）
8. **資訊來源**：`registration.infoSource`

---

## Tab 2：學籍資訊

### 顯示欄位
1. **學院**：`registration.college`
2. **科系**：`registration.department`
3. **年級**：`registration.grade`
4. **就讀身分**：`registration.degreeLevel`
5. **報考項目**：`registration.examType`
   - 顯示轉換：
     - `'LRSW'` → '四項全考'
     - `'LR'` → '聽讀'
     - `'SW'` → '說寫'
     - `'NON'` → '不報考'
     - 其他 → 原值或 '未填寫'
6. **是否曾報考 BESTEP**：`registration.hasTakenBESTEP`
7. **是否取得 CEFR B2**：`registration.hasCEFRB2`

### 條件顯示（當 `hasCEFRB2 === '是'` 時）
8. **已通過測驗種類**：`registration.passedExamTypes`（陣列，以逗號分隔顯示）
9. **B2 項目**：`registration.b2SkillType`

---

## Tab 3：特殊身分

### 顯示欄位
1. **中低收入戶**：`registration.isLowIncome`
2. **身心障礙手冊**：`registration.hasDisabilityCard`

### 條件顯示（當 `hasDisabilityCard === '是'` 時）
3. **身心障礙類別**：`registration.disabilityTypes`（陣列，以逗號分隔顯示）
4. **考試協助項目**：`registration.examAssistanceOptions`（陣列，以逗號分隔顯示）

---

## Tab 4：檔案附件

### 顯示檔案
1. **證件照**：`registration.idPhoto`
   - 使用 `PhotoViewer` 組件顯示圖片預覽

2. **B2 成績證明**：`registration.b2CertificateFile`
   - 支援單一檔案或多檔案（JSON 陣列格式）
   - 顯示為下載連結按鈕
   - 多檔案時顯示序號 `(1)`, `(2)` 等

3. **身心障礙證明**：
   - **正面**：`registration.disabilityCertFront`
   - **反面**：`registration.disabilityCertBack`
   - 顯示為下載連結按鈕

---

## 頁尾操作按鈕

### 顯示條件與功能
1. **設為報名成功按鈕**：
   - 僅當 `status === 'approved'` 且 `onQuickStatusUpdate` 存在時顯示
   - 點擊後將狀態更新為 'success'

2. **關閉按鈕**：關閉模態框

---

## 導航功能

### 桌面版專屬
- **上一筆按鈕**：`canNavigatePrevious` 為 true 時顯示
- **下一筆按鈕**：`canNavigateNext` 為 true 時顯示
- **序號調整按鈕**：僅當 `status === 'success'` 且 `onAdjustSequence` 存在時顯示
  - 上移一位
  - 下移一位

---

## 顯示版本差異

### 桌面版（Tabs 版本）
- 使用 Tab 導航切換不同區塊
- 支援上一筆/下一筆導航按鈕
- 支援序號調整功能

### 手機版（Accordion 版本）
- 使用 Accordion 可摺疊區塊
- 預設展開「基本資料」區塊
- 其他區塊預設摺疊
- 不顯示上一筆/下一筆導航按鈕
- 不顯示「設為報名成功」按鈕

---

## 注意事項

1. **陣列欄位處理**：
   - `passedExamTypes`、`disabilityTypes`、`examAssistanceOptions` 會檢查是否為陣列，並以逗號分隔顯示
   - `b2CertificateFile` 會嘗試解析 JSON，支援單一檔案或多檔案格式

2. **條件顯示**：
   - 部分欄位僅在特定條件下顯示（如 `hasCEFRB2 === '是'` 或 `hasDisabilityCard === '是'`）

3. **空值處理**：
   - 陣列欄位為空時顯示「無」
   - `b2SkillType` 為空時顯示「無」

4. **檔案路徑**：
   - B2 成績證明和身心障礙證明檔案路徑為 `/uploads/${filename}`
