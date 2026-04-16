/**
 * Cache com TTL variável
 */

class TTLCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlSeconds) {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
      timestamp: Date.now(),
    });
  }

  get(key, allowStale = false) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() < entry.expires) return entry.value;
    if (allowStale) return { value: entry.value, stale: true };
    this.store.delete(key);
    return null;
  }

  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() < entry.expires) return true;
    this.store.delete(key);
    return false;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  getStats() {
    let validEntries = 0;
    for (const [key, entry] of this.store.entries()) {
      if (Date.now() < entry.expires) validEntries++;
    }
    return {
      totalEntries: this.store.size,
      validEntries,
      staleEntries: this.store.size - validEntries,
    };
  }
}

module.exports = { TTLCache };