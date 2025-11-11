// Lightweight reverse geocoding via OpenStreetMap Nominatim
// Uses localStorage caching to reduce API calls.

const CACHE_KEY = 'geocode_cache_v1';
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

export const reverseGeocode = async (lat, lon) => {
  if (lat == null || lon == null) return null;
  const key = `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
  const cache = loadCache();
  const now = Date.now();
  const cached = cache[key];
  if (cached && now - cached.t < TTL_MS) {
    return cached.addr;
  }

  const email = import.meta.env.VITE_GEOCODE_EMAIL;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
    const data = await res.json();
    const addr = data?.display_name || null;
    cache[key] = { addr, t: now };
    saveCache(cache);
    return addr;
  } catch (e) {
    // On failure, store a short-lived negative cache to avoid spamming
    cache[key] = { addr: null, t: now };
    saveCache(cache);
    return null;
  }
};

export default reverseGeocode;

