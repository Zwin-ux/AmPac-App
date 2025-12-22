import { Timestamp } from 'firebase/firestore';

// --- Enums & Unions ---
// Keep this file aligned with apps/mobile/src/types.ts because both apps share the same Firestore collections (users, applications, documents, etc.).

export type UserRole = 'entrepreneur' | 'ampac_staff';

export type StaffRole = 'intake' | 'loan_officer' | 'underwriter' | 'closing' | 'servicing' | 'executive' | 'admin';

export type OrganizationType = 'cdc' | 'lender_partner' | 'internal_ampac';

export type LoanProductCode = 'sba_504' | 'sba_7a' | 'ca_ibank_guarantee' | 'internal_micro';

export type ApplicationStatus =
    | 'draft'
    | 'submitted'
    | 'in_review'
    | 'conditional_approval'
    | 'sba_submitted'
    | 'sba_approved'
    | 'closing'
    | 'funded'
    | 'declined'
    | 'rejected'
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
    businessName?: string; // Kept for legacy/simple borrower cases
    email?: string;
    phone?: string;
    status?: 'active' | 'inactive' | 'pending';
    createdAt: Timestamp;

    // Extended Profile Fields
    avatarUrl?: string;
    bio?: string;
    jobTitle?: string;
    industry?: string;
    linkedinUrl?: string;
    website?: string;
    city?: string;
    permissions?: string[]; // RBAC: List of specific capabilities e.g. 'approve_loan', 'view_sensitive_pii'
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

export interface Business {
    id: string; // usually same as owner uid
    ownerId: string;
    name: string;
    industry: string;
    city: string;
    description?: string;
    imageUrl?: string;
    ownerName?: string;
    members: Record<string, 'owner' | 'admin' | 'member'>;
    inviteCode?: string;
    chatChannelId?: string;
    isVerified?: boolean;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: Timestamp;
    location: string;
    organizerId: string;
    organizerName: string;
    organizerAvatar?: string;
    organizerBusinessId?: string;
    attendees: string[]; // User IDs
    imageUrl?: string;
    rsvpCount?: number; // Added based on instruction snippet
    type?: 'event' | 'workshop' | 'webinar';
    engagementScore?: number;
    featured?: boolean;
    pinned?: boolean;
    createdAt: Timestamp;
}

export interface MarketplaceItem {
    id: string;
    title: string;
    description: string;
    category: string;
    url: string;
    badge?: string;
    priceLabel?: string;
    featured?: boolean;
    sortOrder?: number;
    locationId?: string;
}

export interface FeedPost {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    orgId?: string;

    content: string;
    mediaUrls?: string[];

    likes: string[]; // Array of UIDs
    commentCount: number;
    viewCount?: number;

    type: 'announcement' | 'showcase' | 'qa';

    featured?: boolean;
    pinned?: boolean;
    engagementScore?: number;

    createdAt: Timestamp;
}

export interface Report {
    id: string;
    targetId: string;
    targetType: 'post' | 'event' | 'comment';
    reason: string;
    reporterId: string;
    reporterName?: string;
    targetContent?: string;
    status: 'pending' | 'resolved' | 'dismissed';
    createdAt: Timestamp;
}

export interface PreliminaryLead {
    id: string;
    userId?: string;
    fullName: string;
    email: string;
    ficoRange: string;
    loanAmountDesired: number;
    businessIndustry: string;
    yearsInBusiness: number;
    purpose: string;
    status: 'new' | 'reviewing' | 'contacted' | 'converted';
    assignedTo?: string;
    notes?: {
        authorName: string;
        text: string;
        createdAt: Timestamp;
    }[];
    createdAt: Timestamp;
}

// --- Ventures Integration Types ---

export type SyncMode = 'dry_run' | 'validate' | 'commit';
export type SyncStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'validation_error';

export interface VenturesSyncLog {
    id: string;
    loanApplicationId: string;
    timestamp: number;
    actorId: string; // Staff UID
    mode: SyncMode;
    status: SyncStatus;
    summary: string;
    details?: string; // JSON string of diffs or errors
    note?: string; // Human note
}

export interface VenturesFieldMapping {
    field: string;
    ampacValue: any;
    venturesValue: any;
    sourceOfTruth: 'ampac' | 'ventures';
    status: 'match' | 'mismatch' | 'ignored';
    isLocked?: boolean;
}

export interface VenturesLoanStatus {
    venturesLoanId: string;
    lastSync: number;
    status: 'connected' | 'disconnected' | 'error';
    fieldMappings: VenturesFieldMapping[];
    syncLogs: VenturesSyncLog[];
}

export interface VenturesDashboardLog {
    id?: string;
    timestamp?: string;
    createdAt?: string;
    updatedAt?: string;
    status: 'success' | 'error' | 'info' | 'pending' | 'dead_letter';
    message: string;
    loanApplicationId?: string;
    type?: string;
    lastError?: string;
}

export interface VenturesQueueDepth {
    pending: number;
    in_flight: number;
    dead_letter: number;
}

export interface VenturesDashboardStats {
    syncedCount: number;
    pendingCount: number;
    errorCount: number;
    queueDepth?: VenturesQueueDepth;
    recentLogs: VenturesDashboardLog[];
    stale?: boolean;
    lastLoopAt?: string | null;
    lastError?: string | null;
}
