param([string]$Base = 'http://192.168.0.2:201', [string]$User = 'admin', [string]$Password = '123456')
$ErrorActionPreference = 'Stop'
$sys = Invoke-RestMethod -Uri "$Base/api/system" -TimeoutSec 20
$rsa = [System.Security.Cryptography.RSA]::Create(); $read = 0
$rsa.ImportSubjectPublicKeyInfo([Convert]::FromBase64String($sys.data.publicKey), [ref]$read)
$pwd = [Convert]::ToBase64String($rsa.Encrypt([Text.Encoding]::UTF8.GetBytes($Password), [System.Security.Cryptography.RSAEncryptionPadding]::Pkcs1))
$null = Invoke-WebRequest -Uri "$Base/api/public/login" -Method Post -Body (@{username=$User;password=$pwd}|ConvertTo-Json -Compress) -ContentType 'application/json' -UseBasicParsing -SessionVariable sess -TimeoutSec 30

$name = 'smoke-' + (Get-Date -Format 'HHmmss')
$created = Invoke-RestMethod -Uri "$Base/api/system/api-token" -Method Post -Body (@{name=$name;expiresAt=$null}|ConvertTo-Json -Compress) -ContentType 'application/json' -WebSession $sess -TimeoutSec 30
$token = $created.data.token
Write-Output ('TOKEN_CREATED name=' + $name + ' prefix=' + $token.Substring(0,6) + '... len=' + $token.Length)

$h = @{ Authorization = 'Bearer ' + $token }
$list = Invoke-RestMethod -Uri "$Base/mcp" -Method Post -Headers $h -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' -TimeoutSec 40
$names = ($list.result.tools | ForEach-Object { $_.name }) -join ','
Write-Output ('TOOLS_LIST count=' + $list.result.tools.Count + ' -> ' + $names)

$cap = Invoke-RestMethod -Uri "$Base/mcp" -Method Post -Headers $h -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"sk_capabilities","arguments":{}}}' -TimeoutSec 40
$txt = $cap.result.content[0].text
Write-Output ('SK_CAPABILITIES isError=' + $cap.result.isError + ' len=' + $txt.Length)
Write-Output ('  head: ' + $txt.Substring(0, [Math]::Min(180, $txt.Length)))

$plist = Invoke-RestMethod -Uri "$Base/mcp" -Method Post -Headers $h -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sk_project_list","arguments":{"mode":"survey","pageSize":3}}}' -TimeoutSec 40
Write-Output ('SK_PROJECT_LIST isError=' + $plist.result.isError + ' head=' + $plist.result.content[0].text.Substring(0,[Math]::Min(160, $plist.result.content[0].text.Length)))


$null = Invoke-RestMethod -Uri "$Base/api/system/api-token/revoke" -Method Post -Body (@{id=$created.data.id}|ConvertTo-Json -Compress) -ContentType 'application/json' -WebSession $sess -TimeoutSec 30
$after = Invoke-WebRequest -Uri "$Base/mcp" -Method Post -Headers $h -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":4,"method":"tools/list"}' -SkipHttpErrorCheck -TimeoutSec 30
Write-Output ('AFTER_REVOKE http=' + $after.StatusCode + ' body=' + $after.Content.Substring(0,[Math]::Min(120,$after.Content.Length)))
