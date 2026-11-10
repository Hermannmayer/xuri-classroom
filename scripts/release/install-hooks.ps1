# 安装仓库自带的 git hooks（commit-msg 格式校验 + 去掉 AI 署名）。
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Source = Join-Path $Root '.githooks\commit-msg'
$Target = Join-Path $Root '.git\hooks\commit-msg'
if (-not (Test-Path $Source)) { throw "找不到 $Source" }
if (-not (Test-Path (Split-Path $Target -Parent))) { throw '当前目录不是 git 仓库（.git/hooks 不存在）' }
Copy-Item $Source $Target -Force
Write-Host "已安装 commit-msg hook：$Target"
Write-Host '测试：git commit -m "test" 应被拒绝；git commit -m "docs: 测试" 应通过。'
