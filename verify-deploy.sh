#!/bin/bash

# Script de verificación pre-despliegue para GitHub/Vercel

echo "🔍 Verificando configuración del proyecto LISFA..."
echo ""

# Verificar estructura de archivos
echo "✅ Verificando estructura de archivos..."
if [ -d "/app/backend" ] && [ -d "/app/frontend" ]; then
    echo "  ✓ Directorios backend y frontend encontrados"
else
    echo "  ✗ Error: Faltan directorios principales"
    exit 1
fi

# Verificar archivos importantes
echo ""
echo "✅ Verificando archivos críticos..."

files=(
    "/app/backend/server.py"
    "/app/backend/requirements.txt"
    "/app/backend/vercel.json"
    "/app/frontend/package.json"
    "/app/frontend/src/App.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $(basename $file) encontrado"
    else
        echo "  ✗ Falta: $file"
    fi
done

# Verificar dependencias de Python
echo ""
echo "✅ Verificando dependencias de Python..."
grep -q "fastapi" /app/backend/requirements.txt && echo "  ✓ FastAPI" || echo "  ✗ Falta FastAPI"
grep -q "motor" /app/backend/requirements.txt && echo "  ✓ Motor (MongoDB)" || echo "  ✗ Falta Motor"
grep -q "qrcode" /app/backend/requirements.txt && echo "  ✓ QRCode" || echo "  ✗ Falta QRCode"
grep -q "reportlab" /app/backend/requirements.txt && echo "  ✓ ReportLab" || echo "  ✗ Falta ReportLab"

# Verificar dependencias de Node
echo ""
echo "✅ Verificando dependencias de Node..."
grep -q "react-router-dom" /app/frontend/package.json && echo "  ✓ React Router" || echo "  ✗ Falta React Router"
grep -q "axios" /app/frontend/package.json && echo "  ✓ Axios" || echo "  ✗ Falta Axios"
grep -q "html5-qrcode" /app/frontend/package.json && echo "  ✓ HTML5 QRCode" || echo "  ✗ Falta HTML5 QRCode"

# Información para despliegue
echo ""
echo "📋 Información para configurar en Vercel:"
echo ""
echo "BACKEND:"
echo "  - Root Directory: backend"
echo "  - Framework: Other"
echo "  - Build Command: (vacío)"
echo ""
echo "FRONTEND:"
echo "  - Root Directory: frontend"
echo "  - Framework: Create React App"
echo "  - Build Command: yarn build"
echo "  - Output Directory: build"
echo ""
echo "VARIABLES DE ENTORNO NECESARIAS:"
echo ""
echo "Backend:"
echo "  MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/"
echo "  DB_NAME=lisfa_attendance"
echo "  JWT_SECRET=tu-secret-key-unico"
echo "  CORS_ORIGINS=https://tu-frontend.vercel.app"
echo ""
echo "Frontend:"
echo "  REACT_APP_BACKEND_URL=https://tu-backend.vercel.app"
echo ""
echo "✅ Verificación completa!"
echo ""
echo "📖 Lee DEPLOY_INSTRUCTIONS.md para instrucciones detalladas"
echo "🔗 Repositorio: https://github.com/lisfa2026-lab/CONTROL-DE-ASISTENCIA"
