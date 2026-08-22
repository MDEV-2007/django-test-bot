<#
.SYNOPSIS
  Starts the whole project for a demo with one command.

.DESCRIPTION
  Two modes:

    Local (default)   Django on :8001 and the Next.js production build on :3500.
                      The browser is the only client, no internet needed at all.
                      This is the mode to use when showing the project on a laptop:
                      nothing external can fail.

    -Tunnel           Same as above, plus a public HTTPS tunnel and the Telegram bot
                      pointed at it, so the Mini App can be shown on a phone.
                      Needs internet.

  The frontend talks to Django through its own origin (next.config.ts rewrites), so a
  changing tunnel URL never requires a rebuild.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\demo.ps1
  powershell -ExecutionPolicy Bypass -File scripts\demo.ps1 -Tunnel
#>
[CmdletBinding()]
param(
  [switch]$Tunnel,
  # Rebuilds the frontend first. Only needed after changing frontend code.
  [switch]$Build,
  [int]$FrontendPort = 3500,
  [int]$BackendPort = 8001
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = 'C:\Users\Murodulla\AppData\Local\Programs\Python\Python314\python.exe'
if (-not (Test-Path $python)) { $python = (Get-Command python).Source }

function Get-EnvValueFromFile([string]$path, [string]$key) {
  $line = Select-String -Path $path -Pattern "^$key=" -Encoding utf8 | Select-Object -First 1
  if ($null -eq $line) { return '' }
  return $line.Line.Substring($key.Length + 1).Trim()
}

function Stop-Port([int]$port) {
  # Eski jarayon portni band qilib turgan bo'lsa demo jim turib ishlamaydi —
  # shuning uchun avval tozalanadi.
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch { }
  }
}

function Wait-Url([string]$url, [int]$seconds = 60) {
  for ($i = 0; $i -lt $seconds * 2; $i++) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
      return $true
    } catch {
      if ($_.Exception.Response) { return $true }  # 4xx ham "server javob beryapti" degani
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

Write-Host 'IlmIldizi demo' -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $backend '.env'))) {
  throw "backend\.env topilmadi. backend\.env.example dan nusxa oling."
}

# --- Frontend build ------------------------------------------------------------
$hasBuild = Test-Path (Join-Path $frontend '.next\BUILD_ID')
if ($Build -or -not $hasBuild) {
  Write-Host '  frontend yig`ilmoqda (bir daqiqagacha)...' -NoNewline
  Push-Location $frontend
  try {
    & npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'next build muvaffaqiyatsiz. `npm run build` ni qo`lda ishga tushiring.' }
  } finally { Pop-Location }
  Write-Host ' tayyor'
}

# --- Tunnel (agar so'ralgan bo'lsa) --------------------------------------------
# Tunnel serverlardan OLDIN ko'tariladi: u backend/.env ni yangilaydi (WEBAPP_URL,
# FRONTEND_URL, ruxsat etilgan hostlar), Django esa muhitni faqat ishga tushganda
# o'qiydi. Aks holda bot eski manzilni ishlatib qolardi.
if ($Tunnel) {
  & (Join-Path $PSScriptRoot 'tg-tunnel.ps1') -FrontendPort $FrontendPort -BackendPort $BackendPort
  Write-Host ''
}

# --- Backend -------------------------------------------------------------------
Stop-Port $BackendPort
Push-Location $backend
try {
  & $python manage.py migrate --noinput 2>&1 | Out-Null
} finally { Pop-Location }

# Serverlar yashirin oynada ishlaydi — chiqishi yozilmasa, xatolik yuz berganda
# hech qanday iz qolmaydi (bot javob bermaganda aynan shu muammo bo'lgan).
$logDir = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

Start-Process -FilePath $python `
  -ArgumentList 'manage.py', 'runserver', "127.0.0.1:$BackendPort", '--noreload' `
  -WorkingDirectory $backend -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir 'backend.out.log') `
  -RedirectStandardError (Join-Path $logDir 'backend.err.log') | Out-Null

if (-not (Wait-Url "http://127.0.0.1:$BackendPort/api/auth/config/" 60)) {
  throw "Backend $BackendPort portida ko`tarilmadi."
}
Write-Host "  backend  : http://127.0.0.1:$BackendPort" -ForegroundColor Green

# --- Frontend ------------------------------------------------------------------
Stop-Port $FrontendPort
Start-Process -FilePath 'npm.cmd' `
  -ArgumentList 'run', 'start', '--', '--port', "$FrontendPort" `
  -WorkingDirectory $frontend -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir 'frontend.out.log') `
  -RedirectStandardError (Join-Path $logDir 'frontend.err.log') | Out-Null

if (-not (Wait-Url "http://127.0.0.1:$FrontendPort/" 90)) {
  throw "Frontend $FrontendPort portida ko`tarilmadi."
}
Write-Host "  frontend : http://localhost:$FrontendPort" -ForegroundColor Green

Write-Host ''
Write-Host 'Demo tayyor.' -ForegroundColor Yellow
Write-Host "  Brauzer  : http://localhost:$FrontendPort"
Write-Host "  Loglar   : logsackend.err.log, logsrontend.err.log"

if ($Tunnel) {
  $public = Get-EnvValueFromFile (Join-Path $backend '.env') 'WEBAPP_URL'
  Write-Host "  Ochiq    : $public"
  Write-Host "  Telegram : botni oching va /start bosing"
} else {
  Write-Host ''
  Write-Host 'Telefonda / Telegram Mini App`da ko`rsatish uchun: -Tunnel bayrog`i bilan ishga tushiring.'
}
