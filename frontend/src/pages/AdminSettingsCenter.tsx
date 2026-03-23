import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    BellRing,
    BarChart3,
    BookOpen,
    GripVertical,
    Home,
    Image,
    ScrollText,
    Settings,
    Shield,
    SlidersHorizontal,
    User,
} from 'lucide-react';
import AdminGuardShell from '../components/admin/AdminGuardShell';
import { useAuth } from '../hooks/useAuth';
import { ADMIN_MENU_ITEMS } from '../routes/adminPaths';
import { adminGetAdminUiLayout, adminUpdateAdminUiLayout, type AdminUiLayoutSettings } from '../services/api';


const settingsCards = [
    { key: 'settings-home', title: 'Home Control', description: 'Manage home sections, visibility, timeline, and live sync.', icon: Home, to: '/__cw_admin__/settings/home-control' },
    { key: 'settings-university', title: 'University Settings', description: 'Category order, cluster filters, featured slugs, and display defaults.', icon: SlidersHorizontal, to: '/__cw_admin__/settings/university-settings' },
    { key: 'settings-reports', title: 'Reports', description: 'View KPI reports, exam insights, and exports.', icon: BarChart3, to: '/__cw_admin__/reports' },
    { key: 'settings-notifications', title: 'Notifications', description: 'Set automation triggers and reminder timing.', icon: BellRing, to: '/__cw_admin__/settings/notifications' },
    { key: 'settings-analytics', title: 'Analytics', description: 'Toggle event tracking and analytics privacy controls.', icon: BarChart3, to: '/__cw_admin__/settings/analytics' },
    { key: 'settings-banners', title: 'Banner Manager', description: 'Control banner settings, campaign blocks, and News fallback media.', icon: Image, to: '/__cw_admin__/settings/banner-manager' },
    { key: 'settings-news', title: 'News Settings', description: 'Configure news appearance, AI, share templates, and workflow controls.', icon: Settings, to: '/__cw_admin__/settings/news' },
    { key: 'settings-resources', title: 'Resource Settings', description: 'Configure the resources page title, featured section, and view tracking.', icon: BookOpen, to: '/__cw_admin__/settings/resource-settings' },
    { key: 'settings-security', title: 'Security Center', description: 'Authentication, session, and security policy controls.', icon: Shield, to: '/__cw_admin__/settings/security-center' },
    { key: 'settings-logs', title: 'System Logs', description: 'Review audit and system-level logs from one place.', icon: ScrollText, to: '/__cw_admin__/settings/system-logs' },
    { key: 'settings-site', title: 'Site Settings', description: 'Global branding, contact, social links, and metadata controls.', icon: Settings, to: '/__cw_admin__/settings/site-settings' },
    { key: 'settings-profile', title: 'Admin Profile', description: 'Update admin profile and account preferences.', icon: User, to: '/__cw_admin__/settings/admin-profile' },
];

const DEFAULT_SETTINGS_CARD_ORDER = settingsCards.map((card) => card.key);
const DEFAULT_SIDEBAR_ORDER = ADMIN_MENU_ITEMS.map((item) => item.key);

function mergeOrder(defaultKeys: string[], savedKeys: string[]): string[] {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const key of savedKeys) {
        if (!defaultKeys.includes(key) || seen.has(key)) continue;
        seen.add(key);
        next.push(key);
    }
    for (const key of defaultKeys) {
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(key);
    }
    return next;
}

function moveKey(order: string[], draggedKey: string, targetKey: string): string[] {
    if (!draggedKey || !targetKey || draggedKey === targetKey) return order;
    const from = order.indexOf(draggedKey);
    const to = order.indexOf(targetKey);
    if (from < 0 || to < 0) return order;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, draggedKey);
    return next;
}

function normalizeLayout(layout?: Partial<AdminUiLayoutSettings> | null): AdminUiLayoutSettings {
    return {
        sidebarOrder: mergeOrder(DEFAULT_SIDEBAR_ORDER, Array.isArray(layout?.sidebarOrder) ? layout?.sidebarOrder || [] : []),
        settingsCardOrder: mergeOrder(DEFAULT_SETTINGS_CARD_ORDER, Array.isArray(layout?.settingsCardOrder) ? layout?.settingsCardOrder || [] : []),
    };
}

export default function AdminSettingsCenterPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const canManageLayout = ['superadmin', 'admin'].includes(String(user?.role || '').toLowerCase());
    const [settingsCardOrder, setSettingsCardOrder] = useState<string[]>(DEFAULT_SETTINGS_CARD_ORDER);
    const [sidebarOrder, setSidebarOrder] = useState<string[]>(DEFAULT_SIDEBAR_ORDER);
    const [draggingSettingsCard, setDraggingSettingsCard] = useState<string | null>(null);
    const [draggingSidebarItem, setDraggingSidebarItem] = useState<string | null>(null);

    const layoutQuery = useQuery({
        queryKey: ['admin', 'ui-layout'],
        queryFn: async () => (await adminGetAdminUiLayout()).data,
    });

    useEffect(() => {
        const normalized = normalizeLayout(layoutQuery.data?.layout);
        setSettingsCardOrder(normalized.settingsCardOrder);
        setSidebarOrder(normalized.sidebarOrder);
    }, [layoutQuery.data?.layout]);

    const updateLayoutMutation = useMutation({
        mutationFn: async (layout: Partial<AdminUiLayoutSettings>) => (await adminUpdateAdminUiLayout(layout)).data,
        onSuccess: () => {
            toast.success('Admin layout order saved');
            queryClient.invalidateQueries({ queryKey: ['admin', 'ui-layout'] });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to save admin layout order');
        },
    });

    const orderedSettingsCards = useMemo(() => {
        const map = new Map(settingsCards.map((card) => [card.key, card]));
        return settingsCardOrder
            .map((key) => map.get(key))
            .filter(Boolean) as typeof settingsCards;
    }, [settingsCardOrder]);

    const orderedSidebarItems = useMemo(() => {
        const map = new Map(ADMIN_MENU_ITEMS.map((item) => [item.key, item]));
        return sidebarOrder
            .map((key) => map.get(key))
            .filter((item): item is (typeof ADMIN_MENU_ITEMS)[number] => Boolean(item))
            .map((item) => ({ key: item.key, label: item.label }));
    }, [sidebarOrder]);

    function saveLayoutOrder() {
        if (!canManageLayout) return;
        updateLayoutMutation.mutate({
            settingsCardOrder,
            sidebarOrder,
        });
    }

    function resetLayoutOrder() {
        setSettingsCardOrder(DEFAULT_SETTINGS_CARD_ORDER);
        setSidebarOrder(DEFAULT_SIDEBAR_ORDER);
    }

    return (
        <AdminGuardShell
            title="Settings Center"
            description="All admin settings are categorized here for faster control and live sync."
        >
            <div className="space-y-5">
                <div className="card-flat border border-cyan-500/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Layout Order Control</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Reorder settings cards and main admin sidebar groups. Changes apply across admin pages.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-outline" onClick={resetLayoutOrder} disabled={!canManageLayout}>
                                Reset order
                            </button>
                            <button type="button" className="btn-primary" onClick={saveLayoutOrder} disabled={!canManageLayout || updateLayoutMutation.isPending}>
                                {updateLayoutMutation.isPending ? 'Saving...' : 'Save order'}
                            </button>
                        </div>
                    </div>
                    {!canManageLayout ? (
                        <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
                            Read-only for your role. Only superadmin/admin can save order changes.
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <section className="card-flat border border-cyan-500/20 p-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Settings cards order</h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag cards to reorder the Settings Center tiles.</p>
                        <div className="mt-3 space-y-2">
                            {orderedSettingsCards.map((card) => (
                                <div
                                    key={card.key}
                                    draggable={canManageLayout}
                                    onDragStart={() => setDraggingSettingsCard(card.key)}
                                    onDragOver={(event) => {
                                        if (!canManageLayout) return;
                                        event.preventDefault();
                                    }}
                                    onDrop={() => {
                                        if (!canManageLayout || !draggingSettingsCard) return;
                                        setSettingsCardOrder((prev) => moveKey(prev, draggingSettingsCard, card.key));
                                        setDraggingSettingsCard(null);
                                    }}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-800/70 dark:bg-slate-900/45"
                                >
                                    <GripVertical className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-800 dark:text-slate-200">{card.title}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card-flat border border-cyan-500/20 p-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Admin sidebar group order</h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Optional: reorder major sidebar groups shown in admin shell.</p>
                        <div className="mt-3 space-y-2">
                            {orderedSidebarItems.map((item) => (
                                <div
                                    key={item.key}
                                    draggable={canManageLayout}
                                    onDragStart={() => setDraggingSidebarItem(item.key)}
                                    onDragOver={(event) => {
                                        if (!canManageLayout) return;
                                        event.preventDefault();
                                    }}
                                    onDrop={() => {
                                        if (!canManageLayout || !draggingSidebarItem) return;
                                        setSidebarOrder((prev) => moveKey(prev, draggingSidebarItem, item.key));
                                        setDraggingSidebarItem(null);
                                    }}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-800/70 dark:bg-slate-900/45"
                                >
                                    <GripVertical className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-800 dark:text-slate-200">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {orderedSettingsCards.map((card) => (
                        <Link key={card.key} to={card.to} className="card-flat p-5 transition-colors hover:border-primary/50">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <card.icon className="w-5 h-5" />
                                </span>
                                <h2 className="text-lg font-semibold cw-text">{card.title}</h2>
                            </div>
                            <p className="mt-3 text-sm cw-muted">{card.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </AdminGuardShell>
    );
}
