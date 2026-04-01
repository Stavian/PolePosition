const EARTH_RADIUS_KM = 6371;

/** Haversine distance between two lat/lng points in kilometers */
export function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Bearing from point A to point B in degrees (0 = North) */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert m/s to km/h */
export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6);
}

/** Convert km/h to m/s */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/** Check if a point is within radiusKm of a target */
export function isWithinRadius(
  lat: number, lng: number,
  targetLat: number, targetLng: number,
  radiusKm: number,
): boolean {
  return haversineDistanceKm(lat, lng, targetLat, targetLng) <= radiusKm;
}

/**
 * Geohash-style grid cell key for heatmap bucketing (1 decimal degree ≈ 111km)
 * We use 1 decimal place for ~11km resolution cells
 */
export function heatmapCellKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)}_${lng.toFixed(1)}`;
}

/** Format distance for display */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Format duration in seconds to human-readable */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours} Std ${remainMins} min` : `${hours} Std`;
}

/** Format Unix ms timestamp to German locale date string */
export function formatDate(tsMs: number): string {
  return new Date(tsMs).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Format Unix ms timestamp to German locale time string */
export function formatTime(tsMs: number): string {
  return new Date(tsMs).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format Unix ms timestamp to "Mo, 14. Apr. · 08:32" */
export function formatTripDate(tsMs: number): string {
  return new Date(tsMs).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
