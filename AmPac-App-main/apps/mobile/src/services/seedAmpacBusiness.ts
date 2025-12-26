import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// AMPAC team members - update with real data
const AMPAC_TEAM_MEMBERS = [
    {
        id: 'ampac-ceo',
        name: 'AMPAC CEO',
        role: 'Chief Executive Officer',
        email: 'ceo@ampac.com',
        avatar: 'https://ui-avatars.com/api/?name=AMPAC+CEO&background=0064A6&color=fff'
    },
    {
        id: 'ampac-cto',
        name: 'AMPAC CTO',
        role: 'Chief Technology Officer',
        email: 'cto@ampac.com',
        avatar: 'https://ui-avatars.com/api/?name=AMPAC+CTO&background=0064A6&color=fff'
    },
    {
        id: 'ampac-growth',
        name: 'Growth Lead',
        role: 'Head of Growth',
        email: 'growth@ampac.com',
        avatar: 'https://ui-avatars.com/api/?name=Growth+Lead&background=0064A6&color=fff'
    },
    {
        id: 'ampac-support',
        name: 'Support Team',
        role: 'Customer Success',
        email: 'help_support@ampac.com',
        avatar: 'https://ui-avatars.com/api/?name=Support+Team&background=0064A6&color=fff'
    }
];

export interface AmpacBusiness {
    id: string;
    name: string;
    description: string;
    industry: string;
    city: string;
    state: string;
    website?: string;
    logo?: string;
    coverPhoto?: string;
    ownerId: string;
    teamMembers: string[];
    memberCount: number;
    isVerified: boolean;
    featured: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export const seedAmpacBusiness = async (): Promise<AmpacBusiness> => {
    try {
        const businessId = 'ampac-official';

        // Check if already exists
        const existingDoc = await getDoc(doc(db, 'businesses', businessId));
        if (existingDoc.exists()) {
            console.log('✅ AMPAC business already exists');
            return existingDoc.data() as AmpacBusiness;
        }

        const ampacBusiness: AmpacBusiness = {
            id: businessId,
            name: 'AMPAC',
            description: 'Empowering entrepreneurs with capital, community, and growth tools. Join our network of business owners accessing funding, resources, and support.',
            industry: 'Financial Services',
            city: 'San Francisco',
            state: 'CA',
            website: 'https://ampac.com',
            logo: 'https://ui-avatars.com/api/?name=AMPAC&background=0064A6&color=fff&size=200',
            coverPhoto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=400&fit=crop',
            ownerId: AMPAC_TEAM_MEMBERS[0].id,
            teamMembers: AMPAC_TEAM_MEMBERS.map(m => m.id),
            memberCount: AMPAC_TEAM_MEMBERS.length,
            isVerified: true,
            featured: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        await setDoc(doc(db, 'businesses', businessId), ampacBusiness);

        // Also create user profiles for team members if they don't exist
        for (const member of AMPAC_TEAM_MEMBERS) {
            const userDoc = await getDoc(doc(db, 'users', member.id));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', member.id), {
                    id: member.id,
                    displayName: member.name,
                    email: member.email,
                    photoURL: member.avatar,
                    role: member.role,
                    businessId: businessId,
                    badges: ['Team Member', 'Verified'],
                    createdAt: Timestamp.now()
                });
            }
        }

        console.log('✅ AMPAC business and team seeded successfully!');
        return ampacBusiness;
    } catch (error) {
        console.error('❌ Error seeding AMPAC business:', error);
        throw error;
    }
};

export const checkIfAmpacExists = async (): Promise<boolean> => {
    try {
        const docSnap = await getDoc(doc(db, 'businesses', 'ampac-official'));
        return docSnap.exists();
    } catch (error) {
        console.error('Error checking AMPAC business:', error);
        return false;
    }
};
