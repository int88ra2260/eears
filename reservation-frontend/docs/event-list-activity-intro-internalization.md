# ActivityIntroModal 內聚化：掃描結果與說明

## 一、掃描結果

### 1. EventList 中與 ActivityIntroModal 相關的 state 與 handlers（拆分前）

| 項目 | 說明 |
|------|------|
| **activeTab** | `useState(initialTabProp \|\| 'english-table')`，與 `initialTabProp` 同步（useEffect），供 Tab 切換與內容顯示。 |
| **jobTalkImages** | 常數陣列（六張圖片路徑），傳入 Modal 供 Job Talk 輪播使用。 |
| **currentImageIndex** | `useState(0)`，輪播當前索引。 |
| **isTransitioning** | `useState(false)`，輪播切換防抖。 |
| **nextImage / prevImage / goToImage** | 輪播前後／跳指定張，300ms 後清除 isTransitioning。 |
| **handleTabChange** | `setActiveTab(tabName)`，且當 `tabName === 'job-talk'` 時 `setCurrentImageIndex(0)`。 |

### 2. 應改由 ActivityIntroModal 內部管理的狀態

- **activeTab**：改為 Modal 內 `useState(initialTab || 'english-table')`，並以 `useEffect` 依 `initialTab` 同步，使從 `/activities/:slug` 開啟時仍顯示對應 Tab。
- **jobTalkImages**：改為 Modal 內常數 `JOB_TALK_IMAGES`（與原陣列相同）。
- **currentImageIndex / isTransitioning**：改為 Modal 內 `useState(0)`、`useState(false)`。
- **nextImage / prevImage / goToImage**：改為 Modal 內 `useCallback`，邏輯不變（300ms、邊界循環／跳指定張）。
- **handleTabChange**：改為 Modal 內 `handleTabChange`，`setActiveTab(tabName)` + 若 `tabName === 'job-talk'` 則 `setCurrentImageIndex(0)`。

### 3. 保持不變的部分

- **活動介紹 modal 開關**：仍由 EventList 的 `showIntroductionModal`、`setShowIntroductionModal`、`closeIntroductionModal` 與按鈕／`?section=activities` 控制。
- **Job Talk 輪播行為**：前後鍵、圓點跳轉、300ms 過渡、切到 Job Talk Tab 時 index 歸零，邏輯與原一致。
- **內容與翻譯鍵**：各 Tab 內容、圖片路徑、`t('activities.*')`、`t('home.gotIt')` 未改。
- **頁面行為**：`/events`、`/activities/:slug` 仍傳 `initialTab`（slug 經 `slugToTab`），Modal 依 `initialTab` 顯示對應 Tab。

---

## 二、內聚化策略

1. **ActivityIntroModal 介面變更**  
   - **舊**：`show`, `onClose`, `activeTab`, `onTabChange`, `t`, `jobTalkImages`, `currentImageIndex`, `nextImage`, `prevImage`, `goToImage`, `isTransitioning`。  
   - **新**：`show`, `onClose`, `initialTab`（可選）, `t`。  

2. **Modal 內部**  
   - `activeTab` = `useState(initialTab || 'english-table')`，`useEffect` 依 `initialTab` 同步。  
   - `currentImageIndex`、`isTransitioning` 內管；`JOB_TALK_IMAGES` 常數；`nextImage`、`prevImage`、`goToImage`、`handleTabChange` 以 `useCallback` 實作，切到 job-talk 時 reset index。  

3. **EventList 改動**  
   - 移除：`activeTab`、`jobTalkImages`、`currentImageIndex`、`isTransitioning`、`nextImage`、`prevImage`、`goToImage`、`handleTabChange` 及與 `initialTabProp` 同步的 useEffect。  
   - 僅傳：`<ActivityIntroModal show={showIntroductionModal} onClose={closeIntroductionModal} initialTab={initialTabProp} t={t} />`。  

4. **低風險與回滾**  
   - 未改開關方式、輪播邏輯、翻譯與路由。回滾時還原 EventList 的 state/handlers 並還原 ActivityIntroModal 為受控 props 介面即可。

---

## 三、修改檔案清單

| 類型 | 路徑 |
|------|------|
| 修改 | `src/components/events/ActivityIntroModal.js`（內管 activeTab、輪播 state 與 handlers，介面改為 show / onClose / initialTab / t） |
| 修改 | `src/components/EventList.js`（移除活動介紹相關 state 與 handlers，僅傳 show / onClose / initialTab / t） |
| 新增 | `docs/event-list-activity-intro-internalization.md`（本文件） |

---

## 四、已移入 ActivityIntroModal 的狀態與邏輯

- **State**：`activeTab`、`currentImageIndex`、`isTransitioning`。  
- **常數**：`JOB_TALK_IMAGES`（原 jobTalkImages）。  
- **Handlers**：`nextImage`、`prevImage`、`goToImage`、`handleTabChange`（含切到 job-talk 時 index 歸零）。  
- **Effect**：依 `initialTab` 同步 `activeTab`。

---

## 五、仍保留在 EventList 的邏輯

- **State**：`events`、`loading`、`showSearchModal`、`showIntroductionModal`、`showFAQModal`、`selectedEvent`、`enabledSurveys`。  
- **Effect**：`?section=faq`／`?section=activities`、fetchEnabledSurveys、fetchEvents。  
- **Handlers**：`closeFAQModal`、`closeIntroductionModal`、`handleEventClick`。  
- **業務**：`canReserveAndReason`。  
- **編排**：載入中、EventAlertsBanner、EventRulesNotice、按鈕列、EventCalendarSection、ReservationSearchModal、EventDetail、ActivityIntroModal、EventFAQModal。  
- **ActivityIntroModal 相關**：僅保留 `showIntroductionModal`、`closeIntroductionModal` 與傳入的 `initialTab={initialTabProp}`（來自父層 `initialTab`，如 `/activities/:slug` 的 `slugToTab(slug)`）。

---

## 六、下一輪可再配置化的文案／規則／FAQ

- **活動介紹內容**：各類型說明、圖片路徑、Job Talk 輪播張數可改由設定或 CMS 驅動，Modal 依設定渲染。  
- **Tab 列表**：目前為固定四類，可改為設定檔「Tab id + labelKey」陣列，ActivityTypeTabs 與 Modal 依設定組裝。  
- **規則與 FAQ**：與前輪文件一致，規則條文、問卷通知、FAQ 題目可由後台或設定驅動，EventRulesNotice／EventAlertsBanner／EventFAQModal 接設定渲染。
