import { Timestamp } from 'firebase/firestore';

// --- Enums & Unions ---

export type UserRole = 'entrepreneur' | 'ampac_staff';

export type StaffRole = 'intake' | 'loan_officer' | 'underwriter' | 'closing' | 'servicing' | 'executive' | 'admin';

export type OrganizationType = 'cdc' | 'lender_partner' | 'internal_ampac';

export type LoanProductCode = 'sba_504' | 'sba_7a' | 'ca_ibank_guarantee' | 'internal_micro';

export type BusinessRole = 'owner' | 'admin' | 'member';

// Alias for backward compatibility
export type ApplicationType = LoanProductCode;

export type ApplicationStatus =
    | 'draft'
    | 'quick_draft'
    | 'submitted'
    | 'in_review'
    | 'conditional_approval'
    | 'sba_submitted'
    | 'sba_approved'
    | 'closing'
    | 'funded'
    | 'declined'
    | 'withdrawn';

export type ApplicationSourceChannel = 'web_portal' | 'internal_staff_intake' | 'referral_partner' | 'upload_from_ventures';

export type ApplicationFlag = 'needs_more_info' | 'compliance_hold' | 'high_risk' | 'priority';

export type ParticipantType = 'borrower' | 'guarantor' | 'affiliate';

export type CollateralType = 'real_estate' | 'equipment' | 'leasehold_improvements' | 'other';

export type DocumentRequestStatus = 'not_requested' | 'requested' | 'uploaded' | 'approved' | 'rejected';

export type TaskType = 'borrower_action' | 'staff_review' | 'compliance_check' | 'third_party_order' | 'partner_bank_followup';

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// --- Entities ---

export interface Organization {
    id: string;
    name: string;
    type: OrganizationType;
    sbaLenderNumber?: string;
    address?: string;
    contacts?: {
        name: string;
        email: string;
        phone?: string;
    }[];
}

export interface User {
    uid: string;
    role: UserRole;
    staffRole?: StaffRole;
    orgId?: string; // Link to Organization
    fullName: string;
    businessName: string; // Kept for legacy/simple borrower cases
    phone: string;
    createdAt: Timestamp;

    // Extended Profile Fields
    avatarUrl?: string;
    bio?: string;
    jobTitle?: string;
    industry?: string;
    linkedinUrl?: string;
    website?: string;
    city?: string;
    email?: string;
    notificationsEnabled?: boolean;

    // Business Card Customization
    cardColor?: string;
    businessStatus?: 'idea' | 'startup' | 'scaling' | 'established' | 'enterprise';
    businessType?: 'technology' | 'retail' | 'service' | 'manufacturing' | 'health' | 'finance' | 'other';

    // Optional demographics (self-reported)
    demographics?: {
        raceEthnicity?: string[];
        gender?: string;
        veteranStatus?: 'yes' | 'no' | 'prefer_not';
    };

    // Optional skills/services tags
    skills?: string[];
    badges?: string[];
}

export interface LoanProduct {
    id: string;
    code: LoanProductCode;
    name: string;
    sbaMetadata?: Record<string, any>;
    defaultChecklist?: string[]; // Array of doc types
}

export interface Application {
    id: string;
    userId?: string; // Legacy: Primary borrower user ID
    applicantOrgId?: string; // New: Organization applying
    primaryBorrowerUserId?: string; // New: Specific user

    productId?: string;
    type: LoanProductCode; // Kept for backward compat, maps to product code

    status: ApplicationStatus;
    sourceChannel?: ApplicationSourceChannel;

    // Financials
    requestedAmount?: number;
    useOfFunds?: string;
    yearsInBusiness?: number;
    annualRevenue?: number;

    // Key Dates
    createdAt: Timestamp;
    submittedAt?: Timestamp;
    sbaApprovalDate?: Timestamp;
    closingDate?: Timestamp;
    lastUpdated: Timestamp;

    // External IDs
    venturesLoanId?: string;
    venturesStatus?: string; // Raw status from LOS
    sbaEtranApplicationId?: string;

    // Metadata
    flags?: ApplicationFlag[];
    assignedTo?: string; // Staff UID
    adminNotes?: string;

    // Legacy fields to maintain while migrating
    currentStep?: number;
    isQuickApply?: boolean;
    businessName?: string; // Denormalized for easy access
    phone?: string;
    data?: Record<string, any>;
    loanAmount?: number; // Legacy field for requested amount
    version?: number; // For optimistic concurrency control
    lastSyncedAt?: Timestamp;
}

export interface Participant {
    id: string;
    loanApplicationId: string;
    type: ParticipantType;
    name: string;
    ownershipPercent?: number;
    ssnEinHash?: string; // Store hash only for security
    address?: string;
    email?: string;
    phone?: string;
}

export interface Collateral {
    id: string;
    loanApplicationId: string;
    type: CollateralType;
    description: string;
    estimatedValue?: number;
    lienPosition?: number;
    address?: string;
}

export interface DocumentRequest {
    id: string;
    loanApplicationId: string;
    docType: string; // e.g., 'tax_return_2023', 'personal_financial_statement'
    title: string;
    description?: string;
    requiredForStage?: 'underwriting' | 'sba_submission' | 'closing';
    status: DocumentRequestStatus;
    requestedAt: Timestamp;
    dueDate?: Timestamp;
}

export interface Document {
    id: string;
    documentRequestId?: string; // Link to request if applicable
    loanApplicationId: string;
    fileUrl: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    uploadedBy: string; // User UID
    uploadedAt: Timestamp;
    version?: number;
    virusScanStatus?: 'pending' | 'clean' | 'infected';
    classificationTags?: string[];

    // IDP Fields
    analysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    extractedData?: Record<string, any>;
}

export interface Task {
    id: string;
    loanApplicationId: string;
    title: string;
    description?: string;
    type: TaskType;
    assignedTo?: string; // User UID
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Timestamp;
    createdBy: string;
    createdAt: Timestamp;
    completedAt?: Timestamp;
}

export interface TimelineEvent {
    id: string;
    loanApplicationId: string;
    type: 'status_change' | 'document_submission' | 'decision' | 'sba_event' | 'ventures_sync';
    title: string;
    description?: string;
    actorId?: string; // User UID or 'system'
    timestamp: Timestamp;
    metadata?: Record<string, any>;
}

export interface IntegrationMapping {
    id: string;
    systemName: 'ventures' | 'etran' | 'mysba' | 'ibank_sbfc';
    externalId: string;
    loanApplicationId: string;
    syncStatus: 'synced' | 'pending' | 'error';
    lastSyncedAt?: Timestamp;
    lastError?: string;
}

// Quick Apply - minimal fields for fast submission
export interface QuickApplyData {
    type: LoanProductCode;
    loanAmount: number;
    businessName: string;
    phone: string;
}

// Sync status for optimistic UI
export type SyncStatus = 'idle' | 'local' | 'syncing' | 'synced' | 'offline' | 'error';

// --- Pricing and bookings (tiered + multi-room) ---
export type PricingRuleType = 'hourly_tier' | 'bundle' | 'peak' | 'member' | 'weekend' | 'holiday';

export interface PricingTier {
    upToHours?: number; // Optional upper bound; last tier can omit
    minHours?: number; // Lower bound when needed (e.g., bundles)
    rate: number; // Rate per hour unless bundleHours is set
    label?: string;
}

export interface PricingRule {
    id?: string;
    type: PricingRuleType;
    priority?: number;
    validFrom?: Timestamp;
    validTo?: Timestamp;
    daysOfWeek?: number[]; // 0-6
    peakStartHour?: number;
    peakEndHour?: number;
    customerTier?: 'member' | 'non_member';
    multiplier?: number; // For peak/holiday adjustments
    flatAmount?: number; // For bundles
    bundleHours?: number;
    tiers?: PricingTier[];
}

export type AddOnPricingType = 'flat' | 'per_hour' | 'per_attendee';

export interface AddOn {
    id: string;
    name: string;
    pricingType: AddOnPricingType;
    price: number;
    taxability?: 'taxable' | 'exempt';
    description?: string;
}

export interface AddOnSelection {
    addOnId: string;
    quantity?: number;
}

export interface PriceBreakdown {
    base: number;
    addOns: number;
    taxes: number;
    fees: number;
    discounts: number;
    total: number;
    appliedRules?: string[];
    currency?: string;
}

export interface BookingItem {
    roomId: string;
    startTime: Timestamp;
    endTime: Timestamp;
    attendees?: number;
    addOns?: AddOnSelection[];
    status?: 'pending' | 'confirmed' | 'cancelled' | 'on_hold';
    priceBreakdown?: PriceBreakdown;
    accessCode?: string;
    graphEventId?: string;
}

export interface PricingQuoteRequest {
    rooms: { roomId: string; startTime: Timestamp; endTime: Timestamp; addOns?: AddOnSelection[]; attendees?: number; }[];
    customerTier?: 'member' | 'non_member';
}

export interface PricingQuoteResponse {
    items: { roomId: string; priceBreakdown: PriceBreakdown; appliedRules: string[]; }[];
    total: number;
    currency: string;
}

export interface Room {
    id: string;
    name: string;
    pricePerHour: number;
    capacity: number;
    description?: string;
    amenities: string[];
    imageUrl?: string;
    location?: string;
    timezone?: string;
    graphResourceId?: string;
    pricingRules?: PricingRule[];
}

export interface Booking {
    id: string;
    userId: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'on_hold';
    items: BookingItem[];
    totalPrice: number;
    createdAt: Timestamp;
    holdExpiresAt?: Timestamp;
    holdId?: string;
    paymentSessionId?: string; // Stripe payment session ID for tracking
}

export interface Business {
    id: string; // usually same as owner uid
    ownerId: string;
    name: string;
    industry: string;
    city: string;
    description?: string;
    bio?: string; // Unified with bio if used elsewhere
    imageUrl?: string;
    ownerName?: string;
    members: Record<string, BusinessRole>; // uid -> role
    inviteCode?: string;
    chatChannelId?: string; // Private channel for this business
    isVerified?: boolean;
    badges?: string[];
    createdAt?: Timestamp;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: Timestamp;
    endDate?: Timestamp;
    location: string;
    organizerId: string;
    organizerName: string;
    organizerAvatar?: string;
    organizerBadges?: string[];
    organizerBusinessId?: string;
    attendees: string[]; // User IDs
    imageUrl?: string;
    type?: 'event' | 'workshop' | 'webinar';
    engagementScore?: number;
    featured?: boolean;
    pinned?: boolean;
    createdAt?: Timestamp;
}

export interface MarketplaceItem {
    id: string;
    title: string;
    description: string;
    category: string;
    url?: string; // Optional - some items may not have active links
    badge?: string;
    priceLabel?: string;
    featured?: boolean;
    sortOrder?: number;
}

// --- Chat & Social ---

export interface Channel {
    id: string;
    orgId: string;
    type: 'public' | 'private' | 'dm';
    name: string;
    description?: string;
    members: string[]; // User UIDs
    lastMessage?: {
        text: string;
        senderId: string;
        createdAt: Timestamp;
    };
    createdAt: Timestamp;
    createdBy: string;
}

export interface Message {
    id: string;
    channelId: string;
    text: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    type: 'text' | 'image' | 'system';
    mediaUrl?: string;
    reactions?: Record<string, string[]>; // { "👍": ["uid1", "uid2"] }
    replyCount?: number;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface FeedPost {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorBadges?: string[];
    authorBusinessId?: string; // If posted on behalf of a business
    orgId?: string;

    content: string;
    mediaUrls?: string[];
    hashtags?: string[]; // Extracted hashtags for filtering/search

    likes: string[]; // Array of UIDs
    commentCount: number;
    viewCount?: number;
    engagementScore?: number;

    type: 'announcement' | 'showcase' | 'qa';
    featured?: boolean;
    pinned?: boolean;

    createdAt: Timestamp;
}

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorBadges?: string[];

    content: string;
    likes: string[];

    parentCommentId?: string;  // For nested replies
    replyCount: number;

    isHelpful: boolean;  // Marked by post author
    isEdited: boolean;

    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Notification {
    id: string;
    userId: string; // Target user
    type: 'invite' | 'rsvp' | 'mention' | 'system' | 'comment' | 'like' | 'reply';
    title: string;
    body: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: Timestamp;
}

// =====================
// Calendar Types
// =====================

export type CalendarEventType = 'personal' | 'community' | 'loan_milestone' | 'meeting' | 'task';

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
    id: string;
    userId: string;
    title: string;
    description?: string;
    location?: string;
    
    startDate: Timestamp;
    endDate: Timestamp;
    allDay?: boolean;
    
    type: CalendarEventType;
    color?: string; // Custom color for event
    
    // Recurrence
    recurrence: RecurrencePattern;
    recurrenceEndDate?: Timestamp;
    
    // Reminders (minutes before)
    reminders?: number[];
    
    // Linking
    linkedEventId?: string; // Community event ID if synced
    linkedApplicationId?: string; // Loan application ID for milestones
    
    // Status
    completed?: boolean;
    
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface CalendarReminder {
    id: string;
    eventId: string;
    userId: string;
    scheduledFor: Timestamp;
    sent: boolean;
    createdAt: Timestamp;
}

// --- Direct Messages ---

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string;
    
    content: string;
    type: 'text' | 'image' | 'document';
    mediaUrl?: string;
    
    read: boolean;
    readAt?: Timestamp;
    
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface DirectConversation {
    id: string;
    participants: string[]; // Array of 2 user IDs
    participantNames: string[]; // Cached names for quick display
    participantAvatars?: string[]; // Cached avatars
    
    lastMessage?: {
        content: string;
        senderId: string;
        createdAt: Timestamp;
    };
    
    unreadCount: Record<string, number>; // userId -> unread count
    
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
