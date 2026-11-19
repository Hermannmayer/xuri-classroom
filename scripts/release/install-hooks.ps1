# 安装仓库自带的 git hooks（commit-msg 格式校验 + 版本号同步 + 去掉 AI 署名）。
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$HooksDir = Join-Path $Root '.git\hooks'
if (-not (Test-Path $HooksDir)) { throw '当前目录不是 git 仓库（.git/hooks 不存在）' }

$hooks = @('commit-msg', 'pre-commit')
foreach ($name in $hooks) {
    $Source = Join-Path $Root ".githooks\$name"
    if (-not (Test-Path $Source)) { throw "找不到 $Source" }
    $Target = Join-Path $HooksDir $name
    Copy-Item $Source $Target -Force
    Write-Host "已安装 $name hook：$Target"
}

Write-Host ''
Write-Host '生效内容：'
Write-Host '  commit-msg : 校验 Conventional Commits 格式、去掉 AI 署名尾注'
Write-Host '  pre-commit : 把 VERSION 同步到 client/package.json 与 server/pom.xml'
Write-Host ''
Write-Host '测试：改 VERSION 后直接 git add + commit，另外两处应被自动改好。'
