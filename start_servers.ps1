# MergeN PowerShell Hızlı Başlatma Betiği
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Green
Write-Host "MergeN Sunucuları Başlatılıyor..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

python start_servers.py
