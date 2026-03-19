import { AnimatePresence, motion } from 'framer-motion';
import { Check, Crown, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { SubscriptionPlanPublic } from '../../services/api';
import { getSubscriptionTheme } from './subscriptionTheme';

type Props = {
    open: boolean;
    plan: SubscriptionPlanPublic | null;
    onClose: () => void;
    onPrimaryAction: (plan: SubscriptionPlanPublic) => void;
};

function DetailBlock({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/75">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</h3>
            {children}
        </section>
    );
}

export default function PlanDetailsDrawer({
    open,
    plan,
    onClose,
    onPrimaryAction,
}: Props) {
    const theme = getSubscriptionTheme(plan?.themeKey);

    return (
        <AnimatePresence>
            {open && plan ? (
                <motion.div
                    className="fixed inset-0 z-[90] flex items-end justify-end bg-slate-950/55 backdrop-blur-[2px] md:items-stretch"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-slate-50 shadow-2xl dark:bg-slate-950 md:h-full md:max-w-[38rem] md:rounded-none"
                    >
                        <div className={`relative overflow-hidden bg-gradient-to-br ${theme.shell} px-6 pb-6 pt-6 text-white`}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/14 transition hover:bg-white/22"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <div className="pr-14">
                                <div className="flex flex-wrap items-center gap-2">
                                    {plan.badgeText ? (
                                        <span className="rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                            {plan.badgeText}
                                        </span>
                                    ) : null}
                                    {plan.isFeatured ? (
                                        <span className="rounded-full bg-slate-950/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                            Featured
                                        </span>
                                    ) : null}
                                </div>
                                <h2 className="mt-5 text-3xl font-black tracking-tight">{plan.name}</h2>
                                {plan.tagline ? <p className="mt-2 text-base text-white/84">{plan.tagline}</p> : null}
                                {plan.highlightText ? (
                                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white/92">
                                        <Sparkles className="h-4 w-4 text-amber-200" />
                                        {plan.highlightText}
                                    </p>
                                ) : null}
                            </div>

                            <div className="mt-6 rounded-[1.75rem] bg-white/14 p-4 backdrop-blur">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Price</p>
                                        <p className="mt-2 text-4xl font-black">
                                            {plan.isFree || plan.priceBDT <= 0
                                                ? 'Free'
                                                : `${plan.currency || 'BDT'} ${Number(plan.priceBDT || 0).toLocaleString()}`}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-950/18 px-3 py-2 text-xs font-semibold">
                                        {plan.billingCycle === 'one_time' ? 'One time' : plan.billingCycle}
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-white/64">Validity</p>
                                        <p className="mt-1 font-semibold">{plan.validityLabel || plan.durationLabel}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/64">Support</p>
                                        <p className="mt-1 font-semibold capitalize">{plan.supportLevel || 'basic'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                            <DetailBlock title="Overview">
                                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                                    {plan.fullDescription || plan.shortDescription || 'Full plan description will be managed from admin.'}
                                </p>
                                {plan.recommendedFor ? (
                                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        <span className="font-semibold text-slate-950 dark:text-white">Recommended for:</span> {plan.recommendedFor}
                                    </div>
                                ) : null}
                                {plan.comparisonNote ? (
                                    <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
                                        {plan.comparisonNote}
                                    </div>
                                ) : null}
                            </DetailBlock>

                            <DetailBlock title="Included Features">
                                <div className="space-y-2">
                                    {(plan.fullFeatures?.length ? plan.fullFeatures : plan.visibleFeatures || []).map((feature) => (
                                        <div key={`${plan.id}-${feature}`} className="flex items-start gap-3 rounded-2xl bg-slate-100 px-3.5 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                                                <Check className="h-3.5 w-3.5" />
                                            </span>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                    {!plan.fullFeatures?.length && !plan.visibleFeatures?.length ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No detailed features added yet.</p>
                                    ) : null}
                                </div>
                            </DetailBlock>

                            {plan.excludedFeatures?.length ? (
                                <DetailBlock title="Not Included">
                                    <div className="space-y-2">
                                        {plan.excludedFeatures.map((feature) => (
                                            <div key={`${plan.id}-excluded-${feature}`} className="rounded-2xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                                                {feature}
                                            </div>
                                        ))}
                                    </div>
                                </DetailBlock>
                            ) : null}

                            <DetailBlock title="Access & Privileges">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Access Scope</p>
                                        <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{plan.accessScope || 'Standard plan access'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Dashboard Privileges</p>
                                        <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {plan.dashboardPrivileges?.length ? plan.dashboardPrivileges.join(', ') : 'Included in your dashboard summary'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Notifications</p>
                                        <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {[
                                                plan.allowsSMSUpdates ? 'SMS' : null,
                                                plan.allowsEmailUpdates ? 'Email' : null,
                                                plan.allowsGuardianAlerts ? 'Guardian alerts' : null,
                                            ].filter(Boolean).join(', ') || 'No notification privileges'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Exam & Content</p>
                                        <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {plan.allowsExams ? 'Exam access enabled' : 'No exam access'}
                                            {plan.allowsPremiumResources ? ' • Premium resources included' : ' • Standard resources only'}
                                        </p>
                                    </div>
                                </div>
                            </DetailBlock>

                            {(plan.renewalNotes || plan.policyNote) ? (
                                <DetailBlock title="Renewal & Policy">
                                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                        {plan.renewalNotes ? (
                                            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
                                                <span className="font-semibold text-slate-950 dark:text-white">Renewal:</span> {plan.renewalNotes}
                                            </div>
                                        ) : null}
                                        {plan.policyNote ? (
                                            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
                                                <span className="font-semibold text-slate-950 dark:text-white">Policy:</span> {plan.policyNote}
                                            </div>
                                        ) : null}
                                    </div>
                                </DetailBlock>
                            ) : null}

                            {plan.faqItems?.length ? (
                                <DetailBlock title="Plan FAQ">
                                    <div className="space-y-2">
                                        {plan.faqItems.map((item) => (
                                            <details
                                                key={`${plan.id}-${item.question}`}
                                                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                            >
                                                <summary className="cursor-pointer list-none font-semibold text-slate-900 dark:text-white">
                                                    {item.question}
                                                </summary>
                                                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
                                            </details>
                                        ))}
                                    </div>
                                </DetailBlock>
                            ) : null}
                        </div>

                        <div className="border-t border-slate-200 bg-white/92 px-5 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/92">
                            <div className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-700 dark:text-cyan-200">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{plan.ctaLabel || 'Continue with this plan'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">This uses the same backend-managed CTA configuration shown on the card.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onPrimaryAction(plan)}
                                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${theme.cta}`}
                                >
                                    {plan.ctaLabel || 'Continue'}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                <Crown className="h-4 w-4" />
                                Back to plans
                            </button>
                        </div>
                    </motion.aside>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
