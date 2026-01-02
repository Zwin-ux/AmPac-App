// Notifications Service - Brain API removed for v1 launch
import { Linking } from 'react-native';

// Power Automate webhook for support notifications
const POWER_AUTOMATE_SUPPORT_URL = 'https://defaultcf0a93381f994a5ab494afb40f401d.da.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/43ebe11381564f5aa6853a90b58983bc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=IN0UKkSmyAsP8Dw5gbG4jQxiTe3ItIO106sk5Vvvudk';

// Support email address
const SUPPORT_EMAIL = 'help_support@ampac.com';

type SupportPayload = {
    title: string;
    body: string;
    userEmail?: string;
};

/**
 * Send support email via mailto link
 * This opens the user's email client with pre-filled content
 */
export const sendSupportEmail = async (payload: SupportPayload): Promise<boolean> => {
    try {
        const subject = encodeURIComponent(payload.title);
        const body = encodeURIComponent(
            `${payload.body}\n\n---\nSent from AmPac Mobile App\nTimestamp: ${new Date().toISOString()}`
        );
        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
        
        const canOpen = await Linking.canOpenURL(mailtoUrl);
        if (canOpen) {
            await Linking.openURL(mailtoUrl);
            console.log('Support email opened in mail client');
            return true;
        }
        console.warn('Cannot open mailto link');
        return false;
    } catch (error) {
        console.warn('Failed to open support email:', error);
        return false;
    }
};

/**
 * Get the support email address for display
 */
export const getSupportEmail = (): string => SUPPORT_EMAIL;

export const notifySupportChannel = async (payload: SupportPayload): Promise<boolean> => {
    // Send via Power Automate webhook (direct to Teams/support channel)
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
                supportEmail: SUPPORT_EMAIL,
            }),
        });
        if (paRes.ok) {
            console.log('Support notification sent via Power Automate');
            return true;
        }
        console.warn('Power Automate notify failed', paRes.status);
        return false;
    } catch (paErr) {
        console.warn('Power Automate notify failed', paErr);
        return false;
    }
};
