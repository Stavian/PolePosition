import { pb } from '../pocketbase/client';
import { Collections } from '../pocketbase/collections';
import { createTrip, updateTrip, completeTrip, flushWaypointBatch } from '../pocketbase/trips';
import { haversineDistanceKm, msToKmh } from '../../utils/geoUtils';
import type { WaypointPoint } from '../../types/firestore';
import { useTripStore } from '../../store/tripStore';

type TripState = 'IDLE' | 'POSSIBLE_TRIP' | 'ACTIVE_TRIP' | 'POSSIBLE_STOP';

const SPEED_START_THRESHOLD_MS = 15 / 3.6;
const SPEED_STOP_THRESHOLD_MS = 5 / 3.6;
const POSSIBLE_TRIP_DURATION_MS = 30_000;
const POSSIBLE_TRIP_DISTANCE_KM = 0.5;
const POSSIBLE_STOP_DURATION_MS = 60_000;
const STOP_CONFIRM_DURATION_MS = 180_000;
const WAYPOINT_FLUSH_INTERVAL_MS = 30_000;
const WAYPOINT_FLUSH_MAX_POINTS = 50;

export interface LocationUpdate {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

class TripDetectorClass {
  private static instance: TripDetectorClass;
  private state: TripState = 'IDLE';
  private currentTripId: string | null = null;
  private possibleTripStartTime: number | null = null;
  private possibleTripStartLat: number | null = null;
  private possibleTripStartLng: number | null = null;
  private possibleStopStartTime: number | null = null;
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  private tripDistanceKm = 0;
  private waypointBuffer: WaypointPoint[] = [];
  private lastWaypointFlush = 0;
  private waypointBatchIndex = 0;
  private lastSpeedLimitKmh: number | null = null;

  static getInstance(): TripDetectorClass {
    if (!TripDetectorClass.instance) {
      TripDetectorClass.instance = new TripDetectorClass();
    }
    return TripDetectorClass.instance;
  }

  setSpeedLimit(limitKmh: number | null) {
    this.lastSpeedLimitKmh = limitKmh;
  }

  async onLocationUpdate(loc: LocationUpdate) {
    if (loc.accuracy > 50 && this.state !== 'ACTIVE_TRIP') return;
    const speedKmh = msToKmh(loc.speed);

    switch (this.state) {
      case 'IDLE':
        if (loc.speed >= SPEED_START_THRESHOLD_MS) {
          this.state = 'POSSIBLE_TRIP';
          this.possibleTripStartTime = loc.timestamp;
          this.possibleTripStartLat = loc.lat;
          this.possibleTripStartLng = loc.lng;
          this.tripDistanceKm = 0;
        }
        break;

      case 'POSSIBLE_TRIP': {
        if (loc.speed < SPEED_START_THRESHOLD_MS) {
          this.state = 'IDLE';
          break;
        }
        const elapsed = loc.timestamp - (this.possibleTripStartTime ?? loc.timestamp);
        const dist = haversineDistanceKm(
          this.possibleTripStartLat!, this.possibleTripStartLng!, loc.lat, loc.lng,
        );
        if (elapsed >= POSSIBLE_TRIP_DURATION_MS && dist >= POSSIBLE_TRIP_DISTANCE_KM) {
          this.state = 'ACTIVE_TRIP';
          await this.startTrip(loc);
        }
        break;
      }

      case 'ACTIVE_TRIP': {
        if (this.lastLat !== null && this.lastLng !== null) {
          this.tripDistanceKm += haversineDistanceKm(this.lastLat, this.lastLng, loc.lat, loc.lng);
        }

        this.waypointBuffer.push({
          lat: loc.lat, lng: loc.lng, speed: loc.speed,
          speedLimit: this.lastSpeedLimitKmh,
          heading: loc.heading, timestamp: loc.timestamp,
        });

        const now = Date.now();
        if (
          this.waypointBuffer.length >= WAYPOINT_FLUSH_MAX_POINTS ||
          now - this.lastWaypointFlush >= WAYPOINT_FLUSH_INTERVAL_MS
        ) {
          await this.flushWaypoints();
        }

        const store = useTripStore.getState();
        const elapsedSec = Math.floor((loc.timestamp - (store.activeTrip?.startedAt ?? loc.timestamp)) / 1000);
        store.updateActiveTrip({
          currentSpeedKmh: speedKmh,
          currentSpeedLimitKmh: this.lastSpeedLimitKmh,
          topSpeedKmh: Math.max(store.activeTrip?.topSpeedKmh ?? 0, speedKmh),
          distanceKm: Math.round(this.tripDistanceKm * 10) / 10,
          durationSeconds: elapsedSec,
        });

        if (loc.speed < SPEED_STOP_THRESHOLD_MS) {
          this.state = 'POSSIBLE_STOP';
          this.possibleStopStartTime = loc.timestamp;
        }
        break;
      }

      case 'POSSIBLE_STOP': {
        if (loc.speed >= SPEED_START_THRESHOLD_MS) {
          this.state = 'ACTIVE_TRIP';
          this.possibleStopStartTime = null;
          break;
        }
        const stopDuration = loc.timestamp - (this.possibleStopStartTime ?? loc.timestamp);
        if (stopDuration >= STOP_CONFIRM_DURATION_MS) {
          await this.endTrip(loc);
        }
        break;
      }
    }

    this.lastLat = loc.lat;
    this.lastLng = loc.lng;
  }

  private async startTrip(loc: LocationUpdate) {
    const user = pb.authStore.model;
    if (!user) return;

    const tripId = await createTrip(user.id, {
      origin_lat: this.possibleTripStartLat ?? loc.lat,
      origin_lng: this.possibleTripStartLng ?? loc.lng,
      top_speed_kmh: msToKmh(loc.speed),
      started_at: new Date(loc.timestamp).toISOString(),
    } as any);

    this.currentTripId = tripId;
    this.waypointBatchIndex = 0;
    this.lastWaypointFlush = Date.now();

    useTripStore.getState().setActiveTrip({
      tripId,
      startedAt: loc.timestamp,
      distanceKm: 0,
      durationSeconds: 0,
      currentSpeedKmh: msToKmh(loc.speed),
      currentSpeedLimitKmh: this.lastSpeedLimitKmh,
      topSpeedKmh: msToKmh(loc.speed),
      destinationAddress: null,
      destinationLat: null,
      destinationLng: null,
      estimatedDurationMinutes: null,
      driveScore: 100,
      speedingEventCount: 0,
      hardBrakeCount: 0,
      hardAccelCount: 0,
      isPaused: false,
    });
  }

  private async endTrip(loc: LocationUpdate) {
    if (!this.currentTripId) return;
    await this.flushWaypoints();

    const store = useTripStore.getState();
    const active = store.activeTrip;
    const durationMinutes = active
      ? Math.floor((loc.timestamp - active.startedAt) / 60_000)
      : 0;

    await completeTrip(this.currentTripId, {
      distance_km: this.tripDistanceKm,
      duration_minutes: durationMinutes,
      top_speed_kmh: active?.topSpeedKmh ?? 0,
      speeding_event_count: active?.speedingEventCount ?? 0,
      hard_brake_count: active?.hardBrakeCount ?? 0,
      hard_acceleration_count: active?.hardAccelCount ?? 0,
      waypoint_batch_count: this.waypointBatchIndex,
      ended_at: new Date(loc.timestamp).toISOString(),
    } as any);

    this.state = 'IDLE';
    this.currentTripId = null;
    this.tripDistanceKm = 0;
    this.waypointBuffer = [];
    this.possibleStopStartTime = null;
    store.setActiveTrip(null);
  }

  private async flushWaypoints() {
    if (this.waypointBuffer.length === 0 || !this.currentTripId) return;
    const batch = [...this.waypointBuffer];
    this.waypointBuffer = [];
    this.lastWaypointFlush = Date.now();
    await flushWaypointBatch(this.currentTripId, this.waypointBatchIndex++, batch);
  }

  getCurrentTripId() { return this.currentTripId; }
  getState() { return this.state; }
}

export const TripDetector = TripDetectorClass;
