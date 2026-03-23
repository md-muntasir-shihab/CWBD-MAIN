import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, RefreshCw, Search, Trash2 } from 'lucide-react';
import AdminGuideButton, { type AdminGuideButtonProps } from './AdminGuideButton';
import {
    adminDeleteContactMessage,
    adminGetContactMessages,
    adminUpdateContactMessage,
} from '../../services/api';

type Msg = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    isRead?: boolean;
    isReplied?: boolean;
    createdAt?: string;
};

type FilterMode = 'all' | 'unread' | 'replied';
type InlineGuide = Omit<AdminGuideButtonProps, 'variant' | 'tone'>;

const CONTACT_GUIDES: Record<'refresh' | 'markRead' | 'markReplied' | 'delete', InlineGuide> = {
    refresh: { title: 'Refresh Contact Messages', content: 'Reload the latest contact submissions from the backend.', affected: 'Current admin review only.' },
    markRead: { title: 'Mark Read / Unread', content: 'Toggle whether this contact message remains unread for admins.', affected: 'Admin unread state and review priority.' },
    markReplied: { title: 'Mark Replied / Unreplied', content: 'Toggle whether this contact message is considered replied.', affected: 'Admin workflow tracking for contact follow-up.' },
    delete: { title: 'Delete Contact Message', content: 'Delete this stored contact submission after confirmation.', affected: 'The selected contact message record.' },
};

export default function ContactPanel() {
    const [searchParams] = useSearchParams();
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const focusedId = searchParams.get('focus') || '';

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const response = await adminGetContactMessages({});
            setMessages(response.data.messages || []);
        } catch {
            toast.error('Failed to load contact messages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchMessages();
    }, []);

    useEffect(() => {
        if (!focusedId) return;
        const target = messages.find((message) => message._id === focusedId);
        if (!target || target.isRead) return;
        void adminUpdateContactMessage(focusedId, { isRead: true })
            .then(() => setMessages((prev) => prev.map((item) => item._id === focusedId ? { ...item, isRead: true } : item)))
            .catch(() => undefined);
    }, [focusedId, messages]);

    const visibleMessages = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return messages.filter((item) => {
            if (filter === 'unread' && item.isRead) return false;
            if (filter === 'replied' && !item.isReplied) return false;
            if (!needle) return true;
            return `${item.name} ${item.email} ${item.subject} ${item.message} ${item.phone || ''}`.toLowerCase().includes(needle);
        });
    }, [filter, messages, query]);

    const patchMessage = async (id: string, data: { isRead?: boolean; isReplied?: boolean }) => {
        try {
            const response = await adminUpdateContactMessage(id, data);
            const next = response.data.item as Msg;
            setMessages((prev) => prev.map((item) => item._id === id ? { ...item, ...next } : item));
            toast.success('Message updated');
        } catch {
            toast.error('Update failed');
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm('Delete this message?')) return;
        try {
            await adminDeleteContactMessage(id);
            setMessages((prev) => prev.filter((item) => item._id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">Contact Messages</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Review public contact submissions and track their response state.
                        </p>
                    </div>
                    <button
                        onClick={() => void fetchMessages()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <AdminGuideButton {...CONTACT_GUIDES.refresh} tone="indigo" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {(['all', 'unread', 'replied'] as FilterMode[]).map((item) => (
                        <button
                            key={item}
                            onClick={() => setFilter(item)}
                            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                                filter === item
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            {item[0].toUpperCase() + item.slice(1)}
                        </button>
                    ))}
                    <div className="ml-auto flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80 dark:border-slate-700 dark:bg-slate-800">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search name, email, subject"
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            ) : visibleMessages.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                    <Mail className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No contact messages found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleMessages.map((message) => {
                        const isFocused = focusedId === message._id;
                        return (
                            <div
                                key={message._id}
                                className={`rounded-2xl border p-5 transition ${
                                    isFocused
                                        ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-500/50 dark:bg-indigo-500/10'
                                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-base font-bold">{message.subject || 'No Subject'}</h4>
                                            {!message.isRead && (
                                                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
                                            )}
                                            {message.isReplied && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                                                    Replied
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                            {message.name} • {message.email}
                                        </p>
                                        {message.phone && (
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message.phone}</p>
                                        )}
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{message.message}</p>
                                    </div>
                                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                                        <p>{message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Unknown date'}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => void patchMessage(message._id, { isRead: !message.isRead })}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                        >
                                            {message.isRead ? 'Mark unread' : 'Mark read'}
                                        </button>
                                        <AdminGuideButton {...CONTACT_GUIDES.markRead} tone="indigo" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => void patchMessage(message._id, { isReplied: !message.isReplied, isRead: true })}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                        >
                                            {message.isReplied ? 'Mark unreplied' : 'Mark replied'}
                                        </button>
                                        <AdminGuideButton {...CONTACT_GUIDES.markReplied} tone="indigo" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => void onDelete(message._id)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                        <AdminGuideButton {...CONTACT_GUIDES.delete} tone="indigo" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
