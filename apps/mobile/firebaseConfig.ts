import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getAuth, Auth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics only works in some environments, handle gracefully
let analytics;
isSupported().then(yes => yes && (analytics = getAnalytics(app)));

// Initialize Auth with React Native persistence
let auth: Auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log("Firebase Auth initialized with persistence");
} catch (e: any) {
    console.log("Firebase Auth initialization error:", e.message);
    // Fallback if already initialized or other error
    if (e.code === 'auth/already-initialized') {
        auth = getAuth(app);
        console.log("Firebase Auth retrieved from existing instance");
    } else {
        throw e;
    }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
