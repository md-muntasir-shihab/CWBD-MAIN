import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Search, Bell, Menu, RefreshCw, ChevronDown,
    User, Lock, Settings, LogOut, Clock,
} from 'lucide-react';
import ThemeSwitchPro from '../ui/ThemeSwitchPro';
import { adminRouteFromTab } from '../../lib/appRoutes';
import { adminGetActionableAlerts, adminMarkActionableAlertsRead } from '../../services/api';

interface AdminTopbarProps {
    activeTab: string;
    onMenuClick: () => void;
    onRefresh: () => void;
    loading: boolean;
    user: { fullName?: string; username?: string; email?: string; role?: string } | null;
    onLogout: () => void;
    onTabChange: (tab: string) => void;
}

const ACTIONABLE_ALERT_ROLES = new Set([
    'superadmin',
    'admin',
    'moderator',
    'viewer',
    'support_agent',
    'finance_agent',
]);

export default function AdminTopbar({
    activeTab, onMenuClick, onRefresh, loading, user, onLogout, onTabChange
}: AdminTopbarProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const canReadActionableAlerts = ACTIONABLE_ALERT_ROLES.has(String(user?.role || '').toLowerCase());

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const tabLabels: Record<string, string> = {
        dashboard: 'Dashboard',
        universities: 'University Management',
        featured: 'Featured Universities',
        exams: 'Exam Management',
        'subscription-plans': 'Subscription Plans',
        'student-management': 'Student Management',
        resources: 'Resources',
        'support-tickets': 'Support Center',
        finance: 'Payments & Finance',
        banners: 'Banner Management',
        'file-upload': 'File Upload & Mapping',
        reports: 'Reports & Analytics',
        'home-control': 'Content & Home Control',
        users: 'User Management',
        security: 'Security Center',
        logs: 'System Logs',
        'admin-profile': 'Admin Profile',
        settings: 'Settings',
    };

    const quickNavLinks = [
        { label: 'Home', to: '/' },
        { label: 'Public News', to: '/news' },
        { label: 'Exam Portal', to: '/exam-portal' },
        { label: 'News Console', to: '/__cw_admin__/news/dashboard' },
    ];

    const alertsQuery = useQuery({
        queryKey: ['admin', 'actionable-alerts', 'topbar'],
        queryFn: async () => (await adminGetActionableAlerts({ page: 1, limit: 8 })).data,
        staleTime: 30_000,
        enabled: canReadActionableAlerts,
    });
    const markReadMutation = useMutation({
        mutationFn: async (ids?: string[]) => (await adminMarkActionableAlertsRead(ids)).data,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin', 'actionable-alerts'] }),
                queryClient.invalidateQueries({ queryKey: ['admin', 'actionable-alerts', 'topbar'] }),
            ]);
        },
    });
    const notifications = canReadActionableAlerts ? (alertsQuery.data?.items || []) : [];
    const unreadCount = canReadActionableAlerts ? Number(alertsQuery.data?.unreadCount || 0) : 0;

    const navigateByTab = (tab: string) => {
        onTabChange(tab);
        const target = adminRouteFromTab(tab, tab === 'student-management' ? 'students' : undefined);
        if (target && location.pathname !== target) {
            navigate(target);
        }
    };

    const openNotification = async (id: string, linkUrl?: string) => {
        if (!canReadActionableAlerts) return;
        await markReadMutation.mutateAsync([id]);
        setNotifOpen(false);
        if (linkUrl) {
            navigate(linkUrl);
            return;
        }
        navigate('/__cw_admin__/notification-center');
    };

    return (
        <header className="sticky top-0 z-30 overflow-x-hidden border-b border-card-border/80 bg-surface/90 backdrop-blur-xl dark:border-indigo-500/10 dark:bg-slate-950/80">
            <div className="space-y-2 px-4 py-3 sm:px-6">
                <div className="flex items-start justify-between gap-3 sm:items-center">
                    <div className="min-w-0 flex items-center gap-3">
                        <button
                            onClick={onMenuClick}
                            aria-label="Toggle menu"
                            className="rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden"
                        >
                            <Menu className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-bold text-text dark:text-white">{tabLabels[activeTab] || 'Dashboard'}</h1>
                            <p className="hidden text-xs text-text-muted dark:text-indigo-300/60 sm:block">
                                {activeTab === 'dashboard'
                                    ? `Welcome back, ${user?.fullName || 'Admin'}`
                                    : `Manage your ${tabLabels[activeTab]?.toLowerCase() || 'content'}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-3">
                        <ThemeSwitchPro />

                        <div className="order-last flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 transition-colors focus-within:border-indigo-500/40 dark:border-indigo-500/15 dark:bg-white/5 sm:order-none sm:w-72">
                            <Search className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-sm text-text placeholder:text-slate-500 outline-none dark:text-white dark:placeholder:text-slate-500"
                            />
                        </div>

                        <button onClick={onRefresh} disabled={loading} className="rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/5" title="Refresh">
                            <RefreshCw className={`h-4 w-4 text-slate-500 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {canReadActionableAlerts && (
                            <div ref={notifRef} className="relative">
                                <button
                                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                                    className="relative rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                                >
                                    <Bell className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                                    {unreadCount > 0 && (
                                        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                {notifOpen && (
                                    <div className="animate-in slide-in-from-top-2 absolute right-0 top-12 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-indigo-500/20 dark:bg-slate-900/95">
                                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-indigo-500/10">
                                            <h3 className="text-sm font-bold text-text dark:text-white">Notifications</h3>
                                            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-500 dark:text-indigo-300">{unreadCount} new</span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                                                    No admin alerts right now.
                                                </div>
                                            ) : notifications.map(n => (
                                                <button
                                                    key={n._id}
                                                    onClick={() => void openNotification(n._id, n.linkUrl)}
                                                    className={`block w-full border-b border-slate-200 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-100/70 dark:border-indigo-500/10 dark:hover:bg-white/5 ${!n.isRead ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
                                                >
                                                    <p className="text-sm text-text dark:text-white">{n.title}</p>
                                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                                                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{new Date(n.publishAt).toLocaleString()}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-1.5 dark:border-indigo-500/15 dark:bg-white/5 lg:flex">
                            <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-indigo-300/60" />
                            <span className="text-xs text-slate-600 dark:text-indigo-300/70">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>

                        <div ref={profileRef} className="relative">
                            <button
                                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                                className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-md">
                                    {user?.fullName?.charAt(0) || 'A'}
                                </div>
                                <ChevronDown className={`hidden h-3.5 w-3.5 text-slate-500 transition-transform dark:text-slate-300 sm:block ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {profileOpen && (
                                <div className="animate-in slide-in-from-top-2 absolute right-0 top-12 w-[min(14rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-indigo-500/20 dark:bg-slate-900/95">
                                    <div className="border-b border-slate-200 px-4 py-3 dark:border-indigo-500/10">
                                        <p className="truncate text-sm font-bold text-text dark:text-white">{user?.fullName || user?.username}</p>
                                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                                        <span className="mt-1 inline-block rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] capitalize text-indigo-500 dark:text-indigo-300">{user?.role}</span>
                                    </div>
                                    <div className="p-1.5">
                                        {[
                                            { icon: User, label: 'Profile', action: () => { navigateByTab('admin-profile'); setProfileOpen(false); } },
                                            { icon: Lock, label: 'Change Password', action: () => { navigateByTab('password'); setProfileOpen(false); } },
                                            { icon: Settings, label: 'Settings', action: () => { navigateByTab('settings'); setProfileOpen(false); } },
                                        ].map(item => (
                                            <button
                                                key={item.label}
                                                onClick={item.action}
                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                                            >
                                                <item.icon className="h-4 w-4 text-slate-500" />
                                                {item.label}
                                            </button>
                                        ))}
                                        <div className="mt-1 border-t border-slate-200 pt-1 dark:border-indigo-500/10">
                                            <button
                                                onClick={onLogout}
                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden flex-wrap items-center gap-2 border-t border-slate-200 pt-2 dark:border-indigo-500/10 md:flex">
                    {quickNavLinks.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-indigo-500/20 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    );
}
