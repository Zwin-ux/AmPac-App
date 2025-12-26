import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

export const cacheService = {
    set: async <T>(key: string, data: T): Promise<void> => {
        try {
            const item: CacheItem<T> = {
                data,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            console.error(`Error caching key ${key}:`, error);
        }
    },

    get: async <T>(key: string, ttl: number = DEFAULT_TTL): Promise<T | null> => {
        try {
            const value = await AsyncStorage.getItem(key);
            if (!value) return null;

            const item: CacheItem<T> = JSON.parse(value);
            const now = Date.now();

            if (now - item.timestamp > ttl) {
                // Cache expired
                // We could delete it here, or just return null and let the caller overwrite it
                return null;
            }

            return item.data;
        } catch (error) {
            console.error(`Error retrieving key ${key}:`, error);
            return null;
        }
    },

    remove: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing key ${key}:`, error);
        }
    },

    clear: async (): Promise<void> => {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error("Error clearing cache:", error);
        }
    }
};
