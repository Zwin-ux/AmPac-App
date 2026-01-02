import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import Constants from "expo-constants";

// Helper function to get config value with fallback to env var
const getConfigValue = (extraKey: string, envKey: string, fallback: string = ''): string => {
  const extraValue = Constants.expoConfig?.extra?.[extraKey];
  // Check if it's a valid value (not undefined, not a template string)
  if (extraValue && typeof extraValue === 'string' && !extraValue.startsWith('${')) {
    return extraValue;
  }
  // Fallback to environment variable
  const envValue = process.env[envKey];
  if (envValue && !envValue.startsWith('${')) {
    return envValue;
  }
  return fallback;
};

// Firebase configuration with defensive fallbacks
const firebaseConfig = {
  apiKey: getConfigValue('firebaseApiKey', 'EXPO_PUBLIC_FIREBASE_API_KEY', 'AIzaSyAGejlfxWLXlDlWOM3c0V1JzUJhsSpCtxY'),
  authDomain: getConfigValue('firebaseAuthDomain', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'ampac-database.firebaseapp.com'),
  projectId: getConfigValue('firebaseProjectId', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'ampac-database'),
  storageBucket: getConfigValue('firebaseStorageBucket', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'ampac-database.appspot.com'),
  messagingSenderId: getConfigValue('firebaseMessagingSenderId', 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '381306899120'),
  appId: getConfigValue('firebaseAppId', 'EXPO_PUBLIC_FIREBASE_APP_ID', '1:381306899120:web:37bafe7b048a4212bdc975'),
  measurementId: getConfigValue('firebaseMeasurementId', 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'G-HG722LLTKZ'),
};

// Validate config before initialization
const validateConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  for (const key of required) {
    const value = firebaseConfig[key as keyof typeof firebaseConfig];
    if (!value || value.startsWith('${')) {
      console.error(`Firebase config missing or invalid: ${key}`);
      return false;
    }
  }
  return true;
};

// Initialize Firebase with validation
let app: ReturnType<typeof initializeApp>;
let db: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;
let storage: ReturnType<typeof getStorage>;

try {
  if (!validateConfig()) {
    console.error('Firebase configuration is invalid, using hardcoded fallbacks');
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  console.log('[Firebase] Initialized successfully with project:', firebaseConfig.projectId);
} catch (error) {
  console.error('[Firebase] Initialization failed:', error);
  // Re-throw to make the error visible
  throw error;
}

export { app, db, auth, storage };
