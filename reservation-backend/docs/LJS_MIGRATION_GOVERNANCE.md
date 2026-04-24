# LJS Migration Governance（Todo 2）

此文件只描述治理層（batch/checkpoint/quarantine）操作方式，不包含真實資料搬遷規則。

## CLI 用法

在 `reservation-backend` 目錄執行：

```bash
node scripts/run-learning-journey-migration.js [options]
```

## 7.5B 最短重現流程

1. 安裝依賴（Windows）

```bash
"C:\Program Files\nodejs\npm.cmd" install
```

2. seed 非標準 skill fixture

```bash
npm run ljs:seed:nonstandard
```

3. 跑指定 stage migration（MVP）

```bash
npm run ljs:migration -- --batch-key=phase75b-nonstandard --stages=students,exam_attempts
```

4. 跑固定樣本驗證

```bash
npm run ljs:verify:sample
```

5. 觀察表

- `migration_batch`
- `migration_checkpoint`
- `migration_quarantine`
- `exam_attempts`
- `exam_attempt_skill_scores`

治理 migration script 會預設以 `NODE_ENV=migration` 執行，確保只依賴 migration，不觸發 app/server 的 `sequelize.sync()`。

可用參數：

- `--dry-run`
  - 啟用 dry-run 模式。
- `--batch-key=<key>`
  - 指定批次識別。
- `--from-stage=<stage>`
  - 從指定 stage 開始執行，先前 stages 會被標記為 `skipped`。
- `--simulate-failure-stage=<stage>`
  - 模擬指定 stage 失敗（治理驗證用）。
  - 支援 `students` / `exam_registrations` / `exam_attempts` / `activity_participations`。
  - 也支援別名：`registrations`、`attempts`、`activities`。
- `--mock-quarantine`
  - 觸發 mock quarantine（治理驗證用）。
- `--checkpoint-batch-key=<key> --show-checkpoints-only`
  - 查詢某批次 checkpoints。

## Dry-run 行為定義

`--dry-run` 下：

- 會寫入：
  - `migration_batch`
  - `migration_checkpoint`
- 不會寫入：
  - 正式業務資料表（students/exam_registrations/exam_attempts/activity_participations）
  - `migration_quarantine` 正式列（僅在 memory summary 記錄 quarantined 統計）

## Batch 狀態規則

- `completed`
  - 所有應執行 stage 成功。
- `failed`
  - 任一 stage 發生致命錯誤，runner 中止。
- `partial`
  - 本批次使用 `--from-stage`，前置 stages 以 `skipped` 落 checkpoint，後續 stages 成功。
  - `partial` 不是錯誤狀態，而是「有意識的部分執行」。

## 驗證建議指令

### A. Dry-run 正常

```bash
node scripts/run-learning-journey-migration.js --dry-run --batch-key=todo2-dryrun-check
```

### B. Dry-run + mock quarantine

```bash
node scripts/run-learning-journey-migration.js --dry-run --batch-key=todo2-dryrun-quarantine --mock-quarantine
```

### C. 模擬 stage failure

```bash
node scripts/run-learning-journey-migration.js --batch-key=todo2-failure-check --simulate-failure-stage=attempts
```

### D. 驗證 from-stage

```bash
node scripts/run-learning-journey-migration.js --dry-run --batch-key=todo2-from-stage-check --from-stage=attempts
```

## Governance 表與欄位（實際 DB）

目前治理層表名為：

- `migration_batch`
- `migration_checkpoint`
- `migration_quarantine`

`summary_json` 會保存 `stages` + `totals` + `checkpoints`，可直接用於 runtime 驗證報告整理。

## 一次跑三種治理驗證

```bash
node scripts/verify-learning-journey-migration-governance.js
```

此腳本會嘗試：

1. normal run
2. dry-run
3. simulated failure

並輸出 batch/checkpoint/quarantine 摘要。
