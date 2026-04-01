import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../utils/colors';
import { ScoreRing } from '../ui/ScoreRing';
import { formatTripDate, formatDuration } from '../../utils/geoUtils';
import type { TripDocument } from '../../types/firestore';

interface TripCardProps {
  trip: TripDocument;
  onPress?: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const startMs = trip.startedAt?.toMillis?.() ?? 0;
  const durationSec = trip.durationMinutes * 60;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <ScoreRing score={trip.driveScore} size={56} />
      </View>

      <View style={styles.middle}>
        <Text style={styles.date}>{formatTripDate(startMs)}</Text>
        <Text style={styles.route} numberOfLines={1}>
          {trip.destinationAddress ?? 'Freie Fahrt'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaItem}>📏 {trip.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.metaItem}>⏱ {formatDuration(durationSec)}</Text>
          <Text style={styles.metaItem}>⚡ {trip.topSpeedKmh} km/h</Text>
        </View>
        {trip.tags.length > 0 && (
          <View style={styles.tags}>
            {trip.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: { alignItems: 'center' },
  middle: { flex: 1, gap: 4 },
  date: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  route: { color: colors.text, fontSize: 14, fontWeight: '700' },
  meta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaItem: { color: colors.textMuted, fontSize: 12 },
  tags: { flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  arrow: { color: colors.textDisabled, fontSize: 22 },
});
