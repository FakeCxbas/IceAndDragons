#!/usr/bin/env bash
# ==============================================================================
# Script de inicio para el Panel Web de Ice and Dragons (Node.js)
# ==============================================================================

cd "$(dirname "$0")/panel"

# Matar instancia previa si estuviera corriendo en el puerto 3000
fuser -k 3000/tcp >/dev/null 2>&1 || true

echo "=== Iniciando Panel Web Ice & Dragons en segundo plano ==="
nohup node server.js > panel.log 2>&1 &
PID=$!
echo "Panel Web iniciado con PID: $PID"
echo "🌐 Disponible en: http://localhost:3000"
