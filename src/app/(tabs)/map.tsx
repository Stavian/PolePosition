import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFriendLocations } from '../../hooks/useFriendLocations';
import { useLocationStore } from '../../store/locationStore';
import { useGroupStore } from '../../store/groupStore';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';
import { haversineDistanceKm, msToKmh } from '../../utils/geoUtils';

export default function MapScreen() {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{de.map.title}</Text>
        <Text style={styles.subtitle}>
          {activeFriends.length > 0
            ? `${activeFriends.length} ${de.map.friendsOnline}`
            : de.map.noFriendsOnline}
        </Text>
      </View>

      {/* Map placeholder — requires dev build */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺</Text>
        <Text style={styles.mapPlaceholderTitle}>Karte</Text>
        <Text style={styles.mapPlaceholderText}>
          Die interaktive Karte ist im Development Build verfügbar.
        </Text>
      </View>

      {/* Nearby friends */}
      <ScrollView contentContainerStyle={styles.list}>
        {nearbyFriends.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Keine Freunde in der Nähe</Text>
          </View>
        ) : (
          nearbyFriends.map(({ uid, member, distanceKm, speedKmh }) => (
            <View key={uid} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{member?.displayName ?? uid}</Text>
                <Text style={styles.friendDist}>
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m entfernt`
                    : `${distanceKm.toFixed(1)} km entfernt`}
                </Text>
              </View>
              {speedKmh > 5 && (
                <Text style={styles.friendSpeed}>{Math.round(speedKmh)} km/h</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  mapPlaceholder: {
    margin: 16,
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapIcon: { fontSize: 40 },
  mapPlaceholderTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  mapPlaceholderText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  empty: { paddingTop: 16, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  friendCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  friendInfo: { gap: 2 },
  friendName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  friendDist: { color: colors.textMuted, fontSize: 12 },
  friendSpeed: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
