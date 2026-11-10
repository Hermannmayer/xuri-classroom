#requires -version 5.1
<#
  旭日云课堂 · Windows 便携版启动器
  ---------------------------------------------------------------------------
  这个脚本只做一件事：把「解压出来的包」变成「能访问的网站」，并且尽量不让人工介入。

  子命令（由同目录的 .cmd 包装）：
    setup    引导安装：环境检查 → JRE → MySQL → 建库导入 → 启动应用
    start    日常启动：已安装则直接起；没装过会自动进入引导安装
    stop     停止应用和内置 MySQL
    status   查看端口、PID、访问地址
    doctor   体检并输出诊断报告（--fix 尝试自动修复）

  兼容性：Windows PowerShell 5.1（Windows 10/11 自带），不使用 PowerShell 7 专有语法。
  编码：本文件是 UTF-8（带 BOM）+ CRLF；中文注释和提示在 5.1 下不会乱码。
#>

$ErrorActionPreference = 'Stop'

# ===========================================================================
# 0. 路径与全局状态
# ===========================================================================

$script:ScriptDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($script:ScriptDir)) {
  $script:ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrEmpty($script:ScriptDir)) {
  Write-Host '[错误] 无法确定脚本所在目录，请从包内目录运行（start.cmd / setup.cmd）。' -ForegroundColor Red
  exit 1
}
$script:Root = Split-Path -Parent $script:ScriptDir

$script:P = @{
  Root       = $script:Root
  Lib        = $script:ScriptDir
  App        = Join-Path $script:Root 'app'
  Runtime    = Join-Path $script:Root 'runtime'
  Jre        = Join-Path $script:Root 'runtime\jre8'
  JavaExe    = Join-Path $script:Root 'runtime\jre8\bin\java.exe'
  Mysql      = Join-Path $script:Root 'mysql'
  MysqldExe  = Join-Path $script:Root 'mysql\bin\mysqld.exe'
  MysqlExe   = Join-Path $script:Root 'mysql\bin\mysql.exe'
  MysqlAdmin = Join-Path $script:Root 'mysql\bin\mysqladmin.exe'
  Config     = Join-Path $script:Root 'config'
  AppEnv     = Join-Path $script:Root 'config\app.env'
  RuntimeEnv = Join-Path $script:Root 'config\runtime.env'
  SetupDone  = Join-Path $script:Root 'config\setup.done'
  Logs       = Join-Path $script:Root 'logs'
  Run        = Join-Path $script:Root 'run'
  Cache      = Join-Path $script:Root 'cache'
  Data       = Join-Path $script:Root 'data'
  DataMysql  = Join-Path $script:Root 'data\mysql'
  Files      = Join-Path $script:Root 'data\files'
  AppPid     = Join-Path $script:Root 'run\app.pid'
  MysqlPid   = Join-Path $script:Root 'run\mysql.pid'
  MyIni      = Join-Path $script:Root 'run\my.ini'
  Tmp        = Join-Path $script:Root 'run\tmp'
  Version    = Join-Path $script:Root 'VERSION'
}

$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:DryRun = $false
$script:LogPath = ''
$script:Opts = @{}
$script:ConfigCache = $null
$script:RuntimeCache = $null
$script:CheckPass = 0
$script:CheckWarn = 0
$script:CheckFail = 0

# ===========================================================================
# 1. 输出与日志
# ===========================================================================

function Add-LogText([string]$Text) {
  if ([string]::IsNullOrEmpty($script:LogPath)) { return }
  try {
    [System.IO.File]::AppendAllText($script:LogPath, $Text + [Environment]::NewLine, $script:Utf8NoBom)
  } catch { }
}

function Out-Line([string]$Text) {
  Write-Host $Text
  Add-LogText $Text
}

function Out-Info([string]$Text) {
  Out-Line ('  ' + $Text)
}

function Out-Bullet([string]$Text) {
  Out-Line ('    · ' + $Text)
}

function Out-Ok([string]$Text) {
  $line = '  [通过] ' + $Text
  Write-Host $line -ForegroundColor Green
  Add-LogText $line
}

function Out-Warn([string]$Text) {
  $line = '  [警告] ' + $Text
  Write-Host $line -ForegroundColor Yellow
  Add-LogText $line
}

function Out-Fail([string]$Text) {
  $line = '  [失败] ' + $Text
  Write-Host $line -ForegroundColor Red
  Add-LogText $line
}

function Out-Dry([string]$Text) {
  $line = '  [预演] ' + $Text
  Write-Host $line -ForegroundColor Magenta
  Add-LogText $line
}

function Out-Step([string]$Title) {
  $line = '──── ' + $Title + ' ────'
  Write-Host ''
  Write-Host $line -ForegroundColor Cyan
  Add-LogText ''
  Add-LogText $line
}

function Out-Header([string]$Title) {
  $bar = '============================================================'
  Write-Host ''
  Write-Host $bar -ForegroundColor DarkCyan
  Write-Host ('  ' + $Title) -ForegroundColor Cyan
  Write-Host $bar -ForegroundColor DarkCyan
  Add-LogText ''
  Add-LogText $bar
  Add-LogText ('  ' + $Title)
  Add-LogText $bar
}

# ===========================================================================
# 2. 基础工具
# ===========================================================================

function Get-Timestamp {
  return (Get-Date -Format 'yyyyMMdd-HHmmss')
}

function Ensure-Directory([string]$Path) {
  if ([string]::IsNullOrEmpty($Path)) { return }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Write-TextFile([string]$Path, [string[]]$Lines) {
  $parent = Split-Path -Parent $Path
  if (-not [string]::IsNullOrEmpty($parent)) { Ensure-Directory $parent }
  [System.IO.File]::WriteAllLines($Path, [string[]]$Lines, $script:Utf8NoBom)
}

function Read-TextFile([string]$Path) {
  if ([string]::IsNullOrEmpty($Path)) { return '' }
  if (-not (Test-Path -LiteralPath $Path)) { return '' }
  try { return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8) } catch { return '' }
}

function Get-FileTail([string]$Path, [int]$LineCount) {
  if ([string]::IsNullOrEmpty($Path)) { return '' }
  if (-not (Test-Path -LiteralPath $Path)) { return '' }
  try {
    return ((Get-Content -LiteralPath $Path -Tail $LineCount -Encoding UTF8 -ErrorAction Stop) -join [Environment]::NewLine)
  } catch {
    return ''
  }
}

function Get-PackageVersion {
  $text = Read-TextFile $script:P.Version
  if (-not [string]::IsNullOrWhiteSpace($text)) { return $text.Trim() }
  return 'unknown'
}

function ConvertTo-IntValue([string]$Text, [int]$DefaultValue) {
  if ($null -eq $Text) { return $DefaultValue }
  $value = 0
  if ([int]::TryParse(([string]$Text).Trim(), [ref]$value)) { return $value }
  return $DefaultValue
}

function ConvertTo-LongValue([string]$Text, [long]$DefaultValue) {
  if ($null -eq $Text) { return $DefaultValue }
  $value = [long]0
  if ([long]::TryParse(([string]$Text).Trim(), [ref]$value)) { return $value }
  return $DefaultValue
}

function Get-DirectorySizeMB([string]$Path) {
  if ([string]::IsNullOrEmpty($Path)) { return 0 }
  if (-not (Test-Path -LiteralPath $Path)) { return 0 }
  $sum = [long]0
  try {
    foreach ($file in [System.IO.Directory]::EnumerateFiles($Path, '*', [System.IO.SearchOption]::AllDirectories)) {
      try {
        $fileInfo = New-Object System.IO.FileInfo($file)
        $sum += [long]$fileInfo.Length
      } catch { }
    }
  } catch {
    foreach ($file in @(Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue)) {
      $sum += [long]$file.Length
    }
  }
  return [math]::Round($sum / 1MB, 1)
}

# Start-Process -ArgumentList 传数组时，PowerShell 只是用空格拼接，不会自动给含空格的
# 参数补引号（实测：@('-File','C:\dir with space\x.ps1') 会被拆成两个参数）。
# 所以含空格的单个参数必须自己带引号。下面两个函数就是干这个的。
function Quote-NativeArg([string]$Text) {
  $value = [string]$Text
  if ($value.Length -eq 0) { return '""' }
  if ($value -match '[\s"]') {
    return '"' + $value.Replace('"', '\"') + '"'
  }
  return $value
}

function ConvertTo-NativeArgs([string[]]$Parts) {
  $quoted = @()
  foreach ($part in $Parts) {
    $quoted += (Quote-NativeArg ([string]$part))
  }
  return $quoted
}

# 调用原生 exe 并捕获输出。
# 注意：Windows PowerShell 5.1 在 $ErrorActionPreference='Stop' 时，会把原生命令写到
# stderr 的内容包装成 NativeCommandError 终止错误（java -version / mysqld --version
# 都会写 stderr），所以这里必须临时改成 Continue，否则 catch 会吞掉正常输出。
function Invoke-NativeCapture([string]$ExePath, [string[]]$Arguments) {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $exitCode = -1
  $text = ''
  try {
    $output = @(& $ExePath @Arguments 2>&1)
    $exitCode = [int]$LASTEXITCODE
    $text = (($output | ForEach-Object { ([string]$_).Trim() }) -join ' ').Trim()
  } catch {
    $text = [string]$_.Exception.Message
    $exitCode = -1
  } finally {
    $ErrorActionPreference = $previous
  }
  return @{ ExitCode = $exitCode; Text = $text }
}

function ConvertTo-PsLiteral([string]$Value) {
  return "'" + $Value.Replace("'", "''") + "'"
}

function Sql-Str([string]$Value) {
  return "'" + $Value.Replace("'", "''") + "'"
}

function Sql-Ident([string]$Value) {
  $backtick = [string][char]96
  return $backtick + $Value.Replace($backtick, $backtick + $backtick) + $backtick
}

function Get-PowerShellExe {
  $candidate = Join-Path $PSHome 'powershell.exe'
  if (Test-Path -LiteralPath $candidate) { return $candidate }
  return 'powershell.exe'
}

function Test-Administrator {
  try {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function New-RandomBytes([int]$ByteCount) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $buffer = New-Object byte[] $ByteCount
    $rng.GetBytes($buffer)
    return $buffer
  } finally {
    try { $rng.Dispose() } catch { }
  }
}

function New-RandomHex([int]$ByteCount) {
  $bytes = New-RandomBytes $ByteCount
  $sb = New-Object System.Text.StringBuilder
  foreach ($b in $bytes) { [void]$sb.Append($b.ToString('x2')) }
  return $sb.ToString()
}

function New-RandomBase64([int]$ByteCount) {
  return [Convert]::ToBase64String((New-RandomBytes $ByteCount))
}

# ===========================================================================
# 3. 进程、端口、HTTP
# ===========================================================================

function Get-ProcessRecord([int]$ProcessId) {
  if ($ProcessId -le 0) { return $null }
  try { return Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId=' + $ProcessId) -ErrorAction Stop } catch { return $null }
}

function Test-ProcessAlive([int]$ProcessId) {
  if ($ProcessId -le 0) { return $false }
  $record = Get-ProcessRecord $ProcessId
  if ($record -ne $null) { return $true }
  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process -ne $null) { return $true }
  return $false
}

function Find-ProcessByCommandLine([string]$Name, [string]$MustContain) {
  $result = New-Object System.Collections.ArrayList
  $records = @()
  try { $records = @(Get-CimInstance -ClassName Win32_Process -Filter ("Name='" + $Name + "'") -ErrorAction Stop) } catch { return @() }
  foreach ($record in $records) {
    $commandLine = ''
    if ($record.CommandLine) { $commandLine = [string]$record.CommandLine }
    if ([string]::IsNullOrEmpty($MustContain)) {
      [void]$result.Add($record)
      continue
    }
    if ($commandLine.IndexOf($MustContain, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      [void]$result.Add($record)
    }
  }
  return @($result)
}

function Test-ProcessIsChildOf([int]$ChildProcessId, [int]$ParentProcessId) {
  if ($ChildProcessId -le 0 -or $ParentProcessId -le 0) { return $false }
  $record = Get-ProcessRecord $ChildProcessId
  if ($record -eq $null) { return $false }
  if ($record.ParentProcessId -ne $null -and [int]$record.ParentProcessId -eq $ParentProcessId) { return $true }
  return $false
}

# 端口是不是“我们的进程”在监听。
# 注意：Windows 上 mysqld 会再拉起一个子进程，真正持有监听 socket 的往往是子进程，
# 所以不能只比较 PID，还要看父子关系。
function Test-PortOwnedByTrackedProcess([int]$Port, [int]$TrackedProcessId) {
  $owner = Get-ListeningProcessId $Port
  if ($owner -le 0) { return $false }
  if ($owner -eq $TrackedProcessId) { return $true }
  if (Test-ProcessIsChildOf $owner $TrackedProcessId) { return $true }
  return $false
}

function Get-ListeningProcessId([int]$Port) {
  try {
    $connections = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    foreach ($connection in $connections) {
      if ($connection.OwningProcess -gt 0) { return [int]$connection.OwningProcess }
    }
    return 0
  } catch {
    try {
      $previousPreference = $ErrorActionPreference
      $ErrorActionPreference = 'Continue'
      try { $lines = @(& netstat.exe -ano -p tcp 2>$null) } finally { $ErrorActionPreference = $previousPreference }
      foreach ($line in $lines) {
        $text = [string]$line
        if ($text.IndexOf('LISTENING') -lt 0) { continue }
        $parts = @($text -split '\s+' | Where-Object { $_ -ne '' })
        if ($parts.Count -lt 5) { continue }
        $local = [string]$parts[1]
        $colon = $local.LastIndexOf(':')
        if ($colon -lt 0) { continue }
        $parsedPort = 0
        if (-not [int]::TryParse($local.Substring($colon + 1), [ref]$parsedPort)) { continue }
        if ($parsedPort -eq $Port) {
          $parsedPid = 0
          if ([int]::TryParse([string]$parts[4], [ref]$parsedPid)) { return $parsedPid }
        }
      }
    } catch { }
    return 0
  }
}

function Test-PortOpen([string]$TargetHost, [int]$Port, [int]$TimeoutMs) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    try { $client.Close() } catch { }
  }
}

function Wait-PortOpen([string]$TargetHost, [int]$Port, [int]$TimeoutSec) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortOpen $TargetHost $Port 700) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Wait-PortClosed([string]$TargetHost, [int]$Port, [int]$TimeoutSec) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (-not (Test-PortOpen $TargetHost $Port 300)) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Invoke-HttpProbe([string]$Url, [int]$TimeoutSec) {
  $result = @{ Ok = $false; StatusCode = 0; Body = ''; Error = '' }
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    $result.Ok = $true
    $result.StatusCode = [int]$response.StatusCode
    if ($response.Content -ne $null) { $result.Body = [string]$response.Content }
  } catch {
    $exception = $_.Exception
    $webResponse = $null
    try { $webResponse = $exception.Response } catch { }
    if ($webResponse -ne $null) {
      try {
        $result.Ok = $true
        $result.StatusCode = [int]$webResponse.StatusCode
      } catch { }
    }
    $result.Error = [string]$exception.Message
  }
  return $result
}

function Get-LanAddresses {
  $addresses = New-Object System.Collections.ArrayList
  try {
    $items = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -ne 'WellKnown'
    })
    foreach ($item in $items) {
      $ip = [string]$item.IPAddress
      if (-not $addresses.Contains($ip)) { [void]$addresses.Add($ip) }
    }
  } catch {
    try {
      $hostAddresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())
      foreach ($address in $hostAddresses) {
        if ($address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
          $ip = $address.IPAddressToString
          if ($ip -notlike '127.*' -and -not $addresses.Contains($ip)) { [void]$addresses.Add($ip) }
        }
      }
    } catch { }
  }
  return @($addresses)
}

function Open-Url([string]$Url) {
  if ($script:Opts.NoBrowser) {
    Out-Info '（--no-browser）不自动打开浏览器'
    return
  }
  if ($script:DryRun) {
    Out-Dry ('将打开浏览器：' + $Url)
    return
  }
  try {
    Start-Process -FilePath $Url | Out-Null
    Out-Info ('已在默认浏览器打开：' + $Url)
  } catch {
    Out-Warn ('自动打开浏览器失败，请手工访问：' + $Url)
  }
}

# ===========================================================================
# 4. 文件校验与解压
# ===========================================================================

function Get-Sha256([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Test-FileIntegrity([string]$Path, [string]$Sha256, [long]$Size, [switch]$Quiet) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $file = Get-Item -LiteralPath $Path
  if ([string]::IsNullOrWhiteSpace($Sha256)) {
    # 没有 SHA256 时才用大小兜底（大小只当参考，不轻易判死）
    if ($Size -gt 0 -and $file.Length -ne $Size) {
      if (-not $Quiet) {
        Out-Warn ('文件大小不符：' + $file.Name)
        Out-Bullet ('期望 ' + $Size + ' 字节，实际 ' + $file.Length + ' 字节')
      }
      return $false
    }
    return $true
  }
  # 有 SHA256 时以 SHA256 为准：它是唯一可靠的完整性依据
  $actual = Get-Sha256 $Path
  if ($actual -ne $Sha256.ToLowerInvariant()) {
    if (-not $Quiet) {
      Out-Warn ('SHA256 校验失败：' + $file.Name)
      Out-Bullet ('期望：' + $Sha256.ToLowerInvariant())
      Out-Bullet ('实际：' + $actual)
      Out-Bullet ('文件大小：' + $file.Length + ' 字节')
    }
    return $false
  }
  return $true
}

function Expand-ZipArchive([string]$ZipPath, [string]$Destination) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force -ErrorAction SilentlyContinue
  }
  Ensure-Directory $Destination
  [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $Destination)
}

function Find-ExtractedRoot([string]$Directory, [string]$RelativeExe) {
  if (Test-Path -LiteralPath (Join-Path $Directory $RelativeExe)) { return $Directory }
  $level1 = @(Get-ChildItem -LiteralPath $Directory -Directory -Force -ErrorAction SilentlyContinue)
  foreach ($item in $level1) {
    if (Test-Path -LiteralPath (Join-Path $item.FullName $RelativeExe)) { return $item.FullName }
  }
  foreach ($item in $level1) {
    $level2 = @(Get-ChildItem -LiteralPath $item.FullName -Directory -Force -ErrorAction SilentlyContinue)
    foreach ($child in $level2) {
      if (Test-Path -LiteralPath (Join-Path $child.FullName $RelativeExe)) { return $child.FullName }
    }
  }
  return ''
}

# ===========================================================================
# 5. 配置解析（.env 风格，支持重复键、注释、引号）
# ===========================================================================

function ConvertTo-EnvMap([string[]]$Lines) {
  $map = @{}
  foreach ($line in $Lines) {
    $text = ([string]$line).Trim()
    if ($text.Length -eq 0) { continue }
    if ($text.StartsWith('#')) { continue }
    $index = $text.IndexOf('=')
    if ($index -lt 1) { continue }
    $key = $text.Substring(0, $index).Trim()
    if ($key.Length -eq 0) { continue }
    $value = $text.Substring($index + 1).Trim()
    if ($value.Length -ge 2) {
      $first = $value.Substring(0, 1)
      $last = $value.Substring($value.Length - 1, 1)
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    if (-not $map.ContainsKey($key)) { $map[$key] = New-Object System.Collections.ArrayList }
    [void]$map[$key].Add($value)
  }
  return $map
}

function Read-EnvFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return @{} }
  try {
    $lines = [System.IO.File]::ReadAllLines($Path, [System.Text.Encoding]::UTF8)
    return ConvertTo-EnvMap $lines
  } catch {
    return @{}
  }
}

function Get-EnvValue($Map, [string]$Key, [string]$DefaultValue) {
  if ($null -ne $Map -and $Map.ContainsKey($Key)) {
    $list = $Map[$Key]
    if ($list.Count -gt 0) { return [string]$list[$list.Count - 1] }
  }
  return $DefaultValue
}

function Get-EnvValues($Map, [string]$Key) {
  if ($null -ne $Map -and $Map.ContainsKey($Key)) { return @($Map[$Key]) }
  return @()
}

function Read-PidFile([string]$Path) {
  $info = @{}
  $map = Read-EnvFile $Path
  foreach ($key in $map.Keys) {
    $list = $map[$key]
    if ($list.Count -gt 0) { $info[$key] = [string]$list[$list.Count - 1] }
  }
  return $info
}

function Write-PidFile([string]$Path, [hashtable]$Info) {
  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add('# 由 lib\launcher.ps1 自动生成，请勿手工编辑')
  foreach ($key in $Info.Keys) {
    [void]$lines.Add([string]$key + '=' + [string]$Info[$key])
  }
  Write-TextFile $Path @($lines)
}

function Remove-PidFile([string]$Path) {
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

# ===========================================================================
# 6. 应用配置（config/app.env）与运行时配置（config/runtime.env）
# ===========================================================================

function Get-AppEnvLines($Config) {
  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add('# 旭日云课堂 · Windows 便携版 应用配置')
  [void]$lines.Add('# 首次运行自动生成；修改后请先执行 stop.cmd 再 start.cmd。')
  [void]$lines.Add('# 本文件含数据库口令，不要发群、不要提交到代码仓库。')
  [void]$lines.Add('')
  [void]$lines.Add('# 网站端口：局域网用 http://本机IP:PORT 访问')
  [void]$lines.Add('PORT=' + [string]$Config.Port)
  [void]$lines.Add('')
  [void]$lines.Add('# 内置 MySQL 只监听 127.0.0.1；DB_PORT 要与 config\runtime.env 的 MYSQL_PORT 一致')
  [void]$lines.Add('DB_HOST=' + [string]$Config.DbHost)
  [void]$lines.Add('DB_PORT=' + [string]$Config.DbPort)
  [void]$lines.Add('DB_NAME=' + [string]$Config.DbName)
  [void]$lines.Add('DB_USER=' + [string]$Config.DbUser)
  [void]$lines.Add('DB_PASSWORD=' + [string]$Config.DbPassword)
  [void]$lines.Add('')
  [void]$lines.Add('# MySQL root 口令（只在本机使用；doctor.cmd --fix 会用它修复账号）')
  [void]$lines.Add('DB_ROOT_PASSWORD=' + [string]$Config.DbRootPassword)
  [void]$lines.Add('')
  [void]$lines.Add('# 登录令牌签名密钥：换了以后所有人都要重新登录')
  [void]$lines.Add('SK_JWT_SECRET=' + [string]$Config.JwtSecret)
  [void]$lines.Add('')
  [void]$lines.Add('# JVM 参数；内存小的机器可以改成 -Xmx768m')
  [void]$lines.Add('JAVA_OPTS=' + [string]$Config.JavaOpts)
  [void]$lines.Add('')
  [void]$lines.Add('# 附件与导出文件目录（相对路径按包根目录解析）')
  [void]$lines.Add('FILE_STORAGE_ROOT=' + [string]$Config.FilesRoot)
  return @($lines)
}

function Get-AppConfig {
  if ($script:ConfigCache -ne $null) { return $script:ConfigCache }

  $exists = Test-Path -LiteralPath $script:P.AppEnv
  $map = @{}
  if ($exists) { $map = Read-EnvFile $script:P.AppEnv }

  $config = @{
    Port = 8080
    DbHost = '127.0.0.1'
    DbPort = 3307
    DbName = 'surveyking'
    DbUser = 'xuri'
    DbPassword = ''
    DbRootPassword = ''
    JwtSecret = ''
    JavaOpts = '-Xmx1024m'
    FilesRoot = 'data\files'
    FilesPath = ''
    Generated = $false
  }

  if ($exists) {
    $config.Port = ConvertTo-IntValue (Get-EnvValue $map 'PORT' '8080') 8080
    $config.DbHost = Get-EnvValue $map 'DB_HOST' '127.0.0.1'
    $config.DbPort = ConvertTo-IntValue (Get-EnvValue $map 'DB_PORT' '3307') 3307
    $config.DbName = Get-EnvValue $map 'DB_NAME' 'surveyking'
    $config.DbUser = Get-EnvValue $map 'DB_USER' 'xuri'
    $config.DbPassword = Get-EnvValue $map 'DB_PASSWORD' ''
    $config.DbRootPassword = Get-EnvValue $map 'DB_ROOT_PASSWORD' ''
    $config.JwtSecret = Get-EnvValue $map 'SK_JWT_SECRET' ''
    $config.JavaOpts = Get-EnvValue $map 'JAVA_OPTS' '-Xmx1024m'
    $config.FilesRoot = Get-EnvValue $map 'FILE_STORAGE_ROOT' 'data\files'
  } else {
    if ($script:DryRun) {
      Out-Dry '将生成 config\app.env（随机数据库口令、随机 JWT 密钥、PORT=8080）'
      $config.DbPassword = '<随机生成>'
      $config.DbRootPassword = '<随机生成>'
      $config.JwtSecret = '<随机生成>'
      $config.Generated = $true
    } else {
      $config.DbPassword = New-RandomHex 16
      $config.DbRootPassword = New-RandomHex 16
      $config.JwtSecret = New-RandomBase64 48
      Write-TextFile $script:P.AppEnv (Get-AppEnvLines $config)
      $config.Generated = $true
      Out-Ok '已生成 config\app.env（数据库口令与 JWT 密钥均为随机值）'
    }
  }

  if ($config.Port -lt 1 -or $config.Port -gt 65535) {
    throw ('config\app.env 的 PORT 不合法：' + $config.Port + '（应为 1~65535 的整数）')
  }
  if ($config.DbPort -lt 1 -or $config.DbPort -gt 65535) {
    throw ('config\app.env 的 DB_PORT 不合法：' + $config.DbPort + '（应为 1~65535 的整数）')
  }
  if ([string]::IsNullOrWhiteSpace($config.DbName)) { throw 'config\app.env 的 DB_NAME 不能为空' }
  if ([string]::IsNullOrWhiteSpace($config.DbUser)) { throw 'config\app.env 的 DB_USER 不能为空' }

  $missing = @()
  if ([string]::IsNullOrWhiteSpace($config.DbPassword)) { $missing += 'DB_PASSWORD' }
  if ([string]::IsNullOrWhiteSpace($config.DbRootPassword)) { $missing += 'DB_ROOT_PASSWORD' }
  if ([string]::IsNullOrWhiteSpace($config.JwtSecret)) { $missing += 'SK_JWT_SECRET' }
  if ($missing.Count -gt 0) {
    throw ('config\app.env 缺少必填项：' + ($missing -join '、') + '。请编辑该文件补齐；如果数据库还没建过，也可以先备份 data\mysql，再删除 config\app.env 让程序重新生成。')
  }

  $filesPath = [string]$config.FilesRoot
  if ([string]::IsNullOrWhiteSpace($filesPath)) { $filesPath = 'data\files' }
  if (-not [System.IO.Path]::IsPathRooted($filesPath)) { $filesPath = Join-Path $script:Root $filesPath }
  $config.FilesPath = $filesPath

  $script:ConfigCache = $config
  return $config
}

function Get-DefaultRuntimeEnvLines {
  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add('# 旭日云课堂 · Windows 便携版 运行时组件下载源')
  [void]$lines.Add('# 首次 setup 自动生成。想换源只改这里，不用改脚本；改完重跑 setup.cmd。')
  [void]$lines.Add('# 下载的文件放在 cache\，校验通过后会复用；--offline 表示只用 cache 里已有的文件。')
  [void]$lines.Add('')
  [void]$lines.Add('# 内置 MySQL 端口（只监听 127.0.0.1）')
  [void]$lines.Add('MYSQL_PORT=3307')
  [void]$lines.Add('')
  [void]$lines.Add('# ---- JRE（OpenJDK 8 JRE / Temurin 8u512b09，Windows x64，约 38 MB）----')
  [void]$lines.Add('# 优先清华 TUNA，失败自动换南京大学；两个都是同一份官方构建的镜像。')
  [void]$lines.Add('JRE_VERSION=8u512b09')
  [void]$lines.Add('JRE_URLS=https://mirrors.tuna.tsinghua.edu.cn/Adoptium/8/jre/x64/windows/OpenJDK8U-jre_x64_windows_hotspot_8u512b09.zip;https://mirrors.nju.edu.cn/adoptium/8/jre/x64/windows/OpenJDK8U-jre_x64_windows_hotspot_8u512b09.zip')
  [void]$lines.Add('# SHA256 来自 Adoptium 官方发布页（大小只作展示，校验以 SHA256 为准）')
  [void]$lines.Add('JRE_SHA256=ae1ae12f817d7735477c6555107eece73854da0654da69077309ef9bff0b78bf')
  [void]$lines.Add('JRE_SIZE=40124908')
  [void]$lines.Add('')
  [void]$lines.Add('# ---- MySQL 8.0（Windows x64 zip）----')
  [void]$lines.Add('# 格式：地址|版本|SHA256|字节数。按顺序尝试，失败自动换下一个源。')
  [void]$lines.Add('# 1) 国内镜像 8.0.28：约 212 MB，速度快（推荐）')
  [void]$lines.Add('# 2) 官方 8.0.44：约 233 MB，国内下载可能很慢，仅当前两个源都失败时才用')
  [void]$lines.Add('# 没有填 SHA256 的源会被自动跳过（不下载未校验的文件）；不想用某个源就在行首加 #。')
  [void]$lines.Add('MYSQL_MIRRORS=https://mirrors.huaweicloud.com/mysql/Downloads/MySQL-8.0/mysql-8.0.28-winx64.zip|8.0.28|cb207afb33e2bbfe9535ba78fa9a1a3cccd11156f73864a5db0be8dcc2dbb1bc|222021254')
  [void]$lines.Add('MYSQL_MIRRORS=https://mirrors.aliyun.com/mysql/MySQL-8.0/mysql-8.0.28-winx64.zip|8.0.28|cb207afb33e2bbfe9535ba78fa9a1a3cccd11156f73864a5db0be8dcc2dbb1bc|222021254')
  [void]$lines.Add('MYSQL_MIRRORS=https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.44-winx64.zip|8.0.44|4d9316d2955b0bd2b484e08bda67c18d7979e0622b84f2e9146d97f04ed9a2fc|244529072')
  return @($lines)
}

function Get-RuntimeConfig {
  if ($script:RuntimeCache -ne $null) { return $script:RuntimeCache }

  $exists = Test-Path -LiteralPath $script:P.RuntimeEnv
  $map = @{}
  $generated = $false
  if ($exists) {
    $map = Read-EnvFile $script:P.RuntimeEnv
  } else {
    if ($script:DryRun) {
      Out-Dry '将生成 config\runtime.env（JRE / MySQL 下载源与 SHA256）'
      $map = ConvertTo-EnvMap (Get-DefaultRuntimeEnvLines)
    } else {
      Write-TextFile $script:P.RuntimeEnv (Get-DefaultRuntimeEnvLines)
      $generated = $true
      $map = Read-EnvFile $script:P.RuntimeEnv
      Out-Ok '已生成 config\runtime.env（下载源与校验值）'
    }
  }

  $jreUrls = New-Object System.Collections.ArrayList
  foreach ($line in (Get-EnvValues $map 'JRE_URLS')) {
    foreach ($part in ([string]$line -split ';')) {
      $url = ([string]$part).Trim()
      if ($url.Length -gt 0 -and -not $jreUrls.Contains($url)) { [void]$jreUrls.Add($url) }
    }
  }

  $mirrors = New-Object System.Collections.ArrayList
  foreach ($line in (Get-EnvValues $map 'MYSQL_MIRRORS')) {
    $parts = @([string]$line -split '\|')
    if ($parts.Count -lt 3) {
      throw ('config\runtime.env 的 MYSQL_MIRRORS 格式错误：应为 地址|版本|SHA256[|字节数]，当前为：' + [string]$line)
    }
    $item = @{
      Url = ([string]$parts[0]).Trim()
      Version = ([string]$parts[1]).Trim()
      Sha = ([string]$parts[2]).Trim()
      Size = [long]0
    }
    if ($parts.Count -ge 4) {
      $sizeText = ([string]$parts[3]).Trim()
      $item.Size = ConvertTo-LongValue $sizeText ([long]0)
    }
    if ($item.Url.Length -eq 0) { continue }
    [void]$mirrors.Add($item)
  }

  if ($jreUrls.Count -eq 0) { throw 'config\runtime.env 里没有可用的 JRE_URLS（JRE 下载地址）' }
  if ($mirrors.Count -eq 0) { throw 'config\runtime.env 里没有可用的 MYSQL_MIRRORS（MySQL 下载地址）' }

  $runtime = @{
    JreVersion = Get-EnvValue $map 'JRE_VERSION' ''
    JreUrls = @($jreUrls)
    JreSha = (Get-EnvValue $map 'JRE_SHA256' '').Trim()
    JreSize = ConvertTo-LongValue (Get-EnvValue $map 'JRE_SIZE' '0') ([long]0)
    MysqlPort = ConvertTo-IntValue (Get-EnvValue $map 'MYSQL_PORT' '3307') 3307
    Mirrors = @($mirrors)
    Generated = $generated
  }
  $script:RuntimeCache = $runtime
  return $runtime
}


# ===========================================================================
# 6.5 命令行参数（支持 --step jre / --step=jre / -Step jre 三种写法）
# ===========================================================================

function Get-CommandList {
  return @('start', 'stop', 'status', 'setup', 'doctor', 'init-db', 'help', 'version')
}

function Get-StepList {
  return @('env', 'jre', 'mysql', 'db', 'app')
}

function Parse-CommandLine([string[]]$ArgList) {
  $opts = @{
    Command = ''
    Explicit = $false
    Step = @()
    Offline = $false
    WhatIf = $false
    NoBrowser = $false
    NoFirewall = $false
    Force = $false
    Fix = $false
    TimeoutSec = 240
    Help = $false
    ShowVersion = $false
  }
  $positional = New-Object System.Collections.ArrayList
  $steps = New-Object System.Collections.ArrayList
  $index = 0
  while ($index -lt $ArgList.Count) {
    $token = [string]$ArgList[$index]
    if ([string]::IsNullOrWhiteSpace($token)) { $index++; continue }
    if ($token.StartsWith('-')) {
      $body = $token
      while ($body.Length -gt 0 -and $body.StartsWith('-')) { $body = $body.Substring(1) }
      if ($body.Length -eq 0) { $index++; continue }
      $value = $null
      $equals = $body.IndexOf('=')
      if ($equals -ge 0) {
        $value = $body.Substring($equals + 1)
        $body = $body.Substring(0, $equals)
      }
      $name = $body.ToLowerInvariant().Replace('-', '').Replace('_', '')
      switch ($name) {
        'step' {
          if ($null -eq $value) {
            $index++
            if ($index -ge $ArgList.Count) { throw '参数 --step 缺少值，可选：jre、mysql、db、app' }
            $value = [string]$ArgList[$index]
          }
          foreach ($part in ([string]$value -split '[,;\s]+')) {
            $stepName = ([string]$part).Trim().ToLowerInvariant()
            if ($stepName.Length -eq 0) { continue }
            if ((Get-StepList) -notcontains $stepName) {
              throw ('--step 不支持的值：' + $stepName + '（可选：jre、mysql、db、app）')
            }
            if (-not $steps.Contains($stepName)) { [void]$steps.Add($stepName) }
          }
        }
        'timeout' {
          if ($null -eq $value) {
            $index++
            if ($index -ge $ArgList.Count) { throw '参数 --timeout 缺少秒数' }
            $value = [string]$ArgList[$index]
          }
          $seconds = 0
          if (-not [int]::TryParse($value, [ref]$seconds)) { throw ('--timeout 需要整数秒，收到：' + $value) }
          if ($seconds -lt 30) { $seconds = 30 }
          $opts.TimeoutSec = $seconds
        }
        'offline' { $opts.Offline = $true }
        'whatif' { $opts.WhatIf = $true }
        'dryrun' { $opts.WhatIf = $true }
        'nobrowser' { $opts.NoBrowser = $true }
        'nofirewall' { $opts.NoFirewall = $true }
        'force' { $opts.Force = $true }
        'fix' { $opts.Fix = $true }
        'help' { $opts.Help = $true }
        'h' { $opts.Help = $true }
        'version' { $opts.ShowVersion = $true }
        'pause' { }
        default { throw ('不认识的参数：' + $token + '。运行 setup.cmd --help 查看用法。') }
      }
      $index++
      continue
    }
    [void]$positional.Add($token)
    $index++
  }

  if ($positional.Count -gt 0) {
    $command = ([string]$positional[0]).ToLowerInvariant()
    if ((Get-CommandList) -notcontains $command) {
      if ((Get-StepList) -contains $command) {
        [void]$steps.Add($command)
        $command = 'setup'
      } else {
        throw ('不认识的命令：' + $command + '。可用命令：start、stop、status、setup、doctor。')
      }
    } else {
      $opts.Explicit = $true
    }
    if ($positional.Count -gt 1) {
      # 允许简写：setup jre / setup db（等价于 setup --step jre）
      if ($command -eq 'setup' -and $positional.Count -eq 2) {
        $shortStep = ([string]$positional[1]).ToLowerInvariant()
        if ((Get-StepList) -contains $shortStep) {
          if (-not $steps.Contains($shortStep)) { [void]$steps.Add($shortStep) }
        } else {
          throw ('setup 后面的步骤名不对：' + $shortStep + '（可选：env、jre、mysql、db、app）')
        }
      } else {
        throw ('多余的参数：' + ((@($positional) | Select-Object -Skip 1) -join ' '))
      }
    }
    $opts.Command = $command
  }

  if ($steps.Count -gt 0) { $opts.Step = @($steps) }
  if ([string]::IsNullOrEmpty($opts.Command)) {
    if ($opts.Step.Count -gt 0) { $opts.Command = 'setup' } else { $opts.Command = 'start' }
  }
  if ($opts.Step.Count -gt 0 -and $opts.Command -eq 'start' -and -not $opts.Explicit) { $opts.Command = 'setup' }
  return $opts
}

function Show-Usage {
  Out-Line ''
  Out-Line ('旭日云课堂 · Windows 便携版启动器（' + (Get-PackageVersion) + '）')
  Out-Line ''
  Out-Line '用法（双击对应 .cmd 即可，也可以在命令行里带参数）：'
  Out-Line '  start.cmd                  启动；没装过会自动进入引导安装'
  Out-Line '  stop.cmd                   停止应用和内置 MySQL'
  Out-Line '  status.cmd                 查看端口、PID、访问地址'
  Out-Line '  setup.cmd                  引导安装（环境检查 / JRE / MySQL / 应用）'
  Out-Line '  doctor.cmd                 体检并输出诊断报告'
  Out-Line ''
  Out-Line '参数：'
  Out-Line '  --step <env|jre|mysql|db|app>  只执行某一步，可逗号分隔'
  Out-Line '  --offline                  只用 cache 里已下载的压缩包，不联网'
  Out-Line '  --force                    忽略已完成状态强制重做（会重新下载/解压）'
  Out-Line '  --whatif                   只打印计划，不写文件、不下载、不启动'
  Out-Line '  --no-browser               启动后不自动打开浏览器'
  Out-Line '  --no-firewall              不创建防火墙规则'
  Out-Line '  --timeout <秒>             等待应用就绪的最长秒数（默认 240）'
  Out-Line '  --fix                      仅 doctor：尝试自动修复'
  Out-Line '  --help                     显示本帮助'
  Out-Line ''
  Out-Line '例子：'
  Out-Line '  setup.cmd --step db                 只重建数据库/补导数据'
  Out-Line '  setup.cmd --offline --step mysql    用 cache 里的 zip 重装 MySQL'
  Out-Line '  doctor.cmd --fix                    体检并自动修复常见问题'
  Out-Line ''
  Out-Line '也可以直接调用 PowerShell 脚本（排错时有用）：'
  Out-Line '  powershell -NoProfile -ExecutionPolicy Bypass -File lib\launcher.ps1 status'
  Out-Line ''
  Out-Line '退出码：0 成功；1 运行失败；2 参数错误。'
  Out-Line ''
}

# ===========================================================================
# 7. 下载（curl.exe 优先，BITS 兜底；支持断点续传与多源回退）
# ===========================================================================

function Get-CacheFileName([string]$Url) {
  $value = ([string]$Url).Trim()
  $query = $value.IndexOf('?')
  if ($query -ge 0) { $value = $value.Substring(0, $query) }
  $slash = $value.LastIndexOf('/')
  if ($slash -ge 0) { $value = $value.Substring($slash + 1) }
  return [System.Uri]::UnescapeDataString($value)
}

function Get-CurlExe {
  $command = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($command -ne $null -and $command.Source) { return [string]$command.Source }
  $fallback = Join-Path $env:SystemRoot 'System32\curl.exe'
  if (Test-Path -LiteralPath $fallback) { return $fallback }
  return ''
}

function Invoke-CurlDownload {
  param(
    [string]$Url,
    [string]$TargetFile,
    [long]$ExpectedSize,
    [switch]$NoResume
  )
  $curl = Get-CurlExe
  if ([string]::IsNullOrEmpty($curl)) {
    return @{ Ok = $false; Error = 'NO_CURL'; ExitCode = -1 }
  }
  $partFile = $TargetFile + '.part'
  $outputFile = $TargetFile + '.curl.out'
  $errorFile = $TargetFile + '.curl.err'
  $carriageReturn = [string][char]13

  $arguments = @('-L', '--fail', '--silent', '--show-error', '--retry', '3', '--retry-delay', '3', '--connect-timeout', '20', '--speed-limit', '1024', '--speed-time', '60')
  if (-not $NoResume) { $arguments += @('-C', '-') }
  $arguments += @('-o', $partFile, $Url)

  $process = $null
  try {
    $process = Start-Process -FilePath $curl -ArgumentList (ConvertTo-NativeArgs $arguments) -NoNewWindow -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
  } catch {
    return @{ Ok = $false; Error = ('无法启动 curl.exe：' + $_.Exception.Message); ExitCode = -1 }
  }

  $lastPercent = -1
  while (-not $process.HasExited) {
    Start-Sleep -Milliseconds 1200
    if (Test-Path -LiteralPath $partFile) {
      $length = [long]0
      try { $length = [long](Get-Item -LiteralPath $partFile).Length } catch { $length = 0 }
      if ($ExpectedSize -gt 0) {
        $percent = [int][math]::Floor(100.0 * $length / $ExpectedSize)
        if ($percent -gt 100) { $percent = 100 }
        if ($percent -ne $lastPercent) {
          Write-Host ($carriageReturn + '    下载中 ' + $percent + '%（' + [math]::Round($length / 1MB, 1) + ' / ' + [math]::Round($ExpectedSize / 1MB, 1) + ' MB）   ') -NoNewline
          $lastPercent = $percent
        }
      } elseif ($length -gt 0) {
        Write-Host ($carriageReturn + '    已下载 ' + [math]::Round($length / 1MB, 1) + ' MB   ') -NoNewline
      }
    }
  }
  Write-Host ''
  $process.WaitForExit()
  $exitCode = [int]$process.ExitCode

  $errorText = ''
  if (Test-Path -LiteralPath $errorFile) {
    try { $errorText = ([System.IO.File]::ReadAllText($errorFile, [System.Text.Encoding]::UTF8)).Trim() } catch { }
  }

  if ($exitCode -eq 33 -and -not $NoResume) {
    Out-Warn '该下载源不支持断点续传，改为重新下载'
    Remove-Item -LiteralPath $partFile -Force -ErrorAction SilentlyContinue
    return (Invoke-CurlDownload -Url $Url -TargetFile $TargetFile -ExpectedSize $ExpectedSize -NoResume)
  }

  Remove-Item -LiteralPath $outputFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $errorFile -Force -ErrorAction SilentlyContinue

  if ($exitCode -ne 0) {
    return @{ Ok = $false; Error = $errorText; ExitCode = $exitCode }
  }
  return @{ Ok = $true; Error = ''; ExitCode = 0 }
}

function Invoke-BitsDownload {
  param([string]$Url, [string]$TargetFile)
  $command = Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue
  if ($command -eq $null) {
    return @{ Ok = $false; Error = '系统没有 BITS（Start-BitsTransfer），也没有 curl.exe，无法下载。' }
  }
  $partFile = $TargetFile + '.part'
  $attempt = 0
  while ($attempt -lt 3) {
    $attempt++
    try {
      Remove-Item -LiteralPath $partFile -Force -ErrorAction SilentlyContinue
      Start-BitsTransfer -Source $Url -Destination $partFile -TransferType Download -ErrorAction Stop
      Move-Item -LiteralPath $partFile -Destination $TargetFile -Force
      return @{ Ok = $true; Error = '' }
    } catch {
      $message = $_.Exception.Message
      if ($attempt -ge 3) { return @{ Ok = $false; Error = ('BITS 下载失败：' + $message) } }
      Out-Warn ('BITS 下载失败，第 ' + $attempt + ' 次重试：' + $message)
      Start-Sleep -Seconds 2
    }
  }
  return @{ Ok = $false; Error = 'BITS 下载失败' }
}

function Show-ManualDownloadHelp {
  param([string]$Label, [array]$Candidates, [string]$StepName, [string[]]$CacheAliases = @())
  Out-Line ''
  Out-Line ('手动下载指引（' + $Label + '）：')
  Out-Line '  1) 用浏览器打开下面的地址，下载完整文件：'
  foreach ($candidate in $Candidates) {
    Out-Line ('       ' + [string]$candidate.Url)
  }
  Out-Line '  2) 把下载到的文件原样放进 cache 目录（文件名不要改）：'
  Out-Line ('       ' + $script:P.Cache)
  foreach ($alias in $CacheAliases) {
    if (-not [string]::IsNullOrEmpty($alias)) {
      Out-Line ('       也可以直接把该压缩包改名为 ' + $alias + ' 放进 cache（效果一样）')
    }
  }
  Out-Line '  3) 重新运行（离线模式，不再联网）：'
  Out-Line ('       setup.cmd --offline --step ' + $StepName)
  Out-Line ''
  Out-Line '  文件名、大小、SHA256 对照表：'
  $seenNames = @{}
  foreach ($candidate in $Candidates) {
    $name = Get-CacheFileName ([string]$candidate.Url)
    if ($seenNames.ContainsKey($name)) { continue }
    $seenNames[$name] = $true
    $sizeText = '未知大小'
    if ($candidate.Size -gt 0) { $sizeText = [string]$candidate.Size + ' 字节' }
    $shaText = [string]$candidate.Sha
    if ([string]::IsNullOrWhiteSpace($shaText)) { $shaText = '（未配置）' }
    Out-Bullet ($name + '    大小 ' + $sizeText + '    SHA256 ' + $shaText)
  }
}

function Invoke-ComponentDownload {
  param(
    [string]$Label,
    [array]$Candidates,
    [string]$StepName,
    [string[]]$CacheAliases = @()
  )
  Ensure-Directory $script:P.Cache
  $lastError = '没有可用的下载源'
  $offlineWarned = @{}

  foreach ($candidate in $Candidates) {
    $url = [string]$candidate.Url
    $sha = ''
    if ($candidate.ContainsKey('Sha')) { $sha = [string]$candidate.Sha }
    $size = [long]0
    if ($candidate.ContainsKey('Size')) { $size = [long]$candidate.Size }
    $version = ''
    if ($candidate.ContainsKey('Version')) { $version = [string]$candidate.Version }

    $name = Get-CacheFileName $url
    if ([string]::IsNullOrEmpty($name)) { continue }
    $target = Join-Path $script:P.Cache $name

    $sizeText = '未知大小'
    if ($size -gt 0) { $sizeText = [string]([math]::Round($size / 1MB, 1)) + ' MB' }

    if ([string]::IsNullOrWhiteSpace($sha)) {
      Out-Warn ('该下载源没有配置 SHA256，按安全策略不启用：' + $url)
      $lastError = '下载源缺少 SHA256'
      continue
    }

    # 允许手动下载后按固定别名放进 cache（jre8.zip / mysql8.zip），方便用户自救
    $cachedFile = ''
    foreach ($alias in $CacheAliases) {
      if ([string]::IsNullOrEmpty($alias)) { continue }
      $aliasPath = Join-Path $script:P.Cache $alias
      if (-not (Test-Path -LiteralPath $aliasPath)) { continue }
      if (Test-FileIntegrity $aliasPath $sha $size -Quiet) {
        $cachedFile = $aliasPath
        break
      }
      Out-Warn ('cache\' + $alias + ' 校验不通过，已忽略（不会删除你的文件）')
    }
    if ([string]::IsNullOrEmpty($cachedFile) -and (Test-FileIntegrity $target $sha $size -Quiet)) {
      $cachedFile = $target
    }
    if (-not [string]::IsNullOrEmpty($cachedFile)) {
      Out-Ok ('缓存已存在且校验通过：' + $cachedFile)
      return @{ Path = $cachedFile; Url = $url; Name = (Split-Path -Leaf $cachedFile); Sha = $sha; Size = $size; Version = $version }
    }
    if (Test-Path -LiteralPath $target) {
      Out-Warn ('缓存文件校验不通过，删除后重新下载：cache\' + $name)
      Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath ($target + '.part') -Force -ErrorAction SilentlyContinue
    }

    if ($script:Opts.Offline) {
      if (-not $offlineWarned.ContainsKey($name)) {
        Out-Warn ('离线模式：cache 里没有可用的 ' + $name + '，跳过这个源')
        $offlineWarned[$name] = $true
      }
      $lastError = '离线模式下缺少缓存文件 ' + $name
      continue
    }
    if ($script:DryRun) {
      Out-Dry ('将下载：' + $url)
      Out-Dry ('保存到：cache\' + $name + '，并校验 SHA256 与大小（' + $sizeText + '）')
      return @{ Path = $target; Url = $url; Name = $name; Sha = $sha; Size = $size; Version = $version; Planned = $true }
    }

    Out-Info ('下载源：' + $url)
    $result = $null
    if (-not [string]::IsNullOrEmpty((Get-CurlExe))) {
      $result = Invoke-CurlDownload -Url $url -TargetFile $target -ExpectedSize $size
    }
    if ($result -eq $null -or ($result.Ok -eq $false -and [string]$result.Error -eq 'NO_CURL')) {
      Out-Warn '没有可用的 curl.exe，改用 BITS 下载'
      $result = Invoke-BitsDownload -Url $url -TargetFile $target
    }

    if (-not $result.Ok) {
      $lastError = [string]$result.Error
      Out-Warn ('下载失败：' + $lastError)
      if (Test-Path -LiteralPath ($target + '.part')) {
        Out-Info ('已下载的部分保留在 cache\' + $name + '.part，重试会断点续传')
      }
      Out-Info '自动尝试下一个下载源…'
      continue
    }

    if (Test-Path -LiteralPath ($target + '.part')) {
      Move-Item -LiteralPath ($target + '.part') -Destination $target -Force
    }
    if (-not (Test-FileIntegrity $target $sha $size)) {
      Out-Warn ('下载完成但校验失败，删除并尝试下一个源：cache\' + $name)
      Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
      $lastError = 'SHA256 或大小校验失败'
      continue
    }
    Out-Ok ('下载完成并通过校验：cache\' + $name)
    return @{ Path = $target; Url = $url; Name = $name; Sha = $sha; Size = $size; Version = $version }
  }

  Out-Fail ($Label + ' 下载失败：' + $lastError)
  Show-ManualDownloadHelp -Label $Label -Candidates $Candidates -StepName $StepName -CacheAliases $CacheAliases
  throw ('无法获取 ' + $Label + '（' + $lastError + '）。请按上面的手动下载指引操作后重试。')
}

# ===========================================================================
# 8. JRE
# ===========================================================================

function Get-JavaVersionInfo([string]$JavaExe) {
  $info = @{ Ok = $false; Version = ''; Text = '' }
  if (-not (Test-Path -LiteralPath $JavaExe)) { return $info }
  $result = Invoke-NativeCapture $JavaExe @('-version')
  $info.Text = [string]$result.Text
  if ($result.ExitCode -ne 0) { return $info }
  $match = [regex]::Match([string]$result.Text, 'version\s+"([^"]+)"')
  if ($match.Success) { $info.Version = $match.Groups[1].Value }
  $info.Ok = $true
  return $info
}

function Test-Java8Version([string]$Version) {
  if ([string]::IsNullOrWhiteSpace($Version)) { return $false }
  if ($Version.StartsWith('1.8')) { return $true }
  if ($Version.StartsWith('8.')) { return $true }
  return $false
}

function Ensure-JreInstalled {
  $javaExe = $script:P.JavaExe
  if ((Test-Path -LiteralPath $javaExe) -and -not $script:Opts.Force) {
    $existing = Get-JavaVersionInfo $javaExe
    if ($existing.Ok -and (Test-Java8Version $existing.Version)) {
      Out-Ok ('JRE 已就绪：' + $existing.Version + '（runtime\jre8）')
      return
    }
    Out-Warn 'runtime\jre8 存在但 java.exe 无法正常运行，将重新安装'
  }

  if ($script:DryRun) {
    Out-Dry '将下载 OpenJDK 8 JRE（约 38 MB）并解压到 runtime\jre8'
    return
  }

  $runtime = Get-RuntimeConfig
  if ([string]::IsNullOrWhiteSpace($runtime.JreSha)) {
    Out-Warn 'config\runtime.env 没有配置 JRE_SHA256，本次跳过校验（不建议）'
  }
  $candidates = @()
  foreach ($url in $runtime.JreUrls) {
    $candidates += @{
      Url = $url
      Sha = $runtime.JreSha
      Size = $runtime.JreSize
      Version = $runtime.JreVersion
    }
  }

  $download = Invoke-ComponentDownload -Label 'JRE 运行时（OpenJDK 8）' -Candidates $candidates -StepName 'jre' -CacheAliases @('jre8.zip')
  if ($download.Planned) { return }

  $extractDir = Join-Path $script:P.Cache ('extract-jre-' + (Get-Timestamp))
  Out-Info ('解压 JRE（' + [math]::Round((Get-Item -LiteralPath $download.Path).Length / 1MB, 1) + ' MB，约 10~30 秒）…')
  Expand-ZipArchive $download.Path $extractDir
  $root = Find-ExtractedRoot $extractDir 'bin\java.exe'
  if ([string]::IsNullOrEmpty($root)) {
    Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    throw '解压后的 JRE 压缩包里找不到 bin\java.exe，压缩包可能不完整。请删除 cache 里对应的 zip 后重试。'
  }

  if (Test-Path -LiteralPath $script:P.Jre) {
    Remove-Item -LiteralPath $script:P.Jre -Recurse -Force -ErrorAction Stop
  }
  Ensure-Directory $script:P.Runtime
  Move-Item -LiteralPath $root -Destination $script:P.Jre
  Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue

  if (-not (Test-Path -LiteralPath $script:P.JavaExe)) {
    throw 'JRE 安装后仍找不到 runtime\jre8\bin\java.exe'
  }
  $installed = Get-JavaVersionInfo $script:P.JavaExe
  if (-not $installed.Ok) { throw 'JRE 安装完成，但执行 java.exe -version 失败。可能被杀毒软件拦截，请把包目录加入白名单后重试。' }
  if (-not (Test-Java8Version $installed.Version)) {
    Out-Warn ('安装的 JRE 版本是 ' + $installed.Version + '，本程序只在 Java 8 上验证过')
  }
  Out-Ok ('JRE 安装完成：' + $installed.Version + '（runtime\jre8，' + (Get-DirectorySizeMB $script:P.Jre) + ' MB）')
}

# ===========================================================================
# 9. MySQL 安装、初始化与启停
# ===========================================================================

function Get-MySqlVersionText([string]$MySqldPath) {
  if (-not (Test-Path -LiteralPath $MySqldPath)) { return '未安装' }
  $result = Invoke-NativeCapture $MySqldPath @('--version')
  $text = ([string]$result.Text).Trim()
  if (-not [string]::IsNullOrWhiteSpace($text)) {
    # 输出形如 “C:\...\mysqld.exe  Ver 8.0.28 for Win64 ...”。去掉前面的路径：
    # 路径里有中文时，原生命令输出按 OEM 代码页解码会变成乱码，去掉更干净。
    $text = [regex]::Replace($text, '^.*?mysqld\.exe\s*', '')
    if ([string]::IsNullOrWhiteSpace($text)) { $text = '版本未知' }
    return $text
  }
  return '版本未知'
}

function Optimize-MySqlTree([string]$MysqlDir) {
  $before = Get-DirectorySizeMB $MysqlDir
  Out-Info ('裁剪 MySQL 安装目录（当前 ' + $before + ' MB）…')

  foreach ($file in @(Get-ChildItem -LiteralPath $MysqlDir -Recurse -File -Filter '*.pdb' -ErrorAction SilentlyContinue)) {
    try { Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop } catch { }
  }
  foreach ($file in @(Get-ChildItem -LiteralPath $MysqlDir -Recurse -File -Filter '*.lib' -ErrorAction SilentlyContinue)) {
    try { Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop } catch { }
  }
  foreach ($file in @(Get-ChildItem -LiteralPath $MysqlDir -Recurse -File -Filter '*.exp' -ErrorAction SilentlyContinue)) {
    try { Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop } catch { }
  }

  foreach ($relative in @('lib\mecab', 'lib\plugin\debug', 'docs', 'include')) {
    $path = Join-Path $MysqlDir $relative
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue }
  }

  $keepExe = @('mysqld.exe', 'mysql.exe', 'mysqladmin.exe', 'mysqldump.exe', 'mysqlcheck.exe', 'mysqlimport.exe')
  $binDir = Join-Path $MysqlDir 'bin'
  if (Test-Path -LiteralPath $binDir) {
    foreach ($file in @(Get-ChildItem -LiteralPath $binDir -File -Filter '*.exe' -ErrorAction SilentlyContinue)) {
      if ($keepExe -notcontains $file.Name) {
        try { Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop } catch { }
      }
    }
  }

  $after = Get-DirectorySizeMB $MysqlDir
  Out-Ok ('裁剪完成：' + $before + ' MB → ' + $after + ' MB')
}

# MySQL 8 在 Windows 上不支持含中文/非 ASCII 字符的路径：它会截断路径，然后报
# “Failed to set datadir ... No such file or directory”。所以在下载/初始化/启动之
# 前就拦住，给出能照做的解决办法，而不是让人等 120 秒再看天书。
function Assert-MySqlPathSupported {
  if ($script:Root -match '[^\x00-\x7E]') {
    $message = '当前安装路径含中文或其他非 ASCII 字符：' + $script:Root + '。MySQL 8 在 Windows 上无法从这种路径启动（会截断路径并报 datadir 不存在）。请把整个文件夹移动到纯英文路径（例如 C:\xuri 或 D:\xuri），config 与 data 会一起搬走，不需要重装，然后重新运行 start.cmd。'
    if ($script:DryRun) {
      Out-Warn $message
      return
    }
    throw $message
  }
}

function Require-MySqlInstalled {
  if (Test-Path -LiteralPath $script:P.MysqldExe) { return }
  if ($script:DryRun) { return }
  throw '还没有安装内置 MySQL（mysql\bin\mysqld.exe 不存在）。请先执行：setup.cmd --step mysql'
}

function Ensure-MySqlInstalled {
  Assert-MySqlPathSupported
  $hasMysqld = Test-Path -LiteralPath $script:P.MysqldExe
  $hasMysql = Test-Path -LiteralPath $script:P.MysqlExe
  $hasAdmin = Test-Path -LiteralPath $script:P.MysqlAdmin
  if ($hasMysqld -and $hasMysql -and $hasAdmin -and -not $script:Opts.Force) {
    Out-Ok ('MySQL 已安装：' + (Get-MySqlVersionText $script:P.MysqldExe))
    return
  }

  if ($script:DryRun) {
    Out-Dry '将下载 MySQL 8.0（国内镜像 8.0.28 约 212 MB；官方 8.0.44 约 233 MB），解压并裁剪到 mysql\'
    return
  }

  $runtime = Get-RuntimeConfig
  $candidates = @()
  foreach ($mirror in $runtime.Mirrors) { $candidates += $mirror }
  foreach ($mirror in $candidates) {
    if ([string]::IsNullOrWhiteSpace([string]$mirror.Sha)) {
      Out-Warn ('config\runtime.env 中该 MySQL 源没有配置 SHA256，将跳过校验：' + [string]$mirror.Url)
    }
  }

  Out-Info '下载源优先级：国内镜像 MySQL 8.0.28（约 212 MB，推荐）→ 官方 8.0.44（约 233 MB，国内较慢）'
  $download = Invoke-ComponentDownload -Label 'MySQL 8.0（Windows x64）' -Candidates $candidates -StepName 'mysql' -CacheAliases @('mysql8.zip')
  if ($download.Planned) { return }

  $extractDir = Join-Path $script:P.Cache ('extract-mysql-' + (Get-Timestamp))
  Out-Info ('解压 MySQL（' + [math]::Round((Get-Item -LiteralPath $download.Path).Length / 1MB, 1) + ' MB，约 30~90 秒）…')
  Expand-ZipArchive $download.Path $extractDir
  $root = Find-ExtractedRoot $extractDir 'bin\mysqld.exe'
  if ([string]::IsNullOrEmpty($root)) {
    Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    throw '解压后的 MySQL 压缩包里找不到 bin\mysqld.exe，压缩包可能不完整。请删除 cache 里对应的 zip 后重试。'
  }

  Optimize-MySqlTree $root
  if (Test-Path -LiteralPath $script:P.Mysql) {
    Remove-Item -LiteralPath $script:P.Mysql -Recurse -Force -ErrorAction Stop
  }
  Move-Item -LiteralPath $root -Destination $script:P.Mysql
  Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue

  if (-not (Test-Path -LiteralPath $script:P.MysqldExe)) {
    throw 'MySQL 解压后仍找不到 mysql\bin\mysqld.exe'
  }

  $versionLines = New-Object System.Collections.ArrayList
  [void]$versionLines.Add('# MySQL 版本与来源（由 setup 自动写入）')
  [void]$versionLines.Add('MYSQL_VERSION=' + [string]$download.Version)
  [void]$versionLines.Add('MYSQL_ZIP=' + [string]$download.Name)
  [void]$versionLines.Add('MYSQL_ZIP_SHA256=' + [string]$download.Sha)
  [void]$versionLines.Add('INSTALLED_AT=' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-TextFile (Join-Path $script:P.Mysql 'version.txt') @($versionLines)

  Out-Ok ('MySQL 安装完成：' + (Get-MySqlVersionText $script:P.MysqldExe))
  Out-Info ('安装占用：' + (Get-DirectorySizeMB $script:P.Mysql) + ' MB（原始 zip 保留在 cache，可重复使用）')
}

function ToIniPath([string]$Path) {
  $value = $Path.Replace('\', '/')
  if ($value.IndexOf(' ') -ge 0) { return '"' + $value + '"' }
  return $value
}

function Write-MySqlIni {
  $config = Get-AppConfig
  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add('# 本文件由 lib\launcher.ps1 自动生成，每次启动 MySQL 前覆盖。')
  [void]$lines.Add('# 想长期改参数请改脚本或 config\app.env，直接改这里会在下次启动时丢失。')
  [void]$lines.Add('')
  [void]$lines.Add('[mysqld]')
  [void]$lines.Add('basedir=' + (ToIniPath $script:P.Mysql))
  [void]$lines.Add('datadir=' + (ToIniPath $script:P.DataMysql))
  [void]$lines.Add('port=' + [string]$config.DbPort)
  [void]$lines.Add('bind-address=127.0.0.1')
  [void]$lines.Add('mysqlx=0')
  [void]$lines.Add('character-set-server=utf8mb4')
  [void]$lines.Add('collation-server=utf8mb4_unicode_ci')
  [void]$lines.Add('default-storage-engine=INNODB')
  [void]$lines.Add('max_connections=150')
  [void]$lines.Add('max_allowed_packet=64M')
  [void]$lines.Add('innodb_buffer_pool_size=256M')
  [void]$lines.Add('log-error=' + (ToIniPath (Join-Path $script:P.Logs 'mysql-error.log')))
  [void]$lines.Add('pid-file=' + (ToIniPath (Join-Path $script:P.Run 'mysqld.pid')))
  [void]$lines.Add('# 刻意不设置 skip-name-resolve：root@localhost 的匹配依赖 127.0.0.1 反查为 localhost。')
  [void]$lines.Add('')
  [void]$lines.Add('[client]')
  [void]$lines.Add('port=' + [string]$config.DbPort)
  [void]$lines.Add('default-character-set=utf8mb4')
  Write-TextFile $script:P.MyIni @($lines)
}

function Ensure-MySqlDataInitialized {
  Assert-MySqlPathSupported
  Require-MySqlInstalled
  $systemDir = Join-Path $script:P.DataMysql 'mysql'
  if (Test-Path -LiteralPath $systemDir) {
    Out-Ok ('MySQL 数据目录已初始化：' + $script:P.DataMysql)
    return
  }
  if ($script:DryRun) {
    Out-Dry '将初始化数据目录 data\mysql（mysqld --initialize-insecure，约 10~30 秒）'
    return
  }
  Ensure-Directory $script:P.DataMysql
  $existing = @(Get-ChildItem -LiteralPath $script:P.DataMysql -Force -ErrorAction SilentlyContinue)
  if ($existing.Count -gt 0) {
    throw 'data\mysql 目录非空，但不是有效的 MySQL 数据目录（可能是上次初始化中断）。请先备份该目录，再删除它并重跑 setup.cmd --step mysql。'
  }
  Ensure-Directory $script:P.Logs
  Ensure-Directory $script:P.Run
  Write-MySqlIni

  $stamp = Get-Timestamp
  $outputFile = Join-Path $script:P.Logs ('mysql-init-' + $stamp + '.out.log')
  $errorFile = Join-Path $script:P.Logs ('mysql-init-' + $stamp + '.err.log')
  Out-Info '初始化 MySQL 数据目录（首次约 10~30 秒，请不要关闭窗口）…'
  # PowerShell 5.1 的坑：在参数位置写 @('a' + $x, 'b') 会塌成一个字符串，
  # 所以先显式拼数组，再交给 ConvertTo-NativeArgs 逐个加引号。
  $mysqlInitArgs = @()
  $mysqlInitArgs += ('--defaults-file=' + $script:P.MyIni)
  $mysqlInitArgs += '--initialize-insecure'
  $mysqlInitArgs += '--console'
  $arguments = ConvertTo-NativeArgs $mysqlInitArgs
  $process = Start-Process -FilePath $script:P.MysqldExe -ArgumentList $arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
  if ($process.ExitCode -ne 0) {
    $tail = Get-FileTail $errorFile 20
    if ([string]::IsNullOrWhiteSpace($tail)) { $tail = Get-FileTail (Join-Path $script:P.Logs 'mysql-error.log') 20 }
    if (-not [string]::IsNullOrWhiteSpace($tail)) { Out-Bullet $tail }
    throw ('MySQL 数据目录初始化失败（mysqld --initialize-insecure 退出码 ' + $process.ExitCode + '）。日志：' + $errorFile)
  }
  if (-not (Test-Path -LiteralPath $systemDir)) {
    throw ('MySQL 初始化后仍找不到 data\mysql\mysql 目录。请删除 data\mysql 后重试；日志：' + $errorFile)
  }
  Out-Ok 'MySQL 数据目录初始化完成'
}

function Get-MySqlProcess {
  # Windows 上 mysqld 会有一个父进程和一个真正监听端口的子进程；
  # 以“持有本程序 my.ini 端口”的进程为准，避免 status/doctor 认错 PID。
  try {
    $config = Get-AppConfig
    $portOwner = Get-ListeningProcessId ([int]$config.DbPort)
    if ($portOwner -gt 0) {
      $ownerRecord = Get-ProcessRecord $portOwner
      if ($ownerRecord -ne $null -and ([string]$ownerRecord.Name).ToLowerInvariant() -eq 'mysqld.exe') {
        $ownerCommand = [string]$ownerRecord.CommandLine
        if ($ownerCommand -like ('*' + $script:P.MyIni + '*')) { return $ownerRecord }
      }
    }
  } catch { }

  $info = Read-PidFile $script:P.MysqlPid
  $processId = ConvertTo-IntValue $info['PID'] 0
  if ($processId -gt 0) {
    $record = Get-ProcessRecord $processId
    if ($record -ne $null) {
      if (([string]$record.Name).ToLowerInvariant() -eq 'mysqld.exe') { return $record }
    }
  }
  $found = @(Find-ProcessByCommandLine 'mysqld.exe' $script:P.MyIni)
  if ($found.Count -gt 0) { return $found[0] }
  return $null
}

function Start-MySqlServer {
  Assert-MySqlPathSupported
  Require-MySqlInstalled
  $config = Get-AppConfig
  $port = $config.DbPort
  $running = Get-MySqlProcess

  if ($running -ne $null) {
    if (Test-PortOpen '127.0.0.1' $port 800) {
      Out-Ok ('MySQL 已在运行：127.0.0.1:' + $port + '（PID ' + $running.ProcessId + '）')
      return
    }
    Out-Warn ('发现 MySQL 进程（PID ' + $running.ProcessId + '），但端口 ' + $port + ' 还没监听，继续等待…')
  } else {
    $owner = Get-ListeningProcessId $port
    if ($owner -gt 0) {
      $ownerName = '未知进程'
      $ownerRecord = Get-ProcessRecord $owner
      if ($ownerRecord -ne $null) { $ownerName = [string]$ownerRecord.Name }
      throw ('端口 ' + $port + ' 已被其他程序占用（PID ' + $owner + '，' + $ownerName + '）。请关闭该程序，或同时修改 config\app.env 的 DB_PORT 与 config\runtime.env 的 MYSQL_PORT。')
    }
  }

  if ($script:DryRun) {
    Out-Dry ('将启动内置 MySQL：127.0.0.1:' + $port + '（数据目录 data\mysql）')
    return
  }

  Ensure-Directory $script:P.Logs
  Ensure-Directory $script:P.Run
  Ensure-Directory $script:P.DataMysql
  Write-MySqlIni

  $stamp = Get-Timestamp
  $outputFile = Join-Path $script:P.Logs ('mysql-' + $stamp + '.out.log')
  $errorFile = Join-Path $script:P.Logs ('mysql-' + $stamp + '.err.log')

  if ($running -eq $null) {
    Out-Info ('启动内置 MySQL：127.0.0.1:' + $port)
    $mysqlRunArgs = @()
    $mysqlRunArgs += ('--defaults-file=' + $script:P.MyIni)
    $arguments = ConvertTo-NativeArgs $mysqlRunArgs
    $process = Start-Process -FilePath $script:P.MysqldExe -ArgumentList $arguments -WorkingDirectory $script:P.Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
    Write-PidFile $script:P.MysqlPid @{
      PID = $process.Id
      PORT = $port
      STARTED = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
      INI = $script:P.MyIni
    }
  }

  if (-not (Wait-PortOpen '127.0.0.1' $port 120)) {
    $tail = Get-FileTail (Join-Path $script:P.Logs 'mysql-error.log') 25
    if ([string]::IsNullOrWhiteSpace($tail)) { $tail = Get-FileTail $errorFile 25 }
    if (-not [string]::IsNullOrWhiteSpace($tail)) { Out-Bullet $tail }
    throw ('MySQL 在 120 秒内没有监听 127.0.0.1:' + $port + '。日志：' + (Join-Path $script:P.Logs 'mysql-error.log'))
  }

  $current = Get-MySqlProcess
  $currentPid = 0
  if ($current -ne $null) { $currentPid = [int]$current.ProcessId }
  Out-Ok ('MySQL 已启动：127.0.0.1:' + $port + '（PID ' + $currentPid + '）')
}

function Stop-MySqlServer {
  $config = Get-AppConfig
  $port = $config.DbPort
  $running = Get-MySqlProcess
  $portOpen = Test-PortOpen '127.0.0.1' $port 500
  if ($running -eq $null -and -not $portOpen) {
    Out-Info 'MySQL 未在运行'
    Remove-PidFile $script:P.MysqlPid
    return $true
  }
  if ($script:DryRun) {
    Out-Dry ('将执行 mysqladmin shutdown（127.0.0.1:' + $port + '）')
    return $true
  }
  if (-not (Test-Path -LiteralPath $script:P.MysqlAdmin)) {
    Out-Warn '找不到 mysqladmin.exe，无法优雅停止 MySQL（不建议强杀 mysqld 进程）'
    return $false
  }

  Ensure-Directory $script:P.Tmp
  $outputFile = Join-Path $script:P.Tmp 'mysqladmin-shutdown.out'
  $errorFile = Join-Path $script:P.Tmp 'mysqladmin-shutdown.err'
  # 口令用 --password= 直接传：实测 MySQL 8.0.28 的 Windows 客户端读 MYSQL_PWD
  # 会把口令算错（同样的口令用 --password= 能登录，用 MYSQL_PWD 就 Access denied），
  # 所以这里不用环境变量。参数由 ConvertTo-NativeArgs 负责加引号。
  $shutdownArgs = @()
  $shutdownArgs += '-protocol=tcp'
  $shutdownArgs += '-h'
  $shutdownArgs += '127.0.0.1'
  $shutdownArgs += '-P'
  $shutdownArgs += [string]$port
  $shutdownArgs += '-u'
  $shutdownArgs += 'root'
  $shutdownArgs += '--connect-timeout=10'
  if (-not [string]::IsNullOrEmpty($config.DbRootPassword)) {
    $shutdownArgs += ('--password=' + [string]$config.DbRootPassword)
  }
  $shutdownArgs += 'shutdown'
  $arguments = ConvertTo-NativeArgs $shutdownArgs
  $process = Start-Process -FilePath $script:P.MysqlAdmin -ArgumentList $arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile

  if ($process -eq $null -or $process.ExitCode -ne 0) {
    $message = (Read-TextFile $errorFile).Trim()
    Out-Warn 'mysqladmin shutdown 失败，MySQL 可能仍在运行'
    if (-not [string]::IsNullOrWhiteSpace($message)) { Out-Bullet $message }
    Out-Warn '运行 doctor.cmd 查看原因（常见：config\app.env 的 DB_ROOT_PASSWORD 与实际不一致）'
    return $false
  }
  if (-not (Wait-PortClosed '127.0.0.1' $port 60)) {
    Out-Warn ('MySQL 收到 shutdown 但端口 ' + $port + ' 仍在监听，请稍后再试 stop.cmd')
    return $false
  }
  Out-Ok 'MySQL 已停止'
  Remove-PidFile $script:P.MysqlPid
  return $true
}

# ===========================================================================
# 10. 数据库初始化（建库、建账号、导入、校验）
# ===========================================================================

function Invoke-SqlClient {
  param(
    [string]$Sql,
    [string]$SqlFile,
    [string]$Database,
    [string]$User,
    [string]$Password,
    [switch]$NoHeaders
  )
  $result = @{ ExitCode = -1; Output = ''; Error = '' }
  if (-not (Test-Path -LiteralPath $script:P.MysqlExe)) {
    $result.Error = '找不到 mysql\bin\mysql.exe'
    return $result
  }
  $config = Get-AppConfig
  Ensure-Directory $script:P.Tmp

  $inputFile = $SqlFile
  $tempInput = ''
  if ([string]::IsNullOrWhiteSpace($inputFile)) {
    $tempInput = Join-Path $script:P.Tmp ('sql-' + [guid]::NewGuid().ToString('N') + '.sql')
    Write-TextFile $tempInput @($Sql)
    $inputFile = $tempInput
  }
  $outputFile = Join-Path $script:P.Tmp ('sql-' + [guid]::NewGuid().ToString('N') + '.out')
  $errorFile = Join-Path $script:P.Tmp ('sql-' + [guid]::NewGuid().ToString('N') + '.err')

  $arguments = @('--protocol=tcp', '-h', '127.0.0.1', '-P', [string]$config.DbPort, '-u', $User, '--connect-timeout=5', '--default-character-set=utf8mb4')
  if ($NoHeaders) { $arguments = @('-N', '-B') + $arguments }
  if (-not [string]::IsNullOrWhiteSpace($Database)) { $arguments += $Database }
  # 口令用 --password= 传（原因见 Stop-MySqlServer 里的注释：MYSQL_PWD 在这个
  # MySQL 8.0.28 Windows 客户端上会算错口令）。ConvertTo-NativeArgs 会给含空格
  # 的参数整体加引号，所以口令里有空格也不会被拆开。
  if (-not [string]::IsNullOrEmpty($Password)) { $arguments += ('--password=' + [string]$Password) }

  $process = $null
  try {
    $process = Start-Process -FilePath $script:P.MysqlExe -ArgumentList (ConvertTo-NativeArgs $arguments) -NoNewWindow -Wait -PassThru -RedirectStandardInput $inputFile -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
  } catch {
    $result.Error = $_.Exception.Message
  }

  if (-not [string]::IsNullOrEmpty($tempInput)) {
    Remove-Item -LiteralPath $tempInput -Force -ErrorAction SilentlyContinue
  }
  if ($process -ne $null) { $result.ExitCode = [int]$process.ExitCode }
  $result.Output = Read-TextFile $outputFile
  $errorText = (Read-TextFile $errorFile).Trim()
  if (-not [string]::IsNullOrWhiteSpace($errorText)) { $result.Error = $errorText }
  Remove-Item -LiteralPath $outputFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $errorFile -Force -ErrorAction SilentlyContinue
  return $result
}

function Test-MySqlLogin([string]$User, [string]$Password) {
  $result = Invoke-SqlClient -Sql 'SELECT 1;' -User $User -Password $Password -NoHeaders
  if ($result.ExitCode -ne 0) { return $false }
  return ($result.Output.Trim() -eq '1')
}

function Get-MySqlScalar([string]$Sql, [string]$User, [string]$Password, [string]$Database) {
  $result = Invoke-SqlClient -Sql $Sql -User $User -Password $Password -Database $Database -NoHeaders
  if ($result.ExitCode -ne 0) { return '' }
  $lines = @([regex]::Split([string]$result.Output, '\r?\n') | Where-Object { $_.Trim().Length -gt 0 })
  if ($lines.Count -eq 0) { return '' }
  return ([string]$lines[0]).Trim()
}

function Resolve-RootPassword {
  $config = Get-AppConfig
  if (Test-MySqlLogin 'root' $config.DbRootPassword) { return $config.DbRootPassword }
  if (Test-MySqlLogin 'root' '') {
    Out-Warn 'root 还是初始空口令，正在按 config\app.env 设置…'
    $sql = 'ALTER USER ' + (Sql-Str 'root') + '@' + (Sql-Str 'localhost') + ' IDENTIFIED BY ' + (Sql-Str $config.DbRootPassword) + ';'
    $result = Invoke-SqlClient -Sql $sql -User 'root' -Password ''
    if ($result.ExitCode -ne 0) { throw ('设置 root 口令失败：' + $result.Error) }
    if (Test-MySqlLogin 'root' $config.DbRootPassword) {
      Out-Ok 'root 口令已与配置文件同步'
      return $config.DbRootPassword
    }
  }
  throw ('无法用 config\app.env 里的 DB_ROOT_PASSWORD 连接内置 MySQL（127.0.0.1:' + $config.DbPort + '）。常见原因：口令被手工改过，或 data\mysql 是从别的机器复制过来的。可运行 doctor.cmd 查看；确认可以重建时删除 data\mysql，再重跑 setup.cmd --step db。')
}

function Get-TableCount([string]$User, [string]$Password) {
  $config = Get-AppConfig
  $sql = 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=' + (Sql-Str $config.DbName) + ' AND table_type=' + (Sql-Str 'BASE TABLE') + ';'
  $value = Get-MySqlScalar $sql $User $Password ''
  return (ConvertTo-IntValue $value 0)
}

function Get-UserRowCount([string]$User, [string]$Password) {
  $config = Get-AppConfig
  $sql = 'SELECT COUNT(*) FROM ' + (Sql-Ident $config.DbName) + '.' + (Sql-Ident 't_user') + ';'
  $value = Get-MySqlScalar $sql $User $Password ''
  return (ConvertTo-IntValue $value 0)
}

function Ensure-DatabaseSchema {
  Require-MySqlInstalled
  $config = Get-AppConfig
  if ($script:DryRun) {
    Out-Dry ('将确保数据库 ' + $config.DbName + ' 与账号 ' + $config.DbUser + ' 存在，并授予该库权限')
    Out-Dry '若库里还没有表，将导入 app\init-mysql.sql（脚本含 DROP TABLE，只在空库执行）'
    return
  }
  if (-not (Test-PortOpen '127.0.0.1' $config.DbPort 800)) {
    throw ('MySQL 没有在 127.0.0.1:' + $config.DbPort + ' 监听。请先运行 setup.cmd --step mysql。')
  }

  $rootPassword = Resolve-RootPassword
  $user = $config.DbUser
  $database = $config.DbName
  $userPassword = $config.DbPassword

  $sql = New-Object System.Text.StringBuilder
  [void]$sql.Append('CREATE DATABASE IF NOT EXISTS ' + (Sql-Ident $database) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
  [void]$sql.Append('CREATE USER IF NOT EXISTS ' + (Sql-Str $user) + '@' + (Sql-Str 'localhost') + ' IDENTIFIED BY ' + (Sql-Str $userPassword) + ';')
  [void]$sql.Append('CREATE USER IF NOT EXISTS ' + (Sql-Str $user) + '@' + (Sql-Str '127.0.0.1') + ' IDENTIFIED BY ' + (Sql-Str $userPassword) + ';')
  [void]$sql.Append('ALTER USER ' + (Sql-Str $user) + '@' + (Sql-Str 'localhost') + ' IDENTIFIED BY ' + (Sql-Str $userPassword) + ';')
  [void]$sql.Append('ALTER USER ' + (Sql-Str $user) + '@' + (Sql-Str '127.0.0.1') + ' IDENTIFIED BY ' + (Sql-Str $userPassword) + ';')
  [void]$sql.Append('GRANT ALL PRIVILEGES ON ' + (Sql-Ident $database) + '.* TO ' + (Sql-Str $user) + '@' + (Sql-Str 'localhost') + ';')
  [void]$sql.Append('GRANT ALL PRIVILEGES ON ' + (Sql-Ident $database) + '.* TO ' + (Sql-Str $user) + '@' + (Sql-Str '127.0.0.1') + ';')
  [void]$sql.Append('CREATE USER IF NOT EXISTS ' + (Sql-Str 'root') + '@' + (Sql-Str '127.0.0.1') + ' IDENTIFIED BY ' + (Sql-Str $rootPassword) + ';')
  [void]$sql.Append('ALTER USER ' + (Sql-Str 'root') + '@' + (Sql-Str '127.0.0.1') + ' IDENTIFIED BY ' + (Sql-Str $rootPassword) + ';')
  [void]$sql.Append('GRANT ALL PRIVILEGES ON *.* TO ' + (Sql-Str 'root') + '@' + (Sql-Str '127.0.0.1') + ' WITH GRANT OPTION;')
  [void]$sql.Append('FLUSH PRIVILEGES;')

  $result = Invoke-SqlClient -Sql $sql.ToString() -User 'root' -Password $rootPassword
  if ($result.ExitCode -ne 0) {
    throw ('创建数据库/账号失败：' + $result.Error)
  }
  Out-Ok ('数据库已就绪：' + $database + '（应用账号 ' + $user + '）')

  $tableCount = Get-TableCount 'root' $rootPassword
  if ($tableCount -le 0) {
    $sqlFile = Join-Path $script:P.App 'init-mysql.sql'
    if (-not (Test-Path -LiteralPath $sqlFile)) {
      throw '找不到 app\init-mysql.sql，发布包不完整。请重新解压完整发布包。'
    }
    Out-Info '首次初始化：导入 app\init-mysql.sql（约 5~30 秒）…'
    $import = Invoke-SqlClient -SqlFile $sqlFile -Database $database -User 'root' -Password $rootPassword
    if ($import.ExitCode -ne 0) {
      throw ('导入 app\init-mysql.sql 失败：' + $import.Error)
    }
    $tableCount = Get-TableCount 'root' $rootPassword
    Out-Ok ('建表完成：共 ' + $tableCount + ' 张表')
  } else {
    Out-Info ('库里已有 ' + $tableCount + ' 张表，跳过建表脚本（保护已有数据）')
  }

  if (-not (Test-MySqlLogin $user $userPassword)) {
    throw ('应用账号 ' + $user + ' 无法登录 MySQL，请检查 config\app.env 的 DB_USER / DB_PASSWORD。')
  }
  $userRows = Get-UserRowCount $user $userPassword
  if ($userRows -lt 1) {
    throw '数据库 t_user 表没有数据（0 行），初始化可能不完整。请重跑 setup.cmd --step db。'
  }
  Out-Ok ('数据校验通过：t_user 共 ' + $userRows + ' 行，应用账号可登录')
}


# ===========================================================================
# 11. 应用启动
# ===========================================================================

function Get-AppJar {
  if (-not (Test-Path -LiteralPath $script:P.App)) {
    throw '找不到 app 目录，发布包不完整。请重新解压完整发布包。'
  }
  $jars = @(Get-ChildItem -LiteralPath $script:P.App -File -Filter '*.jar' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '(sources|javadoc)\.jar$' })
  if ($jars.Count -eq 0) {
    throw 'app 目录里没有 jar 文件，发布包不完整。请重新解压完整发布包。'
  }
  if ($jars.Count -eq 1) { return $jars[0] }
  $preferred = @($jars | Where-Object { $_.Name -like 'xuri-classroom-*.jar' })
  if ($preferred.Count -eq 1) { return $preferred[0] }
  throw ('app 目录里有多份 jar，无法判断用哪一个：' + (($jars | ForEach-Object { $_.Name }) -join '、'))
}

function Resolve-JavaRuntime {
  $candidates = New-Object System.Collections.ArrayList
  [void]$candidates.Add(@{ Path = $script:P.JavaExe; Source = 'runtime\jre8' })
  if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
    [void]$candidates.Add(@{ Path = (Join-Path $env:JAVA_HOME 'bin\java.exe'); Source = 'JAVA_HOME' })
  }
  $command = Get-Command java.exe -ErrorAction SilentlyContinue
  if ($command -ne $null -and $command.Source) {
    [void]$candidates.Add(@{ Path = [string]$command.Source; Source = '系统 PATH' })
  }
  foreach ($candidate in $candidates) {
    $path = [string]$candidate.Path
    if ([string]::IsNullOrEmpty($path)) { continue }
    if (-not (Test-Path -LiteralPath $path)) { continue }
    $info = Get-JavaVersionInfo $path
    if (-not $info.Ok) { continue }
    if (-not (Test-Java8Version $info.Version)) {
      Out-Warn ('找到的 Java 是 ' + $info.Version + '（' + [string]$candidate.Source + '），本程序只在 Java 8 上验证过')
    }
    return @{ Path = $path; Version = $info.Version; Source = [string]$candidate.Source }
  }
  throw '找不到可用的 Java 运行时。请运行 setup.cmd --step jre 下载内置 JRE（推荐），或安装 Java 8 后重试。'
}

function Get-AppProcess {
  $info = Read-PidFile $script:P.AppPid
  $processId = ConvertTo-IntValue $info['PID'] 0
  $jarPath = [string]$info['JAR']
  if ($processId -gt 0) {
    $record = Get-ProcessRecord $processId
    if ($record -ne $null) {
      $name = ([string]$record.Name).ToLowerInvariant()
      if ($name.StartsWith('java')) {
        $commandLine = ''
        if ($record.CommandLine) { $commandLine = [string]$record.CommandLine }
        if ([string]::IsNullOrEmpty($jarPath) -or $commandLine.IndexOf($jarPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
          return $record
        }
      }
    }
  }
  $found = @(Find-ProcessByCommandLine 'java.exe' $script:P.App)
  if ($found.Count -gt 0) { return $found[0] }
  return $null
}

function Get-AppUrl([int]$Port) {
  return 'http://127.0.0.1:' + $Port
}

function Get-JdbcUrl($Config) {
  return 'jdbc:mysql://' + [string]$Config.DbHost + ':' + [string]$Config.DbPort + '/' + [string]$Config.DbName + '?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&rewriteBatchedStatements=true'
}

function Wait-AppReady([int]$Port, [int]$TimeoutSec, [int]$ProcessId) {
  $url = (Get-AppUrl $Port) + '/api/system'
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastStatus = 0
  while ((Get-Date) -lt $deadline) {
    $probe = Invoke-HttpProbe $url 3
    if ($probe.Ok -and $probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
      # 关键：必须确认应答的是“我们刚启动的进程”，否则同机别的程序占着 8080
      # 也会返回 200，看上去启动成功，实际我们的进程根本没起来。
      $ownerProcessId = Get-ListeningProcessId $Port
      $ownedByUs = $true
      if ($ownerProcessId -gt 0 -and $ProcessId -gt 0) {
        if ($ownerProcessId -ne $ProcessId) {
          if (-not (Test-ProcessIsChildOf $ownerProcessId $ProcessId)) { $ownedByUs = $false }
        }
      }
      if (-not $ownedByUs) {
        return @{ Ready = $false; StatusCode = [int]$probe.StatusCode; Exited = $false; Body = ''; ForeignOwner = $ownerProcessId }
      }
      return @{ Ready = $true; StatusCode = $probe.StatusCode; Exited = $false; Body = $probe.Body; ForeignOwner = 0 }
    }
    if ($probe.Ok) { $lastStatus = [int]$probe.StatusCode }
    if ($ProcessId -gt 0 -and -not (Test-ProcessAlive $ProcessId)) {
      return @{ Ready = $false; StatusCode = $lastStatus; Exited = $true; Body = ''; ForeignOwner = 0 }
    }
    Start-Sleep -Milliseconds 1000
  }
  return @{ Ready = $false; StatusCode = $lastStatus; Exited = $false; Body = ''; ForeignOwner = 0 }
}

function Print-AppAccess($Config) {
  $url = Get-AppUrl ([int]$Config.Port)
  $addresses = @(Get-LanAddresses)
  Out-Line ''
  Out-Line '  访问地址：'
  Out-Line ('    本机：     ' + $url)
  foreach ($ip in $addresses) {
    Out-Line ('    局域网：   http://' + $ip + ':' + [string]$Config.Port)
  }
  if ($addresses.Count -eq 0) {
    Out-Line '    局域网：   未检测到可用网卡地址（请确认网络已连接）'
  }
  Out-Line ''
  Out-Line '  默认管理员：admin / 123456（第一次登录后请立刻改密码）'
  Out-Line '  停止：stop.cmd     状态：status.cmd     体检：doctor.cmd'
  Out-Line ('  数据：' + $script:P.Data + '    日志：' + $script:P.Logs)
  Out-Line ''
}

function Ensure-AppStarted {
  param([switch]$OpenBrowser)
  $config = Get-AppConfig
  $jar = $null
  try {
    $jar = Get-AppJar
  } catch {
    if (-not $script:DryRun) { throw }
  }
  $port = [int]$config.Port
  $url = Get-AppUrl $port

  $running = Get-AppProcess
  if ($running -ne $null) {
    Out-Ok ('应用已在运行：PID ' + $running.ProcessId)
    $probe = Invoke-HttpProbe ($url + '/api/system') 3
    if ($probe.Ok -and $probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
      Print-AppAccess $config
      if ($OpenBrowser) { Open-Url $url }
      return
    }
    Out-Warn '应用进程在，但 /api/system 还没响应，最多再等 60 秒…'
    $wait = Wait-AppReady $port 60 ([int]$running.ProcessId)
    if (-not $wait.Ready) {
      throw ('应用进程在（PID ' + $running.ProcessId + '），但 ' + $url + '/api/system 没有返回 2xx。请查看 logs 目录下最新的 app-*.err.log。')
    }
    Print-AppAccess $config
    if ($OpenBrowser) { Open-Url $url }
    return
  }

  if ($script:DryRun) {
    if ($jar -ne $null) {
      Out-Dry ('将启动应用：' + $jar.FullName)
    } else {
      Out-Dry '将启动应用（当前 app 目录里还没有 jar，发布包补齐后即可启动）'
    }
    Out-Dry ('端口 ' + $port + '；日志写入 logs\app-*.log；PID 写入 run\app.pid')
    Print-AppAccess $config
    return
  }

  $ownerProcessId = Get-ListeningProcessId $port
  if ($ownerProcessId -gt 0) {
    $ownerName = '未知进程'
    $ownerRecord = Get-ProcessRecord $ownerProcessId
    if ($ownerRecord -ne $null) { $ownerName = [string]$ownerRecord.Name }
    throw ('端口 ' + $port + ' 已被其他程序占用（PID ' + $ownerProcessId + '，' + $ownerName + '）。请关闭它，或修改 config\app.env 的 PORT 后重试。')
  }

  $java = Resolve-JavaRuntime
  Out-Info ('Java：' + $java.Path + '（' + $java.Version + '，来源 ' + [string]$java.Source + '）')
  Ensure-Directory $script:P.Logs
  Ensure-Directory $script:P.Run
  Ensure-Directory $config.FilesPath

  $stamp = Get-Timestamp
  $outputFile = Join-Path $script:P.Logs ('app-' + $stamp + '.out.log')
  $errorFile = Join-Path $script:P.Logs ('app-' + $stamp + '.err.log')

  # Spring Boot 通过环境变量接收数据库与端口配置（宽松绑定，全大写）
  $env:SPRING_PROFILES_ACTIVE = 'pro'
  $env:SPRING_DATASOURCE_URL = Get-JdbcUrl $config
  $env:SPRING_DATASOURCE_USERNAME = [string]$config.DbUser
  $env:SPRING_DATASOURCE_PASSWORD = [string]$config.DbPassword
  $env:SERVER_PORT = [string]$port
  $env:SK_JWT_SECRET = [string]$config.JwtSecret
  $env:SK_WEB_SPA_ENABLED = 'true'
  # 两个名字都设置：规范写法给未来版本；_ROOTPATH 是 Spring 宽松绑定实际识别的名字
  $env:FILE_STORAGE_LOCAL_ROOT_PATH = [string]$config.FilesPath
  $env:FILE_STORAGE_LOCAL_ROOTPATH = [string]$config.FilesPath

  $argumentList = New-Object System.Collections.ArrayList
  foreach ($option in ([string]$config.JavaOpts -split '\s+')) {
    if (-not [string]::IsNullOrWhiteSpace($option)) { [void]$argumentList.Add($option) }
  }
  [void]$argumentList.Add('-Dfile.encoding=UTF-8')
  [void]$argumentList.Add('-Dsun.stdout.encoding=UTF-8')
  [void]$argumentList.Add('-Dsun.stderr.encoding=UTF-8')
  [void]$argumentList.Add('-Duser.timezone=Asia/Shanghai')
  [void]$argumentList.Add('-jar')
  [void]$argumentList.Add($jar.FullName)
  # 命令行参数优先级最高，避免 application-pro.yml 里写死的端口覆盖配置
  [void]$argumentList.Add('--server.port=' + [string]$port)
  [void]$argumentList.Add('--file-storage.local.root-path=' + [string]$config.FilesPath)

  Out-Info ('启动应用：' + $jar.Name)
  $process = Start-Process -FilePath $java.Path -ArgumentList (ConvertTo-NativeArgs $argumentList) -WorkingDirectory $script:P.Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
  Write-PidFile $script:P.AppPid @{
    PID = $process.Id
    PORT = $port
    JAR = $jar.FullName
    JAVA = $java.Path
    STARTED = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  }

  Out-Info ('等待应用就绪（最多 ' + $script:Opts.TimeoutSec + ' 秒，首次启动要建连数据库）…')
  $wait = Wait-AppReady $port ([int]$script:Opts.TimeoutSec) ([int]$process.Id)
  if (-not $wait.Ready) {
    if ($wait.ForeignOwner -ne $null -and [int]$wait.ForeignOwner -gt 0) {
      $foreignName = '未知进程'
      $foreignRecord = Get-ProcessRecord ([int]$wait.ForeignOwner)
      if ($foreignRecord -ne $null) { $foreignName = [string]$foreignRecord.Name }
      throw ('端口 ' + $port + ' 已被其他程序占用（PID ' + $wait.ForeignOwner + '，' + $foreignName + '），本程序没有真正监听成功。请关闭该程序，或修改 config\app.env 的 PORT。')
    }
    $tail = Get-FileTail $errorFile 25
    if ([string]::IsNullOrWhiteSpace($tail)) { $tail = Get-FileTail $outputFile 25 }
    if (-not [string]::IsNullOrWhiteSpace($tail)) { Out-Bullet $tail }
    if ($wait.Exited) {
      throw ('应用进程已退出（启动失败）。日志：' + $errorFile)
    }
    throw ('应用启动超时：' + $script:Opts.TimeoutSec + ' 秒内 ' + $url + '/api/system 没有返回 2xx。日志：' + $errorFile)
  }

  $appVersion = ''
  try {
    $systemInfo = $wait.Body | ConvertFrom-Json
    if ($systemInfo -ne $null -and $systemInfo.version -ne $null) { $appVersion = [string]$systemInfo.version }
  } catch { }
  if ($appVersion -ne '') {
    Out-Ok ('应用已就绪：/api/system HTTP ' + $wait.StatusCode + '，后端版本 ' + $appVersion + '（PID ' + $process.Id + '）')
  } else {
    Out-Ok ('应用已就绪：/api/system HTTP ' + $wait.StatusCode + '（PID ' + $process.Id + '）')
  }

  # 前端是打进 jar 的（-PwithSpa）：根路径和任意深链接都应该返回 index.html
  # 变量不能叫 $home：它是 PowerShell 的只读自动变量 HOME
  $homePage = Invoke-HttpProbe ($url + '/') 5
  if ($homePage.Ok -and $homePage.StatusCode -eq 200 -and $homePage.Body -match '(?i)(id="root"|<!doctype html)') {
    Out-Ok '前端首页：HTTP 200（index.html）'
    $deep = Invoke-HttpProbe ($url + '/survey/__probe__') 5
    if ($deep.Ok -and $deep.StatusCode -eq 200) {
      Out-Ok '前端深链接：HTTP 200（SPA 回落正常）'
    } else {
      Out-Warn ('深链接 /survey/__probe__ 返回 ' + $deep.StatusCode + '，SPA 回落可能没开；刷新页面可能出现 404')
    }
  } else {
    Out-Warn ('首页没有返回 HTML（HTTP ' + $homePage.StatusCode + '）。如果浏览器打开是白屏/404，说明这个 jar 没有内嵌前端，需要用 -PwithSpa 重新打包。')
  }
  Out-Ok '应用验证通过（数据库、后端接口、前端页面均已响应）'

  Print-AppAccess $config
  if ($OpenBrowser) { Open-Url $url }
}

# ===========================================================================
# 12. 防火墙
# ===========================================================================

function Get-FirewallRule([int]$Port) {
  $name = 'xuri-classroom-' + $Port
  try {
    $rule = Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
    if ($rule -ne $null) { return $rule }
  } catch {
    return $null
  }
  return $null
}

function Add-FirewallRuleLocal([int]$Port) {
  $name = 'xuri-classroom-' + $Port
  $display = '旭日云课堂 便携版（TCP ' + $Port + '）'
  Remove-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
  New-NetFirewallRule -Name $name -DisplayName $display -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Private,Domain -Description '旭日云课堂便携版局域网访问（由 setup 自动创建）' | Out-Null
}

function Invoke-ElevatedFirewallAdd([int]$Port) {
  Ensure-Directory $script:P.Tmp
  $helper = Join-Path $script:P.Tmp 'add-firewall.ps1'
  $resultFile = Join-Path $script:P.Tmp 'add-firewall.result'
  Remove-Item -LiteralPath $resultFile -Force -ErrorAction SilentlyContinue
  $name = 'xuri-classroom-' + $Port
  $display = '旭日云课堂 便携版（TCP ' + $Port + '）'

  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add('$ErrorActionPreference = ''Stop''')
  [void]$lines.Add('try {')
  [void]$lines.Add('  Remove-NetFirewallRule -Name ' + (ConvertTo-PsLiteral $name) + ' -ErrorAction SilentlyContinue')
  [void]$lines.Add('  New-NetFirewallRule -Name ' + (ConvertTo-PsLiteral $name) + ' -DisplayName ' + (ConvertTo-PsLiteral $display) + ' -Direction Inbound -Action Allow -Protocol TCP -LocalPort ' + $Port + ' -Profile Private,Domain -Description ''旭日云课堂便携版局域网访问（由 setup 自动创建）'' | Out-Null')
  [void]$lines.Add('  Set-Content -LiteralPath ' + (ConvertTo-PsLiteral $resultFile) + ' -Value ''ok'' -Encoding ASCII')
  [void]$lines.Add('} catch {')
  [void]$lines.Add('  Set-Content -LiteralPath ' + (ConvertTo-PsLiteral $resultFile) + ' -Value (''failed: '' + $_.Exception.Message) -Encoding UTF8')
  [void]$lines.Add('}')
  Write-TextFile $helper @($lines)

  Out-Info '需要管理员权限添加防火墙规则，马上会弹出 UAC 提示（请选择“是”）…'
  try {
    $helperArgs = @()
    $helperArgs += '-NoProfile'
    $helperArgs += '-ExecutionPolicy'
    $helperArgs += 'Bypass'
    $helperArgs += '-File'
    $helperArgs += $helper
    $elevatedArgs = ConvertTo-NativeArgs $helperArgs
    Start-Process -FilePath (Get-PowerShellExe) -ArgumentList $elevatedArgs -Verb RunAs | Out-Null
  } catch {
    Out-Warn ('已取消管理员授权，跳过防火墙配置：' + $_.Exception.Message)
    return $false
  }

  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 700
    if (Test-Path -LiteralPath $resultFile) {
      $text = (Read-TextFile $resultFile).Trim()
      Remove-Item -LiteralPath $resultFile -Force -ErrorAction SilentlyContinue
      if ($text -eq 'ok') { return $true }
      Out-Warn ('添加防火墙规则失败：' + $text)
      return $false
    }
  }
  Out-Warn '等待管理员授权超时（60 秒），已跳过防火墙配置'
  return $false
}

function Ensure-FirewallRule([int]$Port) {
  if ($script:Opts.NoFirewall) {
    Out-Info '（--no-firewall）跳过防火墙配置'
    return $true
  }
  if ((Get-FirewallRule $Port) -ne $null) {
    Out-Ok ('防火墙规则已存在：xuri-classroom-' + $Port)
    return $true
  }
  if ($script:DryRun) {
    Out-Dry ('将添加防火墙入站规则：TCP ' + $Port + '（仅专用/域网络）')
    return $true
  }
  if (Test-Administrator) {
    try {
      Add-FirewallRuleLocal $Port
      Out-Ok ('已添加防火墙规则：xuri-classroom-' + $Port)
      return $true
    } catch {
      Out-Warn ('添加防火墙规则失败：' + $_.Exception.Message)
      return $false
    }
  }
  $ok = Invoke-ElevatedFirewallAdd $Port
  if (-not $ok) {
    Out-Warn '未添加防火墙规则：本机可以访问，但局域网其他电脑可能打不开。可手工放行该 TCP 端口，或右键以管理员身份运行 setup.cmd。'
  }
  return $ok
}

# ===========================================================================
# 13. 安装状态、日志清理与引导步骤
# ===========================================================================

function Test-SetupDone {
  if (-not (Test-Path -LiteralPath $script:P.SetupDone)) { return $false }
  $map = Read-EnvFile $script:P.SetupDone
  return ((Get-EnvValue $map 'STATUS' '') -eq 'ok')
}

function Write-SetupDone {
  if ($script:DryRun) { return }
  $config = Get-AppConfig
  $java = Get-JavaVersionInfo $script:P.JavaExe
  $lines = New-Object System.Collections.ArrayList
  [void]$lines.Add('# 安装完成标记：start.cmd 看到 STATUS=ok 就不再进入引导安装')
  [void]$lines.Add('STATUS=ok')
  [void]$lines.Add('VERSION=' + (Get-PackageVersion))
  [void]$lines.Add('DATE=' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  [void]$lines.Add('JRE=' + [string]$java.Version)
  [void]$lines.Add('MYSQL=' + (Get-MySqlVersionText $script:P.MysqldExe))
  [void]$lines.Add('PORT=' + [string]$config.Port)
  Write-TextFile $script:P.SetupDone @($lines)
  Out-Ok '已写入安装标记：config\setup.done'
}

function Get-MissingComponents {
  $missing = New-Object System.Collections.ArrayList
  if (-not (Test-Path -LiteralPath $script:P.AppEnv)) { [void]$missing.Add('config\app.env') }
  if (-not (Test-Path -LiteralPath $script:P.JavaExe)) { [void]$missing.Add('JRE（runtime\jre8）') }
  if (-not (Test-Path -LiteralPath $script:P.MysqldExe)) { [void]$missing.Add('MySQL（mysql\）') }
  if (-not (Test-Path -LiteralPath (Join-Path $script:P.DataMysql 'mysql'))) { [void]$missing.Add('数据库（data\mysql）') }
  if (-not (Test-Path -LiteralPath (Join-Path $script:P.App 'init-mysql.sql'))) { [void]$missing.Add('app\init-mysql.sql') }
  $jars = @(Get-ChildItem -LiteralPath $script:P.App -File -Filter '*.jar' -ErrorAction SilentlyContinue)
  if ($jars.Count -eq 0) { [void]$missing.Add('应用 jar（app\*.jar）') }
  return @($missing)
}

function Cleanup-OldLogs {
  if (-not (Test-Path -LiteralPath $script:P.Logs)) { return }
  foreach ($pattern in @('setup-*.log', 'doctor-*.txt', 'start-*.log', 'app-*.out.log', 'app-*.err.log', 'mysql-*.out.log', 'mysql-*.err.log')) {
    $files = @(Get-ChildItem -LiteralPath $script:P.Logs -File -Filter $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($files.Count -gt 30) {
      $files | Select-Object -Skip 30 | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
    }
  }
}

function Assert-Environment {
  $config = Get-AppConfig
  $failures = New-Object System.Collections.ArrayList

  $osVersion = [System.Environment]::OSVersion.Version
  $productName = ''
  try {
    $productName = [string](Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -Name ProductName -ErrorAction Stop).ProductName
  } catch { }
  $osText = 'Windows ' + $osVersion.Major + '.' + $osVersion.Minor + ' build ' + $osVersion.Build
  if ($productName -ne '') { $osText = $productName + '（build ' + $osVersion.Build + '）' }
  # Win11 的注册表 ProductName 仍写着 "Windows 10"，用 build 号纠正，免得报告看着奇怪
  if ($osVersion.Build -ge 22000) { $osText = $osText.Replace('Windows 10', 'Windows 11') }
  if (-not [System.Environment]::Is64BitOperatingSystem) {
    Out-Fail ('操作系统：' + $osText + '，32 位系统不受支持')
    [void]$failures.Add('不是 64 位系统')
  } elseif ($osVersion.Major -lt 10) {
    Out-Fail ('操作系统：' + $osText + '，只支持 Windows 10 / 11')
    [void]$failures.Add('Windows 版本过低')
  } else {
    Out-Ok ('操作系统：' + $osText + '，64 位')
  }

  try {
    $drive = New-Object System.IO.DriveInfo([System.IO.Path]::GetPathRoot($script:Root))
    $freeGB = [math]::Round($drive.AvailableFreeSpace / 1GB, 1)
    if ($freeGB -lt 2) {
      Out-Fail ('磁盘空间：' + $drive.Name + ' 仅剩 ' + $freeGB + ' GB，至少需要 2 GB')
      [void]$failures.Add('磁盘空间不足')
    } elseif ($freeGB -lt 5) {
      Out-Warn ('磁盘空间：' + $drive.Name + ' 剩余 ' + $freeGB + ' GB（建议 5 GB 以上，下载和解压要临时空间）')
    } else {
      Out-Ok ('磁盘空间：' + $drive.Name + ' 剩余 ' + $freeGB + ' GB')
    }
  } catch {
    Out-Warn ('磁盘空间：无法读取（' + $_.Exception.Message + '）')
  }

  foreach ($entry in @(@{ Name = '网站端口'; Port = [int]$config.Port }, @{ Name = 'MySQL 端口'; Port = [int]$config.DbPort })) {
    $checkPort = [int]$entry.Port
    $owner = Get-ListeningProcessId $checkPort
    if ($owner -le 0) {
      Out-Ok ([string]$entry.Name + ' ' + $checkPort + '：空闲')
      continue
    }
    $ownerName = '未知进程'
    $ownerRecord = Get-ProcessRecord $owner
    if ($ownerRecord -ne $null) { $ownerName = [string]$ownerRecord.Name }
    $isOurs = $false
    if ($entry.Name -eq '网站端口') {
      $appProcess = Get-AppProcess
      if ($appProcess -ne $null -and (Test-PortOwnedByTrackedProcess $checkPort ([int]$appProcess.ProcessId))) { $isOurs = $true }
    } else {
      $mysqlProcess = Get-MySqlProcess
      if ($mysqlProcess -ne $null -and (Test-PortOwnedByTrackedProcess $checkPort ([int]$mysqlProcess.ProcessId))) { $isOurs = $true }
    }
    if ($isOurs) {
      Out-Ok ([string]$entry.Name + ' ' + $checkPort + '：被本程序占用（PID ' + $owner + '），正常')
    } else {
      Out-Fail ([string]$entry.Name + ' ' + $checkPort + '：被其他程序占用（PID ' + $owner + '，' + $ownerName + '）')
      [void]$failures.Add([string]$entry.Name + '被占用')
    }
  }

  if ($script:DryRun) {
    Out-Dry ('将测试写入权限：' + $script:Root)
  } else {
    try {
      Ensure-Directory $script:P.Run
      Ensure-Directory $script:P.Cache
      $probe = Join-Path $script:P.Run ('.write-test-' + (Get-Timestamp))
      Write-TextFile $probe @('ok')
      Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
      Out-Ok ('写入权限：' + $script:Root + ' 可写')
    } catch {
      Out-Fail ('写入权限：' + $script:Root + ' 不可写（' + $_.Exception.Message + '）')
      [void]$failures.Add('目录不可写')
    }
  }

  try {
    $runtimeConfig = Get-RuntimeConfig
    if ([int]$runtimeConfig.MysqlPort -ne [int]$config.DbPort) {
      Out-Warn ('config\runtime.env 的 MYSQL_PORT（' + $runtimeConfig.MysqlPort + '）与 config\app.env 的 DB_PORT（' + $config.DbPort + '）不一致；实际以 DB_PORT 为准，建议把两处改成一样')
    }
  } catch { }

  if ($script:Root -match '[^\x00-\x7E]') {
    Out-Fail ('安装路径：' + $script:Root + ' 含中文/非 ASCII 字符，MySQL 8 无法从这种路径启动')
    [void]$failures.Add('路径含中文')
  } else {
    Out-Ok '安装路径：纯英文，MySQL 可以正常启动'
  }

  if ($failures.Count -gt 0) {
    throw ('环境检查未通过：' + ($failures -join '、'))
  }
}

function Invoke-SetupStep([string]$Step) {
  switch ($Step) {
    'env' {
      Out-Step '步骤 1/4 · 环境检查'
      Assert-Environment
      return
    }
    'jre' {
      Out-Step '步骤 2/4 · JRE 运行时'
      Ensure-JreInstalled
      return
    }
    'mysql' {
      Out-Step '步骤 3/4 · MySQL（下载与初始化）'
      Ensure-MySqlInstalled
      Ensure-MySqlDataInitialized
      return
    }
    'db' {
      Out-Step '步骤 3/4 · MySQL（建库与数据导入）'
      Require-MySqlInstalled
      Ensure-MySqlDataInitialized
      Start-MySqlServer
      Ensure-DatabaseSchema
      return
    }
    'app' {
      Out-Step '步骤 4/4 · 启动应用'
      Ensure-JreInstalled
      Require-MySqlInstalled
      Ensure-MySqlDataInitialized
      Start-MySqlServer
      Ensure-DatabaseSchema
      $appConfig = Get-AppConfig
      Ensure-FirewallRule ([int]$appConfig.Port) | Out-Null
      Ensure-AppStarted -OpenBrowser
      return
    }
  }
  throw ('未知的安装步骤：' + $Step)
}

function Invoke-SetupCommand {
  $version = Get-PackageVersion
  $steps = @()
  if ($script:Opts.Step.Count -gt 0) { $steps = @($script:Opts.Step) } else { $steps = @('env', 'jre', 'mysql', 'db', 'app') }

  if ($script:DryRun) {
    Out-Header ('引导安装（预演）· 旭日云课堂 ' + $version)
    Out-Info '预演模式：只打印计划，不写文件、不下载、不启动进程。'
  } else {
    Ensure-Directory $script:P.Logs
    Cleanup-OldLogs
    $script:LogPath = Join-Path $script:P.Logs ('setup-' + (Get-Timestamp) + '.log')
    Out-Header ('引导安装 · 旭日云课堂 ' + $version)
    Out-Info ('安装目录：' + $script:Root)
    Out-Info ('日志文件：' + $script:LogPath)
    Out-Info ('执行步骤：' + ($steps -join ' → '))
  }

  try {
    [void](Get-AppConfig)
    [void](Get-RuntimeConfig)
  } catch {
    $diag = Get-StepDiagnostics 'env'
    Show-FailureBlock -Title $diag.Title -Message $_.Exception.Message -Causes $diag.Causes -NextAction $diag.NextAction -LogPath $script:LogPath
    return 1
  }

  $started = Get-Date
  foreach ($step in $steps) {
    try {
      Invoke-SetupStep $step
    } catch {
      $diag = Get-StepDiagnostics $step
      Show-FailureBlock -Title $diag.Title -Message ([string]$_.Exception.Message) -Causes $diag.Causes -NextAction $diag.NextAction -LogPath $script:LogPath
      return 1
    }
  }

  $elapsed = [int]((Get-Date) - $started).TotalSeconds
  if ($script:DryRun) {
    Out-Step '预演结束'
    Out-Info '去掉 --whatif 后重新运行即可真正执行。'
    return 0
  }

  $missing = @(Get-MissingComponents)
  if ($missing.Count -eq 0) {
    Write-SetupDone
    Out-Header '安装完成'
    Out-Info ('耗时 ' + $elapsed + ' 秒。以后直接双击 start.cmd 就能启动。')
    Out-Info ('日志：' + $script:LogPath)
  } else {
    Out-Step '步骤执行完成'
    Out-Info ('耗时 ' + $elapsed + ' 秒；仍有组件未就绪：' + ($missing -join '、'))
    Out-Info '继续运行 setup.cmd 完成剩余步骤。'
  }
  return 0
}

# ===========================================================================
# 14. 顶层命令：start / stop / status / doctor
# ===========================================================================

function Invoke-StartCommand {
  Out-Header ('旭日云课堂 · Windows 便携版 ' + (Get-PackageVersion))
  $missing = @(Get-MissingComponents)
  $setupDone = Test-SetupDone

  if (-not $setupDone -or $missing.Count -gt 0) {
    if ($setupDone) {
      Out-Warn ('安装记录存在，但缺少组件：' + ($missing -join '、') + '，自动进入引导安装。')
    } else {
      Out-Info '检测到首次运行：自动进入引导安装（会显示每一步进度）。'
      Out-Info '只重做某一步可用：setup.cmd --step jre|mysql|db|app'
    }
    return (Invoke-SetupCommand)
  }

  if ($script:DryRun) {
    Out-Info '预演模式：只打印计划，不启动进程。'
  } else {
    Ensure-Directory $script:P.Logs
    $script:LogPath = Join-Path $script:P.Logs ('start-' + (Get-Timestamp) + '.log')
  }
  $config = Get-AppConfig
  Ensure-FirewallRule ([int]$config.Port) | Out-Null

  try {
    Start-MySqlServer
    Ensure-DatabaseSchema
  } catch {
    $diag = Get-StepDiagnostics 'db'
    Show-FailureBlock -Title $diag.Title -Message ([string]$_.Exception.Message) -Causes $diag.Causes -NextAction $diag.NextAction -LogPath $script:LogPath
    return 1
  }

  try {
    Ensure-AppStarted -OpenBrowser
  } catch {
    $diag = Get-StepDiagnostics 'app'
    Show-FailureBlock -Title $diag.Title -Message ([string]$_.Exception.Message) -Causes $diag.Causes -NextAction $diag.NextAction -LogPath $script:LogPath
    return 1
  }
  return 0
}

function Invoke-StopCommand {
  Out-Header '停止旭日云课堂'
  $config = Get-AppConfig
  $app = Get-AppProcess
  if ($app -eq $null) {
    Out-Info '应用未在运行'
    Remove-PidFile $script:P.AppPid
  } elseif ($script:DryRun) {
    Out-Dry ('将停止应用进程 PID ' + $app.ProcessId)
  } else {
    Out-Info ('停止应用：PID ' + $app.ProcessId + '…')
    try {
      Stop-Process -Id ([int]$app.ProcessId) -Force -ErrorAction Stop
    } catch {
      Out-Warn ('停止应用失败：' + $_.Exception.Message)
    }
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
      if (-not (Test-ProcessAlive ([int]$app.ProcessId))) { break }
      Start-Sleep -Milliseconds 500
    }
    if (Test-ProcessAlive ([int]$app.ProcessId)) {
      Out-Warn ('应用进程 PID ' + $app.ProcessId + ' 仍在运行，请稍后再试或手工结束')
    } else {
      Out-Ok '应用已停止'
    }
    Remove-PidFile $script:P.AppPid
  }

  $mysqlStopped = Stop-MySqlServer
  if (-not $mysqlStopped) { return 1 }
  if (-not $script:DryRun) {
    Out-Line ''
    Out-Line '  已全部停止。重新启动：start.cmd'
  }
  return 0
}

function Invoke-StatusCommand {
  Out-Header ('旭日云课堂 · Windows 便携版 ' + (Get-PackageVersion))
  Out-Info ('安装目录：' + $script:Root)
  if (Test-SetupDone) {
    Out-Ok '安装状态：已完成（config\setup.done）'
  } else {
    Out-Warn '安装状态：未完成或未记录（运行 start.cmd 会自动引导安装）'
  }

  $missing = @(Get-MissingComponents)
  if ($missing.Count -gt 0) {
    Out-Warn ('缺少组件：' + ($missing -join '、'))
  } else {
    Out-Ok '组件：JRE / MySQL / 数据库 / 应用 jar 均已就位'
  }

  $config = $null
  if (Test-Path -LiteralPath $script:P.AppEnv) {
    try {
      $config = Get-AppConfig
      Out-Info ('配置：config\app.env（端口 ' + $config.Port + '，数据库 ' + $config.DbHost + ':' + $config.DbPort + '/' + $config.DbName + '）')
    } catch {
      Out-Warn ('配置：config\app.env 有问题 —— ' + $_.Exception.Message)
    }
  } else {
    Out-Warn '配置：config\app.env 尚未生成'
  }

  $port = 8080
  $dbPort = 3307
  if ($config -ne $null) {
    $port = [int]$config.Port
    $dbPort = [int]$config.DbPort
  } elseif (Test-Path -LiteralPath $script:P.RuntimeEnv) {
    $runtimeMap = Read-EnvFile $script:P.RuntimeEnv
    $dbPort = ConvertTo-IntValue (Get-EnvValue $runtimeMap 'MYSQL_PORT' '3307') 3307
  }

  if (Test-Path -LiteralPath $script:P.JavaExe) {
    $java = Get-JavaVersionInfo $script:P.JavaExe
    if ($java.Ok) { Out-Ok ('JRE：' + $java.Version + '（runtime\jre8）') } else { Out-Warn 'JRE：java.exe 存在但无法运行' }
  } else {
    Out-Warn 'JRE：未安装（runtime\jre8）'
  }

  if (Test-Path -LiteralPath $script:P.MysqldExe) {
    Out-Info ('MySQL：' + (Get-MySqlVersionText $script:P.MysqldExe))
  } else {
    Out-Warn 'MySQL：未安装（mysql\）'
  }

  $mysqlProcess = Get-MySqlProcess
  if ($mysqlProcess -ne $null) {
    Out-Ok ('数据库进程：运行中（PID ' + $mysqlProcess.ProcessId + '，127.0.0.1:' + $dbPort + '）')
    if ($config -ne $null) {
      if (Test-MySqlLogin 'root' $config.DbRootPassword) {
        $tableCount = Get-TableCount 'root' $config.DbRootPassword
        if ($tableCount -gt 0) { Out-Ok ('数据库：已建表 ' + $tableCount + ' 张') } else { Out-Warn '数据库：还没有建表（运行 setup.cmd --step db）' }
      } else {
        Out-Warn '数据库：root 账号无法登录（运行 doctor.cmd 查看原因）'
      }
    }
  } else {
    Out-Info '数据库进程：未运行'
  }

  $app = Get-AppProcess
  if ($app -ne $null) {
    Out-Ok ('应用进程：运行中（PID ' + $app.ProcessId + '）')
    $url = Get-AppUrl $port
    $probe = Invoke-HttpProbe ($url + '/api/system') 3
    if ($probe.Ok -and $probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
      Out-Ok ('应用健康：HTTP ' + $probe.StatusCode + '（' + $url + '/api/system）')
      Out-Line ''
      Out-Line '  访问地址：'
      Out-Line ('    本机：     ' + $url)
      foreach ($ip in @(Get-LanAddresses)) {
        Out-Line ('    局域网：   http://' + $ip + ':' + $port)
      }
      Out-Line ''
    } else {
      Out-Warn ('应用健康：/api/system 无响应或返回 ' + $probe.StatusCode)
    }
  } else {
    Out-Info '应用进程：未运行'
  }

  Out-Line ''
  Out-Info ('日志目录：' + $script:P.Logs)
  $latest = @(Get-ChildItem -LiteralPath $script:P.Logs -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 5)
  foreach ($file in $latest) {
    Out-Bullet ($file.Name + '    ' + $file.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))
  }
  if ($latest.Count -eq 0) { Out-Bullet '（暂无日志）' }
  return 0
}

function Add-DoctorResult([string]$Status, [string]$Name, [string]$Detail, [string]$Hint) {
  $line = '[' + $Status + '] ' + $Name + '：' + $Detail
  if ($Status -eq '通过') {
    $script:CheckPass++
    Write-Host $line -ForegroundColor Green
  } elseif ($Status -eq '警告') {
    $script:CheckWarn++
    Write-Host $line -ForegroundColor Yellow
  } else {
    $script:CheckFail++
    Write-Host $line -ForegroundColor Red
  }
  Add-LogText $line
  if (-not [string]::IsNullOrWhiteSpace($Hint)) {
    Write-Host ('        建议：' + $Hint) -ForegroundColor DarkGray
    Add-LogText ('        建议：' + $Hint)
  }
}

function Invoke-DoctorCommand {
  $version = Get-PackageVersion
  if (-not $script:DryRun) {
    Ensure-Directory $script:P.Logs
    Cleanup-OldLogs
    $script:LogPath = Join-Path $script:P.Logs ('doctor-' + (Get-Timestamp) + '.txt')
  }
  $script:CheckPass = 0
  $script:CheckWarn = 0
  $script:CheckFail = 0
  $fixActions = New-Object System.Collections.ArrayList

  Out-Header ('体检报告 · 旭日云课堂 ' + $version)
  Out-Info ('安装目录：' + $script:Root)
  if (-not $script:DryRun) { Out-Info ('报告文件：' + $script:LogPath) }

  $config = $null
  $configError = ''
  try { $config = Get-AppConfig } catch { $configError = [string]$_.Exception.Message }
  $port = 8080
  $dbPort = 3307
  if ($config -ne $null) {
    $port = [int]$config.Port
    $dbPort = [int]$config.DbPort
  }

  Out-Step '1. 系统与磁盘'
  $osVersion = [System.Environment]::OSVersion.Version
  $productName = ''
  try {
    $productName = [string](Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -Name ProductName -ErrorAction Stop).ProductName
  } catch { }
  $osText = 'Windows ' + $osVersion.Major + '.' + $osVersion.Minor + ' build ' + $osVersion.Build
  if ($productName -ne '') { $osText = $productName + '（build ' + $osVersion.Build + '）' }
  # Win11 的注册表 ProductName 仍写着 "Windows 10"，用 build 号纠正，免得报告看着奇怪
  if ($osVersion.Build -ge 22000) { $osText = $osText.Replace('Windows 10', 'Windows 11') }
  if ($osVersion.Major -lt 10) {
    Add-DoctorResult '失败' 'Windows 版本' ($osText + '，只支持 Windows 10 / 11') '升级系统，或改用 Linux 安装包'
  } elseif (-not [System.Environment]::Is64BitOperatingSystem) {
    Add-DoctorResult '失败' '系统位数' '32 位系统' '换 64 位 Windows'
  } else {
    Add-DoctorResult '通过' 'Windows 版本' ($osText + '，64 位') ''
  }

  if ($script:Root -match '[^\x00-\x7E]') {
    Add-DoctorResult '失败' '安装路径' ($script:Root + ' 含中文/非 ASCII 字符') '把整个文件夹移到纯英文路径（如 C:\xuri）后重新 start.cmd；config/data 一起搬走即可'
  } else {
    Add-DoctorResult '通过' '安装路径' '纯英文路径，MySQL 可以正常启动' ''
  }

  try {
    $drive = New-Object System.IO.DriveInfo([System.IO.Path]::GetPathRoot($script:Root))
    $freeGB = [math]::Round($drive.AvailableFreeSpace / 1GB, 1)
    if ($freeGB -lt 2) {
      Add-DoctorResult '失败' '磁盘空间' ($drive.Name + ' 剩余 ' + $freeGB + ' GB') '清理磁盘，至少留 2 GB'
    } elseif ($freeGB -lt 5) {
      Add-DoctorResult '警告' '磁盘空间' ($drive.Name + ' 剩余 ' + $freeGB + ' GB，建议 5 GB 以上') '清理磁盘'
    } else {
      Add-DoctorResult '通过' '磁盘空间' ($drive.Name + ' 剩余 ' + $freeGB + ' GB') ''
    }
  } catch {
    Add-DoctorResult '警告' '磁盘空间' ('无法读取：' + $_.Exception.Message) ''
  }

  Out-Step '2. 端口'
  foreach ($entry in @(@{ Name = '网站端口'; Port = $port }, @{ Name = 'MySQL 端口'; Port = $dbPort })) {
    $checkPort = [int]$entry.Port
    $owner = Get-ListeningProcessId $checkPort
    if ($owner -le 0) {
      Add-DoctorResult '通过' ([string]$entry.Name) ([string]$checkPort + ' 空闲') ''
      continue
    }
    $ownerName = '未知进程'
    $ownerRecord = Get-ProcessRecord $owner
    if ($ownerRecord -ne $null) { $ownerName = [string]$ownerRecord.Name }
    $isOurs = $false
    if ($entry.Name -eq '网站端口') {
      $appProc = Get-AppProcess
      if ($appProc -ne $null -and (Test-PortOwnedByTrackedProcess $checkPort ([int]$appProc.ProcessId))) { $isOurs = $true }
    } else {
      $mysqlProc = Get-MySqlProcess
      if ($mysqlProc -ne $null -and (Test-PortOwnedByTrackedProcess $checkPort ([int]$mysqlProc.ProcessId))) { $isOurs = $true }
    }
    if ($isOurs) {
      Add-DoctorResult '通过' ([string]$entry.Name) ([string]$checkPort + ' 被本程序占用（PID ' + $owner + '）') ''
    } else {
      Add-DoctorResult '失败' ([string]$entry.Name) ([string]$checkPort + ' 被 ' + $ownerName + '（PID ' + $owner + '）占用') '关闭该程序，或修改 config\app.env 里的端口'
    }
  }

  Out-Step '3. 配置文件'
  if ($configError -ne '') {
    Add-DoctorResult '失败' 'config\app.env' $configError '按提示补齐配置项；必要时备份 data\mysql 后删除 app.env 重新生成'
  } elseif ($config -ne $null) {
    Add-DoctorResult '通过' 'config\app.env' ('端口 ' + $config.Port + '，数据库 ' + $config.DbHost + ':' + $config.DbPort + '/' + $config.DbName) ''
  }
  if (Test-Path -LiteralPath $script:P.RuntimeEnv) {
    Add-DoctorResult '通过' 'config\runtime.env' '存在' ''
  } else {
    Add-DoctorResult '警告' 'config\runtime.env' '不存在（首次 setup 会自动生成）' '运行 setup.cmd --step jre'
  }
  if (Test-SetupDone) {
    Add-DoctorResult '通过' 'config\setup.done' '安装标记存在' ''
  } else {
    Add-DoctorResult '警告' 'config\setup.done' '没有安装完成标记' '运行 setup.cmd 完成安装'
  }

  Out-Step '4. JRE'
  if (Test-Path -LiteralPath $script:P.JavaExe) {
    $java = Get-JavaVersionInfo $script:P.JavaExe
    if ($java.Ok) {
      if (Test-Java8Version $java.Version) {
        Add-DoctorResult '通过' 'JRE' ($java.Version + '（runtime\jre8）') ''
      } else {
        Add-DoctorResult '警告' 'JRE' ($java.Version + '，不是 Java 8') '运行 setup.cmd --force --step jre 重新安装'
      }
    } else {
      Add-DoctorResult '失败' 'JRE' 'java.exe 无法运行' '删除 runtime\jre8，再运行 setup.cmd --step jre'
    }
  } else {
    Add-DoctorResult '失败' 'JRE' 'runtime\jre8\bin\java.exe 不存在' '运行 setup.cmd --step jre'
  }

  Out-Step '5. MySQL'
  if (Test-Path -LiteralPath $script:P.MysqldExe) {
    Add-DoctorResult '通过' 'MySQL 安装' (Get-MySqlVersionText $script:P.MysqldExe) ''
  } else {
    Add-DoctorResult '失败' 'MySQL 安装' 'mysql\bin\mysqld.exe 不存在' '运行 setup.cmd --step mysql'
  }
  if (Test-Path -LiteralPath (Join-Path $script:P.DataMysql 'mysql')) {
    Add-DoctorResult '通过' 'MySQL 数据目录' ('data\mysql（' + (Get-DirectorySizeMB $script:P.DataMysql) + ' MB）') ''
  } else {
    Add-DoctorResult '失败' 'MySQL 数据目录' 'data\mysql 尚未初始化' '运行 setup.cmd --step mysql'
  }
  $mysqlProcess = Get-MySqlProcess
  if ($mysqlProcess -ne $null) {
    Add-DoctorResult '通过' 'MySQL 进程' ('运行中（PID ' + $mysqlProcess.ProcessId + '）') ''
  } else {
    Add-DoctorResult '失败' 'MySQL 进程' '未运行' '运行 setup.cmd --step db，或 doctor.cmd --fix'
    [void]$fixActions.Add('mysql')
  }

  Out-Step '6. 数据库'
  if ($config -eq $null) {
    Add-DoctorResult '警告' '数据库连接' '配置不可用，跳过检查' '先修复 config\app.env'
  } elseif ($mysqlProcess -eq $null) {
    Add-DoctorResult '警告' '数据库连接' 'MySQL 未运行，跳过检查' '运行 setup.cmd --step db，或 doctor.cmd --fix'
  } elseif (-not (Test-MySqlLogin 'root' $config.DbRootPassword)) {
    Add-DoctorResult '失败' 'root 登录' 'DB_ROOT_PASSWORD 与数据库不一致' '若 data\mysql 可以重建，删除后运行 setup.cmd --step db；否则手工找回口令'
  } else {
    Add-DoctorResult '通过' 'root 登录' ('127.0.0.1:' + $dbPort) ''
    $tableCount = Get-TableCount 'root' $config.DbRootPassword
    if ($tableCount -gt 0) {
      Add-DoctorResult '通过' '数据表' ([string]$tableCount + ' 张表') ''
    } else {
      Add-DoctorResult '失败' '数据表' '库里没有表' '运行 setup.cmd --step db 导入初始化脚本'
      [void]$fixActions.Add('db')
    }
    if (-not (Test-MySqlLogin $config.DbUser $config.DbPassword)) {
      Add-DoctorResult '失败' '应用账号' ([string]$config.DbUser + ' 无法登录') 'doctor.cmd --fix 会按 config\app.env 重置账号口令'
      [void]$fixActions.Add('db')
    } else {
      Add-DoctorResult '通过' '应用账号' ([string]$config.DbUser + ' 可登录') ''
      if ($tableCount -gt 0) {
        $userRows = Get-UserRowCount $config.DbUser $config.DbPassword
        if ($userRows -gt 0) {
          Add-DoctorResult '通过' 't_user 数据' ([string]$userRows + ' 行') ''
        } else {
          Add-DoctorResult '失败' 't_user 数据' '0 行' '运行 setup.cmd --step db'
          [void]$fixActions.Add('db')
        }
      }
    }
  }

  Out-Step '7. 应用'
  $appProcess = Get-AppProcess
  if ($appProcess -eq $null) {
    Add-DoctorResult '警告' '应用进程' '未运行' '运行 start.cmd 启动（或 doctor.cmd --fix）'
    [void]$fixActions.Add('app')
  } else {
    Add-DoctorResult '通过' '应用进程' ('运行中（PID ' + $appProcess.ProcessId + '）') ''
    $probe = Invoke-HttpProbe ((Get-AppUrl $port) + '/api/system') 5
    if ($probe.Ok -and $probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
      Add-DoctorResult '通过' '应用健康' ('/api/system 返回 ' + $probe.StatusCode) ''
    } else {
      Add-DoctorResult '失败' '应用健康' ('/api/system 无响应或返回 ' + $probe.StatusCode) '查看 logs 下最新 app-*.err.log；必要时 stop.cmd 后 start.cmd'
      [void]$fixActions.Add('app')
    }
    $homePage = Invoke-HttpProbe ((Get-AppUrl $port) + '/') 5
    if ($homePage.Ok -and $homePage.StatusCode -eq 200 -and $homePage.Body -match '(?i)(id="root"|<!doctype html)') {
      Add-DoctorResult '通过' '首页 HTML' '可访问' ''
    } else {
      Add-DoctorResult '警告' '首页 HTML' ('返回 ' + $homePage.StatusCode + '，可能 jar 未内嵌前端') '用 -PwithSpa 重新打包 jar'
    }
  }

  Out-Step '8. 防火墙与网络'
  if ($script:Opts.NoFirewall) {
    Add-DoctorResult '警告' '防火墙规则' '本次跳过（--no-firewall）' ''
  } elseif ((Get-FirewallRule $port) -ne $null) {
    Add-DoctorResult '通过' '防火墙规则' ('xuri-classroom-' + $port) ''
  } else {
    Add-DoctorResult '警告' '防火墙规则' ('没有 TCP ' + $port + ' 的入站规则') 'doctor.cmd --fix 会自动添加（会弹 UAC）；否则局域网可能访问不了'
    [void]$fixActions.Add('firewall')
  }
  $addresses = @(Get-LanAddresses)
  if ($addresses.Count -gt 0) {
    Add-DoctorResult '通过' '局域网地址' (($addresses | ForEach-Object { 'http://' + $_ + ':' + $port }) -join '，') ''
  } else {
    Add-DoctorResult '警告' '局域网地址' '未检测到可用网卡' '检查网络连接'
  }

  Out-Step '9. 缓存与日志'
  $zips = @(Get-ChildItem -LiteralPath $script:P.Cache -File -Filter '*.zip' -ErrorAction SilentlyContinue)
  if ($zips.Count -gt 0) {
    $totalMB = [math]::Round((($zips | Measure-Object -Property Length -Sum).Sum) / 1MB, 1)
    Add-DoctorResult '通过' '下载缓存' ([string]$zips.Count + ' 个压缩包，共 ' + $totalMB + ' MB') ''
    foreach ($zip in $zips) {
      Out-Bullet ('cache\' + $zip.Name + '    ' + [math]::Round($zip.Length / 1MB, 1) + ' MB')
    }
  } else {
    Add-DoctorResult '警告' '下载缓存' 'cache 目录为空' '首次 setup 会自动下载'
  }
  try {
    Ensure-Directory $script:P.Logs
    $probeFile = Join-Path $script:P.Logs ('.write-test-' + (Get-Timestamp))
    Write-TextFile $probeFile @('ok')
    Remove-Item -LiteralPath $probeFile -Force -ErrorAction SilentlyContinue
    Add-DoctorResult '通过' '日志目录' ($script:P.Logs + ' 可写') ''
  } catch {
    Add-DoctorResult '失败' '日志目录' ('不可写：' + $_.Exception.Message) '把整个文件夹移到可写目录（不要放 Program Files）'
  }

  if ($script:Opts.Fix) {
    Out-Step '自动修复（--fix）'
    if ($fixActions.Count -eq 0) {
      Out-Info '没有需要自动修复的项'
    } else {
      $uniqueActions = @($fixActions | Select-Object -Unique)
      foreach ($action in $uniqueActions) {
        switch ($action) {
          'mysql' {
            try { Start-MySqlServer } catch { Out-Warn ('启动 MySQL 失败：' + $_.Exception.Message) }
          }
          'db' {
            try { Start-MySqlServer; Ensure-DatabaseSchema } catch { Out-Warn ('修复数据库失败：' + $_.Exception.Message) }
          }
          'app' {
            try { Ensure-AppStarted } catch { Out-Warn ('启动应用失败：' + $_.Exception.Message) }
          }
          'firewall' {
            try { Ensure-FirewallRule $port | Out-Null } catch { Out-Warn ('添加防火墙规则失败：' + $_.Exception.Message) }
          }
        }
      }
      Out-Info '修复动作已执行，下面自动复查一次（复查只读，不会再改动任何东西）。'
      # 复查：关闭 --fix 再跑一遍，让最终退出码反映修复后的真实状态
      $script:Opts.Fix = $false
      return (Invoke-DoctorCommand)
    }
  }

  Out-Step '检查结果'
  Out-Line ('  通过 ' + $script:CheckPass + ' 项，警告 ' + $script:CheckWarn + ' 项，失败 ' + $script:CheckFail + ' 项。')
  if (-not $script:DryRun) { Out-Line ('  报告：' + $script:LogPath) }
  if ($script:CheckFail -gt 0) {
    Out-Line '  先按上面的“失败”项处理；需要自动修复可运行 doctor.cmd --fix。'
    return 1
  }
  Out-Line '  没有发现致命问题。'
  return 0
}

# ===========================================================================
# 15. 失败诊断
# ===========================================================================

function Get-StepDiagnostics([string]$StepKey) {
  switch ($StepKey) {
    'env' {
      return @{
        Title = '环境检查'
        Causes = @(
          '系统不是 64 位 Windows 10/11（Win7、Win8、32 位系统不支持）',
          '包放在只读或受控目录（Program Files、共享盘、OneDrive/坚果云同步目录）',
          '安装盘剩余空间不足 2GB，或 8080 / 3307 端口被别的程序占用'
        )
        NextAction = '把整个文件夹移到 C:\xuri 这类本机可写、纯英文的目录；关掉占用端口的程序，或改 config\app.env 里的端口，然后重新运行 setup.cmd。'
      }
    }
    'jre' {
      return @{
        Title = 'JRE 运行时'
        Causes = @(
          '网络不通或镜像不可达（学校网络只放行 80/443，或需要代理）',
          '杀毒软件拦截了下载或解压（把包目录加入白名单）',
          'cache 里的 zip 不完整（删除 cache 里对应的 zip 后重试）'
        )
        NextAction = '确认能打开 config\runtime.env 里的下载地址；也可以手动下载后放到 cache 目录，再运行 setup.cmd --offline --step jre。'
      }
    }
    'mysql' {
      return @{
        Title = 'MySQL 下载与初始化'
        Causes = @(
          '网络不通或镜像不可达（setup 会自动换下一个源，全失败就是网络问题）',
          '包路径含中文/空格导致解压或 mysqld 初始化失败（换到 C:\xuri）',
          '磁盘空间不足，或 data\mysql 是上次中断留下的残目录'
        )
        NextAction = '先看 cache 里是否已有 zip（可 --offline 复用）；确认要重建时删除 data\mysql 和 mysql 目录，再运行 setup.cmd --step mysql。'
      }
    }
    'db' {
      return @{
        Title = 'MySQL 启动与数据库初始化'
        Causes = @(
          '3307 端口被别的 MySQL 占用，或 DB_PORT 与 MYSQL_PORT 不一致',
          'config\app.env 的 DB_ROOT_PASSWORD 与实际 data\mysql 不一致',
          'data\mysql 是别的机器复制来的，或初始化被中断过'
        )
        NextAction = '运行 doctor.cmd 看具体失败项；确认可以丢数据时删除 data\mysql 后重跑 setup.cmd --step db。'
      }
    }
    'app' {
      return @{
        Title = '启动应用'
        Causes = @(
          'app 目录里没有 jar，或 jar 不完整（重新解压发布包）',
          '网站端口被别的程序占用（另一个旧实例、别的网站），或数据库还没就绪',
          '机器内存太小（把 config\app.env 的 JAVA_OPTS 改成 -Xmx768m）'
        )
        NextAction = '看 logs 目录下最新的 app-*.err.log 末尾；改完配置后 stop.cmd 再 start.cmd。'
      }
    }
  }
  return @{
    Title = '运行'
    Causes = @(
      '发布包不完整（缺文件）或被解压工具改动过',
      '目录不可写，或被杀毒软件拦截',
      'Windows 版本 / 位数不满足要求'
    )
    NextAction = '运行 doctor.cmd 查看逐项检查结果，并把 logs 目录里的日志发给维护人员。'
  }
}

function Show-FailureBlock {
  param(
    [string]$Title,
    [string]$Message,
    [string[]]$Causes,
    [string]$NextAction,
    [string]$LogPath
  )
  $bar = '============================================================'
  Write-Host ''
  Write-Host $bar -ForegroundColor Red
  Write-Host ('  失败：' + $Title) -ForegroundColor Red
  Write-Host $bar -ForegroundColor Red
  Write-Host ('  原始错误：' + $Message) -ForegroundColor White
  Write-Host ''
  Write-Host '  最常见的 3 个原因：' -ForegroundColor Yellow
  $index = 0
  foreach ($cause in $Causes) {
    $index++
    Write-Host ('    ' + $index + '. ' + $cause)
  }
  Write-Host ''
  Write-Host ('  下一步：' + $NextAction) -ForegroundColor Cyan
  if (-not [string]::IsNullOrWhiteSpace($LogPath)) { Write-Host ('  日志：' + $LogPath) }
  Write-Host '  体检：运行 doctor.cmd（会输出逐项检查报告）'
  Write-Host $bar -ForegroundColor Red
  Write-Host ''

  Add-LogText ''
  Add-LogText $bar
  Add-LogText ('  失败：' + $Title)
  Add-LogText ('  原始错误：' + $Message)
  $index = 0
  foreach ($cause in $Causes) {
    $index++
    Add-LogText ('    ' + $index + '. ' + $cause)
  }
  Add-LogText ('  下一步：' + $NextAction)
  if (-not [string]::IsNullOrWhiteSpace($LogPath)) { Add-LogText ('  日志：' + $LogPath) }
  Add-LogText $bar
}

# ===========================================================================
# 16. 主入口
# ===========================================================================

$script:RawArgs = @()
if ($null -ne $args) { $script:RawArgs = @($args) }

try {
  $script:Opts = Parse-CommandLine $script:RawArgs
} catch {
  Write-Host ''
  Write-Host ('[参数错误] ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host '运行 setup.cmd --help 查看用法。' -ForegroundColor Yellow
  exit 2
}

$script:DryRun = [bool]$script:Opts.WhatIf
if ($script:Opts.Help) {
  Show-Usage
  exit 0
}
if ($script:Opts.ShowVersion) {
  Write-Host (Get-PackageVersion)
  exit 0
}

$exitCode = 0
try {
  switch ($script:Opts.Command) {
    'start' { $exitCode = Invoke-StartCommand }
    'stop' { $exitCode = Invoke-StopCommand }
    'status' { $exitCode = Invoke-StatusCommand }
    'setup' { $exitCode = Invoke-SetupCommand }
    'doctor' { $exitCode = Invoke-DoctorCommand }
    'init-db' {
      $script:Opts.Step = @('db')
      $exitCode = Invoke-SetupCommand
    }
    'help' { Show-Usage; $exitCode = 0 }
    'version' { Write-Host (Get-PackageVersion); $exitCode = 0 }
    default { Show-Usage; $exitCode = 2 }
  }
} catch {
  Show-FailureBlock -Title '运行失败' -Message ([string]$_.Exception.Message) -Causes @(
    '发布包不完整（缺文件）或被解压工具改动过',
    'Windows 权限限制（例如放在 Program Files 或受控目录）',
    '磁盘空间不足，或文件被杀毒软件锁定'
  ) -NextAction '运行 doctor.cmd 查看逐项检查；把 logs 目录里的日志发给维护人员。' -LogPath $script:LogPath
  $exitCode = 1
}

if ($null -eq $exitCode) { $exitCode = 0 }
exit ([int]$exitCode)
