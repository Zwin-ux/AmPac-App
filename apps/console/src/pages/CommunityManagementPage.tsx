import { useEffect, useState } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    doc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
    Calendar,
    Flag,
    Pin,
    Star,
    Trash2,
    Plus,
    X,
    Check,
    Clock,
    User as UserIcon,
    AlertCircle,
    MessageSquare,
} from 'lucide-react';
import type { FeedPost, Event, Report } from '../types';

export default function CommunityManagementPage() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAnnouncementBox, setShowAnnouncementBox] = useState(false);
    const [announcement, setAnnouncement] = useState({ content: '', type: 'announcement' as FeedPost['type'] });
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'events' | 'reports'>('posts');

    useEffect(() => {
        setLoading(true);
        const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
        const qEvents = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(100));
        const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100));

        const unsubPosts = onSnapshot(qPosts, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost)));
            if (activeTab === 'posts') setLoading(false);
        });

        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
            if (activeTab === 'events') setLoading(false);
        });

        const unsubReports = onSnapshot(qReports, (snapshot) => {
            setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
            if (activeTab === 'reports') setLoading(false);
        });

        return () => {
            unsubPosts();
            unsubEvents();
            unsubReports();
        };
    }, [activeTab]);

    const handleToggleStatus = async (collectionName: 'posts' | 'events', id: string, field: 'featured' | 'pinned', currentValue: boolean) => {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, {
                [field]: !currentValue
            });
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            alert(`Failed to update ${field}`);
        }
    };

    const handleDeletePost = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this post? It will be permanently deleted from the mobile feed.")) return;
        try {
            await deleteDoc(doc(db, 'posts', id));
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post");
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!announcement.content.trim()) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'posts'), {
                authorId: 'system_admin',
                authorName: 'AmPac Official',
                content: announcement.content,
                type: announcement.type,
                likes: [],
                commentCount: 0,
                featured: true, // Announcements are featured by default
                pinned: true,   // and pinned
                createdAt: serverTimestamp()
            });
            setAnnouncement({ content: '', type: 'announcement' });
            setShowAnnouncementBox(false);
        } catch (error) {
            console.error("Error creating announcement:", error);
            alert("Failed to post announcement");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPosts = posts.filter(p =>
        p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Community Management</h1>
                    <p className="text-textSecondary mt-1">Moderate user posts and post official updates to the mobile app.</p>
                </div>
                <button
                    onClick={() => setShowAnnouncementBox(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryLight transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Announcement
                </button>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-textSecondary font-medium">Community Posts</p>
                        <p className="text-2xl font-bold">{posts.length}</p>
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-textSecondary font-medium">Total Events</p>
                        <p className="text-2xl font-bold">{events.length}</p>
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <Flag className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-textSecondary font-medium">Pending Reports</p>
                        <p className="text-2xl font-bold">{reports.length}</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border mb-8">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'posts' ? 'text-primary' : 'text-textSecondary hover:text-primary'}`}
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Posts
                    </div>
                    {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'events' ? 'text-primary' : 'text-textSecondary hover:text-primary'}`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Events
                    </div>
                    {activeTab === 'events' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'reports' ? 'text-primary' : 'text-textSecondary hover:text-primary'}`}
                >
                    <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        Reports
                        {reports.length > 0 && (
                            <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">{reports.length}</span>
                        )}
                    </div>
                    {activeTab === 'reports' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
            </div>

            {/* Moderation List */}
            <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surfaceHighlight flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surfaceHighlight border-b border-border">
                            {activeTab === 'reports' ? (
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider w-1/3">Target Content</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Reporter</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">{activeTab === 'events' ? 'Organizer' : 'Author'}</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider w-1/3">Content</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Engagement</th>
                                    <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-textSecondary">
                                        <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading {activeTab}...
                                    </td>
                                </tr>
                            ) : (activeTab === 'posts' ? filteredPosts : activeTab === 'events' ? events : reports).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-textSecondary">
                                        No {activeTab} found.
                                    </td>
                                </tr>
                            ) : activeTab === 'reports' ? (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-surfaceHighlight group transition-colors">
                                        <td className="px-6 py-4 font-bold text-red-600 text-xs">
                                            {report.reason?.toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm italic text-textSecondary line-clamp-2">"{report.targetContent || 'Unknown Content'}"</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-primary">
                                            {report.reporterName || 'Anonymous'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-textSecondary">
                                            {report.createdAt?.toDate().toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => deleteDoc(doc(db, 'reports', report.id))}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    title="Mark as Resolved"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm("Permanently delete content?")) {
                                                            const col = report.targetType === 'event' ? 'events' : 'posts';
                                                            await Promise.all([
                                                                deleteDoc(doc(db, col, report.targetId)),
                                                                deleteDoc(doc(db, 'reports', report.id))
                                                            ]);
                                                        }
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Delete Reported Content"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                (activeTab === 'posts' ? filteredPosts : events).map((item) => (
                                    <tr key={item.id} className="hover:bg-surfaceHighlight group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden">
                                                    {(item as any).authorAvatar || (item as any).organizerAvatar ? (
                                                        <img src={(item as any).authorAvatar || (item as any).organizerAvatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-primary text-sm">{(item as any).authorName || (item as any).organizerName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-textSecondary line-clamp-2">
                                            {(item as any).content || (item as any).description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.type === 'announcement' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {item.type || 'standard'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-textSecondary">
                                                <span className="font-bold text-primary">{(item as any).engagementScore?.toFixed(1) || '0.0'}</span> Pts
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(activeTab as any, item.id, 'pinned', !!item.pinned)}
                                                    className={`p-2 rounded-lg ${item.pinned ? 'bg-amber-100 text-amber-600' : 'text-textSecondary hover:bg-slate-100'}`}
                                                    title="Toggle Pin"
                                                >
                                                    <Pin className={`w-4 h-4 ${item.pinned ? 'fill-current' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(activeTab as any, item.id, 'featured', !!item.featured)}
                                                    className={`p-2 rounded-lg ${item.featured ? 'bg-blue-100 text-blue-600' : 'text-textSecondary hover:bg-slate-100'}`}
                                                    title="Toggle Featured"
                                                >
                                                    <Star className={`w-4 h-4 ${item.featured ? 'fill-current' : ''}`} />
                                                </button>
                                                <div className="w-px h-4 bg-border mx-1" />
                                                <button
                                                    onClick={() => (activeTab === 'posts' ? handleDeletePost(item.id) : null)}
                                                    className="p-2 text-textSecondary hover:text-red-600 rounded-lg"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Announcement Modal */}
            {showAnnouncementBox && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h2 className="font-bold text-lg text-primary">New Official Announcement</h2>
                            <button
                                onClick={() => setShowAnnouncementBox(false)}
                                className="text-textSecondary hover:text-primary"
                                title="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>Announcements will be featured and pinned to the top of the feed.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide text-xs">Content</label>
                                <textarea
                                    value={announcement.content}
                                    onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
                                    rows={5}
                                    placeholder="Write your official update here..."
                                    className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-surfaceHighlight border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowAnnouncementBox(false)}
                                className="px-4 py-2 text-textSecondary font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                disabled={isSaving || !announcement.content.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50"
                            >
                                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isSaving ? 'Posting...' : 'Post Announcement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
