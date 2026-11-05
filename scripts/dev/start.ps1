# 一键启动本地开发环境：MySQL(3306) + 后端(80) + 前端 dev(5173)
$ErrorActionPreference = 'Stop'
$dev = $PSScriptRoot
$root = Split-Path -Parent (Split-Path -Parent $dev)

& "$dev\start-mysql.ps1"
& "$dev\start-backend.ps1"

Start-Sleep -Seconds 2
$client = Join-Path $root 'client'
if (Test-Path $client) {
  Write-Host '启动前端 dev server：http://127.0.0.1:5173'
  Start-Process -FilePath 'npm' -ArgumentList 'run', 'dev' -WorkingDirectory $client
}
