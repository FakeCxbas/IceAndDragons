#!/usr/bin/env bash
# ==============================================================================
# Script de Backups Automáticos para Servidor Minecraft Ice and Dragons
# Comprime el mundo, gestiona avisos y rota copias manteniendo las últimas 5.
# ==============================================================================

set -e
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BASE_DIR}/backups"
MAX_BACKUPS=5
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/backup_world_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "=== [$(date +'%T')] Iniciando proceso de Backup ==="

if [ ! -d "${BASE_DIR}/world" ]; then
    echo "ERROR: No se encontró la carpeta 'world' en ${BASE_DIR}."
    exit 1
fi

# Función auxiliar para enviar comandos vía RCON si está disponible
send_rcon() {
    local cmd="$1"
    python3 -c "
import socket, struct, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2.0)
try:
    s.connect(('127.0.0.1', 25575))
    def send_pkt(req_id, p_type, body):
        b = body.encode('utf-8')
        s.sendall(struct.pack('<iii', len(b) + 10, req_id, p_type) + b + b'\x00\x00')
        res = s.recv(4096)
        return res
    send_pkt(1, 3, 'IceAndDragons2026!')
    send_pkt(2, 2, '$cmd')
except Exception:
    pass
finally:
    s.close()
" 2>/dev/null || true
}

# Notificar al servidor y pausar escrituras en disco
send_rcon "say §6[Backup] §fIniciando copia de seguridad del mundo..."
send_rcon "save-off"
send_rcon "save-all flush"

# Pequeña pausa para asegurar sincronización de disco
sleep 1

echo "Comprimiendo carpeta 'world' en ${BACKUP_FILE}..."
tar -czf "${BACKUP_FILE}" -C "${BASE_DIR}" world

# Reactivar guardado en el servidor
send_rcon "save-on"
send_rcon "say §a[Backup] §fCopia de seguridad completada exitosamente."

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup creado con éxito: $(basename "$BACKUP_FILE") (${FILE_SIZE})"

# Rotación de backups: Mantener solo los últimos $MAX_BACKUPS
echo "Revisando rotación de backups (manteniendo los últimos ${MAX_BACKUPS})..."
cd "$BACKUP_DIR"
TOTAL_BACKUPS=$(ls -1 backup_world_*.tar.gz 2>/dev/null | wc -l)
if [ "$TOTAL_BACKUPS" -gt "$MAX_BACKUPS" ]; then
    ls -t backup_world_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | while read -r old_backup; do
        echo "Eliminando backup antiguo: $old_backup"
        rm -f "$old_backup"
    done
fi

echo "=== Backup finalizado con éxito ==="
