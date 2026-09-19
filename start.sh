#!/usr/bin/env bash
# ==============================================================================
# Script de inicio para servidor Minecraft Fabric 1.21.1 en Linux
# Optimizado para 4GB RAM y alto rendimiento de carga de chunks
# ==============================================================================

# Asegurarse de estar en el directorio del script
cd "$(dirname "$0")"

# Localizar el ejecutable de Java 21
if command -v java &> /dev/null; then
    JAVA_BIN="java"
elif [ -x "./runtime/bin/java" ]; then
    JAVA_BIN="./runtime/bin/java"
elif [ -x "/usr/lib/jvm/default-runtime/bin/java" ]; then
    JAVA_BIN="/usr/lib/jvm/default-runtime/bin/java"
elif [ -x "/usr/lib/jvm/java-21-openjdk/bin/java" ]; then
    JAVA_BIN="/usr/lib/jvm/java-21-openjdk/bin/java"
else
    echo "======================================================================"
    echo "ERROR: Java 21 no está instalado en el sistema ni en ./runtime."
    echo "Instálalo ejecutando en tu terminal:"
    echo "  sudo pacman -S jre21-openjdk-headless"
    echo "======================================================================"
    exit 1
fi

# Configuración de memoria RAM (4 GB)
RAM="4G"

# Flags de optimización JVM (Aikar's Flags optimizados para G1GC en 4GB)
JVM_OPTS="-Xms${RAM} -Xmx${RAM} \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UnlockExperimentalVMOptions \
  -XX:+DisableExplicitGC \
  -XX:+AlwaysPreTouch \
  -XX:G1NewSizePercent=30 \
  -XX:G1MaxNewSizePercent=40 \
  -XX:G1ReservePercent=20 \
  -XX:G1HeapWastePercent=5 \
  -XX:G1MixedGCCountTarget=4 \
  -XX:InitiatingHeapOccupancyPercent=15 \
  -XX:G1MixedGCLiveThresholdPercent=90 \
  -XX:G1RSetUpdatingPauseTimePercent=5 \
  -XX:SurvivorRatio=32 \
  -XX:+PerfDisableSharedMem \
  -XX:MaxTenuringThreshold=1"

echo "=== Iniciando Servidor Minecraft Fabric 1.21.1 ==="
echo "Java utilizado  : $($JAVA_BIN -version 2>&1 | head -n 1)"
echo "Memoria asignada: ${RAM}"
echo "Optimizaciones  : C2ME, Lithium, FerriteCore, Noisium, Krypton activos"
echo "=================================================="

exec "$JAVA_BIN" $JVM_OPTS -jar server_1.21.1.jar nogui
