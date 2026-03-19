import { motion } from 'framer-motion';
import { ArrowRight, Check, Crown, Eye, Sparkles, X } from 'lucide-react';
import type { SubscriptionPlanPublic } from '../../services/api';
import { getSubscriptionTheme } from './subscriptionTheme';

type Props = {
    plan: SubscriptionPlanPublic;
    currencyLabel?: string;
    onPrimaryAction: (plan: SubscriptionPlanPublic) => void;
    onViewDetails: (plan: SubscriptionPlanPublic) => void;
    isCurrentPlan?: boolean;
    compact?: boolean;
};

function formatPrice(plan: SubscriptionPlanPublic, currencyLabel: string): string {
    if (plan.isFree || plan.priceBDT <= 0) return 'Free';
    return `${currencyLabel} ${Number(plan.priceBDT || 0).toLocaleString()}`;
}

export default function PlanCard({
    plan,
    currencyLabel = plan.currency || 'BDT',
    onPrimaryAction,
    onViewDetails,
    isCurrentPlan = false,
    compact = false,
}: Props) {
    const theme = getSubscriptionTheme(plan.themeKey);
    const visibleFeatures = (plan.visibleFeatures?.length ? plan.visibleFeatures : plan.features || []).slice(0, compact ? 4 : 8);
    const excludedFeatures = (plan.excludedFeatures || []).slice(0, compact ? 1 : 2);

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            whileHover={{ y: -6 }}
            className={`group relative flex h-full ${compact ? 'min-h-[520px]' : 'min-h-[640px]'} flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br ${theme.shell} ${theme.glow} ring-1 ${theme.ring}`}
            data-testid="subscription-plan-card"
        >
            {plan.isFeatured ? (
                <div className="absolute right-4 top-4 z-20 rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                    Most Popular
                </div>
            ) : null}

            <div className="absolute inset-x-0 top-0 z-10 px-4 pt-4">
                <div className={`rounded-[1.75rem] bg-gradient-to-br ${theme.cap} ${compact ? 'p-4' : 'p-5'} shadow-[0_20px_40px_rgba(15,23,42,0.18)]`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {plan.badgeText ? (
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${theme.badge}`}>
                                        {plan.badgeText}
                                    </span>
                                ) : null}
                                {isCurrentPlan ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                                        <Crown className="h-3.5 w-3.5" />
                                        Current Plan
                                    </span>
                                ) : null}
                            </div>
                            <div>
                                <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-black tracking-tight ${theme.strongText}`}>{plan.name}</h3>
                                {plan.tagline ? (
                                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">{plan.tagline}</p>
                                ) : null}
                            </div>
                        </div>
                        <div className={`rounded-2xl px-3 py-2 text-xs font-semibold ${theme.badge}`}>
                            {plan.shortTitle || plan.shortLabel || plan.name}
                        </div>
                    </div>

                    {(plan.highlightText || plan.shortDescription) ? (
                        <div className="mt-5 rounded-[1.4rem] border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                            {plan.highlightText ? (
                                <p className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    {plan.highlightText}
                                </p>
                            ) : null}
                            {plan.shortDescription ? (
                                <p className={`${plan.highlightText ? 'mt-2' : ''}`}>{plan.shortDescription}</p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className={`flex flex-1 flex-col ${compact ? 'px-5 pb-5 pt-[15rem]' : 'px-6 pb-6 pt-[17rem]'} text-white`}>
                <div className="space-y-5">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/68">Included Highlights</p>
                        <div className="space-y-2">
                            {visibleFeatures.length > 0 ? (
                                visibleFeatures.map((feature) => (
                                    <div
                                        key={`${plan.id}-${feature}`}
                                        className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${theme.featureYes}`}
                                    >
                                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/18">
                                            <Check className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="text-sm font-medium leading-6">{feature}</span>
                                    </div>
                                ))
                            ) : (
                                <div className={`rounded-2xl border px-3.5 py-3 text-sm ${theme.featureYes}`}>
                                    Admin will add highlights for this plan soon.
                                </div>
                            )}
                            {excludedFeatures.map((feature) => (
                                <div
                                    key={`${plan.id}-excluded-${feature}`}
                                    className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${theme.featureNo}`}
                                >
                                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/16">
                                        <X className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-sm font-medium leading-6">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/18 bg-black/10 p-4 backdrop-blur-sm">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/68">Price</p>
                                <div className="mt-2 flex items-end gap-2">
                                    <p className={`${compact ? 'text-3xl' : 'text-4xl'} font-black tracking-tight`}>{formatPrice(plan, currencyLabel)}</p>
                                    {plan.oldPrice ? (
                                        <p className="pb-1 text-sm font-medium text-white/60 line-through">
                                            {currencyLabel} {Number(plan.oldPrice).toLocaleString()}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                            <div className={`rounded-2xl px-3 py-2 text-xs font-semibold ${theme.pill}`}>
                                {plan.billingCycle === 'one_time' ? 'One time' : (plan.billingCycle || 'monthly')}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className={theme.muted}>{plan.validityLabel || plan.durationLabel}</span>
                            {plan.supportLevel ? <span className={theme.muted}>Support: {plan.supportLevel}</span> : null}
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => onPrimaryAction(plan)}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 ${compact ? 'py-3.5' : 'py-4'} text-sm font-semibold transition ${theme.cta}`}
                        >
                            {plan.ctaLabel || 'Subscribe Now'}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewDetails(plan)}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 ${compact ? 'py-3.5' : 'py-4'} text-sm font-semibold transition ${theme.ctaSecondary}`}
                        >
                            <Eye className="h-4 w-4" />
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </motion.article>
    );
}
