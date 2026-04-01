import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { de } from '../../i18n/de';
import { colors } from '../../utils/colors';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🏎</Text>
          <Text style={styles.logoText}>{de.appName}</Text>
        </View>
        <Text style={styles.subtitle}>{de.auth.welcomeSubtitle}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => router.push('/(auth)/sign-up')}
        >
          <Text style={styles.btnTextPrimary}>{de.auth.signUp}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text style={styles.btnTextSecondary}>{de.auth.signIn}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 80,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  actions: {
    gap: 12,
  },
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
