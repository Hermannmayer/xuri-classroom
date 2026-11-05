#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Windows 卸载脚本：停止并删除 xuri-classroom Windows 服务。

.DESCRIPTION
  停止/删除服务并移除防火墙规则；默认保留安装目录（app.env、files/ 等数据）。
  加 -Purge 才会删除安装目录。

.PARAMETER InstallDir
  安装目录，默认 C:\xuri-classroom。

.PARAMETER ServiceName
  Windows 服务名，默认 xuri-classroom。

.PARAMETER Purge
  删除安装目录（数据库不会删除）。

.EXAMPLE
  .\uninstall.ps1
  .\uninstall.ps1 -Purge
#>
[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\xuri-classroom',
    [string]$ServiceName = 'xuri-classroom',
    [switch]$Purge
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

Assert-Admin
$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir)

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc) {
    Write-Host "[INFO] 停止服务：$ServiceName"
    if ($svc.Status -ne 'Stopped') {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        try {
            (Get-Service -Name $ServiceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(20))
        }
        catch {
            Write-Warning "等待服务停止超时：$ServiceName"
        }
    }

    Write-Host "[INFO] 删除服务：$ServiceName"
    & sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
}
else {
    Write-Host "[INFO] 服务不存在，跳过：$ServiceName"
}

# 移除本脚本创建的防火墙规则（名字带端口，逐条匹配）
Get-NetFirewallRule -DisplayName "$ServiceName HTTP *" -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue

if ($Purge) {
    if (Test-Path -LiteralPath $InstallDir) {
        Write-Host "[INFO] 删除安装目录：$InstallDir"
        Remove-Item -LiteralPath $InstallDir -Recurse -Force
    }
}
else {
    Write-Host "[INFO] 已保留数据目录：$InstallDir"
    Write-Host "[INFO] 如需彻底删除：.\uninstall.ps1 -Purge"
}

Write-Host '[INFO] 卸载完成（数据库数据未删除）'
