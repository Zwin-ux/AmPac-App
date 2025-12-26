import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    deleteField,
    Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { getCurrentUserId, getCurrentDisplayName } from './authUtils';
import { Business, BusinessRole } from '../types';
import { chatService } from './chatService';
import { notificationService } from './notificationService';

export const businessService = {
    /**
     * Create a new business and its associated private internal channel.
     */
    createBusiness: async (name: string, industry: string, bio: string): Promise<string> => {
        const uid = getCurrentUserId();
        if (!uid) throw new Error("User not authenticated");
        const displayName = getCurrentDisplayName();

        const businessId = uid; // One business per user for now
        const businessRef = doc(db, 'businesses', businessId);

        // 1. Create the private channel for the business members
        const channelId = await chatService.createChannel(
            'ampac-community',
            `${name} (Internal)`,
            'private',
            `Private group for members of ${name}`
        );

        const newBusiness: Business = {
            id: businessId,
            ownerId: uid,
            ownerName: displayName,
            name,
            industry,
            city: 'Inland Empire', // Default
            bio,
            members: {
                [uid]: 'owner'
            },
            chatChannelId: channelId,
            inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            createdAt: serverTimestamp() as Timestamp
        };

        await setDoc(businessRef, newBusiness);
        return businessId;
    },

    /**
     * Get a business by ID.
     */
    getBusiness: async (id: string): Promise<Business | null> => {
        const snap = await getDoc(doc(db, 'businesses', id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Business;
    },

    /**
     * Join a business using an invite code.
     */
    joinBusiness: async (inviteCode: string): Promise<string> => {
        const user = auth.currentUser;
        if (!user) throw new Error("Authentication required");

        const q = query(collection(db, 'businesses'), where('inviteCode', '==', inviteCode.toUpperCase()));
        const snap = await getDocs(q);

        if (snap.empty) throw new Error("Invalid invite code");

        const bizDoc = snap.docs[0];
        const bizData = bizDoc.data() as Business;

        // Update members record
        await updateDoc(bizDoc.ref, {
            [`members.${user.uid}`]: 'member'
        });

        // Add user to the private channel
        if (bizData.chatChannelId) {
            await updateDoc(doc(db, 'channels', bizData.chatChannelId), {
                members: arrayUnion(user.uid)
            });
        }

        // Notify Business Owner
        if (bizData.ownerId && bizData.ownerId !== user.uid) {
            await notificationService.sendTeamJoinNotification(
                bizData.ownerId,
                user.displayName || 'A user',
                bizData.name
            );
        }

        return bizDoc.id;
    },

    /**
     * Manage member roles (Requires admin/owner).
     */
    updateMemberRole: async (businessId: string, memberUid: string, role: BusinessRole) => {
        const bizRef = doc(db, 'businesses', businessId);
        await updateDoc(bizRef, {
            [`members.${memberUid}`]: role
        });
    },

    /**
     * Remove a member from the business and its channel.
     */
    removeMember: async (businessId: string, memberUid: string) => {
        const bizRef = doc(db, 'businesses', businessId);
        const bizSnap = await getDoc(bizRef);
        if (!bizSnap.exists()) return;
        const bizData = bizSnap.data() as Business;

        // 1. Remove from business members mapping
        const { deleteField } = await import('firebase/firestore');
        await updateDoc(bizRef, {
            [`members.${memberUid}`]: deleteField()
        });

        // 2. Remove from channel
        if (bizData.chatChannelId) {
            await updateDoc(doc(db, 'channels', bizData.chatChannelId), {
                members: arrayRemove(memberUid)
            });
        }
    },

    /**
     * Refresh the invite code.
     */
    refreshInviteCode: async (businessId: string): Promise<string> => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await updateDoc(doc(db, 'businesses', businessId), {
            inviteCode: newCode
        });
        return newCode;
    },

    /**
     * Update business profile.
     */
    updateBusiness: async (businessId: string, updates: Partial<Business>): Promise<void> => {
        const bizRef = doc(db, 'businesses', businessId);
        await updateDoc(bizRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Get all businesses (for network view).
     */
    getAllBusinesses: async (): Promise<Business[]> => {
        const snapshot = await getDocs(collection(db, 'businesses'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
    },

    /**
     * Get businesses by industry.
     */
    getBusinessesByIndustry: async (industry: string): Promise<Business[]> => {
        const q = query(collection(db, 'businesses'), where('industry', '==', industry));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
    },

    /**
     * Check if current user owns or is member of a business.
     */
    getUserBusiness: async (): Promise<Business | null> => {
        const user = auth.currentUser;
        if (!user) return null;

        // First check if they own a business
        const ownedBiz = await businessService.getBusiness(user.uid);
        if (ownedBiz) return ownedBiz;

        // Check if member of any business
        const allBiz = await businessService.getAllBusinesses();
        return allBiz.find(b => b.members && b.members[user.uid]) || null;
    },

    /**
     * Add badge to business (admin only).
     */
    addBadge: async (businessId: string, badge: string): Promise<void> => {
        const bizRef = doc(db, 'businesses', businessId);
        await updateDoc(bizRef, {
            badges: arrayUnion(badge)
        });
    },

    /**
     * Verify a business (admin only).
     */
    verifyBusiness: async (businessId: string): Promise<void> => {
        const bizRef = doc(db, 'businesses', businessId);
        await updateDoc(bizRef, {
            isVerified: true,
            verifiedAt: serverTimestamp(),
            badges: arrayUnion('verified')
        });
    },

    /**
     * Search businesses by name.
     */
    searchBusinesses: async (searchTerm: string): Promise<Business[]> => {
        const allBiz = await businessService.getAllBusinesses();
        const term = searchTerm.toLowerCase();
        return allBiz.filter(b => 
            b.name.toLowerCase().includes(term) || 
            b.industry?.toLowerCase().includes(term)
        );
    }
};
