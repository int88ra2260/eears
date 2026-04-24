# scripts/smoke-test-phase3.ps1
# Phase 3 DSS smoke test (PowerShell)
#
# 使用方式：
# 1) 先確保後端已啟動（例如：npm run start）
# 2) 在 PowerShell 執行：
#    powershell -ExecutionPolicy Bypass -File ".\scripts\smoke-test-phase3.ps1"

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Username = "emieearsweb",
  [string]$Password = "5808",
  [string]$Semester = "114-1",
  [string]$FromSemester = "113-2",
  [string]$ToSemester = "115-1",
  [string]$StudentId = "TEST001",
  [string]$ReportFormat = "xlsx"
)

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Token
  )

  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }
  $headers["Accept"] = "application/json"

  $res = Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType "application/json" -ErrorAction Stop
  return $res
}

function Invoke-StatusRequest {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Token
  )

  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }
  $headers["Accept"] = "application/octet-stream"

  $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
  return $response
}

Write-Host "=== Phase 3 DSS Smoke Test ==="
Write-Host "BaseUrl=$BaseUrl Semester=$Semester From=$FromSemester To=$ToSemester StudentId=$StudentId Format=$ReportFormat"

try {
  Write-Host "`n[1] Login to get token ..."
  $loginUrl = "$BaseUrl/api/login"
  $loginBody = @{
    username = $Username
    password = $Password
  } | ConvertTo-Json

  $loginRes = Invoke-RestMethod -Method Post -Uri $loginUrl -ContentType "application/json" -Body $loginBody -ErrorAction Stop
  $token = $loginRes.token
  if (-not $token) { throw "Login succeeded but token missing in response." }
  Write-Host "Login OK. Token acquired."

  Write-Host "`n[2] Trends overview ..."
  $trendsOverviewUrl = "$BaseUrl/api/analytics/trends/overview?fromSemester=$FromSemester&toSemester=$ToSemester"
  $trendsOverview = Invoke-JsonRequest -Method "GET" -Url $trendsOverviewUrl -Token $token
  Write-Host "Trends overview OK. Semesters=$($trendsOverview.semesters.Count)"

  Write-Host "`n[3] Predict risk ..."
  $predictUrl = "$BaseUrl/api/analytics/risk/predict/$StudentId?semester=$Semester"
  $predictRes = Invoke-JsonRequest -Method "GET" -Url $predictUrl -Token $token
  Write-Host "Predict OK. predictedRisk=$($predictRes.predictedRisk) confidence=$($predictRes.confidence)"

  Write-Host "`n[4] Reports overview download ..."
  $reportsUrl = "$BaseUrl/api/reports/overview?semester=$Semester&fromSemester=$FromSemester&toSemester=$ToSemester&format=$ReportFormat"
  $reportRes = Invoke-StatusRequest -Method "GET" -Url $reportsUrl -Token $token
  Write-Host "Report download OK. StatusCode=$($reportRes.StatusCode) ContentType=$($reportRes.ContentType)"

  Write-Host "`n=== Smoke Test Completed Successfully ==="
} catch {
  Write-Host "`n=== Smoke Test FAILED ===" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}

