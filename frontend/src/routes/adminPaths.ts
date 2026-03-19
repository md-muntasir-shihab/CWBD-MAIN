import { adminUi, ADMIN_DASHBOARD } from '../lib/appRoutes';
import type { ComponentType } from 'react';
import {
    LayoutDashboard, Globe, Home, Image, Megaphone, Settings,
    GraduationCap, SlidersHorizontal, Newspaper, AlertCircle,
    FolderOpen, ScrollText, BookOpen,
    Users, UserCog, ClipboardList, Bell,
    CreditCard, Wallet, LifeBuoy, Mail, Shield, BarChart3,
    User, Rss, Layers, Archive, Sparkles, Copy, Upload,
    Send, FileText, History, Database,
    UserPlus, Import, Target, MessageSquare, TrendingDown,
    FlaskConical,
    KeyRound,
    Zap,
} from 'lucide-react';

export type AdminMenuIcon = ComponentType<{ className?: string }>;
export type AdminAllowedRole =
    | 'superadmin'
    | 'admin'
    | 'moderator'
    | 'editor'
    | 'viewer'
    | 'support_agent'
    | 'finance_agent';
export type AdminLegacyPermission =
    | 'canEditExams'
    | 'canManageStudents'
    | 'canViewReports'
    | 'canDeleteData'
    | 'canManageFinance'
    | 'canManagePlans';

export const ADMIN_PATHS = {
    dashboard: ADMIN_DASHBOARD,
    homeControl: adminUi('settings/home-control'),
    universitySettings: adminUi('settings/university-settings'),
    siteSettings: adminUi('settings/site-settings'),
    bannerManager: adminUi('settings/banner-manager'),
    campaignBanners: adminUi('campaign-banners'),
    universities: adminUi('universities'),
    news: adminUi('news'),
    exams: adminUi('exams'),
    questionBank: adminUi('question-bank'),
    questionBankNew: adminUi('question-bank/new'),
    questionBankEdit: adminUi('question-bank/edit'),
    questionBankImport: adminUi('question-bank/import'),
    questionBankExport: adminUi('question-bank/export'),
    questionBankSets: adminUi('question-bank/sets'),
    questionBankAnalytics: adminUi('question-bank/analytics'),
    questionBankArchive: adminUi('question-bank/archive'),
    questionBankSettings: adminUi('question-bank/settings'),
    students: adminUi('students'),
    studentGroups: adminUi('student-groups'),
    studentsV2: adminUi('students-v2'),
    studentGroupsV2: adminUi('student-groups-v2'),
    notificationCenter: adminUi('notification-center'),
    studentSettings: adminUi('settings/student-settings'),
    // Student Management OS console routes
    studentMgmt: adminUi('student-management'),
    studentMgmtList: adminUi('student-management/list'),
    studentMgmtCreate: adminUi('student-management/create'),
    studentMgmtImportExport: adminUi('student-management/import-export'),
    studentMgmtGroups: adminUi('student-management/groups'),
    studentMgmtGroupDetail: adminUi('student-management/groups'),  // /:id suffix added by router
    studentMgmtAudiences: adminUi('student-management/audiences'),
    studentMgmtCrmTimeline: adminUi('student-management/crm-timeline'),
    studentMgmtWeakTopics: adminUi('student-management/weak-topics'),
    studentMgmtProfileRequests: adminUi('student-management/profile-requests'),
    studentMgmtSettings: adminUi('student-management/settings'),
    studentMgmtDetail: adminUi('student-management/students'),  // /:id suffix added by router
    subscriptionsV2: adminUi('subscriptions-v2'),
    subscriptionPlans: adminUi('subscription-plans'),
    payments: adminUi('payments'),
    financeCenter: adminUi('finance'),
    financeDashboard: adminUi('finance/dashboard'),
    financeTransactions: adminUi('finance/transactions'),
    financeInvoices: adminUi('finance/invoices'),
    financeBudgets: adminUi('finance/budgets'),
    financeRecurring: adminUi('finance/recurring'),
    financeExpenses: adminUi('finance/expenses'),
    financeVendors: adminUi('finance/vendors'),
    financeRefunds: adminUi('finance/refunds'),
    financeImport: adminUi('finance/import'),
    financeExport: adminUi('finance/export'),
    financeAuditLog: adminUi('finance/audit-log'),
    financeSettings: adminUi('finance/settings'),
    resources: adminUi('resources'),
    resourceSettings: adminUi('settings/resource-settings'),
    supportCenter: adminUi('support-center'),
    contact: adminUi('contact'),
    notifications: adminUi('settings/notifications'),
    reports: adminUi('reports'),
    securityCenter: adminUi('settings/security-center'),
    systemLogs: adminUi('settings/system-logs'),
    adminProfile: adminUi('settings/admin-profile'),
    settingsCenter: adminUi('settings'),
    newsSettings: adminUi('settings/news-settings'),
    // Notification Test Send
    notificationTestSend: adminUi('notifications/test-send'),
    // Notification Triggers
    notificationTriggers: adminUi('notifications/triggers'),
    // Notification Campaign Platform
    campaignsDashboard: adminUi('campaigns'),
    campaignsList: adminUi('campaigns/list'),
    campaignsNew: adminUi('campaigns/new'),
    campaignsTemplates: adminUi('campaigns/templates'),
    campaignsSettings: adminUi('campaigns/settings'),
    campaignsLogs: adminUi('campaigns/logs'),
    // Data Hub
    dataHub: adminUi('data-hub'),
    dataHubHistory: adminUi('data-hub/history'),
    teamMembers: adminUi('team/members'),
    teamMemberDetail: adminUi('team/members'),
    teamRoles: adminUi('team/roles'),
    teamRoleDetail: adminUi('team/roles'),
    teamPermissions: adminUi('team/permissions'),
    teamApprovalRules: adminUi('team/approval-rules'),
    teamActivity: adminUi('team/activity'),
    teamSecurity: adminUi('team/security'),
    teamInvites: adminUi('team/invites'),
} as const;

export type AdminMenuItem = {
    key: string;
    label: string;
    path: string;
    icon?: AdminMenuIcon;
    module?: string;
    allowedRoles?: AdminAllowedRole[];
    requiredLegacyPermission?: AdminLegacyPermission;
    matchPrefixes?: string[];
    children?: { key: string; label: string; path: string; icon?: AdminMenuIcon }[];
};

// ─── 13-GROUP ADMIN MENU ─────────────────────────────────────────────────────
export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
    // 1. Dashboard
    { key: 'dashboard', label: 'Dashboard', path: ADMIN_PATHS.dashboard, icon: LayoutDashboard, module: 'dashboard' },

    // 2. Website Control
    {
        key: 'websiteControl',
        label: 'Website Control',
        path: ADMIN_PATHS.homeControl,
        icon: Globe,
        module: 'home_control',
        matchPrefixes: [
            adminUi('settings/home-control'),
            adminUi('settings/banner-manager'),
            adminUi('campaign-banners'),
            adminUi('settings/site-settings'),
        ],
        children: [
            { key: 'wc-home', label: 'Home Settings', path: ADMIN_PATHS.homeControl, icon: Home },
            { key: 'wc-banners', label: 'Banner Management', path: ADMIN_PATHS.bannerManager, icon: Image },
            { key: 'wc-campaign', label: 'Campaign Banners', path: ADMIN_PATHS.campaignBanners, icon: Megaphone },
            { key: 'wc-site', label: 'Site Settings', path: ADMIN_PATHS.siteSettings, icon: Settings },
        ],
    },

    // 3. Universities
    {
        key: 'universities',
        label: 'Universities',
        path: ADMIN_PATHS.universities,
        icon: GraduationCap,
        module: 'universities',
        matchPrefixes: [adminUi('universities'), adminUi('settings/university-settings')],
        children: [
            { key: 'uni-list', label: 'All Universities', path: ADMIN_PATHS.universities, icon: GraduationCap },
            { key: 'uni-settings', label: 'University Settings', path: ADMIN_PATHS.universitySettings, icon: SlidersHorizontal },
        ],
    },

    // 4. News Management
    {
        key: 'news',
        label: 'News Management',
        path: adminUi('news/dashboard'),
        icon: Newspaper,
        module: 'news',
        matchPrefixes: [adminUi('news'), adminUi('settings/news-settings')],
        children: [
            { key: 'news-dash', label: 'Dashboard', path: adminUi('news/dashboard'), icon: LayoutDashboard },
            { key: 'news-pending', label: 'Pending Review', path: adminUi('news/pending'), icon: AlertCircle },
            { key: 'news-duplicates', label: 'Duplicate Queue', path: adminUi('news/duplicates'), icon: Copy },
            { key: 'news-drafts', label: 'Drafts', path: adminUi('news/drafts'), icon: FolderOpen },
            { key: 'news-published', label: 'Published', path: adminUi('news/published'), icon: ScrollText },
            { key: 'news-scheduled', label: 'Scheduled', path: adminUi('news/scheduled'), icon: ScrollText },
            { key: 'news-rejected', label: 'Rejected', path: adminUi('news/rejected'), icon: ScrollText },
            { key: 'news-ai', label: 'AI Selected', path: adminUi('news/ai-selected'), icon: Sparkles },
            { key: 'news-rss', label: 'RSS Sources', path: adminUi('news/sources'), icon: Rss },
            { key: 'news-settings', label: 'News Settings', path: ADMIN_PATHS.newsSettings, icon: Settings },
        ],
    },

    // 5. Exams
    {
        key: 'exams',
        label: 'Exams',
        path: ADMIN_PATHS.exams,
        icon: BookOpen,
        module: 'exams',
        allowedRoles: ['superadmin', 'admin', 'moderator', 'editor'],
        matchPrefixes: [adminUi('exams')],
    },

    // 6. Question Bank
    {
        key: 'questionBank',
        label: 'Question Bank',
        path: ADMIN_PATHS.questionBank,
        icon: BookOpen,
        module: 'question_bank',
        matchPrefixes: [adminUi('question-bank')],
        children: [
            { key: 'qb-all', label: 'All Questions', path: ADMIN_PATHS.questionBank, icon: BookOpen },
            { key: 'qb-new', label: 'Add Question', path: ADMIN_PATHS.questionBankNew, icon: BookOpen },
            { key: 'qb-import', label: 'Import Questions', path: ADMIN_PATHS.questionBankImport, icon: Upload },
            { key: 'qb-sets', label: 'Question Sets', path: ADMIN_PATHS.questionBankSets, icon: Layers },
            { key: 'qb-analytics', label: 'Analytics', path: ADMIN_PATHS.questionBankAnalytics, icon: BarChart3 },
            { key: 'qb-archive', label: 'Archive', path: ADMIN_PATHS.questionBankArchive, icon: Archive },
            { key: 'qb-settings', label: 'QB Settings', path: ADMIN_PATHS.questionBankSettings, icon: Settings },
        ],
    },

    // 7. Student Management
    {
        key: 'students',
        label: 'Student Management',
        path: ADMIN_PATHS.studentMgmtList,
        icon: Users,
        module: 'students_groups',
        matchPrefixes: [
            adminUi('student-management'),
            adminUi('students'),
            adminUi('student-groups'),
            adminUi('students-v2'),
            adminUi('student-groups-v2'),
            adminUi('notification-center'),
            adminUi('settings/student-settings'),
        ],
        children: [
            { key: 'stu-list', label: 'All Students', path: ADMIN_PATHS.studentMgmtList, icon: UserCog },
            { key: 'stu-create', label: 'Create Student', path: ADMIN_PATHS.studentMgmtCreate, icon: UserPlus },
            { key: 'stu-import', label: 'Import / Export', path: ADMIN_PATHS.studentMgmtImportExport, icon: Import },
            { key: 'stu-groups', label: 'Groups', path: ADMIN_PATHS.studentMgmtGroups, icon: ClipboardList },
            { key: 'stu-audiences', label: 'Audiences', path: ADMIN_PATHS.studentMgmtAudiences, icon: Target },
            { key: 'stu-crm', label: 'CRM Timeline', path: ADMIN_PATHS.studentMgmtCrmTimeline, icon: MessageSquare },
            { key: 'stu-weak', label: 'Weak Topics', path: ADMIN_PATHS.studentMgmtWeakTopics, icon: TrendingDown },
            { key: 'stu-profile-requests', label: 'Profile Requests', path: ADMIN_PATHS.studentMgmtProfileRequests, icon: ClipboardList },
            { key: 'stu-notif', label: 'Actionable Alerts', path: ADMIN_PATHS.notificationCenter, icon: Bell },
            { key: 'stu-settings', label: 'Settings', path: ADMIN_PATHS.studentMgmtSettings, icon: Settings },
        ],
    },

    // 8. Subscription & Payments
    {
        key: 'subscriptions',
        label: 'Subscription & Payments',
        path: ADMIN_PATHS.subscriptionPlans,
        icon: CreditCard,
        module: 'subscription_plans',
        allowedRoles: ['superadmin', 'admin', 'moderator'],
        requiredLegacyPermission: 'canManagePlans',
        matchPrefixes: [adminUi('subscription-plans'), adminUi('subscriptions-v2')],
        children: [
            { key: 'sub-plans', label: 'Subscription Plans', path: ADMIN_PATHS.subscriptionPlans, icon: CreditCard },
            { key: 'sub-v2', label: 'Subscriptions', path: ADMIN_PATHS.subscriptionsV2, icon: CreditCard },
        ],
    },

    // 9. Resources
    {
        key: 'resources',
        label: 'Resources',
        path: ADMIN_PATHS.resources,
        icon: FolderOpen,
        module: 'resources',
        matchPrefixes: [adminUi('resources'), adminUi('settings/resource-settings')],
        children: [
            { key: 'res-list', label: 'All Resources', path: ADMIN_PATHS.resources, icon: FolderOpen },
            { key: 'res-settings', label: 'Resource Settings', path: ADMIN_PATHS.resourceSettings, icon: Settings },
        ],
    },

    // 10. Support & Communication
    {
        key: 'support',
        label: 'Support & Communication',
        path: ADMIN_PATHS.supportCenter,
        icon: LifeBuoy,
        module: 'support_center',
        matchPrefixes: [adminUi('support-center'), adminUi('contact'), adminUi('settings/notifications')],
        children: [
            { key: 'sup-center', label: 'Support Center', path: ADMIN_PATHS.supportCenter, icon: LifeBuoy },
            { key: 'sup-contact', label: 'Contact Messages', path: ADMIN_PATHS.contact, icon: Mail },
            { key: 'sup-notif', label: 'Notification Settings', path: ADMIN_PATHS.notifications, icon: Bell },
        ],
    },

    // 10b. Campaign Platform
    {
        key: 'campaigns',
        label: 'Campaign Platform',
        path: ADMIN_PATHS.campaignsDashboard,
        icon: Send,
        module: 'notifications',
        matchPrefixes: [adminUi('campaigns'), adminUi('notifications/test-send'), adminUi('notifications/triggers')],
        children: [
            { key: 'cmp-dash', label: 'Dashboard', path: ADMIN_PATHS.campaignsDashboard, icon: LayoutDashboard },
            { key: 'cmp-list', label: 'All Campaigns', path: ADMIN_PATHS.campaignsList, icon: ScrollText },
            { key: 'cmp-new', label: 'New Campaign', path: ADMIN_PATHS.campaignsNew, icon: Send },
            { key: 'cmp-templates', label: 'Templates', path: ADMIN_PATHS.campaignsTemplates, icon: FileText },
            { key: 'cmp-test-send', label: 'Test Send', path: ADMIN_PATHS.notificationTestSend, icon: FlaskConical },
            { key: 'cmp-triggers', label: 'Auto Triggers', path: ADMIN_PATHS.notificationTriggers, icon: Zap },
            { key: 'cmp-logs', label: 'Delivery Logs', path: ADMIN_PATHS.campaignsLogs, icon: ScrollText },
            { key: 'cmp-settings', label: 'Settings', path: ADMIN_PATHS.campaignsSettings, icon: Settings },
        ],
    },

    // 10c. Data Hub
    {
        key: 'dataHub',
        label: 'Data Hub',
        path: ADMIN_PATHS.dataHub,
        icon: Database,
        module: 'reports_analytics',
        matchPrefixes: [adminUi('data-hub')],
        children: [
            { key: 'dh-export', label: 'Export Center', path: ADMIN_PATHS.dataHub, icon: Upload },
            { key: 'dh-history', label: 'History', path: ADMIN_PATHS.dataHubHistory, icon: History },
        ],
    },

    // 11. Finance Center
    {
        key: 'financeCenter',
        label: 'Finance Center',
        path: ADMIN_PATHS.financeDashboard,
        icon: Wallet,
        module: 'finance_center',
        allowedRoles: ['superadmin', 'admin', 'moderator', 'finance_agent'],
        requiredLegacyPermission: 'canManageFinance',
        matchPrefixes: [adminUi('finance'), adminUi('payments')],
        children: [
            { key: 'fc-dashboard', label: 'Dashboard', path: ADMIN_PATHS.financeDashboard, icon: LayoutDashboard },
            { key: 'fc-transactions', label: 'Transactions', path: ADMIN_PATHS.financeTransactions, icon: ScrollText },
            { key: 'fc-expenses', label: 'Expenses', path: ADMIN_PATHS.financeExpenses, icon: Wallet },
            { key: 'fc-invoices', label: 'Invoices', path: ADMIN_PATHS.financeInvoices, icon: ScrollText },
            { key: 'fc-budgets', label: 'Budgets', path: ADMIN_PATHS.financeBudgets, icon: BarChart3 },
            { key: 'fc-recurring', label: 'Recurring', path: ADMIN_PATHS.financeRecurring, icon: ScrollText },
            { key: 'fc-vendors', label: 'Vendors', path: ADMIN_PATHS.financeVendors, icon: Users },
            { key: 'fc-refunds', label: 'Refunds', path: ADMIN_PATHS.financeRefunds, icon: Wallet },
            { key: 'fc-export', label: 'Export', path: ADMIN_PATHS.financeExport, icon: FolderOpen },
            { key: 'fc-import', label: 'Import', path: ADMIN_PATHS.financeImport, icon: Upload },
            { key: 'fc-audit', label: 'Audit Log', path: ADMIN_PATHS.financeAuditLog, icon: ScrollText },
            { key: 'fc-settings', label: 'Settings', path: ADMIN_PATHS.financeSettings, icon: Settings },
        ],
    },

    {
        key: 'teamAccessControl',
        label: 'Team & Access Control',
        path: ADMIN_PATHS.teamMembers,
        icon: KeyRound,
        module: 'team_access_control',
        matchPrefixes: [adminUi('team')],
        children: [
            { key: 'ta-members', label: 'Team Members', path: ADMIN_PATHS.teamMembers, icon: Users },
            { key: 'ta-roles', label: 'Roles', path: ADMIN_PATHS.teamRoles, icon: UserCog },
            { key: 'ta-permissions', label: 'Permissions Matrix', path: ADMIN_PATHS.teamPermissions, icon: SlidersHorizontal },
            { key: 'ta-approval', label: 'Approval Rules', path: ADMIN_PATHS.teamApprovalRules, icon: ClipboardList },
            { key: 'ta-activity', label: 'Activity / Audit Logs', path: ADMIN_PATHS.teamActivity, icon: ScrollText },
            { key: 'ta-security', label: 'Login & Security', path: ADMIN_PATHS.teamSecurity, icon: Shield },
            { key: 'ta-invites', label: 'Invite / Access Requests', path: ADMIN_PATHS.teamInvites, icon: UserPlus },
        ],
    },

    // 12. Security & Logs
    {
        key: 'security',
        label: 'Security & Logs',
        path: ADMIN_PATHS.securityCenter,
        icon: Shield,
        module: 'security_logs',
        matchPrefixes: [adminUi('settings/security-center'), adminUi('settings/system-logs'), adminUi('reports')],
        children: [
            { key: 'sec-center', label: 'Security Center', path: ADMIN_PATHS.securityCenter, icon: Shield },
            { key: 'sec-logs', label: 'System Logs', path: ADMIN_PATHS.systemLogs, icon: ScrollText },
            { key: 'sec-reports', label: 'Reports', path: ADMIN_PATHS.reports, icon: BarChart3 },
        ],
    },

    // 13. Admin Profile
    { key: 'adminProfile', label: 'Admin Profile', path: ADMIN_PATHS.adminProfile, icon: User, module: 'admin_profile' },
];

export function isAdminPathActive(pathname: string, item: AdminMenuItem): boolean {
    if (pathname === item.path) return true;
    const prefixes = item.matchPrefixes || [item.path];
    return prefixes.some((prefix) => prefix !== ADMIN_PATHS.dashboard && pathname.startsWith(`${prefix}/`));
}

export const LEGACY_ADMIN_PATH_REDIRECTS: Record<string, string> = {
    [adminUi('featured')]: ADMIN_PATHS.homeControl,
    [adminUi('live-monitor')]: ADMIN_PATHS.exams,
    [adminUi('alerts')]: ADMIN_PATHS.homeControl,
    [adminUi('file-upload')]: ADMIN_PATHS.students,
    [adminUi('backups')]: ADMIN_PATHS.systemLogs,
    [adminUi('users')]: ADMIN_PATHS.adminProfile,
    [adminUi('exports')]: ADMIN_PATHS.reports,
    [adminUi('payments')]: ADMIN_PATHS.financeTransactions,
    [adminUi('password')]: ADMIN_PATHS.adminProfile,
    [adminUi('security')]: ADMIN_PATHS.securityCenter,
    [adminUi('audit')]: ADMIN_PATHS.systemLogs,
};

export function routeFromDashboardActionTab(tabId: string): string {
    switch (tabId) {
        case 'universities':
            return ADMIN_PATHS.universities;
        case 'home-control':
            return ADMIN_PATHS.homeControl;
        case 'news':
            return adminUi('news/dashboard');
        case 'exams':
            return ADMIN_PATHS.exams;
        case 'question-bank':
            return ADMIN_PATHS.questionBank;
        case 'student-management':
            return ADMIN_PATHS.studentMgmtList;
        case 'finance':
            return ADMIN_PATHS.financeDashboard;
        case 'support-tickets':
            return ADMIN_PATHS.supportCenter;
        case 'security':
            return ADMIN_PATHS.securityCenter;
        default:
            return ADMIN_PATHS.dashboard;
    }
}