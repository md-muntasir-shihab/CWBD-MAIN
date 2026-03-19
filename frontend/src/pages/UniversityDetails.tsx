import { useEffect, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MapPin, Calendar, Users, Globe, ExternalLink,
    AlertTriangle, Clock, BookOpen, Phone, Mail, Loader2, ArrowLeft,
} from 'lucide-react';
import { useUniversityDetail } from '../hooks/useUniversityQueries';
import { normalizeExternalUrl } from '../utils/url';
import UniversityLogo from '../components/university/UniversityLogo';

/* ── Helpers ── */
function fmtDate(d: string | undefined | null): string {
    if (!d) return 'N/A';
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

function progressPct(start?: string | null, end?: string | null): number {
    if (!start || !end) return 0;
    const s = new Date(start).getTime(), e = new Date(end).getTime(), n = Date.now();
    if (Number.isNaN(s) || Number.isNaN(e)) return 0;
    if (n < s) return 0;
    if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
}

function daysUntil(d: string | undefined | null): number | null {
    if (!d) return null;
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return null;
    return Math.ceil((t - Date.now()) / 86_400_000);
}

function countdownLabel(days: number | null): string {
    if (days === null) return '';
    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    return `${days} day${days !== 1 ? 's' : ''} left`;
}

function countdownColor(days: number | null): string {
    if (days === null || days < 0) return 'text-[var(--muted)]';
    if (days < 3) return 'text-red-500';
    if (days <= 10) return 'text-amber-500';
    return 'text-emerald-500';
}

function seatValue(v: string | number | undefined | null): string {
    if (v === undefined || v === null || v === '') return 'N/A';
    const n = Number(v);
    if (Number.isNaN(n) || n <= 0) return 'N/A';
    return n.toLocaleString();
}

/* ── SEO ── */
function useSEO(title: string, description: string) {
    useEffect(() => {
        if (!title) return;
        document.title = `${title} — CampusWay`;
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', description);
        return () => { document.title = 'CampusWay — Your Admission Gateway'; };
    }, [title, description]);
}

/* ── Skeleton ── */
function DetailSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--bg)]">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className="skeleton h-10 w-48 rounded-xl" />
                <div className="skeleton h-6 w-72 rounded-lg" />
                <div className="skeleton h-40 rounded-2xl" />
                <div className="skeleton h-32 rounded-2xl" />
                <div className="skeleton h-24 rounded-2xl" />
                <div className="skeleton h-24 rounded-2xl" />
            </div>
        </div>
    );
}

/* ── Section wrapper with fade-in ── */
function Section({ title, icon: Icon, children }: {
    title: string;
    icon: React.FC<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card p-5 sm:p-6"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <h2 className="text-lg font-heading font-bold text-[var(--text)]">{title}</h2>
            </div>
            {children}
        </motion.section>
    );
}

/* ── Exam-center item ── */
function ExamCenterItem({ center }: { center: string | { city: string; address?: string } }) {
    const label = typeof center === 'string' ? center : `${center.city}${center.address ? ` — ${center.address}` : ''}`;
    return (
        <div className="flex items-start gap-2 p-3 bg-[var(--bg)] rounded-xl">
            <MapPin className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
            <span className="text-sm text-[var(--text)]">{label}</span>
        </div>
    );
}

/* ──────────────────────────── MAIN PAGE ──────────────────────────── */
export default function UniversityDetailsPage() {
    const { slug } = useParams<{ slug: string }>();
    const { data: uni, isLoading, isError, refetch } = useUniversityDetail(slug);
    const [shareMsg, setShareMsg] = useState('');

    useSEO(
        uni ? `${uni.name} (${uni.shortForm}) Admission ${new Date().getFullYear()}` : 'University Details',
        uni?.description || uni?.shortDescription || ''
    );

    const handleShare = useCallback(() => {
        if (navigator.share && uni) {
            navigator.share({ title: uni.name, url: window.location.href }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(window.location.href).then(() => {
                setShareMsg('Copied!');
                setTimeout(() => setShareMsg(''), 2000);
            });
        }
    }, [uni]);

    /* ── Loading ── */
    if (isLoading) return <DetailSkeleton />;

    /* ── Error ── */
    if (isError || !uni) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-5 text-center bg-[var(--bg)]">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-heading font-bold text-[var(--text)]">University Not Found</h1>
                <p className="text-sm text-[var(--muted)] max-w-sm">
                    The university page you're looking for doesn't exist or has been removed.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => refetch()} className="btn-outline gap-2">
                        <Loader2 className="w-4 h-4" /> Retry
                    </button>
                    <Link to="/universities" className="btn-primary gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to list
                    </Link>
                </div>
            </div>
        );
    }

    /* ── Derived values ── */
    const appStart = uni.applicationStartDate || uni.applicationStart;
    const appEnd = uni.applicationEndDate || uni.applicationEnd;
    const appProgress = progressPct(appStart, appEnd);
    const appDaysLeft = daysUntil(appEnd);
    const durationDays = (() => {
        if (!appStart || !appEnd) return null;
        const s = new Date(appStart).getTime(), e = new Date(appEnd).getTime();
        if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
        return Math.ceil((e - s) / 86_400_000);
    })();

    const sciExam = uni.examDateScience || uni.scienceExamDate;
    const artsExam = uni.examDateArts || uni.artsExamDate;
    const bizExam = uni.examDateBusiness || uni.businessExamDate;

    const totalSeats = seatValue(uni.totalSeats);
    const sciSeats = seatValue(uni.seatsScienceEng || uni.scienceSeats);
    const artsSeats = seatValue(uni.seatsArtsHum || uni.artsSeats);
    const bizSeats = seatValue(uni.seatsBusiness || uni.businessSeats);

    const websiteUrl = normalizeExternalUrl(uni.websiteUrl || uni.website);
    const admissionUrl = normalizeExternalUrl(uni.admissionUrl || uni.admissionWebsite);

    const established = uni.establishedYear || uni.established;
    const contact = uni.contactNumber || '';
    const email = uni.email || '';
    const fullDescription = String(uni.description || '').trim();

    const examCenters: Array<string | { city: string; address?: string }> = uni.examCenters ?? [];

    return (
        <div className="min-h-screen bg-[var(--bg)]">
            <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">

                {/* Back link */}
                <Link to="/universities" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--primary)] transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Universities
                </Link>

                {/* ─── 1. HEADER ─── */}
                <motion.header
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row items-start gap-5"
                >
                    <UniversityLogo
                        name={uni.name || ''}
                        shortForm={uni.shortForm || ''}
                        logoUrl={uni.logoUrl || ''}
                        alt={`${uni.shortForm || uni.name} logo`}
                        containerClassName="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-primary/20 shadow-md dark:border-primary/30 sm:h-20 sm:w-20"
                        imageClassName="h-full w-full rounded-2xl bg-[var(--surface)] object-contain"
                        fallbackTextClassName="text-2xl sm:text-3xl"
                    />

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text)] leading-tight">
                            {uni.name}
                        </h1>
                        {uni.shortForm && (
                            <p className="text-sm font-semibold text-[var(--primary)] mt-1">{uni.shortForm}</p>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="px-2.5 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-semibold">
                                {uni.category}
                            </span>
                            {uni.clusterGroup && (
                                <span className="px-2.5 py-1 bg-[var(--surface)] text-[var(--muted)] rounded-full text-xs font-medium border border-[var(--border)]">
                                    {uni.clusterGroup}
                                </span>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            {admissionUrl ? (
                                <a href={admissionUrl} target="_blank" rel="noopener noreferrer"
                                    className="btn-accent gap-2 text-sm" aria-label="Apply now">
                                    Apply Now <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            ) : (
                                <button disabled className="btn-outline text-sm opacity-50 cursor-not-allowed">
                                    Apply N/A
                                </button>
                            )}
                            {websiteUrl ? (
                                <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                                    className="btn-outline gap-2 text-sm" aria-label="Official website">
                                    <Globe className="w-3.5 h-3.5" /> Official Site
                                </a>
                            ) : (
                                <button disabled className="btn-outline text-sm opacity-50 cursor-not-allowed">
                                    <Globe className="w-3.5 h-3.5" /> Website N/A
                                </button>
                            )}
                            <button onClick={handleShare} className="btn-outline gap-2 text-sm" aria-label="Share link">
                                {shareMsg || 'Share'}
                            </button>
                        </div>
                    </div>
                </motion.header>

                {/* ─── 2. OVERVIEW ─── */}
                <Section title="Overview" icon={BookOpen}>
                    <div className="space-y-3 text-sm">
                        {established && (
                            <div className="flex items-center gap-2 text-[var(--text)]">
                                <Calendar className="w-4 h-4 text-[var(--muted)]" />
                                <span>Established {established}</span>
                            </div>
                        )}
                        {uni.address && (
                            <div className="flex items-start gap-2 text-[var(--text)]">
                                <MapPin className="w-4 h-4 text-[var(--muted)] mt-0.5 flex-shrink-0" />
                                <span>{uni.address}</span>
                            </div>
                        )}
                        {contact && (
                            <div className="flex items-center gap-2 text-[var(--text)]">
                                <Phone className="w-4 h-4 text-[var(--muted)]" />
                                <a href={`tel:${contact}`} className="hover:text-[var(--primary)] transition">{contact}</a>
                            </div>
                        )}
                        {email && (
                            <div className="flex items-center gap-2 text-[var(--text)]">
                                <Mail className="w-4 h-4 text-[var(--muted)]" />
                                <a href={`mailto:${email}`} className="hover:text-[var(--primary)] transition">{email}</a>
                            </div>
                        )}
                        {!established && !uni.address && !contact && !email && (
                            <p className="text-[var(--muted)]">No overview information available.</p>
                        )}
                    </div>
                </Section>

                {fullDescription && (
                    <Section title="Description" icon={BookOpen}>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-4 sm:p-5">
                            <p className="whitespace-pre-line text-sm leading-7 text-[var(--text)]">
                                {fullDescription}
                            </p>
                        </div>
                    </Section>
                )}

                {/* ─── 3. SEATS TABLE ─── */}
                <Section title="Seats" icon={Users}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label="Seat distribution">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="text-left py-2.5 pr-4 text-[var(--muted)] font-medium">Department</th>
                                    <th className="text-right py-2.5 pl-4 text-[var(--muted)] font-medium">Seats</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {[
                                    { label: 'Total', value: totalSeats },
                                    { label: 'Science & Engineering', value: sciSeats },
                                    { label: 'Arts & Humanities', value: artsSeats },
                                    { label: 'Business', value: bizSeats },
                                ].map(row => (
                                    <tr key={row.label}>
                                        <td className="py-2.5 pr-4 text-[var(--text)]">{row.label}</td>
                                        <td className={`py-2.5 pl-4 text-right font-semibold ${row.value === 'N/A' ? 'text-[var(--muted)]' : 'text-[var(--primary)]'}`}>
                                            {row.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* ─── 4. APPLICATION TIMELINE ─── */}
                <Section title="Application Timeline" icon={Clock}>
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <div>
                                <p className="text-xs text-[var(--muted)]">Opens</p>
                                <p className="font-semibold text-[var(--text)]">{fmtDate(appStart)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[var(--muted)]">Closes</p>
                                <p className="font-semibold text-[var(--text)]">{fmtDate(appEnd)}</p>
                            </div>
                        </div>

                        {durationDays !== null && (
                            <p className="text-xs text-[var(--muted)]">Duration: <span className="font-medium text-[var(--text)]">{durationDays} days</span></p>
                        )}

                        {/* Progress bar */}
                        {(appStart || appEnd) && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5 text-xs">
                                    <span className="text-[var(--muted)]">Progress</span>
                                    <span className={countdownColor(appDaysLeft)}>
                                        {appDaysLeft !== null ? countdownLabel(appDaysLeft) : 'Dates N/A'}
                                    </span>
                                </div>
                                <div className="h-2.5 bg-[var(--surface)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--primary)] to-emerald-500 rounded-full transition-all duration-700"
                                        style={{ width: `${appProgress}%` }}
                                        role="progressbar"
                                        aria-valuenow={appProgress}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                    />
                                </div>
                                <p className="text-[10px] text-[var(--muted)] mt-1 text-right">{appProgress}% elapsed</p>
                            </div>
                        )}

                        {!appStart && !appEnd && (
                            <p className="text-sm text-[var(--muted)]">Application dates not available.</p>
                        )}
                    </div>
                </Section>

                {/* ─── 5. EXAM SCHEDULE ─── */}
                <Section title="Exam Schedule" icon={Calendar}>
                    <div className="space-y-3">
                        {[
                            { label: 'Science / Engineering', date: sciExam },
                            { label: 'Arts / Humanities', date: artsExam },
                            { label: 'Business', date: bizExam },
                        ].map(row => {
                            const days = daysUntil(row.date);
                            return (
                                <div key={row.label} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-xl">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text)]">{row.label}</p>
                                        <p className="text-xs text-[var(--muted)] mt-0.5">{fmtDate(row.date)}</p>
                                    </div>
                                    <span className={`text-xs font-semibold ${countdownColor(days)}`}>
                                        {row.date ? countdownLabel(days) : 'N/A'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                {/* ─── 6. EXAM CENTERS ─── */}
                <Section title="Exam Centers" icon={MapPin}>
                    {examCenters.length > 0 ? (
                        <div className="space-y-2">
                            {examCenters.map((c, i) => (
                                <ExamCenterItem key={i} center={c} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--muted)]">No exam center data available (N/A).</p>
                    )}
                </Section>

            </div>
        </div>
    );
}
