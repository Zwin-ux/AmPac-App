import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebaseConfig";

export const requestNotificationPermission = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });
            console.log("FCM Token:", token);
            return token;
        } else {
            console.warn("Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
