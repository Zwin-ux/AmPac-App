import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, X, Activity, Brain, CreditCard, MessageSquare, Shield, Megaphone, Building2 } from 'lucide-react';
import { useMsal } from "@azure/msal-react";
import CopilotSidebar from '../components/CopilotSidebar';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { instance } = useMsal();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            // Clear dev bypass flag
            localStorage.removeItem('ampac_dev_bypass');

            // Attempt MSAL logout if active
            const account = instance.getActiveAccount();
            if (account) {
                await instance.logoutPopup();
            }

            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
            navigate('/login');
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Workboard', path: '/' },
        { icon: Shield, label: 'Ops Console', path: '/ops' },
        { icon: Users, label: 'Staff Directory', path: '/admin' },
        { icon: FileText, label: 'Applications', path: '/search' },
        { icon: Activity, label: 'Ventures', path: '/ventures' },
        { icon: Brain, label: 'Brain Console', path: '/brain' },
        { icon: CreditCard, label: 'Payments', path: '/payments' },
        { icon: MessageSquare, label: 'Teams', path: '/teams' },
        { icon: Megaphone, label: 'Community Hub', path: '/community' },
        { icon: Building2, label: 'Businesses', path: '/businesses' },
        { icon: Settings, label: 'Leads', path: '/leads' },
        { icon: FileText, label: 'Intake Leads', path: '/pre-leads' },
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
            <main className="flex-1 flex overflow-hidden pt-16 md:pt-0 w-full relative">
                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
                {/* Feature Flag: Staff Copilot */}
                <CopilotSidebar />
            </main>
        </div>
    );
}
