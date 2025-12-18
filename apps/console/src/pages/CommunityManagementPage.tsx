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
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
    MessageSquare, 
    Trash2, 
    Megaphone, 
    Shield, 
    Plus,
    X,
    Check,
    Clock,
    User as UserIcon,
    AlertCircle
} from 'lucide-react';
import type { FeedPost } from '../types';

export default function CommunityManagementPage() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAnnouncementBox, setShowAnnouncementBox] = useState(false);
    const [announcement, setAnnouncement] = useState({ content: '', type: 'announcement' as FeedPost['type'] });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
        const unsubscribe = onSnapshot(q, (snap) => {
            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedPost));
            setPosts(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

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
                        <p className="text-sm text-textSecondary font-medium">Total Posts</p>
                        <p className="text-2xl font-bold">{posts.length}</p>
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-textSecondary font-medium">Announcements</p>
                        <p className="text-2xl font-bold">{posts.filter(p => p.type === 'announcement').length}</p>
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-textSecondary font-medium">System Health</p>
                        <p className="text-2xl font-bold">Active</p>
                    </div>
                </div>
            </div>

            {/* Moderation List */}
            <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surfaceHighlight flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search posts or authors..."
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
                            <tr>
                                <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Author</th>
                                <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider w-1/2">Content</th>
                                <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 font-semibold text-textSecondary text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-textSecondary">
                                        <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading community feed...
                                    </td>
                                </tr>
                            ) : filteredPosts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-textSecondary">
                                        No posts found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPosts.map((post) => (
                                    <tr key={post.id} className="hover:bg-surfaceHighlight group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden">
                                                    {post.authorAvatar ? (
                                                        <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-primary text-sm">{post.authorName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-textSecondary line-clamp-2">{post.content}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                                post.type === 'announcement' ? 'bg-amber-100 text-amber-700' :
                                                post.type === 'showcase' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {post.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-textSecondary">
                                            {post.createdAt?.toDate().toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDeletePost(post.id)}
                                                className="p-2 text-textSecondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
                    <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border bg-surfaceHighlight flex justify-between items-center">
                            <h2 className="font-bold text-lg text-primary">New Official Announcement</h2>
                            <button onClick={() => setShowAnnouncementBox(false)} className="text-textSecondary hover:text-primary">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>Announcements will be highlighted to all users in the mobile app feed.</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide text-xs">Post Type</label>
                                <div className="flex gap-2">
                                    {(['announcement', 'showcase', 'qa'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setAnnouncement({...announcement, type: t})}
                                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                                announcement.type === t 
                                                ? 'bg-primary text-white border-primary shadow-sm' 
                                                : 'bg-surface text-textSecondary border-border hover:bg-surfaceHighlight'
                                            }`}
                                        >
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-textSecondary mb-2 uppercase tracking-wide text-xs">Content</label>
                                <textarea
                                    value={announcement.content}
                                    onChange={(e) => setAnnouncement({...announcement, content: e.target.value})}
                                    rows={5}
                                    placeholder="Write your official update here..."
                                    className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-0 transition-colors text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-surfaceHighlight border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowAnnouncementBox(false)}
                                className="px-4 py-2 text-textSecondary font-medium hover:text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                disabled={isSaving || !announcement.content.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primaryLight transition-all shadow-md disabled:opacity-50"
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
