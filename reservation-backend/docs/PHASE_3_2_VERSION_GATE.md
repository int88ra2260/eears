# EEARS Phase 3.2 Version Gate

最後更新：2026-04-01

## Stale Token 定義
- 判定條件：`token.accessVersion !== teachers.accessVersion`
- 無 `accessVersion` token 視為 `0`

## 後端行為
- 錯誤碼：`ACCESS_PROFILE_STALE`
- HTTP status：`401`
- payload：
  - `code`
  - `error`
  - `message`
  - `actionHint: relogin`
  - `latestAccessVersion`

## Observe vs Enforce
- `ACCESS_VERSION_CHECK_ENABLED=false`
  - 不強制，僅沿用既有行為
- `ACCESS_VERSION_CHECK_ENABLED=true`
  - 啟用 version check
  - 是否實際攔截由灰度條件判定（角色/路徑）

## Rollout Flags
- `ACCESS_VERSION_CHECK_ENABLED`（預設 false）
- `ACCESS_VERSION_ENFORCE_ROLES`（CSV，可空）
- `ACCESS_VERSION_ENFORCE_PATH_PREFIXES`（CSV，預設 `/api/admin`）

## 建議 rollout
1. staging：先開 check + admin 路徑 enforce
2. production：先 admin 路徑 enforce
3. 再逐步加角色或擴大路徑

## 回滾
- 立即關閉：`ACCESS_VERSION_CHECK_ENABLED=false`
- 前端會恢復 Phase 3.1 行為

