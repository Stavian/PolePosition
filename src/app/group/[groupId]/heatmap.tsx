import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pb } from '../../../services/pocketbase/client';
import { Collections } from '../../../services/pocketbase/collections';
import type { HeatmapPointsRecord } from '../../../services/pocketbase/collections';
import { colors } from '../../../utils/colors';
import { de } from '../../../i18n/de';

export default function HeatmapScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const [pointCount, setPointCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      try {
        const record = await pb
          .collection(Collections.HeatmapPoints)
          .getFirstListItem<HeatmapPointsRecord>(`group_id="${groupId}"`);
        const raw: unknown[] = JSON.parse(record.points ?? '[]');
        setPointCount(raw.length);
      } catch {
        // No heatmap data yet
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>{de.group.heatmap}</Text>
        <Text style={styles.pointCount}>{pointCount} Punkte</Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🔥</Text>
        <Text style={styles.placeholderTitle}>Heatmap</Text>
        <Text style={styles.placeholderText}>
          Die interaktive Heatmap ist im Development Build verfügbar.
        </Text>
        {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.text, fontSize: 20, width: 28 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  pointCount: { color: colors.textMuted, fontSize: 12 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
  },
  placeholderIcon: { fontSize: 56 },
  placeholderTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
