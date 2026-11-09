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
#   .\scripts\nas\Deploy-Nas.ps1 -DiscardNasChanges           # NAS 上有人直接改过，丢弃那些改动
#                                                             #（默认会中止并提示，防误删）
#
# 前提：本机 ~/.ssh 里有能免密登 NAS 的私钥（已配好）；NAS 上远端名 nas 指向
#       ssh://Home@192.168.0.2/vol2/1000/xuri/src/repo.git
# =============================================================================
[CmdletBinding()]
param(
    [string]$Message,
    [switch]$SkipSmoke,
    [switch]$ReloadOnly,
    [switch]$DiscardNasChanges,   # NAS 上有未提交改动时，强制丢弃（默认中止）
    [switch]$SkipTests,           # 跳过后端单元测试（紧急发布用；会打 Warn）
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

# ------ 0.5 前端类型检查
# 生产构建走 web-watch 的 vite build --watch，它不跑 tsc；类型错误会直接上线。
# 只在本次确实改了 client/** 时才跑，避免每次发布都多等十几秒。
if (-not $ReloadOnly) {
    $clientDirty = @(git status --porcelain -- client).Count -gt 0
    if ($clientDirty -and (Test-Path (Join-Path $repoRoot "client/node_modules"))) {
        Say "0.5/6 前端类型检查"
        Push-Location (Join-Path $repoRoot "client")
        try {
            npm run check
            if ($LASTEXITCODE -ne 0) { Die "前端类型检查没通过（npm run check），已中止发布。" }
        }
        finally { Pop-Location }
        Ok "类型检查通过"
    }
    elseif ($clientDirty) {
        Warn "client/node_modules 不存在，跳过类型检查（先 cd client && npm install）"
    }
}

# ------ 0.6 后端单元测试
# 目的：拆上帝类/改统计之前先有一层能红的网。9 个用例约 10 秒，每次发布都跑；
# 紧急发布可用 -SkipTests 跳过（会打 Warn，便于事后追溯）。
function Resolve-JavaHome {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { return $env:JAVA_HOME }
    $local = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'jdk8') -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
    if ($local) { return $local.FullName }
    $cmd = Get-Command java -ErrorAction SilentlyContinue
    if ($cmd) { return (Split-Path -Parent (Split-Path -Parent $cmd.Source)) }
    return $null
}

if (-not $ReloadOnly -and -not $SkipTests) {
    $javaHome = Resolve-JavaHome
    if ($javaHome) {
        Say '0.6/6 后端单元测试'
        $previousJavaHome = $env:JAVA_HOME
        $env:JAVA_HOME = $javaHome
        Push-Location (Join-Path $repoRoot 'server')
        try {
            # :shared:test 是 9 个纯单测；:api:test 是集成测试，没有 S2_TEST_DB_URL 时会自动禁用（不会拖慢/拖红）
            & .\gradlew.bat :shared:test :api:test --no-daemon --console=plain 2>&1 | Select-Object -Last 8
            if ($LASTEXITCODE -ne 0) { Die '后端单元测试没通过（:shared:test），已中止发布。' }
        }
        finally {
            Pop-Location
            $env:JAVA_HOME = $previousJavaHome
        }
        Ok '单元测试通过'
    }
    else {
        Warn '找不到 JDK，跳过后端单元测试（可用 JAVA_HOME 指定）'
    }
}

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
function Get-StatusScript([string]$RepoDir) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("cd '$RepoDir'")
    [void]$sb.AppendLine('echo "__DIRTY_BEGIN__"')
    [void]$sb.AppendLine('git status --porcelain || true')
    [void]$sb.AppendLine('echo "__DIRTY_END__"')
    return $sb.ToString()
}

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

# 3a. 先看 NAS 工作副本干不干净。有人直接在 NAS 上改过的话，下面的 reset 会冲掉，
#     所以先拦一道——这既是保护，也说明「直接改 NAS」是可用的，只要先把改动提交掉。
$status = Invoke-NasScript -Body (Get-StatusScript -RepoDir $RemoteRepo)
$inDirty = $false
$dirtyLines = @()
foreach ($l in ($status.Output -split "`n")) {
    $t = $l.TrimEnd("`r")
    if ($t -eq '__DIRTY_BEGIN__') { $inDirty = $true; continue }
    if ($t -eq '__DIRTY_END__') { $inDirty = $false; continue }
    if ($inDirty -and $t.Trim()) { $dirtyLines += $t.Trim() }
}
if ($dirtyLines.Count -gt 0) {
    if (-not $DiscardNasChanges) {
        Write-Host "`nNAS 运行副本上有 $($dirtyLines.Count) 个未提交改动：" -ForegroundColor Yellow
        $dirtyLines | Select-Object -First 10 | ForEach-Object { "     $_" }
        Die @"
会被接下来的 reset --hard 冲掉，所以先停在这里。二选一：
  · 想保留：SSH 上 NAS，cd $RemoteRepo 后 git add -A && git commit && git push origin main，
            然后在本地 git pull nas main
  · 想丢弃：重跑并加 -DiscardNasChanges
"@
    }
    Warn "NAS 上有 $($dirtyLines.Count) 个未提交改动，按 -DiscardNasChanges 丢弃"
}

# 3b. 同步到裸仓库最新
$sync = Invoke-NasScript -Body (Get-SyncScript -RepoDir $RemoteRepo)
# 注意：远端输出里可能带 \r，不清掉会导致 "075382d...？ unknown revision"
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
$nginxChanged   = @($changed | Where-Object { $_ -match '^deploy/nginx\.conf$' }).Count -gt 0
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

# 4b. nginx 配置变更：deploy/nginx.conf 是**单文件** bind mount。
# git reset --hard 会替换文件（新 inode），容器仍指向旧 inode —— 只 reload 不会读到新内容
# （实测：宿主机已是新配置，容器内还是旧的）。必须重启容器让它重新挂载。
if ($nginxChanged) {
    Say '4b/6 重启 web 使 nginx 配置生效'
    $reloadNginx = @'
cd "@COMPOSE@" || exit 1
docker compose restart web
for i in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:201/ 2>/dev/null || true)
  if [ "$code" = "200" ]; then echo "NGINX_OK"; exit 0; fi
  sleep 2
done
echo "NGINX_UNHEALTHY"
'@.Replace('@COMPOSE@', $ComposeDir)
    $n = Invoke-NasScript -Body $reloadNginx -AllowFail
    if ($n.Output -match 'NGINX_UNHEALTHY') { Die 'nginx 重启后 12 秒内首页不是 200：检查 docker logs xuri-live-web，必要时 docker compose stop web 并回滚配置。' }
    else { $n.Output | Where-Object { $_ } | ForEach-Object { "  $_" } }
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
    # 之前靠 grep web-watch 日志里的 "built in" 判断构建完成，会误判：
    # 依赖变化时旧容器会先失败一次（日志里仍有上一次成功的 built in），而失败构建可能把 dist 清空。
    # 现在直接探测结果：前端首页 200 且引用的 JS 能取到，才算就绪。
    Say '等待前端产物就绪'
    $wait = @'
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:201/ 2>/dev/null || true)
  if [ "$code" = "200" ]; then
    js=$(curl -s http://127.0.0.1:201/ 2>/dev/null | grep -o '/assets/index-[A-Za-z0-9_-]*.js' | head -1)
    if [ -n "$js" ]; then
      jcode=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:201$js" 2>/dev/null || true)
      if [ "$jcode" = "200" ]; then
        echo "FRONTEND_READY $js"
        exit 0
      fi
    fi
  fi
  sleep 2
done
echo "FRONTEND_TIMEOUT"
'@
    $w = Invoke-NasScript -Body $wait -AllowFail
    if ($w.Output -match 'FRONTEND_TIMEOUT') { Warn '180 秒内前端产物没就绪，检查：docker logs xuri-live-web-watch' }
    else { $w.Output | Where-Object { $_ -and $_ -ne 'FRONTEND_READY*' } | ForEach-Object { "  $_" } }
    $w.Output | Where-Object { $_ -match 'FRONTEND_READY' } | ForEach-Object { "  $_" }
}

Test-Smoke

Say '完成'
Write-Host @"
  线上：$BaseUrl
  公网：https://<public-host>
  回滚：git revert <commit> 后再跑一次本脚本；或
        cd $RemoteRepo/$ComposeDir && docker compose stop web && docker start surveyking
"@ -ForegroundColor DarkGray