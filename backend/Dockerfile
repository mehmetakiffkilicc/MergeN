FROM python:3.11-slim

WORKDIR /app

# Sistem bağımlılıklarını yükle (curl, git, ffmpeg vb.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Bağımlılıkları kopyala ve yükle
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Backend ve Scrapper kodlarını kopyala
COPY backend/ /app/backend/
COPY scrapper/ /app/scrapper/
COPY .env* /app/

WORKDIR /app/backend

EXPOSE 8765

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8765"]
