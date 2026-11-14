import type { StorageLike } from '../core/types';

/** Per-instance fallback prevents stale persistent reads after a quota/security failure. */
export function createSafeStorage(backing?: StorageLike): StorageLike {
  const memory = new Map<string, string>();
  let available = !!backing;
  return {
    getItem(key) {
      if (available) try {
        const value = backing!.getItem(key);
        if (value !== null) memory.set(key, value); else memory.delete(key);
        return value;
      } catch { available = false; }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, value);
      if (available) try { backing!.setItem(key, value); } catch { available = false; }
    },
    removeItem(key) {
      memory.delete(key);
      if (available) try { backing!.removeItem(key); } catch { available = false; }
    },
  };
}

export function createBrowserStorage(): StorageLike {
  try { return createSafeStorage(window.localStorage); } catch { return createSafeStorage(); }
}
