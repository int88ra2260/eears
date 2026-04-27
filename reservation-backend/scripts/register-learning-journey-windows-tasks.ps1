param(
  [Parameter(Mandatory = $true)]
  [string]$SemesterId,

  [string]$NodePath = "node",
  [string]$BackendDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$DailyTime = "07:30",
  [string]$WeeklyTime = "08:00"
)

$dailyScript = Join-Path $BackendDir "scripts\learning-journey-daily-governance.js"
$reconcileScript = Join-Path $BackendDir "scripts\learning-journey-reconcile-semester.js"

if (-not (Test-Path $dailyScript)) {
  throw "Daily governance script not found: $dailyScript"
}
if (-not (Test-Path $reconcileScript)) {
  throw "Reconcile script not found: $reconcileScript"
}

$dailyAction = New-ScheduledTaskAction `
  -Execute $NodePath `
  -Argument "`"$dailyScript`" --semesterId=$SemesterId" `
  -WorkingDirectory $BackendDir
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $DailyTime

$weeklyAction = New-ScheduledTaskAction `
  -Execute $NodePath `
  -Argument "`"$reconcileScript`" --semesterId=$SemesterId" `
  -WorkingDirectory $BackendDir
$weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $WeeklyTime

Register-ScheduledTask `
  -TaskName "EEARS Learning Journey Daily Governance $SemesterId" `
  -Action $dailyAction `
  -Trigger $dailyTrigger `
  -Description "Runs Learning Journey daily governance and records job_runs." `
  -Force | Out-Null

Register-ScheduledTask `
  -TaskName "EEARS Learning Journey Weekly Reconciliation $SemesterId" `
  -Action $weeklyAction `
  -Trigger $weeklyTrigger `
  -Description "Runs Learning Journey semester reconciliation and records job_runs." `
  -Force | Out-Null

Write-Host "Registered Learning Journey scheduled tasks for semester $SemesterId"
