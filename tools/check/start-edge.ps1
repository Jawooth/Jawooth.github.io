<#
  Start a headless Edge for CDP audits; write the DevTools port to
  .edge-audit/port.txt so tools/check/cdp.js can attach.

  Why PowerShell and not Node spawn:
    Under the DSH workspace-write sandbox a child process spawned from Node
    cannot create mojo platform channels (Access denied -> Edge FATAL at
    startup, DevTools port never listens). Starting Edge from PowerShell uses
    a different path and works.

  Three traps this script works around:
    1) The Edge profile must live INSIDE the repo. Under %TEMP% the network
       sandbox cannot get the ACL and Edge dies at startup. The DSH sandbox
       only guarantees the workspace is writable.
    2) Re-using the same profile directory makes startup flaky (stale lock /
       singleton state). Every run gets a fresh timestamped profile.
    3) If an Edge instance is already running, a new process forwards
       --remote-debugging-port to that instance, which has no such port, so
       the CDP endpoint looks dead. Kill leftovers first.

  NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads .ps1 files
  without a BOM as ANSI and mangles non-ASCII characters into a parse error.
#>
param(
  [string]$Profile = "review",
  [int]$Width = 1600,
  [int]$Height = 1200
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$edgeProfile = Join-Path $root ".edge-audit\$Profile-$stamp"
New-Item -ItemType Directory -Force -Path $edgeProfile | Out-Null

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }
if (-not (Test-Path $edge)) { throw 'msedge.exe not found' }

Get-Process msedge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

function Start-Edge([int]$p) {
  $a = @(
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--remote-allow-origins=*',
    "--user-data-dir=$edgeProfile",
    "--remote-debugging-port=$p",
    "--window-size=$Width,$Height",
    'about:blank'
  )
  Start-Process -FilePath $edge -ArgumentList $a -WindowStyle Hidden | Out-Null
}

$port = Get-Random -Minimum 9600 -Maximum 9899
Start-Edge $port

$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 600
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/json/version" -UseBasicParsing -TimeoutSec 4
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch { }
  if ($i -eq 12 -or $i -eq 24) {
    Get-Process msedge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $port = Get-Random -Minimum 9600 -Maximum 9899
    Start-Edge $port
  }
}

if (-not $ok) {
  Write-Output "EDGE_FAIL port=$port"
  exit 1
}
$portFile = Join-Path $root '.edge-audit\port.txt'
Set-Content -Path $portFile -Value $port -Encoding ASCII
Write-Output $port
