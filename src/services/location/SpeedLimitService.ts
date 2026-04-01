/**
 * SpeedLimitService
 *
 * Primary:  Mapbox Map Matching API — snaps GPS to road and returns speed limit
 * Fallback: HERE Map Attributes API
 *
 * Caches the last known limit and only re-queries when the road likely changed
 * (heading delta > 30° OR distance > 200m since last query).
 */

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const HERE_API_KEY = process.env.EXPO_PUBLIC_HERE_API_KEY ?? '';

const REQUERY_DISTANCE_KM = 0.2;
const REQUERY_HEADING_DELTA = 30;

interface SpeedLimitResult {
  limitKmh: number | null;
  source: 'mapbox' | 'here' | 'cache' | 'none';
}

class SpeedLimitServiceClass {
  private static instance: SpeedLimitServiceClass;
  private cachedLimit: number | null = null;
  private lastQueryLat: number | null = null;
  private lastQueryLng: number | null = null;
  private lastQueryHeading: number | null = null;
  private queryInFlight = false;

  static getInstance(): SpeedLimitServiceClass {
    if (!SpeedLimitServiceClass.instance) {
      SpeedLimitServiceClass.instance = new SpeedLimitServiceClass();
    }
    return SpeedLimitServiceClass.instance;
  }

  async getSpeedLimit(lat: number, lng: number, heading: number): Promise<SpeedLimitResult> {
    if (!this.shouldRequery(lat, lng, heading)) {
      return { limitKmh: this.cachedLimit, source: 'cache' };
    }
    if (this.queryInFlight) {
      return { limitKmh: this.cachedLimit, source: 'cache' };
    }

    this.queryInFlight = true;
    try {
      // Try Mapbox first
      const mapboxResult = await this.queryMapbox(lat, lng);
      if (mapboxResult !== null) {
        this.cachedLimit = mapboxResult;
        this.lastQueryLat = lat;
        this.lastQueryLng = lng;
        this.lastQueryHeading = heading;
        return { limitKmh: mapboxResult, source: 'mapbox' };
      }

      // Fall back to HERE
      const hereResult = await this.queryHere(lat, lng);
      this.cachedLimit = hereResult;
      this.lastQueryLat = lat;
      this.lastQueryLng = lng;
      this.lastQueryHeading = heading;
      return { limitKmh: hereResult, source: hereResult !== null ? 'here' : 'none' };
    } catch {
      return { limitKmh: this.cachedLimit, source: 'cache' };
    } finally {
      this.queryInFlight = false;
    }
  }

  private shouldRequery(lat: number, lng: number, heading: number): boolean {
    if (this.lastQueryLat === null) return true;

    const { haversineDistanceKm, bearing } = require('../../utils/geoUtils');
    const dist = haversineDistanceKm(this.lastQueryLat, this.lastQueryLng!, lat, lng);
    if (dist >= REQUERY_DISTANCE_KM) return true;

    const headingDelta = Math.abs(
      ((heading - (this.lastQueryHeading ?? heading) + 540) % 360) - 180,
    );
    return headingDelta >= REQUERY_HEADING_DELTA;
  }

  private async queryMapbox(lat: number, lng: number): Promise<number | null> {
    if (!MAPBOX_TOKEN) return null;
    try {
      const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${lng},${lat}?access_token=${MAPBOX_TOKEN}&annotations=speed_limit&overview=false&steps=false`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!resp.ok) return null;
      const json = await resp.json();
      const tracepoints = json?.tracepoints;
      if (!tracepoints || tracepoints.length === 0) return null;
      // Speed limit comes from matchings[0].legs[0].annotation.speed_limit
      const limit = json?.matchings?.[0]?.legs?.[0]?.annotation?.speed_limit?.[0];
      return typeof limit === 'number' ? limit : null;
    } catch {
      return null;
    }
  }

  private async queryHere(lat: number, lng: number): Promise<number | null> {
    if (!HERE_API_KEY) return null;
    try {
      const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${lat},${lng}&destination=${lat},${lng}&return=roadAttributes&apikey=${HERE_API_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!resp.ok) return null;
      const json = await resp.json();
      const limit = json?.routes?.[0]?.sections?.[0]?.spans?.[0]?.speedLimit;
      return typeof limit === 'number' ? Math.round(limit * 3.6) : null; // m/s → km/h
    } catch {
      return null;
    }
  }

  reset() {
    this.cachedLimit = null;
    this.lastQueryLat = null;
    this.lastQueryLng = null;
    this.lastQueryHeading = null;
  }
}

export const SpeedLimitService = SpeedLimitServiceClass;
