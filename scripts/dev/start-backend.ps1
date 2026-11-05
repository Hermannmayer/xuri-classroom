# 启动后端（80 端口）。Windows 绑定 80 需要管理员，脚本会自提权。
# 提权后以独立进程启动 java（窗口隐藏），不随启动它的终端退出而结束。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$java = "$env:LOCALAPPDATA\jdk8\jdk8u504-b01\bin\java.exe"
$jar = "$root\server\api\build\libs\surveyking-v1.13.0.jar"
$port = 80
$logDir = "$root\server"
$outLog = "$logDir\backend.log"
$errLog = "$logDir\backend.err.log"

if (-not (Test-Path $jar)) { throw "jar not found: $jar (run server\gradlew.bat :api:bootJar first)" }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  Start-Process pwsh -Verb RunAs -ArgumentList $arg
  Write-Host 'Elevation requested - click "Yes" in the UAC dialog.'
  return
}

$busy = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($busy) {
  Write-Host "Port $port is in use (pid=$($busy[0].OwningProcess)), stopping it"
  Stop-Process -Id $busy[0].OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Write-Host "Starting backend: http://127.0.0.1:$port  (log: $outLog)"
Start-Process -FilePath $java `
  -ArgumentList @('-jar', "`"$jar`"", "--server.port=$port") `
  -WorkingDirectory $logDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog | Out-Null

# 等端口就绪再返回，方便调用方立刻验证
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 1000
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    Write-Host "Backend is listening on $port"
    return
  }
}
Write-Host "Backend did not open port $port in 60s, check $errLog"
