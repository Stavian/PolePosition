import { useEffect } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useAuth } from './useAuth';
import { subscribeToAllUserLocations } from '../services/pocketbase/location';

/**
 * Subscribes to PocketBase realtime location updates for ALL other users.
 * Since the app is private (friends only), everyone shares the same map.
 */
export function useFriendLocations() {
  const user = useAuth();
  const { setFriendLocation, clearFriendLocations } = useLocationStore();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAllUserLocations(user.id, (userId, loc) => {
      setFriendLocation(userId, {
        lat: loc.lat,
        lng: loc.lng,
        speed: loc.speed,
        heading: loc.heading,
        accuracy: loc.accuracy,
        isActive: loc.is_active,
        activeTripId: loc.active_trip_id || null,
        updatedAt: null as any,
      });
    });

    return () => {
      unsubscribe();
      clearFriendLocations();
    };
  }, [user?.id]);
}
