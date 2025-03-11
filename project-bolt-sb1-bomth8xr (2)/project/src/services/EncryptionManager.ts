import { openDB } from 'idb';
import CryptoJS from 'crypto-js';

export interface SecureItem {
  id: string;
  name: string;
  type: 'password' | 'file' | 'note';
  data: string;
  created: Date;
  lastAccessed: Date;
  tags?: string[];
}

class EncryptionManager {
  private static instance: EncryptionManager;
  private dbPromise;
  private masterKey: string | null = null;

  private constructor() {
    this.dbPromise = openDB('secure-store', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('name', 'name');
          itemStore.createIndex('type', 'type');
          itemStore.createIndex('created', 'created');
        }
      },
    });
  }

  public static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  private generateId(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private encryptData(data: any): string {
    if (!this.masterKey) {
      throw new Error('Master key not set');
    }
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.masterKey).toString();
  }

  private decryptData(encryptedData: string): any {
    if (!this.masterKey) {
      throw new Error('Master key not set');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.masterKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  public setMasterKey(key: string): void {
    // Hash the key for additional security
    this.masterKey = CryptoJS.SHA256(key).toString();
  }

  public async addItem(item: Omit<SecureItem, 'id' | 'created' | 'lastAccessed'>): Promise<SecureItem> {
    const db = await this.dbPromise;
    const newItem: SecureItem = {
      ...item,
      id: this.generateId(),
      created: new Date(),
      lastAccessed: new Date(),
      data: this.encryptData(item.data)
    };

    await db.put('items', newItem);
    return newItem;
  }

  public async getItem(id: string): Promise<SecureItem | undefined> {
    const db = await this.dbPromise;
    const item = await db.get('items', id);
    if (!item) return undefined;

    return {
      ...item,
      data: this.decryptData(item.data)
    };
  }

  public async updateItem(id: string, data: string): Promise<void> {
    const db = await this.dbPromise;
    const item = await db.get('items', id);
    if (!item) throw new Error('Item not found');

    const updatedItem = {
      ...item,
      data: this.encryptData(data),
      lastAccessed: new Date()
    };

    await db.put('items', updatedItem);
  }

  public async deleteItem(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('items', id);
  }

  public async listItems(): Promise<Omit<SecureItem, 'data'>[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('items');
    return items.map(({ data, ...item }) => item);
  }

  public async searchItems(query: string): Promise<Omit<SecureItem, 'data'>[]> {
    const items = await this.listItems();
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

export default EncryptionManager