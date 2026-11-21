# 旭日云课堂 · Windows 本地服务控制台（GUI）
param([switch]$Hidden, [string]$SelfTest)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:Launcher = Join-Path $script:Root 'lib\launcher.ps1'
$script:Snapshot = $null
$script:Busy = $false

$COLOR_BG      = [System.Drawing.Color]::FromArgb(245, 247, 250)
$COLOR_CARD    = [System.Drawing.Color]::White
$COLOR_TEXT    = [System.Drawing.Color]::FromArgb(30, 58, 95)
$COLOR_SOFT    = [System.Drawing.Color]::FromArgb(100, 116, 139)
$COLOR_OK      = [System.Drawing.Color]::FromArgb(22, 163, 74)
$COLOR_WARN    = [System.Drawing.Color]::FromArgb(245, 158, 11)
$COLOR_ERR     = [System.Drawing.Color]::FromArgb(220, 38, 38)
$COLOR_PRIMARY = [System.Drawing.Color]::FromArgb(30, 58, 95)

function Get-Snapshot {
  if (-not (Test-Path -LiteralPath $script:Launcher)) { return $null }
  try {
    $raw = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:Launcher status -Json 2>$null)
  } catch { return $null }
  $jsonLines = @($raw | Where-Object { $_ -and ([string]$_).TrimStart().StartsWith("{") })
  if ($jsonLines.Count -eq 0) { return $null }
  try { return ($jsonLines[$jsonLines.Count - 1] | ConvertFrom-Json) } catch { return $null }
}

function Add-LogLine([string]$text) {
  if ($script:LogBox -eq $null) { return }
  if ($script:LogBox.InvokeRequired) {
    $script:LogBox.Invoke([Action[string]]{ param($t) Add-LogLine $t }, $text)
    return
  }
  $stamp = (Get-Date).ToString("HH:mm:ss")
  $script:LogBox.AppendText("[" + $stamp + "] " + $text + "`r`n")
  $script:LogBox.SelectionStart = $script:LogBox.Text.Length
  $script:LogBox.ScrollToCaret()
}

function Invoke-Launcher([string]$Command, [string[]]$ExtraArgs = @()) {
  if ($script:Busy) { Add-LogLine "上一个操作还没结束，请稍候"; return }
  if (-not (Test-Path -LiteralPath $script:Launcher)) { Add-LogLine "找不到 lib\launcher.ps1，发布包不完整"; return }
  $script:Busy = $true
  $script:BtnStart.Enabled = $false
  $script:BtnStop.Enabled = $false
  $script:BtnRestart.Enabled = $false
  try {
    $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $script:Launcher, $Command)
    foreach ($a in $ExtraArgs) { $argList += $a }
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = ($argList | ForEach-Object { if ($_ -match "\s") { "`"" + $_ + "`"" } else { $_ } }) -join " "
    $psi.WorkingDirectory = $script:Root
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $null = $proc.Start()
    $handle = { param($sender, $e) if ($e.Data) { Add-LogLine $e.Data } }
    $proc.add_OutputDataReceived($handle)
    $proc.add_ErrorDataReceived($handle)
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()
    while (-not $proc.HasExited) {
      [System.Windows.Forms.Application]::DoEvents()
      Start-Sleep -Milliseconds 120
    }
    Add-LogLine ("← " + $Command + " 结束（退出码 " + $proc.ExitCode + "）")
  } catch {
    Add-LogLine ("执行失败：" + $_.Exception.Message)
  } finally {
    $script:Busy = $false
    Update-Status
  }
}

function Format-StatusText($snap) {
  if ($snap -eq $null) { return "无法读取状态" }
  if (-not $snap.setupDone) { return "未安装" }
  if ($snap.running -and $snap.healthy) { return "运行中" }
  if ($snap.running) { return "启动中 / 无响应" }
  return "已停止"
}

function Update-Status {
  $snap = Get-Snapshot
  $script:Snapshot = $snap
  if ($snap -eq $null) {
    $script:LblStatus.Text = "● 无法读取状态"
    $script:LblStatus.ForeColor = $COLOR_ERR
    return
  }
  $text = Format-StatusText $snap
  $script:LblStatus.Text = "● " + $text
  if ($text -eq "运行中") { $script:LblStatus.ForeColor = $COLOR_OK }
  elseif ($text -eq "未安装") { $script:LblStatus.ForeColor = $COLOR_WARN }
  elseif ($text -eq "已停止") { $script:LblStatus.ForeColor = $COLOR_SOFT }
  else { $script:LblStatus.ForeColor = $COLOR_WARN }
  $script:LblVersion.Text = "v" + [string]$snap.version
  $script:LblLocal.Text = [string]$snap.url
  $lan = ""
  if ($snap.lan -and @($snap.lan).Count -gt 0) { $lan = [string](@($snap.lan)[0]) }
  $script:LblLan.Text = $(if ($lan) { $lan } else { "（无局域网地址）" })
  $script:LblDir.Text = "数据目录：" + [string]$snap.root
  $script:LblDb.Text = "MySQL：" + $(if ($snap.mysqlRunning) { "运行中" } else { "未运行" }) + "　端口 " + [string]$snap.port + " / " + [string]$snap.dbPort
  $running = [bool]$snap.running
  $script:BtnStart.Enabled = -not $running -and -not $script:Busy
  $script:BtnStop.Enabled = $running -and -not $script:Busy
  $script:BtnRestart.Enabled = $running -and -not $script:Busy
  $script:BtnBrowser.Enabled = ($snap.url -ne $null)
}


$form = New-Object System.Windows.Forms.Form
$form.Text = "旭日云课堂 · 本地服务"
$form.ClientSize = New-Object System.Drawing.Size(820, 640)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = $COLOR_BG
$form.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 9)

$script:LblStatus = New-Object System.Windows.Forms.Label
$script:LblStatus.Text = "● 正在读取…"
$script:LblStatus.AutoSize = $true
$script:LblStatus.Location = New-Object System.Drawing.Point(20, 18)
$script:LblStatus.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($script:LblStatus)

$script:LblVersion = New-Object System.Windows.Forms.Label
$script:LblVersion.Text = "v-"
$script:LblVersion.AutoSize = $true
$script:LblVersion.Location = New-Object System.Drawing.Point(150, 22)
$script:LblVersion.ForeColor = $COLOR_SOFT
$form.Controls.Add($script:LblVersion)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "旭日云课堂 · Windows 本地服务"
$lblTitle.AutoSize = $true
$lblTitle.Location = New-Object System.Drawing.Point(20, 46)
$lblTitle.ForeColor = $COLOR_SOFT
$form.Controls.Add($lblTitle)


$card = New-Object System.Windows.Forms.Panel
$card.Location = New-Object System.Drawing.Point(18, 78)
$card.Size = New-Object System.Drawing.Size(784, 92)
$card.BackColor = $COLOR_CARD
$form.Controls.Add($card)

$lblLocalCap = New-Object System.Windows.Forms.Label
$lblLocalCap.Text = "本机访问";
$lblLocalCap.AutoSize = $true; $lblLocalCap.Location = New-Object System.Drawing.Point(14, 14)
$lblLocalCap.ForeColor = $COLOR_SOFT
$card.Controls.Add($lblLocalCap)

$script:LblLocal = New-Object System.Windows.Forms.Label
$script:LblLocal.Text = "-"; $script:LblLocal.AutoSize = $true
$script:LblLocal.Location = New-Object System.Drawing.Point(90, 14)
$script:LblLocal.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$script:LblLocal.ForeColor = $COLOR_PRIMARY
$card.Controls.Add($script:LblLocal)

$btnCopyLocal = New-Object System.Windows.Forms.Button
$btnCopyLocal.Text = "复制"; $btnCopyLocal.Size = New-Object System.Drawing.Size(56, 24)
$btnCopyLocal.Location = New-Object System.Drawing.Point(636, 11)
$btnCopyLocal.FlatStyle = "System"
$btnCopyLocal.Add_Click({ if ($script:Snapshot) { [System.Windows.Forms.Clipboard]::SetText([string]$script:Snapshot.url); Add-LogLine ("已复制：" + $script:Snapshot.url) } })
$card.Controls.Add($btnCopyLocal)

$btnOpenLocal = New-Object System.Windows.Forms.Button
$btnOpenLocal.Text = "打开"; $btnOpenLocal.Size = New-Object System.Drawing.Size(56, 24)
$btnOpenLocal.Location = New-Object System.Drawing.Point(700, 11)
$btnOpenLocal.Add_Click({ if ($script:Snapshot) { Start-Process ([string]$script:Snapshot.url) } })
$card.Controls.Add($btnOpenLocal)

$lblLanCap = New-Object System.Windows.Forms.Label
$lblLanCap.Text = "局域网"; $lblLanCap.AutoSize = $true
$lblLanCap.Location = New-Object System.Drawing.Point(14, 52)
$lblLanCap.ForeColor = $COLOR_SOFT
$card.Controls.Add($lblLanCap)

$script:LblLan = New-Object System.Windows.Forms.Label
$script:LblLan.Text = "-"; $script:LblLan.AutoSize = $true
$script:LblLan.Location = New-Object System.Drawing.Point(90, 52)
$script:LblLan.Font = New-Object System.Drawing.Font("Consolas", 9)
$script:LblLan.ForeColor = $COLOR_TEXT
$card.Controls.Add($script:LblLan)

$btnCopyLan = New-Object System.Windows.Forms.Button
$btnCopyLan.Text = "复制"; $btnCopyLan.Size = New-Object System.Drawing.Size(56, 24)
$btnCopyLan.Location = New-Object System.Drawing.Point(636, 49)
$btnCopyLan.Add_Click({ if ($script:Snapshot -and $script:Snapshot.lan -and @($script:Snapshot.lan).Count -gt 0) { $v = [string](@($script:Snapshot.lan)[0]); [System.Windows.Forms.Clipboard]::SetText($v); Add-LogLine ("已复制：" + $v) } })
$card.Controls.Add($btnCopyLan)

# 按钮区
function New-Btn([string]$text, [int]$x, [int]$y, [int]$w = 108) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $text; $b.Size = New-Object System.Drawing.Size($w, 34)
  $b.Location = New-Object System.Drawing.Point($x, $y)
  $b.FlatStyle = "System"
  $form.Controls.Add($b); return $b
}

$script:BtnStart   = New-Btn "启动" 18 186
$script:BtnStop    = New-Btn "停止" 132 186
$script:BtnRestart = New-Btn "重启" 246 186
$script:BtnBrowser = New-Btn "浏览器打开" 360 186 120
$btnRefresh        = New-Btn "刷新状态" 486 186 100

$btnDiag = New-Btn "复制诊断信息" 18 228 140
$btnOpenDir = New-Btn "打开数据目录" 164 228 130
$btnDoctor = New-Btn "体检（doctor）" 300 228 130
$btnLogDir = New-Btn "打开日志目录" 436 228 130

$script:BtnStart.Add_Click({ Invoke-Launcher "start" @("--yes") })
$script:BtnStop.Add_Click({ Invoke-Launcher "stop" @("--yes") })
$script:BtnRestart.Add_Click({ Invoke-Launcher "stop" @("--yes"); Invoke-Launcher "start" @("--yes") })
$script:BtnBrowser.Add_Click({ if ($script:Snapshot) { Start-Process ([string]$script:Snapshot.url) } })
$btnRefresh.Add_Click({ Update-Status; Add-LogLine "状态已刷新" })
$btnOpenDir.Add_Click({ if ($script:Snapshot) { Start-Process explorer.exe ([string]$script:Snapshot.root) } })
$btnLogDir.Add_Click({ if ($script:Snapshot) { Start-Process explorer.exe ([string]$script:Snapshot.logsDir) } })
$btnDoctor.Add_Click({ Invoke-Launcher "doctor" @("--yes") })
$btnDiag.Add_Click({
  $snap = $script:Snapshot
  $lines = @();
  $lines += "旭日云课堂 诊断信息"
  $lines += "时间：" + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  if ($snap) {
    $lines += "版本：" + $snap.version + "　状态：" + (Format-StatusText $snap)
    $lines += "目录：" + $snap.root
    $lines += "本机：" + $snap.url + "　端口：" + $snap.port + "/" + $snap.dbPort
    $lines += "缺失组件：" + $(if (@($snap.missing).Count -gt 0) { (@($snap.missing) -join "、") } else { "无" })
  }
  $lines += "--- 最近日志 ---"
  $lines += ($script:LogBox.Text -split "`r`n" | Select-Object -Last 20)
  [System.Windows.Forms.Clipboard]::SetText(($lines -join "`r`n"))
  Add-LogLine "诊断信息已复制到剪贴板，可直接粘贴给管理员"
})


$script:LogBox = New-Object System.Windows.Forms.TextBox
$script:LogBox.Multiline = $true
$script:LogBox.ReadOnly = $true
$script:LogBox.ScrollBars = "Vertical"
$script:LogBox.Location = New-Object System.Drawing.Point(18, 276)
$script:LogBox.Size = New-Object System.Drawing.Size(784, 300)
$script:LogBox.BackColor = [System.Drawing.Color]::White
$script:LogBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($script:LogBox)

$script:LblDb = New-Object System.Windows.Forms.Label
$script:LblDb.Text = "MySQL：-"; $script:LblDb.AutoSize = $true
$script:LblDb.Location = New-Object System.Drawing.Point(20, 586)
$script:LblDb.ForeColor = $COLOR_SOFT
$form.Controls.Add($script:LblDb)

$script:LblDir = New-Object System.Windows.Forms.Label
$script:LblDir.Text = "数据目录：-"; $script:LblDir.AutoSize = $true
$script:LblDir.Location = New-Object System.Drawing.Point(20, 610)
$script:LblDir.ForeColor = $COLOR_SOFT
$form.Controls.Add($script:LblDir)


$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({ if (-not $script:Busy) { Update-Status } })
$timer.Start()

$form.Add_Shown({
  if ($SelfTest) {

    $script:SelfTestTimer = New-Object System.Windows.Forms.Timer
    $script:SelfTestTimer.Interval = 2500
    $script:SelfTestTimer.Add_Tick({
      $script:SelfTestTimer.Stop()
      try {
        $bmp = New-Object System.Drawing.Bitmap($form.Width, $form.Height)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $form.Width, $form.Height)
        $form.DrawToBitmap($bmp, $rect)
        $bmp.Save($SelfTest, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
      } catch {
        [Console]::Error.WriteLine("selftest failed: " + $_.Exception.Message)
      }
      $form.Close()
    })
    $script:SelfTestTimer.Start()
  }
  Add-LogLine "控制台已启动；所有操作仍由 lib\launcher.ps1 执行"
  Update-Status
  if ($script:Snapshot) {
    if (-not $script:Snapshot.setupDone) { Add-LogLine "还没安装：点「启动」会自动进入引导安装（首次约 300MB 下载）" }
    elseif ($script:Snapshot.running) { Add-LogLine "服务已在运行：" + $script:Snapshot.url }
  }
})

$form.Add_FormClosed({ $timer.Stop() })

if ($Hidden) {
  $form.WindowState = "Minimized"
  $form.ShowInTaskbar = $false
}

[void]$form.ShowDialog()