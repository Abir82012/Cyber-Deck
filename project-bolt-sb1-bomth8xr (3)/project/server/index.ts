import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as pty from 'node-pty';
import { join } from 'path';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const terminals = new Map();

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('ssh:connect', async (data) => {
    const { id, host, port, username, privateKey } = data;

    // Create SSH command
    const sshArgs = [
      '-o', 'StrictHostKeyChecking=no',
      '-p', port.toString(),
      `${username}@${host}`
    ];

    if (privateKey) {
      const keyPath = join(process.cwd(), '.ssh', `${id}_key`);
      // Write key to temporary file
      await fs.writeFile(keyPath, privateKey, { mode: 0o600 });
      sshArgs.unshift('-i', keyPath);
    }

    const term = pty.spawn('ssh', sshArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24
    });

    terminals.set(id, { term, keyPath: privateKey ? keyPath : null });

    term.onData((data) => {
      socket.emit('ssh:data', { id, data });
    });

    socket.on('ssh:data', ({ id: termId, data }) => {
      const terminal = terminals.get(termId);
      if (terminal) {
        terminal.term.write(data);
      }
    });

    socket.on('ssh:resize', ({ id: termId, cols, rows }) => {
      const terminal = terminals.get(termId);
      if (terminal) {
        terminal.term.resize(cols, rows);
      }
    });
  });

  socket.on('ssh:disconnect', async ({ id }) => {
    const terminal = terminals.get(id);
    if (terminal) {
      terminal.term.kill();
      if (terminal.keyPath) {
        await fs.unlink(terminal.keyPath);
      }
      terminals.delete(id);
    }
  });

  socket.on('disconnect', () => {
    // Cleanup all terminals for this socket
    for (const [id, terminal] of terminals.entries()) {
      terminal.term.kill();
      if (terminal.keyPath) {
        fs.unlink(terminal.keyPath).catch(console.error);
      }
      terminals.delete(id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SSH server listening on port ${PORT}`);
});