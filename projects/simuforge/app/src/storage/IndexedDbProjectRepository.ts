import type { ProjectDocument } from '../project/types.ts';
import type { ProjectRepository } from './ProjectRepository.ts';
import type { AppError } from '../world/types.ts';

const DB_NAME = 'simuforge';
const DB_VERSION = 1;
const STORE = 'projects';

function unavailableError(): AppError {
  return { code: 'STORAGE_UNAVAILABLE', message: 'IndexedDB is unavailable' };
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export class IndexedDbProjectRepository implements ProjectRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  isAvailable(): boolean {
    return isIndexedDbAvailable();
  }

  private openDb(): Promise<IDBDatabase> {
    if (!isIndexedDbAvailable()) {
      return Promise.reject(unavailableError());
    }
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject({ code: 'STORAGE_READ_FAILED', message: 'Failed to open IndexedDB' });
      request.onblocked = () => reject({ code: 'STORAGE_READ_FAILED', message: 'IndexedDB open blocked' });
    });
    return this.dbPromise;
  }

  async list(): Promise<ProjectDocument[]> {
    const db = await this.openDb();
    return new Promise<ProjectDocument[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('updatedAt');
      const req = index.openCursor(null, 'prev');
      const out: ProjectDocument[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          out.push(cursor.value as ProjectDocument);
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject({ code: 'STORAGE_READ_FAILED', message: 'Failed to list projects' });
    });
  }

  async get(id: string): Promise<ProjectDocument | null> {
    const db = await this.openDb();
    return new Promise<ProjectDocument | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as ProjectDocument) ?? null);
      req.onerror = () => reject({ code: 'STORAGE_READ_FAILED', message: 'Failed to read project' });
    });
  }

  async save(project: ProjectDocument): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        const err = req.error;
        if (err && (err.name === 'QuotaExceededError' || (err as { code?: number }).code === 22)) {
          reject({ code: 'STORAGE_QUOTA_EXCEEDED', message: 'Storage quota exceeded' });
        } else {
          reject({ code: 'STORAGE_WRITE_FAILED', message: 'Failed to save project' });
        }
      };
      tx.onerror = () => reject({ code: 'STORAGE_WRITE_FAILED', message: 'Transaction failed' });
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject({ code: 'STORAGE_WRITE_FAILED', message: 'Failed to delete project' });
    });
  }
}