# 启动本地 MySQL（便携版，3306）。已在运行则跳过。
$ErrorActionPreference = 'Stop'
$mysqlBase = "$env:LOCALAPPDATA\mysql\mysql-8.0.24-winx64"
$mysqlData = "$env:LOCALAPPDATA\mysql\data"

if (Get-NetTCPConnection -State Listen -LocalPort 3306 -ErrorAction SilentlyContinue) {
  Write-Host 'MySQL 已在 3306 运行'
  return
}

if (-not (Test-Path "$mysqlBase\bin\mysqld.exe")) { throw "MySQL 未安装：$mysqlBase" }
if (-not (Test-Path $mysqlData)) { throw "数据目录不存在：$mysqlData" }

Start-Process -FilePath "$mysqlBase\bin\mysqld.exe" `
  -ArgumentList "--basedir=$mysqlBase", "--datadir=$mysqlData", "--port=3306", "--default-authentication-plugin=mysql_native_password" `
  -WindowStyle Hidden `
  -RedirectStandardError "$env:LOCALAPPDATA\mysql\err.log" `
  -RedirectStandardOutput "$env:LOCALAPPDATA\mysql\out.log"

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  if (Get-NetTCPConnection -State Listen -LocalPort 3306 -ErrorAction SilentlyContinue) {
    Write-Host 'MySQL 已启动（3306）'
    return
  }
}
throw 'MySQL 启动超时，看 %LOCALAPPDATA%\mysql\err.log'
