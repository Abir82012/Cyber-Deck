import React, { useState } from 'react';
import { Shield, Terminal, Ghost } from 'lucide-react';
import VMManager from '../services/VMManager';

interface VMCreationModalProps {
  onClose: () => void;
  onVMCreated: (vmId: string) => void;
}

export function VMCreationModal({ onClose, onVMCreated }: VMCreationModalProps) {
  const [name, setName] = useState('');
  const [os, setOs] = useState<'ubuntu' | 'debian' | 'kali' | 'tails'>('ubuntu');
  const [encryption, setEncryption] = useState(true);
  const [tor, setTor] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const operatingSystems = [
    { value: 'ubuntu', label: 'Ubuntu Lite', icon: Terminal },
    { value: 'debian', label: 'Debian Lite', icon: Terminal },
    { value: 'kali', label: 'Kali Lite', icon: Shield },
    { value: 'tails', label: 'Tails Lite', icon: Ghost }
  ];

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const vmManager = VMManager.getInstance();
      const vm = await vmManager.createVM({
        name,
        os,
        encrypted: encryption,
        torEnabled: tor
      });

      // Start downloading and encrypting the OS image
      const osUrl = getOSImageUrl(os);
      const response = await fetch(osUrl);
      const imageData = await response.arrayBuffer();
      await vmManager.storeOSImage(os, imageData);

      onVMCreated(vm.id);
    } catch (error) {
      console.error('Failed to create VM:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getOSImageUrl = (os: string): string => {
    const urls: Record<string, string> = {
      ubuntu: 'https://releases.ubuntu.com/22.04/ubuntu-22.04-live-server-amd64.iso',
      debian: 'https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.5.0-amd64-netinst.iso',
      kali: 'https://cdimage.kali.org/kali-2024.1/kali-linux-2024.1-installer-amd64.iso',
      tails: 'https://dl.amnesia.boum.org/tails/stable/tails-amd64-5.24/tails-amd64-5.24.iso'
    };
    return urls[os];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8 w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-yellow-500 mb-8">Create New Virtual Machine</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-yellow-500 mb-2">VM Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
              placeholder="Enter VM name"
            />
          </div>

          <div>
            <label className="block text-yellow-500 mb-2">Operating System</label>
            <div className="space-y-3">
              {operatingSystems.map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    os === value
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-yellow-500/20 hover:border-yellow-500/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="os"
                    value={value}
                    checked={os === value}
                    onChange={(e) => setOs(e.target.value as typeof os)}
                    className="sr-only"
                  />
                  <Icon className={`w-6 h-6 mr-3 ${
                    os === value ? 'text-yellow-500' : 'text-yellow-500/60'
                  }`} />
                  <span className={os === value ? 'text-yellow-500' : 'text-yellow-500/60'}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={encryption}
                onChange={(e) => setEncryption(e.target.checked)}
                className="w-5 h-5 bg-black border-yellow-500/20 rounded focus:ring-yellow-500"
              />
              <span className="text-yellow-500">Enable Disk Encryption</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={tor}
                onChange={(e) => setTor(e.target.checked)}
                className="w-5 h-5 bg-black border-yellow-500/20 rounded focus:ring-yellow-500"
              />
              <span className="text-yellow-500">Route Through Tor Network</span>
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-semibold border border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                name.trim() && !isCreating
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                  : 'bg-yellow-500/20 text-yellow-500/50 cursor-not-allowed'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Virtual Machine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}