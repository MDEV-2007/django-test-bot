<#
.SYNOPSIS
  Opens public HTTPS tunnels for the local frontend and backend, rewires every config
  file that stores those URLs, and points the Telegram bot at them.

.DESCRIPTION
  Telegram Mini Apps only load over public HTTPS, so testing locally means tunnelling.
  Quick tunnels get a fresh random hostname on every start, and that hostname is written
  in five different places -- this script does all of them in one go:

    backend/.env          WEBAPP_URL, FRONTEND_URL, EXTRA_ALLOWED_HOSTS, FRONTEND_ORIGINS
    frontend/.env.local   NEXT_PUBLIC_API_URL
    frontend/next.config.ts   allowedDevOrigins
    Telegram Bot API      setWebhook, setChatMenuButton

  cloudflared is used rather than ngrok because ngrok's free domains serve an
  interstitial warning page on every HTML request, and the Telegram in-app browser
  has no way to click past it.

  The dev servers are NOT started or restarted here: both read their environment at
  boot, so restart them yourself after this script finishes.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\tg-tunnel.ps1
#>
[CmdletBinding()]
param(
  [int]$FrontendPort = 3500,
  [int]$BackendPort = 8001,
  # Existing tunnels are killed by default so the script never leaves orphans behind
  # holding a hostname nothing points at any more.
  [switch]$KeepExistingTunnels
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 `Set-Content -Encoding utf8` writes a BOM, and a BOM on the first
# line of a .env file becomes part of the first key name -- the setting silently stops
# being read. Everything here is written BOM-less instead.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$root = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $root 'backend\.env'
$frontendEnv = Join-Path $root 'frontend\.env.local'
$nextConfig = Join-Path $root 'frontend\next.config.ts'

foreach ($f in @($backendEnv, $frontendEnv, $nextConfig)) {
  if (-not (Test-Path $f)) { throw "Topilmadi: $f" }
}
# cloudflared is often a loose .exe dropped in a personal bin folder rather than an
# installed program, so PATH alone is not enough to find it.
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $candidates = @(
    (Join-Path $env:USERPROFILE 'bin\cloudflared.exe'),
    (Join-Path $env:LOCALAPPDATA 'cloudflared\cloudflared.exe'),
    'C:\Program Files (x86)\cloudflared\cloudflared.exe',
    'C:\Program Files\cloudflared\cloudflared.exe'
  )
  $cloudflared = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $cloudflared) {
  throw "cloudflared topilmadi. https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
}

function Get-EnvValue([string]$path, [string]$key) {
  $line = Select-String -Path $path -Pattern "^$key=" | Select-Object -First 1
  if ($null -eq $line) { return '' }
  return $line.Line.Substring($key.Length + 1).Trim()
}

function Set-EnvValue([string]$path, [string]$key, [string]$value) {
  $lines = Get-Content $path
  if ($lines -match "^$key=") {
    $lines = $lines | ForEach-Object {
      if ($_ -match "^$key=") { "$key=$value" } else { $_ }
    }
  } else {
    $lines += "$key=$value"
  }
  [System.IO.File]::WriteAllLines($path, [string[]]$lines, $script:utf8NoBom)
}

function Start-QuickTunnel([int]$port, [string]$label) {
  $log = Join-Path $env:TEMP "cf-$label.log"
  if (Test-Path $log) { Remove-Item $log -Force }

  # cloudflared prints the assigned hostname on stderr, so both streams are captured.
  Start-Process -FilePath $script:cloudflared `
    -ArgumentList 'tunnel', '--url', "http://localhost:$port", '--no-autoupdate' `
    -RedirectStandardOutput "$log.out" -RedirectStandardError $log `
    -WindowStyle Hidden | Out-Null

  Write-Host "  $label ($port) tunnel ochilmoqda..." -NoNewline
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 750
    if (Test-Path $log) {
      $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
      if ($null -ne $m) {
        $url = $m.Matches[0].Value
        Write-Host " $url"
        return $url
      }
    }
    Write-Host '.' -NoNewline
  }
  throw "cloudflared $label tunnel manzilini bermadi. Log: $log"
}

if (-not $KeepExistingTunnels) {
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
  # Yangi tunnel eski portni band deb topmasligi uchun jarayon o'chishini kutamiz.
  Start-Sleep -Seconds 1
}

<# BITTA tunnel yetarli: API, media va Telegram webhook'i frontendning O'Z origin'i
   ostidan Django'ga uzatiladi (next.config.ts, rewrites). Shu sababli tunnel manzili
   o'zgarganda frontendni QAYTA YIG'ISH kerak emas — ilgari `NEXT_PUBLIC_API_URL`
   build vaqtida kodga yozilgani uchun har safar qayta yig'ish talab qilinardi. #>
Write-Host 'Tunnel:' -ForegroundColor Cyan
$feUrl = Start-QuickTunnel -port $FrontendPort -label 'frontend'
$feHost = ([uri]$feUrl).Host
# Webhook ham shu tunnel orqali (/telegram/webhook/ Django'ga proksi qilinadi).
$beUrl = $feUrl

Write-Host 'Konfiguratsiya yangilanmoqda:' -ForegroundColor Cyan

Set-EnvValue $backendEnv 'WEBAPP_URL' $feUrl
Set-EnvValue $backendEnv 'FRONTEND_URL' $feUrl
Set-EnvValue $backendEnv 'EXTRA_ALLOWED_HOSTS' $feHost
Set-EnvValue $backendEnv 'FRONTEND_ORIGINS' "http://localhost:$FrontendPort,$feUrl"
Write-Host "  backend/.env"

# `next dev` begona domendan kelgan _next/* so'rovlarini bloklaydi (prod'da ahamiyatsiz).
$cfg = Get-Content $nextConfig -Raw
$cfg = [regex]::Replace($cfg, "allowedDevOrigins: \[[^\]]*\]", "allowedDevOrigins: ['$feHost']")
[System.IO.File]::WriteAllText($nextConfig, $cfg, $utf8NoBom)
Write-Host "  frontend/next.config.ts"

$token = Get-EnvValue $backendEnv 'TELEGRAM_BOT_TOKEN'
$secret = Get-EnvValue $backendEnv 'TELEGRAM_WEBHOOK_SECRET'
if ([string]::IsNullOrWhiteSpace($token)) { throw 'backend/.env ichida TELEGRAM_BOT_TOKEN yo''q' }

Write-Host 'Telegram:' -ForegroundColor Cyan

# Telegram resolves the webhook host itself before accepting it, and its resolver is
# unreliable for freshly issued *.trycloudflare.com names -- it can keep answering
# "Failed to resolve host" long after the name is live everywhere else. Retry a few
# times, then fall back to an ngrok tunnel for the webhook ONLY. (ngrok's free
# interstitial page is served to browsers, not to Telegram's webhook POSTs, so it is
# safe here even though it would break the Mini App itself.)
function Set-TelegramWebhook([string]$url) {
  $body = @{
    url = "$url/telegram/webhook/"
    secret_token = $script:secret
    drop_pending_updates = $true
  } | ConvertTo-Json -Compress
  try {
    $resp = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$script:token/setWebhook" `
      -ContentType 'application/json' -Body $body
    return [bool]$resp.ok
  } catch {
    return $false
  }
}

$webhookSet = $false
foreach ($attempt in 1..3) {
  if (Set-TelegramWebhook $beUrl) { $webhookSet = $true; break }
  Write-Host "  setWebhook urinish $attempt muvaffaqiyatsiz, qayta urinilmoqda..."
  Start-Sleep -Seconds 8
}

if ($webhookSet) {
  Write-Host "  setWebhook: $beUrl"
} else {
  $ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
  if (-not $ngrok) { throw "setWebhook ishlamadi va ngrok ham topilmadi." }

  Write-Host '  Telegram cloudflared hostini yecha olmadi -> webhook uchun ngrok ishlatilmoqda'
  Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 1
  Start-Process -FilePath $ngrok -ArgumentList 'http', "$BackendPort", '--log=stdout' `
    -RedirectStandardOutput (Join-Path $env:TEMP 'ngrok-webhook.log') `
    -RedirectStandardError (Join-Path $env:TEMP 'ngrok-webhook.err.log') `
    -WindowStyle Hidden | Out-Null

  $ngrokUrl = $null
  foreach ($i in 1..20) {
    Start-Sleep -Seconds 1
    try {
      $t = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels'
      $ngrokUrl = ($t.tunnels | Where-Object { $_.public_url -like 'https://*' } | Select-Object -First 1).public_url
    } catch { }
    if ($ngrokUrl) { break }
  }
  if (-not $ngrokUrl) { throw 'ngrok tunnel manzilini bermadi.' }

  if (-not (Set-TelegramWebhook $ngrokUrl)) { throw "setWebhook ngrok bilan ham ishlamadi: $ngrokUrl" }
  Write-Host "  setWebhook: $ngrokUrl (ngrok)"
}

$menu = @{
  menu_button = @{
    type = 'web_app'
    text = 'Ilm Ildizi'
    web_app = @{ url = $feUrl }
  }
} | ConvertTo-Json -Compress -Depth 5
$r = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setChatMenuButton" `
  -ContentType 'application/json' -Body $menu
Write-Host "  setChatMenuButton: $($r.ok)"

$me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe"

Write-Host ''
Write-Host "Tayyor. Bot: @$($me.result.username)" -ForegroundColor Green
Write-Host "  Mini App : $feUrl"
Write-Host "  API      : $beUrl"
Write-Host ''
Write-Host 'Django muhitni faqat startda o''qiydi — uni QAYTA ishga tushiring:' -ForegroundColor Yellow
Write-Host "  python backend\manage.py runserver $BackendPort"
Write-Host 'Frontendga tegish shart emas: API va webhook uning o''z origin''i orqali ketadi.'
