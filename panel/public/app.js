// Ice & Dragons - Panel Web Client Logic

// Elementos DOM
const statusDot = document.getElementById('status-indicator');
const statusLabel = document.getElementById('status-label');
const chunkyProgressBar = document.getElementById('chunky-progress-bar');
const chunkyPercent = document.getElementById('chunky-percent');
const chunkyChunksLabel = document.getElementById('chunky-chunks-label');
const chunkyRate = document.getElementById('chunky-rate');
const chunkyEta = document.getElementById('chunky-eta');
const chunkyCoords = document.getElementById('chunky-coords');
const chunkyDim = document.getElementById('chunky-dim');
const chunkyStateTag = document.getElementById('chunky-state-tag');

const mcRamText = document.getElementById('mc-ram-text');
const sysRamText = document.getElementById('sys-ram-text');
const ramProgressFill = document.getElementById('ram-progress-fill');
const mcCpuText = document.getElementById('mc-cpu-text');
const cpuProgressFill = document.getElementById('cpu-progress-fill');
const cpuCoresBadge = document.getElementById('cpu-cores-badge');

const playitStatusBadge = document.getElementById('playit-status-badge');
const playitAddressText = document.getElementById('playit-address-text');
const playitSubText = document.getElementById('playit-sub-text');
const playitActionContainer = document.getElementById('playit-action-container');

const terminalBody = document.getElementById('terminal-body');
const chkAutoscroll = document.getElementById('chk-autoscroll');
const commandForm = document.getElementById('command-form');
const commandInput = document.getElementById('command-input');
const btnClearConsole = document.getElementById('btn-clear-console');

const backupsTbody = document.getElementById('backups-tbody');
const btnQuickBackup = document.getElementById('btn-quick-backup');
const btnCreateBackupTab = document.getElementById('btn-create-backup-tab');
const btnRefresh = document.getElementById('btn-refresh');

const btnChunkyPause = document.getElementById('btn-chunky-pause');
const btnChunkyContinue = document.getElementById('btn-chunky-continue');

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Navegación por pestañas
const navButtons = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');
const currentTitle = document.getElementById('current-view-title');
const currentSub = document.getElementById('current-view-subtitle');

const titles = {
  overview: { title: 'Monitoreo & Pregeneración', sub: 'Supervisión en tiempo real del rendimiento, chunks y túneles' },
  console: { title: 'Consola del Servidor', sub: 'Registro en vivo de eventos y ejecución interactiva de comandos' },
  backups: { title: 'Copias de Seguridad', sub: 'Gestión y creación de respaldos comprimidos del mundo' },
  mods: { title: 'Mods & Servidor', sub: 'Estado de mods instalados y librerías activas' }
};

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    navButtons.forEach(b => b.classList.remove('active'));
    tabViews.forEach(v => v.classList.remove('active'));

    btn.classList.add('active');
    const view = document.getElementById(`view-${target}`);
    if (view) view.classList.add('active');

    if (titles[target]) {
      currentTitle.textContent = titles[target].title;
      currentSub.textContent = titles[target].sub;
    }

    if (target === 'backups') loadBackups();
    if (target === 'console') scrollToBottom();
  });
});

// 1. Obtener estado general
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    // Servidor online/offline
    if (data.online) {
      statusDot.className = 'status-dot online';
      statusLabel.textContent = 'En Línea';
      statusLabel.style.color = '#00e676';
    } else {
      statusDot.className = 'status-dot offline';
      statusLabel.textContent = 'Detenido';
      statusLabel.style.color = '#ff5252';
    }

    // RAM
    const mcRam = data.minecraft.ramMB;
    mcRamText.textContent = `${mcRam} MB`;
    const sysTotal = data.system.totalMemMB;
    const sysUsed = data.system.usedMemMB;
    sysRamText.textContent = `Sistema: ${sysUsed} / ${sysTotal} MB`;
    const ramPct = Math.min(100, Math.round((mcRam / 4096) * 100));
    ramProgressFill.style.width = `${ramPct}%`;

    // CPU
    mcCpuText.textContent = `${data.minecraft.cpu}%`;
    cpuCoresBadge.textContent = `${data.system.cpuCores} Cores`;
    cpuProgressFill.style.width = `${Math.min(100, Math.round(data.minecraft.cpu / data.system.cpuCores))}%`;

    // Playit
    if (data.playit.running) {
      playitStatusBadge.className = 'card-badge success';
      playitStatusBadge.textContent = 'En Ejecución';
      if (data.playit.address) {
        playitAddressText.textContent = data.playit.address;
        playitSubText.textContent = 'Túnel activo para jugadores';
      } else if (data.playit.claimUrl) {
        playitAddressText.innerHTML = `<a href="${data.playit.claimUrl}" target="_blank" style="color:#00d2ff; text-decoration:none; font-size:16px;">Vincular Túnel ↗</a>`;
        playitSubText.textContent = 'Haz clic para asociar tu cuenta';
      } else {
        playitAddressText.textContent = 'Iniciando túnel...';
      }
      playitActionContainer.innerHTML = `<span class="badge-tag success" style="margin:0;">Playit Conectado</span>`;
    } else {
      playitStatusBadge.className = 'card-badge';
      playitStatusBadge.textContent = 'Detenido';
      playitAddressText.textContent = 'Sin iniciar';
      playitSubText.textContent = 'Permite jugar sin abrir puertos';
      playitActionContainer.innerHTML = `<button class="btn btn-sm btn-primary" id="btn-start-playit">Iniciar Playit</button>`;
      document.getElementById('btn-start-playit')?.addEventListener('click', startPlayit);
    }

    // Actualizar Chunky
    if (data.chunky) {
      updateChunkyUI(data.chunky);
    }
  } catch (err) {
    statusDot.className = 'status-dot offline';
    statusLabel.textContent = 'Error Conexión';
  }
}

// 2. Actualizar interfaz de Chunky
function updateChunkyUI(chunky) {
  chunkyProgressBar.style.width = `${chunky.percent}%`;
  chunkyPercent.textContent = `${chunky.percent}%`;
  chunkyChunksLabel.textContent = `${chunky.chunks.toLocaleString()} / ${chunky.total.toLocaleString()} chunks`;
  chunkyRate.textContent = chunky.cps > 0 ? `${chunky.cps} cps` : '-- cps';
  chunkyEta.textContent = chunky.eta || '--:--:--';
  chunkyCoords.textContent = chunky.coords || '0, 0';

  if (chunky.dimension.includes('overworld')) {
    chunkyDim.textContent = 'Overworld';
  } else {
    chunkyDim.textContent = chunky.dimension;
  }

  if (chunky.running) {
    chunkyStateTag.className = 'badge-tag';
    chunkyStateTag.textContent = 'Pregeneración Activa';
    btnChunkyPause.disabled = false;
    btnChunkyContinue.disabled = true;
  } else {
    chunkyStateTag.className = 'badge-tag success';
    chunkyStateTag.textContent = 'Pausado / Guardado';
    btnChunkyPause.disabled = true;
    btnChunkyContinue.disabled = false;
  }
}

// Control Chunky
btnChunkyPause.addEventListener('click', async () => {
  btnChunkyPause.disabled = true;
  try {
    const res = await fetch('/api/chunky/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Tarea de Chunky pausada con éxito.', 'info');
      fetchStatus();
    } else {
      showToast('Error al pausar Chunky: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error de red al pausar', 'error');
  }
});

btnChunkyContinue.addEventListener('click', async () => {
  btnChunkyContinue.disabled = true;
  try {
    const res = await fetch('/api/chunky/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'continue' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Tarea de Chunky reanudada.', 'success');
      fetchStatus();
    } else {
      showToast('Error al continuar Chunky: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error de red al continuar', 'error');
  }
});

// Iniciar Playit
async function startPlayit() {
  showToast('Iniciando servicio de Playit.gg...', 'info');
  try {
    const res = await fetch('/api/playit/start', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Playit iniciado. Obteniendo enlace...', 'success');
      setTimeout(fetchStatus, 2000);
    } else {
      showToast('Error al iniciar Playit: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error al conectar con el backend', 'error');
  }
}

// 3. Consola y Logs
function formatLogLine(line) {
  if (!line.trim()) return '';
  let cssClass = 'info';
  if (line.includes('/WARN') || line.includes('[WARN]')) cssClass = 'warn';
  else if (line.includes('/ERROR') || line.includes('[ERROR]') || line.includes('Exception')) cssClass = 'error';
  else if (line.includes('[Chunky]')) cssClass = 'chunky';
  else if (line.includes('[Server]')) cssClass = 'system';

  // Escapar HTML básico
  const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="log-line ${cssClass}">${safe}</div>`;
}

function scrollToBottom() {
  if (chkAutoscroll.checked) {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }
}

async function loadInitialLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (data.logs) {
      terminalBody.innerHTML = data.logs.split('\n').map(formatLogLine).join('');
      scrollToBottom();
    }
  } catch (e) {}
}

// Conectar EventSource para SSE en logs
function setupLogStream() {
  const evtSource = new EventSource('/api/logs/stream');
  evtSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.lines) {
        const rendered = data.lines.split('\n').map(formatLogLine).join('');
        terminalBody.innerHTML = rendered;
        scrollToBottom();
      }
    } catch (err) {}
  };
}

// Enviar comandos RCON
commandForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cmd = commandInput.value.trim();
  if (!cmd) return;

  commandInput.value = '';
  // Mostrar comando en consola
  terminalBody.innerHTML += `<div class="log-line system">&gt; ${cmd}</div>`;
  scrollToBottom();

  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    if (data.success) {
      if (data.output) {
        terminalBody.innerHTML += `<div class="log-line info">${data.output}</div>`;
      }
      scrollToBottom();
    } else {
      terminalBody.innerHTML += `<div class="log-line error">[RCON Error] ${data.error}</div>`;
      scrollToBottom();
    }
  } catch (err) {
    terminalBody.innerHTML += `<div class="log-line error">[Error] No se pudo enviar el comando.</div>`;
    scrollToBottom();
  }
});

// Quick Chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    commandInput.value = chip.dataset.cmd;
    commandInput.focus();
  });
});

btnClearConsole.addEventListener('click', () => {
  terminalBody.innerHTML = '';
});

// 4. Backups
async function loadBackups() {
  try {
    const res = await fetch('/api/backups');
    const data = await res.json();
    if (!data.backups || data.backups.length === 0) {
      backupsTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-dim);">No hay copias de seguridad aún.</td></tr>`;
      return;
    }
    backupsTbody.innerHTML = data.backups.map(b => `
      <tr>
        <td class="code-font" style="color:var(--accent-cyan);">📁 ${b.name}</td>
        <td><strong>${b.sizeMB} MB</strong></td>
        <td style="color:var(--text-muted);">${new Date(b.date).toLocaleString()}</td>
        <td><span class="badge-tag success" style="margin:0;">Comprimido</span></td>
      </tr>
    `).join('');
  } catch (e) {
    backupsTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--accent-red);">Error al cargar backups.</td></tr>`;
  }
}

async function triggerBackup() {
  showToast('Iniciando proceso de backup del mundo...', 'info');
  try {
    const res = await fetch('/api/backup', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('¡Backup generado y rotado con éxito!', 'success');
      loadBackups();
    } else {
      showToast('Error al generar backup: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error de conexión al generar backup', 'error');
  }
}

btnQuickBackup.addEventListener('click', triggerBackup);
btnCreateBackupTab.addEventListener('click', triggerBackup);
btnRefresh.addEventListener('click', () => {
  fetchStatus();
  loadBackups();
  showToast('Datos actualizados', 'info');
});

// Inicialización
fetchStatus();
loadInitialLogs();
setupLogStream();
setInterval(fetchStatus, 3000);
