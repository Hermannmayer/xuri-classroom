param([string]$Base = 'http://192.168.0.2:201')
$sys = Invoke-RestMethod -Uri "$Base/api/system" -TimeoutSec 20
$rsa = [System.Security.Cryptography.RSA]::Create(); $read = 0
$rsa.ImportSubjectPublicKeyInfo([Convert]::FromBase64String($sys.data.publicKey), [ref]$read)
$pwd = [Convert]::ToBase64String($rsa.Encrypt([Text.Encoding]::UTF8.GetBytes('123456'), [System.Security.Cryptography.RSAEncryptionPadding]::Pkcs1))
$null = Invoke-WebRequest -Uri "$Base/api/public/login" -Method Post -Body (@{username='admin';password=$pwd}|ConvertTo-Json -Compress) -ContentType 'application/json' -UseBasicParsing -SessionVariable sess -TimeoutSec 30

$ver = Invoke-RestMethod -Uri "$Base/api/system/version" -TimeoutSec 20
Write-Output ('VERSION ' + $ver.data.version + ' / schema ' + $ver.data.schemaVersion + ' / ' + $ver.data.schemaStatus)

$ret = Invoke-RestMethod -Uri "$Base/api/system/audit/retention" -WebSession $sess -TimeoutSec 20
Write-Output ('RETENTION ' + ($ret | ConvertTo-Json -Compress))

# 安全下限：只留 3 天必须被拒（并且不应该删任何东西）
$r = Invoke-WebRequest -Uri "$Base/api/system/audit/clean" -Method Post -Body '{"beforeDays":3}' -ContentType 'application/json' -WebSession $sess -SkipHttpErrorCheck -TimeoutSec 30
Write-Output ('CLEAN 3天 -> ' + $r.StatusCode + ' ' + $r.Content.Substring(0,[Math]::Min(160,$r.Content.Length)))

# 正常清理：保留 180 天（生产日志还不满 180 天，预期删 0 条）
$r2 = Invoke-WebRequest -Uri "$Base/api/system/audit/clean" -Method Post -Body '{"beforeDays":180}' -ContentType 'application/json' -WebSession $sess -SkipHttpErrorCheck -TimeoutSec 60
Write-Output ('CLEAN 180天 -> ' + $r2.StatusCode + ' ' + $r2.Content.Substring(0,[Math]::Min(120,$r2.Content.Length)))
