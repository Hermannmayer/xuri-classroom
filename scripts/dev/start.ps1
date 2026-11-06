# 一键启动本地开发环境：MySQL(3306) + 后端(7007，内部服务) + 前端 dev(80，对外入口)
#
# 访问地址固定为 http://localhost —— 用户不需要知道后端在哪个端口。
$ErrorActionPreference = 'Stop'
$dev = $PSScriptRoot
$root = Split-Path -Parent (Split-Path -Parent $dev)

& "$dev\start-mysql.ps1"
& "$dev\start-backend.ps1" -Port 7007

Start-Sleep -Seconds 2
$client = Join-Path $root 'client'
if (Test-Path $client) {
  Write-Host '启动前端 dev server：http://localhost （后端代理到 127.0.0.1:7007）'
  Start-Process -FilePath 'npm' -ArgumentList 'run', 'dev' -WorkingDirectory $client
}
