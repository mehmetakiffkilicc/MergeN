# MergeN PowerShell Kurulum Betiği
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "MergeN Otomatik Kurulum ve Bağımlılık Yükleyici" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

python setup.py
