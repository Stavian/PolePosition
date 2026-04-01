import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { groupTripDoc, groupTripsCol } from '../../../services/firebase/firestore';
import { useAuth, useUserDoc } from '../../../hooks/useAuth';
import { useGroupStore } from '../../../store/groupStore';
import { useLocationStore } from '../../../store/locationStore';
import { ScoreRing } from '../../../components/ui/ScoreRing';
import { de } from '../../../i18n/de';
import { colors } from '../../../utils/colors';
import type { GroupTripDocument, GroupTripParticipant } from '../../../types/firestore';
import { isWithinRadius } from '../../../utils/geoUtils';
import { addDoc } from 'firebase/firestore';

const ARRIVAL_RADIUS_KM = 0.2;

export default function GroupTripScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const user = useAuth();
  const userDoc = useUserDoc();
  const members = useGroupStore((s) => s.members);
  const myLocation = useLocationStore((s) => s.myLocation);
  const activeGroupTrip = useGroupStore((s) => s.activeGroupTrip);
  const setActiveGroupTrip = useGroupStore((s) => s.setActiveGroupTrip);

  const [destination, setDestination] = useState('');
  const [creating, setCreating] = useState(false);
  const [etaUpdateTimer, setEtaUpdateTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to active group trip
  useEffect(() => {
    if (!activeGroupTrip) return;
    const unsub = onSnapshot(groupTripDoc(activeGroupTrip.groupTripId), (snap) => {
      if (snap.exists()) setActiveGroupTrip(snap.data());
    });
    return () => unsub();
  }, [activeGroupTrip?.groupTripId]);

  // Auto-detect arrival
  useEffect(() => {
    if (!activeGroupTrip || !myLocation || !user) return;
    const me = activeGroupTrip.participants[user.uid];
    if (!me || me.status === 'arrived') return;

    const arrived = isWithinRadius(
      myLocation.lat, myLocation.lng,
      activeGroupTrip.destinationLat, activeGroupTrip.destinationLng,
      ARRIVAL_RADIUS_KM,
    );

    if (arrived) {
      updateDoc(groupTripDoc(activeGroupTrip.groupTripId), {
        [`participants.${user.uid}.status`]: 'arrived',
        [`participants.${user.uid}.arrivedAt`]: serverTimestamp(),
      } as any);
    }
  }, [myLocation?.lat, myLocation?.lng]);

  const handleCreateGroupTrip = async () => {
    if (!destination.trim() || !groupId || !user || !userDoc) return;
    setCreating(true);
    try {
      const ref = await addDoc(groupTripsCol(), {
        groupTripId: '',
        groupId,
        createdBy: user.uid,
        title: `Fahrt nach ${destination}`,
        destinationLat: 0,
        destinationLng: 0,
        destinationAddress: destination,
        startedAt: serverTimestamp(),
        status: 'waiting',
        participantUids: [user.uid],
        participants: {
          [user.uid]: {
            displayName: userDoc.displayName,
            avatarUrl: userDoc.avatarUrl,
            joinedAt: serverTimestamp(),
            status: 'waiting',
            arrivedAt: null,
            arrivalRank: null,
            currentEtaMinutes: null,
            tripId: null,
            driveScore: null,
            currentLat: null,
            currentLng: null,
          } as GroupTripParticipant,
        },
      } as any);
      await updateDoc(ref, { groupTripId: ref.id });
      setActiveGroupTrip({ ...({} as GroupTripDocument), groupTripId: ref.id, groupId, status: 'waiting' } as any);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!activeGroupTrip || !user || !userDoc) return;
    await updateDoc(groupTripDoc(activeGroupTrip.groupTripId), {
      participantUids: [...activeGroupTrip.participantUids, user.uid],
      [`participants.${user.uid}`]: {
        displayName: userDoc.displayName,
        avatarUrl: userDoc.avatarUrl,
        joinedAt: serverTimestamp(),
        status: 'driving',
        arrivedAt: null,
        arrivalRank: null,
        currentEtaMinutes: null,
        tripId: null,
        driveScore: null,
        currentLat: myLocation?.lat ?? null,
        currentLng: myLocation?.lng ?? null,
      } as GroupTripParticipant,
    } as any);
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

  const participants = Object.entries(activeGroupTrip.participants ?? {}).sort(
    ([, a], [, b]) => (a.arrivalRank ?? 99) - (b.arrivalRank ?? 99),
  );

  const arrivedCount = participants.filter(([, p]) => p.status === 'arrived').length;
  const allArrived = arrivedCount === participants.length && participants.length > 0;

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
          <Text style={styles.destText}>{activeGroupTrip.destinationAddress}</Text>
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
            isMe={uid === user?.uid}
          />
        ))}

        {user && !activeGroupTrip.participantUids.includes(user.uid) && (
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
  participant: GroupTripParticipant;
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
