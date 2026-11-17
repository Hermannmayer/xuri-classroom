$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:7007'
$sys = Invoke-RestMethod -Uri "$base/api/system" -TimeoutSec 20
$pk = $sys.data.publicKey
$rsa = [System.Security.Cryptography.RSA]::Create()
$read = 0
$rsa.ImportSubjectPublicKeyInfo([Convert]::FromBase64String($pk), [ref]$read)
$enc = $rsa.Encrypt([Text.Encoding]::UTF8.GetBytes('123456'), [System.Security.Cryptography.RSAEncryptionPadding]::Pkcs1)
$pwd = [Convert]::ToBase64String($enc)
$body = @{ username = 'admin'; password = $pwd } | ConvertTo-Json -Compress
try {
  $resp = Invoke-WebRequest -Uri "$base/api/public/login" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -SessionVariable sess -TimeoutSec 30
  Write-Output ('LOGIN HTTP ' + $resp.StatusCode)
  Write-Output ('BODY ' + $resp.Content.Substring(0, [Math]::Min(300, $resp.Content.Length)))
  Write-Output ('COOKIES ' + (($sess.Cookies.GetCookies($base) | ForEach-Object { $_.Name }) -join ','))
  $p = Invoke-WebRequest -Uri "$base/api/project/list?current=1&pageSize=5" -UseBasicParsing -WebSession $sess -TimeoutSec 20
  Write-Output ('PROJECT LIST HTTP ' + $p.StatusCode + ' :: ' + $p.Content.Substring(0, [Math]::Min(200, $p.Content.Length)))
  $n = Invoke-WebRequest -Uri "$base/api/notice/unread-count" -UseBasicParsing -WebSession $sess -TimeoutSec 20
  Write-Output ('NOTICE UNREAD HTTP ' + $n.StatusCode + ' :: ' + $n.Content.Substring(0, [Math]::Min(160, $n.Content.Length)))
} catch {
  Write-Output ('ERR ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output ('ERBODY ' + $sr.ReadToEnd().Substring(0, 300))
  }
}
