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

// In-memory mock so unauthenticated/dev users can still see and post feed content
let mockFeed: FeedItem[] = [
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

export const feedService = {
    getFeed: async (): Promise<FeedItem[]> => {
        try {
            // If we have a logged-in user, we'd call the backend; for now mock data works for both
            return mockFeed;
        } catch (error) {
            console.error('Feed service error:', error);
            throw error;
        }
    },

    createPost: async (content: string, type: FeedItem['type'] = 'post', metadata?: any): Promise<FeedItem> => {
        try {
            const user = auth.currentUser || { uid: 'dev-user', displayName: 'Demo User', photoURL: undefined };

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

            // Persist to in-memory mock so the UI immediately reflects the post
            mockFeed = [newPost, ...mockFeed];
            return newPost;
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    },

    likePost: async (postId: string): Promise<void> => {
        mockFeed = mockFeed.map(item =>
            item.id === postId ? { ...item, likes: item.likes + 1 } : item
        );
        console.log('Liked post:', postId);
    },

    addComment: async (postId: string, comment: string): Promise<void> => {
        mockFeed = mockFeed.map(item =>
            item.id === postId ? { ...item, comments: item.comments + 1 } : item
        );
        console.log('Added comment to post:', postId, comment);
    }
};
