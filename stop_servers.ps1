# MergeN PowerShell Hızlı Durdurma Betiği
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Red
Write-Host "MergeN Sunucuları Durduruluyor..." -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Red

python stop_servers.py
