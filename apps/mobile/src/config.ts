import { Platform } from 'react-native';

const getBaseUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
        return envUrl.replace(/\/$/, '');
    }

    // Local Development Fallbacks
    if (__DEV__) {
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8001/api/v1';
        }
        return 'http://localhost:8001/api/v1';
    }

    throw new Error('Missing EXPO_PUBLIC_API_URL for this build');
};

export const API_URL = getBaseUrl();
