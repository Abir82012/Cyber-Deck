import React, { useState, useEffect } from 'react';
import { Shield, Monitor, Ghost, Terminal, Server, Lock, Zap, Key, Globe, FileKey, ArrowLeft, Link as Linux, Terminal as Terminal2, Shield as Shield2, Ghost as Ghost2 } from 'lucide-react';
import SHA256 from 'crypto-js/sha256';
import { VMTerminal } from './components/VMTerminal';
import { EncryptedStorage } from './components/EncryptedStorage';

function generateSessionId() {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  const length = 64;
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/Cyber_Deck.png" alt="Cyber Deck Logo" className="h-12 w-auto" />
    </div>
  );
}

function VMCreationScreen({ onBack }: { onBack: () => void }) {
  const [vmName, setVmName] = useState('');
  const [selectedOS, setSelectedOS] = useState('ubuntu');
  const [proxyChaining, setProxyChaining] = useState(false);
  const [vmCreated, setVmCreated] = useState(false);

  const operatingSystems = [
    { value: 'ubuntu', label: 'Ubuntu Lite', icon: Linux },
    { value: 'debian', label: 'Debian Lite', icon: Terminal2 },
    { value: 'kali', label: 'Kali Lite', icon: Shield2 },
    { value: 'tails', label: 'Tails Lite', icon: Ghost2 }
  ];

  const handleCreateVM = () => {
    setVmCreated(true);
  };

  if (vmCreated) {
    return (
      <div className="min-h-screen bg-black text-white pt-24">
        <div className="max-w-6xl mx-auto px-4">
          <button 
            onClick={onBack}
            className="flex items-center text-yellow-500 hover:text-yellow-400 mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-yellow-500">Secure VM Terminal</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-green-500">Connected</span>
              </div>
            </div>

            <VMTerminal vmName={vmName} osType={selectedOS} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24">
      <div className="max-w-2xl mx-auto px-4">
        <button 
          onClick={onBack}
          className="flex items-center text-yellow-500 hover:text-yellow-400 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-yellow-500 mb-8">Create New Virtual Machine</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-yellow-500 mb-2">VM Name</label>
              <input
                type="text"
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
                className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
                placeholder="Enter VM name"
              />
            </div>

            <div>
              <label className="block text-yellow-500 mb-2">Operating System</label>
              <div className="space-y-3">
                {operatingSystems.map(os => {
                  const Icon = os.icon;
                  return (
                    <label
                      key={os.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedOS === os.value
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-yellow-500/20 hover:border-yellow-500/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="os"
                        value={os.value}
                        checked={selectedOS === os.value}
                        onChange={(e) => setSelectedOS(e.target.value)}
                        className="sr-only"
                      />
                      <Icon className={`w-6 h-6 mr-3 ${
                        selectedOS === os.value ? 'text-yellow-500' : 'text-yellow-500/60'
                      }`} />
                      <span className={`flex-1 ${
                        selectedOS === os.value ? 'text-yellow-500' : 'text-yellow-500/60'
                      }`}>
                        {os.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="proxyChaining"
                checked={proxyChaining}
                onChange={(e) => setProxyChaining(e.target.checked)}
                className="w-5 h-5 bg-black border-yellow-500/20 rounded focus:ring-yellow-500 focus:ring-offset-0 focus:ring-2"
              />
              <label htmlFor="proxyChaining" className="text-yellow-500">
                Enable Proxy Chaining
              </label>
            </div>

            <button
              onClick={handleCreateVM}
              disabled={!vmName.trim()}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                vmName.trim() 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                  : 'bg-yellow-500/20 text-yellow-500/50 cursor-not-allowed'
              }`}
            >
              Create Virtual Machine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionId, setNewSessionId] = useState('');

  const handleImportSession = () => {
    const hashedId = SHA256(sessionId).toString();
    const savedSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    if (savedSessions.includes(hashedId)) {
      localStorage.setItem('currentSession', hashedId);
      onLogin();
    } else {
      setError('Invalid session ID');
    }
  };

  const handleCreateNewSession = () => {
    const newId = generateSessionId();
    setNewSessionId(newId);
    setShowNewSession(true);
    const hashedId = SHA256(newId).toString();
    const savedSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    savedSessions.push(hashedId);
    localStorage.setItem('sessions', JSON.stringify(savedSessions));
  };

  const handleConfirmNewSession = () => {
    localStorage.setItem('currentSession', SHA256(newSessionId).toString());
    onLogin();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="bg-black/80 p-8 rounded-lg border border-yellow-500/20 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/Cyber_Deck.png" alt="Cyber Deck Logo" className="h-24 w-auto" />
          <h1 className="text-4xl font-bold text-yellow-500 ml-4">CYBER DECK</h1>
        </div>

        {!showNewSession ? (
          <>
            <div className="space-y-6">
              <div>
                <label className="block text-yellow-500 mb-2">Import Session</label>
                <input
                  type="password"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
                  placeholder="Enter your session ID"
                />
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
              <button
                onClick={handleImportSession}
                className="w-full bg-yellow-500 text-black py-2 rounded font-semibold hover:bg-yellow-600 transition-colors"
              >
                Login
              </button>
              <div className="text-center">
                <span className="text-gray-500">or</span>
              </div>
              <button
                onClick={handleCreateNewSession}
                className="w-full bg-black border border-yellow-500 text-yellow-500 py-2 rounded font-semibold hover:bg-yellow-500/10 transition-colors"
              >
                Create New Session
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-yellow-500 mb-2">Your New Session ID</label>
              <div className="bg-black/50 border border-yellow-500/20 rounded p-4">
                <p className="text-yellow-500 break-all font-mono">{newSessionId}</p>
              </div>
              <p className="text-gray-400 mt-4 text-sm">
                Please save this session ID securely. You will need it to access your session in the future.
                Once you have saved it, click the button below to continue.
              </p>
            </div>
            <button
              onClick={handleConfirmNewSession}
              className="w-full bg-yellow-500 text-black py-2 rounded font-semibold hover:bg-yellow-600 transition-colors"
            >
              I Have Saved My Session ID
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  
  const lines = [
    'Initializing system...',
    'Running security checks...',
    'Verifying integrity...',
    'Establishing secure connection...',
    'Login successful.'
  ];

  useEffect(() => {
    if (lineIndex >= lines.length) {
      setTimeout(onComplete, 2000);
      return;
    }

    if (charIndex >= lines[lineIndex].length) {
      const timer = setTimeout(() => {
        setLineIndex(prev => prev + 1);
        setCharIndex(0);
      }, 1000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCharIndex(prev => prev + 1);
    }, 50);

    return () => clearTimeout(timer);
  }, [lineIndex, charIndex, lines, onComplete]);

  if (lineIndex >= lines.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="relative">
          <h1 className="text-6xl font-bold animate-fade-in text-yellow-500 relative z-10">
            <span className="flex items-center justify-center gap-4">
              <img src="/Cyber_Deck.png" alt="Cyber Deck Logo" className="h-24 w-auto animate-fade-in" />
              <span className="animate-lightning">CYBER DECK</span>
            </span>
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="font-mono text-yellow-500 text-xl">
        {lines[lineIndex].slice(0, charIndex)}<span className="animate-blink">_</span>
      </div>
    </div>
  );
}

function SecurityOption({ icon: Icon, title, description, onClick }: { 
  icon: React.ElementType, 
  title: string, 
  description: string,
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className="bg-black/80 p-8 rounded-lg border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 shadow-lg hover:shadow-yellow-500/10 text-left w-full"
    >
      <Icon className="w-12 h-12 text-yellow-500 mb-4" />
      <h3 className="text-2xl font-bold text-yellow-100 mb-3">{title}</h3>
      <p className="text-gray-300 text-lg">{description}</p>
    </button>
  );
}

function MainContent() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  if (selectedOption === 'ssh') {
    return <VMCreationScreen onBack={() => setSelectedOption(null)} />;
  }

  if (selectedOption === 'encrypt') {
    return <EncryptedStorage />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-sm border-b border-yellow-500/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Logo />
        </div>
      </header>

      <div className="pt-24 px-4 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-500 mb-8">Security Operations Center</h1>
        
        <div className="grid grid-cols-1 gap-6 mb-12">
          <SecurityOption
            icon={Terminal}
            title="Create New SSH VM"
            description="Set up a secure, isolated virtual machine environment for safe operations and testing."
            onClick={() => handleOptionSelect('ssh')}
          />
          
          <SecurityOption
            icon={Globe}
            title="Access Tor Network"
            description="Connect to the Tor network for anonymous browsing and enhanced privacy."
            onClick={() => handleOptionSelect('tor')}
          />
          
          <SecurityOption
            icon={FileKey}
            title="Encrypt Files & Passwords"
            description="Secure your sensitive data and manage passwords with military-grade encryption."
            onClick={() => handleOptionSelect('encrypt')}
          />
        </div>

        <div className="bg-black/60 rounded-lg border border-yellow-500/20 p-6 mt-8">
          <h2 className="text-xl font-semibold text-yellow-500 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>System Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Network Protected</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-black py-8 border-t border-yellow-500/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Cyber Deck. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  if (showIntro) {
    return <IntroSequence onComplete={handleIntroComplete} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <MainContent />;
}

export default App;