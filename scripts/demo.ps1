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

# --- Backend -------------------------------------------------------------------
Stop-Port $BackendPort
Push-Location $backend
try {
  & $python manage.py migrate --noinput 2>&1 | Out-Null
} finally { Pop-Location }

Start-Process -FilePath $python `
  -ArgumentList 'manage.py', 'runserver', "127.0.0.1:$BackendPort", '--noreload' `
  -WorkingDirectory $backend -WindowStyle Hidden | Out-Null

if (-not (Wait-Url "http://127.0.0.1:$BackendPort/api/auth/config/" 60)) {
  throw "Backend $BackendPort portida ko`tarilmadi."
}
Write-Host "  backend  : http://127.0.0.1:$BackendPort" -ForegroundColor Green

# --- Frontend ------------------------------------------------------------------
Stop-Port $FrontendPort
Start-Process -FilePath 'npm.cmd' `
  -ArgumentList 'run', 'start', '--', '--port', "$FrontendPort" `
  -WorkingDirectory $frontend -WindowStyle Hidden | Out-Null

if (-not (Wait-Url "http://127.0.0.1:$FrontendPort/" 90)) {
  throw "Frontend $FrontendPort portida ko`tarilmadi."
}
Write-Host "  frontend : http://localhost:$FrontendPort" -ForegroundColor Green

# --- Tunnel (ixtiyoriy) --------------------------------------------------------
if ($Tunnel) {
  Write-Host ''
  & (Join-Path $PSScriptRoot 'tg-tunnel.ps1') -FrontendPort $FrontendPort -BackendPort $BackendPort
} else {
  Write-Host ''
  Write-Host 'Demo tayyor. Brauzerda oching:' -ForegroundColor Yellow
  Write-Host "  http://localhost:$FrontendPort"
  Write-Host ''
  Write-Host 'Telefonda / Telegram Mini App`da ko`rsatish uchun: -Tunnel bayrog`i bilan qayta ishga tushiring.'
}
