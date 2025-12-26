import { useState, useEffect } from 'react';
import { 
    ShoppingBag, 
    Plus, 
    Edit2, 
    Trash2, 
    ExternalLink, 
    Search,
    Star,
    ArrowLeft,
    Save,
    X
} from 'lucide-react';
import { 
    collection, 
    onSnapshot, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy,
    getDocs,
    limit
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate, useLocation } from 'react-router-dom';
import { LOCATIONS, type LocationId } from '../data/locations';

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
    locationId?: LocationId | 'global';
}

const CATEGORIES = ['Tools', 'Credit', 'Consulting', 'Legal', 'Marketing', 'Resources', 'Events', 'Other'];

export default function MarketplaceConfigPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<Partial<MarketplaceItem> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [filterLocation, setFilterLocation] = useState<LocationId | 'all'>('all');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const seedTitle = params.get('seed_title');
        const seedPrice = params.get('seed_price');
        const seedCategory = params.get('seed_category');

        if (seedTitle || seedPrice) {
            setEditingItem({
                title: seedTitle || '',
                priceLabel: seedPrice || '',
                category: seedCategory || 'Sale',
                description: 'Imported from Internal Sales system.',
                sortOrder: 0,
                featured: true,
                url: 'https://',
                locationId: 'global'
            });
            // Clear URL params without reload
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    useEffect(() => {
        const q = query(collection(db, 'marketplace_items'), orderBy('sortOrder', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as MarketplaceItem));
            setItems(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!editingItem?.title || !editingItem?.url) return;
        setIsSaving(true);
        try {
            const data = {
                ...editingItem,
                sortOrder: editingItem.sortOrder || 0,
                featured: editingItem.featured || false,
                category: editingItem.category || 'Other',
                locationId: editingItem.locationId || 'global'
            };

            if (editingItem.id) {
                const docId = editingItem.id;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...updateData } = data;
                await updateDoc(doc(db, 'marketplace_items', docId), updateData);
            } else {
                await addDoc(collection(db, 'marketplace_items'), data);
            }
            setEditingItem(null);
        } catch (error) {
            console.error('Error saving marketplace item:', error);
            alert('Failed to save item');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await deleteDoc(doc(db, 'marketplace_items', id));
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
        }
    };

    const filteredItems = items.filter(i => {
        const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             i.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = filterLocation === 'all' || i.locationId === filterLocation || i.locationId === 'global';
        return matchesSearch && matchesLocation;
    });

    return (
        <div className="p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <button 
                        onClick={() => navigate('/ops')}
                        className="flex items-center text-sm text-textSecondary hover:text-primary mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Ops Console
                    </button>
                    <h1 className="text-2xl font-bold text-primary flex items-center">
                        <ShoppingBag className="w-7 h-7 mr-3 text-primary" />
                        Marketplace Configuration
                    </h1>
                    <p className="text-textSecondary mt-1">Manage partner tools and resources for the mobile app</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            setIsSyncing(true);
                            try {
                                const paymentsRef = collection(db, 'payments');
                                const qSync = query(paymentsRef, orderBy('createdAt', 'desc'), limit(1));
                                const snap = await getDocs(qSync);
                                
                                if (!snap.empty) {
                                    const latest = snap.docs[0].data() as { customerName?: string; currency?: string; amount?: number | string };
                                    setEditingItem({
                                        title: `Service: ${latest.customerName || 'New Deal'}`,
                                        description: `Recently funded ${latest.currency || '$'}${latest.amount || '0'} transaction.`,
                                        category: 'Tools',
                                        priceLabel: `${latest.currency || '$'}${latest.amount || '0'}`,
                                        badge: 'NEW SALE',
                                        url: 'https://ampac.com/deals',
                                        featured: true,
                                        sortOrder: 0
                                    });
                                } else {
                                    alert('No recent sales found in Internal Admin system.');
                                }
                            } catch (err) {
                                console.error('Sync error:', err);
                                alert('Failed to sync with internal sales.');
                            } finally {
                                setIsSyncing(false);
                            }
                        }}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-surfaceHighlight border border-border text-primary rounded-lg hover:bg-surface transition-colors shadow-sm disabled:opacity-50"
                    >
                        <ShoppingBag className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Import Internal Sale'}
                    </button>
                    <button
                        onClick={() => setEditingItem({ category: 'Tools', sortOrder: 0, featured: false, locationId: 'global' })}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryLight transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Item
                    </button>
                </div>
            </header>

            <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surfaceHighlight flex items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
                            <input
                                type="text"
                                placeholder="Search marketplace items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <select
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value as LocationId | 'all')}
                            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Locations</option>
                            {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-textSecondary">Syncing with Firestore...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-textSecondary uppercase tracking-wider">Item Details</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary uppercase tracking-wider">Badge / Pricing</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary uppercase tracking-wider text-center">Featured</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-surfaceHighlight transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-primary group-hover:text-primaryLight transition-colors">{item.title}</span>
                                                    <span className="text-xs text-textSecondary mt-1 line-clamp-1" title={item.description}>{item.description}</span>
                                                    <a 
                                                        href={item.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-[10px] text-primary hover:underline flex items-center mt-1"
                                                    >
                                                        {new URL(item.url).hostname}
                                                        <ExternalLink className="w-2 h-2 ml-1" />
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-surfaceHighlight border border-border rounded text-xs font-medium">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {item.badge && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded w-fit">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    {item.priceLabel && (
                                                        <span className="text-xs text-textSecondary italic">
                                                            {item.priceLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.featured ? (
                                                    <Star className="w-5 h-5 text-amber-400 fill-amber-400 mx-auto" />
                                                ) : (
                                                    <Star className="w-5 h-5 text-border mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                    item.locationId === 'global' || !item.locationId
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                    {LOCATIONS.find(l => l.id === item.locationId)?.name || 'Global'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="p-2 text-textSecondary hover:text-primary hover:bg-surface border border-transparent hover:border-border rounded-lg"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 text-textSecondary hover:text-red-500 hover:bg-surface border border-transparent hover:border-border rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-textSecondary italic">
                                            No marketplace items found match your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit / Create Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-border bg-surfaceHighlight flex justify-between items-center">
                            <h3 className="font-bold text-xl text-primary">
                                {editingItem.id ? 'Edit Marketplace Item' : 'New Marketplace Item'}
                            </h3>
                            <button
                                onClick={() => setEditingItem(null)}
                                className="text-textSecondary hover:text-primary transition-colors p-1"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Title</label>
                                    <input
                                        type="text"
                                        value={editingItem.title || ''}
                                        onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                        placeholder="e.g. SBA Business Plan Expert"
                                    />
                                </div>
                                
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Description</label>
                                    <textarea
                                        value={editingItem.description || ''}
                                        onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors h-24 resize-none"
                                        placeholder="Briefly describe what this tool or partner offers..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Category</label>
                                    <select
                                        value={editingItem.category || 'Tools'}
                                        onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Sort Order</label>
                                    <input
                                        type="number"
                                        value={editingItem.sortOrder ?? 0}
                                        onChange={(e) => setEditingItem({...editingItem, sortOrder: parseInt(e.target.value) || 0})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Location</label>
                                    <select
                                        value={editingItem.locationId || 'global'}
                                        onChange={(e) => setEditingItem({...editingItem, locationId: e.target.value as LocationId | 'global'})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                    >
                                        {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Redirect URL</label>
                                    <input
                                        type="url"
                                        value={editingItem.url || ''}
                                        onChange={(e) => setEditingItem({...editingItem, url: e.target.value})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                        placeholder="https://partner-portal.com/ampac"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Badge (Optional)</label>
                                    <input
                                        type="text"
                                        value={editingItem.badge || ''}
                                        onChange={(e) => setEditingItem({...editingItem, badge: e.target.value})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                        placeholder="e.g. PARTNER, FREE"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide">Price Label (Optional)</label>
                                    <input
                                        type="text"
                                        value={editingItem.priceLabel || ''}
                                        onChange={(e) => setEditingItem({...editingItem, priceLabel: e.target.value})}
                                        className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                        placeholder="e.g. From $49/mo"
                                    />
                                </div>

                                <div className="col-span-2 mt-2">
                                    <label className="flex items-center cursor-pointer group w-fit">
                                        <div className="relative">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only" 
                                                checked={editingItem.featured || false}
                                                onChange={(e) => setEditingItem({...editingItem, featured: e.target.checked})}
                                            />
                                            <div className={`block w-14 h-8 rounded-full transition-colors ${editingItem.featured ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${editingItem.featured ? 'translate-x-6' : ''}`}></div>
                                        </div>
                                        <div className="ml-3 font-bold text-textSecondary group-hover:text-primary transition-colors">
                                            Highlight as Featured
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-border bg-surfaceHighlight flex justify-end gap-4">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-6 py-3 text-textSecondary font-bold hover:text-primary transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !editingItem.title || !editingItem.url}
                                className={`flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primaryLight transition-all shadow-md active:scale-95 ${isSaving || !editingItem.title || !editingItem.url ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                {isSaving ? (
                                    <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {editingItem.id ? 'Save Changes' : 'Create Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
