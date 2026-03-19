import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import PlanCard from '../components/subscription/PlanCard';
import PlanDetailsDrawer from '../components/subscription/PlanDetailsDrawer';
import { useSubscriptionPlanById } from '../hooks/useSubscriptionPlans';
import type { SubscriptionPlanPublic } from '../services/api';

function getCheckoutPath(plan: SubscriptionPlanPublic): string {
    return `/subscription-plans/checkout/${plan.slug || plan.code || plan._id}`;
}

export default function SubscriptionPlanDetailPage() {
    const navigate = useNavigate();
    const { planId } = useParams<{ planId: string }>();
    const planQuery = useSubscriptionPlanById(planId || '');
    const [showDrawer, setShowDrawer] = useState(false);

    const plan = planQuery.data;

    if (planQuery.isLoading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="h-[28rem] animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Plan not found</h1>
                <Link to="/subscription-plans" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                    Back to plans
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Link to="/subscription-plans" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to subscription plans
            </Link>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
                <div className="xl:sticky xl:top-24 xl:self-start">
                    <PlanCard
                        plan={plan}
                        currencyLabel={plan.currency || 'BDT'}
                        onPrimaryAction={(item) => navigate(getCheckoutPath(item))}
                        onViewDetails={() => setShowDrawer(true)}
                    />
                </div>

                <div className="space-y-5">
                    <section className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/86">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Plan Overview</p>
                        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{plan.name}</h1>
                        {plan.tagline ? (
                            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{plan.tagline}</p>
                        ) : null}
                        <p className="mt-5 text-sm leading-8 text-slate-600 dark:text-slate-300">
                            {plan.fullDescription || plan.shortDescription}
                        </p>
                    </section>

                    {plan.fullFeatures?.length ? (
                        <section className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/86">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Included Features</p>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {plan.fullFeatures.map((feature) => (
                                    <div key={feature} className="rounded-[1.5rem] bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {(plan.recommendedFor || plan.accessScope || plan.renewalNotes || plan.policyNote) ? (
                        <section className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/86">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Extra Details</p>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                {plan.recommendedFor ? (
                                    <div className="rounded-[1.5rem] bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Recommended For</p>
                                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{plan.recommendedFor}</p>
                                    </div>
                                ) : null}
                                {plan.accessScope ? (
                                    <div className="rounded-[1.5rem] bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Access Scope</p>
                                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{plan.accessScope}</p>
                                    </div>
                                ) : null}
                                {plan.renewalNotes ? (
                                    <div className="rounded-[1.5rem] bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Renewal</p>
                                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{plan.renewalNotes}</p>
                                    </div>
                                ) : null}
                                {plan.policyNote ? (
                                    <div className="rounded-[1.5rem] bg-slate-100 p-4 dark:bg-slate-900">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Policy Note</p>
                                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{plan.policyNote}</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {plan.faqItems?.length ? (
                        <section className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/86">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Plan FAQ</p>
                            <div className="mt-5 space-y-3">
                                {plan.faqItems.map((item) => (
                                    <details
                                        key={item.question}
                                        className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 dark:text-white">
                                            {item.question}
                                        </summary>
                                        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>

            <PlanDetailsDrawer
                open={showDrawer}
                plan={plan}
                onClose={() => setShowDrawer(false)}
                onPrimaryAction={(item) => navigate(getCheckoutPath(item))}
            />
        </div>
    );
}
