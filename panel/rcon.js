const net = require('net');

/**
 * Envía un comando al servidor Minecraft vía RCON (Source RCON Protocol)
 * @param {string} host Host RCON (127.0.0.1)
 * @param {number} port Puerto RCON (25575)
 * @param {string} password Contraseña RCON
 * @param {string} command Comando a ejecutar
 * @param {number} timeout Tiempo límite en ms
 * @returns {Promise<string>} Salida del comando
 */
function sendRconCommand(host = '127.0.0.1', port = 25575, password = 'IceAndDragons2026!', command = '', timeout = 4000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let authed = false;
    let responseData = '';

    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error('Tiempo de espera agotado al conectar por RCON (¿el servidor está iniciado?)'));
    }, timeout);

    client.connect(port, host, () => {
      // Paquete de autenticación (Tipo 3 = SERVERDATA_AUTH)
      sendPacket(1, 3, password);
    });

    function sendPacket(id, type, body) {
      const payload = Buffer.from(body, 'utf-8');
      const length = payload.length + 10;
      const buffer = Buffer.alloc(length + 4);
      buffer.writeInt32LE(length, 0);
      buffer.writeInt32LE(id, 4);
      buffer.writeInt32LE(type, 8);
      payload.copy(buffer, 12);
      buffer.writeInt8(0, length + 2);
      buffer.writeInt8(0, length + 3);
      client.write(buffer);
    }

    client.on('data', (data) => {
      if (data.length < 12) return;
      const reqId = data.readInt32LE(4);

      if (!authed) {
        if (reqId === -1) {
          clearTimeout(timer);
          client.destroy();
          return reject(new Error('Contraseña RCON incorrecta'));
        }
        authed = true;
        // Paquete de ejecución (Tipo 2 = SERVERDATA_EXECCOMMAND)
        sendPacket(2, 2, command);
      } else {
        const body = data.slice(12, data.length - 2).toString('utf-8');
        responseData += body;
        clearTimeout(timer);
        client.destroy();
        resolve(responseData.trim());
      }
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = { sendRconCommand };
