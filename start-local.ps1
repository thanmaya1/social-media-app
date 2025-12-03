# Start both server and client in separate PowerShell windows for local development
# Usage: Open a PowerShell prompt and run: .\start-local.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start server
$serverCmd = "Set-Location '$root\\server'; npm run dev"
Start-Process -FilePath powershell -ArgumentList ('-NoExit','-Command', $serverCmd) -WindowStyle Normal
Write-Host "Started server in new PowerShell window (running 'npm run dev' in server)"

# Start client
$clientCmd = "Set-Location '$root\\client'; npm run dev"
Start-Process -FilePath powershell -ArgumentList ('-NoExit','-Command', $clientCmd) -WindowStyle Normal
Write-Host "Started client in new PowerShell window (running 'npm run dev' in client)"

Write-Host "If either window fails to start, run the commands manually:" -ForegroundColor Yellow
Write-Host "  cd $root\server; npm run dev" -ForegroundColor Cyan
Write-Host "  cd $root\client; npm run dev" -ForegroundColor Cyan
