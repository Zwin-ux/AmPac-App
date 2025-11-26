import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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
const analytics = getAnalytics(app);

export { app, analytics };
