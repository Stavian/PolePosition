import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createGroup } from '../../services/pocketbase/groups';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const createGroup = httpsCallable(functions, 'createGroup');
      await createGroup({ name: name.trim() });
      router.back();
    } catch {
      setError(de.group.createGroupError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>✕</Text>
          </Pressable>
          <Text style={styles.title}>{de.group.createGroup}</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.label}>{de.group.groupName}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="z.B. Freunde 2026"
          placeholderTextColor={colors.textDisabled}
          autoFocus
          maxLength={40}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{de.group.createGroup}</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  back: { color: colors.textMuted, fontSize: 20 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  error: { color: colors.danger, fontSize: 13 },
  btn: {
    backgroundColor: colors.accent,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
