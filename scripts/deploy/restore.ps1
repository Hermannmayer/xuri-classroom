<#
.SYNOPSIS
  Windows 恢复脚本：从 backup_*.zip 恢复 MySQL 数据库和 files 上传目录。

.DESCRIPTION
  恢复前会停止 Windows 服务；从备份包解压 db.sql、files.zip 后还原数据库和文件。
  备份中的 app.env 是脱敏副本，不会覆盖线上 app.env；请确保线上 app.env 的数据库连接正确。
  恢复完成后会尝试重新启动服务。数据库是覆盖式恢复，请先确认备份文件正确。

.PARAMETER BackupPath
  必填，backup_*.zip 或已解压的备份目录。

.PARAMETER InstallDir
  安装目录，默认 C:\xuri-classroom（读取 app.env、恢复 files\）。

.PARAMETER ServiceName
  Windows 服务名，默认 xuri-classroom。

.PARAMETER Force
  跳过交互确认（自动化时使用）。

.PARAMETER MysqlPath
  mysql 可执行文件；默认从 PATH 查找。

.EXAMPLE
  .\restore.ps1 -BackupPath .\backups\backup_20261106_003000.zip
  .\restore.ps1 -BackupPath D:\backups\backup_20261106_003000.zip -Force
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [string]$InstallDir = 'C:\xuri-classroom',
    [string]$ServiceName = 'xuri-classroom',
    [switch]$Force,
    [string]$MysqlPath = 'mysql.exe'
)

$ErrorActionPreference = 'Stop'

function Assert-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw '请以管理员身份运行 PowerShell。'
    }
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

Assert-Admin
$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir)
$EnvFile = Join-Path $InstallDir 'app.env'
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw "找不到线上 app.env：$EnvFile"
}
$cfg = Read-EnvMap -Path $EnvFile
foreach ($key in @('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER')) {
    if (-not $cfg[$key]) {
        throw "app.env 缺少 $key"
    }
}

$backupItem = Get-Item -LiteralPath $BackupPath -ErrorAction Stop
$tempDir = $null
if ($backupItem.PSIsContainer) {
    $sourceDir = $backupItem.FullName
}
elseif ($backupItem.Extension -eq '.zip') {
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("xuri_restore_" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Expand-Archive -LiteralPath $backupItem.FullName -DestinationPath $tempDir -Force
    $sourceDir = $tempDir
}
else {
    throw "不支持的备份格式：$($backupItem.Extension)；请传 backup_*.zip 或已解压目录。"
}

$dumpFile = Join-Path $sourceDir 'db.sql'
if (-not (Test-Path -LiteralPath $dumpFile -PathType Leaf)) {
    throw "备份中缺少 db.sql：$sourceDir"
}

if (-not $Force) {
    Write-Host "即将停止服务 $ServiceName，并用以下备份覆盖数据库 $($cfg['DB_NAME'])：" -ForegroundColor Yellow
    Write-Host "  $($backupItem.FullName)"
    $answer = Read-Host '确认继续？输入 yes 继续'
    if ($answer -notmatch '^(y|yes)$') {
        throw '用户取消恢复'
    }
}

$mysqlExe = Resolve-Exe -PathOrName $MysqlPath -DisplayName 'mysql'
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
try {
    if ($svc -and $svc.Status -ne 'Stopped') {
        Write-Host "[INFO] 停止服务：$ServiceName"
        Stop-Service -Name $ServiceName -Force
        (Get-Service -Name $ServiceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(20))
    }
    elseif (-not $svc) {
        Write-Warning "服务不存在：$ServiceName；继续恢复数据，但不会自动启动服务。"
    }

    Write-Host "[INFO] 恢复数据库 $($cfg['DB_NAME']) ..."
    $env:MYSQL_PWD = $cfg['DB_PASSWORD']
    $cmdLine = '"{0}" -h "{1}" -P "{2}" -u "{3}" < "{4}"' -f `
        $mysqlExe, $cfg['DB_HOST'], $cfg['DB_PORT'], $cfg['DB_USER'], $dumpFile
    & cmd.exe /c $cmdLine
    if ($LASTEXITCODE -ne 0) {
        throw "mysql 恢复失败，exit=$LASTEXITCODE"
    }

    $filesZip = Join-Path $sourceDir 'files.zip'
    if (Test-Path -LiteralPath $filesZip -PathType Leaf) {
        Write-Host "[INFO] 恢复 files 上传目录 ..."
        Expand-Archive -LiteralPath $filesZip -DestinationPath $InstallDir -Force
    }
    elseif (Test-Path -LiteralPath (Join-Path $sourceDir 'files.missing')) {
        Write-Warning '备份中没有 files 上传目录（files.missing），跳过文件恢复。'
    }
    else {
        Write-Warning '备份中没有 files.zip，跳过文件恢复。'
    }

    Write-Warning '备份中的 app.env 是脱敏副本，未覆盖线上 app.env；如连接信息有误请手动修改。'

    if ($svc) {
        Write-Host "[INFO] 启动服务：$ServiceName"
        Start-Service -Name $ServiceName
        (Get-Service -Name $ServiceName).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
        Write-Host "[INFO] 恢复完成，服务状态：$((Get-Service -Name $ServiceName).Status)"
    }
    else {
        Write-Host '[INFO] 恢复完成（服务未安装，未自动启动）。'
    }
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    if ($tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
