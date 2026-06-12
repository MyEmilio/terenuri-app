interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Cache geocodare în memorie (pe durata procesului)
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeLocality(
  locality: string
): Promise<{ lat: number; lng: number } | null> {
  const key = locality.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locality + ", Romania")}&format=json&limit=1&countrycodes=ro`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "terenuri-app/1.0 (limeuragod@yahoo.com)" },
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as NominatimResult[];
    const result = data.length
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      : null;
    geocodeCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

// Scatter determinist — același seed → același offset mereu
// radiusKm ≈ raza în care se împrăștie pinii (default 2km)
export function scatterCoords(
  lat: number,
  lng: number,
  seed: string,
  radiusKm = 2
): { lat: number; lng: number } {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const u1 = ((h1 >>> 0) / 0xffffffff) * 2 - 1; // [-1, 1]
  const u2 = ((h2 >>> 0) / 0xffffffff) * 2 - 1;

  // 1 grad latitudine ≈ 111km, 1 grad longitudine ≈ 111km * cos(lat)
  const dLat = (u1 * radiusKm) / 111;
  const dLng = (u2 * radiusKm) / (111 * Math.cos((lat * Math.PI) / 180));

  return { lat: lat + dLat, lng: lng + dLng };
}
