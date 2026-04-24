# EEARS Phase 2.6 封版權限矩陣（給人看版）

最後更新：2026-04-01  
適用範圍：Phase 2.6 + Phase 2.6.1（含 `DELETE /api/reservations/:id` 補強）

---

## 封版說明

本版確認已完成下列收斂目標：

1. 問卷匯出鏈路：`permission + survey access(scope)`  
2. 活動報表 summary 鏈路：`permission + event access(scope)`  
3. 英檢審核清單：view/review/export 權限拆分  
4. event 深層操作鏈：預約名單、簽到、違規、auto-check 全部收斂到 `permission + event access`  
5. `DELETE /api/reservations/:id`：前台自助取消與後台管理刪除語意分流完成

---

## 活動後台權限矩陣

| 動作 | 主要權限 | 額外條件 | event access / scope |
|---|---|---|---|
| view reservations | `can_view_reservations` | - | 必要 |
| export reservations | `can_export_reservations` | - | 必要 |
| checkin | `can_checkin_students` | 僅活動當日 | 必要 |
| supplemental checkin | `can_checkin_students` | 另需 `can_manage_events` | 必要 |
| manage violations | `can_manage_violations` | - | 必要 |
| auto-check | `can_manage_blacklist` | 高風險流程 | 必要 |
| delete reservation（後台） | `can_manage_events` | reservation 必須屬於可操作 event | 必要 |
| cancel reservation（前台自助） | 驗證碼機制 | 2 小時限制 + cancellationCode | 不走後台 scope |

---

## 核心原則（對齊封版）

1. **刪改操作不等於檢視權限**：例如刪除預約不可用 `can_view_reservations` 放行。  
2. **所有活動後台操作都要綁 event access**：避免跨 scope 操作。  
3. **前台自助流程與後台管理流程語意分離**：同 API 可分流，但規則必須可解釋。  
4. **保守預設**：不確定是否能放行時，先拒絕（403）再評估權限設計。

---

## 封版後的下一階段（僅規劃）

Phase 3 再處理：

- JWT -> 即時權限同步
- permission table
- 更完整 audit log
- fine-grained scope

---

## Phase 3.1 狀態註記

- 已落地 permission table + dual-write + accessVersion。
- 目前仍維持 JSON source of truth，不切主讀。
- 詳細請見：`docs/PHASE_3_1_IMPLEMENTATION_NOTES.md`

