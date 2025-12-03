import { Platform } from 'react-native';

const getBaseUrl = () => {
    // if (process.env.EXPO_PUBLIC_API_URL) {
    //     return process.env.EXPO_PUBLIC_API_URL;
    // }
    // Cloud Run Production URL
    return 'https://brain-service-952649324958.us-central1.run.app/api/v1';

    // Fallback for emulator if needed (comment out above line)
    // if (Platform.OS === 'android') {
    //     return 'http://10.0.2.2:8001/api/v1';
    // }
    // return 'http://localhost:8001/api/v1';
};

export const API_URL = getBaseUrl();
