# 老師帳號權限清單

## 概述
本文檔詳細列出系統中**老師（teacher）角色**的所有權限內容，包括前端界面權限和後端API權限。

---

## 一、前端界面權限

### 1.1 標籤頁（導航選單）權限

#### ✅ 老師可以看到的標籤頁：
- **活動報表** (`/admin`)
- **班級參與概況** (`/admin/classes`)

#### ❌ 老師看不到的標籤頁：
- **違規管理** (`/admin/violations`) - 僅管理員
- **問卷管理** (`/admin/surveys`) - 僅管理員
- **問卷設定** (`/admin/survey-settings`) - 僅管理員
- **帳號管理** (`/admin/account`) - 僅管理員

**參考代碼位置：**
```202:254:reservation-frontend/src/components/AdminLayout.js
        {/* 班級參與概況：管理員和老師都可以看到 */}
        {(isAdmin || isTeacher) && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'class-overview' ? 'active' : ''}`} 
              onClick={() => handleTabChange('class-overview')}
              type="button"
            >
              班級參與概況
            </button>
          </li>
        )}
        {/* 只有管理員才能看到其他標籤頁 */}
        {isAdmin && (
          <>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'violation' ? 'active' : ''}`} 
                onClick={() => handleTabChange('violation')}
                type="button"
              >
                違規管理
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'survey' ? 'active' : ''}`} 
                onClick={() => handleTabChange('survey')}
                type="button"
              >
                問卷管理
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'survey-settings' ? 'active' : ''}`} 
                onClick={() => handleTabChange('survey-settings')}
                type="button"
              >
                問卷設定
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => handleTabChange('account')}
                type="button"
              >
                帳號管理
              </button>
            </li>
          </>
        )}
```

### 1.2 活動報表頁面功能權限

#### ✅ 老師可以使用的功能：
1. **查看活動列表**
   - 只能看到 **English Table** 類型的活動
   - 可以查看活動詳情（日期、時間、人數限制、預約人數等）
   - 可以按學期和活動類型篩選（但活動類型篩選對老師無效，因為只能看到English Table）

2. **匯出單個活動報表**
   - 可以匯出單個活動的預約名單Excel

3. **查看預約詳情**
   - 可以查看活動的預約學生名單
   - 可以查看簽到狀態
   - 可以查看分組資訊（僅限English Table活動）

#### ❌ 老師不能使用的功能：
1. **新增活動** - 看不到新增活動表單
2. **修改活動** - 看不到修改按鈕
3. **刪除活動** - 看不到刪除按鈕
4. **匯出總覽報表** - 看不到匯出總覽報表按鈕

**參考代碼位置：**
```1094:1108:reservation-frontend/src/components/AdminHome.js
                    ) : actualUserRole === 'teacher' ? (
                      /* 老師可以看到匯出和查看預約，但不能修改或刪除 */
                      <>
                        <button className="btn btn-sm btn-outline-info me-1" onClick={() => handleExport(evt.eventId)}>匯出</button>
                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleViewReservations(evt.eventId, evt.name, evt.eventType)}>查看預約</button>
                      </>
                    ) : (
                      /* 管理員可以看到所有按鈕 */
                      <>
                        <button className="btn btn-sm btn-outline-info me-1" onClick={() => handleExport(evt.eventId)}>匯出</button>
                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleViewReservations(evt.eventId, evt.name, evt.eventType)}>查看預約</button>
                        <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleEditEvent(evt)}>修改</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEvent(evt.eventId, evt.name)}>刪除</button>
                      </>
                    )}
```

```953:954:reservation-frontend/src/components/AdminHome.js
      {/* 只有管理員才能看到新增活動表單 */}
      {isAdmin && !isTeacher && (
```

```946:949:reservation-frontend/src/components/AdminHome.js
          {/* 只有管理員才能看到匯出總覽報表按鈕 */}
          {isAdmin && (
            <button className="btn btn-outline-primary" onClick={handleExportAll}>匯出總覽報表</button>
          )}
```

### 1.3 班級參與概況頁面功能權限

#### ✅ 老師可以使用的功能：
1. **查看班級總覽**
   - 只能看到**自己負責的班級**（根據老師姓名篩選）
   - 可以查看班級參與統計（參與率、簽到數、No-show數等）
   - 可以按學期、活動類型篩選
   - 可以搜尋班級名稱

2. **查看班級明細**
   - 可以查看自己班級中每個學生的參與狀況
   - 可以查看學生的簽到數、No-show數等詳細資訊

3. **匯出班級報表**
   - 可以匯出班級總覽Excel
   - 可以匯出班級明細Excel

#### ❌ 老師不能使用的功能：
1. **匯入班級名單** - 僅管理員
2. **刪除班級** - 僅管理員
3. **查看其他老師的班級** - 只能看到自己的班級

---

## 二、後端API權限

### 2.1 活動相關API

#### ✅ 老師可以使用的API：

1. **GET `/api/reports/summary`** - 取得活動報表
   - **權限限制**：只能看到 **English Table** 類型的活動
   - **中間件**：`authMiddleware`
   - **參考代碼：**
   ```124:130:reservation-backend/routes/eventRouter.js
    // 老師只能看到 English Table 活動
    if (userRole === 'teacher') {
      events = events.filter(event => {
        const currentEventType = event.eventType || 'English Table';
        return currentEventType === 'English Table';
      });
    }
   ```

2. **GET `/api/events/:id/reservations`** - 取得活動預約詳情
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：查看預約名單、簽到狀態、分組資訊

3. **GET `/api/events/:id/export`** - 匯出活動Excel報表
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：匯出單個活動的預約名單

4. **POST `/api/events/:id/checkin`** - 學生簽到
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：為學生進行簽到操作

5. **POST `/api/events/:id/violations`** - 登記違規
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：登記學生違規記錄

6. **POST `/api/events/:id/violations/batch-mark-no-show`** - 批次標記No-show
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：批次標記未簽到學生為No-show

7. **GET `/api/events/:id/violations`** - 取得活動違規記錄
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：查看活動的違規記錄列表

#### ❌ 老師不能使用的API：

1. **POST `/api/events`** - 新增活動（僅管理員）
2. **PUT `/api/events/:id`** - 修改活動（僅管理員）
3. **DELETE `/api/events/:id`** - 刪除活動（僅管理員）

### 2.2 班級相關API

#### ✅ 老師可以使用的API：

1. **GET `/api/admin/classes/overview`** - 取得班級總覽
   - **權限限制**：只能看到**自己負責的班級**（根據`req.user.name`篩選）
   - **中間件**：`authMiddleware`, `teacherMiddleware`
   - **參考代碼：**
   ```165:168:reservation-backend/controllers/adminClassesController.js
    // 如果是老師，只能看到自己的班級
    if (req.user && req.user.role === 'teacher') {
      whereClause.teacherName = req.user.name;
    }
   ```

2. **GET `/api/admin/classes/:classId/overview`** - 取得班級明細
   - **權限限制**：只能看到自己負責的班級明細
   - **中間件**：`authMiddleware`, `teacherMiddleware`

3. **GET `/api/admin/classes/overview/export`** - 匯出班級總覽Excel
   - **權限限制**：只能匯出自己的班級
   - **中間件**：`authMiddleware`, `teacherMiddleware`

4. **GET `/api/admin/classes/:classId/overview/export`** - 匯出班級明細Excel
   - **權限限制**：只能匯出自己的班級
   - **中間件**：`authMiddleware`, `teacherMiddleware`

#### ❌ 老師不能使用的API：

1. **POST `/api/admin/classes/roster/import`** - 匯入班級名單（僅管理員）
2. **DELETE `/api/admin/classes/:classId`** - 刪除班級（僅管理員）
3. **GET `/api/admin/classes/sample`** - 下載範例檔案（僅管理員）

### 2.3 預約相關API

#### ✅ 老師可以使用的API：

1. **GET `/api/reservations`** - 取得預約列表
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`
   - **功能**：查看所有預約記錄

### 2.4 違規相關API

#### ✅ 老師可以使用的API：

1. **POST `/api/blacklist/recordViolation`** - 登記違規
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`

2. **POST `/api/blacklist/batchRecordViolations`** - 批次登記違規
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`

3. **GET `/api/blacklist`** - 取得違規記錄
   - **權限限制**：無特殊限制（通過workerMiddleware）
   - **中間件**：`authMiddleware`, `workerMiddleware`

### 2.5 帳號相關API

#### ✅ 老師可以使用的API：

1. **GET `/api/teachers/students/participation`** - 查看學生參與狀況
   - **權限限制**：無特殊限制（需要登入）
   - **中間件**：`authMiddleware`

2. **POST `/api/teachers/change-password`** - 自行變更密碼
   - **權限限制**：只能變更自己的密碼
   - **中間件**：`authMiddleware`

#### ❌ 老師不能使用的API：

1. **POST `/api/admin/teachers`** - 建立帳號（僅管理員）
2. **GET `/api/admin/teachers`** - 取得帳號列表（僅管理員）
3. **PATCH `/api/admin/teachers/:teacherId`** - 更新帳號（僅管理員）
4. **POST `/api/admin/teachers/:teacherId/reset-password`** - 重設密碼（僅管理員）
5. **GET `/api/admin/teachers/:teacherId/classes`** - 取得老師的班級（僅管理員）

---

## 三、權限中間件說明

### 3.1 使用的權限中間件

系統中定義了以下權限中間件：

1. **`authMiddleware`** - 基本認證中間件
   - 驗證JWT token
   - 所有需要登入的功能都使用此中間件

2. **`teacherMiddleware`** - 老師權限中間件
   - 允許：`admin` 和 `teacher`
   - 用於班級相關功能

3. **`workerMiddleware`** - 工作人員權限中間件
   - 允許：`admin`、`worker` 和 `teacher`
   - 用於活動預約、簽到、違規等功能

4. **`adminMiddleware`** - 管理員權限中間件
   - 僅允許：`admin`
   - 用於管理功能（新增、修改、刪除活動、帳號管理等）

**參考代碼位置：**
```118:138:reservation-backend/middlewares/auth.js
// Teacher權限中間件 - 允許admin和teacher
function teacherMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      logError('INSUFFICIENT_PERMISSIONS', null, 'User role not found in request');
      const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403);
      return res.status(403).json(apiError);
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      logError('INSUFFICIENT_PERMISSIONS', null, `User role '${req.user.role}' is not admin or teacher`);
      const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403);
      return res.status(403).json(apiError);
    }
    next();
  } catch (error) {
    logError('INSUFFICIENT_PERMISSIONS', error, 'Teacher middleware error');
    const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403);
    res.status(403).json(apiError);
  }
}
```

```74:94:reservation-backend/middlewares/auth.js
// Worker權限中間件 - 允許admin、worker和teacher
function workerMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      logError('INSUFFICIENT_PERMISSIONS', null, 'User role not found in request');
      const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403);
      return res.status(403).json(apiError);
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'worker' && req.user.role !== 'teacher') {
      logError('INSUFFICIENT_PERMISSIONS', null, `User role '${req.user.role}' is not admin, worker or teacher`);
      const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403);
      return res.status(403).json(apiError);
    }
    next();
  } catch (error) {
    logError('INSUFFICIENT_PERMISSIONS', error, 'Worker middleware error');
    const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403);
    res.status(403).json(apiError);
  }
}
```

---

## 四、權限限制總結

### 4.1 活動相關限制

| 功能 | 老師權限 | 說明 |
|------|---------|------|
| 查看活動列表 | ✅ | 只能看到 English Table 類型 |
| 查看預約詳情 | ✅ | 無限制 |
| 匯出單個活動報表 | ✅ | 無限制 |
| 學生簽到 | ✅ | 無限制 |
| 登記違規 | ✅ | 無限制 |
| 查看違規記錄 | ✅ | 無限制 |
| 新增活動 | ❌ | 僅管理員 |
| 修改活動 | ❌ | 僅管理員 |
| 刪除活動 | ❌ | 僅管理員 |
| 匯出總覽報表 | ❌ | 僅管理員 |

### 4.2 班級相關限制

| 功能 | 老師權限 | 說明 |
|------|---------|------|
| 查看班級總覽 | ✅ | 只能看到自己的班級 |
| 查看班級明細 | ✅ | 只能看到自己的班級 |
| 匯出班級報表 | ✅ | 只能匯出自己的班級 |
| 匯入班級名單 | ❌ | 僅管理員 |
| 刪除班級 | ❌ | 僅管理員 |

### 4.3 其他功能限制

| 功能 | 老師權限 | 說明 |
|------|---------|------|
| 查看違規管理 | ❌ | 前端標籤頁隱藏（僅管理員） |
| 查看問卷管理 | ❌ | 前端標籤頁隱藏（僅管理員） |
| 查看問卷設定 | ❌ | 前端標籤頁隱藏（僅管理員） |
| 帳號管理 | ❌ | 前端標籤頁隱藏（僅管理員） |
| 自行變更密碼 | ✅ | 可以變更自己的密碼 |
| 查看學生參與狀況 | ✅ | 無限制 |

---

## 五、安全性說明

### 5.1 雙重保護機制

1. **前端限制**：界面層面的功能隱藏
   - 使用條件渲染（`{isAdmin && ...}`）隱藏老師不應看到的功能
   - 標籤頁完全隱藏，無法通過URL直接訪問

2. **後端驗證**：API層面的權限檢查
   - 所有API都有相應的權限中間件
   - 即使前端被繞過，後端仍會拒絕未授權操作
   - 班級相關功能會根據老師姓名自動篩選

### 5.2 資料隔離

- **班級資料隔離**：老師只能看到自己負責的班級（根據`teacherName`欄位）
- **活動類型限制**：老師只能看到 English Table 類型的活動

---

## 六、注意事項

1. **老師姓名匹配**：班級功能依賴於老師的姓名（`req.user.name`）與班級表中的`teacherName`欄位匹配。確保老師帳號的姓名欄位正確設置。

2. **活動類型限制**：老師在活動報表中只能看到 English Table 類型的活動，即使選擇其他活動類型篩選，結果仍會被限制為 English Table。

3. **前端與後端一致性**：前端界面限制和後端API權限檢查保持一致，確保系統安全性。

4. **權限變更**：如需修改老師權限，需要同時更新前端界面限制和後端API中間件。

---

## 七、相關檔案位置

### 前端檔案
- `reservation-frontend/src/components/AdminLayout.js` - 標籤頁權限控制
- `reservation-frontend/src/components/AdminHome.js` - 活動報表頁面權限控制
- `reservation-frontend/src/components/ClassDetail.js` - 班級明細頁面
- `reservation-frontend/src/components/ClassOverview.js` - 班級總覽頁面

### 後端檔案
- `reservation-backend/middlewares/auth.js` - 權限中間件定義
- `reservation-backend/routes/eventRouter.js` - 活動相關路由
- `reservation-backend/routes/adminClasses.js` - 班級相關路由
- `reservation-backend/routes/teacherRoutes.js` - 老師相關路由
- `reservation-backend/controllers/adminClassesController.js` - 班級控制器（包含老師權限邏輯）

---

**最後更新日期**：2025年1月

