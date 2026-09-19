# 🎮 Mods para Jugadores - Servidor Ice and Dragons

Esta carpeta contiene todos los mods que los jugadores deben instalar en su cliente de Minecraft para poder conectarse y jugar en el servidor.

---

## 📋 Requisitos para el Cliente
1. **Minecraft:** `1.21.1`
2. **Modloader:** [Fabric Loader](https://fabricmc.net/use/installer/) versión **`0.19.3`** o superior (mínimo `0.18.3` requerido por Lithostitched y Adorn).
3. **Java:** Java 21 (incluido por defecto en la mayoría de launchers modernos como Prism Launcher, Pinecone MC, Modrinth o CurseForge).
4. **Memoria RAM recomendada:** Asignar entre **4 GB y 6 GB** de RAM a la instancia debido a mods pesados de contenido y dimensiones (Ice and Fire, The Bumblezone, etc.).

---

## 🚀 Guía de Instalación Rápida

### Opción A: Launcher Oficial de Minecraft
1. Instala **Fabric Loader 1.21.1** (versión 0.19.3+) desde [fabricmc.net](https://fabricmc.net/use/installer/).
2. Presiona `Win + R` en Windows, escribe `%appdata%\.minecraft` y presiona Enter. *(En Linux: `~/.minecraft` | En Mac: `~/Library/Application Support/minecraft`)*.
3. Abre (o crea si no existe) la carpeta llamada `mods`.
4. Copia **todos los archivos `.jar` de esta carpeta** dentro de tu carpeta `mods`.
5. Inicia el launcher, selecciona el perfil de **Fabric Loader 1.21.1** y entra al juego.

### Opción B: Pinecone MC / Prism Launcher / Modrinth
1. Crea una instancia con **Minecraft 1.21.1** y **Fabric Loader 0.19.3**.
2. Copia o arrastra todos los archivos `.jar` de esta carpeta a la sección/carpeta `minecraft/mods` de tu instancia.
3. Inicia la instancia.

---

## ⚠️ Resolución de Conflictos Conocidos (Packs de Optimización)
Si partes de un modpack base de optimización (como *Ultimately Optimized*):
- **Deshabilitar el mod `particular`:** El mod `particular` es incompatible con `Supplementaries` y provocará que Fabric detenga el juego al cargar. Renómbralo a `particular-*.jar.disabled` o elimínalo.
- **Librerías obsoletas:** Si tu pack ya contaba con versiones antiguas de `fabric-api`, `architectury`, `lithium`, `ferritecore`, `modernfix`, `puzzleslib` o `owo-lib`, reemplázalas con las versiones incluidas en esta carpeta para evitar advertencias de mods duplicados.

---

## 🎙️ Chat de Voz por Proximidad (Simple Voice Chat)
- El paquete incluye `voicechat-fabric-1.21.1-2.6.23.jar`.
- Para hablar en el juego y configurar tu micrófono/altavoces, presiona la tecla **`V`** una vez dentro del servidor.

---

## 🧩 Contenido del paquete (56 mods)
- **Aventura y Contenido:** Ice and Fire (Dragones), The Bumblezone, Deeper and Darker, Bosses of Mass Destruction, Boss Ultimatum, Awesomedungeon, Supplementaries, Handcrafted, Adorn, Gobber 2, etc.
- **Utilidades y Jugabilidad:** Backpacked (Mochilas), Carry On, Nifty Carts, No Chat Reports, Quick Skin (Skins personalizadas), Simple Voice Chat.
- **Rendimiento y Optimización de Cliente:** ImmediatelyFast, FerriteCore, ModernFix, Lithium, Debugify, Polytone.
