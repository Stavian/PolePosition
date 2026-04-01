import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '../../utils/colors';
import { msToKmh } from '../../utils/geoUtils';
import type { CurrentLocationDocument } from '../../types/firestore';

interface FriendMarkerProps {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  location: CurrentLocationDocument;
  onPress?: () => void;
}

export function FriendMarker({ uid, displayName, avatarUrl, location, onPress }: FriendMarkerProps) {
  const coordAnim = useRef({
    lat: new Animated.Value(location.lat),
    lng: new Animated.Value(location.lng),
  }).current;

  const speedKmh = msToKmh(location.speed);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(coordAnim.lat, {
        toValue: location.lat,
        useNativeDriver: false,
        tension: 60,
        friction: 12,
      }),
      Animated.spring(coordAnim.lng, {
        toValue: location.lng,
        useNativeDriver: false,
        tension: 60,
        friction: 12,
      }),
    ]).start();
  }, [location.lat, location.lng]);

  return (
    <Marker
      coordinate={{ latitude: location.lat, longitude: location.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Text style={styles.name}>{displayName.split(' ')[0]}</Text>
          {location.isActive && (
            <Text style={styles.speed}>{speedKmh} km/h</Text>
          )}
        </View>
        <View style={styles.pin} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: colors.friendPin,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  name: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  speed: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '500',
  },
  pin: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.friendPin,
  },
});
