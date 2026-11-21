# 启动后端（默认 7007 端口）。
param(
  [int]$Port = 7007
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
# 2.2.3 起要求 JDK 25（server/build.gradle 用 toolchain 25）
function Resolve-JavaExe {
  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\java.exe') }
  foreach ($name in @('jdk25', 'jdk21', 'jdk17')) {
    $base = Join-Path $env:LOCALAPPDATA $name
    if (Test-Path $base) {
      $candidates += (Get-ChildItem $base -Directory -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName 'bin\java.exe' })
    }
  }
  foreach ($candidate in $candidates) {
    if (-not (Test-Path $candidate)) { continue }
    $first = (& $candidate -version 2>&1 | Select-Object -First 1)
    if ($first -match '"(\d+)' -and [int]$Matches[1] -ge 25) { return $candidate }
  }
  return $null
}
$java = Resolve-JavaExe
$jar = Get-ChildItem "$root\server\api\build\libs\xuri-classroom-*.jar" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$logDir = "$root\server"
$outLog = "$logDir\backend.log"
$errLog = "$logDir\backend.err.log"

if (-not $java) { throw "找不到 JDK 25：请安装 JDK 25（或设 JAVA_HOME 指向它）。本项目 2.2.3 起要求 Java 25。" }
if (-not $jar) { throw "jar not found (run server\gradlew.bat :api:bootJar first)" }


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


for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Milliseconds 1000
  if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    Write-Host "Backend is listening on $Port"
    Write-Host "Frontend should point to: http://127.0.0.1:$Port"
    return
  }
}
Write-Host "Backend did not open port $Port in 90s, check $errLog"
