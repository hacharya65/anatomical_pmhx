/**
 * apiCache.js
 * High-performance client-side caching & network resilience layer for clinical APIs.
 * Uses sessionStorage with TTL (default: 1 hour) and memory fallback.
 * Includes timeout protection and a debounce utility.
 */

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const memoryCache = new Map();

/**
 * Checks if sessionStorage is accessible in current environment
 */
function isSessionStorageAvailable() {
  try {
    const testKey = "__test_storage__";
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasSessionStorage = typeof window !== "undefined" && isSessionStorageAvailable();

/**
 * Get item from cache if not expired
 */
export function cacheGet(key) {
  const prefixedKey = `pmhx_cache_${key}`;

  try {
    if (hasSessionStorage) {
      const raw = window.sessionStorage.getItem(prefixedKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiry) {
        window.sessionStorage.removeItem(prefixedKey);
        return null;
      }
      return parsed.value;
    }
  } catch (err) {
    console.warn("apiCache: sessionStorage read error, checking memory cache", err);
  }

  // Memory fallback
  const mem = memoryCache.get(prefixedKey);
  if (mem) {
    if (Date.now() > mem.expiry) {
      memoryCache.delete(prefixedKey);
      return null;
    }
    return mem.value;
  }

  return null;
}

/**
 * Set item in cache with TTL
 */
export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  const prefixedKey = `pmhx_cache_${key}`;
  const record = {
    value,
    expiry: Date.now() + ttlMs,
    created: Date.now()
  };

  try {
    if (hasSessionStorage) {
      window.sessionStorage.setItem(prefixedKey, JSON.stringify(record));
    }
  } catch (err) {
    console.warn("apiCache: sessionStorage write failed (likely quota exceeded)", err);
  }

  // Always keep in memory cache as fast L1 buffer
  memoryCache.set(prefixedKey, record);
}

/**
 * Clear all cached items prefixed with pmhx_cache_
 */
export function clearApiCache() {
  try {
    if (hasSessionStorage) {
      const keys = Object.keys(window.sessionStorage);
      for (const k of keys) {
        if (k.startsWith("pmhx_cache_")) {
          window.sessionStorage.removeItem(k);
        }
      }
    }
  } catch (err) {
    console.warn("apiCache: error clearing storage", err);
  }
  memoryCache.clear();
}

/**
 * Robust fetch wrapper with AbortController timeout
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }
    throw err;
  }
}

/**
 * Cached fetch helper: looks up cache first, then fetches with timeout, parses JSON and caches
 */
export async function cachedFetch(key, fetcher, ttlMs = DEFAULT_TTL_MS) {
  const cached = cacheGet(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  if (fresh !== null && fresh !== undefined) {
    cacheSet(key, fresh, ttlMs);
  }
  return fresh;
}

/**
 * Debounce helper for search inputs
 */
export function debounce(fn, delayMs = 400) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delayMs);
  };
}
