const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execSync, spawn } = require('child_process');
const { sendRconCommand } = require('./rcon');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_DIR = path.resolve(__dirname, '..');
const LOGS_FILE = path.join(SERVER_DIR, 'logs', 'latest.log');
const CHUNKY_TASK_FILE = path.join(SERVER_DIR, 'config', 'chunky', 'tasks', 'minecraft', 'overworld.properties');
const PLAYIT_LOG_FILE = path.join(SERVER_DIR, 'playit.log');
const BACKUPS_DIR = path.join(SERVER_DIR, 'backups');
const WORLD_DIR = path.join(SERVER_DIR, 'world');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================================================
// 1. Muestreo de CPU del Sistema en Tiempo Real (Delta Sampling)
// ==============================================================================
let prevCpus = os.cpus();
let systemCpuPercent = 0;

setInterval(() => {
  try {
    const currentCpus = os.cpus();
    let totalDiff = 0;
    let idleDiff = 0;

    for (let i = 0; i < currentCpus.length; i++) {
      const prev = prevCpus[i].times;
      const curr = currentCpus[i].times;

      const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
      const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;

      totalDiff += (currTotal - prevTotal);
      idleDiff += (curr.idle - prev.idle);
    }

    prevCpus = currentCpus;
    if (totalDiff > 0) {
      systemCpuPercent = Math.max(0, Math.min(100, Math.round(((totalDiff - idleDiff) / totalDiff) * 1000) / 10));
    }
  } catch (e) {}
}, 1000);

// ==============================================================================
// 2. Caché de Disco y Tamaño del Mundo (Evita saturar I/O)
// ==============================================================================
let cachedDiskInfo = { totalGB: 0, usedGB: 0, freeGB: 0, percent: 0, lastCheck: 0 };
let cachedWorldSize = { sizeMB: 0, sizeGB: '0.0', lastCheck: 0 };

function getDiskInfo() {
  const now = Date.now();
  if (now - cachedDiskInfo.lastCheck < 15000 && cachedDiskInfo.totalGB > 0) {
    return cachedDiskInfo;
  }
  try {
    const dfOut = execSync(`df -k "${SERVER_DIR}" 2>/dev/null`, { encoding: 'utf-8' });
    const lines = dfOut.trim().split('\n');
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/);
      const totalK = parseInt(parts[1]) || 0;
      const usedK = parseInt(parts[2]) || 0;
      const availK = parseInt(parts[3]) || 0;
      cachedDiskInfo = {
        totalGB: parseFloat((totalK / (1024 * 1024)).toFixed(1)),
        usedGB: parseFloat((usedK / (1024 * 1024)).toFixed(1)),
        freeGB: parseFloat((availK / (1024 * 1024)).toFixed(1)),
        percent: totalK > 0 ? Math.round((usedK / totalK) * 100) : 0,
        lastCheck: now
      };
    }
  } catch (e) {}
  return cachedDiskInfo;
}

function getWorldSize() {
  const now = Date.now();
  if (now - cachedWorldSize.lastCheck < 20000 && cachedWorldSize.sizeMB > 0) {
    return cachedWorldSize;
  }
  try {
    if (fs.existsSync(WORLD_DIR)) {
      const duOut = execSync(`du -sk "${WORLD_DIR}" 2>/dev/null`, { encoding: 'utf-8' });
      const k = parseInt(duOut.trim().split(/\s+/)[0]) || 0;
      const mb = Math.round(k / 1024);
      cachedWorldSize = {
        sizeMB: mb,
        sizeGB: (mb / 1024).toFixed(2),
        lastCheck: now
      };
    }
  } catch (e) {}
  return cachedWorldSize;
}

// Helper para parsear progreso de Chunky
function getChunkyProgress() {
  let progress = {
    running: false,
    dimension: 'minecraft:overworld',
    chunks: 0,
    total: 1562500, // 10000 radio en cuadrado = 1250 x 1250 chunks
    percent: 0,
    cps: 0,
    eta: '--:--:--',
    coords: '0, 0',
    lastUpdate: ''
  };

  try {
    if (fs.existsSync(CHUNKY_TASK_FILE)) {
      const content = fs.readFileSync(CHUNKY_TASK_FILE, 'utf-8');
      const lines = content.split('\n');
      lines.forEach(line => {
        const [k, v] = line.split('=');
        if (k === 'chunks') progress.chunks = parseInt(v) || progress.chunks;
        if (k === 'world') progress.dimension = v;
      });
      if (progress.total > 0 && progress.chunks > 0) {
        progress.percent = parseFloat(((progress.chunks / progress.total) * 100).toFixed(2));
      }
    }
  } catch (e) {}

  try {
    if (fs.existsSync(LOGS_FILE)) {
      const logsTail = execSync(`tail -n 60 "${LOGS_FILE}" 2>/dev/null`, { encoding: 'utf-8' });
      const logLines = logsTail.split('\n');
      
      for (let i = logLines.length - 1; i >= 0; i--) {
        const line = logLines[i];
        if (line.includes('[Chunky] Task running for')) {
          progress.running = true;
          const matchChunks = line.match(/Processed:\s*(\d+)\s*chunks/);
          if (matchChunks) progress.chunks = parseInt(matchChunks[1]);
          
          const matchPercent = line.match(/\(([\d,\.]+)\%\)/);
          if (matchPercent) progress.percent = parseFloat(matchPercent[1].replace(',', '.'));
          
          const matchEta = line.match(/ETA:\s*([\d:]+)/);
          if (matchEta) progress.eta = matchEta[1];
          
          const matchRate = line.match(/Rate:\s*([\d,\.]+)\s*cps/);
          if (matchRate) progress.cps = parseFloat(matchRate[1].replace(',', '.'));
          
          const matchCoords = line.match(/Current:\s*([-\d]+,\s*[-\d]+)/);
          if (matchCoords) progress.coords = matchCoords[1];

          const matchTime = line.match(/^\[([\d:]+)\]/);
          if (matchTime) progress.lastUpdate = matchTime[1];
          break;
        } else if (line.includes('[Chunky] Task paused') || line.includes('[Chunky] Task stopped')) {
          progress.running = false;
          break;
        }
      }
    }
  } catch (e) {}

  return progress;
}

// Helper para obtener TPS y MSPT (Ticks Per Second y salud del servidor)
let cachedTps = {
  tps: 20.0,
  mspt: 20.0,
  percentiles: { p50: 20.0, p95: 35.0, p99: 50.0 },
  status: 'Óptimo (20.0 TPS)',
  lastCheck: 0
};

async function getTpsStats() {
  const now = Date.now();
  if (now - cachedTps.lastCheck < 2500 && cachedTps.lastCheck > 0) {
    return cachedTps;
  }

  try {
    const output = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', 'tick query');
    if (output) {
      const rateMatch = output.match(/Target tick rate:\s*([\d,\.]+)\s*per second/i);
      const msptMatch = output.match(/Average time per tick:\s*([\d,\.]+)ms/i);
      const p50Match = output.match(/P50:\s*([\d,\.]+)ms/i);
      const p95Match = output.match(/P95:\s*([\d,\.]+)ms/i);

      if (rateMatch) {
        cachedTps.tps = parseFloat(rateMatch[1].replace(',', '.')) || 20.0;
      }
      if (msptMatch) {
        cachedTps.mspt = parseFloat(msptMatch[1].replace(',', '.')) || 0;
      }
      if (p50Match) cachedTps.percentiles.p50 = parseFloat(p50Match[1].replace(',', '.'));
      if (p95Match) cachedTps.percentiles.p95 = parseFloat(p95Match[1].replace(',', '.'));

      if (cachedTps.mspt <= 35.0 && cachedTps.tps >= 19.5) {
        cachedTps.status = 'Óptimo (20.0 TPS)';
      } else if (cachedTps.mspt <= 50.0) {
        cachedTps.status = 'Bueno (Sin lag)';
      } else {
        cachedTps.status = 'Sobrecargado (Lag)';
      }

      cachedTps.lastCheck = now;
    }
  } catch (e) {}

  return cachedTps;
}

// Helper para detectar jugadores desde RCON o logs
async function getPlayersOnline() {
  let players = { count: 0, max: 20, list: [] };

  try {
    const listOut = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', 'list');
    if (listOut) {
      const match = listOut.match(/There are (\d+) of a max of (\d+) players online:(.*)/i);
      if (match) {
        players.count = parseInt(match[1]) || 0;
        players.max = parseInt(match[2]) || 20;
        const names = match[3].trim();
        if (names) {
          players.list = names.split(',').map(n => n.trim()).filter(Boolean);
        }
        return players;
      }
    }
  } catch (e) {}

  try {
    if (fs.existsSync(LOGS_FILE)) {
      const tail = execSync(`tail -n 150 "${LOGS_FILE}" 2>/dev/null`, { encoding: 'utf-8' });
      const lines = tail.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const match = line.match(/There are (\d+) of a max of (\d+) players online:(.*)/i);
        if (match) {
          players.count = parseInt(match[1]) || 0;
          players.max = parseInt(match[2]) || 20;
          const names = match[3].trim();
          if (names) {
            players.list = names.split(',').map(n => n.trim()).filter(Boolean);
          }
          break;
        }
      }
    }
  } catch (e) {}
  return players;
}

// ==============================================================================
// 3. Rutas API
// ==============================================================================

// Estado General y Telemetría Completa
app.get('/api/status', async (req, res) => {
  let isRunning = false;
  let pid = null;
  let rawCpuPercent = 0;
  let memMB = 0;
  const numCores = os.cpus().length;

  try {
    const pgrep = execSync(`pgrep -f "server_1.21.1.jar" 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (pgrep) {
      isRunning = true;
      pid = pgrep.split('\n')[0];
      const psOut = execSync(`ps -p ${pid} -o %cpu,rss --no-headers 2>/dev/null`, { encoding: 'utf-8' }).trim();
      if (psOut) {
        const [cpu, rss] = psOut.split(/\s+/);
        rawCpuPercent = parseFloat(cpu) || 0;
        memMB = Math.round((parseInt(rss) || 0) / 1024);
      }
    }
  } catch (e) {}

  // CPU normalizada (escala 0-100% de la capacidad total del sistema)
  const normalizedProcessCpu = Math.min(100, Math.round((rawCpuPercent / numCores) * 10) / 10);
  const coresUsed = parseFloat((rawCpuPercent / 100).toFixed(1));

  // Playit status
  let playitRunning = false;
  let playitClaimUrl = null;
  let playitAddress = null;
  let playitIpPort = null;

  try {
    const playitPgrep = execSync(`pgrep -x playit 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (playitPgrep) playitRunning = true;
    
    if (playitRunning) {
      try {
        const tunnelsJson = execSync(`"${path.join(SERVER_DIR, 'playit')}" tunnels list 2>/dev/null`, { encoding: 'utf-8' });
        const pData = JSON.parse(tunnelsJson);
        if (pData.tunnels && pData.tunnels.length > 0) {
          const t = pData.tunnels[0];
          if (t.alloc && t.alloc.data) {
            playitAddress = t.alloc.data.assigned_domain || t.alloc.data.assigned_srv;
            playitIpPort = `${t.alloc.data.ip_hostname}:${t.alloc.data.port_start}`;
          }
        }
      } catch (err) {}
    }

    if (fs.existsSync(PLAYIT_LOG_FILE)) {
      const playitLog = fs.readFileSync(PLAYIT_LOG_FILE, 'utf-8');
      const claimMatch = playitLog.match(/https:\/\/playit\.gg\/claim\/[a-f0-9]{6,12}/i);
      if (claimMatch) playitClaimUrl = claimMatch[0];

      if (!playitAddress) {
        const addrMatch = playitLog.match(/([a-zA-Z0-9\.\-]+\.ply\.gg)/i);
        if (addrMatch) playitAddress = addrMatch[1];
      }
    }
  } catch (e) {}

  const totalSysMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeSysMem = Math.round(os.freemem() / (1024 * 1024));
  const usedSysMem = totalSysMem - freeSysMem;

  res.json({
    online: isRunning,
    pid,
    minecraft: {
      port: 25565,
      voiceChatPort: 24454,
      rconPort: 25575,
      ramMB: memMB,
      ramAllocatedMB: 4096,
      ramPercent: Math.min(100, Math.round((memMB / 4096) * 100)),
      cpu: {
        raw: rawCpuPercent,
        normalized: normalizedProcessCpu,
        coresUsed: coresUsed,
        explanation: `En Linux cada núcleo equivale a 100%. ${coresUsed} núcleos activos = ${rawCpuPercent}% raw, equivalente a ${normalizedProcessCpu}% del total del sistema (${numCores} núcleos).`
      },
      players: await getPlayersOnline(),
      tps: await getTpsStats()
    },
    system: {
      totalMemMB: totalSysMem,
      usedMemMB: usedSysMem,
      memPercent: Math.round((usedSysMem / totalSysMem) * 100),
      cpuCores: numCores,
      systemCpuPercent: systemCpuPercent,
      platform: os.platform(),
      uptimeSeconds: Math.round(os.uptime())
    },
    disk: getDiskInfo(),
    world: getWorldSize(),
    playit: {
      running: playitRunning,
      claimUrl: playitClaimUrl,
      address: playitAddress,
      ipPort: playitIpPort
    },
    chunky: getChunkyProgress()
  });
});

// Endpoint dedicado para TPS & Rendimiento
app.get('/api/tps', async (req, res) => {
  res.json(await getTpsStats());
});

// Chunky Progress
app.get('/api/chunky', (req, res) => {
  res.json(getChunkyProgress());
});

// Chunky Control
app.post('/api/chunky/control', async (req, res) => {
  const { action } = req.body;
  let cmd = 'chunky progress';
  if (action === 'pause') cmd = 'chunky pause';
  if (action === 'continue') cmd = 'chunky continue';
  if (action === 'trim') cmd = 'chunky trim';
  
  try {
    const output = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', cmd);
    res.json({ success: true, action, output });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logs Endpoint
app.get('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const lines = execSync(`tail -n 120 "${LOGS_FILE}" 2>/dev/null`, { encoding: 'utf-8' });
      return res.json({ logs: lines });
    }
    res.json({ logs: 'No se encontró el archivo latest.log.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Descargar Log Completo
app.get('/api/logs/download', (req, res) => {
  if (fs.existsSync(LOGS_FILE)) {
    res.setHeader('Content-Disposition', 'attachment; filename="latest.log"');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return fs.createReadStream(LOGS_FILE).pipe(res);
  }
  res.status(404).json({ error: 'Archivo de log no disponible' });
});

// Streaming de Logs (SSE)
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const interval = setInterval(() => {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        const lines = execSync(`tail -n 25 "${LOGS_FILE}" 2>/dev/null`, { encoding: 'utf-8' });
        res.write(`data: ${JSON.stringify({ lines })}\n\n`);
      }
    } catch (e) {}
  }, 1200);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Enviar Comando RCON
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Comando vacío' });

  try {
    const output = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', command);
    
    // Spark genera su salida de forma asíncrona hacia el logger del servidor
    if (command.toLowerCase().startsWith('spark') || (!output && fs.existsSync(LOGS_FILE))) {
      await new Promise(r => setTimeout(r, 700));
      try {
        const tail = fs.readFileSync(LOGS_FILE, 'utf-8').slice(-5000);
        const sparkIndex = tail.lastIndexOf('[spark-');
        if (sparkIndex !== -1) {
          const sparkSlice = tail.substring(sparkIndex).split('\n')
            .filter(l => !l.includes('RCON Client') && !l.includes('RCON Listener'))
            .join('\n')
            .trim();
          if (sparkSlice) {
            return res.json({ success: true, command, output: (output ? output + '\n' : '') + sparkSlice });
          }
        }
      } catch (e) {}
    }

    res.json({ success: true, command, output: output || 'Comando ejecutado sin salida.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Acciones Rápidas del Servidor (Clima, Tiempo, Dificultad, Guardado, Mensajes)
app.post('/api/server/control', async (req, res) => {
  const { type, value } = req.body;
  let mcCommand = '';

  switch (type) {
    case 'weather':
      if (['clear', 'rain', 'thunder'].includes(value)) {
        mcCommand = `weather ${value}`;
      }
      break;
    case 'time':
      if (['day', 'noon', 'night', 'midnight'].includes(value)) {
        mcCommand = `time set ${value}`;
      }
      break;
    case 'difficulty':
      if (['peaceful', 'easy', 'normal', 'hard'].includes(value)) {
        mcCommand = `difficulty ${value}`;
      }
      break;
    case 'save':
      mcCommand = 'save-all flush';
      break;
    case 'broadcast':
      if (value && typeof value === 'string') {
        const sanitized = value.replace(/["\\]/g, '');
        mcCommand = `say §b[Servidor]§f ${sanitized}`;
      }
      break;
    case 'kick':
      if (value) {
        mcCommand = `kick ${value} Desconectado por el Administrador`;
      }
      break;
    default:
      return res.status(400).json({ error: 'Acción desconocida' });
  }

  if (!mcCommand) {
    return res.status(400).json({ error: 'Parámetro inválido' });
  }

  try {
    const output = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', mcCommand);
    res.json({ success: true, command: mcCommand, output: output || 'Acción aplicada correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, command: mcCommand, error: err.message });
  }
});

// Control de Energía (Reiniciar / Detener)
app.post('/api/server/power', async (req, res) => {
  const { action } = req.body;
  if (!['restart', 'stop'].includes(action)) {
    return res.status(400).json({ error: 'Acción inválida. Usa restart o stop.' });
  }

  try {
    // 1. Intentar enviar aviso y /stop por RCON
    try {
      await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', 'say §c[Servidor] El servidor se está reiniciando...');
      await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', 'save-all');
      await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', 'stop');
    } catch (e) {}

    if (action === 'stop') {
      return res.json({ success: true, message: 'Comando de detención enviado al servidor.' });
    }

    // 2. Si es restart, esperar a que termine el proceso y relanzar ./start.sh
    setTimeout(() => {
      try {
        const startScript = path.join(SERVER_DIR, 'start.sh');
        const child = spawn(startScript, [], {
          cwd: SERVER_DIR,
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } catch (e) {}
    }, 4000);

    res.json({ success: true, message: 'Servidor reiniciándose. RCON y nuevos mods se cargarán en unos segundos.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backups: Listar
app.get('/api/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json({ backups: [] });
    }
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          date: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ backups: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Backups: Crear nuevo
app.post('/api/backup', (req, res) => {
  const scriptPath = path.join(SERVER_DIR, 'backup.sh');
  exec(`"${scriptPath}"`, { cwd: SERVER_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

// Backups: Descargar archivo
app.get('/api/backups/download/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', 'application/gzip');
    return fs.createReadStream(filePath).pipe(res);
  }
  res.status(404).json({ error: 'Archivo de backup no encontrado' });
});

// Backups: Eliminar archivo
app.delete('/api/backups/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: `Backup ${safeFilename} eliminado.` });
    }
    res.status(404).json({ error: 'Archivo no encontrado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Playit: Iniciar
app.post('/api/playit/start', (req, res) => {
  const scriptPath = path.join(SERVER_DIR, 'start_playit.sh');
  exec(`"${scriptPath}"`, { cwd: SERVER_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

// Playit: Detener
app.post('/api/playit/stop', (req, res) => {
  try {
    execSync('pkill -x playit 2>/dev/null || true');
    res.json({ success: true, message: 'Demonio Playit detenido.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🐉 Panel Web Ice & Dragons v2.0 iniciado`);
  console.log(`  🌐 Acceso: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
