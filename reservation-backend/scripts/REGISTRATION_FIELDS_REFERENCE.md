# 英文測驗報名資料欄位對照表

## 資料表名稱
`english_test_registrations`

## 欄位對照表

| 欄位名稱 | 型別 | 必填 | 說明 | 範例值 | 生成規則 |
|---------|------|------|------|--------|---------|
| `id` | INTEGER | 自動 | 主鍵 | 1 | 自動遞增 |
| `studentId` | VARCHAR(50) | ✅ | 學號（唯一） | B123456789 | B/M/D/N/I/J + 9位數字 |
| `name` | VARCHAR(50) | ✅ | 中文姓名 | [TEST]王小明 | [TEST]前綴 + 中文姓名 |
| `idNumber` | VARCHAR(10) | ✅ | 身分證字號 | A123456789 | 台灣身分證格式（1字母+9數字） |
| `email` | VARCHAR(100) | ✅ | 電子郵件 | test1_1234567890_abc@example.com | test{index}_{timestamp}_{random}@example.com |
| `studentNameZh` | VARCHAR(50) | ✅ | 中文姓名（同name） | [TEST]王小明 | 同 name |
| `lastNameEn` | VARCHAR(50) | ✅ | 英文拼音姓 | WANG | 大寫英文姓氏 |
| `firstNameEn` | VARCHAR(50) | ✅ | 英文拼音名 | MING | 大寫英文名字 |
| `birthDate` | DATEONLY | ⚠️ | 出生年月日 | 2000-05-15 | 18-25歲隨機日期 |
| `examType` | VARCHAR(10) | ❌ | 報考項目 | LRSW, LR, SW, NON | 平均分佈 |
| `hasTakenBESTEP` | VARCHAR(10) | ❌ | 是否曾報考 BESTEP | 是/否 | 30% 是 |
| `hasCEFRB2` | VARCHAR(10) | ✅ | 是否曾取得 CEFR B2 以上 | 是/否 | 50% 是 |
| `passedExamTypes` | JSON | ❌ | 已通過的測驗種類 | ["TOEIC", "TOEFL"] | 若 hasB2=是，則有值 |
| `passedExamOther` | VARCHAR(100) | ❌ | 其他測驗種類 | null | 通常為 null |
| `b2CertificateFile` | TEXT | ❌ | B2 成績證明檔案路徑 | null | 測試資料為 null |
| `b2SkillType` | VARCHAR(50) | ❌ | 通過 B2 的項目（舊版） | null | 通常為 null |
| `listeningExamType` | VARCHAR(100) | ❌ | 聽力測驗類別 | TOEIC, TOEFL, IELTS, 其他 | 若報考聽讀則有值 |
| `listeningScore` | VARCHAR(50) | ❌ | 聽力成績 | 850 | 根據測驗類型和B2狀態生成 |
| `readingExamType` | VARCHAR(100) | ❌ | 閱讀測驗類別 | TOEIC, TOEFL, IELTS, 其他 | 若報考聽讀則有值 |
| `readingScore` | VARCHAR(50) | ❌ | 閱讀成績 | 820 | 根據測驗類型和B2狀態生成 |
| `speakingExamType` | VARCHAR(100) | ❌ | 口說測驗類別 | TOEIC, TOEFL, IELTS, 其他 | 若報考說寫則有值 |
| `speakingScore` | VARCHAR(50) | ❌ | 口說成績 | 180 | 根據測驗類型和B2狀態生成 |
| `writingExamType` | VARCHAR(100) | ❌ | 寫作測驗類別 | TOEIC, TOEFL, IELTS, 其他 | 若報考說寫則有值 |
| `writingScore` | VARCHAR(50) | ❌ | 寫作成績 | 160 | 根據測驗類型和B2狀態生成 |
| `nationalId` | VARCHAR(10) | ✅ | 身分證字號（同idNumber） | A123456789 | 同 idNumber |
| `phone` | VARCHAR(20) | ✅ | 行動電話 | 0912345678 | 09 + 8位數字 |
| `postalCode` | VARCHAR(10) | ✅ | 郵遞區號 | 804 | 3位數字 |
| `city` | VARCHAR(50) | ✅ | 縣市 | 高雄市 | 台灣縣市 |
| `district` | VARCHAR(50) | ✅ | 行政區 | 鼓山區 | 台灣行政區 |
| `address` | VARCHAR(200) | ✅ | 詳細地址 | 中山路123號 | 台灣地址格式 |
| `degreeLevel` | VARCHAR(20) | ✅ | 就讀身分 | 學士班, 碩士班, 博士班 | 平均分佈 |
| `grade` | VARCHAR(20) | ✅ | 年級 | 一年級, 二年級, 三年級, 四年級以上 | 平均分佈 |
| `college` | VARCHAR(50) | ✅ | 學院 | 文學院, 理學院, 工學院... | 8個學院平均分佈 |
| `department` | VARCHAR(100) | ✅ | 科系 | 資訊工程學系（Bachelor/Master/Ph.D.） | 依學院對應科系 |
| `isLowIncome` | VARCHAR(10) | ✅ | 是否為中低收入戶 | 是/否 | 10% 是 |
| `hasDisabilityCard` | VARCHAR(10) | ✅ | 是否有身心障礙手冊 | 是/否 | 5% 是 |
| `disabilityTypes` | JSON | ❌ | 身心障礙類別 | null | 測試資料為 null |
| `disabilityCertFront` | VARCHAR(255) | ❌ | 身心障礙證明正面檔案 | null | 測試資料為 null |
| `disabilityCertBack` | VARCHAR(255) | ❌ | 身心障礙證明反面檔案 | null | 測試資料為 null |
| `examAssistanceOptions` | JSON | ❌ | 需要的考試協助項目 | null | 測試資料為 null |
| `examAssistanceOther` | TEXT | ❌ | 考試協助項目「其他」說明 | null | 測試資料為 null |
| `idPhoto` | VARCHAR(255) | ❌ | 證件照檔案路徑 | null | 測試資料為 null |
| `agreedToTerms` | BOOLEAN | ✅ | 個資與報名規範同意 | true | 測試資料固定為 true |
| `infoSource` | VARCHAR(50) | ✅ | 從何得知培力英檢 | 學校官網, 同學推薦... | 平均分佈 |
| `status` | VARCHAR(20) | ✅ | 報名狀態 | pending, approved, rejected | 40% pending, 45% approved, 15% rejected |
| `notes` | TEXT | ❌ | 備註 | "測試資料 - 由 generate_test_registrations.js 生成" | 固定標記 |
| `rejectionReasons` | JSON | ❌ | 拒絕原因（陣列） | ["資料不完整"] | 僅 rejected 狀態有值 |
| `rejectionOther` | TEXT | ❌ | 拒絕原因「其他」說明 | null | 若選擇「其他」則有值 |
| `approvedAt` | DATETIME | ❌ | 被標記為「已通過」的時間 | 2025-01-20 10:30:00 | 僅 approved 狀態有值 |
| `approvedSequence` | INTEGER | ❌ | 已通過的順序編號 | 1, 2, 3... | 僅 approved 狀態有值 |
| `createdAt` | DATETIME | ✅ | 建立時間 | 2025-01-15 14:30:00 | 最近10天，20%集中在最近7天 |
| `updatedAt` | DATETIME | ✅ | 更新時間 | 2025-01-15 14:30:00 | 同 createdAt |

## 測試資料識別標記

所有測試資料都使用以下標記，確保不影響正式資料：

1. **Email 網域**：`@example.com`
2. **姓名前綴**：`[TEST]`
3. **備註欄位**：`"測試資料 - 由 generate_test_registrations.js 生成"`

## 資料分佈規格

### 報名狀態
- 40% 待審核 (`pending`)
- 45% 已通過 (`approved`)
- 15% 已退回 (`rejected`)

### 報考項目
- 平均分佈：`LRSW`（四項全考）、`LR`（聽讀）、`SW`（說寫）、`NON`（不報考）

### CEFR B2 以上
- 50% 有勾選「已達B2以上」
- 50% 沒有（並生成偏低分數）

### 分數合理性
- **TOEIC LR**：0-990（達B2: 800-990，未達B2: 200-600）
- **TOEIC SW**：0-400（達B2: 300-400，未達B2: 100-200）
- **TOEFL**：0-120（達B2: 80-110，未達B2: 30-80）
- **IELTS**：0-9（達B2: 6.0-8.0，未達B2: 3.0-6.0）

### 日期分佈
- `createdAt` 分散在最近 10 天
- 其中 20% 集中在最近 7 天（測試「最近報名」排序）

### 學院/系所
- 8 個學院平均分佈
- 科系依學院對應（見 `departmentOptions`）

### 特殊身分
- 中低收入戶：10%
- 身心障礙：5%

## 唯一性約束

- `studentId`：唯一（腳本會檢查並重新生成）

## 注意事項

1. 測試資料不包含檔案上傳（`idPhoto`, `b2CertificateFile`, `disabilityCertFront`, `disabilityCertBack` 皆為 null）
2. 所有測試資料的 `agreedToTerms` 固定為 `true`
3. 已通過狀態的資料會自動設定 `approvedAt` 和 `approvedSequence`
4. 已退回狀態的資料會自動生成 `rejectionReasons`
