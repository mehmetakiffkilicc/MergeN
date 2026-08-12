<div align="center">
  <img src="mergen logo.png" alt="MergeN Logo" width="220" onerror="this.src='https://img.icons8.com/color/150/000000/artificial-intelligence.png'"/>

  # MergeN: Yapay Zeka Destekli E-Ticaret Manipülasyon Analiz Platformu

  **"Çok Ajanlı (Multi-Agent) LangGraph Pipeline ve Veri Madenciliği ile Şeffaf Alışveriş Kararları"**

  [![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Kubernetes](https://img.shields.io/badge/Kubernetes-Supported-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
</div>

---

## 📖 İçindekiler
- [Proje Hakkında ve Teknik Özet](#-proje-hakkında-ve-teknik-özet)
- [Sistem Mimarisi ve Bileşenler](#-sistem-mimarisi-ve-bileşenler)
- [LangGraph Ajan Pipeline Akışı](#-langgraph-ajan-pipeline-akışı)
- [Gereksinimler](#-gereksinimler)
- [Tak-Çalıştır Hızlı Kurulum & Otomatik Setup](#-tak-çalıştır-hızlı-kurulum--otomatik-setup)
- [Sunucuları Başlatma ve Durdurma Scriptleri](#-sunucuları-başlatma-ve-durdurma-scriptleri)
- [🐳 Docker & Docker Compose Kurulumu](#-docker--docker-compose-kurulumu)
- [☸️ Kubernetes (k8s) Dağıtımı](#️-kubernetes-k8s-dağıtımı)
- [Çevre Değişkenleri (.env)](#-çevre-değişkenleri-env)
- [API Dokümantasyonu (Endpoints)](#-api-dokümantasyonu-endpoints)
- [Chrome Eklentisi Kurulumu](#-chrome-eklentisi-kurulumu)
- [Proje Dizin Yapısı](#-proje-dizin-yapısı)

---

## 🎯 Proje Hakkında ve Teknik Özet

**MergeN**, e-ticaret ürünlerinde yer alan sahte değerlendirmeleri, manipülatif indirimleri ve abartılı pazarlama iddialarını tespit eden **çok ajanlı (multi-agent)** bir karar destek sistemidir. 

Kullanıcı bir ürün adı veya URL'si girdiğinde sistem; pazar yeri yorumlarını (Trendyol, Hepsiburada), teknoloji forumlarını (DH, Technopat vb.), Reddit başlıklarını ve YouTube video transkriptlerini çok kanallı olarak toplar. Ardından **LangGraph** tabanlı 6 uzman yapay zeka ajanı aracılığıyla 4 katmanlı **Manipülasyon DNA'sını** hesaplar ve nihai **AL / KOŞULLU AL / ALMA** tavsiyesi üretir.

---

## 🏗️ Sistem Mimarisi ve Bileşenler

Sistem 4 ana katmandan oluşmaktadır:

1. **Backend (`/backend`)**:
   - **FastAPI**: Asenkron REST ve Server-Sent Events (SSE) streaming API servisleri.
   - **LangGraph StateGraph**: Durum tabanlı (stateful) çok ajanlı orkestrasyon.
   - **MemorySaver (SQLite Checkpointer)**: İnsan müdahalesi (interrupt) gerektiren durumları askıya alma ve kaldığı yerden devam ettirme.
   - **SQLite Caching (`mergen_cache.db`)**: LLM ve web arama maliyetlerini düşüren asenkron disk önbelleği.

2. **Frontend (`/frontend`)**:
   - **React 19 & Vite**: Yüksek performanslı reaktif kullanıcı arayüzü.
   - **Framer Motion & Recharts**: Dinamik grafikler, manipülasyon skor görselleştirmeleri ve akıcı animasyonlar.

3. **Scrapper Motoru (`/scrapper`)**:
   - **Subprocess Isolation**: Backend ile bağımsız çalışan, Playwright gerektirmeyen ultra hızlı HTTP/JSON veri toplayıcı.
   - **YouTube Data API v3 & Tavily**: Otomatik video transkripti çekimi ve derin forum web taraması.

4. **Chrome Eklentisi (`/extension`)**:
   - **Manifest V3**: Pazar yeri ürün sayfalarında doğrudan çalışan ve backend API ile haberleşen hafif tarayıcı eklentisi.

---

## ⚡ Tak-Çalıştır Hızlı Kurulum & Otomatik Setup

Sistem **akıllı otomatik kurulum** özelliğine sahiptir. `start_servers.bat` veya `python start_servers.py` çalıştırıldığında gereksinimlerin (`venv`, paketler, `node_modules`, `.env`) varlığını otomatik denetler ve eksik bir bileşen bulursa **`setup.py` betiğini kendiliğinden çalıştırıp kurulumu tamamlar**.

### Manuel Kurulum İstenirse:
```cmd
# Windows (Batch)
setup.bat

# PowerShell
.\setup.ps1

# Çapraz Platform (Python)
python setup.py
```

---

## 🚀 Sunucuları Başlatma ve Durdurma Scriptleri

Kurulum tamamlandıktan (veya otomatik tetiklendikten) sonra sunucuları tek komutla çalıştırabilir ve durdurabilirsiniz.

### 🟢 Sunucuları Başlatma (Start)
- **Windows Batch**: `start_servers.bat`
- **PowerShell**: `.\start_servers.ps1`
- **Python**: `python start_servers.py`

*(Gereksinimler yüklü değilse `start_servers` otomatik olarak önce `setup.py` çalıştırır, ardından Backend'i 8765 ve Frontend'i 5173 portunda ayağa kaldırıp tarayıcıyı açar).*

### 🔴 Sunucuları Durdurma (Stop)
- **Windows Batch**: `stop_servers.bat`
- **PowerShell**: `.\stop_servers.ps1`
- **Python**: `python stop_servers.py`

---

## 🐳 Docker & Docker Compose Kurulumu

MergeN, konteyner mimarisinde çalıştırmak için hazır `Dockerfile` ve `docker-compose.yml` yapılandırmalarına sahiptir.

### Docker Compose ile Tek Komutla Çalıştırma
```bash
# Servisleri derle ve arka planda başlat
docker compose up --build -d

# Logları takip etmek için
docker compose logs -f
```

Servisler ayağa kalktıktan sonra:
- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:8765`

### Konteynerleri Durdurmak İçin:
```bash
docker compose down
```

---

## ☸️ Kubernetes (k8s) Dağıtımı

Kümeye (cluster) canlı dağıtım veya yerel Kubernetes (Minikube / Docker Desktop K8s) testleri için `k8s/` dizininde manifest dosyaları yer almaktadır.

### Otomatik Dağıtım Scripti (Windows):
```cmd
cd k8s
deploy_k8s.bat
```

### Manuel Kubernetes Komutları:
```bash
# 1. ConfigMap ve Secret oluştur
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 2. Backend ve Frontend servislerini yayınla
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 3. Servis durumlarını kontrol et
kubectl get pods,svc
```

---

## 🔑 Çevre Değişkenleri (.env)

```env
# AI & Arama API Anahtarları
GEMINI_API_KEY=AIzaSy...
TAVILY_API_KEY=tvly-...

# Model Atamaları
MODEL_FLASH=gemini-3-flash
MODEL_LITE=gemini-2.5-flash-lite
MODEL_VISION=gemini-3-flash
MODEL_PRO=gemini-3-flash

# Sunucu URL'leri
BACKEND_URL=http://localhost:8765
FRONTEND_URL=http://localhost:5173

# Önbellek Süresi (Saniye)
CACHE_TTL_SECONDS=21600
```

---

## 🔌 API Dokümantasyonu (Endpoints)

FastAPI backend sunucusu `http://localhost:8765` portunda çalışır. Interaktif Swagger dokümantasyonuna `http://localhost:8765/docs` adresinden erişilebilir.

### Ana Uç Noktalar

| Metot | Uç Nokta | Açıklama |
|-------|----------|----------|
| `POST` | `/api/analyze/stream` | LangGraph pipeline analizini Server-Sent Events (SSE) formatında canlı yayınlar. |
| `POST` | `/api/analyze/answer` | Advisor interrupt aşamasında kullanıcının verdiği yanıtları aktarır ve akışı devam ettirir. |
| `GET` | `/api/analyze/summary/{thread_id}` | Chrome eklentisi için optimize edilmiş hafif JSON özeti üretir (< 2KB). |
| `POST` | `/api/chat/` | Gemini Flash ile interaktif ürün sohbeti gerçekleştirir. |
| `GET` | `/health` | API anahtarlarının ve veritabanı bağlantısının sağlık durumunu kontrol eder. |

---

## 🧩 Chrome Eklentisi Kurulumu

1. Google Chrome tarayıcısını açın ve `chrome://extensions` adresine gidin.
2. Sağ üst köşedeki **Geliştirici modu (Developer mode)** anahtarını aktif edin.
3. **Paketlenmemiş öge yükle (Load unpacked)** butonuna tıklayın.
4. Projedeki `/extension` klasörünü seçin.

---

## 📁 Proje Dizin Yapısı

```
MergeN/
├── backend/                  # FastAPI & LangGraph Multi-Agent Altyapısı
│   ├── Dockerfile            # Backend Docker imaj dosyası
│   ├── agents/               # 6 Uzman Ajan (Orchestrator, Research, X-Ray, Analysis, Advisor, Challenger)
│   ├── routers/              # API Rotaları (Analyze SSE, Chat, Health)
│   └── main.py               # FastAPI Giriş Noktası
├── frontend/                 # React 19 + Vite Dashboard Arayüzü
│   ├── Dockerfile            # Frontend Docker imaj dosyası
│   └── package.json          # Node.js Bağımlılıkları
├── k8s/                      # Kubernetes Manifest Dosyaları
│   ├── configmap.yaml        # K8s ConfigMap
│   ├── secret.yaml           # K8s Secret Şablonu
│   ├── backend-deployment.yaml  # Backend K8s Deployment & Service
│   ├── frontend-deployment.yaml # Frontend K8s Deployment & Service
│   └── deploy_k8s.bat        # K8s Dağıtım Scripti
├── scrapper/                 # Çok Kaynaklı Veri Toplama Motoru
├── extension/                # Chrome Eklentisi (Manifest V3)
├── docker-compose.yml        # Multi-container Docker Yapılandırması
├── setup.py / setup.bat      # Otomatik Tak-Çalıştır Kurulum Scriptleri
├── start_servers.py / .bat   # Hızlı Sunucu Başlatma Scriptleri (Eksikse Otomatik Setup Tetikler)
├── stop_servers.py / .bat    # Hızlı Sunucu Durdurma Scriptleri
├── requirements.txt          # Birleştirilmiş Kök Python Bağımlılıkları
└── README.md                 # Teknik Dokümantasyon
```
