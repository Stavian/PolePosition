import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDoc } from 'firebase/firestore';
import { Pressable } from 'react-native';
import { heatmapPointsDoc } from '../../../services/firebase/firestore';
import { colors } from '../../../utils/colors';
import { de } from '../../../i18n/de';

export default function HeatmapScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const [points, setPoints] = useState<Array<{ latitude: number; longitude: number; weight: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      try {
        const snap = await getDoc(heatmapPointsDoc(groupId));
        if (snap.exists()) {
          const data = snap.data();
          setPoints(
            (data.points ?? []).map((p: { lat: number; lng: number; weight: number }) => ({
              latitude: p.lat,
              longitude: p.lng,
              weight: p.weight,
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        initialRegion={{
          latitude: 51.1657,
          longitude: 10.4515,
          latitudeDelta: 4,
          longitudeDelta: 4,
        }}
        customMapStyle={darkMapStyle}
      >
        {points.length > 0 && (
          <Heatmap
            points={points}
            opacity={0.7}
            radius={30}
            gradient={{
              colors: ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
              startPoints: [0.01, 0.25, 0.5, 0.75, 1.0],
              colorMapSize: 256,
            }}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topContent}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.title}>{de.group.heatmap}</Text>
          <Text style={styles.pointCount}>{points.length} Punkte</Text>
        </View>
      </SafeAreaView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      {!loading && points.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Noch keine Fahrtdaten für die Heatmap.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  back: { color: colors.text, fontSize: 20, width: 28 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  pointCount: { color: colors.textMuted, fontSize: 12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,0.5)' },
  emptyOverlay: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  emptyText: { color: colors.textMuted, backgroundColor: 'rgba(10,10,10,0.8)', padding: 12, borderRadius: 10, fontSize: 13 },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
