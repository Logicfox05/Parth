// Storage abstraction. Everything above this line (repositories, engine,
// components) only ever talks to `IStorageAdapter` — never to
// localStorage/SQLite/REST directly. That keeps the promise in
// TECHNICAL REQUIREMENTS: swap `LocalStorageAdapter` for a real DB-backed
// adapter later without touching the rest of the app. See DATA_MODEL.md.
export interface IStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

const NAMESPACE = "dcrs:v1:"; // Digital Controlled Record System

export class LocalStorageAdapter implements IStorageAdapter {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(NAMESPACE + key);
    } catch {
      return null;
    }
  }
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(NAMESPACE + key, value);
    } catch (err) {
      console.error("Storage write failed (quota exceeded?)", err);
    }
  }
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(NAMESPACE + key);
    } catch {
      /* noop */
    }
  }
  keys(): string[] {
    try {
      const out: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(NAMESPACE)) out.push(k.slice(NAMESPACE.length));
      }
      return out;
    } catch {
      return [];
    }
  }
}

// In-memory fallback (used automatically if localStorage is unavailable, e.g.
// private browsing edge cases, or for tests).
export class MemoryStorageAdapter implements IStorageAdapter {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  keys(): string[] {
    return Array.from(this.map.keys());
  }
}

function detectAdapter(): IStorageAdapter {
  try {
    const testKey = "__dcrs_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return new LocalStorageAdapter();
  } catch {
    console.warn("localStorage unavailable — falling back to in-memory storage (data will not persist).");
    return new MemoryStorageAdapter();
  }
}

export const storage: IStorageAdapter = detectAdapter();

export function readJSON<T>(key: string, fallback: T): T {
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`Corrupt JSON in storage key "${key}" — using fallback.`);
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  storage.setItem(key, JSON.stringify(value));
}
