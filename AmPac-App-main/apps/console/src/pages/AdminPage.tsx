import { useState } from 'react';
import { Users, Save, Check } from 'lucide-react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { staffMembers } from '../data/staff';
import type { User } from '../types';

export default function AdminPage() {
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});
    const [synced, setSynced] = useState<Record<string, boolean>>({});

    const handleSyncStaff = async (staff: typeof staffMembers[0], index: number) => {
        setSyncing(prev => ({ ...prev, [index]: true }));
        try {
            // In a real app, we'd create the Auth user here too via Admin SDK.
            // For this client-side demo, we'll just create the User document.
            // We'll use a deterministic ID based on email for simplicity in this demo.
            const uid = staff.email.replace('@ampac.com', '');

            const userDoc: User = {
                uid,
                role: 'ampac_staff',
                staffRole: staff.role as any,
                fullName: staff.name,
                businessName: 'AmPac CDC',
                phone: staff.phone,
                jobTitle: staff.title,
                email: staff.email, // Add email to type if missing, or just store it
                createdAt: Timestamp.now(),
            };

            await setDoc(doc(db, 'users', uid), userDoc);
            setSynced(prev => ({ ...prev, [index]: true }));
        } catch (error) {
            console.error("Error syncing staff:", error);
        } finally {
            setSyncing(prev => ({ ...prev, [index]: false }));
        }
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-primary">Admin Console</h1>
                <p className="text-textSecondary mt-1">Manage staff access and system configuration</p>
            </header>

            <div className="bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surfaceHighlight">
                    <h2 className="font-semibold flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Staff Directory
                    </h2>
                    <span className="text-xs text-textSecondary uppercase tracking-wider font-medium">
                        {staffMembers.length} Active Members
                    </span>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-surface border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {staffMembers.map((staff, index) => (
                            <tr key={index} className="hover:bg-surfaceHighlight transition-colors">
                                <td className="px-6 py-4 font-medium text-primary">{staff.name}</td>
                                <td className="px-6 py-4 text-textSecondary">{staff.title}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                        {staff.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleSyncStaff(staff, index)}
                                        disabled={syncing[index] || synced[index]}
                                        className={`flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${synced[index]
                                                ? 'bg-green-100 text-green-800 cursor-default'
                                                : 'bg-primary text-white hover:bg-primaryLight'
                                            }`}
                                    >
                                        {synced[index] ? (
                                            <>
                                                <Check className="w-3 h-3 mr-1" />
                                                Synced
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-3 h-3 mr-1" />
                                                {syncing[index] ? 'Syncing...' : 'Provision'}
                                            </>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
