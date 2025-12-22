import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required configuration
if (!firebaseConfig.apiKey) {
    console.error("Firebase Config Error: Missing API Key. Check your .env file.");
    throw new Error("Firebase Configuration Missing: VITE_FIREBASE_API_KEY is undefined. See .env.example");
}

if (!firebaseConfig.projectId) {
    console.error("Firebase Config Error: Missing Project ID. Check your .env file.");
    throw new Error("Firebase Configuration Missing: VITE_FIREBASE_PROJECT_ID is undefined. See .env.example");
}

console.log("Firebase Config Loaded:", {
    apiKey: "***" + firebaseConfig.apiKey?.slice(-4),
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
});

import { getMessaging } from "firebase/messaging";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

// Analytics might fail in some environments (e.g. ad blockers)
let analytics = null;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Firebase Analytics failed to initialize", e);
}

export { app, analytics, auth, db, storage, messaging };
