<#
.SYNOPSIS
  准备一个 GitHub Release：写版本、生成 CHANGELOG、提交、打 tag；-Push 推到 GitHub 后由 Actions 构建并发布。

.DESCRIPTION
  本地不打包、不创建 GitHub Release。真正的 Windows/Linux/Docker 产物由
  .github/workflows/release.yml 在 tag 上构建。

.PARAMETER Version
  显式指定下一个版本，例如 2.1.0。省略时由 -Bump 从 conventional commits 计算。

.PARAMETER Bump
  auto / major / minor / patch / none，默认 auto。

.PARAMETER Notes
  可选，用文件内容作为本版本 CHANGELOG 说明。

.PARAMETER Push
  提交并打 tag 后，push 到 GitHub，触发 Release workflow。

.PARAMETER NoTag
  只写版本与 CHANGELOG，不提交、不打 tag。

.PARAMETER DryRun
  只打印将要做的事，不写文件、不提交。

.PARAMETER AllowDirty
  允许工作区有未提交改动（只提交版本文件，其他改动原样保留）。

.EXAMPLE
  .\scripts\release\Release.ps1
  .\scripts\release\Release.ps1 -Version 2.1.0 -Push
  .\scripts\release\Release.ps1 -Bump auto -DryRun
#>
[CmdletBinding()]
param(
    [string]$Version,
    [ValidateSet('auto', 'major', 'minor', 'patch', 'none')]
    [string]$Bump = 'auto',
    [string]$Notes,
    [switch]$Push,
    [switch]$NoTag,
    [switch]$DryRun,
    [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root
$env:PYTHONUTF8 = '1'

$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) {
    throw '找不到 python。请安装 Python 3.8+ 并加入 PATH。'
}
$releasePy = Join-Path $Root 'scripts\release\release.py'
if (-not (Test-Path $releasePy)) {
    throw "找不到 $releasePy"
}

function Invoke-ReleasePy {
    param([string[]]$Arguments)
    & $python $releasePy @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "release.py 失败（exit $LASTEXITCODE）"
    }
}

function Invoke-Git {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') 失败"
    }
}

$dirty = @(& git status --porcelain)
if ($dirty.Count -gt 0 -and -not $AllowDirty) {
    $dirtyText = $dirty -join [Environment]::NewLine
    throw "工作区有未提交改动，先提交或加 -AllowDirty：$([Environment]::NewLine)$dirtyText"
}
if ($dirty.Count -gt 0) {
    Write-Warning '工作区有未提交改动；本脚本只提交 VERSION / CHANGELOG / package.json / pom.xml，其他改动保持原样。'
}

$current = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
Write-Host "当前版本：$current"

if ($DryRun) {
    Write-Host '--- 计划（DryRun，不改文件）---'
    Invoke-ReleasePy @('plan', '--bump', $Bump)
    Write-Host '--- 结束 ---'
    exit 0
}

if (-not $Version) {
    $planned = & $python $releasePy plan --bump $Bump --print-version
    if ($LASTEXITCODE -ne 0) {
        throw '计算下一个版本失败'
    }
    $Version = ($planned | Select-Object -Last 1).Trim()
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "版本号不合法：$Version（应为 x.y.z）"
}

if ($Version -ne $current) {
    $bumpArgs = @('bump', '--version', $Version)
    if ($Notes) {
        $bumpArgs += @('--notes', $Notes)
    }
    Invoke-ReleasePy $bumpArgs
}
else {
    Write-Host "VERSION 已经是 $Version，跳过 bump（首个 2.0.0 发布属正常）"
}

Invoke-ReleasePy @('check')

if ($NoTag) {
    Write-Host '已按 -NoTag 停下：版本文件已写，未提交、未打 tag。'
    Write-Host '检查无误后去掉 -NoTag 重跑，或手动 git add/commit/tag。'
    exit 0
}

Invoke-ReleasePy @('tag', '--version', $Version)

if ($Push) {
    Invoke-Git @('push', 'origin', 'main')
    Invoke-Git @('push', 'origin', "v$Version")
    Write-Host ''
    Write-Host "已推送 tag v$Version，GitHub Actions 将开始构建："
    Write-Host '  https://github.com/Hermannmayer/xuri-classroom/actions/workflows/release.yml'
    Write-Host '构建完成后 Release 会自动创建并挂上三端产物。'
}
else {
    Write-Host ''
    Write-Host "本地已提交并打 tag v$Version。推 GitHub 触发发版："
    Write-Host "  .\scripts\release\Release.ps1 -Version $Version -Push"
    Write-Host ('（版本文件已提交时可直接：git push origin main; git push origin ' + "v$Version")
}
