# =============================================================================
# 旭日云课堂 · 一条命令把本地改动发布到 NAS 的 live 环境
#
# 它做的事（顺序固定，出问题就停在原地，不会往下走）：
#   0. 检查工作区 / 分支 / 远端

#   0.5 改了 client/** 就跑 tsc；0.6 跑后端单测

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
    [switch]$DiscardNasChanges,
    [switch]$SkipTests,
    [switch]$InstallJdk,
    [string]$NasHost = '192.168.0.2',
    [string]$NasUser = 'Home',
    [string]$RemoteRepo = '/vol2/1000/xuri/src/work',
    [string]$ComposeDir = 'deploy/nas/live',
    [string]$BaseUrl = 'http://192.168.0.2:201',


    [string]$SmokeUser = 'admin',
    [string]$SmokePassword = '123456',
    [string]$ExpectName = '旭日'
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



        $out = @(ssh -n -o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 "$NasUser@$NasHost" $cmd 2>&1)
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

# 结构契约检查只需要标准库，不能因为「没装 cryptography」就跳过它。
function Resolve-AnyPython {
    foreach ($n in 'python', 'python3') {
        $cmd = Get-Command $n -ErrorAction SilentlyContinue
        if ($cmd) { return @{ Exe = $cmd.Source; Args = @() } }
    }
    $cmd = Get-Command py -ErrorAction SilentlyContinue
    if ($cmd) { return @{ Exe = $cmd.Source; Args = @('-3') } }
    $bundled = Get-ChildItem "$env:USERPROFILE\.dsh\dsh-runtimes" -Recurse -Filter python.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($bundled) { return @{ Exe = $bundled.FullName; Args = @() } }
    return $null
}

function Resolve-SmokePython {


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
    if (-not $py) {

        Die '找不到装了 cryptography 的 python，冒烟无法执行。装 pip install cryptography；或显式加 -SkipSmoke 表示这次不验。'
    }
    $env:PYTHONIOENCODING = 'utf-8'
    & $py.Exe @($py.Args) (Join-Path $repoRoot 'scripts/nas/smoke-test.py') --base $BaseUrl `
        --user $SmokeUser --password $SmokePassword --expect-name $ExpectName
    if ($LASTEXITCODE -ne 0) { Die '冒烟测试没通过——线上可能已经被这次改动影响，先看输出再决定回滚。' }
}


Say '0/6 前置检查'
if (-not (Test-Path (Join-Path $repoRoot '.git'))) { Die "当前目录不是 git 仓库：$repoRoot" }
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') { Die "当前分支是 $branch，本流程只在 main 上跑" }
$remotes = git remote
if ($remotes -notcontains 'nas') { Die "没有名为 nas 的远端。先执行：git remote add nas ssh://$NasUser@$NasHost/vol2/1000/xuri/src/repo.git" }
Ok "仓库 $repoRoot，分支 main，远端 nas 就绪"








if (-not $ReloadOnly) {
    Say '0.2/6 数据库结构契约检查'
    $schemaPy = Resolve-AnyPython
    if (-not $schemaPy) {
        Die '找不到 python，无法执行数据库结构契约检查（scripts/release/check_schema.py）。请安装 Python 或加入 PATH 后重试；不允许跳过。'
    }
    & $schemaPy.Exe @($schemaPy.Args) (Join-Path $repoRoot 'scripts/release/check_schema.py')
    if ($LASTEXITCODE -ne 0) {
        Die '数据库结构契约检查没通过（VERSION 与 schema.json 最高版本不一致，或迁移脚本不合规），已中止发布。详见上面的输出。'
    }
    Ok '结构契约检查通过（VERSION 与 schema.json 一致）'
}




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





$webWatchBaseline = 0
$baselineProbe = Invoke-NasScript -Body 'docker logs xuri-live-web-watch 2>&1 | wc -l' -AllowFail
if ($baselineProbe.Output -match '^\s*(\d+)') { $webWatchBaseline = [int]$Matches[1] }
Write-Host "  · web-watch 日志基线 $webWatchBaseline 行（reset 前记录）"

# ------ 0.6 后端单元测试
# 目的：拆上帝类/改统计之前先有一层能红的网。9 个用例约 10 秒，每次发布都跑；
# 紧急发布可用 -SkipTests 跳过（会打 Warn，便于事后追溯）。
# 本项目 2.2.3 起要求 JDK 25（server/build.gradle 用 toolchain 25）：
# 拿 JDK 8/17 跑本地测试会因为找不到 25 工具链直接失败，所以这里按版本挑，而不是按目录名猜。
function Test-JavaAtLeast25 {
    param([string]$JavaHome)
    if (-not $JavaHome) { return $false }
    $exe = Join-Path $JavaHome 'bin\java.exe'
    if (-not (Test-Path $exe)) { return $false }
    $first = (& $exe -version 2>&1 | Select-Object -First 1)
    if (-not $first) { return $false }
    if ($first -match '"1\.(\d+)') { return ([int]$Matches[1] -ge 25) }
    if ($first -match '"(\d+)') { return ([int]$Matches[1] -ge 25) }
    return $false
}

function Resolve-JavaHome {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
    foreach ($name in @('jdk25', 'jdk21', 'jdk17')) {
        $base = Join-Path $env:LOCALAPPDATA $name
        if (Test-Path $base) {
            $candidates += (Get-ChildItem $base -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
        }
    }
    $cmd = Get-Command java -ErrorAction SilentlyContinue
    if ($cmd) { $candidates += (Split-Path -Parent (Split-Path -Parent $cmd.Source)) }
    foreach ($candidate in $candidates) {
        if (Test-JavaAtLeast25 $candidate) { return $candidate }
    }
    return $null
}
function Install-Jdk25 {


    $mirrors = @(
        'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/25/jdk/x64/windows/',
        'https://mirrors.nju.edu.cn/adoptium/25/jdk/x64/windows/'
    )
    $targetRoot = Join-Path $env:LOCALAPPDATA 'jdk25'
    New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
    foreach ($mirror in $mirrors) {
        try {
            Write-Host "  查找 $mirror"
            $html = (Invoke-WebRequest -Uri $mirror -UseBasicParsing -TimeoutSec 30).Content
            $zip = [regex]::Matches([string]$html, 'OpenJDK25U-jdk_x64_windows_hotspot_[0-9._]+\.zip') |
                ForEach-Object { $_.Value } | Sort-Object -Unique | Select-Object -Last 1
            if (-not $zip) { Write-Host '  × 目录里没找到 25 的 zip'; continue }
            $tmp = Join-Path ([System.IO.Path]::GetTempPath()) $zip
            Write-Host "  下载 $zip（约 190MB，可能要几分钟）..."
            Invoke-WebRequest -Uri ($mirror + $zip) -OutFile $tmp -UseBasicParsing -TimeoutSec 1800
            Write-Host "  解压到 $targetRoot ..."
            Expand-Archive -Path $tmp -DestinationPath $targetRoot -Force
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
            foreach ($dir in (Get-ChildItem $targetRoot -Directory -ErrorAction SilentlyContinue)) {
                if (Test-JavaAtLeast25 $dir.FullName) {
                    Ok "已安装 JDK 25：$($dir.FullName)"
                    return $dir.FullName
                }
            }
        }
        catch { Write-Host "  × 这个镜像没成功：$($_.Exception.Message)" }
    }
    return $null
}

function Show-DockerGuidance {
    param([string]$Output)
    if ($Output -match 'PULL_FAILED') { Write-Host "  → 基础镜像拉不下来（这台机器的 Docker Hub 基本不通），走镜像站：" }
    elseif ($Output -match 'BUILD_FAILED') { Write-Host "  → 镜像构建失败（Dockerfile.runtime 要 apk add 装字体，需要连外网）" }
    else { Write-Host "  → docker 相关命令失败，先确认 NAS 上的守护进程可用" }
    Write-Host @'

  运行时镜像没准备好。按报错类型处理：

  · PULL_FAILED —— 基础镜像拉不下来（这台机器 Docker Hub 基本不通），在 NAS 上走镜像站：
        docker pull docker.m.daocloud.io/library/eclipse-temurin:25-jre-alpine
        docker tag  docker.m.daocloud.io/library/eclipse-temurin:25-jre-alpine eclipse-temurin:25-jre-alpine

  · BUILD_FAILED —— 构建失败（Dockerfile.runtime 里 apk add 要连外网）：
        curl -I https://dl-cdn.alpinelinux.org/alpine/v3.21/main/x86_64/APKINDEX.tar.gz
      不通就换镜像源，或先在能上网的机器上构建好，docker save / docker load 搬过去。

  · docker 命令失败 —— 守护进程不可用：
        ssh Home@<NAS> 'docker info'      （飞牛上服务名是 docker）

  也可以自己把镜像准备好再重跑：tag 必须叫 xuri-runtime:25，且 docker run --rm --entrypoint java
  xuri-runtime:25 -version 要打印 25.x。（4a 每步都会验这一条，名字对但 java 版本不对会重建。）

  注意：本机（Windows）不需要装 Docker，所有 docker 命令都通过 ssh 在 NAS 上执行。
'@
}

function Show-JdkGuidance {
    Write-Host @'

  本地没有 JDK 25。两条路径的要求不一样，先确认你要做哪件事：

  A. 只是把代码发到 NAS（线上跑在 Docker 里）——本机不需要 JDK
     编译发生在 NAS 上的 gradle:9.9.1-jdk25 容器里，本机只负责 git push 和 ssh。
     这时加 -SkipTests 跳过本地单测即可：
         .\scripts\nas\Deploy-Nas.ps1 -SkipTests
     代价：本地不做编译校验，语法/测试错误要等 NAS 上编译时才暴露。

  B. 想在本地跑单测，或打发布包——必须装 JDK 25
     1) 让这个脚本下载（Temurin 25 JDK，约 190MB，解压到 %LOCALAPPDATA%\jdk25）：
         .\scripts\nas\Deploy-Nas.ps1 -InstallJdk
     2) 或自己装： https://adoptium.net/temurin/releases/?version=25
        解压后把目录设到环境变量 JAVA_HOME，例如：
         $env:JAVA_HOME = "$env:LOCALAPPDATA\jdk25\jdk-25.0.x+y"
         [Environment]::SetEnvironmentVariable('JAVA_HOME', $env:JAVA_HOME, 'User')   # 永久生效
     装好后跑 `java -version` 应显示 25.x。

  另外：本机不需要装 Docker。所有 docker 命令都通过 ssh 在 NAS 上执行；
        Windows 上装 Docker Desktop 对这套部署没有帮助。
'@
}


if (-not $ReloadOnly -and -not $SkipTests) {
    $javaHome = Resolve-JavaHome
    if (-not $javaHome -and $InstallJdk) {
        Say '0.6/6 本机没有 JDK 25，按 -InstallJdk 自动安装 Temurin 25'
        $javaHome = Install-Jdk25
        if ($javaHome) { Ok "JDK 25 就绪：$javaHome" }
    }
    if ($javaHome) {
        Say '0.6/6 后端单元测试'
        $previousJavaHome = $env:JAVA_HOME
        $env:JAVA_HOME = $javaHome
        Push-Location (Join-Path $repoRoot 'server')
        try {

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


        Show-JdkGuidance
        Die '本地没有 JDK 25。按上面的 A/B 选一条（装 JDK 25，或显式 -SkipTests 跳过本地单测）。'
    }
}

if (-not $ReloadOnly) {

    Say '1/6 本地提交'
    $dirty = git status --porcelain
    if ($dirty) {
        if (-not $Message) { Die "工作区有未提交改动，必须给 -Message，例如：`n  .\scripts\nas\Deploy-Nas.ps1 -Message `"fix: 修了某某`"" }
        git add -A
        git commit -q -m $Message


        if ($LASTEXITCODE -ne 0) {
            Die '本地提交失败（见上面的钩子输出，多半是提交信息格式）。改好信息后重跑本脚本。'
        }
        Ok "已提交：$(git log --oneline -1)"
    } else {
        Ok '工作区干净，不用提交'
    }


    Say '2/6 推送到 NAS 裸仓库'
    git push nas main 2>&1 | ForEach-Object { "  $_" }
    if ($LASTEXITCODE -ne 0) { Die 'git push 失败' }
    Ok '推送完成'
}


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


$sync = Invoke-NasScript -Body (Get-SyncScript -RepoDir $RemoteRepo)

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
$clientChanged  = @($changed | Where-Object { $_ -match '^client/' }).Count -gt 0


$clientSourceChanged = @($changed | Where-Object { $_ -match '^client/(src/|public/|index\.html|vite\.config|tsconfig)' }).Count -gt 0
$nginxChanged   = @($changed | Where-Object { $_ -match '^deploy/nginx\.conf$' }).Count -gt 0
$forceReload    = $ReloadOnly.IsPresent














$imageScript = @'
cd "@REPO@/@COMPOSE@" || exit 1
FROM_LINE=$(sed -nE 's/^FROM[[:space:]]+([^[:space:]]+).*$/\1/p' Dockerfile.runtime | head -1)
[ -n "$FROM_LINE" ] || { echo "DOCKERFILE_NO_FROM"; exit 1; }
EXPECTED_JAVA=$(echo "$FROM_LINE" | sed -nE 's/[^0-9]*([0-9]+).*$/\1/p')
[ -n "$EXPECTED_JAVA" ] || { echo "DOCKERFILE_NO_JDK_TAG $FROM_LINE"; exit 1; }
WANT_IMAGE="xuri-runtime:${EXPECTED_JAVA}"
CUR_IMAGE=$(grep -E "^XURI_RUNTIME_IMAGE=" .env 2>/dev/null | cut -d= -f2)
if [ -n "$CUR_IMAGE" ] && [ "$CUR_IMAGE" != "$WANT_IMAGE" ]; then
  sed -i "s|^XURI_RUNTIME_IMAGE=.*|XURI_RUNTIME_IMAGE=$WANT_IMAGE|" .env
  echo "ENV_RUNTIME_IMAGE_FIXED $CUR_IMAGE -> $WANT_IMAGE（.env 已改写）"
fi
RUNTIME_IMAGE="$WANT_IMAGE"
java_major() {
  docker run --rm --entrypoint java "$1" -version 2>&1 \
    | sed -nE 's/.*version "1\.([0-9]+).*/\1/p; s/.*version "([0-9]+).*/\1/p' | head -1
}
if docker image inspect "$RUNTIME_IMAGE" >/dev/null 2>&1; then
  GOT_JAVA=$(java_major "$RUNTIME_IMAGE" || true)
  if [ "$GOT_JAVA" = "$EXPECTED_JAVA" ]; then
    echo "RUNTIME_IMAGE_OK $RUNTIME_IMAGE (java $GOT_JAVA)"
    exit 0
  fi
  echo "RUNTIME_IMAGE_STALE $RUNTIME_IMAGE java=${GOT_JAVA:-unknown} 期望 $EXPECTED_JAVA，重建"
fi
DOCKER_MIRROR=${XURI_DOCKER_MIRROR:-docker.m.daocloud.io/library/}
if ! docker image inspect "$FROM_LINE" >/dev/null 2>&1; then
  docker pull "${DOCKER_MIRROR}${FROM_LINE}" >/dev/null || { echo "PULL_FAILED $FROM_LINE（镜像源 ${DOCKER_MIRROR}）"; exit 1; }
  docker tag "${DOCKER_MIRROR}${FROM_LINE}" "$FROM_LINE"
fi
BUILD_LOG=$(mktemp)
if ! docker build -f Dockerfile.runtime -t "$RUNTIME_IMAGE" . >"$BUILD_LOG" 2>&1; then
  tail -30 "$BUILD_LOG"; rm -f "$BUILD_LOG"
  echo "BUILD_FAILED $RUNTIME_IMAGE（看上面的 apk add 是否要连外网）"
  exit 1
fi
rm -f "$BUILD_LOG"
echo "RUNTIME_IMAGE_BUILT $RUNTIME_IMAGE (java $EXPECTED_JAVA)"
'@.Replace('@REPO@', $RemoteRepo).Replace('@COMPOSE@', $ComposeDir)
Say '4a/6 校验后端运行时镜像（java 大版本必须等于 Dockerfile.runtime 的 FROM）'
$imgResult = Invoke-NasScript -Body $imageScript -AllowFail
$imgResult.Output | ForEach-Object { "     $_" }
if ($imgResult.Code -ne 0) {


    Show-DockerGuidance "$($imgResult.Output)"
    Die '运行时镜像不可用（见上面的引导）。已中止，线上未受影响。'
}

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




if ($nginxChanged) {
    Say '4b/6 重启 web 使 nginx 配置生效'
    $reloadNginx = @'
# 必须用绝对路径：远端脚本的 cwd 不是仓库根，早期写成 cd "@COMPOSE@" 会直接
# 报 "No such file or directory"，nginx 没重启却继续往下走（哑失败）。
cd "@REPO@/@COMPOSE@" || exit 1
docker compose restart web
for i in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:201/ 2>/dev/null || true)
  if [ "$code" = "200" ]; then echo "NGINX_OK"; exit 0; fi
  sleep 2
done
echo "NGINX_UNHEALTHY"
'@.Replace('@REPO@', $RemoteRepo).Replace('@COMPOSE@', $ComposeDir)
    $n = Invoke-NasScript -Body $reloadNginx -AllowFail
    if ($n.Output -match 'NGINX_UNHEALTHY') { Die 'nginx 重启后 12 秒内首页不是 200：检查 docker logs xuri-live-web，必要时 docker compose stop web 并回滚配置。' }
    else { $n.Output | Where-Object { $_ } | ForEach-Object { "  $_" } }
}








$depsScript = @'
WANT=$(md5sum "@REPO@/client/package-lock.json" 2>/dev/null | cut -d' ' -f1)
if [ -z "$WANT" ]; then echo "DEPS_NO_LOCK"; exit 0; fi
GOT=$(docker exec xuri-live-web-watch cat /web/node_modules/.lock-hash 2>/dev/null || true)
if [ "$WANT" = "$GOT" ]; then echo "DEPS_OK"; exit 0; fi
echo "DEPS_STALE 期望 $(echo "$WANT" | cut -c1-8) 实际 $(echo "$GOT" | cut -c1-8) —— 重启 web-watch 重装依赖"
cd "@REPO@/@COMPOSE@" || exit 1
docker compose restart web-watch
echo "DEPS_REINSTALLING（约 1-3 分钟）"
'@.Replace('@REPO@', $RemoteRepo).Replace('@COMPOSE@', $ComposeDir)
Say '4c/6 检查前端依赖是否与锁文件一致'
$depsOutput = (Invoke-NasScript -Body $depsScript).Output
$depsOutput | ForEach-Object { "     $_" }
$depsReinstalling = "$depsOutput" -match 'DEPS_REINSTALLING'




$needReload = $serverChanged -or $forceReload
if (-not $needReload) {
    $wantVersion = ''
    try { $wantVersion = (Get-Content (Join-Path $PSScriptRoot '..\..\VERSION') -Raw).Trim() } catch { }
    $liveVersion = $null
    try {
        $probe = Invoke-WebRequest -Uri "$BaseUrl/api/system" -TimeoutSec 5 -UseBasicParsing
        $liveVersion = ($probe.Content | ConvertFrom-Json).data.version
    } catch { }
    if ($wantVersion -and $liveVersion -and $liveVersion -ne $wantVersion) {
        Write-Host "  线上运行 $liveVersion，仓库是 $wantVersion —— 代码没变但没真正上线，补一次重载" -ForegroundColor Yellow
        $needReload = $true
    }
}

if ($needReload) {
    Say '5/6 重载后端（编译 + 重启）'
    $reload = @'
cd "@REPO@" || exit 1
XURI_SRC="@REPO@" bash scripts/nas/live-reload.sh
'@.Replace('@REPO@', $RemoteRepo)
    (Invoke-NasScript -Body $reload).Output | Write-Host
} else {
    Write-Host "`n──── 5/6 后端代码无变化，跳过重载 ────"
}


if (-not ($clientSourceChanged -or $depsReinstalling)) {
    Write-Host "`n──── 6/6 前端源码无变化且依赖未变，不需要重建产物 ────"
} else {




    Say '等待前端产物就绪'

    $beforeLines = $webWatchBaseline
    Write-Host "  (reset 前 web-watch 日志 $beforeLines 行，等这次构建完成)"
    $wait = @'
BEFORE=@BEFORE@
for i in $(seq 1 120); do
  NEW=$(docker logs xuri-live-web-watch 2>&1 | tail -n +$((BEFORE + 1)) | grep -c 'built in' 2>/dev/null)
  if [ -z "$NEW" ]; then NEW=0; fi
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:201/ 2>/dev/null || true)
  if [ "$NEW" -gt 0 ] && [ "$code" = "200" ]; then
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
'@.Replace('@BEFORE@', [string]$beforeLines)
    $w = Invoke-NasScript -Body $wait -AllowFail
    if ($w.Output -match 'FRONTEND_TIMEOUT') {


        (Invoke-NasScript -Body 'docker logs --tail=40 xuri-live-web-watch 2>&1' -AllowFail).Output |
            ForEach-Object { "     $_" }
        Die '240 秒内前端产物没就绪（上面是 web-watch 日志）。别当成成功——线上很可能还是旧前端。'
    }
    else { $w.Output | Where-Object { $_ -and $_ -ne 'FRONTEND_READY*' } | ForEach-Object { "  $_" } }
    $w.Output | Where-Object { $_ -match 'FRONTEND_READY' } | ForEach-Object { "  $_" }
}




if (-not $ReloadOnly) {
    $deadline = (Get-Date).AddSeconds(90)
    $probeUrl = "$BaseUrl/api/system"
    $externalReady = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri $probeUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { $externalReady = $true; break }
        }
        catch { }
        Start-Sleep -Seconds 2
    }
    if ($externalReady) { Say '外部入口已就绪（nginx → app）' }
    else { Write-Host '  ⚠ 外部入口 90 秒内没返回 200，冒烟可能失败；先看 nginx 与 app 日志' -ForegroundColor Yellow }
}

Test-Smoke

Say '完成'
Write-Host @"
  线上：$BaseUrl
  公网：https://<public-host>
  回滚：git revert <commit> 后再跑一次本脚本；或
        cd $RemoteRepo/$ComposeDir && docker compose stop web && docker start surveyking
"@ -ForegroundColor DarkGray