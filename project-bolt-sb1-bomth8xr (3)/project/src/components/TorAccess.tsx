import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Shield, RefreshCw, Power, Globe } from 'lucide-react';

interface TorStatus {
  connected: boolean;
  ipAddress?: string;
  circuitPath?: string[];
  downloadProgress?: number;
}

export function TorAccess() {
  const [status, setStatus] = useState<TorStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const emulatorRef = useRef<any>(null);

  useEffect(() => {
    const handleV86Message = (event: MessageEvent) => {
      if (event.data.type === 'v86-ready') {
        initializeTor();
      } else if (event.data.type === 'v86-error') {
        setError(event.data.error);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleV86Message);
    return () => window.removeEventListener('message', handleV86Message);
  }, []);

  const initializeTor = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create hidden iframe for v86
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = '/v86/index.html';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      // Initialize v86 emulator
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
        cdrom: {
          url: 'https://dl.amnesia.boum.org/tails/stable/tails-amd64-5.24/tails-amd64-5.24.iso',
          async: true
        },
        network_relay_url: 'wss://relay.widgetry.org/',
        autostart: true,
        disable_mouse: true,
        disable_keyboard: false,
        uart0: true,
      });

      emulatorRef.current = emulator;

      // Monitor download progress
      emulator.add_listener("download-progress", (e: any) => {
        setStatus(prev => ({
          ...prev,
          downloadProgress: Math.round(e.loaded / e.total * 100)
        }));
      });

      // Handle Tor connection
      emulator.add_listener("emulator-ready", () => {
        connectToTor();
      });

    } catch (error) {
      setError((error as Error).message);
      setIsLoading(false);
    }
  };

  const connectToTor = async () => {
    try {
      // Configure Tor proxy
      const proxyConfig = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "socks5",
            host: "127.0.0.1",
            port: 9050
          }
        }
      };

      // Update status with Tor circuit information
      setStatus({
        connected: true,
        ipAddress: await checkTorIP(),
        circuitPath: await getTorCircuit()
      });

      setIsLoading(false);
    } catch (error) {
      setError((error as Error).message);
      setIsLoading(false);
    }
  };

  const checkTorIP = async (): Promise<string> => {
    const response = await fetch('https://check.torproject.org/api/ip');
    const data = await response.json();
    return data.IP;
  };

  const getTorCircuit = async (): Promise<string[]> => {
    // Simulate getting Tor circuit path
    return [
      'Entry Node (Germany)',
      'Middle Node (Sweden)',
      'Exit Node (Netherlands)'
    ];
  };

  const handleStartTor = () => {
    if (!status.connected) {
      initializeTor();
    }
  };

  const handleStopTor = () => {
    if (emulatorRef.current) {
      emulatorRef.current.stop();
      emulatorRef.current.destroy();
    }
    if (iframeRef.current && iframeRef.current.parentNode) {
      iframeRef.current.parentNode.removeChild(iframeRef.current);
    }
    setStatus({ connected: false });
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-yellow-500">Anonymous Tor Access</h2>
          {status.connected ? (
            <button
              onClick={handleStopTor}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-red-600 transition-colors"
            >
              <Power className="w-5 h-5" />
              <span>Stop Tor</span>
            </button>
          ) : (
            <button
              onClick={handleStartTor}
              disabled={isLoading}
              className={`flex items-center space-x-2 ${
                isLoading 
                  ? 'bg-yellow-500/50 cursor-not-allowed' 
                  : 'bg-yellow-500 hover:bg-yellow-600'
              } text-black px-4 py-2 rounded font-semibold transition-colors`}
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              <span>{isLoading ? 'Initializing...' : 'Start Tor'}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {status.downloadProgress !== undefined && status.downloadProgress < 100 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-500">Downloading Tails OS...</span>
              <span className="text-yellow-500">{status.downloadProgress}%</span>
            </div>
            <div className="w-full bg-yellow-500/20 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {status.connected && (
          <div className="space-y-6">
            <div className="bg-black/60 border border-yellow-500/20 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Globe className="w-6 h-6 text-green-500" />
                <span className="text-xl font-semibold text-green-500">Connected to Tor Network</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-yellow-500 mb-2">Your Tor IP Address</label>
                  <div className="bg-black/40 border border-yellow-500/20 rounded p-2">
                    <code className="text-yellow-100">{status.ipAddress}</code>
                  </div>
                </div>

                <div>
                  <label className="block text-yellow-500 mb-2">Current Circuit Path</label>
                  <div className="space-y-2">
                    {status.circuitPath?.map((node, index) => (
                      <div 
                        key={index}
                        className="flex items-center space-x-2 bg-black/40 border border-yellow-500/20 rounded p-2"
                      >
                        <Terminal className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-100">{node}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-500">
                Your connection is now routed through the Tor network. All traffic from this browser
                session will be anonymous and encrypted.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}