import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';

type SupportPayload = {
    title: string;
    body: string;
};

export const notifySupportChannel = async (payload: SupportPayload): Promise<boolean> => {
    try {
        const token = await getFirebaseIdToken();
        const res = await fetch(`${API_URL}/support/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            console.error('Support notify failed', res.status, text);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Support notify failed', err);
        return false;
    }
};
