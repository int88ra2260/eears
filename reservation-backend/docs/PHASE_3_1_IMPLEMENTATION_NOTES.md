# EEARS Phase 3.1 Implementation Notes

最後更新：2026-04-01

## 目標
- 新增 permission table 與 accessVersion 欄位
- 透過 dual-write 保持 JSON（SoT）與 table 同步
- 預留 table read 與 accessVersion observe 模式（不強制）

## Source of Truth
- Phase 3.1 期間：`teachers.permissions` / `teachers.scopes`（JSON）仍為 SoT
- 新 table 為同步層，不切主讀路徑

## Feature Flags
- `ACCESS_PROFILE_ENABLE_TABLE_READ`（預設 `false`）
  - 開啟後：允許 accessProfile 讀取 table source（仍可 JSON-first）
- `ACCESS_PROFILE_TABLE_FIRST`（預設 `false`）
  - 僅在 `ACCESS_PROFILE_ENABLE_TABLE_READ=true` 時有效
  - `false`: JSON-first
  - `true`: table-first（3.1 不建議正式啟用）
- `ACCESS_VERSION_CHECK_ENABLED`（預設 `false`）
  - 開啟後只做 observe（記錄 mismatch），不拒絕請求
  
## Phase 3.2 註記
- 3.2 開始可 enforce stale token（依 rollout 條件）
- 詳細見：`docs/PHASE_3_2_VERSION_GATE.md`

## Phase 3.3 註記
- 3.3 改為 table-first 主讀（JSON 僅 fallback）
- 詳細見：`docs/PHASE_3_3_TABLE_FIRST_CUTOVER.md`

## accessVersion bump 規則
以下欄位異動會 bump：
- `role`
- `teacherLevel`
- `permissions`
- `scopes`
- `isActive`

以下欄位異動不 bump（例）：
- `name`
- `email`
- `department`
- `phone`
- `mustResetPassword`
- `disabledReason`

## Backfill / Consistency Check
- backfill：`npm run access:backfill`
- consistency check：`npm run access:check-consistency`

兩支 script 皆可重跑（idempotent）。

