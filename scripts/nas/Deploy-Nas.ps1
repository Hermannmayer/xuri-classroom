# =============================================================================
# 旭日云课堂 · 一条命令把本地改动发布到 NAS 的 live 环境
#
# 它做的事（顺序固定，出问题就停在原地，不会往下走）：
#   1. 检查工作区：有未提交改动就必须给 -Message，否则拒绝
#   2. git push nas main
#   3. 在 NAS 上 git fetch + reset --hard（运行副本永远等于裸仓库，不产生分叉）
#   4. 按改动类型决定要不要重启：
#        server/**            → live-reload.sh（编译 19s + 重启 10s）
#        client/package*.json → npm ci（web-watch 里带锁文件哈希，会自动装）
#        deploy/nas/live/**   → docker compose up -d
#        client/** 其他       → 什么都不用做，web-watch 自己重建（~9s）
#   5. 等构建/健康就绪
#   6. 跑冒烟测试
#
# 用法（在仓库根目录）：
#   .\scripts\nas\Deploy-Nas.ps1 -Message "feat: 改了某某"     # 提交并发布
#   .\scripts\nas\Deploy-Nas.ps1                              # 只发布已提交的内容
#   .\scripts\nas\Deploy-Nas.ps1 -SkipSmoke                   # 不发冒烟
#   .\scripts\nas\Deploy-Nas.ps1 -ReloadOnly                  # 不推代码，只重载后端
#
# 前提：本机 ~/.ssh 里有能免密登 NAS 的私钥（已配好）；NAS 上远端名 nas 指向
#       ssh://Home@192.168.0.2/vol2/1000/xuri/src/repo.git
# =============================================================================
[CmdletBinding()]
param(
    [string]$Message,
    [switch]$SkipSmoke,
    [switch]$ReloadOnly,
    [string]$NasHost = '192.168.0.2',
    [string]$NasUser = 'Home',
    [string]$RemoteRepo = '/vol2/1000/xuri/src/work',
    [string]$ComposeDir = 'deploy/nas/live',
    [string]$BaseUrl = 'http://192.168.0.2:201'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

function Say($msg)  { Write-Host "`n──── $msg ────" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Die($msg)  { Write-Host "`n❌ $msg`n" -ForegroundColor Red; exit 1 }

# 把一段 bash 脚本送到 NAS 执行。
#
# 为什么是「写临时文件 → scp → 远端 bash 执行」，而不是 pipe 给 bash -s：
#   Windows 的 PowerShell 把字符串管道给原生进程（ssh.exe）时，会在末尾**自动追加
#   一个 \r\n**（实测 `"A`nB`n" | ssh ... 'od -c'` 收到的是 A \n B \n \r \n）。
#   于是远端最后一行变成孤零零的 "\r"，bash 报
#       bash: line 10: $'\r': command not found
#   并且返回 127。试过 here-string、单引号多行串、-replace CR、base64 内联，全都被
#   这个尾部的 \r 绕过。落盘成文件再 scp，走的是二进制通道，一个字节都不会变。
function Invoke-NasScript {
    param([Parameter(Mandatory)][string]$Body, [switch]$AllowFail)
    $lf = ((($Body -replace "`r", "").TrimEnd()) + "`n")
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("xuri-deploy-" + [guid]::NewGuid().ToString('N') + ".sh")
    [System.IO.File]::WriteAllText($tmp, $lf, (New-Object System.Text.UTF8Encoding($false)))
    $remote = "/tmp/xuri-deploy-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".sh"
    try {
        scp -o BatchMode=yes -q $tmp "${NasUser}@${NasHost}:$remote" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Die "scp 上传脚本失败（目标 $remote）" }
        $cmd = "bash $remote; ec=`$?; rm -f $remote; exit `$ec"
        $out = @(ssh -o BatchMode=yes -o ConnectTimeout=10 "$NasUser@$NasHost" $cmd 2>&1)
        $code = $LASTEXITCODE
    }
    finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
    if ($code -ne 0 -and -not $AllowFail) {
        Write-Host ($out -join "`n")
        Die "NAS 上的命令失败（退出码 $code）。上面是远端输出。"
    }
    return @{ Output = ($out -join "`n"); Code = $code }
}

function Resolve-SmokePython {
    # 冒烟测试要 RSA 加密密码，得挑一个装了 cryptography 的解释器。
    # 优先 PATH 上的 python/python3/py -3，最后兜底到 DSH 自带的 python。
    $cands = @()
    foreach ($n in 'python', 'python3') {
        $c = Get-Command $n -ErrorAction SilentlyContinue
        if ($c) { $cands += @{ Exe = $c.Source; Args = @() } }
    }
    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) { $cands += @{ Exe = $pyLauncher.Source; Args = @('-3') } }
    $bundled = Get-ChildItem "$env:USERPROFILE\.dsh\dsh-runtimes" -Recurse -Filter python.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($bundled) { $cands += @{ Exe = $bundled.FullName; Args = @() } }
    foreach ($c in $cands) {
        & $c.Exe @($c.Args) -c 'import cryptography' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { return $c }
    }
    return $null
}

function Test-Smoke {
    if ($SkipSmoke) { Warn '按 -SkipSmoke 跳过冒烟'; return }
    Say '冒烟测试'
    $py = Resolve-SmokePython
    if (-not $py) { Warn '找不到装了 cryptography 的 python，跳过冒烟（可手动跑 scripts/nas/smoke-test.py）'; return }
    $env:PYTHONIOENCODING = 'utf-8'
    & $py.Exe @($py.Args) (Join-Path $repoRoot 'scripts/nas/smoke-test.py') --base $BaseUrl
    if ($LASTEXITCODE -ne 0) { Die '冒烟测试没通过——线上可能已经被这次改动影响，先看输出再决定回滚。' }
}

# ---------------------------------------------------------------- 0. 前置检查
Say '0/6 前置检查'
if (-not (Test-Path (Join-Path $repoRoot '.git'))) { Die "当前目录不是 git 仓库：$repoRoot" }
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') { Die "当前分支是 $branch，本流程只在 main 上跑" }
$remotes = git remote
if ($remotes -notcontains 'nas') { Die "没有名为 nas 的远端。先执行：git remote add nas ssh://$NasUser@$NasHost/vol2/1000/xuri/src/repo.git" }
Ok "仓库 $repoRoot，分支 main，远端 nas 就绪"

if (-not $ReloadOnly) {
    # ------------------------------------------------------------ 1. 提交
    Say '1/6 本地提交'
    $dirty = git status --porcelain
    if ($dirty) {
        if (-not $Message) { Die "工作区有未提交改动，必须给 -Message，例如：`n  .\scripts\nas\Deploy-Nas.ps1 -Message `"fix: 修了某某`"" }
        git add -A
        git commit -q -m $Message
        Ok "已提交：$(git log --oneline -1)"
    } else {
        Ok '工作区干净，不用提交'
    }

    # ------------------------------------------------------------ 2. 推送
    Say '2/6 推送到 NAS 裸仓库'
    git push nas main 2>&1 | ForEach-Object { "  $_" }
    if ($LASTEXITCODE -ne 0) { Die 'git push 失败' }
    Ok '推送完成'
}

# ---------------------------------------------------------------- 3. NAS 同步 + 判断
Say '3/6 NAS 工作副本同步'
function Get-SyncScript([string]$RepoDir) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('set -e')
    [void]$sb.AppendLine("cd '$RepoDir'")
    [void]$sb.AppendLine('BEFORE=$(git rev-parse HEAD)')
    [void]$sb.AppendLine('git fetch -q origin')
    [void]$sb.AppendLine('git reset --hard -q origin/main')
    [void]$sb.AppendLine('AFTER=$(git rev-parse HEAD)')
    [void]$sb.AppendLine('echo "__BEFORE__${BEFORE}"')
    [void]$sb.AppendLine('echo "__AFTER__${AFTER}"')
    [void]$sb.AppendLine('git diff --name-only "${BEFORE}" "${AFTER}" || true')
    return $sb.ToString()
}

# 直接给一个函数，而不是 here-string 再 Replace：here-string 里的行是 CRLF 开头，
# PowerShell 的 `` 续行会让某些行丢掉前导空格，远端 bash 就报 "$'\r': command not found"。
$sync = Invoke-NasScript -Body (Get-SyncScript -RepoDir $RemoteRepo)
# 注意：远端输出里有 Windows 的 \r，不清掉会导致 "075382d...？ unknown revision"
$lines = ($sync.Output -split "`n") | ForEach-Object { $_.TrimEnd("`r") }
$before = (($lines | Where-Object { $_ -like '__BEFORE__*' }) -replace '__BEFORE__', '').Trim()
$after  = (($lines | Where-Object { $_ -like '__AFTER__*' })  -replace '__AFTER__', '').Trim()
$changed = $lines | Where-Object { $_ -and $_ -notlike '__*' } | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^[0-9a-f]{40}$|^[^ ]' }

if ($before -eq $after) {
    Ok "代码已是最新（$($after.Substring(0,7))），没有文件变化"
} else {
    Ok "更新 $($before.Substring(0,7)) → $($after.Substring(0,7))，共 $($changed.Count) 个文件"
    $changed | Select-Object -First 15 | ForEach-Object { "     $_" }
    if ($changed.Count -gt 15) { "     ... 还有 $($changed.Count - 15) 个" }
}

$serverChanged  = @($changed | Where-Object { $_ -match '^server/' }).Count -gt 0
$composeChanged = @($changed | Where-Object { $_ -match "^$([regex]::Escape($ComposeDir))/" }).Count -gt 0
$depsChanged    = @($changed | Where-Object { $_ -match '^client/package(-lock)?\.json$' }).Count -gt 0
$clientChanged  = @($changed | Where-Object { $_ -match '^client/' }).Count -gt 0
$forceReload    = $ReloadOnly.IsPresent

# ---------------------------------------------------------------- 4. compose
if ($composeChanged -or $forceReload) {
    Say '4/6 应用 compose 变更'
    $composeScript = @'
cd "@REPO@/@COMPOSE@" || exit 1
docker compose config -q || { echo "COMPOSE_CONFIG_FAILED"; exit 1; }
docker compose up -d
docker compose ps --format "  {{.Name}}  {{.Status}}"
'@.Replace('@REPO@', $RemoteRepo).Replace('@COMPOSE@', $ComposeDir)
    (Invoke-NasScript -Body $composeScript).Output | Write-Host
} else {
    Write-Host "`n──── 4/6 compose 无变化，跳过 ────"
}

# ---------------------------------------------------------------- 5. 后端
if ($serverChanged -or $forceReload) {
    Say '5/6 重载后端（编译 + 重启）'
    $reload = @'
cd "@REPO@" || exit 1
XURI_SRC="@REPO@" bash scripts/nas/live-reload.sh
'@.Replace('@REPO@', $RemoteRepo)
    (Invoke-NasScript -Body $reload).Output | Write-Host
} else {
    Write-Host "`n──── 5/6 后端代码无变化，跳过重载 ────"
}

# ---------------------------------------------------------------- 6. 前端 + 冒烟
if ($depsChanged) {
    Say '前端依赖有变化：重启 web-watch（它会按锁文件哈希重装）'
    $restart = @'
cd "@REPO@/@COMPOSE@" || exit 1
docker compose restart web-watch
'@.Replace('@REPO@', $RemoteRepo).Replace('@COMPOSE@', $ComposeDir)
    (Invoke-NasScript -Body $restart).Output | Write-Host
}

if ($clientChanged) {
    Say '等待 web-watch 出一次新构建'
    $wait = @'
START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
for i in $(seq 1 45); do
  if docker logs --since "$START" xuri-live-web-watch 2>&1 | grep -q "built in"; then
    docker logs --since "$START" xuri-live-web-watch 2>&1 | grep "built in" | tail -1
    echo "BUILD_DONE"
    exit 0
  fi
  sleep 2
done
echo "BUILD_TIMEOUT"
'@
    $w = Invoke-NasScript -Body $wait -AllowFail
    if ($w.Output -match 'BUILD_TIMEOUT') { Warn '90 秒内没看到新构建，检查：docker logs xuri-live-web-watch' }
    else { $w.Output | Where-Object { $_ -and $_ -ne 'BUILD_DONE' } | ForEach-Object { "  $_" } }
}

Test-Smoke

Say '完成'
Write-Host @"
  线上：$BaseUrl
  公网：https://ks.1618030.xyz:200
  回滚：git revert <commit> 后再跑一次本脚本；或
        cd $RemoteRepo/$ComposeDir && docker compose stop web && docker start surveyking
"@ -ForegroundColor DarkGray