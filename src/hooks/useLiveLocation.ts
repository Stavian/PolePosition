import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../store/locationStore';
import { useAuth } from './useAuth';
import { SpeedLimitService } from '../services/location/SpeedLimitService';
import { TripDetector } from '../services/location/TripDetector';
import { DriveScoreEngine } from '../services/scoring/DriveScoreEngine';
import { msToKmh } from '../utils/geoUtils';
import { upsertUserLocation } from '../services/pocketbase/location';

/** Foreground location watcher — runs while the drive screen is visible */
export function useLiveLocation() {
  const user = useAuth();
  const setMyLocation = useLocationStore((s) => s.setMyLocation);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
        },
        async (loc) => {
          if (!mounted) return;
          const { latitude, longitude, speed, heading, accuracy } = loc.coords;
          const speedKmh = msToKmh(Math.max(speed ?? 0, 0));

          // Speed limit
          const { limitKmh } = await SpeedLimitService.getInstance().getSpeedLimit(
            latitude, longitude, heading ?? 0,
          );
          TripDetector.getInstance().setSpeedLimit(limitKmh);

          // Score engine
          DriveScoreEngine.getInstance().onSpeedUpdate(speedKmh, limitKmh, loc.timestamp);

          // Trip detector
          await TripDetector.getInstance().onLocationUpdate({
            lat: latitude, lng: longitude,
            speed: Math.max(speed ?? 0, 0),
            heading: heading ?? 0,
            accuracy: accuracy ?? 999,
            timestamp: loc.timestamp,
          });

          // Write live location to PocketBase
          await upsertUserLocation(user.id, {
            lat: latitude,
            lng: longitude,
            speed: Math.max(speed ?? 0, 0),
            heading: heading ?? 0,
            accuracy: accuracy ?? 999,
            is_active: true,
            active_trip_id: TripDetector.getInstance().getCurrentTripId() ?? '',
          });

          setMyLocation({
            lat: latitude, lng: longitude,
            speed: Math.max(speed ?? 0, 0),
            heading: heading ?? 0,
            accuracy: accuracy ?? 999,
            isActive: true,
            activeTripId: TripDetector.getInstance().getCurrentTripId(),
            updatedAt: null as any,
          });
        },
      );
    })();

    return () => {
      mounted = false;
      subRef.current?.remove();
    };
  }, [user?.id]);
}
