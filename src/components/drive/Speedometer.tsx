import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

interface SpeedometerProps {
  speedKmh: number;
  limitKmh: number | null;
}

export function Speedometer({ speedKmh, limitKmh }: SpeedometerProps) {
  const isOverLimit = limitKmh !== null && speedKmh > limitKmh + 3;
  const isNearLimit = limitKmh !== null && speedKmh > limitKmh - 5 && !isOverLimit;

  const speedColor = isOverLimit
    ? colors.speedDanger
    : isNearLimit
      ? colors.speedWarn
      : colors.text;

  const overBy = limitKmh !== null ? Math.round(speedKmh - limitKmh) : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.speed, { color: speedColor }]}>
        {Math.round(speedKmh)}
      </Text>
      <Text style={styles.unit}>km/h</Text>

      {limitKmh !== null && (
        <View style={[styles.limitBadge, isOverLimit && styles.limitBadgeOver]}>
          <Text style={styles.limitLabel}>LIMIT</Text>
          <Text style={styles.limitValue}>{limitKmh}</Text>
        </View>
      )}

      {isOverLimit && overBy !== null && overBy > 0 && (
        <View style={styles.overBadge}>
          <Text style={styles.overText}>+{overBy} km/h über Limit</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  speed: {
    fontSize: 96,
    fontWeight: '800',
    letterSpacing: -4,
    lineHeight: 96,
  },
  unit: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: -4,
  },
  limitBadge: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.success,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  limitBadgeOver: {
    borderColor: colors.danger,
  },
  limitLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  limitValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 26,
  },
  overBadge: {
    marginTop: 8,
    backgroundColor: colors.accentDim,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  overText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
