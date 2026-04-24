# UTF-8 with BOM required for Windows PowerShell 5.1 on non-English locales.
param(
    [Parameter(Mandatory = $true)][string]$Level,
    [Parameter(Mandatory = $true)][string]$Message,
    [string]$LogDir = "D:\EEARS_backup\logs"
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$path = Join-Path $LogDir "backup.log"
$line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
Add-Content -LiteralPath $path -Value $line -Encoding utf8
