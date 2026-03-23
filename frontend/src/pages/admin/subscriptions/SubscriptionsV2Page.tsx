import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Filter, RefreshCw, Search, Users } from 'lucide-react';
import api from '../../../services/api';

interface SubRow {
    _id: string;
    userId?: { _id: string; full_name?: string; email?: string; phone_number?: string; status?: string } | null;
    planId?: { _id: string; name?: string; code?: string; priceBDT?: number } | null;
    status: string;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
    createdAt?: string;
}

interface SubsResponse {
    data: SubRow[];
    total: number;
    page: number;
    limit: number;
}

const STATUS_OPTS = ['', 'active', 'expired', 'pending', 'cancelled'] as const;

export default function SubscriptionsV2Page() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const query = useQuery<SubsResponse>({
        queryKey: ['admin-subscriptions-v2', page, status, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '20');
            if (status) params.set('status', status);
            if (search) params.set('q', search);
            const { data } = await api.get(`/admin/subscriptions-v2?${params}`);
            return data;
        },
    });

    const subs = query.data?.data ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    const statusBadge = (s: string) => {
        const map: Record<string, string> = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
        return map[s] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-text dark:text-dark-text flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-500" />
                        Subscriptions
                    </h2>
                    <p className="text-sm text-text-muted mt-1">{total} total subscriptions</p>
                </div>
                <button type="button" onClick={() => query.refetch()} className="btn-secondary" disabled={query.isFetching}>
                    <RefreshCw className={`mr-1.5 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                        aria-label="Search subscriptions"
                        title="Search subscriptions"
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                        placeholder="Search by name, email, phone..."
                        className="admin-input pl-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-text-muted" />
                    <select
                        aria-label="Filter by status"
                        title="Filter by status"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="admin-input w-auto"
                    >
                        <option value="">All Status</option>
                        {STATUS_OPTS.filter(Boolean).map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-border dark:border-dark-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                            <th className="px-4 py-3 font-medium text-text-muted">Student</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Plan</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Start</th>
                            <th className="px-4 py-3 font-medium text-text-muted">End</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Auto-Renew</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-dark-border">
                        {query.isLoading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading subscriptions...</td></tr>
                        ) : subs.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                                <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                                No subscriptions found.
                            </td></tr>
                        ) : subs.map((sub) => (
                            <tr key={sub._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-text dark:text-dark-text">{sub.userId?.full_name || '—'}</p>
                                    <p className="text-xs text-text-muted">{sub.userId?.email || sub.userId?._id || '—'}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-text dark:text-dark-text">{sub.planId?.name || '—'}</p>
                                    {sub.planId?.priceBDT ? (
                                        <p className="text-xs text-text-muted">৳{sub.planId.priceBDT}</p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(sub.status)}`}>
                                        {sub.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-text-muted text-xs">
                                    {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-4 py-3 text-text-muted text-xs">
                                    {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-4 py-3 text-text-muted text-xs">
                                    {sub.autoRenew ? '✓' : '✗'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-muted">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm" title="Previous page">
                            Previous
                        </button>
                        <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary text-sm" title="Next page">
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
