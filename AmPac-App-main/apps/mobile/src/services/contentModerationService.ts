import { doc, updateDoc, addDoc, collection, query, where, getDocs, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReportData {
  reportedContentId: string;
  reportedContentType: 'message' | 'post' | 'comment' | 'user';
  reportedUserId: string;
  reporterUserId: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'violence' | 'hate_speech' | 'other';
  description?: string;
  createdAt: Timestamp;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

export interface BlockedUser {
  blockedUserId: string;
  blockedUserName: string;
  blockerUserId: string;
  createdAt: Timestamp;
  reason?: string;
}

class ContentModerationService {
  private readonly PROFANITY_WORDS = [
    // Basic profanity filter - in production, use a more comprehensive list
    'spam', 'scam', 'fake', 'fraud', 'phishing'
  ];

  /**
   * Report inappropriate content
   */
  async reportContent(
    contentId: string,
    contentType: 'message' | 'post' | 'comment' | 'user',
    reportedUserId: string,
    reason: ReportData['reason'],
    description?: string
  ): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const reportData: Omit<ReportData, 'id'> = {
        reportedContentId: contentId,
        reportedContentType: contentType,
        reportedUserId,
        reporterUserId: currentUser.uid,
        reason,
        description,
        createdAt: Timestamp.now(),
        status: 'pending',
      };

      await addDoc(collection(db, 'content_reports'), reportData);
      
      // Store locally to prevent duplicate reports
      const reportKey = `reported_${contentType}_${contentId}`;
      await AsyncStorage.setItem(reportKey, 'true');
      
      console.log('Content reported successfully');
    } catch (error) {
      console.error('Error reporting content:', error);
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, userName: string, reason?: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      // Check if user is already blocked
      const isBlocked = await this.isUserBlocked(userId);
      if (isBlocked) {
        throw new Error('User is already blocked');
      }

      const blockData: Omit<BlockedUser, 'id'> = {
        blockedUserId: userId,
        blockedUserName: userName,
        blockerUserId: currentUser.uid,
        createdAt: Timestamp.now(),
        reason,
      };

      await addDoc(collection(db, 'blocked_users'), blockData);
      
      // Store locally for quick access
      const blockedUsers = await this.getLocalBlockedUsers();
      blockedUsers.push(userId);
      await AsyncStorage.setItem('blocked_users', JSON.stringify(blockedUsers));
      
      console.log('User blocked successfully');
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      // Find and delete the block record
      const q = query(
        collection(db, 'blocked_users'),
        where('blockerUserId', '==', currentUser.uid),
        where('blockedUserId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Remove from local storage
      const blockedUsers = await this.getLocalBlockedUsers();
      const updatedBlockedUsers = blockedUsers.filter(id => id !== userId);
      await AsyncStorage.setItem('blocked_users', JSON.stringify(updatedBlockedUsers));
      
      console.log('User unblocked successfully');
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const blockedUsers = await this.getLocalBlockedUsers();
      return blockedUsers.includes(userId);
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  /**
   * Get locally stored blocked users
   */
  private async getLocalBlockedUsers(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem('blocked_users');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local blocked users:', error);
      return [];
    }
  }

  /**
   * Get all blocked users for current user
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return [];

      const q = query(
        collection(db, 'blocked_users'),
        where('blockerUserId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)) as BlockedUser[];
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Check if content has been reported by current user
   */
  async hasReportedContent(contentId: string, contentType: string): Promise<boolean> {
    try {
      const reportKey = `reported_${contentType}_${contentId}`;
      const reported = await AsyncStorage.getItem(reportKey);
      return reported === 'true';
    } catch (error) {
      console.error('Error checking if content is reported:', error);
      return false;
    }
  }

  /**
   * Basic profanity filter
   */
  containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.PROFANITY_WORDS.some(word => lowerText.includes(word));
  }

  /**
   * Filter content for profanity
   */
  filterProfanity(text: string): string {
    let filteredText = text;
    
    this.PROFANITY_WORDS.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    return filteredText;
  }

  /**
   * Validate content before posting
   */
  validateContent(content: string): {
    isValid: boolean;
    reason?: string;
    filteredContent?: string;
  } {
    // Check for empty content
    if (!content.trim()) {
      return {
        isValid: false,
        reason: 'Content cannot be empty',
      };
    }

    // Check for excessive length
    if (content.length > 2000) {
      return {
        isValid: false,
        reason: 'Content is too long (max 2000 characters)',
      };
    }

    // Check for profanity
    if (this.containsProfanity(content)) {
      return {
        isValid: true,
        filteredContent: this.filterProfanity(content),
      };
    }

    // Check for spam patterns
    if (this.isSpamContent(content)) {
      return {
        isValid: false,
        reason: 'Content appears to be spam',
      };
    }

    return {
      isValid: true,
      filteredContent: content,
    };
  }

  /**
   * Basic spam detection
   */
  private isSpamContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    
    // Check for excessive repetition
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      return true;
    }

    // Check for suspicious patterns
    const spamPatterns = [
      /click here/gi,
      /free money/gi,
      /guaranteed/gi,
      /act now/gi,
      /limited time/gi,
    ];

    return spamPatterns.some(pattern => pattern.test(lowerContent));
  }

  /**
   * Get community guidelines
   */
  getCommunityGuidelines(): string[] {
    return [
      'Be respectful and professional in all interactions',
      'No spam, promotional content, or excessive self-promotion',
      'No harassment, bullying, or discriminatory language',
      'Keep discussions relevant to business and entrepreneurship',
      'Protect privacy - do not share personal information',
      'Report inappropriate content using the report feature',
      'No illegal activities or fraudulent schemes',
      'Respect intellectual property and copyrights',
      'Use appropriate language suitable for a professional environment',
      'Help create a supportive community for all entrepreneurs',
    ];
  }

  /**
   * Clear all moderation data (for account deletion)
   */
  async clearModerationData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'blocked_users',
        // Add other moderation-related keys as needed
      ]);
      
      // Note: Server-side cleanup should be handled by cloud functions
      console.log('Local moderation data cleared');
    } catch (error) {
      console.error('Error clearing moderation data:', error);
    }
  }
}

export const contentModerationService = new ContentModerationService();