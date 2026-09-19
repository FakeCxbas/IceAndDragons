// ==============================================================================
// Ice & Dragons - Panel Web v2.0 Client Logic
// ==============================================================================

// Elementos DOM Principales
const statusDot = document.getElementById('status-indicator');
const statusLabel = document.getElementById('status-label');

// Chunky DOM
const chunkyProgressBar = document.getElementById('chunky-progress-bar');
const chunkyPercent = document.getElementById('chunky-percent');
const chunkyChunksLabel = document.getElementById('chunky-chunks-label');
const chunkyRate = document.getElementById('chunky-rate');
const chunkyEta = document.getElementById('chunky-eta');
const chunkyCoords = document.getElementById('chunky-coords');
const chunkyDim = document.getElementById('chunky-dim');
const chunkyStateTag = document.getElementById('chunky-state-tag');
const btnChunkyPause = document.getElementById('btn-chunky-pause');
const btnChunkyContinue = document.getElementById('btn-chunky-continue');

// Telemetría de Recursos
const mcCpuText = document.getElementById('mc-cpu-text');
const mcCpuSub = document.getElementById('mc-cpu-sub');
const cpuProgressFill = document.getElementById('cpu-progress-fill');
const cpuCoresBadge = document.getElementById('cpu-cores-badge');
const sysCpuText = document.getElementById('sys-cpu-text');

const mcRamText = document.getElementById('mc-ram-text');
const sysRamText = document.getElementById('sys-ram-text');
const ramProgressFill = document.getElementById('ram-progress-fill');
const ramPercentText = document.getElementById('ram-percent-text');

const diskFreeText = document.getElementById('disk-free-text');
const diskSubText = document.getElementById('disk-sub-text');
const diskBadge = document.getElementById('disk-badge');
const diskProgressFill = document.getElementById('disk-progress-fill');

const worldSizeText = document.getElementById('world-size-text');
const playersCountText = document.getElementById('players-count-text');
const playersBadge = document.getElementById('players-badge');

// Playit
const playitStatusBadge = document.getElementById('playit-status-badge');
const playitAddressText = document.getElementById('playit-address-text');
const playitSubText = document.getElementById('playit-sub-text');
const playitAltIp = document.getElementById('playit-alt-ip');
const playitActionContainer = document.getElementById('playit-action-container');

// TPS & Rendimiento
const tpsValue = document.getElementById('tps-value');
const tpsBadge = document.getElementById('tps-badge');
const msptText = document.getElementById('mspt-text');
const msptP95Text = document.getElementById('mspt-p95-text');
const tpsProgressFill = document.getElementById('tps-progress-fill');

// Controles Spark / Rendimiento
const btnPerfTick = document.getElementById('btn-perf-tick');
const btnPerfSparkTps = document.getElementById('btn-perf-spark-tps');
const btnPerfSparkHealth = document.getElementById('btn-perf-spark-health');
const btnPerfGc = document.getElementById('btn-perf-gc');
const diagOutputBox = document.getElementById('diag-output-box');
const diagOutputText = document.getElementById('diag-output-text');
const btnCloseDiag = document.getElementById('btn-close-diag');

// Consola y Logs
const terminalBody = document.getElementById('terminal-body');
const chkAutoscroll = document.getElementById('chk-autoscroll');
const commandForm = document.getElementById('command-form');
const commandInput = document.getElementById('command-input');
const btnClearConsole = document.getElementById('btn-clear-console');
const logSearchInput = document.getElementById('log-search-input');
const filterChips = document.querySelectorAll('.filter-chip');

// Backups
const backupsTbody = document.getElementById('backups-tbody');
const btnQuickBackup = document.getElementById('btn-quick-backup');
const btnCreateBackupTab = document.getElementById('btn-create-backup-tab');
const btnRefresh = document.getElementById('btn-refresh');

// Controles del Servidor
const broadcastForm = document.getElementById('broadcast-form');
const broadcastInput = document.getElementById('broadcast-input');
const btnSaveFlush = document.getElementById('btn-save-flush');
const btnChunkyTrim = document.getElementById('btn-chunky-trim');
const btnRestartServer = document.getElementById('btn-restart-server');
const btnStopServer = document.getElementById('btn-stop-server');

// Memoria local de logs para filtrado
let rawLogLines = [];
let activeLogFilter = 'all';
let logSearchQuery = '';

// ==============================================================================
// 1. Toast Notifications
// ==============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==============================================================================
// 2. Navegación por Pestañas
// ==============================================================================
const navButtons = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');
const currentTitle = document.getElementById('current-view-title');
const currentSub = document.getElementById('current-view-subtitle');

const titles = {
  overview: { title: 'Monitoreo & Pregeneración', sub: 'Supervisión en tiempo real del rendimiento, chunks y recursos' },
  controls: { title: 'Controles del Servidor', sub: 'Acciones inmediatas sobre clima, tiempo, dificultad y mantenimiento' },
  console: { title: 'Consola del Servidor', sub: 'Registro en vivo de eventos y ejecución interactiva de comandos' },
  backups: { title: 'Copias de Seguridad', sub: 'Gestión, creación y descarga de respaldos comprimidos del mundo' },
  mods: { title: 'Mods & Sistema', sub: 'Estado de mods instalados y librerías multihilo activas' }
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

// ==============================================================================
// 3. Telemetría y Estado del Servidor
// ==============================================================================
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

    // CPU Normalizada y Detalle de Cores
    if (data.minecraft && data.minecraft.cpu) {
      const cpu = data.minecraft.cpu;
      mcCpuText.textContent = `${cpu.normalized}%`;
      cpuCoresBadge.textContent = `${data.system.cpuCores} Cores`;
      mcCpuSub.textContent = `${cpu.coresUsed} de ${data.system.cpuCores} núcleos activos (${cpu.raw}% Linux)`;
      cpuProgressFill.style.width = `${Math.min(100, cpu.normalized)}%`;
      sysCpuText.textContent = `${data.system.systemCpuPercent || 0}%`;
    }

    // RAM
    if (data.minecraft && data.system) {
      const ramMB = data.minecraft.ramMB || 0;
      mcRamText.textContent = `${(ramMB / 1024).toFixed(2)} GB`;
      ramPercentText.textContent = `${data.minecraft.ramPercent}%`;
      ramProgressFill.style.width = `${data.minecraft.ramPercent}%`;
      
      const sysUsedGB = (data.system.usedMemMB / 1024).toFixed(1);
      const sysTotalGB = (data.system.totalMemMB / 1024).toFixed(1);
      sysRamText.textContent = `Sistema: ${sysUsedGB} / ${sysTotalGB} GB (${data.system.memPercent}%)`;
    }

    // Disco Duro
    if (data.disk) {
      diskFreeText.textContent = `${data.disk.freeGB} GB Libres`;
      diskSubText.textContent = `Total: ${data.disk.totalGB} GB | Usado: ${data.disk.usedGB} GB`;
      diskBadge.textContent = `${data.disk.percent}% Usado`;
      diskProgressFill.style.width = `${data.disk.percent}%`;
      if (data.disk.percent > 85) {
        diskProgressFill.className = 'card-progress-fill danger';
      } else {
        diskProgressFill.className = 'card-progress-fill';
      }
    }

    // Tamaño del Mundo
    if (data.world) {
      worldSizeText.textContent = `${data.world.sizeGB} GB`;
    }

    // Jugadores Online
    if (data.minecraft && data.minecraft.players) {
      const p = data.minecraft.players;
      playersCountText.textContent = `${p.count} Online`;
      playersBadge.textContent = `${p.count} / ${p.max} Jugadores`;
    }

    // Rendimiento y TPS (Spark & Tick Query)
    if (data.minecraft && data.minecraft.tps) {
      const tps = data.minecraft.tps;
      if (tpsValue) {
        tpsValue.innerHTML = `${tps.tps.toFixed(1)} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">TPS</span>`;
      }
      if (tpsBadge) {
        tpsBadge.textContent = tps.status || `${tps.tps.toFixed(1)} TPS`;
        if (tps.tps >= 19.5) {
          tpsBadge.className = 'card-badge success';
        } else if (tps.tps >= 15.0) {
          tpsBadge.className = 'card-badge warning';
        } else {
          tpsBadge.className = 'card-badge danger';
        }
      }
      if (msptText) msptText.textContent = `${tps.mspt.toFixed(1)} ms`;
      if (msptP95Text) msptP95Text.textContent = `${tps.percentiles?.p95 ? tps.percentiles.p95.toFixed(1) : tps.mspt.toFixed(1)} ms`;
      
      if (tpsProgressFill) {
        const budgetPercent = Math.min(100, Math.round((tps.mspt / 50.0) * 100));
        tpsProgressFill.style.width = `${Math.max(15, budgetPercent)}%`;
        if (budgetPercent <= 65) {
          tpsProgressFill.className = 'card-progress-fill success';
        } else if (budgetPercent <= 85) {
          tpsProgressFill.className = 'card-progress-fill warning';
        } else {
          tpsProgressFill.className = 'card-progress-fill danger';
        }
      }
    }

    // Playit
    if (data.playit.running) {
      playitStatusBadge.className = 'card-badge success';
      playitStatusBadge.textContent = 'En Ejecución';
      if (data.playit.address) {
        playitAddressText.textContent = data.playit.address;
        playitSubText.textContent = 'Túnel activo para jugadores';
        if (playitAltIp && data.playit.ipPort) {
          playitAltIp.textContent = data.playit.ipPort;
        }
      } else if (data.playit.claimUrl) {
        playitAddressText.innerHTML = `<a href="${data.playit.claimUrl}" target="_blank" style="color:#00d2ff; text-decoration:underline; font-weight:bold;">Vincular Túnel ↗</a>`;
        playitSubText.textContent = 'Haz clic para asociar tu cuenta';
      } else {
        playitAddressText.textContent = 'Iniciando túnel...';
      }
      playitActionContainer.innerHTML = `
        <button class="btn btn-sm btn-secondary" id="btn-copy-ip" title="Copiar dirección">📋 Copiar</button>
        <button class="btn btn-sm btn-ghost" id="btn-stop-playit">Detener</button>
      `;
      document.getElementById('btn-stop-playit')?.addEventListener('click', stopPlayit);
      document.getElementById('btn-copy-ip')?.addEventListener('click', () => {
        const toCopy = data.playit.address || data.playit.ipPort || '';
        if (toCopy) {
          navigator.clipboard.writeText(toCopy).then(() => {
            showToast(`¡Dirección copiada: ${toCopy}!`, 'success');
          }).catch(() => {
            showToast(`Dirección: ${toCopy}`, 'info');
          });
        }
      });
    } else {
      playitStatusBadge.className = 'card-badge';
      playitStatusBadge.textContent = 'Detenido';
      playitAddressText.textContent = 'Sin iniciar';
      playitSubText.textContent = 'Permite jugar sin abrir puertos';
      if (playitAltIp) playitAltIp.textContent = '--';
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

// 4. Actualizar interfaz de Chunky
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

// Controles Chunky
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
      showToast('Aviso: ' + (data.error.includes('ECONNREFUSED') ? 'RCON no activo. Se activará al reiniciar el servidor.' : data.error), 'info');
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
      showToast('Aviso: ' + (data.error.includes('ECONNREFUSED') ? 'RCON no activo. Se activará al reiniciar el servidor.' : data.error), 'info');
    }
  } catch (e) {
    showToast('Error de red al continuar', 'error');
  }
});

// Chunky Trim
btnChunkyTrim?.addEventListener('click', async () => {
  if (!confirm('¿Deseas recortar los chunks fuera de la selección actual? Esto liberará espacio en disco borrando chunks generados por error fuera del radio.')) return;
  try {
    const res = await fetch('/api/chunky/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trim' })
    });
    const data = await res.json();
    showToast(data.success ? 'Comando trim ejecutado.' : 'Aviso: RCON se activará al reiniciar el servidor.', 'info');
  } catch (e) {
    showToast('Error al enviar trim', 'error');
  }
});

// ==============================================================================
// 4. Controles del Servidor (Clima, Tiempo, Dificultad, Guardado, Broadcast)
// ==============================================================================
document.querySelectorAll('.btn-action').forEach(btn => {
  btn.addEventListener('click', async () => {
    const type = btn.dataset.action;
    const value = btn.dataset.val;
    if (!type || !value) return;

    try {
      const res = await fetch('/api/server/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Comando ejecutado: ${data.command}`, 'success');
      } else {
        const msg = data.error.includes('ECONNREFUSED')
          ? 'ℹ️ RCON configurado en puerto 25575. Se activará en cuanto reinicies el servidor.'
          : data.error;
        showToast(msg, 'info');
      }
    } catch (e) {
      showToast('Error de conexión al enviar acción.', 'error');
    }
  });
});

// Diagnósticos de Rendimiento (Spark & Tick Query)
async function runDiagCommand(cmdName, command) {
  try {
    showToast(`Ejecutando ${cmdName}...`, 'info');
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await res.json();
    if (data.success) {
      if (diagOutputBox && diagOutputText) {
        diagOutputBox.style.display = 'block';
        diagOutputText.textContent = `> ${command}\n` + (data.output || 'Comando completado exitosamente.');
      }
      showToast(`${cmdName} ejecutado con éxito`, 'success');
      fetchStatus();
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error de red al ejecutar ${cmdName}`, 'error');
  }
}

btnPerfTick?.addEventListener('click', () => runDiagCommand('Tick Query', 'tick query'));
btnPerfSparkTps?.addEventListener('click', () => runDiagCommand('Spark TPS', 'spark tps'));
btnPerfSparkHealth?.addEventListener('click', () => runDiagCommand('Spark Health', 'spark health'));
btnPerfGc?.addEventListener('click', () => runDiagCommand('Limpieza RAM (GC)', 'spark gc'));
btnCloseDiag?.addEventListener('click', () => {
  if (diagOutputBox) diagOutputBox.style.display = 'none';
});

// Guardar Mundo Forzado
btnSaveFlush?.addEventListener('click', async () => {
  btnSaveFlush.disabled = true;
  try {
    const res = await fetch('/api/server/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'save' })
    });
    const data = await res.json();
    showToast(data.success ? 'Mundo guardado forzadamente a disco (/save-all flush).' : 'Aviso: RCON se activará al reiniciar el servidor.', 'info');
  } catch (e) {
    showToast('Error al forzar guardado', 'error');
  } finally {
    btnSaveFlush.disabled = false;
  }
});

// Transmisión de Mensaje Global (Broadcast)
broadcastForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = broadcastInput.value.trim();
  if (!text) return;

  try {
    const res = await fetch('/api/server/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'broadcast', value: text })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Mensaje global transmitido.', 'success');
      broadcastInput.value = '';
    } else {
      showToast('Aviso: ' + (data.error.includes('ECONNREFUSED') ? 'RCON se activará al reiniciar el servidor.' : data.error), 'info');
    }
  } catch (e) {
    showToast('Error al transmitir mensaje.', 'error');
  }
});

// Control de Energía (Reiniciar / Detener)
btnRestartServer?.addEventListener('click', async () => {
  if (!confirm('¿Deseas reiniciar el servidor de Minecraft?\n\n- Se guardará el mundo y se cerrará de forma segura.\n- Al volver a iniciar, RCON quedará activado en el puerto 25575.\n- Se cargarán en memoria los 7 nuevos mods instalados.\n- Chunky reanudará automáticamente la pregeneración.')) return;
  
  btnRestartServer.disabled = true;
  showToast('Iniciando proceso de reinicio...', 'info');
  try {
    const res = await fetch('/api/server/power', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart' })
    });
    const data = await res.json();
    showToast(data.message, 'success');
  } catch (e) {
    showToast('Error al enviar orden de reinicio.', 'error');
  } finally {
    setTimeout(() => { btnRestartServer.disabled = false; }, 8000);
  }
});

btnStopServer?.addEventListener('click', async () => {
  if (!confirm('¿Deseas detener el servidor de Minecraft de forma segura?')) return;
  btnStopServer.disabled = true;
  try {
    const res = await fetch('/api/server/power', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' })
    });
    const data = await res.json();
    showToast(data.message, 'info');
  } catch (e) {
    showToast('Error al enviar orden de detención.', 'error');
  } finally {
    btnStopServer.disabled = false;
  }
});

// ==============================================================================
// 5. Consola y Streaming de Logs con Búsqueda y Filtros
// ==============================================================================
function scrollToBottom() {
  if (chkAutoscroll.checked) {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }
}

function renderFilteredLogs() {
  terminalBody.innerHTML = '';
  const query = logSearchQuery.toLowerCase();

  rawLogLines.forEach(line => {
    if (!line.trim()) return;

    // Filtro por chip
    if (activeLogFilter === 'chunky' && !line.includes('[Chunky]')) return;
    if (activeLogFilter === 'warn' && !line.includes('/WARN')) return;
    if (activeLogFilter === 'error' && !line.includes('/ERROR')) return;

    // Filtro por texto de búsqueda
    if (query && !line.toLowerCase().includes(query)) return;

    appendLogLine(line);
  });

  scrollToBottom();
}

function appendLogLine(text) {
  const div = document.createElement('div');
  div.className = 'log-line';

  if (text.includes('[Chunky]')) div.classList.add('chunky');
  if (text.includes('/WARN')) div.classList.add('warn');
  if (text.includes('/ERROR')) div.classList.add('error');
  if (text.includes('joined the game') || text.includes('left the game')) div.classList.add('join');

  div.textContent = text;
  terminalBody.appendChild(div);

  // Límite de líneas en el DOM para evitar lentitud
  if (terminalBody.childNodes.length > 500) {
    terminalBody.removeChild(terminalBody.firstChild);
  }
}

// Búsqueda en logs
logSearchInput?.addEventListener('input', (e) => {
  logSearchQuery = e.target.value;
  renderFilteredLogs();
});

// Filtro por chip
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeLogFilter = chip.dataset.filter;
    renderFilteredLogs();
  });
});

btnClearConsole.addEventListener('click', () => {
  terminalBody.innerHTML = '<div class="log-line info">Consola limpiada manualmente.</div>';
  rawLogLines = [];
});

// Inicializar SSE para logs en tiempo real
function initLogStream() {
  const eventSource = new EventSource('/api/logs/stream');
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.lines) {
        const newLines = data.lines.split('\n').filter(Boolean);
        newLines.forEach(l => {
          if (!rawLogLines.includes(l)) {
            rawLogLines.push(l);
            if (rawLogLines.length > 600) rawLogLines.shift();

            // Renderizar si pasa el filtro actual
            const query = logSearchQuery.toLowerCase();
            let pass = true;
            if (activeLogFilter === 'chunky' && !l.includes('[Chunky]')) pass = false;
            if (activeLogFilter === 'warn' && !l.includes('/WARN')) pass = false;
            if (activeLogFilter === 'error' && !l.includes('/ERROR')) pass = false;
            if (query && !l.toLowerCase().includes(query)) pass = false;

            if (pass) {
              appendLogLine(l);
              scrollToBottom();
            }
          }
        });
      }
    } catch (e) {}
  };

  eventSource.onerror = () => {
    setTimeout(initLogStream, 5000);
  };
}

// Cargar logs iniciales
async function loadInitialLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (data.logs) {
      terminalBody.innerHTML = '';
      rawLogLines = data.logs.split('\n').filter(Boolean);
      renderFilteredLogs();
    }
  } catch (e) {}
}

// Enviar comandos RCON desde la consola
commandForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cmd = commandInput.value.trim();
  if (!cmd) return;

  appendLogLine(`> /${cmd}`);
  scrollToBottom();
  commandInput.value = '';

  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    if (data.success && data.output) {
      data.output.split('\n').forEach(l => appendLogLine(l));
      scrollToBottom();
    } else if (!data.success) {
      const err = data.error.includes('ECONNREFUSED')
        ? 'Aviso: RCON configurado en puerto 25575. Se activará al reiniciar el servidor.'
        : data.error;
      appendLogLine(`[RCON Error]: ${err}`);
      scrollToBottom();
    }
  } catch (err) {
    appendLogLine(`[Error]: Error de conexión al enviar comando.`);
    scrollToBottom();
  }
});

// Chips de comandos rápidos
document.querySelectorAll('.quick-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    commandInput.value = chip.dataset.cmd;
    commandInput.focus();
  });
});

// ==============================================================================
// 6. Copias de Seguridad (Backups)
// ==============================================================================
async function loadBackups() {
  try {
    const res = await fetch('/api/backups');
    const data = await res.json();

    if (!data.backups || data.backups.length === 0) {
      backupsTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-dim);">No hay copias de seguridad guardadas. Haz clic en Generar Backup Ahora.</td></tr>`;
      return;
    }

    backupsTbody.innerHTML = '';
    data.backups.forEach(b => {
      const tr = document.createElement('tr');
      const dateStr = new Date(b.date).toLocaleString();
      tr.innerHTML = `
        <td class="code-font" style="color:#00d2ff;">${b.name}</td>
        <td><strong>${b.sizeMB} MB</strong></td>
        <td>${dateStr}</td>
        <td>
          <a href="/api/backups/download/${encodeURIComponent(b.name)}" class="btn btn-sm btn-primary btn-table-action" download>
            📥 Descargar
          </a>
          <button class="btn btn-sm btn-danger btn-table-action" onclick="deleteBackup('${b.name}')">
            🗑️ Eliminar
          </button>
        </td>
      `;
      backupsTbody.appendChild(tr);
    });
  } catch (e) {
    backupsTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:#ff5252;">Error al cargar copias de seguridad.</td></tr>`;
  }
}

async function triggerBackup() {
  btnQuickBackup.disabled = true;
  btnCreateBackupTab.disabled = true;
  showToast('Generando copia de seguridad comprimida del mundo...', 'info');

  try {
    const res = await fetch('/api/backup', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('¡Copia de seguridad generada con éxito!', 'success');
      loadBackups();
    } else {
      showToast('Error al crear copia: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error de red al ejecutar backup.', 'error');
  } finally {
    btnQuickBackup.disabled = false;
    btnCreateBackupTab.disabled = false;
  }
}

window.deleteBackup = async function(filename) {
  if (!confirm(`¿Deseas eliminar permanentemente el archivo de backup ${filename}?`)) return;
  try {
    const res = await fetch(`/api/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Backup ${filename} eliminado.`, 'info');
      loadBackups();
    } else {
      showToast('Error al eliminar: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error al eliminar backup', 'error');
  }
};

btnQuickBackup.addEventListener('click', triggerBackup);
btnCreateBackupTab.addEventListener('click', triggerBackup);

// ==============================================================================
// 7. Playit Actions
// ==============================================================================
async function startPlayit() {
  try {
    showToast('Iniciando Playit.gg...', 'info');
    const res = await fetch('/api/playit/start', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Playit iniciado. Obteniendo enlace de reclamo...', 'success');
      setTimeout(fetchStatus, 2000);
    }
  } catch (e) {
    showToast('Error al iniciar Playit', 'error');
  }
}

async function stopPlayit() {
  if (!confirm('¿Deseas detener el túnel de Playit? Los jugadores remotos no podrán conectarse.')) return;
  try {
    const res = await fetch('/api/playit/stop', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Túnel Playit detenido.', 'info');
      setTimeout(fetchStatus, 1000);
    }
  } catch (e) {
    showToast('Error al detener Playit', 'error');
  }
}

// Botón refrescar
btnRefresh.addEventListener('click', () => {
  fetchStatus();
  showToast('Telemetría actualizada.', 'info');
});

// Inicialización
fetchStatus();
loadInitialLogs();
initLogStream();
loadBackups();

// Intervalo de actualización automática cada 3 segundos
setInterval(fetchStatus, 3000);
