import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroupStore } from '../../store/groupStore';
import { useAuth } from '../../hooks/useAuth';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { getAllUsersLeaderboard } from '../../services/pocketbase/location';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';

type Period = 'week' | 'month' | 'alltime';

export default function LeaderboardScreen() {
  const user = useAuth();
  const { members, setMembers } = useGroupStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('week');

  const load = useCallback(async () => {
    try {
      const data = await getAllUsersLeaderboard();
      setMembers(data.map((u) => ({
        uid: u.id,
        displayName: u.name,
        role: 'member' as const,
        joinedAt: null as any,
        weeklyScore: u.weeklyScore,
        monthlyScore: u.weeklyScore,
        allTimeScore: u.weeklyScore,
        weeklyTrips: u.weeklyTrips,
        weeklyDistanceKm: u.weeklyDistanceKm,
      })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setMembers]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: 'Diese Woche' },
    { key: 'month', label: 'Monat' },
    { key: 'alltime', label: 'Gesamt' },
  ];

  const sorted = [...members].sort((a, b) => {
    const score = (m: typeof a) =>
      period === 'week' ? m.weeklyScore : period === 'month' ? m.monthlyScore : m.allTimeScore;
    return score(b) - score(a);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{de.group.leaderboard}</Text>
        <Text style={styles.count}>{members.length} Fahrer</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodBar}>
        {PERIODS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.chip, period === key && styles.chipActive]}
            onPress={() => setPeriod(key)}
          >
            <Text style={[styles.chipText, period === key && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {sorted.map((member, index) => (
            <LeaderboardRow
              key={member.uid}
              member={member}
              rank={index + 1}
              isMe={member.uid === user?.id}
              period={period}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LeaderboardRow({
  member,
  rank,
  isMe,
  period,
}: {
  member: any;
  rank: number;
  isMe: boolean;
  period: Period;
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const score =
    period === 'week'
      ? member.weeklyScore
      : period === 'month'
      ? member.monthlyScore
      : member.allTimeScore;

  return (
    <View style={[lbStyles.row, isMe && lbStyles.rowMe]}>
      <Text style={lbStyles.rank}>{medal ?? `${rank}.`}</Text>
      <View style={lbStyles.info}>
        <View style={lbStyles.nameRow}>
          <Text style={lbStyles.name}>{member.displayName}</Text>
          {isMe && <Text style={lbStyles.youBadge}>Du</Text>}
        </View>
        <Text style={lbStyles.sub}>
          {member.weeklyTrips} Fahrten · {member.weeklyDistanceKm.toFixed(0)} km
        </Text>
      </View>
      <ScoreRing score={score} size={44} />
    </View>
  );
}

const lbStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMe: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  rank: { fontSize: 18, width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  youBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  sub: { color: colors.textMuted, fontSize: 12 },
});

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
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, gap: 8, paddingBottom: 32 },
});
