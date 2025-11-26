import { Timestamp } from 'firebase/firestore';

export type UserRole = 'entrepreneur' | 'ampac_staff';

export interface User {
    uid: string;
    role: UserRole;
    fullName: string;
    businessName: string;
    phone: string;
    createdAt: Timestamp;
}

export type HotlineRequestStatus = 'pending' | 'in_progress' | 'resolved';

export interface HotlineRequest {
    id?: string;
    userId: string;
    subject: string;
    message: string;
    status: HotlineRequestStatus;
    createdAt: string | Timestamp;
}

// --- V1 New Types ---

export interface Room {
    id: string;
    name: string;
    capacity: number;
    pricePerHour: number;
    amenities: string[];
    imageUrl?: string;
    description?: string;
}

export interface Booking {
    id: string;
    roomId: string;
    userId: string;
    startTime: Timestamp;
    endTime: Timestamp;
    status: 'confirmed' | 'cancelled';
    totalPrice: number;
    createdAt: Timestamp;
}

export interface Business {
    id: string; // usually same as owner uid
    ownerId?: string;
    name: string;
    industry: string;
    city: string;
    description?: string;
    imageUrl?: string;
    ownerName?: string;
}

export type ApplicationType = 'sba_504' | 'sba_7a';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface Application {
    id: string;
    userId: string;
    type: ApplicationType;
    status: ApplicationStatus;
    currentStep: number;
    
    // Form Data Fields
    businessName?: string;
    yearsInBusiness?: number;
    annualRevenue?: number;
    loanAmount?: number;
    useOfFunds?: string;
    
    data?: Record<string, any>; // Keep for flexibility
    lastUpdated: Timestamp;
    createdAt: Timestamp;
}
