#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Windows 生产部署脚本：安装 xuri-classroom 为 Windows 服务。

.DESCRIPTION
  创建安装目录、拷贝 jar、生成 app.env、注册 Windows 服务并放行防火墙端口。
  优先使用 sc.exe create；如果创建失败，会尝试 nssm；两者都不可用时给出明确提示。
  重复执行是幂等的：已有同名服务会先停止/删除再创建，app.env 已存在则保留并更新 SERVER_PORT。

.PARAMETER JarPath
  必填，待部署的 Spring Boot jar 路径。

.PARAMETER InstallDir
  安装目录，默认 C:\xuri-classroom。

.PARAMETER Port
  服务端口，默认 80。

.PARAMETER ServiceName
  Windows 服务名，默认 xuri-classroom。

.PARAMETER JavaPath
  java.exe 路径；不传则从 PATH 查找。

.EXAMPLE
  .\install.ps1 -JarPath C:\build\app.jar
  .\install.ps1 -JarPath C:\build\app.jar -InstallDir D:\apps\xuri-classroom -Port 8080
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$JarPath,

    [string]$InstallDir = 'C:\xuri-classroom',

    [ValidateRange(1, 65535)]
    [int]$Port = 80,

    [string]$ServiceName = 'xuri-classroom',

    [string]$JavaPath = ''
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

function Assert-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw '请以管理员身份运行 PowerShell（右键“以管理员身份运行”）。'
    }
}

Assert-Admin

if (-not (Test-Path -LiteralPath $JarPath -PathType Leaf)) {
    throw "jar 不存在：$JarPath"
}
$JarPath = (Resolve-Path -LiteralPath $JarPath).Path
$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir)

if ($JavaPath) {
    if (-not (Test-Path -LiteralPath $JavaPath -PathType Leaf)) {
        throw "Java 不存在：$JavaPath"
    }
    $JavaExe = (Resolve-Path -LiteralPath $JavaPath).Path
}
else {
    $javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
    if (-not $javaCommand) {
        throw '找不到 java.exe，请安装 JRE/JDK，或用 -JavaPath 指定。'
    }
    $JavaExe = $javaCommand.Source
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$FilesDir = Join-Path $InstallDir 'files'
New-Item -ItemType Directory -Path $FilesDir -Force | Out-Null

$TargetJar = Join-Path $InstallDir 'app.jar'
if ([System.IO.Path]::GetFullPath($JarPath) -ne [System.IO.Path]::GetFullPath($TargetJar)) {
    Copy-Item -LiteralPath $JarPath -Destination $TargetJar -Force
    Write-Host "[INFO] 已拷贝 jar：$TargetJar"
}
else {
    Write-Host "[INFO] jar 已在安装目录，跳过拷贝"
}

$EnvFile = Join-Path $InstallDir 'app.env'
$EnvTemplate = @"
# xuri-classroom 运行环境变量（由 install.ps1 生成）
# 修改后重启服务：Restart-Service $ServiceName
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=surveyking
DB_USER=root
DB_PASSWORD=change-me
SERVER_PORT=$Port
"@

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Utf8NoBom -Path $EnvFile -Text $EnvTemplate
    Write-Host "[INFO] 已生成 app.env 模板（请修改 DB_PASSWORD）"
}
else {
    # 不覆盖已有数据库配置，只更新端口，保证重复执行时端口参数生效
    $lines = @(Get-Content -LiteralPath $EnvFile)
    $portFound = $false
    $merged = foreach ($line in $lines) {
        if ($line -match '^\s*SERVER_PORT\s*=') {
            $portFound = $true
            "SERVER_PORT=$Port"
        }
        else {
            $line
        }
    }
    if (-not $portFound) {
        $merged = @($merged) + "SERVER_PORT=$Port"
    }
    Write-Utf8NoBom -Path $EnvFile -Text (($merged -join [Environment]::NewLine) + [Environment]::NewLine)
    Write-Host "[INFO] app.env 已存在，保留数据库配置并更新 SERVER_PORT"
}

# 用一个 cmd 包装器加载 app.env，再启动 Java；Windows 服务本身没有 EnvironmentFile
$WrapperPath = Join-Path $InstallDir 'start-service.cmd'
$Wrapper = @"
@echo off
setlocal
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0app.env") do set "%%A=%%B"
"$JavaExe" -jar "%~dp0app.jar"
"@
Set-Content -LiteralPath $WrapperPath -Value $Wrapper -Encoding Ascii

# 幂等：先停掉并删除同名服务
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[INFO] 服务已存在，停止并重建：$ServiceName"
    if ($existing.Status -ne 'Stopped') {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        (Get-Service -Name $ServiceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(20))
    }
    & sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

$createdBySc = $false
try {
    # binPath 要传：cmd.exe /c ""C:\...\start-service.cmd""
    $binPath = '"{0}" /c ""{1}""' -f $env:ComSpec, $WrapperPath
    & sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= $ServiceName | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "sc.exe create 失败，exit=$LASTEXITCODE"
    }
    & sc.exe description $ServiceName 'xuri-classroom application' | Out-Null
    $createdBySc = $true
    Write-Host "[INFO] 已通过 sc.exe 注册服务：$ServiceName"
}
catch {
    Write-Warning "sc.exe 创建服务失败：$($_.Exception.Message)"
    & sc.exe delete $ServiceName 2>$null | Out-Null

    $nssm = Get-Command nssm.exe -ErrorAction SilentlyContinue
    if (-not $nssm) {
        throw @'
sc.exe 创建服务失败，且系统未安装 nssm。
请任选其一：
  1) 安装 nssm（https://nssm.cc/），把 nssm.exe 放到 PATH，然后重跑本脚本；
  2) 手动注册服务后把 JAVA_HOME/环境变量配置到服务里。
本脚本不会静默安装第三方工具。
'@
    }

    Write-Host "[INFO] 检测到 nssm，改用 nssm 注册服务"
    & $nssm.Source install $ServiceName $JavaExe | Out-Null
    & $nssm.Source set $ServiceName AppDirectory $InstallDir | Out-Null
    & $nssm.Source set $ServiceName AppParameters ('-jar "{0}"' -f $TargetJar) | Out-Null
    $envPairs = @(Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^[^#\s].*=' })
    if ($envPairs.Count -gt 0) {
        & $nssm.Source set $ServiceName AppEnvironmentExtra @envPairs | Out-Null
    }
    & $nssm.Source set $ServiceName Start SERVICE_AUTO_START | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "nssm 注册服务失败，exit=$LASTEXITCODE"
    }
    Write-Host "[INFO] 已通过 nssm 注册服务：$ServiceName"
}

# 防火墙放行（重复执行时先删旧规则）
$RuleName = "$ServiceName HTTP $Port"
Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
New-NetFirewallRule `
    -DisplayName $RuleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile Any | Out-Null
Write-Host "[INFO] 已放行防火墙 TCP $Port"

# 启动服务
if ($createdBySc) {
    Start-Service -Name $ServiceName
}
else {
    Start-Sleep -Milliseconds 500
}
$svc = Get-Service -Name $ServiceName
Write-Host "[INFO] 服务状态：$($svc.Status)"
Write-Host "[INFO] 安装目录：$InstallDir"
Write-Host "[INFO] 配置文件：$EnvFile（记得改 DB_PASSWORD）"
Write-Host "[INFO] 查看服务：Get-Service $ServiceName"
Write-Host "[INFO] 卸载：.\uninstall.ps1 -ServiceName $ServiceName -InstallDir `"$InstallDir`""
