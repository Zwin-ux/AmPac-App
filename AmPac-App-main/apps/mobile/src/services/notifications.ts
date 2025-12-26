import { API_URL } from '../config';
import { getFirebaseIdToken } from './brainAuth';
import { getApiHeaders } from './assistantService';

// Power Automate webhook for support notifications
const POWER_AUTOMATE_SUPPORT_URL = 'https://defaultcf0a93381f994a5ab494afb40f401d.da.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/43ebe11381564f5aa6853a90b58983bc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=IN0UKkSmyAsP8Dw5gbG4jQxiTe3ItIO106sk5Vvvudk';

type SupportPayload = {
    title: string;
    body: string;
};

export const notifySupportChannel = async (payload: SupportPayload): Promise<boolean> => {
    // Try Power Automate webhook first (direct to Teams/support channel)
    try {
        const paRes = await fetch(POWER_AUTOMATE_SUPPORT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: payload.title,
                body: payload.body,
                timestamp: new Date().toISOString(),
                source: 'AmPac Mobile App',
            }),
        });
        if (paRes.ok) {
            console.log('Support notification sent via Power Automate');
            return true;
        }
        console.warn('Power Automate notify failed', paRes.status);
    } catch (paErr) {
        console.warn('Power Automate notify failed', paErr);
    }

    // Fallback to Brain API if Power Automate fails
    try {
        const headers = await getApiHeaders();
        const res = await fetch(`${API_URL}/support/notify`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            console.error('Support notify failed (Brain API)', res.status, text);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Support notify failed (Brain API)', err);
        return false;
    }
};
