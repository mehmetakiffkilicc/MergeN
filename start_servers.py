"""
MergeN - Sunucu Başlatma Betiği (Start Servers)
Gereksinimler yüklenmemişse otomatik olarak setup.py betiğini çalıştırır,
ardından Backend (FastAPI - Port 8765) ve Frontend (Vite - Port 5173) sunucularını başlatır.
"""

import os
import sys
import io
import json
import time
import webbrowser
import subprocess
from pathlib import Path

# Windows terminal Türkçe / UTF-8 karakter desteği
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).parent.resolve()
VENV_DIR = ROOT_DIR / "venv"
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
PIDS_FILE = ROOT_DIR / ".server_pids.json"

def get_python_exe():
    if sys.platform == "win32":
        venv_py = VENV_DIR / "Scripts" / "python.exe"
    else:
        venv_py = VENV_DIR / "bin" / "python"
    
    if venv_py.exists():
        return str(venv_py)
    return sys.executable

def check_and_auto_setup():
    """Gereksinimlerin yüklü olup olmadığını kontrol eder, eksikse setup.py'yi çalıştırır."""
    python_exe = get_python_exe()
    node_modules = FRONTEND_DIR / "node_modules"
    env_file = ROOT_DIR / ".env"
    
    needs_setup = False
    reasons = []

    if not VENV_DIR.exists() or not Path(python_exe).exists():
        needs_setup = True
        reasons.append("Python sanal ortamı (venv) bulunamadı.")
    
    if not node_modules.exists():
        needs_setup = True
        reasons.append("Frontend node_modules klasörü bulunamadı.")

    if not env_file.exists():
        needs_setup = True
        reasons.append("Kök .env dosyası bulunamadı.")

    if needs_setup:
        print("\n========================================================")
        print("⚙️ GEREKSİNİMLER EKSİK TESPİT EDİLDİ - OTOMATİK SETUP BAŞLATILIYOR")
        print("========================================================")
        for reason in reasons:
            print(f"  [!] {reason}")
        print("-> 'setup.py' betiği çalıştırılıyor...\n")
        
        setup_script = ROOT_DIR / "setup.py"
        try:
            subprocess.check_call([sys.executable, str(setup_script)])
            print("\n[OK] Otomatik kurulum tamamlandı, sunucular başlatılıyor...\n")
        except subprocess.CalledProcessError as e:
            print(f"\n[!] HATA: Otomatik kurulum başarısız oldu (Hata kodu: {e.returncode}).")
            sys.exit(1)

def main():
    print("========================================================")
    print("MergeN Sunucuları Başlatılıyor...")
    print("========================================================")

    # 1. Otomatik Gereksinim Kontrolü & Setup Çalıştırma
    check_and_auto_setup()

    python_exe = get_python_exe()
    pids = {}

    # 2. Backend Sunucusunu Başlat (FastAPI - Port 8765)
    print("\n[1/2] Backend Sunucusu Başlatılıyor (Port 8765)...")
    backend_cmd = [python_exe, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8765", "--reload"]
    
    if sys.platform == "win32":
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(BACKEND_DIR),
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(BACKEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    pids["backend"] = backend_proc.pid
    print(f"  [OK] Backend PID: {backend_proc.pid}")

    # 3. Frontend Sunucusunu Başlat (Vite - Port 5173)
    print("\n[2/2] Frontend Sunucusu Başlatılıyor (Port 5173)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]

    if sys.platform == "win32":
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(FRONTEND_DIR),
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    pids["frontend"] = frontend_proc.pid
    print(f"  [OK] Frontend PID: {frontend_proc.pid}")

    # PID'leri kaydet
    with open(PIDS_FILE, "w", encoding="utf-8") as f:
        json.dump(pids, f, indent=2)

    print("\n========================================================")
    print("[OK] Sunucular başarıyla başlatıldı!")
    print("  - Backend API:  http://localhost:8765")
    print("  - Frontend UI:   http://localhost:5173")
    print("  - API Health:    http://localhost:8765/health")
    print("========================================================")
    print("Durdurmak için 'stop_servers.bat' veya 'python stop_servers.py' kullanın.")

    # 3 saniye sonra varsayılan tarayıcıda frontend'i aç
    time.sleep(3)
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

if __name__ == "__main__":
    main()
