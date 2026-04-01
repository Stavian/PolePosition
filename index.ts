import 'react-native-get-random-values'; // Must be first — polyfills crypto.getRandomValues for Firebase
import { registerRootComponent } from 'expo';
import { registerBackgroundLocationTask } from './src/services/location/BackgroundTask';
import App from './App';

// Register background GPS task at module level (required by expo-task-manager)
registerBackgroundLocationTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
