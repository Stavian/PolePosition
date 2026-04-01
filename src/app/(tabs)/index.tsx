import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserDoc } from '../../hooks/useAuth';
import { useTripStore } from '../../store/tripStore';
import { useGroupStore } from '../../store/groupStore';
import { useLocationStore } from '../../store/locationStore';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';
import { haversineDistanceKm } from '../../utils/geoUtils';

export default function HomeScreen() {
  const router = useRouter();
  const userDoc = useUserDoc();
  const activeTrip = useTripStore((s) => s.activeTrip);
  const members = useGroupStore((s) => s.members);
  const myLocation = useLocationStore((s) => s.myLocation);
  const friendLocations = useLocationStore((s) => s.friendLocations);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  const nearbyCount = myLocation
    ? Object.values(friendLocations).filter(
        (loc) =>
          loc.isActive &&
          haversineDistanceKm(myLocation.lat, myLocation.lng, loc.lat, loc.lng) <= 10,
      ).length
    : 0;

  const weeklyScore = (userDoc as any)?.weekly_drive_score ?? 0;
  const topDriver = members[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Greeting */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{(userDoc as any)?.name ?? '…'} 👋</Text>
          </View>
          <ScoreRing score={weeklyScore} size={68} label="Woche" />
        </View>

        {/* Active trip banner */}
        {activeTrip && (
          <Pressable style={styles.activeTripBanner} onPress={() => router.push('/(tabs)/drive')}>
            <View style={styles.activeTripDot} />
            <View style={styles.activeTripInfo}>
              <Text style={styles.activeTripTitle}>{de.home.activeTrip}</Text>
              <Text style={styles.activeTripSub}>
                {activeTrip.distanceKm.toFixed(1)} km · {activeTrip.currentSpeedKmh} km/h
              </Text>
            </View>
            <Text style={styles.activeTripArrow}>›</Text>
          </Pressable>
        )}

        {/* Quick action */}
        <Pressable
          style={styles.startBtn}
          onPress={() => router.push('/(tabs)/drive')}
        >
          <Text style={styles.startBtnIcon}>🚗</Text>
          <Text style={styles.startBtnText}>{de.home.startDrive}</Text>
        </Pressable>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Fahrten gesamt', value: String((userDoc as any)?.total_trips ?? 0), icon: '📋' },
            { label: 'Kilometer gesamt', value: `${((userDoc as any)?.total_distance_km ?? 0).toFixed(0)} km`, icon: '📏' },
            { label: 'Abzeichen', value: String((userDoc as any)?.badge_ids?.length ?? 0), icon: '🏅' },
            { label: 'In der Nähe', value: String(nearbyCount), icon: '👥' },
          ].map(({ label, value, icon }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statIcon}>{icon}</Text>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Leaderboard preview card */}
        <Pressable style={styles.leaderboardCard} onPress={() => router.push('/(tabs)/group')}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.leaderboardTitle}>🏆 {de.group.leaderboard}</Text>
            <Text style={styles.leaderboardArrow}>›</Text>
          </View>
          {topDriver ? (
            <Text style={styles.leaderboardSub}>
              Führend: {topDriver.displayName} · {topDriver.weeklyScore} Punkte diese Woche
            </Text>
          ) : (
            <Text style={styles.leaderboardSub}>Noch keine Fahrten diese Woche</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, gap: 16, paddingBottom: 32 },
  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 4,
  },
  greeting: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', color: colors.text },
  activeTripBanner: {
    backgroundColor: colors.accentDim,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  activeTripDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  activeTripInfo: { flex: 1 },
  activeTripTitle: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  activeTripSub: { color: colors.textMuted, fontSize: 12 },
  activeTripArrow: { color: colors.accent, fontSize: 22 },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startBtnIcon: { fontSize: 22 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  leaderboardCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaderboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaderboardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  leaderboardArrow: { color: colors.textDisabled, fontSize: 22 },
  leaderboardSub: { color: colors.textMuted, fontSize: 13 },
});
