import AsyncStorage from '../utils/asyncStorageOptimization';
import { DirectMessage, DirectConversation, User } from '../types';

export interface CachedData {
  timestamp: number;
  data: any;
  expiresAt?: number;
}

export interface OfflineCache {
  conversations: DirectConversation[];
  messages: { [conversationId: string]: DirectMessage[] };
  users: { [userId: string]: User };
  lastSync: number;
}

class OfflineStorageService {
  private readonly CACHE_PREFIX = 'ampac_cache_';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_MESSAGES_PER_CONVERSATION = 100;

  /**
   * Store data with expiration
   */
  async setItem<T>(key: string, data: T, expiresInMs?: number): Promise<void> {
    try {
      const cachedData: CachedData = {
        timestamp: Date.now(),
        data,
        expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined,
      };

      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cachedData)
      );
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  }

  /**
   * Get data with expiration check
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!stored) return null;

      const cachedData: CachedData = JSON.parse(stored);

      // Check if data has expired
      if (cachedData.expiresAt && Date.now() > cachedData.expiresAt) {
        await this.removeItem(key);
        return null;
      }

      return cachedData.data as T;
    } catch (error) {
      console.error('Error retrieving offline data:', error);
      return null;
    }
  }

  /**
   * Remove cached item
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Error removing offline data:', error);
    }
  }

  /**
   * Cache conversations for offline access
   */
  async cacheConversations(conversations: DirectConversation[]): Promise<void> {
    await this.setItem('conversations', conversations, this.CACHE_EXPIRY);
  }

  /**
   * Get cached conversations
   */
  async getCachedConversations(): Promise<DirectConversation[]> {
    const cached = await this.getItem<DirectConversation[]>('conversations');
    return cached || [];
  }

  /**
   * Cache messages for a conversation
   */
  async cacheMessages(conversationId: string, messages: DirectMessage[]): Promise<void> {
    // Limit the number of cached messages
    const limitedMessages = messages.slice(0, this.MAX_MESSAGES_PER_CONVERSATION);
    await this.setItem(`messages_${conversationId}`, limitedMessages, this.CACHE_EXPIRY);
  }

  /**
   * Get cached messages for a conversation
   */
  async getCachedMessages(conversationId: string): Promise<DirectMessage[]> {
    const cached = await this.getItem<DirectMessage[]>(`messages_${conversationId}`);
    return cached || [];
  }

  /**
   * Cache user profiles
   */
  async cacheUser(user: User): Promise<void> {
    await this.setItem(`user_${user.uid}`, user, this.CACHE_EXPIRY);
  }

  /**
   * Get cached user profile
   */
  async getCachedUser(userId: string): Promise<User | null> {
    return await this.getItem<User>(`user_${userId}`);
  }

  /**
   * Cache multiple users
   */
  async cacheUsers(users: User[]): Promise<void> {
    const promises = users.map(user => this.cacheUser(user));
    await Promise.all(promises);
  }

  /**
   * Get complete offline cache
   */
  async getOfflineCache(): Promise<OfflineCache> {
    const conversations = await this.getCachedConversations();

    // Get cached messages for all conversations
    const messagesPromises = conversations.map(async (conv) => {
      const messages = await this.getCachedMessages(conv.id);
      return { conversationId: conv.id, messages };
    });

    const messageResults = await Promise.all(messagesPromises);
    const messages: { [conversationId: string]: DirectMessage[] } = {};
    messageResults.forEach(result => {
      messages[result.conversationId] = result.messages;
    });

    // Get cached users
    const userIds = new Set<string>();
    conversations.forEach(conv => {
      conv.participants.forEach(id => userIds.add(id));
    });

    const usersPromises = Array.from(userIds).map(async (userId) => {
      const user = await this.getCachedUser(userId);
      return { userId, user };
    });

    const userResults = await Promise.all(usersPromises);
    const users: { [userId: string]: User } = {};
    userResults.forEach(result => {
      if (result.user) {
        users[result.userId] = result.user;
      }
    });

    const lastSync = await this.getItem<number>('last_sync') || 0;

    return {
      conversations,
      messages,
      users,
      lastSync,
    };
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(): Promise<void> {
    await this.setItem('last_sync', Date.now());
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache size information
   */
  async getCacheInfo(): Promise<{
    totalItems: number;
    estimatedSize: string;
    oldestItem: number;
    newestItem: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          
          try {
            const cachedData: CachedData = JSON.parse(value);
            if (cachedData.timestamp < oldestTimestamp) {
              oldestTimestamp = cachedData.timestamp;
            }
            if (cachedData.timestamp > newestTimestamp) {
              newestTimestamp = cachedData.timestamp;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }

      const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      return {
        totalItems: cacheKeys.length,
        estimatedSize: formatSize(totalSize),
        oldestItem: oldestTimestamp,
        newestItem: newestTimestamp,
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {
        totalItems: 0,
        estimatedSize: '0 B',
        oldestItem: 0,
        newestItem: 0,
      };
    }
  }

  /**
   * Clean expired cache items
   */
  async cleanExpiredCache(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let removedCount = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const cachedData: CachedData = JSON.parse(value);
            if (cachedData.expiresAt && Date.now() > cachedData.expiresAt) {
              await AsyncStorage.removeItem(key);
              removedCount++;
            }
          } catch (e) {
            // Remove corrupted cache items
            await AsyncStorage.removeItem(key);
            removedCount++;
          }
        }
      }

      return removedCount;
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
      return 0;
    }
  }
}

export const offlineStorage = new OfflineStorageService();