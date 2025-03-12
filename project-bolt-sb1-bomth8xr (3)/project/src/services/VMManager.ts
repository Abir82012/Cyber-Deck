import { openDB } from 'idb';
import CryptoJS from 'crypto-js';

export interface VMConfig {
  id: string;
  name: string;
  os: 'ubuntu' | 'debian' | 'kali' | 'tails';
  created: Date;
  lastAccessed: Date;
  encrypted: boolean;
  torEnabled: boolean;
}

class VMManager {
  private static instance: VMManager;
  private dbPromise;

  private constructor() {
    this.dbPromise = openDB('vm-store', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('vms')) {
          const vmStore = db.createObjectStore('vms', { keyPath: 'id' });
          vmStore.createIndex('name', 'name');
          vmStore.createIndex('os', 'os');
        }
        if (!db.objectStoreNames.contains('os-images')) {
          db.createObjectStore('os-images', { keyPath: 'os' });
        }
      },
    });
  }

  public static getInstance(): VMManager {
    if (!VMManager.instance) {
      VMManager.instance = new VMManager();
    }
    return VMManager.instance;
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

  public async createVM(config: Omit<VMConfig, 'id' | 'created' | 'lastAccessed'>): Promise<VMConfig> {
    const db = await this.dbPromise;
    const newVM: VMConfig = {
      ...config,
      id: this.generateId(),
      created: new Date(),
      lastAccessed: new Date(),
    };

    await db.put('vms', newVM);
    return newVM;
  }

  public async getVM(id: string): Promise<VMConfig | undefined> {
    const db = await this.dbPromise;
    return db.get('vms', id);
  }

  public async listVMs(): Promise<VMConfig[]> {
    const db = await this.dbPromise;
    return db.getAll('vms');
  }

  public async deleteVM(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('vms', id);
  }

  public async storeOSImage(os: string, imageData: ArrayBuffer): Promise<void> {
    const db = await this.dbPromise;
    const encryptedData = this.encryptData(
      Array.from(new Uint8Array(imageData)),
      'vm-os-key'
    );
    await db.put('os-images', { os, data: encryptedData });
  }

  public async getOSImage(os: string): Promise<ArrayBuffer | null> {
    const db = await this.dbPromise;
    const result = await db.get('os-images', os);
    if (!result) return null;

    const decryptedData = this.decryptData(result.data, 'vm-os-key');
    return new Uint8Array(decryptedData).buffer;
  }

  public async enableTor(vmId: string): Promise<void> {
    const db = await this.dbPromise;
    const vm = await this.getVM(vmId);
    if (vm) {
      vm.torEnabled = true;
      await db.put('vms', vm);
    }
  }

  public async updateLastAccessed(vmId: string): Promise<void> {
    const db = await this.dbPromise;
    const vm = await this.getVM(vmId);
    if (vm) {
      vm.lastAccessed = new Date();
      await db.put('vms', vm);
    }
  }
}

export default VMManager