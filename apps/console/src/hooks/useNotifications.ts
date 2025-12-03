import { useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '../services/messagingService';
// import { toast } from 'react-hot-toast'; // Assuming we have a toast library, or use alert for now

export const useNotifications = () => {
    useEffect(() => {
        const init = async () => {
            const token = await requestNotificationPermission();
            if (token) {
                // TODO: Send token to backend to associate with user
            }
        };

        init();

        onMessageListener().then((payload: any) => {
            console.log("Foreground Notification:", payload);
            // Show toast or alert
            const title = payload?.notification?.title || "New Notification";
            const body = payload?.notification?.body || "";
            // toast(title + ": " + body);
            alert(`${title}: ${body}`);
        });

        // onMessageListener returns a promise; proper unsubscribe would be added if the API exposes it
    }, []);
};
