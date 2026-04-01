export interface ScoringEvent {
  type: 'speeding' | 'hardBrake' | 'hardAccel';
  timestamp: number;        // Unix ms
  durationMs: number;
  magnitude: number;        // km/h over limit OR g-force
}

export interface SpeedingSample {
  overByKmh: number;
  durationSeconds: number;
}

export interface DriveScoreComponents {
  speedingScore: number;    // 0–100
  brakingScore: number;     // 0–100
  accelerationScore: number; // 0–100
  finalScore: number;       // weighted average
}

export const SCORE_WEIGHTS = {
  speeding: 0.4,
  braking: 0.3,
  acceleration: 0.3,
} as const;

export const HARD_BRAKE_THRESHOLD_G = 0.35;
export const HARD_ACCEL_THRESHOLD_G = 0.35;
export const HARD_EVENT_MIN_DURATION_MS = 500;
export const ACCELEROMETER_SAMPLE_RATE_HZ = 10;
