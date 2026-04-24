# EventList 精簡：掃描結果與拆分說明

## 一、掃描結果

### 1. EventList 中仍殘留的非核心 UI（拆分前）

- **FAQ Modal**（約 90 行 JSX）：三 Tab（取消預約、黑名單、活動規定）、各 Tab 內標題／Alert／列表，關閉時 `navigate('/', { replace: true })`。依賴 `activeFAQTab` state、`t`、`closeFAQModal`。
- **提示型 Alert（三塊）**：
  - **問卷通知**：`enabledSurveys.length > 0` 時顯示，含「重要通知」+ 問卷連結（`/survey/choice`），`t('home.notice*')`。
  - **規則一**：`ruleUpdate` + `ruleNoStamp`（補蓋章說明），info alert。
  - **規則二**：`ruleUpdate` + `ruleNoWalkIn`（不開放現場候補），warning alert。
- **活動介紹**：已由 `ActivityIntroModal` 承載，EventList 僅傳 `activeTab`／`onTabChange`、Job Talk 輪播 state（`jobTalkImages`、`currentImageIndex`、`nextImage`／`prevImage`／`goToImage`、`isTransitioning`）與 `t`。本次不更動 ActivityIntroModal 介面與 Job Talk 狀態歸屬。

### 2. 可安全拆出的邊界

- **EventFAQModal**：整塊 FAQ 彈窗 + backdrop，內部自管 `activeFAQTab`。props：`show`、`onClose`、`t`。`onClose` 由 EventList 傳入 `closeFAQModal`（關閉 + navigate），行為不變。
- **EventAlertsBanner**：僅「問卷通知」一條，條件為 `enabledSurveys.length > 0`。props：`enabledSurveys`、`t`。需 `Link` 至 `/survey/choice`。
- **EventRulesNotice**：兩條固定規則 Alert（補蓋章、不開放現場）。props：`t`。無 state，純展示 + dismissible。

### 3. 未在本輪拆分的部分

- **ActivityIntroContent / JobTalkCarousel**：活動介紹內容與 Job Talk 輪播已在 `ActivityIntroModal` 內，輪播 state 與 handlers 仍由 EventList 傳入。若下一輪要進一步精簡 EventList，可將 `jobTalkImages`、`currentImageIndex`、`isTransitioning`、`nextImage`／`prevImage`／`goToImage` 以及 `handleTabChange` 內對 `setCurrentImageIndex(0)` 的邏輯移入 ActivityIntroModal，改為內部 state，EventList 只傳 `initialTab` 與 `onTabChange`（可選）。

---

## 二、拆分策略

1. **EventFAQModal**  
   - 新檔 `components/events/EventFAQModal.js`。  
   - 內部 `useState('cancel')` 管理 `activeFAQTab`。  
   - 渲染：modal 殼、tabs、三塊 tab 內容（與原 EventList 內 JSX 一致）、footer「我知道了」、backdrop。  
   - `show === false` 時 return null；否則渲染 modal + backdrop。  
   - 不改 URL 或 navigate，由父層 `onClose` 負責。

2. **EventAlertsBanner**  
   - 新檔 `components/events/EventAlertsBanner.js`。  
   - `enabledSurveys` 非陣列或長度為 0 時 return null。  
   - 否則渲染單一 alert-warning（問卷通知 + Link），結構與原第一條 alert 一致。

3. **EventRulesNotice**  
   - 新檔 `components/events/EventRulesNotice.js`。  
   - 無條件渲染兩條 alert（info：ruleNoStamp；warning：ruleNoWalkIn），與原第二、三條一致。

4. **EventList 改動**  
   - 移除 `activeFAQTab`、移除 Link 與三塊 alert 及整塊 FAQ modal 的 inline JSX。  
   - 改為：`<EventAlertsBanner enabledSurveys={enabledSurveys} t={t} />`、`<EventRulesNotice t={t} />`、`<EventFAQModal show={showFAQModal} onClose={closeFAQModal} t={t} />`。  
   - 保留：`enabledSurveys`、`showFAQModal`、`closeFAQModal`、`showIntroductionModal`、ActivityIntroModal 與 Job Talk 相關 state/handlers、日曆、預約／查詢 modal、載入與活動列表邏輯。

5. **低風險與回滾**  
   - 未改預約、查詢、日曆、API、URL 行為。回滾時還原 EventList 的 JSX 並刪除三支新元件即可。

---

## 三、修改檔案清單

| 類型 | 路徑 |
|------|------|
| 新增 | `src/components/events/EventFAQModal.js` |
| 新增 | `src/components/events/EventAlertsBanner.js` |
| 新增 | `src/components/events/EventRulesNotice.js` |
| 修改 | `src/components/EventList.js`（移除 FAQ/alert inline JSX，改為使用上述三元件；移除 `activeFAQTab`、Link import） |
| 新增 | `docs/event-list-orchestration-split.md`（本文件） |

**未改動**：ActivityIntroModal、EventCalendarSection、ReservationSearchModal、EventDetail、translations、路由與 API。

---

## 四、仍留在 EventList 的邏輯

- **State**：`events`、`loading`、`showSearchModal`、`showIntroductionModal`、`showFAQModal`、`selectedEvent`、`activeTab`、`enabledSurveys`、Job Talk 輪播（`currentImageIndex`、`isTransitioning`、`jobTalkImages`）。
- **Effect**：`initialTabProp` 同步、`?section=faq`／`?section=activities` 開 modal、`fetchEnabledSurveys`、`fetchEvents`。
- **Handlers**：`closeFAQModal`、`closeIntroductionModal`、`handleTabChange`、`nextImage`／`prevImage`／`goToImage`、`handleEventClick`。
- **業務邏輯**：`canReserveAndReason(evt)`。
- **編排**：載入中 UI、EventAlertsBanner、EventRulesNotice、按鈕列（查詢預約／FAQ／活動介紹）、EventCalendarSection、ReservationSearchModal、EventDetail、ActivityIntroModal、EventFAQModal。

---

## 五、適合下一輪再配置化的文案或規則

- **規則條文**：`home.ruleNoStamp`、`home.ruleNoWalkIn` 等目前已在 `translations.js`，若學期或規定改版，可改由後台或設定檔驅動「是否顯示」「條文 key 列表」，再由 EventRulesNotice 依 key 渲染多條。
- **問卷通知**：目前依 `enabledSurveys.length > 0` 顯示，文案為 `home.notice*`。下一輪可改為後台設定「通知開關 + 文案 key / 連結」，EventAlertsBanner 接設定再渲染。
- **FAQ 內容**：三 Tab 的問答目前皆為 `faq.*` 翻譯鍵。可改為由 CMS 或設定檔提供「Tab id + 區塊 key 陣列」，EventFAQModal 依設定組裝 Tab 與內容，方便增減題目或 Tab。
- **活動介紹與 Job Talk 輪播**：若將 Job Talk 輪播 state 與 `handleTabChange` 內邏輯移入 ActivityIntroModal，EventList 可再減少 state/handlers，更純粹擔任 container。
