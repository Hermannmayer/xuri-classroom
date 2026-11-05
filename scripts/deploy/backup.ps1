<#
.SYNOPSIS
  Windows 备份脚本：备份 MySQL 全库、files 上传目录和脱敏后的 app.env。

.DESCRIPTION
  输出一个 backup_yyyyMMdd_HHmmss.zip 到输出目录，并按保留份数清理旧备份。
  备份内包含：
    - db.sql          mysqldump 全库（含 routines/triggers）
    - files.zip       <InstallDir>\files 上传目录
    - app.env         app.env 的脱敏副本（DB_PASSWORD 替换为 ***）
    - manifest.txt    备份说明
  注意：app.env 是脱敏参考，恢复脚本不会用它覆盖线上配置。

.PARAMETER InstallDir
  安装目录，默认 C:\xuri-classroom（应包含 app.env、files\）。

.PARAMETER OutputDir
  备份输出目录，默认当前目录下的 .\backups。

.PARAMETER Retention
  保留份数，默认 7；超出的旧备份自动删除。

.PARAMETER MysqlDumpPath
  mysqldump 可执行文件；默认从 PATH 查找。

.PARAMETER MysqlPath
  mysql 可执行文件（本脚本不直接用，保留给下游恢复脚本一致性说明）。

.EXAMPLE
  .\backup.ps1
  .\backup.ps1 -InstallDir D:\apps\xuri-classroom -OutputDir D:\backups -Retention 14
#>
[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\xuri-classroom',
    [string]$OutputDir = '.\backups',
    [ValidateRange(1, 3650)]
    [int]$Retention = 7,
    [string]$MysqlDumpPath = 'mysqldump.exe',
    [string]$MysqlPath = 'mysql.exe'
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

function Read-EnvMap {
    param([string]$Path)
    $map = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $map[$matches[1]] = $matches[2].Trim()
        }
    }
    return $map
}

function Resolve-Exe {
    param([string]$PathOrName, [string]$DisplayName)
    if ($PathOrName -match '[\\/]') {
        if (-not (Test-Path -LiteralPath $PathOrName -PathType Leaf)) {
            throw "$DisplayName 不存在：$PathOrName"
        }
        return (Resolve-Path -LiteralPath $PathOrName).Path
    }
    $cmd = Get-Command $PathOrName -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "找不到 $DisplayName（$PathOrName），请安装 MySQL 客户端或传入完整路径。"
    }
    return $cmd.Source
}

$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir)
$OutputDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir)
$EnvFile = Join-Path $InstallDir 'app.env'
$FilesDir = Join-Path $InstallDir 'files'

if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw "找不到配置文件：$EnvFile"
}
$cfg = Read-EnvMap -Path $EnvFile
foreach ($key in @('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER')) {
    if (-not $cfg[$key]) {
        throw "app.env 缺少 $key"
    }
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$ArchivePath = Join-Path $OutputDir "backup_$Timestamp.zip"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("xuri_backup_" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

$dumpExe = Resolve-Exe -PathOrName $MysqlDumpPath -DisplayName 'mysqldump'

try {
    Write-Host "[INFO] 导出数据库 $($cfg['DB_NAME']) ..."
    $dumpFile = Join-Path $TempDir 'db.sql'
    $env:MYSQL_PWD = $cfg['DB_PASSWORD']
    $dumpArgs = @(
        '-h', $cfg['DB_HOST'],
        '-P', $cfg['DB_PORT'],
        '-u', $cfg['DB_USER'],
        '--single-transaction',
        '--routines',
        '--events',
        '--triggers',
        '--databases', $cfg['DB_NAME'],
        "--result-file=$dumpFile"
    )
    & $dumpExe @dumpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump 失败，exit=$LASTEXITCODE"
    }

    Write-Host '[INFO] 打包 files 上传目录 ...'
    $filesZip = Join-Path $TempDir 'files.zip'
    if (Test-Path -LiteralPath $FilesDir -PathType Container) {
        Compress-Archive -Path $FilesDir -DestinationPath $filesZip -CompressionLevel Optimal -Force
    }
    else {
        Write-Utf8NoBom -Path (Join-Path $TempDir 'files.missing') -Text "files directory not found: $FilesDir`r`n"
    }

    Write-Host '[INFO] 生成脱敏 app.env ...'
    $maskedLines = Get-Content -LiteralPath $EnvFile | ForEach-Object {
        $_ -replace '^(\s*DB_PASSWORD\s*=).*$', '$1***'
    }
    $maskedText = @(
        '# app.env backup (DB_PASSWORD masked; do not restore this file directly)'
        '# 恢复数据库/文件时使用线上 app.env 的连接信息。'
    ) + $maskedLines
    Write-Utf8NoBom -Path (Join-Path $TempDir 'app.env') -Text (($maskedText -join [Environment]::NewLine) + [Environment]::NewLine)

    $manifest = @(
        "created=$Timestamp",
        "database=$($cfg['DB_NAME'])",
        "db_host=$($cfg['DB_HOST'])",
        'contents=db.sql, files.zip (if exists), app.env (password masked), manifest.txt',
        'restore=restore.ps1 / restore.sh（恢复前先停服务）'
    )
    Write-Utf8NoBom -Path (Join-Path $TempDir 'manifest.txt') -Text (($manifest -join [Environment]::NewLine) + [Environment]::NewLine)

    Compress-Archive -Path (Join-Path $TempDir '*') -DestinationPath $ArchivePath -CompressionLevel Optimal -Force
    if (-not (Test-Path -LiteralPath $ArchivePath)) {
        throw "备份归档创建失败：$ArchivePath"
    }

    $old = Get-ChildItem -LiteralPath $OutputDir -Filter 'backup_*.zip' -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $Retention
    foreach ($item in $old) {
        Remove-Item -LiteralPath $item.FullName -Force
        Write-Host "[INFO] 清理旧备份：$($item.Name)"
    }

    $sizeMb = [Math]::Round((Get-Item -LiteralPath $ArchivePath).Length / 1MB, 2)
    Write-Host "[INFO] 备份完成：$ArchivePath（$sizeMb MB），保留 $Retention 份"
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
