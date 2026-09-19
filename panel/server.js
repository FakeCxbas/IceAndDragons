const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execSync } = require('child_process');
const { sendRconCommand } = require('./rcon');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_DIR = path.resolve(__dirname, '..');
const LOGS_FILE = path.join(SERVER_DIR, 'logs', 'latest.log');
const CHUNKY_TASK_FILE = path.join(SERVER_DIR, 'config', 'chunky', 'tasks', 'minecraft', 'overworld.properties');
const PLAYIT_LOG_FILE = path.join(SERVER_DIR, 'playit.log');
const BACKUPS_DIR = path.join(SERVER_DIR, 'backups');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cache en memoria para seguimiento de logs
let lastLogSize = 0;
try {
  if (fs.existsSync(LOGS_FILE)) {
    lastLogSize = fs.statSync(LOGS_FILE).size;
  }
} catch (e) {}

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

  // 1. Leer task file si existe
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

  // 2. Parsear últimas líneas de logs/latest.log para datos en vivo
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const logsTail = execSync(`tail -n 80 "${LOGS_FILE}" 2>/dev/null`, { encoding: 'utf-8' });
      const logLines = logsTail.split('\n');
      
      for (let i = logLines.length - 1; i >= 0; i--) {
        const line = logLines[i];
        if (line.includes('[Chunky] Task running for')) {
          progress.running = true;
          // Formato: Processed: 760749 chunks (48,61%), ETA: 7:16:48, Rate: 30,7 cps, Current: 471, 1
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

// 1. Estado general del servidor y recursos
app.get('/api/status', (req, res) => {
  let isRunning = false;
  let pid = null;
  let cpuPercent = 0;
  let memMB = 0;

  try {
    const pgrep = execSync(`pgrep -f "server_1.21.1.jar" 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (pgrep) {
      isRunning = true;
      pid = pgrep.split('\n')[0];
      const psOut = execSync(`ps -p ${pid} -o %cpu,rss --no-headers 2>/dev/null`, { encoding: 'utf-8' }).trim();
      if (psOut) {
        const [cpu, rss] = psOut.split(/\s+/);
        cpuPercent = parseFloat(cpu) || 0;
        memMB = Math.round((parseInt(rss) || 0) / 1024);
      }
    }
  } catch (e) {}

  // Playit status
  let playitRunning = false;
  let playitClaimUrl = null;
  let playitAddress = null;

  try {
    const playitPgrep = execSync(`pgrep -x playit 2>/dev/null`, { encoding: 'utf-8' }).trim();
    if (playitPgrep) playitRunning = true;
    
    if (fs.existsSync(PLAYIT_LOG_FILE)) {
      const playitLog = fs.readFileSync(PLAYIT_LOG_FILE, 'utf-8');
      const claimMatch = playitLog.match(/https:\/\/playit\.gg\/claim\/[a-f0-9]{6,12}/i);
      if (claimMatch) playitClaimUrl = claimMatch[0];

      const addrMatch = playitLog.match(/tunnel\s+registered:\s+([a-zA-Z0-9\.\-]+:\d+)/i);
      if (addrMatch) playitAddress = addrMatch[1];
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
      cpu: cpuPercent,
      ramMB: memMB,
      ramAllocated: '4G'
    },
    system: {
      totalMemMB: totalSysMem,
      usedMemMB: usedSysMem,
      cpuCores: os.cpus().length,
      platform: os.platform(),
      uptimeSeconds: Math.round(os.uptime())
    },
    playit: {
      running: playitRunning,
      claimUrl: playitClaimUrl,
      address: playitAddress
    },
    chunky: getChunkyProgress()
  });
});

// 2. Progreso de Chunky
app.get('/api/chunky', (req, res) => {
  res.json(getChunkyProgress());
});

// 3. Control de Chunky (Pausar / Continuar)
app.post('/api/chunky/control', async (req, res) => {
  const { action } = req.body;
  const cmd = action === 'pause' ? 'chunky pause' : 'chunky continue';
  try {
    const output = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', cmd);
    res.json({ success: true, action, output });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Últimos logs
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

// 5. Streaming de Logs en vivo (SSE)
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let lastLinesCount = 0;

  const interval = setInterval(() => {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        const lines = execSync(`tail -n 25 "${LOGS_FILE}" 2>/dev/null`, { encoding: 'utf-8' });
        res.write(`data: ${JSON.stringify({ lines })}\n\n`);
      }
    } catch (e) {}
  }, 1500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// 6. Enviar comando RCON
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Comando vacío' });

  try {
    const output = await sendRconCommand('127.0.0.1', 25575, 'IceAndDragons2026!', command);
    res.json({ success: true, command, output: output || 'Comando ejecutado sin salida.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Backups
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

app.post('/api/backup', (req, res) => {
  const scriptPath = path.join(SERVER_DIR, 'backup.sh');
  exec(`"${scriptPath}"`, { cwd: SERVER_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

// 8. Playit Iniciar
app.post('/api/playit/start', (req, res) => {
  const scriptPath = path.join(SERVER_DIR, 'start_playit.sh');
  exec(`"${scriptPath}"`, { cwd: SERVER_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  🐉 Panel Web Ice & Dragons iniciado`);
  console.log(`  🌐 Acceso: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
