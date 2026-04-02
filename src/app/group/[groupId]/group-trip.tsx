import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useGroupStore } from '../../../store/groupStore';
import { useLocationStore } from '../../../store/locationStore';
import { ScoreRing } from '../../../components/ui/ScoreRing';
import { subscribeToGroupTrip } from '../../../services/pocketbase/groups';
import { pb } from '../../../services/pocketbase/client';
import { Collections } from '../../../services/pocketbase/collections';
import type { GroupTripRecord } from '../../../services/pocketbase/collections';
import { de } from '../../../i18n/de';
import { colors } from '../../../utils/colors';
import { isWithinRadius } from '../../../utils/geoUtils';

const ARRIVAL_RADIUS_KM = 0.2;

interface Participant {
  displayName: string;
  avatarUrl: string | null;
  status: 'waiting' | 'driving' | 'arrived';
  arrivedAt: string | null;
  arrivalRank: number | null;
  currentEtaMinutes: number | null;
  tripId: string | null;
  driveScore: number | null;
  currentLat: number | null;
  currentLng: number | null;
}

function parseIds(s: string | undefined): string[] {
  try { return JSON.parse(s ?? '[]'); } catch { return []; }
}

function parseParticipants(s: string | undefined): Record<string, Participant> {
  try { return JSON.parse(s ?? '{}'); } catch { return {}; }
}

export default function GroupTripScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const user = useAuth();
  const activeGroupTrip = useGroupStore((s) => s.activeGroupTrip);
  const setActiveGroupTrip = useGroupStore((s) => s.setActiveGroupTrip);
  const myLocation = useLocationStore((s) => s.myLocation);

  const [destination, setDestination] = useState('');
  const [creating, setCreating] = useState(false);

  // Subscribe to active group trip
  useEffect(() => {
    if (!activeGroupTrip) return;
    const unsub = subscribeToGroupTrip(activeGroupTrip.id, (trip) => {
      setActiveGroupTrip(trip);
    });
    return unsub;
  }, [activeGroupTrip?.id]);

  // Auto-detect arrival
  useEffect(() => {
    if (!activeGroupTrip || !myLocation || !user) return;
    const participants = parseParticipants(activeGroupTrip.participants_data);
    const me = participants[user.id];
    if (!me || me.status === 'arrived') return;

    const arrived = isWithinRadius(
      myLocation.lat, myLocation.lng,
      activeGroupTrip.destination_lat, activeGroupTrip.destination_lng,
      ARRIVAL_RADIUS_KM,
    );

    if (arrived) {
      const updated = { ...participants };
      updated[user.id] = { ...updated[user.id], status: 'arrived', arrivedAt: new Date().toISOString() };
      pb.collection(Collections.GroupTrips).update(activeGroupTrip.id, {
        participants_data: JSON.stringify(updated),
      });
    }
  }, [myLocation?.lat, myLocation?.lng]);

  const handleCreateGroupTrip = async () => {
    if (!destination.trim() || !groupId || !user) return;
    setCreating(true);
    try {
      const participantsData: Record<string, Participant> = {
        [user.id]: {
          displayName: user.name,
          avatarUrl: null,
          status: 'waiting',
          arrivedAt: null,
          arrivalRank: null,
          currentEtaMinutes: null,
          tripId: null,
          driveScore: null,
          currentLat: null,
          currentLng: null,
        },
      };
      const record = await pb.collection(Collections.GroupTrips).create<GroupTripRecord>({
        group_id: groupId,
        created_by: user.id,
        title: `Fahrt nach ${destination}`,
        destination_lat: 0,
        destination_lng: 0,
        destination_address: destination,
        status: 'waiting',
        participant_ids: JSON.stringify([user.id]),
        participants_data: JSON.stringify(participantsData),
      });
      setActiveGroupTrip(record);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!activeGroupTrip || !user) return;
    const ids = parseIds(activeGroupTrip.participant_ids);
    const participants = parseParticipants(activeGroupTrip.participants_data);
    participants[user.id] = {
      displayName: user.name,
      avatarUrl: null,
      status: 'driving',
      arrivedAt: null,
      arrivalRank: null,
      currentEtaMinutes: null,
      tripId: null,
      driveScore: null,
      currentLat: myLocation?.lat ?? null,
      currentLng: myLocation?.lng ?? null,
    };
    await pb.collection(Collections.GroupTrips).update(activeGroupTrip.id, {
      participant_ids: JSON.stringify([...ids, user.id]),
      participants_data: JSON.stringify(participants),
    });
  };

  if (!activeGroupTrip) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>← {de.back}</Text>
            </Pressable>
            <Text style={styles.title}>{de.groupTrip.startGroupTrip}</Text>
          </View>
          <Text style={styles.label}>{de.groupTrip.destination}</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="z.B. München Hauptbahnhof"
            placeholderTextColor={colors.textDisabled}
            autoFocus
          />
          <Pressable
            style={[styles.btn, (!destination.trim() || creating) && styles.btnDisabled]}
            onPress={handleCreateGroupTrip}
            disabled={!destination.trim() || creating}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{de.groupTrip.startRace} 🏁</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const participants = Object.entries(parseParticipants(activeGroupTrip.participants_data)).sort(
    ([, a], [, b]) => (a.arrivalRank ?? 99) - (b.arrivalRank ?? 99),
  );

  const arrivedCount = participants.filter(([, p]) => p.status === 'arrived').length;
  const allArrived = arrivedCount === participants.length && participants.length > 0;
  const participantIds = parseIds(activeGroupTrip.participant_ids);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.raceContainer}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← {de.back}</Text>
          </Pressable>
          <Text style={styles.title}>{de.groupTrip.title}</Text>
        </View>

        <View style={styles.destCard}>
          <Text style={styles.destIcon}>🏁</Text>
          <Text style={styles.destText}>{activeGroupTrip.destination_address}</Text>
        </View>

        {allArrived && (
          <View style={styles.allArrivedBanner}>
            <Text style={styles.allArrivedText}>🎉 {de.groupTrip.allArrived}</Text>
          </View>
        )}

        <Text style={styles.raceTitle}>{de.groupTrip.results}</Text>

        {participants.map(([uid, participant], index) => (
          <RaceParticipantRow
            key={uid}
            participant={participant}
            rank={index + 1}
            isMe={uid === user?.id}
          />
        ))}

        {user && !participantIds.includes(user.id) && (
          <Pressable style={styles.joinBtn} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>{de.groupTrip.joinGroupTrip}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RaceParticipantRow({
  participant,
  rank,
  isMe,
}: {
  participant: Participant;
  rank: number;
  isMe: boolean;
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
  const statusColor =
    participant.status === 'arrived'
      ? colors.success
      : participant.status === 'driving'
        ? colors.accent
        : colors.textMuted;

  return (
    <View style={[raceStyles.row, isMe && raceStyles.rowMe]}>
      <Text style={raceStyles.rank}>{medal}</Text>
      <View style={raceStyles.info}>
        <Text style={raceStyles.name}>
          {participant.displayName}{isMe ? ' (Du)' : ''}
        </Text>
        <Text style={[raceStyles.status, { color: statusColor }]}>
          {participant.status === 'arrived'
            ? `✓ ${de.groupTrip.arrived}`
            : participant.status === 'driving'
              ? `${de.groupTrip.driving}${participant.currentEtaMinutes != null ? ` · ETA ${participant.currentEtaMinutes} min` : ''}`
              : de.groupTrip.waiting}
        </Text>
      </View>
      {participant.driveScore != null && (
        <ScoreRing score={participant.driveScore} size={40} />
      )}
    </View>
  );
}

const raceStyles = StyleSheet.create({
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
  rowMe: { borderColor: colors.accent },
  rank: { fontSize: 20, width: 30, textAlign: 'center' },
  info: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, gap: 16 },
  raceContainer: { padding: 20, gap: 12, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { color: colors.textMuted, fontSize: 15 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  btn: {
    backgroundColor: colors.accent,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  destCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destIcon: { fontSize: 24 },
  destText: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  allArrivedBanner: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  allArrivedText: { color: colors.success, fontSize: 16, fontWeight: '800' },
  raceTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  joinBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
