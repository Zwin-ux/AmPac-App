import { API_URL } from '../config';
import { auth } from '../../firebaseConfig';

export interface FeedItem {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    type: 'post' | 'payment' | 'application' | 'website';
    metadata?: any;
    createdAt: Date;
    likes: number;
    comments: number;
}

export const feedService = {
    getFeed: async (): Promise<FeedItem[]> => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // In a real implementation, this would call the Brain API
            // For now, we'll return mock data
            const mockFeed: FeedItem[] = [
                {
                    id: '1',
                    userId: 'user1',
                    userName: 'John Doe',
                    userAvatar: 'https://i.pravatar.cc/150?img=1',
                    content: 'Just created my business website using AmPac Web Builder! Check it out.',
                    type: 'website',
                    metadata: {
                        websiteUrl: 'https://sites.ampac.com/john-doe',
                        businessName: 'John\'s Coffee'
                    },
                    createdAt: new Date(Date.now() - 3600000),
                    likes: 12,
                    comments: 3
                },
                {
                    id: '2',
                    userId: 'user2',
                    userName: 'Jane Smith',
                    userAvatar: 'https://i.pravatar.cc/150?img=2',
                    content: 'My loan application has been approved! Thanks AmPac!',
                    type: 'application',
                    metadata: {
                        status: 'approved',
                        loanAmount: 50000
                    },
                    createdAt: new Date(Date.now() - 7200000),
                    likes: 25,
                    comments: 8
                },
                {
                    id: '3',
                    userId: 'user3',
                    userName: 'Mike Johnson',
                    userAvatar: 'https://i.pravatar.cc/150?img=3',
                    content: 'Just made a payment for my business services. Easy process!',
                    type: 'payment',
                    metadata: {
                        amount: 1000,
                        currency: 'USD'
                    },
                    createdAt: new Date(Date.now() - 10800000),
                    likes: 8,
                    comments: 2
                },
                {
                    id: '4',
                    userId: 'user4',
                    userName: 'Sarah Williams',
                    userAvatar: 'https://i.pravatar.cc/150?img=4',
                    content: 'Looking for advice on SBA loans. Any tips?',
                    type: 'post',
                    createdAt: new Date(Date.now() - 14400000),
                    likes: 5,
                    comments: 15
                }
            ];

            return mockFeed;
        } catch (error) {
            console.error('Feed service error:', error);
            throw error;
        }
    },

    createPost: async (content: string, type: FeedItem['type'] = 'post', metadata?: any): Promise<FeedItem> => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // In a real implementation, this would call the Brain API to create a post
            const newPost: FeedItem = {
                id: Math.random().toString(36).substring(2, 9),
                userId: user.uid,
                userName: user.displayName || 'AmPac User',
                userAvatar: user.photoURL || undefined,
                content,
                type,
                metadata,
                createdAt: new Date(),
                likes: 0,
                comments: 0
            };

            return newPost;
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    },

    likePost: async (postId: string): Promise<void> => {
        // In a real implementation, this would call the Brain API
        console.log('Liked post:', postId);
    },

    addComment: async (postId: string, comment: string): Promise<void> => {
        // In a real implementation, this would call the Brain API
        console.log('Added comment to post:', postId, comment);
    }
};