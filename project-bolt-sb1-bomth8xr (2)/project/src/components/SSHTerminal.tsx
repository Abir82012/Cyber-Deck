import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebglAddon } from 'xterm-addon-webgl';
import { Socket } from 'socket.io-client';
import SSHManager from '../services/SSHManager';
import 'xterm/css/xterm.css';

interface SSHTerminalProps {
  connectionId: string;
  onClose: () => void;
}

export function SSHTerminal({ connectionId, onClose }: SSHTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const initializeTerminal = async () => {
      if (!terminalRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#000000',
          foreground: '#f0f0f0',
          cursor: '#f0f0f0',
          selection: 'rgba(255, 255, 255, 0.3)',
          black: '#000000',
          red: '#e06c75',
          green: '#98c379',
          yellow: '#d19a66',
          blue: '#61afef',
          magenta: '#c678dd',
          cyan: '#56b6c2',
          white: '#f0f0f0',
        },
        rows: 24,
        cols: 80,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const webglAddon = new WebglAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(webglAddon);

      fitAddonRef.current = fitAddon;
      terminalInstance.current = term;

      term.open(terminalRef.current);
      setTimeout(() => fitAddon.fit(), 100);

      // Connect to SSH server
      const sshManager = SSHManager.getInstance();
      const socket = await sshManager.connect(connectionId);
      socketRef.current = socket;

      // Handle terminal input
      term.onData((data) => {
        socket.emit('ssh:data', { id: connectionId, data });
      });

      // Handle SSH data
      socket.on('ssh:data', (data) => {
        term.write(data);
      });

      // Handle resize
      term.onResize(({ cols, rows }) => {
        socket.emit('ssh:resize', { id: connectionId, cols, rows });
      });

      // Handle window resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(terminalRef.current);

      return () => {
        resizeObserver.disconnect();
        socket.disconnect();
        term.dispose();
      };
    };

    initializeTerminal();

    return () => {
      if (socketRef.current) {
        const sshManager = SSHManager.getInstance();
        sshManager.disconnect(connectionId);
      }
    };
  }, [connectionId]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8 w-full max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-yellow-500">Secure SSH Terminal</h2>
          <button
            onClick={onClose}
            className="text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="w-full h-[600px] bg-black rounded-lg overflow-hidden border border-yellow-500/20">
          <div ref={terminalRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}