#!/usr/bin/env bash
# ==============================================================================
# Script para iniciar Playit.gg en segundo plano para túneles de Minecraft
# ==============================================================================

cd "$(dirname "$0")"

if [ ! -x "./playit" ]; then
    echo "ERROR: El binario ./playit no existe o no tiene permisos de ejecución."
    exit 1
fi

echo "Iniciando demonio Playit.gg..."
nohup ./playit > playit.log 2>&1 &
PID=$!
echo "Playit iniciado con PID: $PID"
echo "Puedes ver el enlace de reclamo en playit.log o en el Panel Web."
