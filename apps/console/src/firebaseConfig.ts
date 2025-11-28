import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAmzVejSWRXX5SbxFvsncbIuPybv-nicNE",
    authDomain: "ampac-mobile.firebaseapp.com",
    projectId: "ampac-mobile",
    storageBucket: "ampac-mobile.firebasestorage.app",
    messagingSenderId: "194431812308",
    appId: "1:194431812308:web:d5c4d635aec2e999b9f141",
    measurementId: "G-KWGMY9QBD0"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
