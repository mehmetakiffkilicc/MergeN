"""
MergeN - Sunucu Durdurma Betiği (Stop Servers)
Çalışan Backend (Port 8765) ve Frontend (Port 5173) sunucularını ve ilgili süreçleri kapatır.
"""

import os
import sys
import io
import json
import subprocess
from pathlib import Path

# Windows terminal Türkçe / UTF-8 karakter desteği
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).parent.resolve()
PIDS_FILE = ROOT_DIR / ".server_pids.json"

def kill_pid(pid: int):
    try:
        if sys.platform == "win32":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.kill(pid, 9)
        print(f"  [OK] PID {pid} sonlandırıldı.")
    except Exception as e:
        print(f"  [!] PID {pid} kapatılamadı: {e}")

def kill_port_win32(port: int):
    try:
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True)
        pids = set()
        for line in output.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and "LISTENING" in parts:
                pids.add(parts[-1])
        for pid in pids:
            if pid != "0":
                print(f"  -> Port {port} üzerindeki PID {pid} kapatılıyor...")
                subprocess.run(["taskkill", "/F", "/T", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def kill_port_unix(port: int):
    try:
        subprocess.run(["fuser", "-k", f"{port}/tcp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def main():
    print("========================================================")
    print("MergeN Sunucuları Durduruluyor...")
    print("========================================================")

    # 1. PID Dosyasından Kapatma
    if PIDS_FILE.exists():
        try:
            with open(PIDS_FILE, "r", encoding="utf-8") as f:
                pids = json.load(f)
            for name, pid in pids.items():
                print(f"-> {name.capitalize()} süreci durduruluyor (PID: {pid})...")
                kill_pid(pid)
            os.remove(PIDS_FILE)
        except Exception as e:
            print(f"[!] PID dosyası işlenirken hata: {e}")

    # 2. Port Bazlı Kontrol ve Temizlik (Port 8765 & 5173)
    print("\n-> Port çakışmalarına karşı port 8765 (Backend) ve 5173 (Frontend) kontrol ediliyor...")
    if sys.platform == "win32":
        kill_port_win32(8765)
        kill_port_win32(5173)
    else:
        kill_port_unix(8765)
        kill_port_unix(5173)

    print("\n========================================================")
    print("[OK] Tüm MergeN sunucuları ve süreçleri durduruldu.")
    print("========================================================")

if __name__ == "__main__":
    main()
