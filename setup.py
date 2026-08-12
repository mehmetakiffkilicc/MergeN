"""
MergeN - Tak-Çalıştır Kurulum Betiği (Setup Script)
Bu betik sanal ortamı (venv) oluşturur, Python ve Node.js bağımlılıklarını yükler ve .env yapılandırma dosyalarını hazırlar.
"""

import os
import sys
import io
import shutil
import subprocess
from pathlib import Path

# Windows terminal Türkçe / UTF-8 karakter desteği
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).parent.resolve()
VENV_DIR = ROOT_DIR / "venv"
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKEND_DIR = ROOT_DIR / "backend"
SCRAPPER_DIR = ROOT_DIR / "scrapper"

def print_step(msg: str):
    print(f"\n========================================\n[+] {msg}\n========================================")

def check_prerequisites():
    print_step("Sistem Gereksinimleri Kontrol Ediliyor...")
    
    # Python Sürümü Kontrolü
    if sys.version_info < (3, 10):
        print("[!] HATA: MergeN Python 3.10 veya daha yeni bir sürüm gerektirir.")
        print(f"    Mevcut sürüm: {sys.version}")
        sys.exit(1)
    print(f"[OK] Python Sürümü: {sys.version.split()[0]}")

    # Node.js ve NPM Kontrolü
    try:
        node_version = subprocess.check_output(["node", "--version"], text=True).strip()
        npm_version = subprocess.check_output(["npm", "--version"], text=True).strip()
        print(f"[OK] Node.js Sürümü: {node_version} | npm: {npm_version}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[!] UYARI: Node.js veya npm bulunamadı. Frontend kurulumu için Node.js yüklemelisiniz.")

def setup_virtualenv():
    print_step("Python Sanal Ortamı (venv) Hazırlanıyor...")
    if not VENV_DIR.exists():
        print(f"-> 'venv' oluşturuluyor: {VENV_DIR}")
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV_DIR)])
        print("[OK] Sanal ortam başarıyla oluşturuldu.")
    else:
        print("[OK] Sanal ortam (venv) zaten mevcut.")

def get_venv_python_pip():
    if sys.platform == "win32":
        python_bin = VENV_DIR / "Scripts" / "python.exe"
        pip_bin = VENV_DIR / "Scripts" / "pip.exe"
    else:
        python_bin = VENV_DIR / "bin" / "python"
        pip_bin = VENV_DIR / "bin" / "pip"
    return str(python_bin), str(pip_bin)

def install_python_dependencies():
    print_step("Python Bağımlılıkları Yükleniyor (requirements.txt)...")
    python_bin, pip_bin = get_venv_python_pip()
    
    print("-> pip güncelleniyor...")
    subprocess.check_call([python_bin, "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"])
    
    req_file = ROOT_DIR / "requirements.txt"
    if req_file.exists():
        print(f"-> {req_file} paketleri yükleniyor...")
        subprocess.check_call([pip_bin, "install", "-r", str(req_file)])
        print("[OK] Python paketleri başarıyla yüklendi.")
    else:
        print("[!] HATA: requirements.txt bulunamadı!")

def setup_env_files():
    print_step("Çevre Değişkenleri (.env) Yapılandırılıyor...")
    targets = [
        (ROOT_DIR / ".env.example", ROOT_DIR / ".env"),
        (BACKEND_DIR / ".env.example", BACKEND_DIR / ".env"),
        (SCRAPPER_DIR / ".env.example", SCRAPPER_DIR / ".env"),
    ]
    
    for src, dest in targets:
        if src.exists():
            if not dest.exists():
                shutil.copy(src, dest)
                print(f"[OK] {src.name} -> {dest.name} kopyalandı.")
            else:
                print(f"[i] {dest.relative_to(ROOT_DIR)} zaten mevcut, dokunulmadı.")
        else:
            print(f"[!] UYARI: {src.name} bulunamadı.")

def install_frontend_dependencies():
    print_step("Frontend (Node.js) Bağımlılıkları Yükleniyor...")
    if FRONTEND_DIR.exists() and (FRONTEND_DIR / "package.json").exists():
        try:
            print("-> 'npm install' çalıştırılıyor...")
            subprocess.check_call(["npm", "install"], cwd=str(FRONTEND_DIR), shell=sys.platform == "win32")
            print("[OK] Frontend paketleri başarıyla yüklendi.")
        except Exception as e:
            print(f"[!] HATA: Frontend paket yüklemesi başarısız oldu: {e}")
    else:
        print("[!] Frontend klasörü veya package.json bulunamadı.")

def main():
    print(r"""
  __  __                         _   _ 
 |  \/  | ___ _ __ __ _  ___ _ _| \ | |
 | |\/| |/ _ \ '__/ _` |/ _ \ '_|  \| |
 | |  | |  __/ | | (_| |  __/ | | |\  |
 |_|  |_|\___|_|  \__, |\___|_| |_| \_|
                  |___/                
    MergeN Tak-Çalıştır Otomatik Kurulum
    """)
    check_prerequisites()
    setup_virtualenv()
    install_python_dependencies()
    setup_env_files()
    install_frontend_dependencies()
    
    print_step("KURULUM TAMAMLANDI!")
    print(r"""
Lütfen kök dizindeki '.env' dosyasını açıp aşağıdaki API key'leri tanımlayın:
  1. GEMINI_API_KEY  (https://aistudio.google.com/apikey)
  2. TAVILY_API_KEY  (https://tavily.com)

Sunucuları başlatmak için:
  - Windows:    start_servers.bat
  - PowerShell: .\start_servers.ps1
  - Python:     python start_servers.py
    """)

if __name__ == "__main__":
    main()
