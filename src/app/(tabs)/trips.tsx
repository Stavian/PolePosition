import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getUserTrips } from '../../services/pocketbase/trips';
import { TripCard } from '../../components/trips/TripCard';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';
import type { TripRecord } from '../../services/pocketbase/collections';

type Filter = 'all' | 'today' | 'week';

export default function TripsScreen() {
  const user = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTrips();
  }, [user?.id]);

  const loadTrips = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserTrips(user.id, 1, 50);
      setTrips(data);
    } finally {
      setLoading(false);
    }
  };

  const [filter, setFilter] = useState<Filter>('all');

  const filteredTrips = trips.filter((t) => {
    if (filter === 'today') {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      return new Date(t.started_at).getTime() >= todayStart;
    }
    if (filter === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(t.started_at).getTime() >= weekAgo;
    }
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: de.trips.filterAll },
    { key: 'today', label: de.trips.filterToday },
    { key: 'week', label: de.trips.filterThisWeek },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{de.trips.title}</Text>
        <Text style={styles.count}>{filteredTrips.length} Fahrten</Text>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {FILTERS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filteredTrips.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyText}>{de.trips.noTrips}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredTrips}
          keyExtractor={(t) => t.id}
          estimatedItemSize={110}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TripCard
              trip={item as any}
              onPress={() => router.push(`/trip/${item.id}` as any)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  count: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
});
