import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, Auth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate Config
if (!firebaseConfig.apiKey) {
    console.error("Firebase Config Error: Missing API Key. Check your .env file.");
    throw new Error("Firebase Configuration Missing: API Key is undefined.");
}
if (!firebaseConfig.authDomain) {
    console.warn("Firebase Config Warning: Missing Auth Domain.");
}

console.log("Firebase Config Loaded:", {
    apiKey: firebaseConfig.apiKey ? "Present" : "MISSING",
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics only works in some environments, handle gracefully
let analytics;
isSupported().then(yes => yes && (analytics = getAnalytics(app)));

// Initialize Auth with appropriate persistence per platform.
// - Web: default web persistence (IndexedDB/localStorage)
// - Native: AsyncStorage via firebase/auth/react-native
let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    // firebase/auth's typings may omit this export, but it exists at runtime for React Native builds.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth') as any;

    try {
        if (typeof getReactNativePersistence !== 'function') {
            auth = getAuth(app);
        } else {
            auth = initializeAuth(app, {
                persistence: getReactNativePersistence(AsyncStorage),
            });
        }
    } catch (e: any) {
        if (e?.code === 'auth/already-initialized') {
            auth = getAuth(app);
        } else {
            throw e;
        }
    }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
