import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { joinGroup } from '../../services/pocketbase/groups';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';

export default function JoinGroupScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await joinGroup(trimmed);
      router.back();
    } catch {
      setError(de.group.joinGroupError);
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
          <Text style={styles.title}>{de.group.joinGroup}</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.instructions}>
          Gib den 6-stelligen Einladungscode deiner Freundesgruppe ein.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder={de.group.inviteCodePlaceholder}
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          autoFocus
          keyboardType="default"
          textAlign="center"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, (code.trim().length !== 6 || loading) && styles.btnDisabled]}
          onPress={handleJoin}
          disabled={code.trim().length !== 6 || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{de.group.joinGroup}</Text>}
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
  instructions: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 10,
  },
  error: { color: colors.danger, fontSize: 13 },
  btn: {
    backgroundColor: colors.accent,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
