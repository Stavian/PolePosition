import 'react-native-get-random-values'; // Must be first — polyfills crypto.getRandomValues
import { registerBackgroundLocationTask } from './src/services/location/BackgroundTask';

// Register background GPS task at module level (required by expo-task-manager)
registerBackgroundLocationTask();

import 'expo-router/entry';
