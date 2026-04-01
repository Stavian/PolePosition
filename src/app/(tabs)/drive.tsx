import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import { useAccelerometer } from '../../hooks/useAccelerometer';
import { useTripStore } from '../../store/tripStore';
import { Speedometer } from '../../components/drive/Speedometer';
import { SpeedAlertBanner } from '../../components/drive/SpeedAlertBanner';
import { ETABar } from '../../components/drive/ETABar';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';
import { startBackgroundLocation } from '../../services/location/BackgroundTask';

export default function DriveScreen() {
  const [locationStarted, setLocationStarted] = useState(false);
  const activeTrip = useTripStore((s) => s.activeTrip);

  useKeepAwake();
  useLiveLocation();
  useAccelerometer();

  useEffect(() => {
    (async () => {
      try {
        await startBackgroundLocation();
        setLocationStarted(true);
      } catch {
        // Permission denied — foreground only
        setLocationStarted(true);
      }
    })();
  }, []);

  const speedKmh = activeTrip?.currentSpeedKmh ?? 0;
  const limitKmh = activeTrip?.currentSpeedLimitKmh ?? null;
  const overBy = limitKmh !== null ? speedKmh - limitKmh : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {activeTrip ? de.drive.title : de.drive.startRecording}
          </Text>
          {activeTrip && (
            <View style={styles.recordingDot} />
          )}
        </View>

        {/* Speed Alert */}
        <SpeedAlertBanner overByKmh={overBy} />

        {/* Speedometer */}
        <View style={styles.speedSection}>
          <Speedometer speedKmh={speedKmh} limitKmh={limitKmh} />
        </View>

        {/* Stats Row */}
        {activeTrip && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{de.trips.distance}</Text>
              <Text style={styles.statValue}>{activeTrip.distanceKm.toFixed(1)} km</Text>
            </View>
            <View style={styles.statCard}>
              <ScoreRing score={activeTrip.driveScore} size={72} label="Score" />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{de.trips.topSpeed}</Text>
              <Text style={styles.statValue}>{activeTrip.topSpeedKmh} km/h</Text>
            </View>
          </View>
        )}

        {/* Event Counters */}
        {activeTrip && (
          <View style={styles.eventRow}>
            <View style={styles.eventChip}>
              <Text style={styles.eventIcon}>📍</Text>
              <Text style={styles.eventLabel}>{de.trips.speedingEvents}</Text>
              <Text style={[styles.eventCount, activeTrip.speedingEventCount > 0 && styles.eventCountBad]}>
                {activeTrip.speedingEventCount}
              </Text>
            </View>
            <View style={styles.eventChip}>
              <Text style={styles.eventIcon}>🛑</Text>
              <Text style={styles.eventLabel}>{de.trips.hardBrakes}</Text>
              <Text style={[styles.eventCount, activeTrip.hardBrakeCount > 0 && styles.eventCountBad]}>
                {activeTrip.hardBrakeCount}
              </Text>
            </View>
            <View style={styles.eventChip}>
              <Text style={styles.eventIcon}>🚀</Text>
              <Text style={styles.eventLabel}>{de.trips.hardAccels}</Text>
              <Text style={[styles.eventCount, activeTrip.hardAccelCount > 0 && styles.eventCountBad]}>
                {activeTrip.hardAccelCount}
              </Text>
            </View>
          </View>
        )}

        {/* ETA Bar */}
        {activeTrip && (
          <ETABar
            elapsedSeconds={activeTrip.durationSeconds}
            estimatedMinutes={activeTrip.estimatedDurationMinutes}
            destinationAddress={activeTrip.destinationAddress}
            onSetDestination={() => {}}
          />
        )}

        {/* No active trip prompt */}
        {!activeTrip && locationStarted && (
          <View style={styles.idleCard}>
            <Text style={styles.idleIcon}>🚗</Text>
            <Text style={styles.idleText}>Fahrt starten und fahren — PolePosition erkennt die Fahrt automatisch.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  speedSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 18,
    fontWeight: '800',
  },
  eventRow: {
    flexDirection: 'row',
    gap: 8,
  },
  eventChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventIcon: { fontSize: 16 },
  eventLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  eventCount: { color: colors.text, fontSize: 18, fontWeight: '800' },
  eventCountBad: { color: colors.danger },
  idleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  idleIcon: { fontSize: 56 },
  idleText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
});
