# Servidor de Minecraft Fabric 1.21.1 (Linux)

Este repositorio contiene la configuración, mods y librerías del servidor de Minecraft Fabric 1.21.1 listo para desplegar en Linux.

---

## 1. Requisitos Previos en Linux

El servidor requiere **Java 21** (Minecraft 1.20.5+ / 1.21+ requiere Java 21 como mínimo).

### Instalar Java 21

**Ubuntu / Debian / Linux Mint:**
```bash
sudo apt update
sudo apt install -y openjdk-21-jre-headless
```

**Arch Linux / Manjaro:**
```bash
sudo pacman -S jre21-openjdk-headless
```

**Fedora / RHEL:**
```bash
sudo dnf install -y java-21-openjdk-headless
```

Verifica la versión instalada:
```bash
java -version
```

---

## 2. Instalación del Servidor

1. **Clonar este repositorio en tu PC con Linux:**
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd "Server con Zorrito"
   ```

2. **Pasar la carpeta `world` (4.25 GB):**
   Dado que la carpeta del mundo supera los límites de tamaño de Git (más de 4 GB), transfiérela directamente a la raíz de esta carpeta usando cualquiera de estos métodos:
   - **Por pendrive / disco USB:** Copia la carpeta `world` a tu USB y pégala dentro de la carpeta del servidor en Linux.
   - **Por red local (SCP desde PowerShell en Windows):**
     ```powershell
     scp -r "c:\Users\WinterOS\Desktop\Server con Zorrito\world" usuario@IP_DE_LINUX:~/servidor/world
     ```

3. **Dar permisos de ejecución al script:**
   ```bash
   chmod +x start.sh
   ```

---

## 3. Iniciar el Servidor

Ejecuta el script de inicio:
```bash
./start.sh
```

*(Por defecto está configurado con 6 GB de RAM. Puedes editar `MIN_RAM` y `MAX_RAM` dentro de `start.sh` según la memoria de tu equipo).*

---

## 4. Configurar Playit.gg en Linux (Para jugar con amigos)

Para compartir el servidor con amigos sin abrir puertos en el router:

1. **Instalar el cliente oficial de Playit.gg:**
   ```bash
   # En Ubuntu / Debian:
   curl -SsL https://playit-cloud.github.io/ppa/key.gpg | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/playit.gpg >/dev/null
   echo "deb [signed-by=/etc/apt/trusted.gpg.d/playit.gpg] https://playit-cloud.github.io/ppa/data ./" | sudo tee /etc/apt/sources.list.d/playit-cloud.list
   sudo apt update
   sudo apt install -y playit
   ```

2. **Iniciar Playit y reclamar tu cuenta / túnel:**
   ```bash
   playit
   ```
   Te dará un enlace para asociar tu túnel de Minecraft (puerto 25565).

---

## 5. Mantener el Servidor 24/7 (Opcional - Screen)

Para que el servidor siga corriendo aunque cierres la terminal en Linux:

```bash
# Instalar screen si no lo tienes
sudo apt install -y screen

# Abrir una sesión llamada "minecraft"
screen -S minecraft

# Dentro de la sesión, iniciar el servidor
./start.sh

# Para salir de la sesión sin apagar el servidor:
# Presiona Ctrl + A, luego presiona D

# Para volver a la consola del servidor más tarde:
screen -r minecraft
```
