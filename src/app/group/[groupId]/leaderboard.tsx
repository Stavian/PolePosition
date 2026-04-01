import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGroupStore } from '../../../store/groupStore';
import { ScoreRing } from '../../../components/ui/ScoreRing';
import { de } from '../../../i18n/de';
import { colors } from '../../../utils/colors';
import type { GroupMemberDocument } from '../../../types/firestore';

type Period = 'weekly' | 'monthly' | 'allTime';

export default function LeaderboardScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const members = useGroupStore((s) => s.members);
  const [period, setPeriod] = useState<Period>('weekly');

  const sorted = [...members].sort((a, b) => {
    const scoreA = period === 'weekly' ? a.weeklyScore : period === 'monthly' ? a.monthlyScore : a.allTimeScore;
    const scoreB = period === 'weekly' ? b.weeklyScore : period === 'monthly' ? b.monthlyScore : b.allTimeScore;
    return scoreB - scoreA;
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'weekly', label: de.group.weekly },
    { key: 'monthly', label: de.group.monthly },
    { key: 'allTime', label: de.group.allTime },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← {de.back}</Text>
        </Pressable>
        <Text style={styles.title}>{de.group.leaderboard}</Text>
      </View>

      <View style={styles.periodBar}>
        {PERIODS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.periodChip, period === key && styles.periodChipActive]}
            onPress={() => setPeriod(key)}
          >
            <Text style={[styles.periodText, period === key && styles.periodTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {sorted.map((member, index) => {
          const score = period === 'weekly' ? member.weeklyScore : period === 'monthly' ? member.monthlyScore : member.allTimeScore;
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
          return (
            <View key={member.uid} style={[styles.row, index === 0 && styles.rowFirst]}>
              <Text style={styles.rank}>{medal ?? `${index + 1}.`}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>{member.displayName}</Text>
                <Text style={styles.sub}>
                  {member.weeklyTrips} Fahrten · {member.weeklyDistanceKm.toFixed(0)} km
                </Text>
              </View>
              <ScoreRing score={score} size={52} label="Score" />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 12 },
  back: { color: colors.textMuted, fontSize: 15 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  periodBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  periodText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowFirst: {
    borderColor: '#b8860b',
    backgroundColor: '#1a1500',
  },
  rank: { fontSize: 22, width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 12 },
});
