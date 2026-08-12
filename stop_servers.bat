@echo off
chcp 65001 > NUL
title MergeN - Sunucuları Durdur
echo ========================================================
echo MergeN Hızlı Durdurma Betiği
echo ========================================================

python stop_servers.py

echo.
pause
