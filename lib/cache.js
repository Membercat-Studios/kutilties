class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, expiry = 0) {
    const expiryTime = expiry > 0 ? Date.now() + expiry : null;
    this.cache.set(key, { value, expiryTime });
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const { value, expiryTime } = entry;

    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return null;
    }

    return value;
  }

  delete(key) {
    if (!this.cache.has(key)) return null;

    this.cache.delete(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  cleanUp() {
    const now = Date.now();
    for (const [key, { expiryTime }] of this.cache) {
      if (expiryTime && now > expiryTime) {
        this.delete(key);
      }
    }
  }
}

module.exports = new CacheManager();
