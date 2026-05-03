param(
  [string]$TaskName = "TradeScope Fyers Token Refresh",
  [string]$Time = "08:45"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$tokenScript = Join-Path $root "scripts\fyers-token.ps1"

if (-not (Test-Path $tokenScript)) {
  Write-Host "Token script not found: $tokenScript" -ForegroundColor Red
  exit 1
}

# Expected format HH:mm (24h)
if ($Time -notmatch '^([01]\d|2[0-3]):[0-5]\d$') {
  Write-Host "Invalid time format. Use HH:mm, e.g. 08:45" -ForegroundColor Red
  exit 1
}

$triggerTime = [DateTime]::ParseExact($Time, "HH:mm", $null)
$actionArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$tokenScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgs
$trigger = New-ScheduledTaskTrigger -Daily -At $triggerTime
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Daily FYERS token refresh launcher for TradeScope" -Force | Out-Null

Write-Host "Scheduled task created/updated:" -ForegroundColor Green
Write-Host "Name: $TaskName"
Write-Host "Time: $Time (daily)"
Write-Host ""
Write-Host "What happens daily:" -ForegroundColor Cyan
Write-Host "1) Token script opens login flow"
Write-Host "2) Auth code auto-capture happens"
Write-Host "3) Supabase secret FYERS_ACCESS_TOKEN auto-update"
