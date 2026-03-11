import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStudentSupportTicket, getStudentNotices, getStudentSupportTickets, trackAnalyticsEvent } from '../../services/api';

export default function StudentSupport() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

    const noticesQuery = useQuery({
        queryKey: ['student-hub', 'support', 'notices'],
        queryFn: async () => (await getStudentNotices()).data,
    });
    const ticketsQuery = useQuery({
        queryKey: ['student-hub', 'support', 'tickets'],
        queryFn: async () => (await getStudentSupportTickets()).data,
    });

    const createTicketMutation = useMutation({
        mutationFn: async () => (await createStudentSupportTicket({ subject, message, priority })).data,
        onSuccess: async (response) => {
            void trackAnalyticsEvent({
                eventName: 'support_ticket_created',
                module: 'support',
                source: 'student',
                meta: { priority, subjectLength: subject.trim().length },
            }).catch(() => undefined);
            setSubject('');
            setMessage('');
            setPriority('medium');
            await queryClient.invalidateQueries({ queryKey: ['student-hub', 'support', 'tickets'] });
            navigate(`/support/${response.item._id}`);
        },
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!subject.trim() || !message.trim()) return;
        createTicketMutation.mutate();
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h1 className="text-2xl font-bold">Support & Help</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Read announcements and create support tickets.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h2 className="text-lg font-bold">Notices</h2>
                    <div className="mt-3 space-y-3 max-h-[26rem] overflow-y-auto pr-1">
                        {noticesQuery.isLoading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))
                        ) : (noticesQuery.data?.items || []).length === 0 ? (
                            <p className="text-sm text-slate-500">No notices available.</p>
                        ) : (
                            (noticesQuery.data?.items || []).map((item) => (
                                <div key={item._id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                    <h2 className="text-lg font-bold">Create ticket</h2>
                    <form onSubmit={submit} className="space-y-3">
                        <input
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            placeholder="Subject"
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Write your issue"
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <select
                            value={priority}
                            onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                        <button
                            type="submit"
                            disabled={createTicketMutation.isPending}
                            className="rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {createTicketMutation.isPending ? 'Submitting...' : 'Submit ticket'}
                        </button>
                    </form>

                    <div>
                        <h3 className="font-semibold text-sm">My tickets</h3>
                        <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
                            {(ticketsQuery.data?.items || []).length === 0 ? (
                                <p className="text-xs text-slate-500">No support tickets yet.</p>
                            ) : (
                                (ticketsQuery.data?.items || []).map((item) => (
                                    <Link
                                        to={`/support/${item._id}`}
                                        key={item._id}
                                        className="block rounded-lg border border-slate-200 p-2.5 transition hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
                                    >
                                        <p className="text-sm font-semibold">{item.subject}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.status}  -  {new Date(item.createdAt).toLocaleDateString()}</p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}


