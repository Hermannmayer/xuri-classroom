# 启动后端（默认 7007 端口）。
#
# 端口约定：前端占 80（vite dev / 生产 nginx），后端是内部服务，随便一个端口即可，
# 因此这里不需要管理员权限（Windows 只有 80 这类保留端口才可能要提权，而我们不等 80）。
#
# 用法：
#   .\start-backend.ps1              # 用默认 7007
#   .\start-backend.ps1 -Port 8080   # 换端口（同时把 client 的 VITE_API_TARGET 指过去）
param(
  [int]$Port = 7007
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$java = "$env:LOCALAPPDATA\jdk8\jdk8u504-b01\bin\java.exe"
$jar = "$root\server\api\build\libs\surveyking-v1.13.0.jar"
$logDir = "$root\server"
$outLog = "$logDir\backend.log"
$errLog = "$logDir\backend.err.log"

if (-not (Test-Path $java)) { throw "java not found: $java" }
if (-not (Test-Path $jar)) { throw "jar not found: $jar (run server\gradlew.bat :api:bootJar first)" }

# 只清理自己占用的那个端口，别误杀别的 80/7007 进程
$busy = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($busy) {
  Write-Host "Port $Port is in use (pid=$($busy[0].OwningProcess)), stopping it"
  Stop-Process -Id $busy[0].OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Write-Host "Starting backend: http://127.0.0.1:$Port  (log: $outLog)"
Start-Process -FilePath $java `
  -ArgumentList @('-jar', "`"$jar`"", "--server.port=$Port") `
  -WorkingDirectory $logDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog | Out-Null

# 等端口就绪再返回，方便调用方立刻验证
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Milliseconds 1000
  if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    Write-Host "Backend is listening on $Port"
    Write-Host "Frontend should point to: http://127.0.0.1:$Port"
    return
  }
}
Write-Host "Backend did not open port $Port in 90s, check $errLog"
