import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Download, GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminGuardShell from '../components/admin/AdminGuardShell';
import {
    adminExportSubscriptionPlans,
    adminExportSubscriptions,
    type AdminSubscriptionPlan,
} from '../services/api';
import { downloadFile } from '../utils/download';
import {
    useAdminSubscriptionPlans,
    useAssignSubscriptionMutation,
    useCreateSubscriptionPlanMutation,
    useDeleteSubscriptionPlanMutation,
    useReorderSubscriptionPlansMutation,
    useSuspendSubscriptionMutation,
    useToggleSubscriptionPlanMutation,
    useUpdateSubscriptionPlanMutation,
} from '../hooks/useSubscriptionPlans';

type PlanFormState = {
    name: string;
    code: string;
    type: 'free' | 'paid';
    priceBDT: number;
    durationDays: number;
    shortDescription: string;
    bannerImageUrl: string;
    featuresText: string;
    tagsText: string;
    enabled: boolean;
    isFeatured: boolean;
    contactCtaLabel: string;
    contactCtaUrl: string;
};

const EMPTY_FORM: PlanFormState = {
    name: '',
    code: '',
    type: 'paid',
    priceBDT: 0,
    durationDays: 30,
    shortDescription: '',
    bannerImageUrl: '',
    featuresText: '',
    tagsText: '',
    enabled: true,
    isFeatured: false,
    contactCtaLabel: 'Contact to Subscribe',
    contactCtaUrl: '/contact',
};

function toFeaturesList(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function fromPlan(plan: AdminSubscriptionPlan): PlanFormState {
    return {
        name: plan.name || '',
        code: plan.code || '',
        type: plan.type || (Number(plan.priceBDT ?? plan.price ?? 0) <= 0 ? 'free' : 'paid'),
        priceBDT: Number(plan.priceBDT ?? plan.price ?? 0),
        durationDays: Number(plan.durationDays ?? plan.durationValue ?? 30),
        shortDescription: plan.shortDescription || plan.description || '',
        bannerImageUrl: plan.bannerImageUrl || '',
        featuresText: [...(plan.features || []), ...(plan.includedModules || [])].filter(Boolean).join('\n'),
        tagsText: (plan.tags || []).join(', '),
        enabled: plan.enabled ?? plan.isActive ?? true,
        isFeatured: Boolean(plan.isFeatured),
        contactCtaLabel: plan.contactCtaLabel || 'Contact to Subscribe',
        contactCtaUrl: plan.contactCtaUrl || '/contact',
    };
}

export default function AdminSubscriptionPlansPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams<{ id?: string }>();
    const plansQuery = useAdminSubscriptionPlans();

    const createMutation = useCreateSubscriptionPlanMutation();
    const updateMutation = useUpdateSubscriptionPlanMutation();
    const deleteMutation = useDeleteSubscriptionPlanMutation();
    const toggleMutation = useToggleSubscriptionPlanMutation();
    const reorderMutation = useReorderSubscriptionPlansMutation();
    const assignMutation = useAssignSubscriptionMutation();
    const suspendMutation = useSuspendSubscriptionMutation();

    const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
    const [formOpen, setFormOpen] = useState(false);
    const [draggingId, setDraggingId] = useState<string>('');
    const [orderDraft, setOrderDraft] = useState<string[]>([]);
    const [assignPayload, setAssignPayload] = useState({
        userId: '',
        planId: '',
        status: 'active' as 'active' | 'expired' | 'pending' | 'suspended',
        startAtUTC: '',
        expiresAtUTC: '',
        notes: '',
    });
    const [suspendPayload, setSuspendPayload] = useState({ userId: '', notes: '' });

    const isCreateRoute = location.pathname.endsWith('/new');
    const editingId = params.id || '';
    const plans = plansQuery.data || [];
    const planMap = useMemo(() => new Map(plans.map((plan) => [plan._id, plan])), [plans]);
    const orderedPlans = useMemo(() => {
        const lookup = new Map(plans.map((item) => [item._id, item]));
        if (orderDraft.length > 0) {
            return orderDraft.map((id) => lookup.get(id)).filter((item): item is AdminSubscriptionPlan => Boolean(item));
        }
        return plans;
    }, [orderDraft, plans]);

    useEffect(() => {
        if (plans.length === 0) return;
        setOrderDraft((prev) => (prev.length === plans.length ? prev : plans.map((item) => item._id)));
    }, [plans]);

    useEffect(() => {
        if (isCreateRoute) {
            setForm(EMPTY_FORM);
            setFormOpen(true);
            return;
        }
        if (!editingId) return;
        const found = planMap.get(editingId);
        if (found) {
            setForm(fromPlan(found));
            setFormOpen(true);
        }
    }, [editingId, isCreateRoute, planMap]);

    const saving = createMutation.isPending || updateMutation.isPending;

    const handleSubmitForm = async (event: FormEvent) => {
        event.preventDefault();
        const features = toFeaturesList(form.featuresText);
        const tags = form.tagsText.split(',').map((item) => item.trim()).filter(Boolean);
        const payload: Partial<AdminSubscriptionPlan> = {
            name: form.name.trim(),
            code: form.code.trim(),
            type: form.type,
            priceBDT: form.type === 'free' ? 0 : Number(form.priceBDT || 0),
            durationDays: Number(form.durationDays || 30),
            shortDescription: form.shortDescription.trim(),
            bannerImageUrl: form.bannerImageUrl.trim() || null,
            features,
            includedModules: features,
            tags,
            enabled: form.enabled,
            isActive: form.enabled,
            isFeatured: form.isFeatured,
            contactCtaLabel: form.contactCtaLabel.trim() || 'Contact to Subscribe',
            contactCtaUrl: form.contactCtaUrl.trim() || '/contact',
        };

        try {
            if (editingId && !isCreateRoute) {
                await updateMutation.mutateAsync({ id: editingId, payload });
                toast.success('Plan updated');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('Plan created');
            }
            setForm(EMPTY_FORM);
            setFormOpen(false);
            if (location.pathname !== '/__cw_admin__/subscription-plans') {
                navigate('/__cw_admin__/subscription-plans', { replace: true });
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to save plan');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this plan?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Plan deleted');
            if (editingId === id) navigate('/__cw_admin__/subscription-plans', { replace: true });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Delete failed');
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
            toast.success('Plan status updated');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Status update failed');
        }
    };

    const handleReorderSave = async () => {
        try {
            await reorderMutation.mutateAsync(orderDraft);
            toast.success('Plan order updated');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Reorder failed');
        }
    };

    const onDropPlan = (targetId: string) => {
        if (!draggingId || draggingId === targetId) return;
        setOrderDraft((prev) => {
            const sourceIndex = prev.indexOf(draggingId);
            const targetIndex = prev.indexOf(targetId);
            if (sourceIndex < 0 || targetIndex < 0) return prev;
            const next = [...prev];
            const [item] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, item);
            return next;
        });
        setDraggingId('');
    };

    const exportPlans = async (format: 'csv' | 'xlsx') => {
        try {
            const response = await adminExportSubscriptionPlans(format);
            downloadFile(response, { filename: `subscription_plans.${format}` });
            toast.success(`Exported ${format.toUpperCase()}`);
        } catch {
            toast.error('Export failed');
        }
    };

    const exportSubscriptions = async (format: 'csv' | 'xlsx') => {
        try {
            const response = await adminExportSubscriptions(format);
            downloadFile(response, { filename: `subscriptions.${format}` });
            toast.success(`Exported ${format.toUpperCase()}`);
        } catch {
            toast.error('Export failed');
        }
    };

    const handleAssign = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await assignMutation.mutateAsync(assignPayload);
            toast.success('Subscription assigned');
            setAssignPayload({ userId: '', planId: '', status: 'active', startAtUTC: '', expiresAtUTC: '', notes: '' });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Assignment failed');
        }
    };

    const handleSuspend = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await suspendMutation.mutateAsync(suspendPayload);
            toast.success('Subscription suspended');
            setSuspendPayload({ userId: '', notes: '' });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Suspend failed');
        }
    };

    return (
        <AdminGuardShell
            title="Subscription Plans"
            description="Manage plan cards, ordering, assignment, and subscription exports."
            allowedRoles={['superadmin', 'admin', 'moderator']}
        >
            <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                    <Link to="/__cw_admin__/subscription-plans/new" className="btn-primary text-sm">
                        <Plus className="h-4 w-4" />
                        New Plan
                    </Link>
                    <button type="button" className="btn-outline text-sm" onClick={() => exportPlans('xlsx')}>
                        <Download className="h-4 w-4" />
                        Plans XLSX
                    </button>
                    <button type="button" className="btn-outline text-sm" onClick={() => exportPlans('csv')}>
                        <Download className="h-4 w-4" />
                        Plans CSV
                    </button>
                    <button type="button" className="btn-outline text-sm" onClick={() => exportSubscriptions('xlsx')}>
                        <Download className="h-4 w-4" />
                        Subscriptions XLSX
                    </button>
                    <button type="button" className="btn-outline text-sm" onClick={() => exportSubscriptions('csv')}>
                        <Download className="h-4 w-4" />
                        Subscriptions CSV
                    </button>
                </div>

                {formOpen ? (
                    <form onSubmit={handleSubmitForm} className="rounded-2xl border border-card-border/70 bg-card/80 p-5 dark:border-dark-border/70 dark:bg-dark-surface/70">
                        <h2 className="text-lg font-semibold text-text dark:text-dark-text">{editingId && !isCreateRoute ? 'Edit Plan' : 'Create Plan'}</h2>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Plan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Plan code (e.g. premium-30)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                            <select className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'free' | 'paid' })}>
                                <option value="free">Free</option>
                                <option value="paid">Paid</option>
                            </select>
                            <input type="number" min={0} className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Price (BDT)" value={form.priceBDT} onChange={(e) => setForm({ ...form, priceBDT: Number(e.target.value || 0) })} />
                            <input type="number" min={1} className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Duration days" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value || 1) })} />
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Banner image URL" value={form.bannerImageUrl} onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })} />
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900 md:col-span-2" placeholder="Short description" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
                            <textarea className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900 md:col-span-2" rows={4} placeholder="Features (one per line)" value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Tags (comma separated)" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="CTA Label" value={form.contactCtaLabel} onChange={(e) => setForm({ ...form, contactCtaLabel: e.target.value })} />
                            <input className="rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900 md:col-span-2" placeholder="CTA URL" value={form.contactCtaUrl} onChange={(e) => setForm({ ...form, contactCtaUrl: e.target.value })} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                                Enabled
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                                Featured on lists
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button type="submit" disabled={saving} className="btn-primary text-sm">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Plan
                            </button>
                            <button
                                type="button"
                                className="btn-outline text-sm"
                                onClick={() => {
                                    setFormOpen(false);
                                    setForm(EMPTY_FORM);
                                    if (location.pathname !== '/__cw_admin__/subscription-plans') {
                                        navigate('/__cw_admin__/subscription-plans', { replace: true });
                                    }
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : null}

                <div className="rounded-2xl border border-card-border/70 bg-card/80 p-4 dark:border-dark-border/70 dark:bg-dark-surface/70">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-text dark:text-dark-text">Plan List (drag to reorder)</h3>
                        <button type="button" onClick={handleReorderSave} disabled={reorderMutation.isPending} className="btn-outline text-sm">
                            {reorderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Order
                        </button>
                    </div>
                    <div className="space-y-2">
                        {plansQuery.isLoading ? (
                            <p className="text-sm text-text-muted dark:text-dark-text/70">Loading plans...</p>
                        ) : orderedPlans.length === 0 ? (
                            <p className="text-sm text-text-muted dark:text-dark-text/70">No plans found.</p>
                        ) : orderedPlans.map((plan, index) => (
                            <div
                                key={plan._id}
                                draggable
                                onDragStart={() => setDraggingId(plan._id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => onDropPlan(plan._id)}
                                className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900"
                            >
                                <GripVertical className="h-4 w-4 text-text-muted dark:text-dark-text/70" />
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">#{index + 1}</span>
                                <span className="min-w-0 max-w-full flex-1 truncate font-medium text-text dark:text-dark-text sm:max-w-[320px] sm:flex-none">{plan.name}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${plan.type === 'free' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-indigo-500/15 text-indigo-500'}`}>
                                    {plan.type === 'free' ? 'Free' : `৳${Number(plan.priceBDT ?? plan.price ?? 0)}`}
                                </span>
                                <span className="text-xs text-text-muted dark:text-dark-text/70">{plan.durationDays} days</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${plan.enabled ?? plan.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                                    {(plan.enabled ?? plan.isActive) ? 'Enabled' : 'Disabled'}
                                </span>
                                <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                                    <button type="button" className="btn-outline text-xs" onClick={() => navigate(`/__cw_admin__/subscription-plans/${plan._id}/edit`)}>Edit</button>
                                    <button type="button" className="btn-outline text-xs" onClick={() => handleToggle(plan._id)}>Toggle</button>
                                    <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-500" onClick={() => handleDelete(plan._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <form onSubmit={handleAssign} className="rounded-2xl border border-card-border/70 bg-card/80 p-4 dark:border-dark-border/70 dark:bg-dark-surface/70">
                        <h3 className="text-sm font-semibold text-text dark:text-dark-text">Assign Subscription to User</h3>
                        <div className="mt-3 space-y-2">
                            <input className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="User ID" value={assignPayload.userId} onChange={(e) => setAssignPayload({ ...assignPayload, userId: e.target.value })} required />
                            <select className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" value={assignPayload.planId} onChange={(e) => setAssignPayload({ ...assignPayload, planId: e.target.value })} required>
                                <option value="">Select plan</option>
                                {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}
                            </select>
                            <select className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" value={assignPayload.status} onChange={(e) => setAssignPayload({ ...assignPayload, status: e.target.value as any })}>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="expired">Expired</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <input type="datetime-local" className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" value={assignPayload.startAtUTC} onChange={(e) => setAssignPayload({ ...assignPayload, startAtUTC: e.target.value })} />
                            <input type="datetime-local" className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" value={assignPayload.expiresAtUTC} onChange={(e) => setAssignPayload({ ...assignPayload, expiresAtUTC: e.target.value })} />
                            <input className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Notes" value={assignPayload.notes} onChange={(e) => setAssignPayload({ ...assignPayload, notes: e.target.value })} />
                        </div>
                        <button type="submit" className="btn-primary mt-3 text-sm" disabled={assignMutation.isPending}>
                            {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Assign
                        </button>
                    </form>

                    <form onSubmit={handleSuspend} className="rounded-2xl border border-card-border/70 bg-card/80 p-4 dark:border-dark-border/70 dark:bg-dark-surface/70">
                        <h3 className="text-sm font-semibold text-text dark:text-dark-text">Suspend Subscription</h3>
                        <div className="mt-3 space-y-2">
                            <input className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="User ID" value={suspendPayload.userId} onChange={(e) => setSuspendPayload({ ...suspendPayload, userId: e.target.value })} required />
                            <input className="w-full rounded-xl border border-card-border/70 bg-surface px-3 py-2 text-sm dark:border-dark-border/70 dark:bg-slate-900" placeholder="Reason / Notes" value={suspendPayload.notes} onChange={(e) => setSuspendPayload({ ...suspendPayload, notes: e.target.value })} />
                        </div>
                        <button type="submit" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-500" disabled={suspendMutation.isPending}>
                            {suspendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Suspend
                        </button>
                    </form>
                </div>
            </div>
        </AdminGuardShell>
    );
}
