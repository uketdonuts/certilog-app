$ErrorActionPreference = 'Stop'
$body = @{ email = 'admin@certilog.com'; password = 'admin123' } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
$token = $login.data.token
Write-Output "TOKEN:$token"
Invoke-RestMethod -Uri 'http://localhost:3001/api/users' -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Compress
