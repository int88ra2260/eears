# 模組化後驗收 — Smoke Test 結果

本文件為「模組化後驗收與文件整理」工作之 Smoke Test 產出。  
**執行方式**：以靜態審查（code trace）為主；build/lint 請於本機執行 `npm run build`、`npm run lint` 驗證。

---

## A1. EnglishTestManagement smoke test（靜態審查）

| 區塊 | 檢查項 | 對應 state / hook / handler | 結果 |
|------|--------|-----------------------------|------|
| 列表與篩選 | 狀態標籤、搜尋、進階篩選、排序、分頁、stats / todayNewCount | useEnglishTestRegistrations（statusFilter, searchTerm, advancedFilters, sortConfig, loadRegistrations, stats, todayNewCount） | ✅ 對應正確 |
| Detail | 查看詳情、上一筆/下一筆、跨頁、關閉還原捲動、URL ?id= | useEnglishTestDetail（handleViewDetail, handleNavigatePrevious/Next, handleCloseDetailModal, fetchPageAndOpenAt）；URL 的 useEffect 呼叫 handleViewDetail | ✅ 對應正確 |
| Status / Rejection | 快速更新、狀態 Modal、revision/failed→rejection、performStatusUpdate 串接 | useEnglishTestStatusUpdate + useEnglishTestRejection；rejectionApiRef 串接 openRejectionModal / setShowRejectionModal | ✅ 對應正確 |
| Quick Review | 開啟、下一筆、approve、reject、跨頁載入 | useEnglishTestQuickReview（handleOpenQuickReview, handleQuickReviewNext, handleQuickReviewApprove, handleQuickReviewReject, fetchNextPageForQuickReview） | ✅ 對應正確 |
| Bulk | selectedRows、bulk approve/reject/success/delete | useEnglishTestBulkActions（selectedRows, setSelectedRows, handleBulkApprove/Reject/SetSuccess/Delete） | ✅ 對應正確 |
| Export / Emails | export excel、export photos、send success/failed/group_promo | useEnglishTestExport（handleExport, handleExportPhotos, exportStatusFilter）；useEnglishTestEmails（handleSendStatusEmails, sendingEmails） | ✅ 對應正確 |
| Analytics | mainTab === analytics 時載入 Q21 | useEnglishTestAnalytics（infoSourceStats, analyticsLoading）；useEffect(mainTab, loadInfoSourceStats) 在 hook 內 | ✅ 對應正確 |
| Detail 內更新 | handleUpdateRegistration、handleUploadRegistrationFiles | useEnglishTestAdminUpdate；DetailModalWithTabs 接收 onUpdateRegistration、onUploadRegistrationFiles | ✅ 對應正確 |
| ConfirmModal | 單筆刪除、發信確認、Esc 關閉 | useConfirmModal（openConfirm, closeConfirm）；handleDelete 呼叫 openConfirm；useEnglishTestEmails 接收 openConfirm；Esc 呼叫 closeConfirm | ✅ 對應正確 |
| Esc 關閉順序 | confirm → rejection → status → detail → quickReview | useEffect 內依序 closeConfirm、handleCloseRejectionModal、setShowStatusModal(false)、handleCloseDetailModal、setShowQuickReview(false)+setQuickReviewIndex(-1) | ✅ 對應正確 |

**結論（A1）**：目前未發現明顯回歸；各功能皆對應到預期 hook / handler / props。

---

## A2. AdminHome / reservation admin flow smoke test（靜態審查）

| 區塊 | 檢查項 | 負責 hook / component | 結果 |
|------|--------|------------------------|------|
| 活動報表與預約流程 | EventReportTable、AddEventForm、EditEventModal、DeleteEventConfirmModal、BatchAddEventsModal | components/admin/home/*；活動 CRUD 與學期/類型 state 在 AdminHome | ✅ 對應正確 |
| 預約詳情與違規 | ReservationDetailModal、ViolationFormModal、ImportCardExcelModal | useReservationAdminFlow 提供 showReservationModal、openReservationDetail、closeReservationDetail、showViolationModal、violationData、openViolationModal、handleRecordEventViolation、showImportModal、handleImportExcel 等 | ✅ 對應正確 |
| useReservationAdminFlow | currentEvent、reservationData、eventViolations、modal 開關、search/sort/reservationList、checkin、delete reservation、canCancelReservation、violation flow、batch no-show、auto-check、import excel | useReservationAdminFlow.js 匯出完整；AdminHome 傳入 token、showSuccessMessage、showErrorMessage、isEventToday、hasAdminRights | ✅ 對應正確 |

**結論（A2）**：目前未發現明顯回歸；AdminHome 與 useReservationAdminFlow、admin/home 子元件之串接正確。

---

## A3. App routing / pages smoke test（靜態審查）

| 檢查項 | 說明 | 結果 |
|--------|------|------|
| pages/ 與 pages/admin/ wrapper | AdminHomePage、EnglishTestManagementPage 等僅做 import component + return \<Component /> | ✅ 完整 |
| App.js 引入 | Routes 使用 AdminHome、EnglishTestManagement 等，實際為 Page wrapper 的 default export | ✅ 從 pages/admin/* 正確引入 |
| PublicLayout / AdminLayout | 公開路由在 PublicLayout 內；/admin 下為 AdminLayout 子路由 | ✅ 未斷裂 |
| Survey / English test routes | /survey/*、/register/english-test/*、/admin/english-test、/admin/english-test-tracking | ✅ 路由存在且指向正確頁面 |

**結論（A3）**：目前未發現明顯回歸；路由與頁面 wrapper 一致。

---

## A4. Build / Lint 層級檢查

| 項目 | 說明 |
|------|------|
| Build | 本輪未在執行環境中執行 `npm run build`（環境無 npm）。**請於本機執行** `npm run build` 確認產出無誤。 |
| Lint | 本輪未執行 `npm run lint`。**請於本機執行** `npm run lint` 或 `npm run lint:fix`。 |

若 build 或 lint 失敗，請將錯誤訊息記錄於此文件下方「補修項目」並依序修復。

---

## A5. Smoke test 結果摘要

- **通過項目**：A1（EnglishTestManagement 全區塊）、A2（AdminHome / useReservationAdminFlow）、A3（App routing / pages）之靜態審查均通過。
- **有風險但未證實故障的項目**：無。建議本機再跑一輪 build + lint 以排除編譯與規範問題。
- **確認需要修補的項目**：無（靜態審查未發現邏輯錯誤或錯接）。

**整體**：目前未發現明顯回歸；可視為本階段穩定版本，惟請於本機完成 build 與 lint 以達完整驗收。
