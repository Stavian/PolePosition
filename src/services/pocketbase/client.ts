import PocketBase from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── PocketBase Client ────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_PB_URL to your Cloudflare Tunnel URL, e.g.:
//   https://api.deine-domain.de
const PB_URL = process.env.EXPO_PUBLIC_PB_URL ?? 'http://127.0.0.1:8090';

class PocketBaseClient extends PocketBase {
  constructor() {
    super(PB_URL);
    // Persist auth token in AsyncStorage across app restarts
    this.authStore.onChange((token, model) => {
      if (token) {
        AsyncStorage.setItem('@pb_auth', JSON.stringify({ token, model }));
      } else {
        AsyncStorage.removeItem('@pb_auth');
      }
    });
  }

  /** Call once at app startup to restore saved auth */
  async restoreAuth() {
    try {
      const raw = await AsyncStorage.getItem('@pb_auth');
      if (raw) {
        const { token, model } = JSON.parse(raw);
        this.authStore.save(token, model);
      }
    } catch {
      // Ignore — user will need to sign in again
    }
  }
}

// Singleton instance
export const pb = new PocketBaseClient();
