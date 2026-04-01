import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmail } from '../../services/pocketbase/auth';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = de.auth.errors.emailRequired;
    if (!password) e.password = de.auth.errors.passwordRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Navigation handled by AuthGuard in _layout
    } catch (err: any) {
      const status = (err as any)?.status ?? 0;
      if (status === 400) {
        setErrors({ password: de.auth.errors.wrongPassword });
      } else if (status === 404) {
        setErrors({ email: de.auth.errors.userNotFound });
      } else {
        setErrors({ general: de.auth.errors.generic });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← {de.back}</Text>
        </Pressable>

        <Text style={styles.title}>{de.auth.signIn}</Text>

        {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{de.auth.email}</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholderTextColor={colors.textDisabled}
            placeholder="name@beispiel.de"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{de.auth.password}</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholderTextColor={colors.textDisabled}
            placeholder="••••••••"
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <Pressable style={styles.forgotBtn} onPress={() => {}}>
          <Text style={styles.forgotText}>{de.auth.forgotPassword}</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{de.auth.signIn}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
          <Text style={styles.switchText}>
            {de.auth.noAccountYet}{' '}
            <Text style={styles.switchLink}>{de.auth.signUp}</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 16 },
  backBtn: { marginBottom: 8 },
  backText: { color: colors.textMuted, fontSize: 15 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 8 },
  fieldGroup: { gap: 6 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { color: colors.accent, fontSize: 13 },
  btn: {
    backgroundColor: colors.accent,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchText: { textAlign: 'center', color: colors.textMuted, fontSize: 14, marginTop: 8 },
  switchLink: { color: colors.accent, fontWeight: '700' },
});
