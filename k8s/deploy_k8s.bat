@echo off
chcp 65001 > NUL
title MergeN - Kubernetes Dağıtımı
echo ========================================================
echo MergeN Kubernetes Cluster Dağıtımı
echo ========================================================

echo -> Docker imajları oluşturuluyor...
docker build -t mergen-backend:latest -f backend/Dockerfile .
docker build -t mergen-frontend:latest -f frontend/Dockerfile .

echo.
echo -> Kubernetes manifest'leri uygulanıyor...
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

echo.
echo [OK] Kubernetes dağıtımı tamamlandı!
echo Port-Forward yapmak için:
echo   kubectl port-forward svc/mergen-frontend-service 5173:5173
echo   kubectl port-forward svc/mergen-backend-service 8765:8765
echo.
pause
