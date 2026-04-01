import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { pb } from '../pocketbase/client';
import { upsertUserLocation } from '../pocketbase/location';

export const BACKGROUND_LOCATION_TASK = 'DRIVEPACK_BACKGROUND_LOCATION';

/**
 * Register the background location task.
 * Must be called at the module level (top of the app entry file), NOT inside a component.
 */
export function registerBackgroundLocationTask() {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('[BackgroundTask] error:', error.message);
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const userId = pb.authStore.model?.id;
    if (!userId) return;

    const loc = locations[locations.length - 1]; // most recent
    const { latitude, longitude, speed, heading, accuracy } = loc.coords;

    // Feed into TripDetector state machine
    const { TripDetector } = await import('./TripDetector');
    await TripDetector.getInstance().onLocationUpdate({
      lat: latitude,
      lng: longitude,
      speed: Math.max(speed ?? 0, 0),
      heading: heading ?? 0,
      accuracy: accuracy ?? 999,
      timestamp: loc.timestamp,
    });

    // Write live location to PocketBase (one record per user, upserted)
    await upsertUserLocation(userId, {
      lat: latitude,
      lng: longitude,
      speed: Math.max(speed ?? 0, 0),
      heading: heading ?? 0,
      accuracy: accuracy ?? 999,
      is_active: true,
      active_trip_id: '',
    });
  });
}

/** Start background GPS updates */
export async function startBackgroundLocation() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Background location permission denied');
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 3000,
    distanceInterval: 5,
    showsBackgroundLocationIndicator: true, // iOS blue bar
    foregroundService: {
      notificationTitle: 'PolePosition',
      notificationBody: 'Fahrt wird aufgezeichnet…',
      notificationColor: '#E8341C',
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
  });
}

/** Stop background GPS updates */
export async function stopBackgroundLocation() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
