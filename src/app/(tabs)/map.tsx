import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFriendLocations } from '../../hooks/useFriendLocations';
import { useLocationStore } from '../../store/locationStore';
import { useGroupStore } from '../../store/groupStore';
import { FriendMarker } from '../../components/map/FriendMarker';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';
import { haversineDistanceKm, msToKmh } from '../../utils/geoUtils';

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const myLocation = useLocationStore((s) => s.myLocation);
  const friendLocations = useLocationStore((s) => s.friendLocations);
  const members = useGroupStore((s) => s.members);

  useFriendLocations();

  const activeFriends = Object.entries(friendLocations).filter(
    ([, loc]) => loc.isActive,
  );

  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]));

  const nearbyFriends = myLocation
    ? activeFriends
        .map(([uid, loc]) => ({
          uid,
          member: memberMap[uid],
          distanceKm: haversineDistanceKm(
            myLocation.lat, myLocation.lng,
            loc.lat, loc.lng,
          ),
          speedKmh: msToKmh(loc.speed),
        }))
        .filter((f) => f.distanceKm <= 50)
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  const centerOnMe = () => {
    if (myLocation) {
      mapRef.current?.animateToRegion({
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: myLocation?.lat ?? 51.1657,
          longitude: myLocation?.lng ?? 10.4515,
          latitudeDelta: 1,
          longitudeDelta: 1,
        }}
        customMapStyle={darkMapStyle}
      >
        {activeFriends.map(([uid, loc]) => {
          const member = memberMap[uid];
          if (!member) return null;
          return (
            <FriendMarker
              key={uid}
              uid={uid}
              displayName={member.displayName}
              avatarUrl={member.avatarUrl}
              location={loc}
            />
          );
        })}
      </MapView>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topContent}>
          <Text style={styles.title}>{de.map.title}</Text>
          <View style={styles.topActions}>
            <Pressable
              style={styles.mapTypeBtn}
              onPress={() => setMapType((t) => (t === 'standard' ? 'satellite' : 'standard'))}
            >
              <Text style={styles.mapTypeBtnText}>
                {mapType === 'standard' ? '🛰 Satellit' : '🗺 Standard'}
              </Text>
            </Pressable>
            <Pressable style={styles.centerBtn} onPress={centerOnMe}>
              <Text style={styles.centerBtnText}>◎</Text>
            </Pressable>
          </View>
        </View>

        {/* Active friends count */}
        <View style={styles.statsChip}>
          <Text style={styles.statsChipText}>
            {activeFriends.length > 0
              ? `${activeFriends.length} ${de.map.friendsOnline}`
              : de.map.noFriendsOnline}
          </Text>
        </View>
      </SafeAreaView>

      {/* Nearby friends strip */}
      {nearbyFriends.length > 0 && (
        <View style={styles.nearbyStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyContent}>
            {nearbyFriends.map(({ uid, member, distanceKm, speedKmh }) => (
              <View key={uid} style={styles.nearbyChip}>
                <Text style={styles.nearbyName}>{member?.displayName ?? uid}</Text>
                <Text style={styles.nearbyDist}>
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(1)} km`}
                </Text>
                {speedKmh > 5 && (
                  <Text style={styles.nearbySpeed}>{speedKmh} km/h</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  topActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  mapTypeBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapTypeBtnText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  centerBtn: {
    backgroundColor: colors.accent,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statsChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10,10,10,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  nearbyStrip: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  nearbyContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  nearbyChip: {
    backgroundColor: 'rgba(20,20,20,0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nearbyName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  nearbyDist: { color: colors.textMuted, fontSize: 11 },
  nearbySpeed: { color: colors.accent, fontSize: 11, fontWeight: '600' },
});

// Google Maps dark style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3d5a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2e' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
