import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../firebaseConfig';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth(app);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('ampac_dev_bypass');
            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Workboard', path: '/' },
        { icon: Users, label: 'Staff Directory', path: '/admin' },
        { icon: FileText, label: 'Applications', path: '/search' }, // Placeholder
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-surfaceHighlight overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border flex items-center justify-between px-4 z-50">
                <div className="font-bold text-lg text-primary">AmPac Console</div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-textSecondary">
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:relative inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                mt-16 md:mt-0
            `}>
                <div className="p-6 border-b border-border hidden md:block">
                    <h1 className="text-xl font-bold text-primary">AmPac Console</h1>
                    <p className="text-xs text-textSecondary mt-1">Staff Access Only</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-textSecondary hover:bg-surfaceHighlight hover:text-primary'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 rounded-md text-sm font-medium text-error hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto pt-16 md:pt-0 w-full">
                <Outlet />
            </main>
        </div>
    );
}
