const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 200;

type CacheEntry = { expiresAt: number; value: Promise<unknown> };

const cache = new Map<string, CacheEntry>();

const cacheKey = (namespace: string, schoolId: string, variant: string) =>
  `${namespace}:${schoolId}:${variant}`;

const removeExpired = (now: number) => {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
};

export const referenceCache = {
  getOrLoad<T>(
    namespace: string,
    schoolId: string,
    variant: string,
    loader: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<T> {
    const now = Date.now();
    removeExpired(now);
    const key = cacheKey(namespace, schoolId, variant);
    const existing = cache.get(key);
    if (existing) return existing.value as Promise<T>;
    const value = loader().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { expiresAt: now + ttlMs, value });
    while (cache.size > MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
    return value;
  },

  invalidateSchool(namespace: string, schoolId: string) {
    const prefix = `${namespace}:${schoolId}:`;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  },

  invalidateAllForSchool(schoolId: string) {
    for (const key of cache.keys()) {
      if (key.includes(`:${schoolId}:`)) cache.delete(key);
    }
  },

  clear() {
    cache.clear();
  },

  size() {
    return cache.size;
  },
};
