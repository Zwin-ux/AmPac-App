import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    doc,
    updateDoc,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Business } from '../types';
import {
    Building2,
    Search,
    Users,
    MapPin,
    ExternalLink,
    ShieldCheck
} from 'lucide-react';

const BusinessDirectoryPage: React.FC = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterIndustry, setFilterIndustry] = useState('All');

    useEffect(() => {
        const q = query(
            collection(db, 'businesses'),
            orderBy('name', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const businessData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Business));
            setBusinesses(businessData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleVerification = async (businessId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'businesses', businessId), {
                isVerified: !currentStatus
            });
        } catch (error) {
            console.error('Error toggling verification:', error);
        }
    };

    const industries = ['All', ...Array.from(new Set(businesses.map(b => b.industry)))];

    const filteredBusinesses = businesses.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesIndustry = filterIndustry === 'All' || b.industry === filterIndustry;
        return matchesSearch && matchesIndustry;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Business Directory</h1>
                    <p className="text-gray-500">Oversee and verify community business profiles</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search name, owner, city..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        title="Industry Filter"
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        value={filterIndustry}
                        onChange={(e) => setFilterIndustry(e.target.value)}
                    >
                        {industries.map(industry => (
                            <option key={industry} value={industry}>{industry}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBusinesses.map((business) => (
                    <div key={business.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Building2 className="w-6 h-6 text-indigo-600" />
                                </div>
                                <button
                                    onClick={() => toggleVerification(business.id, !!business.isVerified)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${business.isVerified
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <ShieldCheck className={`w-3.5 h-3.5 ${business.isVerified ? 'text-green-600' : 'text-gray-400'}`} />
                                    {business.isVerified ? 'Verified' : 'Unverified'}
                                </button>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mb-1">{business.name}</h3>
                            <div className="flex items-center text-sm text-gray-500 mb-4">
                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                {business.city} • {business.industry}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <Users className="w-4 h-4" /> Members
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {Object.keys(business.members || {}).length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Owner</span>
                                    <span className="font-medium text-gray-900">{business.ownerName || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 text-xs">Invite Code</span>
                                    <code className="bg-gray-50 px-2 py-0.5 rounded text-indigo-600 font-mono text-xs">
                                        {business.inviteCode || 'N/A'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-xs text-gray-400">ID: ...{business.id.slice(-6)}</span>
                            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
                                Manage <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredBusinesses.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No businesses found</h3>
                    <p className="text-gray-500">Adjust your search or filters to see more results</p>
                </div>
            )}
        </div>
    );
};

export default BusinessDirectoryPage;
