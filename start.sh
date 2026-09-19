#!/usr/bin/env bash
# Script de inicio para servidor Minecraft Fabric 1.21.1 en Linux

# Asegurarse de estar en el directorio del script
cd "$(dirname "$0")"

# Comprobar que Java estÃ¡ instalado
if ! command -v java &> /dev/null; then
    echo "ERROR: Java no estÃ¡ instalado o no se encuentra en el PATH."
    echo "Instala OpenJDK 21 ejecutando: sudo apt install -y openjdk-21-jre-headless"
    exit 1
fi

# AsignaciÃ³n de memoria RAM (6GB por defecto, puedes ajustarlo si tu PC tiene mÃ¡s o menos RAM)
MIN_RAM="6G"
MAX_RAM="6G"

echo "=== Iniciando Servidor Minecraft Fabric 1.21.1 (${MIN_RAM} - ${MAX_RAM}) ==="
java -Xms${MIN_RAM} -Xmx${MAX_RAM} -jar server_1.21.1.jar nogui
