import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAmzVejSWRXX5SbxFvsncbIuPybv-nicNE",
    authDomain: "ampac-mobile.firebaseapp.com",
    projectId: "ampac-mobile",
    storageBucket: "ampac-mobile.firebasestorage.app",
    messagingSenderId: "194431812308",
    appId: "1:194431812308:web:d5c4d635aec2e999b9f141",
    measurementId: "G-KWGMY9QBD0"
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
