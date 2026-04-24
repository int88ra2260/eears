# 培力英檢報名管理頁面 - 漸進式優化技術方案

## 📋 目錄
1. [架構調整說明](#架構調整說明)
2. [新增 Component 清單](#新增-component-清單)
3. [新增 API 設計](#新增-api-設計)
4. [關鍵程式碼範例](#關鍵程式碼範例)
5. [回滾方式說明](#回滾方式說明)
6. [實作步驟與檢查清單](#實作步驟與檢查清單)

---

## 🏗️ 架構調整說明

### Before（現有架構）

```
EnglishTestManagement.js (單一組件)
├── 狀態管理（useState）
│   ├── registrations: 報名列表
│   ├── filters: statusFilter, searchTerm
│   └── modals: showDetailModal, showStatusModal
├── API 呼叫
│   └── GET /api/english-test/registrations
└── UI 渲染
    ├── 篩選器（簡單）
    ├── 表格（固定欄位）
    └── Modal（詳細資料）
```

**現有 API**：
- `GET /api/english-test/registrations?page=1&limit=20&status=pending&search=xxx`
- `PUT /api/english-test/registrations/:id`
- `DELETE /api/english-test/registrations/:id`

### After（優化後架構）

```
EnglishTestManagement.js (主組件 - 保持向下相容)
├── Feature Flag 檢查
│   └── useEnhancedFeatures (新 Hook)
├── 條件渲染
│   ├── 舊版 UI（Feature Flag = false）
│   └── 新版 UI（Feature Flag = true）
│       ├── AdvancedFilterPanel (新增)
│       ├── EnhancedTable (新增)
│       ├── BulkActionToolbar (新增)
│       ├── DetailModalWithTabs (新增)
│       └── QuickActionButtons (新增)
└── API 呼叫（擴展參數，向下相容）
    └── GET /api/english-test/registrations (新增參數)

新增獨立組件（不影響既有功能）
├── components/english-test/
│   ├── AdvancedFilterPanel.js
│   ├── EnhancedTable.js
│   ├── BulkActionToolbar.js
│   ├── DetailModalWithTabs.js
│   ├── QuickActionButtons.js
│   ├── PhotoViewer.js
│   ├── ColumnSelector.js
│   └── useKeyboardShortcuts.js (Hook)
└── hooks/
    └── useEnhancedFeatures.js
```

**擴展 API**（向下相容）：
- `GET /api/english-test/registrations` (新增可選參數：日期範圍、測驗類型、特殊身分、排序)
- `POST /api/english-test/registrations/bulk-update` (新增：批量狀態更新)
- ❌ 不新增：`POST /api/english-test/registrations/bulk-export` (批量匯出)
- ❌ 不新增：`GET /api/english-test/registrations/:id/history` (操作歷史)

---

## 📦 新增 Component 清單

### 1. AdvancedFilterPanel.js
**用途**：高級篩選面板（取代簡單篩選）
**位置**：`reservation-frontend/src/components/english-test/AdvancedFilterPanel.js`
**功能**：
- ✅ 日期範圍篩選（報名時間）
- ✅ 測驗類型篩選（聽讀/說寫/四項全考/不報考）
- ✅ 特殊身分篩選（中低收入戶、身心障礙）
- ✅ 搜尋結果高亮顯示
- ✅ 搜尋框自動完成建議
- ✅ 顯示搜尋結果數量
- ❌ 不擴展搜尋欄位（保持現有：學號、姓名、Email）

### 2. EnhancedTable.js
**用途**：增強型表格（支援排序、欄位自訂、響應式）
**位置**：`reservation-frontend/src/components/english-test/EnhancedTable.js`
**功能**：
- ✅ 欄位自訂功能（選擇顯示欄位）
- ✅ 拖曳調整欄位順序
- ✅ 記住使用者偏好設定（localStorage）
- ✅ 點擊欄位標題排序
- ✅ 支援多欄位排序（Ctrl/Cmd + 點擊）
- ✅ 預設排序：報名時間（最新優先，DESC）
- ✅ 小螢幕優化（部分欄位改為下拉詳情）
- ✅ 卡片式佈局（移動裝置）
- ✅ 證件照縮圖直接在列表中顯示
- ✅ 次要操作放入下拉選單（三點選單）
- ✅ 常用操作使用圖示按鈕
- ✅ 操作確認提示（防止誤操作）

### 3. BulkActionToolbar.js
**用途**：批量操作工具列
**位置**：`reservation-frontend/src/components/english-test/BulkActionToolbar.js`
**功能**：
- ✅ 全選/取消全選
- ✅ 選擇框中間狀態（部分選中）
- ✅ 批量設為「已通過」
- ✅ 批量設為「已拒絕」（需選擇統一或分別原因）
- ✅ 批量設為「待審核」
- ✅ 批量刪除（帶確認提示）
- ❌ 不實作快捷篩選操作（全選當前頁待審核項目等）

### 4. DetailModalWithTabs.js
**用途**：帶分頁的詳細資料 Modal（響應式設計）
**位置**：`reservation-frontend/src/components/english-test/DetailModalWithTabs.js`
**功能**：
- ✅ 個人電腦：使用 Tabs 分頁（基本資料、學籍、特殊身分、檔案）
- ✅ 手機：使用 Accordion（可摺疊區塊）
- ✅ 證件照支援放大鏡功能
- ✅ 照片尺寸比對（與標準尺寸對比）
- ✅ 檔案列表顯示檔案大小和上傳時間
- ✅ 支援拖曳放大檢視
- ❌ 不實作操作歷史記錄
- ❌ 不實作快速操作按鈕固定

### 5. QuickActionButtons.js
**用途**：快速操作按鈕組
**位置**：`reservation-frontend/src/components/english-test/QuickActionButtons.js`
**功能**：
- ✅ 圖示按鈕
- ✅ 下拉選單（次要操作）
- ✅ 操作確認提示（防止誤操作）

### 6. PhotoViewer.js
**用途**：證件照檢視器
**位置**：`reservation-frontend/src/components/english-test/PhotoViewer.js`
**功能**：
- ✅ 放大鏡功能
- ✅ 拖曳放大
- ✅ 尺寸比對提示
- ✅ 檔案列表顯示檔案大小和上傳時間

### 7. ColumnSelector.js
**用途**：欄位選擇器
**位置**：`reservation-frontend/src/components/english-test/ColumnSelector.js`
**功能**：
- 顯示/隱藏欄位
- 拖曳調整順序
- 保存使用者偏好（localStorage）

### 8. useKeyboardShortcuts.js (Hook)
**用途**：鍵盤快捷鍵管理
**位置**：`reservation-frontend/src/hooks/useKeyboardShortcuts.js`
**狀態**：❌ 不實作

### 9. useEnhancedFeatures.js (Hook)
**用途**：Feature Flag 檢查 Hook
**位置**：`reservation-frontend/src/hooks/useEnhancedFeatures.js`
**功能**：
- 從 API 讀取 Feature Flag
- 快取管理
- 版本檢查

---

## 🔌 新增 API 設計

### 1. 擴展 GET /api/english-test/registrations

**向下相容原則**：所有新參數都是**可選的**，不提供時使用舊邏輯

```javascript
// 舊版呼叫（仍然有效）
GET /api/english-test/registrations?page=1&limit=20&status=pending&search=xxx

// 新版呼叫（新增參數）
GET /api/english-test/registrations?
  page=1
  &limit=20
  &status=pending
  &search=xxx                    // 舊參數
  &dateFrom=2024-01-01          // 新參數：日期範圍起始
  &dateTo=2024-12-31            // 新參數：日期範圍結束
  &examTypes[]=LRSW             // 新參數：測驗類型（可複選）
  &examTypes[]=LR
  &isLowIncome=是               // 新參數：特殊身分（中低收入戶）
  &hasDisabilityCard=是         // 新參數：特殊身分（身心障礙）
  &sortBy=createdAt             // 新參數：排序欄位
  &sortOrder=DESC               // 新參數：排序方向（預設：DESC，最新優先）
```

**回應格式**（向下相容）：
```json
{
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "data": [...],
  "stats": {...},
  
  // 新增欄位（Feature Flag 啟用時）
  "meta": {
    "appliedFilters": {...},      // 套用的篩選條件
    "sortInfo": {
      "by": "createdAt",
      "order": "DESC"
    },
    "searchResultCount": 100      // 搜尋結果數量（用於顯示）
  }
}
```

### 2. POST /api/english-test/registrations/bulk-update (新增)

**用途**：批量狀態更新

```http
POST /api/english-test/registrations/bulk-update
Authorization: Bearer <token>
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5],
  "status": "approved",
  "rejectionReasons": [],  // 如果 status = rejected，必填
  "rejectionOther": ""     // 如果選擇「其他」，必填
}
```

**回應**：
```json
{
  "success": true,
  "updated": 5,
  "failed": 0,
  "errors": []
}
```

### 3. Feature Flag API（使用現有）

```http
GET /api/admin/feature-flags/ENGLISH_TEST_ENHANCED_UI
PUT /api/admin/feature-flags/ENGLISH_TEST_ENHANCED_UI
```

**新增 Feature Flag**：
- `ENGLISH_TEST_ENHANCED_UI`: 啟用/停用增強 UI
- `ENGLISH_TEST_BULK_OPERATIONS`: 啟用/停用批量操作

---

## 💻 關鍵程式碼範例

### 1. Feature Flag Hook

```javascript
// hooks/useEnhancedFeatures.js
import { useState, useEffect } from 'react';

export function useEnhancedFeatures(token) {
  const [flags, setFlags] = useState({
    enhancedUI: false,
    bulkOperations: false,
    keyboardShortcuts: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const response = await fetch('/api/admin/feature-flags', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setFlags({
            enhancedUI: data.data?.ENGLISH_TEST_ENHANCED_UI ?? false,
            bulkOperations: data.data?.ENGLISH_TEST_BULK_OPERATIONS ?? false,
            keyboardShortcuts: data.data?.ENGLISH_TEST_KEYBOARD_SHORTCUTS ?? false
          });
        }
      } catch (error) {
        console.error('載入 Feature Flags 失敗:', error);
        // 預設為 false，使用舊版 UI
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchFlags();
    }
  }, [token]);

  return { flags, loading };
}
```

### 2. 主組件條件渲染

```javascript
// components/EnglishTestManagement.js (修改部分)
import { useEnhancedFeatures } from '../hooks/useEnhancedFeatures';
import AdvancedFilterPanel from './english-test/AdvancedFilterPanel';
import EnhancedTable from './english-test/EnhancedTable';
// ... 其他 import

export default function EnglishTestManagement() {
  const { token } = useOutletContext();
  const { flags, loading } = useEnhancedFeatures(token);
  
  // 現有狀態（保持不變）
  const [registrations, setRegistrations] = useState([]);
  // ... 其他現有狀態

  // 載入報名列表（擴展參數，向下相容）
  const loadRegistrations = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        // 舊版參數（保持相容）
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        
        // 新版參數（僅在 Feature Flag 啟用時使用）
        ...(flags.enhancedUI && filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(flags.enhancedUI && filters.dateTo && { dateTo: filters.dateTo }),
        ...(flags.enhancedUI && filters.colleges?.length > 0 && {
          colleges: filters.colleges
        }),
        // ... 其他新參數
      });

      const response = await fetch(`/api/english-test/registrations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // ... 處理回應（保持不變）
    } catch (error) {
      // ... 錯誤處理
    } finally {
      setLoading(false);
    }
  };

  // 條件渲染：根據 Feature Flag 顯示不同 UI
  if (loading) {
    return <div>載入中...</div>;
  }

  return (
    <div>
      {/* 統計資訊（保持不變） */}
      
      {/* 篩選器：根據 Feature Flag 選擇版本 */}
      {flags.enhancedUI ? (
        <AdvancedFilterPanel
          onFilterChange={handleAdvancedFilterChange}
          savedFilters={savedFilters}
        />
      ) : (
        // 舊版篩選器（保持原樣）
        <div className="card mb-4">
          {/* 現有篩選器程式碼 */}
        </div>
      )}

      {/* 表格：根據 Feature Flag 選擇版本 */}
      {flags.enhancedUI ? (
        <EnhancedTable
          data={registrations}
          onSort={handleSort}
          onRowSelect={handleRowSelect}
          selectedRows={selectedRows}
        />
      ) : (
        // 舊版表格（保持原樣）
        <div className="table-responsive">
          {/* 現有表格程式碼 */}
        </div>
      )}

      {/* 批量操作工具列（僅在 Feature Flag 啟用時顯示） */}
      {flags.enhancedUI && flags.bulkOperations && selectedRows.length > 0 && (
        <BulkActionToolbar
          selectedCount={selectedRows.length}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkDelete={handleBulkDelete}
        />
      )}
    </div>
  );
}
```

### 3. 後端 API 擴展（向下相容）

```javascript
// routes/englishTestRegistrationRouter.js (修改部分)

router.get('/english-test/registrations', authMiddleware, async (req, res) => {
  try {
    // 舊版參數（保持相容）
    const { page = 1, limit = 20, status, search } = req.query;
    
    // 新版參數（可選）
    const {
      dateFrom,           // 日期範圍起始
      dateTo,             // 日期範圍結束
      examTypes,          // 測驗類型（陣列）
      isLowIncome,         // 中低收入戶
      hasDisabilityCard,   // 身心障礙
      sortBy,              // 排序欄位
      sortOrder            // 排序方向（預設：DESC）
    } = req.query;

    const where = {};

    // === 舊版邏輯（保持不變） ===
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { studentId: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // === 新版邏輯（向下相容） ===
    // 日期範圍篩選
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt[Op.lte] = new Date(dateTo + 'T23:59:59');
      }
    }

    // 測驗類型篩選
    if (examTypes) {
      const examArray = Array.isArray(examTypes) ? examTypes : [examTypes];
      if (examArray.length > 0) {
        where.examType = { [Op.in]: examArray };
      }
    }

    // 特殊身分篩選
    if (isLowIncome) {
      where.isLowIncome = isLowIncome;
    }
    if (hasDisabilityCard) {
      where.hasDisabilityCard = hasDisabilityCard;
    }

    // 排序（預設：報名時間最新優先，DESC）
    let orderBy;
    if (sortBy && sortOrder) {
      // 新版排序
      orderBy = [[sortBy, sortOrder.toUpperCase()]];
    } else {
      // 預設排序：報名時間最新優先（DESC）
      orderBy = [['createdAt', 'DESC']];
    }

    // 查詢（保持不變）
    const { count, rows } = await EnglishTestRegistration.findAndCountAll({
      where,
      order: orderBy,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      // 欄位選擇（僅在新參數提供時使用）
      attributes: fields && Array.isArray(fields) ? fields : undefined
    });

    // 統計資訊（保持不變）
    const stats = { /* ... */ };

    // 回應（新增 meta 欄位，不影響舊版）
    const response = {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
      data: rows,
      stats: stats
    };

    // 新增 meta 資訊（僅在請求包含新參數時提供）
    if (dateFrom || dateTo || examTypes || isLowIncome || hasDisabilityCard || sortBy) {
      response.meta = {
        appliedFilters: {
          dateFrom,
          dateTo,
          examTypes,
          isLowIncome,
          hasDisabilityCard
        },
        sortInfo: sortBy ? { by: sortBy, order: sortOrder || 'DESC' } : { by: 'createdAt', order: 'DESC' },
        searchResultCount: count
      };
    }

    res.json(response);
  } catch (error) {
    console.error('取得報名列表錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});
```

### 4. 批量更新 API（新增）

```javascript
// routes/englishTestRegistrationRouter.js (新增)

router.post('/english-test/registrations/bulk-update', authMiddleware, async (req, res) => {
  try {
    const { ids, status, rejectionReasons, rejectionOther } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '請提供要更新的報名 ID 列表' });
    }

    if (!status) {
      return res.status(400).json({ error: '請提供狀態' });
    }

    // 驗證拒絕原因（如果狀態為 rejected）
    if (status === 'rejected') {
      const reasons = Array.isArray(rejectionReasons) ? rejectionReasons : [];
      if (reasons.length === 0) {
        return res.status(400).json({ 
          error: '切換至「已拒絕」狀態時，必須至少選擇一個拒絕原因' 
        });
      }
      if (reasons.includes('其他') && (!rejectionOther || rejectionOther.trim() === '')) {
        return res.status(400).json({ 
          error: '選擇「其他」拒絕原因時，必須填寫說明' 
        });
      }
    }

    // 批量更新
    const updateData = {
      status,
      ...(status === 'rejected' && {
        rejectionReasons: Array.isArray(rejectionReasons) ? rejectionReasons : [rejectionReasons],
        rejectionOther
      }),
      ...(status === 'approved' && {
        approvedAt: new Date()
      })
    };

    const [updatedCount] = await EnglishTestRegistration.update(updateData, {
      where: {
        id: { [Op.in]: ids }
      }
    });

    res.json({
      success: true,
      updated: updatedCount,
      failed: ids.length - updatedCount,
      errors: []
    });
  } catch (error) {
    console.error('批量更新錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});
```

### 5. 統計視覺化組件（可選）

```javascript
// components/english-test/StatsVisualization.js
// 使用圖表展示統計資訊（圓餅圖、長條圖等）
// 點擊統計卡片自動套用對應篩選
// 顯示與上期對比（如有歷史資料）
// 顯示今日新增數量
```

---

## 🔄 回滾方式說明

### 方式 1：Feature Flag 關閉（推薦，立即生效）

```bash
# 透過 API 關閉
curl -X PUT http://localhost:3000/api/admin/feature-flags/ENGLISH_TEST_ENHANCED_UI \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"value": false}'
```

**效果**：
- 立即切換回舊版 UI
- 不需要重啟服務
- 不需要修改程式碼
- 不需要資料庫遷移

### 方式 2：環境變數（需要重啟）

```bash
# .env
FEATURE_ENGLISH_TEST_ENHANCED_UI=false
FEATURE_ENGLISH_TEST_BULK_OPERATIONS=false
FEATURE_ENGLISH_TEST_KEYBOARD_SHORTCUTS=false
```

### 方式 3：資料庫直接修改

```sql
UPDATE settings 
SET value = 'false' 
WHERE key = 'feature_flag_ENGLISH_TEST_ENHANCED_UI';

UPDATE settings 
SET value = 'false' 
WHERE key = 'feature_flag_ENGLISH_TEST_BULK_OPERATIONS';

UPDATE settings 
SET value = 'false' 
WHERE key = 'feature_flag_ENGLISH_TEST_KEYBOARD_SHORTCUTS';
```

### 方式 4：Git 回滾（緊急情況）

```bash
# 1. 回滾到前一版本
git checkout <previous-commit-hash>

# 2. 重新部署
npm run build
pm2 restart all
```

**注意**：此方式會完全移除新功能，建議僅在嚴重問題時使用。

### 回滾檢查清單

- [ ] 關閉相關 Feature Flags
- [ ] 確認舊版 UI 正常顯示
- [ ] 確認舊版 API 呼叫正常
- [ ] 測試基本功能（查看、更新、刪除）
- [ ] 監控錯誤日誌
- [ ] 通知團隊回滾完成

---

## 📝 實作步驟與檢查清單

### Phase 1: 基礎架構（不影響現有功能）

- [ ] 1.1 新增 Feature Flag 定義
  - [ ] 後端：在 `utils/featureFlags.js` 新增預設值
  - [ ] 後端：在 `routes/featureFlagsRouter.js` 註冊路由
  - [ ] 測試：透過 API 讀取/設定 Feature Flag

- [ ] 1.2 新增 Hook
  - [ ] `hooks/useEnhancedFeatures.js`
  - [ ] 測試：Hook 正常運作

- [ ] 1.3 建立組件目錄結構
  - [ ] `components/english-test/` 目錄
  - [ ] 建立空組件檔案

### Phase 2: API 擴展（向下相容）

- [ ] 2.1 擴展 GET /api/english-test/registrations
  - [ ] 新增可選參數處理
  - [ ] 保持舊參數相容
  - [ ] 新增 meta 欄位（可選）
  - [ ] 測試：舊版呼叫仍然正常
  - [ ] 測試：新版呼叫正常

- [ ] 2.2 新增批量操作 API
  - [ ] POST /api/english-test/registrations/bulk-update
  - [ ] 測試：批量操作正常

### Phase 3: UI 組件開發（Feature Flag 保護）

- [ ] 3.1 篩選器組件
  - [ ] `AdvancedFilterPanel.js`
  - [ ] 實作：日期範圍篩選
  - [ ] 實作：測驗類型篩選
  - [ ] 實作：特殊身分篩選
  - [ ] 實作：搜尋結果高亮
  - [ ] 實作：自動完成建議
  - [ ] 實作：顯示搜尋結果數量
  - [ ] 測試：篩選功能正常
  - [ ] 測試：舊版篩選器仍然可用

- [ ] 3.2 表格組件
  - [ ] `EnhancedTable.js`
  - [ ] 實作：欄位自訂功能（選擇顯示欄位）
  - [ ] 實作：拖曳調整欄位順序
  - [ ] 實作：記住使用者偏好（localStorage）
  - [ ] 實作：點擊欄位標題排序
  - [ ] 實作：多欄位排序（Ctrl/Cmd + 點擊）
  - [ ] 實作：預設排序（報名時間最新優先，DESC）
  - [ ] 實作：小螢幕優化（部分欄位改為下拉詳情）
  - [ ] 實作：卡片式佈局（移動裝置）
  - [ ] 實作：證件照縮圖顯示
  - [ ] 實作：次要操作下拉選單
  - [ ] 實作：圖示按鈕
  - [ ] 實作：操作確認提示
  - [ ] 測試：排序功能
  - [ ] 測試：欄位自訂
  - [ ] 測試：響應式設計

- [ ] 3.3 批量操作組件
  - [ ] `BulkActionToolbar.js`
  - [ ] 實作：全選/取消全選
  - [ ] 實作：選擇框中間狀態（部分選中）
  - [ ] 實作：批量設為「已通過」
  - [ ] 實作：批量設為「已拒絕」（需選擇原因）
  - [ ] 實作：批量設為「待審核」
  - [ ] 實作：批量刪除（帶確認提示）
  - [ ] 測試：批量選擇
  - [ ] 測試：批量更新
  - [ ] 測試：批量刪除

- [ ] 3.4 詳細資料組件
  - [ ] `DetailModalWithTabs.js`
  - [ ] 實作：個人電腦使用 Tabs 分頁
  - [ ] 實作：手機使用 Accordion（可摺疊）
  - [ ] 實作：證件照放大鏡功能
  - [ ] 實作：照片尺寸比對
  - [ ] 實作：檔案列表顯示大小和時間
  - [ ] 實作：拖曳放大檢視
  - [ ] 測試：Tabs/Accordion 切換
  - [ ] 測試：響應式設計（PC/手機）

- [ ] 3.5 快捷操作組件
  - [ ] `QuickActionButtons.js`
  - [ ] 實作：圖示按鈕
  - [ ] 實作：下拉選單（次要操作）
  - [ ] 實作：操作確認提示
  - [ ] 測試：圖示按鈕功能

- [ ] 3.6 統計視覺化組件（可選）
  - [ ] `StatsVisualization.js`
  - [ ] 實作：圖表展示（圓餅圖、長條圖）
  - [ ] 實作：點擊卡片自動套用篩選
  - [ ] 實作：顯示今日新增數量

### Phase 4: 整合與測試

- [ ] 4.1 主組件條件渲染
  - [ ] 修改 `EnglishTestManagement.js`
  - [ ] 加入 Feature Flag 檢查
  - [ ] 條件渲染新/舊版 UI
  - [ ] 測試：Feature Flag 關閉時顯示舊版
  - [ ] 測試：Feature Flag 啟用時顯示新版

- [ ] 4.2 端對端測試
  - [ ] 舊版功能完整測試
  - [ ] 新版功能完整測試
  - [ ] 切換 Feature Flag 測試

- [ ] 4.3 效能測試
  - [ ] 大量資料載入測試
  - [ ] API 回應時間測試
  - [ ] 前端渲染效能測試

### Phase 5: 部署與監控

- [ ] 5.1 預部署檢查
  - [ ] 所有測試通過
  - [ ] Feature Flags 預設為 false
  - [ ] 程式碼審查完成

- [ ] 5.2 漸進式部署
  - [ ] 部署到測試環境
  - [ ] 測試環境驗證
  - [ ] 部署到生產環境（Feature Flags 關閉）
  - [ ] 內部測試（手動開啟 Feature Flag）
  - [ ] 小範圍使用者測試
  - [ ] 全面啟用

- [ ] 5.3 監控與回滾準備
  - [ ] 設定錯誤監控
  - [ ] 準備回滾腳本
  - [ ] 建立回滾檢查清單
  - [ ] 團隊培訓（回滾流程）

---

## ⚠️ 注意事項

### 1. 向下相容原則

- ✅ 所有新參數都是**可選的**
- ✅ 舊版 API 呼叫必須**仍然有效**
- ✅ 舊版 UI 必須**完全保留**
- ✅ 不得刪除或修改既有程式碼結構

### 2. Feature Flag 策略

- 預設值：`false`（使用舊版）
- 分階段啟用：先內部測試 → 小範圍 → 全面
- 可隨時關閉：不需要重啟或修改程式碼

### 3. 錯誤處理

- 新功能錯誤不影響舊功能
- API 錯誤時回退到舊版邏輯
- 前端錯誤時隱藏新功能，顯示舊版

### 4. 測試重點

- 舊版功能 100% 正常
- Feature Flag 開關測試
- 大量資料效能測試
- 瀏覽器相容性測試

---

## 📚 相關文件

- [Feature Flags 系統文件](../reservation-backend/docs/FEATURE_FLAGS.md)
- [API 規格文件](../reservation-backend/docs/API_SPECIFICATION.md)
- [使用者體驗優化建議](./ENGLISH_TEST_MANAGEMENT_UX_IMPROVEMENTS.md)

---

**文件版本**：1.0  
**最後更新**：2024-12-11  
**維護者**：開發團隊
