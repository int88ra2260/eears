# EEARS Phase 3.3 Audit Model

最後更新：2026-04-01

## 欄位（重點）
- `actorId`（既有欄位對應 `operatorId`）
- `entityType`
- `entityId`
- `action`
- `beforeData`
- `afterData`
- `changedFields`
- `requestId`
- `traceId`（3.3 新增）
- `changeReason`（3.3 新增）
- `createdAt`

## 權限治理納管
- `create_teacher`
- `update_teacher`
- `reset_teacher_password`
- `change_own_password`
- 權限治理類操作會附：
  - `beforeData/afterData`
  - `changedFields`
  - `changeReason`

## 高風險操作納管原則
- 黑名單/違規
- 後台刪除預約
- post-event auto-check
- 系統設定/feature flags 變更

> 既有路由若尚未傳入 `changeReason/traceId`，仍可相容；建議逐步補齊。

