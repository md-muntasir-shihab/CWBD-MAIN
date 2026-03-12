import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Search, Megaphone, AlertCircle,
    GraduationCap, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck, Newspaper,
    BookOpen, BarChart3, Layers
} from 'lucide-react';
import UniversityCard from '../components/university/UniversityCard';
import SectionHeader from '../components/home/SectionHeader';
import PremiumCarousel from '../components/home/PremiumCarousel';
import HomeSkeleton from '../components/home/SectionSkeleton';
import EmptySection from '../components/home/EmptySection';
import SectionErrorBoundary from '../components/home/SectionErrorBoundary';
import DeadlineCard from '../components/home/cards/DeadlineCard';
import UpcomingExamCard from '../components/home/cards/UpcomingExamCard';
import CampaignBannerCard from '../components/home/cards/CampaignBannerCard';
import OnlineExamCard from '../components/home/cards/OnlineExamCard';
import NewsCard from '../components/home/cards/NewsCard';
import ResourceCard from '../components/home/cards/ResourceCard';
import { getHome, type HomeApiResponse, type ApiUniversityCardPreview, type HomeExamWidgetItem, type ApiNews } from '../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SectionOrderItem { id: string; title: string; order: number }
interface ContentBlockItem {
    _id: string; type: string; title?: string; body?: string;
    imageUrl?: string; ctaLabel?: string; ctaUrl?: string;
    placements: string[]; priority?: number; dismissible?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function matchesCategoryAndCluster(
    uni: ApiUniversityCardPreview,
    selectedCategory: string,
    selectedCluster: string,
): boolean {
    if (selectedCategory && uni.category !== selectedCategory) return false;
    if (selectedCluster && uni.clusterGroup !== selectedCluster) return false;
    return true;
}

/* ------------------------------------------------------------------ */
/*  Shared UI primitives                                               */
/* ------------------------------------------------------------------ */
const fadeInUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

function SectionWrap({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.section
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={`w-full ${className}`}
        >
            {children}
        </motion.section>
    );
}

function SmartActionLink({ href, children, className = '' }: {
    href: string; children: ReactNode; className?: string;
}) {
    const isExternal = /^https?:\/\//.test(href);
    if (isExternal) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {children}
            </a>
        );
    }
    return <Link to={href} className={className}>{children}</Link>;
}

function SectionRenderer({ renderer }: { renderer: () => ReactNode }) {
    return <>{renderer()}</>;
}

/* ------------------------------------------------------------------ */
/*  Default section order                                              */
/* ------------------------------------------------------------------ */
const DEFAULT_ORDER: SectionOrderItem[] = [
    { id: 'search', title: 'Search', order: 0 },
    { id: 'hero', title: 'Hero Banner', order: 1 },
    { id: 'campaign_banners', title: 'Campaign Banners', order: 2 },
    { id: 'featured', title: 'Featured Universities', order: 3 },
    { id: 'category_filter', title: 'Category Filter', order: 4 },
    { id: 'deadlines', title: 'Admission Deadlines', order: 5 },
    { id: 'upcoming_exams', title: 'Upcoming Exams', order: 6 },
    { id: 'online_exam_preview', title: 'Online Exam Preview', order: 7 },
    { id: 'news', title: 'Latest News', order: 8 },
    { id: 'resources', title: 'Resources', order: 9 },
    { id: 'content_blocks', title: 'Content Blocks', order: 10 },
    { id: 'stats', title: 'Quick Stats', order: 11 },
];

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function HomeModern() {
    /* ---------- data ---------- */
    const { data, isLoading, isError } = useQuery<HomeApiResponse>({
        queryKey: ['home'],
        queryFn: () => getHome().then(r => r.data),
        staleTime: 60_000,
        refetchInterval: 90_000,
    });

    /* ---------- state ---------- */
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCluster, setSelectedCluster] = useState('');
    const [categoryInteracted, setCategoryInteracted] = useState(false);
    const categoryScrollRef = useRef<HTMLDivElement | null>(null);
    const clusterScrollRef = useRef<HTMLDivElement | null>(null);

    /* ---------- derived ---------- */
    const hs = data?.homeSettings;
    const categories = data?.universityCategories ?? [];
    const uniSettings = data?.uniSettings;

    /* Set default category from backend */
    useEffect(() => {
        if (!categoryInteracted && categories.length > 0 && !selectedCategory) {
            const defaultCat = uniSettings?.defaultCategory || hs?.universityPreview?.defaultActiveCategory || '';
            if (defaultCat && categories.some(c => c.categoryName === defaultCat)) {
                setSelectedCategory(defaultCat);
            }
        }
    }, [categories, categoryInteracted, selectedCategory, uniSettings, hs]);

    /* Highlighted categories sorted first */
    const sortedCategories = useMemo(() => {
        const highlighted = hs?.highlightedCategories ?? [];
        return [...categories].sort((a, b) => {
            const aHl = highlighted.find(h => h.category === a.categoryName);
            const bHl = highlighted.find(h => h.category === b.categoryName);
            if (aHl && !bHl) return -1;
            if (!aHl && bHl) return 1;
            if (aHl && bHl) return aHl.order - bHl.order;
            return 0;
        });
    }, [categories, hs]);

    const currentClusters = useMemo(() => {
        if (!selectedCategory) return [];
        const cat = categories.find(c => c.categoryName === selectedCategory);
        return cat?.clusterGroups ?? [];
    }, [selectedCategory, categories]);

    /* Filtered university lists */
    const filteredFeatured = useMemo(() => {
        const sl = search.toLowerCase().trim();
        return (data?.featuredUniversities ?? []).filter(u =>
            matchesCategoryAndCluster(u, selectedCategory, selectedCluster)
            && (!sl || u.name.toLowerCase().includes(sl) || u.shortForm?.toLowerCase().includes(sl)),
        );
    }, [data?.featuredUniversities, selectedCategory, selectedCluster, search]);

    const filteredDeadline = useMemo(() => {
        const sl = search.toLowerCase().trim();
        return (data?.deadlineUniversities ?? []).filter(u =>
            matchesCategoryAndCluster(u, selectedCategory, selectedCluster)
            && (!sl || u.name.toLowerCase().includes(sl) || u.shortForm?.toLowerCase().includes(sl)),
        );
    }, [data?.deadlineUniversities, selectedCategory, selectedCluster, search]);

    const filteredUpcoming = useMemo(() => {
        const sl = search.toLowerCase().trim();
        return (data?.upcomingExamUniversities ?? []).filter(u =>
            matchesCategoryAndCluster(u, selectedCategory, selectedCluster)
            && (!sl || u.name.toLowerCase().includes(sl) || u.shortForm?.toLowerCase().includes(sl)),
        );
    }, [data?.upcomingExamUniversities, selectedCategory, selectedCluster, search]);

    const sectionOrder = useMemo<SectionOrderItem[]>(() => {
        if (data?.sectionOrder && data.sectionOrder.length > 0) {
            return [...data.sectionOrder].sort((a, b) => a.order - b.order);
        }
        return DEFAULT_ORDER;
    }, [data?.sectionOrder]);

    const contentBlocks = data?.contentBlocksForHome ?? [];
    const newsItems = data?.newsPreviewItems ?? data?.newsPreview ?? [];
    const resourceItems = data?.resourcePreviewItems ?? data?.resourcesPreview ?? [];
    const campaignBanners = data?.campaignBannersActive ?? [];
    const onlineExams = data?.onlineExamsPreview;
    const stats = data?.stats;
    const cardConfig = hs?.universityCardConfig;
    const animLevel = hs?.ui?.animationLevel ?? 'minimal';

    const handleHorizontalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        const container = event.currentTarget;
        if (container.scrollWidth <= container.clientWidth) return;
        const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!dominantDelta) return;
        container.scrollLeft += dominantDelta;
        event.preventDefault();
    };

    const scrollChipRow = (target: 'category' | 'cluster', direction: 'left' | 'right') => {
        const ref = target === 'category' ? categoryScrollRef : clusterScrollRef;
        const el = ref.current;
        if (!el) return;
        const amount = Math.max(180, Math.floor(el.clientWidth * 0.65));
        el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    /* ================================================================ */
    /*  SECTION RENDERERS                                                */
    /* ================================================================ */

    /* 1 ─ Search */
    function renderSearch() {
        if (hs?.hero?.showSearch === false) return null;
        const placeholder = hs?.hero?.searchPlaceholder || 'Search universities, news, exams…';
        return (
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-[var(--primary)] transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={placeholder}
                            aria-label="Search universities, news, exams and resources"
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800/80 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border border-transparent focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all shadow-card focus:shadow-card-hover"
                        />
                    </div>
                </div>
            </div>
        );
    }

    /* 2 ─ Hero Banner */
    function renderHero() {
        if (!hs?.sectionVisibility?.hero) return null;
        const hero = hs.hero;
        if (!hero) return null;
        return (
            <SectionWrap>
                <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-[var(--primary)] via-blue-600 to-purple-700 text-white mx-4 md:mx-0 max-h-[420px]">
                    {hero.heroImageUrl && (
                        <img src={hero.heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />
                    )}
                    <div className="relative z-10 px-6 py-10 md:px-12 md:py-14 max-w-3xl">
                        {hero.pillText && (
                            <motion.span
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold rounded-full bg-white/15 backdrop-blur-sm border border-white/20"
                            >
                                {hero.pillText}
                            </motion.span>
                        )}
                        <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 drop-shadow-sm">
                            {hero.title}
                        </h1>
                        {hero.subtitle && (
                            <p className="text-sm md:text-base text-white/80 mb-8 max-w-lg leading-relaxed">{hero.subtitle}</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                            {hero.primaryCTA?.label && hero.primaryCTA?.url && (
                                <SmartActionLink href={hero.primaryCTA.url}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[var(--primary)] font-semibold text-sm hover:bg-blue-50 transition-colors shadow-elevated">
                                    {hero.primaryCTA.label}
                                </SmartActionLink>
                            )}
                            {hero.secondaryCTA?.label && hero.secondaryCTA?.url && (
                                <SmartActionLink href={hero.secondaryCTA.url}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/30 text-white font-medium text-sm hover:bg-white/10 transition-colors backdrop-blur-sm">
                                    {hero.secondaryCTA.label}
                                </SmartActionLink>
                            )}
                        </div>
                    </div>
                </div>
            </SectionWrap>
        );
    }

    /* 3 ─ Campaign Banners */
    function renderCampaignBanners() {
        if (hs?.sectionVisibility?.adsSection === false) return null;
        if (!campaignBanners.length) return null;
        if (hs?.campaignBanners && hs.campaignBanners.enabled === false) return null;
        const cbConfig = hs?.campaignBanners;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader
                        title={cbConfig?.title || 'Promotions & Campaigns'}
                        subtitle={cbConfig?.subtitle || 'Latest offers and announcements'}
                        icon={Megaphone}
                    />
                    <PremiumCarousel autoRotate autoRotateInterval={cbConfig?.autoRotateInterval || 5000}>
                        {campaignBanners.map(banner => (
                            <CampaignBannerCard key={banner._id} banner={banner} />
                        ))}
                    </PremiumCarousel>
                </div>
            </SectionWrap>
        );
    }

    /* 4 ─ Featured Universities */
    function renderFeatured() {
        if (hs?.sectionVisibility?.universityDashboard === false) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Featured Universities" subtitle="Hand-picked for you" icon={GraduationCap} viewAllHref="/universities" />
                    {filteredFeatured.length > 0 ? (
                        <PremiumCarousel>
                            {filteredFeatured.map(uni => (
                                <div key={uni.id} className="snap-start shrink-0 w-[85vw] sm:w-[70vw] md:w-[45%] lg:w-[32%]">
                                    <UniversityCard university={uni} config={cardConfig} animationLevel={animLevel} actionVariant="default" />
                                </div>
                            ))}
                        </PremiumCarousel>
                    ) : (
                        <EmptySection icon={GraduationCap} message="No featured universities match your filter" />
                    )}
                </div>
            </SectionWrap>
        );
    }

    /* 5 ─ Category + Cluster Filter */
    function renderCategoryFilter() {
        if (!categories.length) return null;
        const enableCluster = uniSettings?.enableClusterFilterOnHome !== false && hs?.universityPreview?.enableClusterFilter !== false;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Browse by Category" subtitle="Find universities that match your profile" icon={Layers} />
                    {/* Category chips */}
                    <div className="relative">
                        <div
                            ref={categoryScrollRef}
                            onWheel={handleHorizontalWheel}
                            className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide touch-pan-x"
                        >
                            <button
                                onClick={() => { setSelectedCategory(''); setSelectedCluster(''); setCategoryInteracted(true); }}
                                className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                    !selectedCategory
                                        ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                }`}>
                                All
                            </button>
                            {sortedCategories.map(cat => {
                                const isActive = selectedCategory === cat.categoryName;
                                const highlighted = hs?.highlightedCategories?.find(h => h.category === cat.categoryName);
                                return (
                                    <button key={cat.categoryName}
                                        onClick={() => {
                                            setSelectedCategory(isActive ? '' : cat.categoryName);
                                            setSelectedCluster('');
                                            setCategoryInteracted(true);
                                        }}
                                        className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                                            isActive
                                                ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                        }`}>
                                        {cat.categoryName}
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200/80 dark:bg-gray-700'}`}>
                                            {cat.count}
                                        </span>
                                        {highlighted?.badgeText && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 font-bold animate-pulse">{highlighted.badgeText}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 left-0 hidden md:flex items-center">
                            <button
                                type="button"
                                onClick={() => scrollChipRow('category', 'left')}
                                className="pointer-events-auto ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/80 bg-white/85 text-gray-600 shadow-sm backdrop-blur hover:bg-white dark:border-gray-700 dark:bg-gray-900/85 dark:text-gray-200"
                                aria-label="Scroll categories left"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 hidden md:flex items-center">
                            <button
                                type="button"
                                onClick={() => scrollChipRow('category', 'right')}
                                className="pointer-events-auto mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/80 bg-white/85 text-gray-600 shadow-sm backdrop-blur hover:bg-white dark:border-gray-700 dark:bg-gray-900/85 dark:text-gray-200"
                                aria-label="Scroll categories right"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-gray-50 dark:from-gray-950 pointer-events-none md:hidden" />
                        <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-gray-50 dark:from-gray-950 pointer-events-none md:hidden" />
                    </div>
                    {/* Cluster chips */}
                    {enableCluster && currentClusters.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            ref={clusterScrollRef}
                            onWheel={handleHorizontalWheel}
                            className="flex gap-2 overflow-x-auto pb-2 mt-1 scrollbar-hide touch-pan-x"
                        >
                            <button
                                onClick={() => setSelectedCluster('')}
                                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    !selectedCluster
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                }`}>
                                All Clusters
                            </button>
                            {currentClusters.map(cl => (
                                <button key={cl}
                                    onClick={() => setSelectedCluster(selectedCluster === cl ? '' : cl)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                        selectedCluster === cl
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                    }`}>
                                    {cl}
                                </button>
                            ))}
                        </motion.div>
                    )}
                    {enableCluster && currentClusters.length > 0 && (
                        <div className="mt-1 hidden md:flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => scrollChipRow('cluster', 'left')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/80 bg-white/85 text-gray-600 shadow-sm backdrop-blur hover:bg-white dark:border-gray-700 dark:bg-gray-900/85 dark:text-gray-200"
                                aria-label="Scroll clusters left"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollChipRow('cluster', 'right')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/80 bg-white/85 text-gray-600 shadow-sm backdrop-blur hover:bg-white dark:border-gray-700 dark:bg-gray-900/85 dark:text-gray-200"
                                aria-label="Scroll clusters right"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </SectionWrap>
        );
    }

    /* 6 ─ Admission Deadlines */
    function renderDeadlines() {
        if (hs?.sectionVisibility?.closingExamWidget === false) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Application Deadlines" subtitle="Don't miss your chance to apply" icon={CalendarClock} viewAllHref="/universities" viewAllLabel="See all" />
                    {filteredDeadline.length > 0 ? (
                        <PremiumCarousel>
                            {filteredDeadline.map(uni => (
                                <DeadlineCard key={uni.id} university={uni} />
                            ))}
                        </PremiumCarousel>
                    ) : (
                        <EmptySection icon={CalendarClock} message="No upcoming deadlines in this category" />
                    )}
                </div>
            </SectionWrap>
        );
    }

    /* 7 ─ Upcoming Exams */
    function renderUpcomingExams() {
        if (hs?.sectionVisibility?.examsWidget === false) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Upcoming Exams" subtitle="Prepare and plan ahead" icon={CalendarClock} viewAllHref="/universities" viewAllLabel="See all" />
                    {filteredUpcoming.length > 0 ? (
                        <PremiumCarousel>
                            {filteredUpcoming.map(uni => (
                                <UpcomingExamCard key={uni.id} university={uni} />
                            ))}
                        </PremiumCarousel>
                    ) : (
                        <EmptySection icon={CalendarClock} message="No upcoming exams in this category" />
                    )}
                </div>
            </SectionWrap>
        );
    }

    /* 8 ─ Online Exam Preview */
    function renderOnlineExamPreview() {
        if (hs?.sectionVisibility?.examsWidget === false) return null;
        if (!onlineExams) return null;
        const items: HomeExamWidgetItem[] = (
            onlineExams.items?.length
                ? onlineExams.items
                : [...(onlineExams.liveNow ?? []), ...(onlineExams.upcoming ?? [])]
        ).slice(0, 6);
        if (!items.length) return null;

        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Online Exams" subtitle="Test your preparation" icon={ClipboardCheck} viewAllHref="/exams" />
                    <PremiumCarousel>
                        {items.map(exam => (
                            <OnlineExamCard key={exam.id} exam={exam} />
                        ))}
                    </PremiumCarousel>
                </div>
            </SectionWrap>
        );
    }

    /* 9 ─ News Preview */
    function renderNewsPreview() {
        if (hs?.sectionVisibility?.newsPreview === false) return null;
        if (!newsItems.length) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Latest News" subtitle="Admission updates & announcements" icon={Newspaper} viewAllHref="/news" />
                    <PremiumCarousel>
                        {newsItems.map((item: ApiNews) => (
                            <NewsCard key={item._id} item={item} />
                        ))}
                    </PremiumCarousel>
                </div>
            </SectionWrap>
        );
    }

    /* 10 ─ Resources Preview */
    function renderResourcesPreview() {
        if (hs?.sectionVisibility?.resourcesPreview === false) return null;
        if (!resourceItems.length) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <SectionHeader title="Resources" subtitle="Guides, downloads & study materials" icon={BookOpen} viewAllHref="/resources" />
                    <PremiumCarousel>
                        {resourceItems.map(res => (
                            <ResourceCard key={res._id} resource={res} />
                        ))}
                    </PremiumCarousel>
                </div>
            </SectionWrap>
        );
    }

    /* 11 ─ Content Blocks */
    function renderContentBlocks() {
        if (!contentBlocks.length) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0 space-y-4">
                    {contentBlocks.map((block: ContentBlockItem) => {
                        if (block.type === 'cta_strip' || block.type === 'campaign_card') {
                            return (
                                <motion.div key={block._id} whileHover={{ scale: 1.005 }}
                                    className="rounded-2xl overflow-hidden bg-gradient-to-r from-[var(--primary)] to-purple-600 text-white p-6 md:p-8 flex flex-col md:flex-row items-center gap-5 shadow-elevated">
                                    {block.imageUrl && <img src={block.imageUrl} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shrink-0 ring-2 ring-white/20" />}
                                    <div className="flex-1 text-center md:text-left">
                                        {block.title && <h3 className="font-heading font-bold text-lg md:text-xl mb-1">{block.title}</h3>}
                                        {block.body && <p className="text-sm text-white/75 line-clamp-2">{block.body}</p>}
                                    </div>
                                    {block.ctaLabel && block.ctaUrl && (
                                        <SmartActionLink href={block.ctaUrl}
                                            className="shrink-0 px-6 py-3 rounded-xl bg-white text-[var(--primary)] font-semibold text-sm hover:bg-blue-50 transition-colors shadow-elevated">
                                            {block.ctaLabel}
                                        </SmartActionLink>
                                    )}
                                </motion.div>
                            );
                        }
                        if (block.type === 'notice_ribbon' || block.type === 'info_banner') {
                            return (
                                <div key={block._id}
                                    className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-4 md:p-5 flex items-start gap-3 shadow-card">
                                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
                                        <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        {block.title && <p className="font-semibold text-sm text-amber-900 dark:text-amber-200 mb-0.5">{block.title}</p>}
                                        {block.body && <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{block.body}</p>}
                                    </div>
                                    {block.ctaLabel && block.ctaUrl && (
                                        <SmartActionLink href={block.ctaUrl}
                                            className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">
                                            {block.ctaLabel} →
                                        </SmartActionLink>
                                    )}
                                </div>
                            );
                        }
                        /* hero_card or generic fallback */
                        return (
                            <motion.div key={block._id} whileHover={{ y: -2 }}
                                className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 shadow-card hover:shadow-card-hover transition-shadow flex flex-col md:flex-row items-center gap-5">
                                {block.imageUrl && <img src={block.imageUrl} alt="" className="w-full md:w-44 h-36 md:h-32 rounded-xl object-cover shrink-0" />}
                                <div className="flex-1">
                                    {block.title && <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white mb-1">{block.title}</h3>}
                                    {block.body && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">{block.body}</p>}
                                </div>
                                {block.ctaLabel && block.ctaUrl && (
                                    <SmartActionLink href={block.ctaUrl}
                                        className="shrink-0 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-card">
                                        {block.ctaLabel}
                                    </SmartActionLink>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </SectionWrap>
        );
    }

    /* 12 ─ Quick Stats */
    function renderStats() {
        if (hs?.sectionVisibility?.stats === false) return null;
        if (!stats?.items?.length) return null;
        const enabled = stats.items.filter(s => s.enabled);
        if (!enabled.length) return null;
        return (
            <SectionWrap>
                <div className="px-4 md:px-0">
                    <div className="rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 p-6 md:p-10 shadow-card">
                        <SectionHeader title={hs?.stats?.title || 'Platform Overview'} subtitle={hs?.stats?.subtitle || 'CampusWay at a glance'} icon={BarChart3} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {enabled.map(stat => (
                                <motion.div key={stat.key} whileHover={{ scale: 1.03 }}
                                    className="text-center p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                    <p className="text-2xl md:text-3xl font-extrabold text-[var(--primary)]">
                                        {(stat.value ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionWrap>
        );
    }

    /* ================================================================ */
    /*  Section renderer map                                             */
    /* ================================================================ */
    const sectionRenderers: Record<string, () => ReactNode> = {
        search: renderSearch,
        hero: renderHero,
        campaign_banners: renderCampaignBanners,
        featured: renderFeatured,
        category_filter: renderCategoryFilter,
        deadlines: renderDeadlines,
        upcoming_exams: renderUpcomingExams,
        online_exam_preview: renderOnlineExamPreview,
        news: renderNewsPreview,
        resources: renderResourcesPreview,
        content_blocks: renderContentBlocks,
        stats: renderStats,
    };

    /* ================================================================ */
    /*  RENDER                                                           */
    /* ================================================================ */
    if (isLoading) return <HomeSkeleton />;
    if (isError || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-lg font-heading font-semibold">Failed to load home</p>
                <p className="text-sm mt-1">Please try again later.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 transition-colors">
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-16">
                {sectionOrder.map(section => {
                    const renderer = sectionRenderers[section.id];
                    if (!renderer) return null;
                    return (
                        <SectionErrorBoundary key={section.id}>
                            <SectionRenderer renderer={renderer} />
                        </SectionErrorBoundary>
                    );
                })}
            </div>
        </div>
    );
}
