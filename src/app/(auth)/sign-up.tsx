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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUpWithEmail } from '../../services/pocketbase/auth';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = de.auth.errors.nameRequired;
    if (!email.trim()) e.email = de.auth.errors.emailRequired;
    if (!password) e.password = de.auth.errors.passwordRequired;
    if (password.length < 6) e.password = de.auth.errors.weakPassword;
    if (password !== passwordConfirm) e.passwordConfirm = de.auth.errors.passwordMismatch;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (err: any) {
      const status = (err as any)?.status ?? 0;
      if (status === 400) {
        setErrors({ email: de.auth.errors.emailInUse });
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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← {de.back}</Text>
          </Pressable>

          <Text style={styles.title}>{de.auth.signUp}</Text>
          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

          {[
            { label: de.auth.displayName, value: name, setter: setName, key: 'name', placeholder: 'Max Mustermann', secure: false, type: 'default' as const },
            { label: de.auth.email, value: email, setter: setEmail, key: 'email', placeholder: 'max@beispiel.de', secure: false, type: 'email-address' as const },
            { label: de.auth.password, value: password, setter: setPassword, key: 'password', placeholder: '••••••••', secure: true, type: 'default' as const },
            { label: de.auth.passwordConfirm, value: passwordConfirm, setter: setPasswordConfirm, key: 'passwordConfirm', placeholder: '••••••••', secure: true, type: 'default' as const },
          ].map(({ label, value, setter, key, placeholder, secure, type }) => (
            <View key={key} style={styles.fieldGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={[styles.input, errors[key] ? styles.inputError : null]}
                value={value}
                onChangeText={setter}
                secureTextEntry={secure}
                keyboardType={type}
                autoCapitalize={key === 'name' ? 'words' : 'none'}
                placeholder={placeholder}
                placeholderTextColor={colors.textDisabled}
              />
              {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
            </View>
          ))}

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{de.auth.signUp}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={styles.switchText}>
              {de.auth.alreadyHaveAccount}{' '}
              <Text style={styles.switchLink}>{de.auth.signIn}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 16 },
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
