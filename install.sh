#!/bin/bash

echo ""
echo "⚔️  LUTE MD — Instalación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js $(node -v)"
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no encontrado."
    exit 1
else
    echo "✅ npm $(npm -v)"
fi

# Verificar ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg no encontrado. Instalando..."
    apt-get install -y ffmpeg 2>/dev/null || echo "⚠️  No se pudo instalar ffmpeg automáticamente."
else
    echo "✅ ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
fi

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install

echo ""
echo "⚔️  ¡Listo! Inicia el bot con:"
echo "    npm start     → sesión existente"
echo "    npm run qr    → conectar con QR"
echo "    npm run code  → conectar con código"
echo ""
