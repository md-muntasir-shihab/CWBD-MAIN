/**
 * ProvidersPanel — manage SMS and Email providers
 * (credentials are stored server-side only, never returned to frontend)
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listProviders,
    createProvider,
    updateProvider,
    toggleProvider,
    deleteProvider,
    type NotificationProvider,
} from '../../../api/adminNotificationCampaignApi';
import { promptForSensitiveActionProof } from '../../../utils/sensitiveAction';

interface Props {
    showToast: (m: string, t?: 'success' | 'error') => void;
}

const PROVIDER_OPTIONS_SMS = ['local_bd_rest', 'twilio', 'custom'];
const PROVIDER_OPTIONS_EMAIL = ['smtp', 'sendgrid', 'custom'];

const EMPTY_FORM = {
    type: 'sms' as 'sms' | 'email',
    provider: 'local_bd_rest',
    displayName: '',
    isEnabled: true,
    senderConfig: { fromName: '', fromEmail: '', smsSenderId: '' },
    rateLimit: { perMinute: 30, perDay: 1000 },
    credentials: {} as Record<string, string>,
    // SMS credentials
    apiEndpoint: '',
    apiKey: '',
    // Email credentials
    host: '',
    port: '587',
    username: '',
    password: '',
};

const fieldCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';

export default function ProvidersPanel({ showToast }: Props) {
    const qc = useQueryClient();
    const { data: providers = [], isLoading } = useQuery({ queryKey: ['providers'], queryFn: listProviders });
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editing, setEditing] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const saveMut = useMutation({
        mutationFn: (v: { id?: string; data: Record<string, unknown>; proof: Awaited<ReturnType<typeof promptForSensitiveActionProof>> }) =>
            v.id ? updateProvider(v.id, v.data, v.proof || undefined) : createProvider(v.data, v.proof || undefined),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['providers'] });
            showToast('Provider saved');
            resetForm();
        },
        onError: () => showToast('Save failed', 'error'),
    });

    const toggleMut = useMutation({
        mutationFn: async (id: string) => {
            const proof = await promptForSensitiveActionProof({
                actionLabel: 'toggle notification provider',
                defaultReason: `Toggle provider ${id}`,
                requireOtpHint: true,
            });
            if (!proof) throw new Error('Sensitive action cancelled');
            return toggleProvider(id, proof);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
        onError: (error: any) => showToast(error?.message === 'Sensitive action cancelled' ? 'Provider toggle cancelled' : 'Toggle failed', 'error'),
    });

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const proof = await promptForSensitiveActionProof({
                actionLabel: 'delete notification provider',
                defaultReason: `Delete provider ${id}`,
                requireOtpHint: true,
            });
            if (!proof) throw new Error('Sensitive action cancelled');
            return deleteProvider(id, proof);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); showToast('Provider deleted'); setDeleteConfirm(null); },
        onError: (error: any) => showToast(error?.message === 'Sensitive action cancelled' ? 'Provider delete cancelled' : 'Delete failed', 'error'),
    });

    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setCreating(false);
    }

    function startEdit(p: NotificationProvider) {
        setForm({
            ...EMPTY_FORM,
            type: p.type,
            provider: p.provider,
            displayName: p.displayName,
            isEnabled: p.isEnabled,
            senderConfig: { ...EMPTY_FORM.senderConfig, ...p.senderConfig },
            rateLimit: { ...EMPTY_FORM.rateLimit, ...p.rateLimit },
        });
        setEditing(p._id);
        setCreating(false);
    }

    async function handleSave() {
        const credentials: Record<string, string> = form.type === 'sms'
            ? { apiEndpoint: form.apiEndpoint, apiKey: form.apiKey }
            : { host: form.host, port: form.port, username: form.username, password: form.password };

        const payload = {
            type: form.type,
            provider: form.provider,
            displayName: form.displayName,
            isEnabled: form.isEnabled,
            senderConfig: form.senderConfig,
            rateLimit: form.rateLimit,
            ...(Object.values(credentials).some(Boolean) ? { credentials } : {}),
        };
        const proof = await promptForSensitiveActionProof({
            actionLabel: editing ? 'update notification provider' : 'create notification provider',
            defaultReason: editing ? `Update provider ${editing}` : 'Create notification provider',
            requireOtpHint: true,
        });
        if (!proof) return;
        saveMut.mutate({ id: editing ?? undefined, data: payload, proof });
    }

    const smsProviders = providers.filter(p => p.type === 'sms');
    const emailProviders = providers.filter(p => p.type === 'email');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Provider Configuration</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Credentials are encrypted server-side and never exposed to the browser.</p>
                </div>
                {!creating && !editing && (
                    <button onClick={() => { resetForm(); setCreating(true); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                        + Add Provider
                    </button>
                )}
            </div>

            {/* Form */}
            {(creating || editing) && (
                <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-4">
                    <h4 className="font-semibold text-slate-800 dark:text-white">{editing ? 'Edit Provider' : 'New Provider'}</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className={labelCls}>Type</label>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'sms' | 'email', provider: e.target.value === 'sms' ? 'local_bd_rest' : 'smtp' }))} className={fieldCls} disabled={!!editing} title="Provider Type">
                                <option value="sms">SMS</option>
                                <option value="email">Email</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Provider</label>
                            <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className={fieldCls} disabled={!!editing} title="Provider Name">
                                {(form.type === 'sms' ? PROVIDER_OPTIONS_SMS : PROVIDER_OPTIONS_EMAIL).map(o => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Display Name</label>
                            <input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} className={fieldCls} placeholder="e.g. Primary SMS Gateway" />
                        </div>
                    </div>

                    {/* SMS Credentials */}
                    {form.type === 'sms' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>API Endpoint / Base URL</label>
                                <input value={form.apiEndpoint} onChange={e => setForm(p => ({ ...p, apiEndpoint: e.target.value }))} className={fieldCls} placeholder="https://api.provider.com/sms" />
                            </div>
                            <div>
                                <label className={labelCls}>API Key / Token</label>
                                <input type="password" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} className={fieldCls} placeholder={editing ? '(leave blank to keep current)' : 'API Key'} />
                            </div>
                            <div>
                                <label className={labelCls}>Sender ID / From Number</label>
                                <input value={form.senderConfig.smsSenderId} onChange={e => setForm(p => ({ ...p, senderConfig: { ...p.senderConfig, smsSenderId: e.target.value } }))} className={fieldCls} placeholder="+8801XXXXXXXXX or CAMPUSWAY" />
                            </div>
                        </div>
                    )}

                    {/* Email Credentials */}
                    {form.type === 'email' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>SMTP Host</label>
                                <input value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))} className={fieldCls} placeholder="smtp.gmail.com" />
                            </div>
                            <div>
                                <label className={labelCls}>Port</label>
                                <input value={form.port} onChange={e => setForm(p => ({ ...p, port: e.target.value }))} className={fieldCls} placeholder="587" />
                            </div>
                            <div>
                                <label className={labelCls}>Username / Email</label>
                                <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className={fieldCls} title="Username or Email" placeholder="Username or Email" />
                            </div>
                            <div>
                                <label className={labelCls}>Password / API Key</label>
                                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={fieldCls} placeholder={editing ? '(leave blank to keep current)' : 'Password'} />
                            </div>
                            <div>
                                <label className={labelCls}>From Name</label>
                                <input value={form.senderConfig.fromName} onChange={e => setForm(p => ({ ...p, senderConfig: { ...p.senderConfig, fromName: e.target.value } }))} className={fieldCls} placeholder="CampusWay" />
                            </div>
                            <div>
                                <label className={labelCls}>From Email</label>
                                <input value={form.senderConfig.fromEmail} onChange={e => setForm(p => ({ ...p, senderConfig: { ...p.senderConfig, fromEmail: e.target.value } }))} className={fieldCls} placeholder="no-reply@campusway.app" />
                            </div>
                        </div>
                    )}

                    {/* Rate limits */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Rate Limit / Minute</label>
                            <input type="number" value={form.rateLimit.perMinute} onChange={e => setForm(p => ({ ...p, rateLimit: { ...p.rateLimit, perMinute: Number(e.target.value) } }))} className={fieldCls} title="Rate Limit Per Minute" placeholder="Rate Limit Per Minute" />
                        </div>
                        <div>
                            <label className={labelCls}>Rate Limit / Day</label>
                            <input type="number" value={form.rateLimit.perDay} onChange={e => setForm(p => ({ ...p, rateLimit: { ...p.rateLimit, perDay: Number(e.target.value) } }))} className={fieldCls} title="Rate Limit Per Day" placeholder="Rate Limit Per Day" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button onClick={resetForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400">Cancel</button>
                        <button onClick={handleSave} disabled={!form.displayName || saveMut.isPending} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                            {saveMut.isPending ? 'Saving...' : 'Save Provider'}
                        </button>
                    </div>
                </div>
            )}

            {/* Provider Cards */}
            {isLoading ? (
                <div className="py-10 text-center text-slate-400">Loading...</div>
            ) : (
                <>
                    {[{ label: 'SMS Providers', list: smsProviders }, { label: 'Email Providers', list: emailProviders }].map(({ label, list }) => (
                        <div key={label}>
                            <h4 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</h4>
                            {list.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">No {label} configured yet.</div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {list.map(p => (
                                        <div key={p._id} className={`rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 border-l-4 ${p.isEnabled ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-white">{p.displayName}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{p.provider}</p>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.isEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                                    {p.isEnabled ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                                                {p.senderConfig?.fromEmail && <p>From: {p.senderConfig.fromEmail}</p>}
                                                {p.senderConfig?.smsSenderId && <p>Sender ID: {p.senderConfig.smsSenderId}</p>}
                                                <p>Limit: {p.rateLimit?.perDay}/day · {p.rateLimit?.perMinute}/min</p>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => toggleMut.mutate(p._id)} className="text-xs text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                                                    {p.isEnabled ? 'Disable' : 'Enable'}
                                                </button>
                                                <span className="text-slate-200 dark:text-slate-700">|</span>
                                                <button onClick={() => startEdit(p)} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">Edit</button>
                                                <span className="text-slate-200 dark:text-slate-700">|</span>
                                                <button onClick={() => setDeleteConfirm(p._id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">Delete Provider?</h4>
                        <p className="mt-2 text-sm text-slate-500">This action is irreversible. Any campaigns using this provider will fail until another is configured.</p>
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 dark:text-slate-400">Cancel</button>
                            <button onClick={() => deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending} className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                                {deleteMut.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
