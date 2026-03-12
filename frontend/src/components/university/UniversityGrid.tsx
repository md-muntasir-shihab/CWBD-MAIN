import { useMemo, useState, useEffect } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import UniversityCard, { DEFAULT_UNIVERSITY_CARD_CONFIG, UniversityCardSkeleton } from './UniversityCard';
import type { HomeAnimationLevel, HomeUniversityCardConfig, UniversityCardSort } from '../../services/api';

type UniversityItem = Record<string, unknown>;

interface UniversityGridProps {
    items: UniversityItem[];
    config?: Partial<HomeUniversityCardConfig>;
    animationLevel?: HomeAnimationLevel;
    loading?: boolean;
    skeletonCount?: number;
    emptyText?: string;
    className?: string;
    itemsPerPage?: number;
    sort?: UniversityCardSort;
}

function parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const dateFromNumber = new Date(value > 1e12 ? value : value * 1000);
        const year = dateFromNumber.getUTCFullYear();
        if (!Number.isNaN(dateFromNumber.getTime()) && year >= 1900 && year <= 2100) return dateFromNumber;
    }
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) {
        let numeric = Number(raw);
        if (Number.isFinite(numeric)) {
            while (numeric > 1e13) numeric = Math.floor(numeric / 10);
            const dateFromEpoch = new Date(numeric < 1e11 ? numeric * 1000 : numeric);
            const year = dateFromEpoch.getUTCFullYear();
            if (!Number.isNaN(dateFromEpoch.getTime()) && year >= 1900 && year <= 2100) return dateFromEpoch;
        }
        return null;
    }
    const date = new Date(raw);
    const year = date.getUTCFullYear();
    if (Number.isNaN(date.getTime()) || year < 1900 || year > 2100) return null;
    return date;
}

function sortUniversities(items: UniversityItem[], mode: UniversityCardSort): UniversityItem[] {
    const sorted = [...items];
    if (mode === 'alphabetical' || mode === 'name_asc') {
        sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        return sorted;
    }
    if (mode === 'name_desc') {
        sorted.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
        return sorted;
    }
    if (mode === 'exam_soon') {
        sorted.sort((a, b) => {
            const getMinExam = (item: UniversityItem): number => {
                const dates = [
                    parseDate(item.scienceExamDate || item.examDateScience),
                    parseDate(item.artsExamDate || item.examDateArts),
                    parseDate(item.businessExamDate || item.examDateBusiness),
                ].filter((d): d is Date => d !== null).map((d) => d.getTime());
                return dates.length > 0 ? Math.min(...dates) : Number.POSITIVE_INFINITY;
            };
            const left = getMinExam(a);
            const right = getMinExam(b);
            if (left !== right) return left - right;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
        return sorted;
    }
    // nearest_deadline, closing_soon, or any other value → sort by applicationEnd ascending
    sorted.sort((a, b) => {
        const leftDate = parseDate(a.applicationEnd || a.applicationEndDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightDate = parseDate(b.applicationEnd || b.applicationEndDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        if (leftDate !== rightDate) return leftDate - rightDate;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return sorted;
}

function getContainerVariants(level: HomeAnimationLevel): Variants {
    if (level === 'off') {
        return {
            hidden: { opacity: 1 },
            show: { opacity: 1 },
        };
    }
    return {
        hidden: { opacity: 0.96 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: level === 'minimal' ? 0.03 : 0.05,
            },
        },
    };
}

export default function UniversityGrid({
    items,
    config,
    animationLevel = 'normal',
    loading = false,
    skeletonCount = 6,
    emptyText = 'No universities found.',
    className = '',
    itemsPerPage = 25,
    sort,
}: UniversityGridProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const mergedConfig: HomeUniversityCardConfig = { ...DEFAULT_UNIVERSITY_CARD_CONFIG, ...(config || {}) };
    const effectiveSort: UniversityCardSort = sort ?? mergedConfig.defaultSort;

    const uniqueItems = useMemo(() => {
        const seen = new Set<string>();
        const output: UniversityItem[] = [];
        items.forEach((item, index) => {
            const primaryKey = String(item.id || item._id || item.slug || '').trim().toLowerCase();
            const fallbackKey = `${String(item.name || '').trim().toLowerCase()}-${index}`;
            const key = primaryKey || fallbackKey;
            if (seen.has(key)) return;
            seen.add(key);
            output.push(item);
        });
        return output;
    }, [items]);

    const sortedItems = useMemo(
        () => sortUniversities(uniqueItems, effectiveSort),
        [uniqueItems, effectiveSort]
    );

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(start, start + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    // Reset page when items change
    useEffect(() => {
        setCurrentPage(1);
    }, [items]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        scrollToTop();
    };

    if (loading) {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
                {Array.from({ length: skeletonCount }).map((_, index) => <UniversityCardSkeleton key={index} />)}
            </div>
        );
    }

    if (!sortedItems.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center card-flat bg-white/50 dark:bg-slate-900/50">
                <p className="text-lg font-medium text-slate-900 dark:text-white">{emptyText}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <motion.div
                key={currentPage}
                variants={getContainerVariants(animationLevel)}
                initial="hidden"
                animate="show"
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
                data-testid="university-placeholder-grid"
                data-grid="university-card-grid"
            >
                <AnimatePresence mode="popLayout">
                    {paginatedItems.map((item, index) => (
                        <UniversityCard
                            key={String(item.id || item._id || item.slug || `${String(item.name || 'item').trim().toLowerCase()}-${currentPage}-${index}`)}
                            university={item}
                            config={mergedConfig}
                            animationLevel={animationLevel}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 py-8">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-1.5 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110'
                                                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedItems.length)} of {sortedItems.length} Universities
                    </p>
                </div>
            )}
        </div>
    );
}
