const DB_NAME = "requiem_game_db";
const DB_VERSION = 1;
const STORE_NAME = "key_val";

const MIGRATION_KEYS = [
  "crime_city_profile",
  "crime_city_tutorial",
  "crime_city_haptics",
  "crime_city_completed_modules",
];

class StorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isMigrated = false;

  private isIdbSupported(): boolean {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return false;
    }
    try {
      return Boolean(window.indexedDB);
    } catch {
      return false;
    }
  }

  private getDB(): Promise<IDBDatabase | null> {
    if (!this.isIdbSupported()) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        req.onsuccess = () => {
          const db = req.result;
          this.migrateFromLocalStorage(db).catch(() => {});
          resolve(db);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private async migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
    if (this.isMigrated || typeof window === "undefined" || !window.localStorage) {
      return;
    }
    this.isMigrated = true;

    try {
      for (const key of MIGRATION_KEYS) {
        const localVal = localStorage.getItem(key);
        if (localVal !== null) {
          const existing = await this.getIdbItem(db, key);
          if (existing === undefined) {
            try {
              const parsed = JSON.parse(localVal);
              await this.setIdbItem(db, key, parsed);
            } catch {
              await this.setIdbItem(db, key, localVal);
            }
          }
        }
      }
    } catch {}
  }

  private getIdbItem(db: IDBDatabase, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  private setIdbItem(db: IDBDatabase, key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  private removeIdbItem(db: IDBDatabase, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  getSyncItem<T>(key: string, fallbackValue: T): T {
    if (typeof window === "undefined" || !window.localStorage) {
      return fallbackValue;
    }
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return fallbackValue;
      return JSON.parse(saved) as T;
    } catch {
      return fallbackValue;
    }
  }

  setSyncAndPersist<T>(key: string, value: T): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }
    this.setItem(key, value).catch(() => {});
  }

  async getItem<T>(key: string, fallbackValue: T): Promise<T> {
    const db = await this.getDB();
    if (db) {
      try {
        const val = await this.getIdbItem(db, key);
        if (val !== undefined && val !== null) {
          return val as T;
        }
      } catch {}
    }
    return this.getSyncItem(key, fallbackValue);
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    if (db) {
      try {
        await this.setIdbItem(db, key, value);
        return;
      } catch {}
    }
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.getDB();
    if (db) {
      try {
        await this.removeIdbItem(db, key);
      } catch {}
    }
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }
}

export const storage = new StorageService();
