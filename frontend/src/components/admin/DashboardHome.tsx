import { useMemo, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BookOpen,
    Clock3,
    CreditCard,
    GraduationCap,
    HelpCircle,
    Home,
    RefreshCw,
    Server,
    ShieldCheck,
    UserSquare2,
    Users,
} from 'lucide-react';
import { adminGetDashboardSummary, type AdminDashboardSummary } from '../../services/api';

interface DashboardHomeProps {
    universities: any[];
    exams: any[];
    users: any[];
    onTabChange: (tab: string) => void;
}

type SummaryCard = {
    key: string;
    title: string;
    description: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    actionLabel: string;
    actionTab: string;
};

function valueText(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardHome({ universities, exams, users, onTabChange }: DashboardHomeProps) {
    const summaryQuery = useQuery({
        queryKey: ['admin-dashboard-summary'],
        queryFn: async () => (await adminGetDashboardSummary()).data as AdminDashboardSummary,
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    });

    const fallbackSummary: AdminDashboardSummary = {
        universities: {
            total: universities.length,
            active: universities.length,
            featured: universities.filter((item) => Boolean((item as { featured?: boolean }).featured)).length,
        },
        home: {
            highlightedCategories: 0,
            featuredUniversities: 0,
            enabledSections: 0,
        },
        news: {
            pendingReview: 0,
            publishedToday: 0,
        },
        exams: {
            upcoming: exams.filter((exam) => String((exam as { status?: string }).status || '').toLowerCase() === 'scheduled').length,
            live: exams.filter((exam) => String((exam as { status?: string }).status || '').toLowerCase() === 'live').length,
        },
        questionBank: {
            totalQuestions: 0,
        },
        students: {
            totalActive: users.filter((user) => String((user as { role?: string }).role || '') === 'student').length,
            pendingPayment: 0,
            suspended: 0,
        },
        payments: {
            pendingApprovals: 0,
            paidToday: 0,
        },
        supportCenter: {
            unreadMessages: 0,
        },
        systemStatus: {
            db: 'down',
            timeUTC: new Date().toISOString(),
        },
    };

    const summary = summaryQuery.data || fallbackSummary;

    const cards = useMemo<SummaryCard[]>(() => {
        return [
            {
                key: 'universities',
                title: 'Universities',
                description: `${valueText(summary.universities.active)} active, ${valueText(summary.universities.featured)} featured`,
                value: valueText(summary.universities.total),
                icon: GraduationCap,
                actionLabel: 'Open Universities',
                actionTab: 'universities',
            },
            {
                key: 'home',
                title: 'Home Highlights',
                description: `${valueText(summary.home.highlightedCategories)} highlighted categories`,
                value: valueText(summary.home.featuredUniversities),
                icon: Home,
                actionLabel: 'Open Home Control',
                actionTab: 'home-control',
            },
            {
                key: 'news',
                title: 'News',
                description: `${valueText(summary.news.pendingReview)} pending review`,
                value: valueText(summary.news.publishedToday),
                icon: BookOpen,
                actionLabel: 'Open News',
                actionTab: 'news',
            },
            {
                key: 'exams',
                title: 'Exams',
                description: `${valueText(summary.exams.upcoming)} upcoming`,
                value: valueText(summary.exams.live),
                icon: Clock3,
                actionLabel: 'Open Exams',
                actionTab: 'exams',
            },
            {
                key: 'question-bank',
                title: 'Question Bank',
                description: 'Total questions',
                value: valueText(summary.questionBank.totalQuestions),
                icon: UserSquare2,
                actionLabel: 'Open Question Bank',
                actionTab: 'question-bank',
            },
            {
                key: 'students',
                title: 'Students',
                description: `${valueText(summary.students.pendingPayment)} pending payment, ${valueText(summary.students.suspended)} suspended`,
                value: valueText(summary.students.totalActive),
                icon: Users,
                actionLabel: 'Open Student Management',
                actionTab: 'student-management',
            },
            {
                key: 'payments',
                title: 'Payments',
                description: `${valueText(summary.payments.pendingApprovals)} pending approvals`,
                value: valueText(summary.payments.paidToday),
                icon: CreditCard,
                actionLabel: 'Open Finance',
                actionTab: 'finance',
            },
            {
                key: 'support',
                title: 'Support Center',
                description: 'Unread/in-progress tickets',
                value: valueText(summary.supportCenter.unreadMessages),
                icon: HelpCircle,
                actionLabel: 'Open Support',
                actionTab: 'support-tickets',
            },
            {
                key: 'system',
                title: 'System Status',
                description: summary.systemStatus.db === 'connected' ? 'Database connected' : 'Database unavailable',
                value: summary.systemStatus.db === 'connected' ? 'OK' : 'DOWN',
                icon: Server,
                actionLabel: 'Open Security Center',
                actionTab: 'security',
            },
        ];
    }, [summary]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Summary</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Live snapshot of core modules with quick navigation links.</p>
                </div>
                <button
                    type="button"
                    onClick={() => summaryQuery.refetch()}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${summaryQuery.isFetching ? 'animate-spin' : ''}`} />
                    Refresh Summary
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-indigo-500/15 dark:bg-slate-900/60">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.title}</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                            </div>
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200">
                                <card.icon className="h-5 w-5" />
                            </span>
                        </div>
                        <p className="mt-2 min-h-[2.2rem] text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
                        <button
                            type="button"
                            onClick={() => onTabChange(card.actionTab)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:text-indigo-200"
                        >
                            {card.actionLabel}
                        </button>
                    </article>
                ))}
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100">
                <p className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> System check</p>
                <p className="mt-1">
                    DB: <span className="font-semibold">{summary.systemStatus.db}</span> - Last check: {new Date(summary.systemStatus.timeUTC).toLocaleString()}
                </p>
            </div>
        </div>
    );
}

