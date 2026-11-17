# 本地/线上两用的接口级冒烟：验证「能登录 + 能拿数据 + 验证码可用」这条主链路。
# 与 scripts/nas/smoke-test.py 的区别：那个是发布脚本的守门，这个是开发期自测，PowerShell 起手即可。
#
# 用法：
#   pwsh scripts/dev/smoke-newstack.ps1                                   # 本地 7007
#   pwsh scripts/dev/smoke-newstack.ps1 -Base http://192.168.0.2:201 -User admin -Password 123456
param(
  [string]$Base = 'http://127.0.0.1:7007',
  [string]$User = 'admin',
  [string]$Password = '123456'
)

$ErrorActionPreference = 'Stop'
$sys = Invoke-RestMethod -Uri "$Base/api/system" -TimeoutSec 20
$rsa = [System.Security.Cryptography.RSA]::Create()
$read = 0
$rsa.ImportSubjectPublicKeyInfo([Convert]::FromBase64String($sys.data.publicKey), [ref]$read)
$enc = $rsa.Encrypt([Text.Encoding]::UTF8.GetBytes($Password), [System.Security.Cryptography.RSAEncryptionPadding]::Pkcs1)
$body = @{ username = $User; password = [Convert]::ToBase64String($enc) } | ConvertTo-Json -Compress

$ver = Invoke-RestMethod -Uri "$Base/api/system/version" -TimeoutSec 20
Write-Output ("VERSION " + $ver.data.version + " / schema " + $ver.data.schemaVersion + " / " + $ver.data.schemaStatus)

$resp = Invoke-WebRequest -Uri "$Base/api/public/login" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -SessionVariable sess -TimeoutSec 30
Write-Output ("LOGIN " + $resp.StatusCode + " " + $resp.Content)

foreach ($p in @('/api/project/list?current=1&pageSize=3', '/api/notice/unread-count')) {
  try {
    $r = Invoke-WebRequest -Uri ($Base + $p) -UseBasicParsing -WebSession $sess -TimeoutSec 25
    Write-Output ($p + ' -> ' + $r.StatusCode + ' ' + $r.Content.Substring(0, [Math]::Min(120, $r.Content.Length)))
  }
  catch { Write-Output ($p + ' -> ERR ' + $_.Exception.Message) }
}

$cg = Invoke-WebRequest -Uri "$Base/captcha/get" -Method Post -Body (@{ captchaType = 'blockPuzzle'; clientUid = 'slider-smoke' } | ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing -TimeoutSec 25
$cd = ($cg.Content | ConvertFrom-Json).data
Write-Output ("CAPTCHA repCode=" + $cd.repCode + " token=" + [bool]$cd.repData.token + " img=" + ($cd.repData.originalImageBase64.Length) + "B")
