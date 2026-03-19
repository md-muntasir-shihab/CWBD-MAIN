import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentDashboardFullResponse } from '../../../services/api';

interface Props {
    header: StudentDashboardFullResponse['header'];
    gatingMessage?: string;
}

export default function ProfileCompletion({ header, gatingMessage }: Props) {
    const pct = Math.min(100, Math.max(0, header.profileCompletionPercentage));
    const threshold = Math.min(100, Math.max(1, header.profileCompletionThreshold || 60));
    const isLow = pct < threshold;
    const isBlocked = !header.isProfileEligible;
    const missingFields: string[] = [...new Set(((header as unknown) as Record<string, unknown>).missingFields as string[] ?? [])];

    return (
        <DashboardSection delay={0.1}>
            <div className={`rounded-2xl border p-4 transition-colors ${
                isBlocked
                    ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/5'
                    : isLow
                        ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5'
                        : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
            }`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isBlocked
                            ? <Lock className="w-4 h-4 text-rose-500" />
                            : isLow
                                ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                                : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        }
                        Profile Completion
                    </h3>
                    <span className={`text-sm font-bold ${
                        isBlocked ? 'text-rose-600 dark:text-rose-400'
                        : isLow ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>{pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            isBlocked ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                {isBlocked && gatingMessage && (
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-2 flex items-center gap-1">
                        <Lock className="w-3 h-3 shrink-0" />
                        {gatingMessage}
                    </p>
                )}
                {!isBlocked && !isLow && pct >= 70 && missingFields.length === 0 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        Great! Your profile meets the requirements.
                    </p>
                )}
                {missingFields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {missingFields.map(field => (
                            <span
                                key={field}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300"
                            >
                                + {field}
                            </span>
                        ))}
                    </div>
                )}
                <Link to="/profile" className={`inline-block mt-3 text-xs font-medium hover:underline ${
                    isBlocked ? 'text-rose-600 dark:text-rose-400'
                    : isLow ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                    {isBlocked ? 'Unlock exam access →' : 'Complete profile →'}
                </Link>
            </div>
        </DashboardSection>
    );
}
