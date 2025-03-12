import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebglAddon } from 'xterm-addon-webgl';
import VMManager from '../services/VMManager';
import 'xterm/css/xterm.css';

interface VMTerminalProps {
  vmId: string;
  onClose: () => void;
}

interface VMState {
  status: 'initializing' | 'ready' | 'error' | 'ssh-ready';
  error?: string;
  sshInfo?: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
}

export function VMTerminal({ vmId, onClose }: VMTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const emulatorRef = useRef<any>(null);
  const [vmState, setVMState] = useState<VMState>({ status: 'initializing' });
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const vmManager = VMManager.getInstance();
    let isTerminalMounted = true;

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

      // Get VM configuration
      const vm = await vmManager.getVM(vmId);
      if (!vm) {
        throw new Error('VM not found');
      }

      // Update last accessed timestamp
      await vmManager.updateLastAccessed(vmId);

      // Load OS image
      const osImage = await vmManager.getOSImage(vm.os);
      if (!osImage) {
        throw new Error('OS image not found');
      }

      // Initialize V86 emulator
      await initializeV86(term, osImage, vm);

      return term;
    };

    const initializeV86 = async (term: Terminal, osImage: ArrayBuffer, vm: any) => {
      try {
        await loadV86();
        
        if (!isTerminalMounted) return;

        const emulator = new (window as any).V86Starter({
          memory_size: 512 * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          screen_container: null,
          bios: { 
            url: 'https://copy.sh/v86/bios/seabios.bin',
            async: true
          },
          vga_bios: { 
            url: 'https://copy.sh/v86/bios/vgabios.bin',
            async: true
          },
          initial_state: { 
            url: osImage,
          },
          network_relay_url: vm.torEnabled ? 
            'wss://tor-relay.cyberdeck.local/' : 
            'wss://relay.widgetry.org/',
          autostart: true,
          disable_mouse: true,
          disable_keyboard: false,
          uart0: true,
          networking_proxy: true,
          mac_address_translation: true,
        });

        emulatorRef.current = emulator;

        // Setup terminal input handling
        term.onData((data) => {
          if (emulator && emulator.serial0_send) {
            emulator.serial0_send(data);
          }
        });

        // Setup emulator event listeners
        emulator.add_listener('serial0-output-char', (char: string) => {
          if (isTerminalMounted && term) {
            term.write(char);
          }
        });

        emulator.add_listener('emulator-ready', () => {
          if (isTerminalMounted) {
            setVMState({ status: 'ready' });
          }
        });

        // Add error handling listeners
        emulator.add_listener('emulator-stopped', () => {
          if (isTerminalMounted) {
            setVMState({ 
              status: 'error', 
              error: 'VM has stopped unexpectedly' 
            });
          }
        });

      } catch (error) {
        const errorMessage = (error as Error).message;
        setVMState({ status: 'error', error: errorMessage });
        term.writeln(`\x1B[31mError initializing VM: ${errorMessage}\x1B[0m`);
        console.error('VM initialization error:', error);
      }
    };

    const cleanup = () => {
      isTerminalMounted = false;

      if (emulatorRef.current) {
        try {
          emulatorRef.current.stop();
          emulatorRef.current.destroy();
        } catch (e) {
          console.warn('Error during emulator cleanup:', e);
        }
      }

      if (iframeRef.current && iframeRef.current.parentNode) {
        iframeRef.current.parentNode.removeChild(iframeRef.current);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };

    initializeTerminal().catch(console.error);
    return cleanup;
  }, [vmId]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8 w-full max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-yellow-500">Secure VM Terminal</h2>
          <button
            onClick={onClose}
            className="text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div className="w-full h-[600px] bg-black rounded-lg overflow-hidden border border-yellow-500/20">
            <div ref={terminalRef} className="w-full h-full" />
          </div>

          {vmState.status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
              <p className="font-mono text-sm">Error: {vmState.error}</p>
            </div>
          )}

          {vmState.status === 'ready' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-500">
              <p className="font-mono text-sm">VM is running</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}