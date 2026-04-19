param(
  [switch]$Setup,
  [string]$AppId = "GCANHWSSCK-100",
  [string]$RedirectUri = "https://127.0.0.1",
  [string]$SecretId,
  [switch]$UseDefaults,
  [string]$AuthCode
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $root ".fyers"
$configPath = Join-Path $stateDir "config.json"
$secretPath = Join-Path $stateDir "secret.xml"

function Ensure-StateDir {
  if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir | Out-Null
  }
}

function Save-Config([string]$ClientId, [string]$Uri) {
  Ensure-StateDir
  $payload = @{ appId = $ClientId; redirectUri = $Uri } | ConvertTo-Json
  Set-Content -Path $configPath -Value $payload -Encoding UTF8
}

function Load-Config {
  if (-not (Test-Path $configPath)) {
    return $null
  }
  return Get-Content -Raw $configPath | ConvertFrom-Json
}

function Save-Secret([string]$PlainSecret) {
  Ensure-StateDir
  $secure = ConvertTo-SecureString -String $PlainSecret -AsPlainText -Force
  $secure | Export-Clixml -Path $secretPath
}

function Load-Secret {
  if (-not (Test-Path $secretPath)) {
    return $null
  }
  $secure = Import-Clixml -Path $secretPath
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Get-Sha256Hex([string]$text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  return ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLowerInvariant()
}

function Extract-Code([string]$inputText) {
  if ([string]::IsNullOrWhiteSpace($inputText)) {
    return $null
  }

  if ($inputText -match "auth_code=([^&\s]+)") {
    return $Matches[1]
  }

  if ($inputText -match "[?&]code=([^&\s]+)") {
    return $Matches[1]
  }

  if ($inputText -match "^[A-Za-z0-9._-]+$") {
    return $inputText
  }

  return $null
}

function Setup-Mode {
  Write-Host "=== FYERS QUICK SETUP ===" -ForegroundColor Cyan
  $id = $AppId
  $uri = $RedirectUri
  $secretPlain = $SecretId

  if (-not $UseDefaults) {
    $idInput = Read-Host "Fyers App ID (default: $AppId)"
    if (-not [string]::IsNullOrWhiteSpace($idInput)) { $id = $idInput }

    $uriInput = Read-Host "Redirect URI (default: $RedirectUri)"
    if (-not [string]::IsNullOrWhiteSpace($uriInput)) { $uri = $uriInput }

    if ([string]::IsNullOrWhiteSpace($secretPlain)) {
      $secret = Read-Host "Fyers Secret ID" -AsSecureString
      $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
      try {
        $secretPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
      } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($secretPlain)) {
    Write-Host "Secret ID required hai. Setup abort." -ForegroundColor Red
    exit 1
  }

  Save-Config -ClientId $id -Uri $uri
  Save-Secret -PlainSecret $secretPlain

  Write-Host "Setup complete. Secret local machine me encrypted save ho gaya." -ForegroundColor Green
  Write-Host "Daily token ke liye run karo: .\\scripts\\fyers-token.ps1" -ForegroundColor Yellow
}

if ($Setup) {
  Setup-Mode
  exit 0
}

$config = Load-Config
if (-not $config) {
  Write-Host "Pehle one-time setup run karo:" -ForegroundColor Yellow
  Write-Host ".\\scripts\\fyers-token.ps1 -Setup"
  exit 1
}

$secret = Load-Secret
if ([string]::IsNullOrWhiteSpace($secret)) {
  Write-Host "Encrypted secret missing. Setup dobara run karo:" -ForegroundColor Yellow
  Write-Host ".\\scripts\\fyers-token.ps1 -Setup"
  exit 1
}

$clientId = [string]$config.appId
$redirect = [string]$config.redirectUri
$state = "tradescope"
$authUrl = "https://api-t1.fyers.in/api/v3/generate-authcode?client_id=$([uri]::EscapeDataString($clientId))&redirect_uri=$([uri]::EscapeDataString($redirect))&response_type=code&state=$state"

$raw = $AuthCode
if ([string]::IsNullOrWhiteSpace($raw)) {
  Write-Host "Browser auth page open ho rahi hai..." -ForegroundColor Cyan
  Start-Process $authUrl | Out-Null
  Write-Host ""
  Write-Host "Login ke baad jo redirect URL khule, usko yahan paste karo." -ForegroundColor Yellow
  Write-Host "(Ya direct auth_code paste kar sakte ho)"
  $raw = Read-Host "Redirect URL / auth_code"
}
$authCode = Extract-Code $raw

if ([string]::IsNullOrWhiteSpace($authCode)) {
  Write-Host "auth_code parse nahi hua. URL ya code dubara paste karo." -ForegroundColor Red
  exit 1
}

$appIdHash = Get-Sha256Hex "$clientId`:$secret"
$body = @{ grant_type = "authorization_code"; appIdHash = $appIdHash; code = $authCode } | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Uri "https://api-t1.fyers.in/api/v3/validate-authcode" -Method Post -ContentType "application/json" -Body $body
} catch {
  Write-Host "Token request failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $errBody = $reader.ReadToEnd()
      if (-not [string]::IsNullOrWhiteSpace($errBody)) {
        Write-Host "FYERS API error body:" -ForegroundColor Yellow
        Write-Host $errBody -ForegroundColor Yellow
      }
    } catch {
      # Ignore stream parsing issues and continue with hints.
    }
  }
  Write-Host "Troubleshooting:" -ForegroundColor Yellow
  Write-Host "1) Redirect URI FYERS app me exact same hona chahiye: $redirect" -ForegroundColor Yellow
  Write-Host "2) Secret ID current hona chahiye (rotate hua ho to setup dobara)." -ForegroundColor Yellow
  Write-Host "3) auth code one-time hota hai, login ke turant baad use karo." -ForegroundColor Yellow
  exit 1
}

$token = $resp.access_token
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "access_token nahi mila. Response check karo:" -ForegroundColor Red
  $resp | ConvertTo-Json -Depth 6
  exit 1
}

$token | Set-Clipboard
Write-Host "" 
Write-Host "Access token generated and clipboard me copy ho gaya." -ForegroundColor Green
Write-Host "Is token ko frontend ke FYERS ACCESS TOKEN field me paste karo." -ForegroundColor Green

try {
  Write-Host "Supabase secret update kar raha hoon..." -ForegroundColor Cyan
  npx supabase secrets set FYERS_ACCESS_TOKEN=$token | Out-Null
  Write-Host "Supabase me FYERS_ACCESS_TOKEN updated. End users ko token enter nahi karna padega." -ForegroundColor Green
} catch {
  Write-Host "Supabase secret auto-update fail hua. Manually run karo:" -ForegroundColor Yellow
  Write-Host "npx supabase secrets set FYERS_ACCESS_TOKEN=<YOUR_NEW_TOKEN>" -ForegroundColor Yellow
}
