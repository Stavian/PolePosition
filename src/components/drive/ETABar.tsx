import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { colors } from '../../utils/colors';
import { de } from '../../i18n/de';
import { formatDuration } from '../../utils/geoUtils';

interface ETABarProps {
  elapsedSeconds: number;
  estimatedMinutes: number | null;
  destinationAddress: string | null;
  onSetDestination?: () => void;
}

export function ETABar({
  elapsedSeconds,
  estimatedMinutes,
  destinationAddress,
  onSetDestination,
}: ETABarProps) {
  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const etaDelta = estimatedMinutes !== null ? elapsedMin - estimatedMinutes : null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.destRow} onPress={onSetDestination}>
        <Text style={styles.destIcon}>📍</Text>
        <Text style={styles.destText} numberOfLines={1}>
          {destinationAddress ?? de.drive.destination}
        </Text>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{de.drive.elapsed}</Text>
          <Text style={styles.statValue}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {estimatedMinutes !== null && (
          <>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{de.drive.eta}</Text>
              <Text style={styles.statValue}>{estimatedMinutes} min</Text>
            </View>
            {etaDelta !== null && (
              <>
                <View style={styles.divider} />
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Δ</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: etaDelta <= 0 ? colors.success : colors.warning },
                    ]}
                  >
                    {etaDelta <= 0
                      ? `−${Math.abs(etaDelta)} min`
                      : `+${etaDelta} min`}
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destIcon: { fontSize: 16 },
  destText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
});
