/**
 * SmartTriggersPanel — enable/disable auto-send triggers and configure channels.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTriggerSettings,
    updateTrigger,
    type TriggerToggle,
} from '../../../api/adminNotificationCampaignApi';

interface Props {
    showToast: (m: string, t?: 'success' | 'error') => void;
}

const TRIGGER_CATALOG: { key: string; label: string; group: string; description: string }[] = [
    // Content
    { key: 'news_published', label: 'News Published', group: 'Content', description: 'Fires when a news article is published.' },
    { key: 'notice_published', label: 'Notice Published', group: 'Content', description: 'Fires when a notice is published.' },
    { key: 'exam_published', label: 'Exam Published', group: 'Content', description: 'Fires when a new exam is made available.' },
    { key: 'result_published', label: 'Result Published', group: 'Content', description: 'Fires when exam results are released.' },
    // Subscription
    { key: 'subscription_activated', label: 'Subscription Activated', group: 'Subscription', description: 'A student activates a subscription plan.' },
    { key: 'subscription_expiring', label: 'Subscription Expiring Soon', group: 'Subscription', description: 'Subscription expiring within reminder window.' },
    { key: 'subscription_expired', label: 'Subscription Expired', group: 'Subscription', description: 'Subscription has expired.' },
    { key: 'payment_overdue', label: 'Payment Overdue', group: 'Subscription', description: 'Payment has not been received.' },
    { key: 'renewal_completed', label: 'Renewal Completed', group: 'Subscription', description: 'Student has renewed their subscription.' },
    // Student / Profile
    { key: 'profile_incomplete', label: 'Profile Incomplete', group: 'Student', description: 'Profile has been incomplete for X days.' },
    { key: 'profile_score_low', label: 'Profile Score Low', group: 'Student', description: 'Profile score falls below threshold.' },
    { key: 'profile_score_high', label: 'Profile Score High', group: 'Student', description: 'Profile score exceeds achievement threshold.' },
    { key: 'student_inactive', label: 'Student Inactive', group: 'Student', description: 'Student has not logged in for X days.' },
    // Exam / Result
    { key: 'exam_not_attempted', label: 'Exam Not Attempted', group: 'Exam', description: 'Exam deadline passed without attempt.' },
    { key: 'low_exam_score', label: 'Low Exam Score', group: 'Exam', description: 'Student scored below the passing threshold.' },
    // Support
    { key: 'support_ticket_created', label: 'Support Ticket Created', group: 'Support', description: 'A new support ticket is submitted.' },
    { key: 'support_reply_pending', label: 'Support Reply Pending', group: 'Support', description: 'Admin reply has been pending for X hours.' },
];

const GROUP_ORDER = ['Content', 'Subscription', 'Student', 'Exam', 'Support'];

export default function SmartTriggersPanel({ showToast }: Props) {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ['trigger-settings'], queryFn: getTriggerSettings });
    const [saving, setSaving] = useState<string | null>(null);

    const getToggle = (key: string): TriggerToggle =>
        data?.triggers?.find((t: TriggerToggle) => t.triggerKey === key) ?? {
            triggerKey: key, enabled: false, channels: ['sms'], guardianIncluded: false,
        };

    const updateMut = useMutation({
        mutationFn: ({ key, patch }: { key: string; patch: Partial<TriggerToggle> }) =>
            updateTrigger(key, { ...getToggle(key), ...patch }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['trigger-settings'] }); setSaving(null); },
        onError: () => { showToast('Update failed', 'error'); setSaving(null); },
    });

    function handleToggleEnabled(key: string) {
        const current = getToggle(key);
        setSaving(key);
        updateMut.mutate({ key, patch: { enabled: !current.enabled } });
    }

    function handleChannelChange(key: string, channel: 'sms' | 'email', checked: boolean) {
        const current = getToggle(key);
        const channels = checked
            ? [...new Set([...current.channels, channel])]
            : current.channels.filter(c => c !== channel);
        setSaving(key);
        updateMut.mutate({ key, patch: { channels: channels.length ? channels : ['sms'] } });
    }

    function handleGuardianChange(key: string, checked: boolean) {
        setSaving(key);
        updateMut.mutate({ key, patch: { guardianIncluded: checked } });
    }

    const groups = GROUP_ORDER.map(g => ({
        group: g,
        triggers: TRIGGER_CATALOG.filter(t => t.group === g),
    }));

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Smart Auto-Triggers</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enable triggers to automatically send SMS/Email when specific events occur. Changes take effect immediately.
                </p>
            </div>

            {isLoading ? (
                <div className="py-10 text-center text-slate-400">Loading triggers...</div>
            ) : (
                groups.map(({ group, triggers }) => (
                    <div key={group}>
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group}</h4>
                        <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900 overflow-hidden">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {triggers.map(t => {
                                    const toggle = getToggle(t.key);
                                    const isSaving = saving === t.key;
                                    return (
                                        <div key={t.key} className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 transition-all ${isSaving ? 'opacity-60' : ''}`}>
                                            {/* Toggle + info */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <button
                                                    aria-label={toggle.enabled ? 'Disable' : 'Enable'}
                                                    onClick={() => handleToggleEnabled(t.key)}
                                                    className={`relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${toggle.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${toggle.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.label}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.description}</p>
                                                </div>
                                            </div>

                                            {/* Channel toggles */}
                                            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={toggle.channels.includes('sms')}
                                                        onChange={e => handleChannelChange(t.key, 'sms', e.target.checked)}
                                                        className="rounded border-slate-300 text-indigo-600"
                                                    />
                                                    SMS
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={toggle.channels.includes('email')}
                                                        onChange={e => handleChannelChange(t.key, 'email', e.target.checked)}
                                                        className="rounded border-slate-300 text-indigo-600"
                                                    />
                                                    Email
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={toggle.guardianIncluded}
                                                        onChange={e => handleGuardianChange(t.key, e.target.checked)}
                                                        className="rounded border-slate-300 text-indigo-600"
                                                    />
                                                    Guardian
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
