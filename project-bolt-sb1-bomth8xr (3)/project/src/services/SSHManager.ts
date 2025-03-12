import { openDB } from 'idb';
import CryptoJS from 'crypto-js';
import { io, Socket } from 'socket.io-client';

export interface SSHConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  created: Date;
  lastAccessed: Date;
}

class SSHManager {
  private static instance: SSHManager;
  private dbPromise;
  private socket: Socket | null = null;
  private activeConnections: Map<string, Socket> = new Map();

  private constructor() {
    this.dbPromise = openDB('ssh-store', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('connections')) {
          const connectionStore = db.createObjectStore('connections', { keyPath: 'id' });
          connectionStore.createIndex('name', 'name');
          connectionStore.createIndex('host', 'host');
        }
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      },
    });

    // Initialize WebSocket connection
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: false,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to SSH server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from SSH server');
    });

    this.socket.on('ssh:data', ({ id, data }) => {
      const connection = this.activeConnections.get(id);
      if (connection) {
        connection.emit('data', data);
      }
    });
  }

  public static getInstance(): SSHManager {
    if (!SSHManager.instance) {
      SSHManager.instance = new SSHManager();
    }
    return SSHManager.instance;
  }

  private generateId(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private encryptData(data: any, key: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  }

  private decryptData(encryptedData: string, key: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  public async createConnection(config: Omit<SSHConfig, 'id' | 'created' | 'lastAccessed'>): Promise<SSHConfig> {
    const db = await this.dbPromise;
    const newConnection: SSHConfig = {
      ...config,
      id: this.generateId(),
      created: new Date(),
      lastAccessed: new Date(),
    };

    if (config.privateKey) {
      const encryptedKey = this.encryptData(config.privateKey, 'ssh-key');
      await db.put('keys', { id: newConnection.id, key: encryptedKey });
    }

    await db.put('connections', newConnection);
    return newConnection;
  }

  public async connect(id: string): Promise<Socket> {
    const db = await this.dbPromise;
    const connection = await db.get('connections', id);
    
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get private key if exists
    const keyData = await db.get('keys', id);
    const privateKey = keyData ? this.decryptData(keyData.key, 'ssh-key') : undefined;

    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    // Connect to SSH server
    this.socket.connect();
    this.socket.emit('ssh:connect', {
      id,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      privateKey,
    });

    // Store active connection
    this.activeConnections.set(id, this.socket);

    // Update last accessed
    connection.lastAccessed = new Date();
    await db.put('connections', connection);

    return this.socket;
  }

  public async disconnect(id: string): Promise<void> {
    const connection = this.activeConnections.get(id);
    if (connection) {
      connection.emit('ssh:disconnect', { id });
      this.activeConnections.delete(id);
    }
  }

  public async deleteConnection(id: string): Promise<void> {
    const db = await this.dbPromise;
    await this.disconnect(id);
    await db.delete('connections', id);
    await db.delete('keys', id);
  }

  public async listConnections(): Promise<SSHConfig[]> {
    const db = await this.dbPromise;
    return db.getAll('connections');
  }
}

export default SSHManager