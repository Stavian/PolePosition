import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { DriveScoreEngine } from '../services/scoring/DriveScoreEngine';
import { useTripStore } from '../store/tripStore';

const SAMPLE_INTERVAL_MS = 100; // 10 Hz

/** Feeds accelerometer data into DriveScoreEngine while a trip is active */
export function useAccelerometer() {
  const activeTrip = useTripStore((s) => s.activeTrip);
  const subRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  useEffect(() => {
    if (!activeTrip) {
      subRef.current?.remove();
      subRef.current = null;
      return;
    }

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    subRef.current = Accelerometer.addListener(({ x, y, z }) => {
      DriveScoreEngine.getInstance().onAccelerometerUpdate(x, y, z, Date.now());
    });

    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [!!activeTrip]);
}
