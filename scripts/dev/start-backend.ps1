# 启动后端（80 端口）。Windows 绑定 80 需要管理员，脚本会自提权。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$java = "$env:LOCALAPPDATA\jdk8\jdk8u504-b01\bin\java.exe"
$jar = "$root\server\api\build\libs\surveyking-v1.13.0.jar"
$port = 80

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

Write-Host "Starting backend: http://127.0.0.1:$port  (log: $root\server\backend.log)"
Set-Location "$root\server"
& $java -jar $jar "--server.port=$port" 2>&1 | Tee-Object -FilePath "$root\server\backend.log"
