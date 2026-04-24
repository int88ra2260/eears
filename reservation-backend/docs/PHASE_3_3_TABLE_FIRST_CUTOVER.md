# EEARS Phase 3.3 Table-first Cutover

最後更新：2026-04-01

## Source of Truth
- 主來源：`role_permissions` + `user_permission_overrides` + `user_scopes`
- JSON (`teachers.permissions/scopes`)：
  - 非主讀
  - 僅 fallback（可關閉）
  - 用於短期回滾保險

## 讀取模式與旗標
- `ACCESS_PROFILE_ENABLE_TABLE_READ`（預設 `true`）
- `ACCESS_PROFILE_TABLE_FIRST`（預設 `true`）
- `ACCESS_PROFILE_JSON_FALLBACK_ENABLED`（預設 `true`，可逐步關閉）

## 寫入模式與旗標
- `ACCESS_PROFILE_JSON_MIRROR_WRITE`（預設 `false`）
  - `false`：停寫 JSON（3.3 建議）
  - `true`：保留 mirror write（回滾觀察期用）

## RolePermissions 接管
- role key 規則：
  - `admin`
  - `worker`
  - `teacher:executive`
  - `teacher:et_manager`
  - `teacher:if_manager`
  - `teacher:jt_manager`
  - `teacher:regular`
- 初始化腳本：
  - `npm run access:seed-role-permissions`

## 一致性檢查
- `npm run access:check-consistency`
- 會輸出：
  - raw table vs JSON 差異
  - effective（table_first vs json_first）差異

## JSON 退場（3.3 採保守策略）
- 本階段不刪 schema（避免回滾成本過高）
- 先完成：
  - table-first 主讀
  - JSON 停寫
  - fallback 觀察期
- 下一 release 週期確認 mismatch 穩定後，再評估刪欄位 migration。

