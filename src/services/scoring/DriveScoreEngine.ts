import {
  SCORE_WEIGHTS,
  HARD_BRAKE_THRESHOLD_G,
  HARD_ACCEL_THRESHOLD_G,
  HARD_EVENT_MIN_DURATION_MS,
  type ScoringEvent,
  type SpeedingSample,
  type DriveScoreComponents,
} from '../../types/scoring';
import { useTripStore } from '../../store/tripStore';

const MAX_SPEEDING_PENALTY_FACTOR = 200; // 200 km/h·s per second of trip = score 0
const HARD_EVENT_DEDUCTION = 5;           // points per hard brake/accel event

class DriveScoreEngineClass {
  private static instance: DriveScoreEngineClass;

  // Speeding tracking
  private speedingSamples: SpeedingSample[] = [];
  private currentSpeedingStart: number | null = null;
  private currentOverByKmh = 0;
  private tripStartTime: number | null = null;

  // Hard event tracking
  private events: ScoringEvent[] = [];
  private hardBrakeActive = false;
  private hardAccelActive = false;
  private hardBrakeStart: number | null = null;
  private hardAccelStart: number | null = null;

  // Accelerometer (g-force in each axis)
  private lastAx = 0;
  private lastAy = 0;
  private lastAz = 0;

  static getInstance(): DriveScoreEngineClass {
    if (!DriveScoreEngineClass.instance) {
      DriveScoreEngineClass.instance = new DriveScoreEngineClass();
    }
    return DriveScoreEngineClass.instance;
  }

  startTrip(startTimeMs: number) {
    this.tripStartTime = startTimeMs;
    this.speedingSamples = [];
    this.events = [];
    this.currentSpeedingStart = null;
    this.hardBrakeActive = false;
    this.hardAccelActive = false;
  }

  /** Called every GPS tick (speed in km/h, limit in km/h) */
  onSpeedUpdate(speedKmh: number, limitKmh: number | null, timestamp: number) {
    if (limitKmh === null) return;

    const overBy = speedKmh - limitKmh;

    if (overBy > 3) {
      // Speeding (> 3 km/h tolerance)
      if (this.currentSpeedingStart === null) {
        this.currentSpeedingStart = timestamp;
        this.currentOverByKmh = overBy;
      } else {
        this.currentOverByKmh = Math.max(this.currentOverByKmh, overBy);
      }
    } else {
      // Not speeding — close open speeding sample
      if (this.currentSpeedingStart !== null) {
        const durationSec = (timestamp - this.currentSpeedingStart) / 1000;
        this.speedingSamples.push({
          overByKmh: this.currentOverByKmh,
          durationSeconds: durationSec,
        });
        this.currentSpeedingStart = null;
        this.currentOverByKmh = 0;
      }
    }

    this.updateLiveScore();
  }

  /** Called from accelerometer subscription (10Hz) */
  onAccelerometerUpdate(ax: number, ay: number, az: number, timestamp: number) {
    // Longitudinal G-force (forward/backward) — use Y axis (device on dashboard)
    // In practice this is device-orientation dependent; we use the magnitude of
    // the net delta from baseline (9.8m/s² gravity), projected longitudinally
    const gForce = Math.sqrt(ax * ax + ay * ay + az * az) / 9.81;
    const longitudinalG = Math.abs(ay / 9.81); // simplified, adjust per mount

    // Hard brake detection (deceleration)
    if (longitudinalG >= HARD_BRAKE_THRESHOLD_G) {
      if (!this.hardBrakeActive) {
        this.hardBrakeActive = true;
        this.hardBrakeStart = timestamp;
      } else if (timestamp - (this.hardBrakeStart ?? timestamp) >= HARD_EVENT_MIN_DURATION_MS) {
        // Record event once threshold duration is exceeded
        const existing = this.events.find(
          (e) => e.type === 'hardBrake' && timestamp - e.timestamp < 5000,
        );
        if (!existing) {
          this.events.push({
            type: 'hardBrake',
            timestamp,
            durationMs: timestamp - (this.hardBrakeStart ?? timestamp),
            magnitude: longitudinalG,
          });
          useTripStore.getState().updateActiveTrip({
            hardBrakeCount: (useTripStore.getState().activeTrip?.hardBrakeCount ?? 0) + 1,
          });
        }
      }
    } else {
      this.hardBrakeActive = false;
      this.hardBrakeStart = null;
    }

    // Hard acceleration detection
    // Use negative ay (acceleration forward) — simplified
    const accelG = Math.abs((-ay) / 9.81);
    if (accelG >= HARD_ACCEL_THRESHOLD_G) {
      if (!this.hardAccelActive) {
        this.hardAccelActive = true;
        this.hardAccelStart = timestamp;
      } else if (timestamp - (this.hardAccelStart ?? timestamp) >= HARD_EVENT_MIN_DURATION_MS) {
        const existing = this.events.find(
          (e) => e.type === 'hardAccel' && timestamp - e.timestamp < 5000,
        );
        if (!existing) {
          this.events.push({
            type: 'hardAccel',
            timestamp,
            durationMs: timestamp - (this.hardAccelStart ?? timestamp),
            magnitude: accelG,
          });
          useTripStore.getState().updateActiveTrip({
            hardAccelCount: (useTripStore.getState().activeTrip?.hardAccelCount ?? 0) + 1,
          });
        }
      }
    } else {
      this.hardAccelActive = false;
      this.hardAccelStart = null;
    }
  }

  /** Compute final score (called on trip completion) */
  computeFinalScore(tripDurationSeconds: number): DriveScoreComponents {
    return this.computeScore(tripDurationSeconds);
  }

  private computeScore(tripDurationSeconds: number): DriveScoreComponents {
    // Speeding score
    const totalPenalty = this.speedingSamples.reduce(
      (sum, s) => sum + s.overByKmh * s.durationSeconds,
      0,
    );
    const normalizedPenalty = tripDurationSeconds > 0
      ? totalPenalty / tripDurationSeconds
      : 0;
    const speedingScore = Math.max(
      0,
      Math.round(100 - (normalizedPenalty / MAX_SPEEDING_PENALTY_FACTOR) * 100),
    );

    // Braking score
    const hardBrakes = this.events.filter((e) => e.type === 'hardBrake').length;
    const brakingScore = Math.max(0, 100 - hardBrakes * HARD_EVENT_DEDUCTION);

    // Acceleration score
    const hardAccels = this.events.filter((e) => e.type === 'hardAccel').length;
    const accelerationScore = Math.max(0, 100 - hardAccels * HARD_EVENT_DEDUCTION);

    const finalScore = Math.round(
      speedingScore * SCORE_WEIGHTS.speeding +
      brakingScore * SCORE_WEIGHTS.braking +
      accelerationScore * SCORE_WEIGHTS.acceleration,
    );

    return { speedingScore, brakingScore, accelerationScore, finalScore };
  }

  private updateLiveScore() {
    const store = useTripStore.getState();
    if (!store.activeTrip) return;
    const elapsed = store.activeTrip.durationSeconds || 1;
    const { finalScore } = this.computeScore(elapsed);
    store.updateActiveTrip({ driveScore: finalScore });
  }

  getEvents() {
    return this.events;
  }
}

export const DriveScoreEngine = DriveScoreEngineClass;
