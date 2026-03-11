import axios from 'axios';

const RAW_ADMIN_PATH = String(import.meta.env.VITE_ADMIN_PATH || 'campusway-secure-admin').trim();
const ADMIN_PATH = RAW_ADMIN_PATH.replace(/^\/+|\/+$/g, '') || 'campusway-secure-admin';
const BROWSER_FP_KEY = 'campusway-browser-fingerprint';
const ACCESS_TOKEN_KEY = 'campusway-token';
const API_BASE_FROM_ENV = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = API_BASE_FROM_ENV || '/api';
const API_PROXY_TARGET = String(import.meta.env.VITE_API_PROXY_TARGET || '').trim();
const IS_PROD_BUILD = Boolean(import.meta.env.PROD);

if (IS_PROD_BUILD && !API_BASE_FROM_ENV) {
    throw new Error('VITE_API_BASE_URL is required in production builds.');
}

if (import.meta.env.DEV && !API_BASE_FROM_ENV && !API_PROXY_TARGET) {
    console.warn('[CampusWay] Neither VITE_API_BASE_URL nor VITE_API_PROXY_TARGET is configured. Falling back to /api.');
}

function resolveApiUrl(pathAfterApi: string): string {
    const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
    const normalizedPath = pathAfterApi.startsWith('/') ? pathAfterApi : `/${pathAfterApi}`;
    return `${normalizedBase}${normalizedPath}`;
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    withCredentials: true,
});

function ensureBrowserFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    const storage = window.localStorage;
    const existing = storage.getItem(BROWSER_FP_KEY);
    if (existing) return existing;

    const generated = (
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `fp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
    storage.setItem(BROWSER_FP_KEY, generated);
    return generated;
}

function emitForceLogout(reason: string): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('campusway:force-logout', { detail: { reason } }));
}

function writeAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearAccessToken(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function readAccessToken(): string {
    if (typeof window === 'undefined') return '';
    const fromSession = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (fromSession) return fromSession;
    const fromLocal = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (fromLocal) {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, fromLocal);
    }
    return fromLocal || '';
}

function resolveLoginRedirectPath(): string {
    if (typeof window === 'undefined') return '/login';
    const path = window.location.pathname;
    const isAdminContext = path.startsWith('/__cw_admin__') || path.startsWith('/admin') || path.startsWith('/campusway-secure-admin');
    if (isAdminContext) return '/__cw_admin__/login';

    if (path.startsWith('/chairman')) return '/chairman/login';

    return '/login';
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = axios
        .post<{ token?: string }>(resolveApiUrl('/auth/refresh'), {}, {
            timeout: 10000,
            withCredentials: true,
            headers: { 'X-Browser-Fingerprint': ensureBrowserFingerprint() },
        })
        .then((res) => {
            const nextToken = String(res.data?.token || '').trim();
            if (!nextToken) return null;
            writeAccessToken(nextToken);
            api.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
            return nextToken;
        })
        .catch(() => null)
        .finally(() => {
            refreshInFlight = null;
        });

    return refreshInFlight;
}

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = readAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Browser-Fingerprint'] = ensureBrowserFingerprint();
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const code = error.response?.data?.code;
        const hasToken = Boolean(readAccessToken());
        const originalConfig = error.config || {};
        const requestUrl = String(originalConfig.url || '');
        const isAuthRefreshCall = requestUrl.includes('/auth/refresh');
        const isLoginCall =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/admin/login') ||
            requestUrl.includes('/auth/chairman/login');
        const isVerify2faCall = requestUrl.includes('/auth/verify-2fa');
        const canRetry = !originalConfig.__isRetryRequest && !isAuthRefreshCall;

        if (status === 401 && hasToken) {
            if (code === 'SESSION_INVALIDATED' || code === 'LEGACY_TOKEN_NOT_ALLOWED') {
                emitForceLogout(code);
                return Promise.reject(error);
            }

            if (canRetry && !isLoginCall && !isVerify2faCall) {
                const nextToken = await refreshAccessToken();
                if (nextToken) {
                    originalConfig.__isRetryRequest = true;
                    originalConfig.headers = {
                        ...(originalConfig.headers || {}),
                        Authorization: `Bearer ${nextToken}`,
                        'X-Browser-Fingerprint': ensureBrowserFingerprint(),
                    };
                    return api(originalConfig);
                }
            }

            clearAccessToken();
            const path = window.location.pathname;
            const isLoginRoute = path.includes('/login');
            if (!isLoginRoute) {
                window.location.href = resolveLoginRedirectPath();
            }
        }
        return Promise.reject(error);
    }
);

export default api;

/* â”€â”€ Typed API helpers â”€â”€ */

export interface ApiUniversity {
    _id: string;
    name: string;
    shortForm: string;
    category: string;
    clusterGroup?: string;
    clusterId?: string | { _id?: string; name?: string } | null;
    established?: number;
    establishedYear?: number;
    address: string;
    contactNumber: string;
    email: string;
    website: string;
    websiteUrl?: string;
    admissionWebsite: string;
    admissionUrl?: string;
    totalSeats: string;
    scienceSeats: string;
    seatsScienceEng?: string;
    artsSeats: string;
    seatsArtsHum?: string;
    businessSeats: string;
    seatsBusiness?: string;
    description?: string;
    shortDescription?: string;
    logoUrl?: string;
    heroImageUrl?: string;
    isAdmissionOpen: boolean;
    isActive: boolean;
    featured?: boolean;
    featuredOrder?: number;
    verificationStatus?: string;
    remarks?: string;
    applicationStart?: string;
    applicationEnd?: string;
    applicationStartDate?: string;
    applicationEndDate?: string;
    scienceExamDate?: string;
    examDateScience?: string;
    artsExamDate?: string;
    examDateArts?: string;
    businessExamDate?: string;
    examDateBusiness?: string;
    minGpa?: number;
    requiredBackground?: string;
    requiredDocuments?: string[];
    specialQuota?: string;
    ageLimit?: string;
    additionalNotes?: string;
    slug: string;
    unitLayout?: 'compact' | 'stacked' | 'carousel';
    units: ApiUnit[];
    examCenters: ApiExamCenter[];
    faqs?: ApiFaq[];
    notices?: ApiNotice[];
    applicationSteps?: ApiStep[];
    relatedUniversities?: ApiRelated[];
    socialLinks?: ApiSocialLink[];
}

export interface ApiUnit {
    id: string;
    name: string;
    seats: number;
    examDate: string;
    applicationStart: string;
    applicationEnd: string;
    examCenters: ApiExamCenter[];
    notes?: string;
}

export interface ApiExamCenter { city: string; address: string; mapUrl?: string; }
export interface ApiFaq { q: string; a: string; department?: string; }
export interface ApiNotice {
    title: string;
    description?: string;
    isImportant: boolean;
    publishDate: string;
    expiryDate?: string;
    fileUrl?: string;
    link?: string;
}
export interface ApiStep { order: number; title: string; description: string; icon?: string; }
export interface ApiRelated { name: string; shortForm: string; slug: string; category: string; }
export interface ApiSocialLink { platform: string; url: string; }

export interface ApiServiceConfig {
    heroTitle: string;
    heroSubtitle: string;
    heroBannerImage: string;
    ctaText: string;
    ctaLink: string;
}

export interface ApiUser {
    _id: string;
    username: string;
    email: string;
    role: string;
    fullName: string;
    phone_number?: string;
    profile_photo?: string;
    roll_number?: string;
    registration_id?: string;
    institution_name?: string;
    permissions?: {
        canEditExams: boolean;
        canManageStudents: boolean;
        canViewReports: boolean;
        canDeleteData: boolean;
        canManageFinance?: boolean;
        canManagePlans?: boolean;
        canManageTickets?: boolean;
        canManageBackups?: boolean;
        canRevealPasswords?: boolean;
    };
    isActive?: boolean;
    status?: string;
    emailVerified?: boolean;
    loginAttempts?: number;
    createdAt?: string;
    updatedAt?: string;
    lastLogin?: string;
    ip_address?: string;
    device_info?: string;
    user_unique_id?: string;
    admittedAt?: string;
    groupIds?: string[];
    subscription?: {
        plan?: string;
        planCode?: string;
        planName?: string;
        isActive?: boolean;
        startDate?: string | null;
        expiryDate?: string | null;
        daysLeft?: number;
    };
}

export interface AdminStudentGroup {
    _id: string;
    name: string;
    slug: string;
    batchTag?: string;
    description?: string;
    isActive: boolean;
    studentCount: number;
    type: 'manual' | 'dynamic';
    rules?: {
        batches?: string[];
        sscBatches?: string[];
        departments?: string[];
        statuses?: string[];
        planCodes?: string[];
        profileScoreRange?: { min?: number; max?: number };
    };
    meta?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface AdminSubscriptionPlan {
    _id: string;
    code: string;
    name: string;
    type: 'free' | 'paid';
    priceBDT: number;
    durationDays: number;
    durationValue: number;
    durationUnit: 'days' | 'months';
    price: number;
    bannerImageUrl?: string | null;
    shortDescription?: string;
    description?: string;
    features: string[];
    tags?: string[];
    includedModules: string[];
    enabled?: boolean;
    isActive: boolean;
    isFeatured?: boolean;
    displayOrder?: number;
    priority: number;
    sortOrder: number;
    contactCtaLabel?: string;
    contactCtaUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type SubscriptionPlanPublic = AdminSubscriptionPlan;

export interface UserSubscriptionStatus {
    status: 'active' | 'expired' | 'pending' | 'none' | 'suspended';
    planName?: string;
    expiresAtUTC?: string | null;
    daysLeft?: number | null;
    planId?: string | null;
    isActive?: boolean;
    startAtUTC?: string | null;
    subscription?: Record<string, unknown>;
}

export interface SubscriptionPlansPublicSettings {
    pageTitle?: string;
    pageSubtitle?: string;
    headerBannerUrl?: string | null;
    defaultPlanBannerUrl?: string | null;
    currencyLabel?: string;
    showFeaturedFirst?: boolean;
}

export interface SubscriptionAssignmentPayload {
    userId: string;
    planId: string;
    status?: 'active' | 'expired' | 'pending' | 'suspended';
    startAtUTC?: string;
    expiresAtUTC?: string;
    notes?: string;
}

export interface ApiWebsiteSettings {
    websiteName: string;
    siteName?: string;
    logo?: string;
    logoUrl?: string;
    favicon?: string;
    motto?: string;
    metaTitle?: string;
    metaDescription?: string;
    contactEmail?: string;
    contactPhone?: string;
    socialLinks?: {
        facebook?: string;
        whatsapp?: string;
        messenger?: string;
        telegram?: string;
        twitter?: string;
        youtube?: string;
        instagram?: string;
    };
    socialLinksList?: PublicSocialLinkItem[];
    theme?: {
        modeDefault?: 'light' | 'dark' | 'system';
        allowSystemMode?: boolean;
        switchVariant?: 'default' | 'pro';
        animationLevel?: 'none' | 'subtle' | 'rich';
        brandGradients?: string[];
    };
    socialUi?: {
        clusterEnabled?: boolean;
        buttonVariant?: 'default' | 'squircle';
        showLabels?: boolean;
        platformOrder?: Array<'facebook' | 'whatsapp' | 'messenger' | 'telegram' | 'twitter' | 'youtube' | 'instagram'>;
    };
    pricingUi?: {
        currencyCode?: string;
        currencySymbol?: string;
        currencyLocale?: string;
        displayMode?: 'symbol' | 'code';
        thousandSeparator?: boolean;
    };
    subscriptionPageTitle?: string;
    subscriptionPageSubtitle?: string;
    subscriptionDefaultBannerUrl?: string;
    subscriptionLoggedOutCtaMode?: 'login' | 'contact';
}

export interface PublicSocialLinkItem {
    id: string;
    platformName: string;
    targetUrl: string;
    iconUploadOrUrl: string;
    description: string;
    enabled: boolean;
    placements: Array<'header' | 'footer' | 'home' | 'news' | 'contact'>;
}

export interface AdminDashboardSummary {
    universities: { total: number; active: number; featured: number };
    home: { highlightedCategories: number; featuredUniversities: number; enabledSections: number };
    news: { pendingReview: number; publishedToday: number };
    exams: { upcoming: number; live: number };
    questionBank: { totalQuestions: number };
    students: { totalActive: number; pendingPayment: number; suspended: number };
    payments: { pendingApprovals: number; paidToday: number };
    supportCenter: { unreadMessages: number };
    systemStatus: { db: 'connected' | 'down'; timeUTC: string };
}

export type HomeAnimationLevel = 'off' | 'minimal' | 'normal';
export type HomeLockedExamVisibility = 'show_locked' | 'hide';
export type UniversityCardDensity = 'compact' | 'comfortable';
export type UniversityCardSort = 'nearest_deadline' | 'alphabetical' | 'name_asc' | 'name_desc' | 'closing_soon' | 'exam_soon';

export interface HomeLinkItem {
    label: string;
    url: string;
}

export interface HomeCta {
    label: string;
    url: string;
}

export interface HomeShortcutChip {
    label: string;
    actionType: 'route' | 'search' | 'external';
    actionValue: string;
}

export interface HomeAdsSection {
    enabled: boolean;
    title: string;
}

export interface HomeUniversityCardConfig {
    defaultUniversityLogo: string;
    showExamCentersPreview: boolean;
    closingSoonDays: number;
    showAddress: boolean;
    showEmail: boolean;
    showSeats: boolean;
    showApplicationProgress: boolean;
    showExamDates: boolean;
    showExamCenters: boolean;
    cardDensity: UniversityCardDensity;
    defaultSort: UniversityCardSort;
}

export interface HomeSettingsConfig {
    sectionVisibility: {
        hero: boolean;
        subscriptionBanner: boolean;
        stats: boolean;
        timeline: boolean;
        universityDashboard: boolean;
        closingExamWidget: boolean;
        examsWidget: boolean;
        newsPreview: boolean;
        resourcesPreview: boolean;
        socialStrip: boolean;
        adsSection: boolean;
        footer: boolean;
    };
    hero: {
        pillText: string;
        title: string;
        subtitle: string;
        showSearch: boolean;
        searchPlaceholder: string;
        showNextDeadlineCard: boolean;
        primaryCTA: HomeCta;
        secondaryCTA: HomeCta;
        heroImageUrl: string;
        shortcutChips: HomeShortcutChip[];
    };
    universityPreview: {
        enabled: boolean;
        useHighlightedCategoriesOnly: boolean;
        defaultActiveCategory: string;
        enableClusterFilter: boolean;
        maxFeaturedItems: number;
        maxDeadlineItems: number;
        maxExamItems: number;
        deadlineWithinDays: number;
        examWithinDays: number;
        featuredMode: 'manual' | 'auto';
    };
    subscriptionBanner: {
        enabled: boolean;
        title: string;
        subtitle: string;
        loginMessage: string;
        noPlanMessage: string;
        activePlanMessage: string;
        bannerImageUrl: string;
        primaryCTA: HomeCta;
        secondaryCTA: HomeCta;
        showPlanCards: boolean;
        planIdsToShow: string[];
    };
    topBanner: {
        enabled: boolean;
        imageUrl: string;
        linkUrl: string;
    };
    middleBanner: {
        enabled: boolean;
        imageUrl: string;
        linkUrl: string;
    };
    bottomBanner: {
        enabled: boolean;
        imageUrl: string;
        linkUrl: string;
    };
    adsSection: HomeAdsSection;
    stats: {
        enabled: boolean;
        title: string;
        subtitle: string;
        items: Array<{ key: string; label: string; enabled: boolean }>;
    };
    timeline: {
        enabled: boolean;
        title: string;
        subtitle: string;
        closingSoonDays: number;
        examSoonDays: number;
        maxClosingItems: number;
        maxExamItems: number;
    };
    universityDashboard: {
        enabled: boolean;
        title: string;
        subtitle: string;
        showFilters: boolean;
        defaultCategory: string;
        showAllCategories?: boolean;
        showPlaceholderText: boolean;
        placeholderNote: string;
    };
    universityCardConfig: HomeUniversityCardConfig;
    highlightedCategories: Array<{
        category: string;
        order: number;
        enabled: boolean;
        badgeText?: string;
    }>;
    featuredUniversities: Array<{
        universityId: string;
        order: number;
        badgeText: string;
        enabled: boolean;
    }>;
    closingExamWidget: {
        enabled: boolean;
        title: string;
        subtitle: string;
        maxClosing: number;
        maxExamsThisWeek: number;
    };
    examsWidget: {
        enabled: boolean;
        title: string;
        subtitle: string;
        maxLive: number;
        maxUpcoming: number;
        showLockedExamsToUnsubscribed: HomeLockedExamVisibility;
        loginRequiredText: string;
        subscriptionRequiredText: string;
    };
    newsPreview: {
        enabled: boolean;
        title: string;
        subtitle: string;
        maxItems: number;
        ctaLabel: string;
        ctaUrl: string;
    };
    resourcesPreview: {
        enabled: boolean;
        title: string;
        subtitle: string;
        maxItems: number;
        ctaLabel: string;
        ctaUrl: string;
    };
    socialStrip: {
        enabled: boolean;
        title: string;
        subtitle: string;
        ctaLabel: string;
    };
    footer: {
        enabled: boolean;
        aboutText: string;
        quickLinks: HomeLinkItem[];
        contactInfo: { email: string; phone: string; address: string };
        legalLinks: HomeLinkItem[];
    };
    campaignBanners?: {
        enabled: boolean;
        title: string;
        subtitle: string;
        autoRotateInterval: number;
    };
    ui: {
        animationLevel: HomeAnimationLevel;
    };
}

export interface HomeTimelineItem {
    id: string;
    name: string;
    shortForm: string;
    slug: string;
    unit: string;
    dateIso: string;
    daysLeft: number;
    countdownLabel: string;
    badgeTone: 'danger' | 'warning' | 'info' | 'success';
    source: 'university' | 'exam';
    university?: ApiUniversityCardPreview;
}

export interface HomeExamWidgetItem {
    id: string;
    title: string;
    subject: string;
    status: string;
    startDate: string;
    endDate: string;
    durationMinutes: number;
    isLocked: boolean;
    lockReason: 'none' | 'login_required' | 'subscription_required';
    canJoin: boolean;
    joinUrl: string;
}

export interface ApiUniversityCardPreview {
    id: string;
    name: string;
    shortForm: string;
    slug: string;
    category: string;
    clusterGroup?: string;
    contactNumber: string;
    established: number | null;
    address: string;
    email: string;
    website: string;
    admissionWebsite: string;
    totalSeats: string;
    scienceSeats: string;
    artsSeats: string;
    businessSeats: string;
    applicationStart: string;
    applicationEnd: string;
    applicationStartDate: string;
    applicationEndDate: string;
    scienceExamDate: string;
    artsExamDate: string;
    businessExamDate: string;
    examDateScience: string;
    examDateArts: string;
    examDateBusiness: string;
    examCentersPreview: string[];
    shortDescription: string;
    logoUrl: string;
    badgeText?: string;
    featured?: boolean;
}


export interface HomeApiResponse {
    homeSettings: HomeSettingsConfig;
    globalSettings: {
        websiteName: string;
        logoUrl: string;
        motto: string;
        contactEmail: string;
        contactPhone: string;
        theme: Record<string, unknown>;
        socialLinks: {
            facebook?: string;
            whatsapp?: string;
            messenger?: string;
            telegram?: string;
            twitter?: string;
            youtube?: string;
            instagram?: string;
        };
    };
    siteSettings?: {
        websiteName: string;
        logoUrl: string;
        motto?: string;
        contactEmail?: string;
        contactPhone?: string;
        socialLinks: {
            facebook?: string;
            whatsapp?: string;
            messenger?: string;
            telegram?: string;
            twitter?: string;
            youtube?: string;
            instagram?: string;
        };
    };
    subscriptionPlans: AdminSubscriptionPlan[];
    subscriptionBannerState: {
        loggedIn: boolean;
        hasActivePlan: boolean;
        expiry: string | null;
        reason: string;
    };
    stats: {
        values: Record<string, number>;
        items: Array<{ key: string; label: string; enabled: boolean; value: number }>;
    };
    timeline: {
        serverNow: string;
        closingSoonItems: HomeTimelineItem[];
        examSoonItems: HomeTimelineItem[];
    };
    universityCategories?: Array<{
        categoryName: string;
        count: number;
        clusterGroups: string[];
    }>;
    featuredUniversities?: ApiUniversityCardPreview[];
    deadlineUniversities?: ApiUniversityCardPreview[];
    upcomingExamUniversities?: ApiUniversityCardPreview[];
    uniSettings?: {
        enableClusterFilterOnHome: boolean;
        defaultCategory: string;
    };
    universityDashboardData: {
        categories: Array<{ key: string; label: string; count: number; isHighlighted?: boolean; badgeText?: string }>;
        filtersMeta: {
            totalItems: number;
            statuses: Array<{ value: string; label: string; count: number }>;
            defaultCategory: string;
            showFilters: boolean;
            defaultSort?: UniversityCardSort;
            clusterGroups?: string[];
        };
        highlightedCategories?: Array<{ category: string; order: number; badgeText?: string }>;
        featuredItems?: ApiUniversityCardPreview[];
        itemsPreview: ApiUniversityCardPreview[];
    };
    examsWidget: {
        liveNow: HomeExamWidgetItem[];
        upcoming: HomeExamWidgetItem[];
    };
    onlineExamsPreview?: {
        loggedIn: boolean;
        hasActivePlan: boolean;
        liveNow: HomeExamWidgetItem[];
        upcoming: HomeExamWidgetItem[];
        items: HomeExamWidgetItem[];
    };
    newsPreview: ApiNews[];
    newsPreviewItems?: ApiNews[];
    resourcesPreview: Array<{
        _id: string;
        title: string;
        description?: string;
        type?: string;
        fileUrl?: string;
        externalUrl?: string;
        thumbnailUrl?: string;
        category?: string;
        isFeatured?: boolean;
        publishDate?: string;
    }>;
    resourcePreviewItems?: Array<{
        _id: string;
        title: string;
        description?: string;
        type?: string;
        fileUrl?: string;
        externalUrl?: string;
        thumbnailUrl?: string;
        category?: string;
        isFeatured?: boolean;
        publishDate?: string;
    }>;
    campaignBannersActive?: Array<{
        _id: string;
        title?: string;
        subtitle?: string;
        imageUrl: string;
        mobileImageUrl?: string;
        linkUrl?: string;
        altText?: string;
    }>;
    sectionOrder?: Array<{
        id: string;
        title: string;
        order: number;
    }>;
    contentBlocksForHome?: Array<{
        _id: string;
        type: string;
        title?: string;
        body?: string;
        imageUrl?: string;
        ctaLabel?: string;
        ctaUrl?: string;
        placements: string[];
        priority?: number;
        dismissible?: boolean;
    }>;
    socialLinks: {
        facebook?: string;
        whatsapp?: string;
        messenger?: string;
        telegram?: string;
        twitter?: string;
        youtube?: string;
        instagram?: string;
    };
}

export interface AdminStudentItem {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    status: string;
    userUniqueId: string;
    phoneNumber: string;
    batch: string;
    ssc_batch: string;
    department: string;
    guardianName: string;
    guardianNumber: string;
    rollNumber: string;
    registrationNumber: string;
    admittedAt: string;
    groupIds: string[];
    groups: AdminStudentGroup[];
    profileScore: number;
    profileScoreBreakdown?: Array<{
        key: string;
        label: string;
        weight: number;
        earned: number;
        completed: boolean;
    }>;
    missingProfileFields?: string[];
    paymentStatus?: 'pending' | 'paid' | 'clear';
    pendingDue?: number;
    paymentSummary?: {
        totalPaid: number;
        paymentCount: number;
        lastPaymentAt?: string | null;
        lastMethod?: string;
    };
    subscription: {
        planCode: string;
        planName: string;
        isActive: boolean;
        startDate?: string | null;
        expiryDate?: string | null;
        daysLeft: number;
    };
    examStats: {
        totalAttempts: number;
        avgPercentage: number;
        bestPercentage: number;
        lastSubmittedAt?: string | null;
    };
}

export interface AdminStudentExamItem {
    resultId: string;
    examId: string;
    examTitle: string;
    subject: string;
    attemptNo: number;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    rank: number | null;
    status: string;
    submittedAt: string;
    resultPublished: boolean;
    publishDate?: string | null;
    hasWrittenAttachment: boolean;
    writtenAttachmentCount: number;
}

export interface AdminUserStreamEvent {
    type:
    | 'user_created'
    | 'user_updated'
    | 'user_deleted'
    | 'user_status_changed'
    | 'user_role_changed'
    | 'user_permissions_changed'
    | 'bulk_user_action'
    | 'students_imported';
    userId?: string;
    actorId?: string;
    timestamp: string;
    meta?: Record<string, unknown>;
}

export interface AdminSecuritySettings {
    singleBrowserLogin: boolean;
    forceLogoutOnNewLogin: boolean;
    enable2faAdmin: boolean;
    enable2faStudent: boolean;
    force2faSuperAdmin: boolean;
    default2faMethod: 'email' | 'sms' | 'authenticator';
    otpExpiryMinutes: number;
    maxOtpAttempts: number;
    ipChangeAlert: boolean;
    allowLegacyTokens: boolean;
    strictExamTabLock: boolean;
    strictTokenHashValidation: boolean;
}

export interface SecurityCenterSettings {
    passwordPolicy: {
        minLength: number;
        requireNumber: boolean;
        requireUppercase: boolean;
        requireSpecial: boolean;
    };
    loginProtection: {
        maxAttempts: number;
        lockoutMinutes: number;
        recaptchaEnabled: boolean;
    };
    session: {
        accessTokenTTLMinutes: number;
        refreshTokenTTLDays: number;
        idleTimeoutMinutes: number;
    };
    adminAccess: {
        require2FAForAdmins: boolean;
        allowedAdminIPs: string[];
        adminPanelEnabled: boolean;
    };
    siteAccess: {
        maintenanceMode: boolean;
        blockNewRegistrations: boolean;
    };
    examProtection: {
        maxActiveSessionsPerUser: number;
        logTabSwitch: boolean;
        requireProfileScoreForExam: boolean;
        profileScoreThreshold: number;
    };
    logging: {
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        logLoginFailures: boolean;
        logAdminActions: boolean;
    };
    rateLimit: {
        loginWindowMs: number;
        loginMax: number;
        examSubmitWindowMs: number;
        examSubmitMax: number;
        adminWindowMs: number;
        adminMax: number;
        uploadWindowMs: number;
        uploadMax: number;
    };
    twoPersonApproval: {
        enabled: boolean;
        riskyActions: Array<
            | 'students.bulk_delete'
            | 'universities.bulk_delete'
            | 'news.bulk_delete'
            | 'exams.publish_result'
            | 'news.publish_breaking'
            | 'payments.mark_refunded'
        >;
        approvalExpiryMinutes: number;
    };
    retention: {
        enabled: boolean;
        examSessionsDays: number;
        auditLogsDays: number;
        eventLogsDays: number;
    };
    panic: {
        readOnlyMode: boolean;
        disableStudentLogins: boolean;
        disablePaymentWebhooks: boolean;
        disableExamStarts: boolean;
    };
    updatedBy?: string | null;
    updatedAt?: string | null;
}

export interface AdminActionApproval {
    _id: string;
    actionKey: string;
    module: string;
    action: string;
    routePath: string;
    method: string;
    paramsSnapshot?: Record<string, unknown>;
    querySnapshot?: Record<string, unknown>;
    payloadSnapshot?: Record<string, unknown>;
    initiatedBy?: {
        _id?: string;
        username?: string;
        email?: string;
        full_name?: string;
        role?: string;
    } | string;
    initiatedByRole: string;
    initiatedAt: string;
    expiresAt: string;
    secondApprover?: {
        _id?: string;
        username?: string;
        email?: string;
        full_name?: string;
        role?: string;
    } | string | null;
    secondApproverRole?: string | null;
    status: 'pending_second_approval' | 'approved' | 'rejected' | 'executed' | 'expired';
    decisionReason?: string | null;
    decidedAt?: string | null;
    executedAt?: string | null;
    executionMeta?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface AdminJobRunItem {
    _id: string;
    jobName: string;
    startedAt: string;
    endedAt?: string | null;
    durationMs?: number | null;
    status: 'running' | 'success' | 'failed';
    summary?: Record<string, unknown>;
    errorMessage?: string;
    errorStackSnippet?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminJobHealthSnapshot {
    hours: number;
    totals: {
        success: number;
        failed: number;
        running: number;
    };
    byJob: Array<{
        jobName: string;
        success: number;
        failed: number;
        running: number;
        lastRunAt?: string;
    }>;
}

export interface AdminFeatureFlags {
    studentDashboardV2: boolean;
    studentManagementV2: boolean;
    subscriptionEngineV2: boolean;
    examShareLinks: boolean;
    proctoringSignals: boolean;
    aiQuestionSuggestions: boolean;
    pushNotifications: boolean;
    strictExamTabLock: boolean;
    webNextEnabled: boolean;
    trainingMode?: boolean;
    requireDeleteKeywordConfirm?: boolean;
}

export interface NotificationAutomationSettings {
    examStartsSoon: { enabled: boolean; hoursBefore: number[] };
    applicationClosingSoon: { enabled: boolean; hoursBefore: number[] };
    paymentPendingReminder: { enabled: boolean; hoursBefore: number[] };
    resultPublished: { enabled: boolean; hoursBefore: number[] };
    profileScoreGate: { enabled: boolean; hoursBefore: number[]; minScore: number };
    templates: {
        languageMode: 'bn' | 'en' | 'mixed';
        examStartsSoon: string;
        applicationClosingSoon: string;
        paymentPendingReminder: string;
        resultPublished: string;
        profileScoreGate: string;
    };
}

export interface AnalyticsSettings {
    enabled: boolean;
    trackAnonymous: boolean;
    retentionDays: number;
    eventToggles: {
        universityApplyClick: boolean;
        universityOfficialClick: boolean;
        newsView: boolean;
        newsShare: boolean;
        resourceDownload: boolean;
        examViewed: boolean;
        examStarted: boolean;
        examSubmitted: boolean;
        subscriptionPlanView: boolean;
        subscriptionPlanClick: boolean;
        supportTicketCreated: boolean;
    };
}

export interface AdminReportsSummary {
    range: { from: string; to: string };
    dailyNewStudents: Array<{ date: string; count: number }>;
    activeSubscriptions: number;
    payments: { receivedAmount: number; receivedCount: number; pendingCount: number };
    exams: { attempted: number; submitted: number };
    topNewsSources: Array<{ source: string; count: number }>;
    supportTickets: { opened: number; resolved: number };
    resourceDownloads: { eventCount: number; totalCounter: number };
}

export interface AnalyticsOverview {
    range: { from: string; to: string };
    totals: { totalEvents: number; uniqueSessions: number; uniqueUsers: number };
    topEvents: Array<{ eventName: string; count: number }>;
    dailySeries: Array<{ date: string; count: number }>;
    funnel: { viewed: number; started: number; submitted: number };
}

export interface ExamInsightsReport {
    examId: string;
    totalResults: number;
    questionWiseAccuracy: Array<{
        questionId: string;
        question: string;
        subject: string;
        topic: string;
        attempts: number;
        correct: number;
        accuracy: number;
    }>;
    topicWeakness: Array<{ topic: string; attempts: number; accuracy: number }>;
    timeTakenDistribution: Record<string, number>;
    topScorers: Array<{
        studentId: string;
        name: string;
        percentage: number;
        obtainedMarks: number;
        totalMarks: number;
    }>;
    suspiciousActivity: Array<{ studentId: string; tabSwitchCount: number; cheatFlags: number }>;
}

export interface AdminRuntimeSettings {
    security: AdminSecuritySettings;
    featureFlags: AdminFeatureFlags;
    updatedAt?: string | null;
    updatedBy?: string | null;
    runtimeVersion?: number;
}

export interface AdminSecuritySessionItem {
    _id: string;
    user_id?: {
        _id: string;
        username: string;
        full_name?: string;
        email?: string;
        role?: string;
    } | string;
    session_id: string;
    browser_fingerprint?: string;
    ip_address?: string;
    device_type?: string;
    login_time: string;
    last_activity: string;
    status: 'active' | 'terminated';
    terminated_reason?: string;
    terminated_at?: string;
}

export interface AdminTwoFactorUserItem {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    twoFactorEnabled: boolean;
    two_factor_method?: 'email' | 'sms' | 'authenticator' | null;
    lastLogin?: string | null;
}

export interface AdminTwoFactorFailureItem {
    _id: string;
    userId: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    reason: string;
    ip_address: string;
    device_info: string;
    createdAt: string;
}

export interface StudentDashboardStreamEvent {
    type:
    | 'exam_updated'
    | 'notification_updated'
    | 'featured_university_updated'
    | 'profile_updated'
    | 'dashboard_config_updated';
    timestamp: string;
    meta?: Record<string, unknown>;
}

export interface ApiService {
    _id: string;
    // V2 schema fields
    title_bn: string;
    title_en: string;
    description_bn: string;
    description_en: string;
    icon_url?: string;
    banner_image?: string;
    category?: ApiServiceCategory;
    is_active: boolean;
    is_featured: boolean;
    display_order: number;
    button_text?: string;
    button_link?: string;
    // Legacy/compatibility aliases still used by some pages/components
    service_title?: string;
    service_slug?: string;
    short_description?: string;
    full_description?: string;
    service_icon?: string;
    featured?: boolean;
    external_link?: string;
    seo_meta?: {
        title?: string;
        description?: string;
        canonical?: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiServiceCategory {
    _id: string;
    name_bn: string;
    name_en: string;
    name?: string;
    slug?: string;
    icon?: string;
    status: 'active' | 'inactive';
    order_index: number;
    createdAt?: string;
    updatedAt?: string;
}


export interface ApiNewsCategory {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiNews {
    _id: string;
    title: string;
    slug: string;
    shortSummary?: string;
    shortDescription: string;
    fullContent?: string;
    content: string;
    featuredImage?: string;
    coverImage?: string;
    coverImageUrl?: string;
    coverImageSource?: 'rss' | 'admin' | 'default';
    coverSource?: 'rss' | 'admin' | 'default';
    category: string;
    tags: string[];
    isPublished: boolean;
    status: 'published' | 'draft' | 'archived' | 'pending_review' | 'duplicate_review' | 'approved' | 'rejected' | 'scheduled' | 'fetch_failed';
    isFeatured: boolean;
    publishDate: string;
    publishedAt?: string;
    scheduleAt?: string;
    sourceType?: 'manual' | 'rss' | 'ai_assisted';
    sourceId?: string;
    sourceName?: string;
    sourceIconUrl?: string;
    sourceUrl?: string;
    originalArticleUrl?: string;
    originalLink?: string;
    rssGuid?: string;
    rssPublishedAt?: string;
    rssRawTitle?: string;
    rssRawDescription?: string;
    rssRawContent?: string;
    fetchedFullText?: boolean;
    fetchedFullTextAt?: string;
    thumbnailImage?: string;
    fallbackBanner?: string;
    aiUsed?: boolean;
    aiSelected?: boolean;
    isAiSelected?: boolean;
    aiModel?: string;
    aiPromptVersion?: string;
    aiLanguage?: string;
    aiGeneratedAt?: string;
    aiNotes?: string;
    isManual?: boolean;
    scheduledAt?: string;
    shareCount?: number;
    shareUrl?: string;
    shareText?: {
        whatsapp?: string;
        facebook?: string;
        messenger?: string;
        telegram?: string;
    };
    shareLinks?: {
        whatsapp?: string;
        facebook?: string;
        messenger?: string;
        telegram?: string;
    };
    aiMeta?: {
        provider?: string;
        model?: string;
        promptVersion?: string;
        confidence?: number;
        citations?: string[];
        noHallucinationPassed?: boolean;
        warning?: string;
    };
    reviewMeta?: {
        reviewerId?: { _id: string; fullName: string; email: string };
        reviewedAt?: string;
        rejectReason?: string;
    };
    dedupe?: {
        hash?: string;
        duplicateScore?: number;
        duplicateOfNewsId?: string;
        duplicateFlag?: boolean;
    };
    duplicateKeyHash?: string;
    duplicateOfNewsId?: string;
    duplicateReasons?: string[];
    createdByAdminId?: string;
    approvedByAdminId?: string;
    shareMeta?: {
        canonicalUrl?: string;
        shortUrl?: string;
        templateId?: string;
        lastChannel?: string;
        lastSharedAt?: string;
    };
    appearanceOverrides?: {
        layoutMode?: 'rss_reader' | 'grid' | 'list';
        showSourceIcons?: boolean;
        showShareButtons?: boolean;
        animationLevel?: 'none' | 'subtle' | 'rich';
        cardDensity?: 'compact' | 'comfortable';
    };
    auditVersion?: number;
    createdBy?: { _id: string; fullName: string; email: string };
    seoTitle?: string;
    seoDescription?: string;
    views: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiNewsPublicSource {
    _id: string;
    name: string;
    rssUrl: string;
    siteUrl?: string;
    iconUrl?: string;
    count: number;
    categoryTags: string[];
    priority: number;
}

export interface ApiNewsPublicSettings {
    newsPageTitle?: string;
    newsPageSubtitle?: string;
    pageTitle: string;
    pageSubtitle: string;
    headerBannerUrl: string;
    defaultBannerUrl: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    appearance: ApiNewsV2Settings['appearance'];
    shareTemplates: {
        whatsapp?: string;
        facebook?: string;
        messenger?: string;
        telegram?: string;
    };
    shareButtons: {
        whatsapp?: boolean;
        facebook?: boolean;
        messenger?: boolean;
        telegram?: boolean;
        copyLink?: boolean;
        copyText?: boolean;
    };
    workflow?: {
        allowScheduling?: boolean;
        openOriginalWhenExtractionIncomplete?: boolean;
    };
}

export interface ApiExam {
    _id: string;
    title: string;
    description?: string;
    subject?: string;
    subjectBn?: string;
    universityNameBn?: string;
    examType?: 'mcq_only' | 'written_optional';
    duration: number;
    totalMarks: number;
    totalQuestions: number;
    isPublished?: boolean;
    randomizeQuestions: boolean;
    autoSubmitOnTimeout: boolean;
    allowBackNavigation?: boolean;
    showQuestionPalette?: boolean;
    showRemainingTime?: boolean;
    negativeMarking?: boolean;
    negativeMarkValue?: number;
    answerEditLimitPerQuestion?: number;
    instructions?: string;
    require_instructions_agreement?: boolean;
    security_policies?: {
        tab_switch_limit?: number;
        copy_paste_violations?: number;
        camera_enabled?: boolean;
        require_fullscreen?: boolean;
        auto_submit_on_violation?: boolean;
        violation_action?: 'warn' | 'submit' | 'lock';
    };
    startDate: string;
    endDate: string;
    attemptLimit?: number;
    group_category?: string;
    groupNames?: string[];
    autosave_interval_sec?: number;
    autosaveIntervalSec?: number;
    deliveryMode?: 'internal' | 'external_link';
    bannerSource?: 'upload' | 'url' | 'default';
    resultPublishMode?: 'immediate' | 'manual' | 'scheduled';
    resultPublishDate?: string;
    reviewSettings?: {
        showQuestion?: boolean;
        showSelectedAnswer?: boolean;
        showCorrectAnswer?: boolean;
        showExplanation?: boolean;
        showSolutionImage?: boolean;
    };
    certificateSettings?: {
        enabled?: boolean;
        minPercentage?: number;
        passOnly?: boolean;
        templateVersion?: string;
    };
    bannerImageUrl?: string;
    bannerAltText?: string;
    logoUrl?: string;
    share_link?: string;
    shareUrl?: string;
    statusBadge?: 'upcoming' | 'live' | 'completed' | 'draft';
    totalParticipants?: number;
    attemptedUsers?: number;
    remainingUsers?: number;
    activeUsers?: number;
    windows?: any[]; // optional schedule array
}

export interface AdminExamCard extends ApiExam {
    statusBadge: 'upcoming' | 'live' | 'completed' | 'draft';
    groupNames: string[];
    shareUrl?: string;
    totalParticipants: number;
    attemptedUsers: number;
    remainingUsers: number;
    activeUsers: number;
}

export type PublicExamLockReason =
    | 'none'
    | 'login_required'
    | 'subscription_required'
    | 'group_restricted'
    | 'plan_restricted';

export interface PublicExamListItem {
    id: string;
    serialNo: number;
    title: string;
    title_bn?: string;
    subject: string;
    examCategory: string;
    bannerImageUrl?: string;
    startDate: string;
    endDate: string;
    durationMinutes: number;
    status: 'live' | 'upcoming' | 'ended';
    deliveryMode: 'internal' | 'external_link';
    isLocked: boolean;
    lockReason: PublicExamLockReason;
    canOpenDetails: boolean;
    canStart: boolean;
    joinUrl: string | null;
    contactAdmin: {
        phone: string;
        whatsapp: string;
        messageTemplate: string;
    };
    subscriptionRequired: boolean;
    paymentRequired: boolean;
    attemptLimit: number;
    allowReAttempt: boolean;
    myAttemptStatus?: 'not_started' | 'in_progress' | 'submitted';
}

export interface StudentUpcomingExam {
    _id: string;
    title: string;
    universityNameBn: string;
    subject: string;
    subjectBn: string;
    examDateTime: string;
    startDate: string;
    endDate: string;
    duration: number;
    daysRemaining: number;
    examType: 'mcq_only' | 'written_optional';
    maxAttemptsAllowed: number;
    attemptsUsed: number;
    attemptsLeft: number;
    negativeMarking: boolean;
    negativeMarkValue: number;
    bannerImageUrl: string;
    logoUrl: string;
    groupName?: string;
    shareUrl?: string;
    totalParticipants?: number;
    attemptedUsers?: number;
    remainingUsers?: number;
    activeUsers?: number;
    statusBadge?: string;
    subscriptionRequired?: boolean;
    subscriptionActive?: boolean;
    accessDeniedReason?: 'access_group_restricted' | 'access_plan_restricted' | 'access_user_restricted' | 'subscription_required' | string;
    status: 'upcoming' | 'live' | 'completed' | 'closed';
    canTakeExam: boolean;
    externalExamUrl: string;
}

export interface StudentFeaturedUniversity {
    _id: string;
    name: string;
    shortDescription: string;
    logoUrl: string;
    slug: string;
    featuredOrder: number;
    link: string;
}

export interface StudentNotificationItem {
    _id: string;
    title: string;
    message: string;
    category: 'general' | 'exam' | 'update';
    publishAt: string;
    expireAt?: string | null;
    linkUrl?: string;
    attachmentUrl?: string;
}

export interface StudentLiveAlertItem {
    id: string;
    type: 'exam_soon' | 'application_closing' | 'payment_pending' | 'result_published';
    title: string;
    message: string;
    dateIso: string;
    severity: 'info' | 'warning' | 'danger' | 'success';
    ctaLabel: string;
    ctaUrl: string;
}

export interface StudentDashboardProfileSection {
    userId: string;
    userUniqueId: string;
    name: string;
    email: string;
    profilePicture: string;
    profileCompletionPercentage: number;
    profileCompletionThreshold: number;
    isProfileEligible: boolean;
    overallRank: number | null;
    welcomeMessage: string;
    guardian_phone_verification_status: 'unverified' | 'pending' | 'verified';
    guardian_phone_verified_at: string | null;
    missingFields: string[];
    subscription: {
        isActive: boolean;
        planName: string;
        expiryDate: string | null;
    };
    groupRank: number | null;
    profile: {
        phone: string;
        guardian_phone: string;
        ssc_batch: string;
        hsc_batch: string;
        department: string;
        college_name: string;
        college_address: string;
        dob: string | null;
    };
    config: {
        enableRealtime: boolean;
        enableDeviceLock: boolean;
        enableCheatFlags: boolean;
        enableBadges: boolean;
        enableProgressCharts: boolean;
        featuredOrderingMode: 'manual' | 'adaptive';
    };
    lastUpdatedAt: string;
}

export interface StudentExamHistoryItem {
    resultId: string;
    examId: string;
    examTitle: string;
    subject: string;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    rank: number | null;
    submittedAt: string;
    attemptNo: number;
    status: string;
    writtenUploads: string[];
}

export interface StudentBadgeItem {
    _id: string;
    code: string;
    title: string;
    description: string;
    iconUrl: string;
    awardedAt: string;
    source: 'auto' | 'manual';
}

export interface StudentExamHistoryResponse {
    history: StudentExamHistoryItem[];
    progress: {
        totalExams: number;
        avgScore: number;
        bestScore: number;
        weaknesses: Array<string | { subject?: string; avg?: number }>;
        chart: Array<{
            x: number;
            label: string;
            percentage: number;
            submittedAt: string;
        }>;
    };
    badges: StudentBadgeItem[];
    lastUpdatedAt: string;
}

export interface StudentMeResponse {
    student: {
        _id: string;
        username: string;
        email: string;
        fullName: string;
        userId: string;
        avatar?: string;
        profileScore: number;
        profileScoreThreshold: number;
        profileEligibleForExam: boolean;
        profileScoreBreakdown: Array<{
            key: string;
            label: string;
            weight: number;
            earned: number;
            completed: boolean;
        }>;
        missingProfileFields: string[];
        overallRank: number | null;
        groupRank: number | null;
        subscription: {
            isActive: boolean;
            planName: string;
            expiryDate: string | null;
        };
        lastLogin?: string | null;
        createdAt?: string;
    };
    stats: {
        totalExamsAttempted: number;
        averageScore: number;
        bestScore: number;
        leaderboardPoints: number;
    };
    payments: {
        totalPaid: number;
        pendingDue: number;
        pendingCount: number;
        lastSuccessfulPayment: {
            amount: number;
            method: string;
            paidAt: string | null;
        } | null;
    };
    profile: Record<string, unknown>;
    lastUpdatedAt: string;
}

export interface StudentHubExamListResponse {
    live: StudentUpcomingExam[];
    upcoming: StudentUpcomingExam[];
    completed: StudentExamHistoryItem[];
    missed: StudentUpcomingExam[];
    all: StudentUpcomingExam[];
    lastUpdatedAt: string;
}

export interface StudentHubPaymentItem {
    _id: string;
    studentId: string;
    examId: string | null;
    amount: number;
    currency: string;
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
    reference?: string;
    createdAt: string;
    paidAt?: string | null;
    notes?: string;
}

export interface StudentHubPaymentsResponse {
    summary: {
        totalPaid: number;
        pendingAmount: number;
        pendingCount: number;
        lastPayment: {
            amount: number;
            method: string;
            date: string;
        } | null;
    };
    items: StudentHubPaymentItem[];
    lastUpdatedAt: string;
}

export interface StudentHubNotificationItem {
    _id: string;
    title: string;
    body: string;
    type: 'exam' | 'payment' | 'system';
    category: string;
    isRead: boolean;
    createdAt: string;
    publishAt: string;
    linkUrl?: string;
}

export interface StudentHubNotificationsResponse {
    items: StudentHubNotificationItem[];
    unreadCount: number;
    lastUpdatedAt: string;
}

export interface StudentHubResourcesResponse {
    items: Array<Record<string, unknown>>;
    categories: string[];
    total: number;
    lastUpdatedAt: string;
}

export interface StudentNoticeItem {
    _id: string;
    title: string;
    message: string;
    target: 'all' | 'groups' | 'students';
    targetIds?: string[];
    startAt?: string;
    endAt?: string | null;
    isActive: boolean;
    createdAt?: string;
}

export interface StudentSupportTicketItem {
    _id: string;
    ticketNo: string;
    subject: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timeline?: Array<{
        actorRole: string;
        message: string;
        createdAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface AdminActionableAlertItem {
    _id: string;
    title: string;
    message: string;
    category: 'general' | 'exam' | 'update';
    publishAt: string;
    createdAt: string;
    linkUrl?: string;
    isRead: boolean;
    targetRole?: 'student' | 'admin' | 'moderator' | 'all';
}

export interface AdminProfileUpdateRequestItem {
    _id: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_changes: Record<string, unknown>;
    currentValues: Record<string, unknown>;
    admin_feedback?: string;
    createdAt: string;
    updatedAt: string;
    reviewed_at?: string | null;
    student_id?: {
        _id: string;
        username?: string;
        email?: string;
        full_name?: string;
    } | string;
}

export interface AdminNotificationItem {
    _id: string;
    title: string;
    message: string;
    category: 'general' | 'exam' | 'update';
    publishAt?: string;
    expireAt?: string;
    isActive: boolean;
    linkUrl?: string;
    attachmentUrl?: string;
    targetRole?: 'student' | 'admin' | 'moderator' | 'all';
}

export interface StudentDashboardConfig {
    _id?: string;
    welcomeMessageTemplate: string;
    profileCompletionThreshold: number;
    enableRealtime: boolean;
    enableDeviceLock: boolean;
    enableCheatFlags: boolean;
    enableBadges: boolean;
    enableProgressCharts: boolean;
    featuredOrderingMode: 'manual' | 'adaptive';
    profileGatingMessage?: string;
    renewalCtaText?: string;
    renewalCtaUrl?: string;
    enableRecommendations?: boolean;
    enableLeaderboard?: boolean;
    enableWeakTopics?: boolean;
    enableWatchlist?: boolean;
    maxAlertsVisible?: number;
    maxExamsVisible?: number;
    sections?: Record<string, { visible: boolean; label: string; order: number }>;
    celebrationRules?: {
        enabled: boolean;
        windowDays: number;
        minPercentage: number;
        maxRank: number;
        ruleMode: 'score_or_rank' | 'score_and_rank' | 'custom';
        messageTemplates: string[];
        showForSec: number;
        dismissible: boolean;
        maxShowsPerDay: number;
    };
    updatedAt?: string;
}

/* ── Student Dashboard Full (Premium) ── */
export interface DashboardSectionConfig {
    visible: boolean;
    label: string;
    order: number;
}

export interface DashboardQuickStatus {
    profileScore: number;
    subscriptionStatus: 'active' | 'expired';
    paymentStatus: 'paid' | 'pending';
    upcomingExamsCount: number;
    completedExamsCount: number;
    unreadAlertsCount: number;
}

export interface DashboardPaymentSummary {
    totalPaid: number;
    pendingAmount: number;
    pendingCount: number;
    pendingDue: number;
    lastPayment: {
        amount: number;
        method: string;
        date: string;
        transactionId: string;
        reference: string;
    } | null;
    recentItems: Array<{
        _id: string;
        amount: number;
        method: string;
        status: string;
        date: string;
        paidAt?: string;
        entryType: string;
        reference: string;
    }>;
}

export interface DashboardWeakTopic {
    subject: string;
    accuracy: number;
    totalAttempts: number;
    correctCount: number;
    isWeak: boolean;
}

export interface DashboardLeaderboardEntry {
    rank: number;
    studentId: string;
    name: string;
    avatar: string;
    avgPercentage: number;
    attempts: number;
    isMe: boolean;
}

export interface DashboardImportantDate {
    type: string;
    label: string;
    date: string;
    urgency: 'critical' | 'high' | 'normal';
}

export interface DashboardPersonalizedCta {
    id: string;
    text: string;
    url: string;
    priority: number;
    variant: 'warning' | 'info' | 'danger' | 'success';
}

export interface DashboardResourceItem {
    _id: string;
    title: string;
    description: string;
    type: string;
    category: string;
    fileUrl: string;
    thumbnailUrl: string;
    isFeatured: boolean;
}

export interface DashboardSupportSummary {
    openTickets: number;
    recentTickets: Array<{
        _id: string;
        ticketNo: string;
        subject: string;
        status: string;
        priority: string;
        createdAt: string;
    }>;
}

export interface DashboardWatchlistSummary {
    universities: number;
    resources: number;
    exams: number;
    news: number;
    total: number;
    recentItems: Array<{
        _id: string;
        itemType: string;
        itemId: string;
        savedAt: string;
    }>;
}

export interface StudentDashboardFullResponse {
    header: StudentDashboardProfileSection;
    quickStatus: DashboardQuickStatus;
    subscription: {
        isActive: boolean;
        planName: string;
        expiryDate: string | null;
    };
    payments: DashboardPaymentSummary;
    alerts: {
        items: StudentLiveAlertItem[];
        totalCount: number;
    };
    notifications: {
        items: StudentNotificationItem[];
        totalCount: number;
    };
    exams: {
        live: StudentUpcomingExam[];
        upcoming: StudentUpcomingExam[];
        missed: StudentUpcomingExam[];
        totalUpcoming: number;
    };
    results: {
        recent: StudentExamHistoryItem[];
        progress: StudentExamHistoryResponse['progress'];
        badges: StudentBadgeItem[];
    };
    weakTopics: {
        topics: DashboardWeakTopic[];
        weakCount: number;
        hasData: boolean;
    };
    leaderboard: {
        topPerformers: DashboardLeaderboardEntry[];
        myRank: number | null;
        myAvgPercentage: number | null;
    };
    watchlist: DashboardWatchlistSummary;
    resources: {
        items: DashboardResourceItem[];
    };
    support: DashboardSupportSummary;
    security: {
        lastLogin: string;
        twoFactorEnabled: boolean;
    };
    importantDates: DashboardImportantDate[];
    dailyFocus: {
        nextExam: string | null;
        nextDeadline: string | null;
        recommendedAction: string;
    };
    personalizedCtas: DashboardPersonalizedCta[];
    sections: Record<string, DashboardSectionConfig>;
    config: {
        enableRealtime: boolean;
        enableBadges: boolean;
        enableProgressCharts: boolean;
        enableRecommendations: boolean;
        enableLeaderboard: boolean;
        enableWeakTopics: boolean;
        enableWatchlist: boolean;
        profileGatingMessage: string;
        renewalCtaText: string;
        renewalCtaUrl: string;
        celebrationRules?: StudentDashboardConfig['celebrationRules'];
    };
    lastUpdatedAt: string;
}

export interface WatchlistItem {
    _id: string;
    itemType: 'university' | 'resource' | 'exam' | 'news';
    itemId: string;
    savedAt: string;
    title: string;
    meta: Record<string, unknown>;
}

export interface WatchlistResponse {
    items: WatchlistItem[];
    summary: { universities: number; resources: number; exams: number; news: number; total: number };
    lastUpdatedAt: string;
}

export interface AdminBadgeItem {
    _id: string;
    code: string;
    title: string;
    description?: string;
    iconUrl?: string;
    criteriaType: 'auto' | 'manual';
    minAvgPercentage?: number;
    minCompletedExams?: number;
    isActive: boolean;
}

export interface ApiQuestion {
    _id: string;
    question: string;
    questionImage?: string;
    questionType: 'mcq' | 'written';
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    subject?: string;
    chapter?: string;
    tags?: string[];
    max_attempt_select?: number;
}

export interface ApiExamSession {
    _id?: string; // Internal DB ID if needed
    sessionId: string; // Returned by startExam
    student?: string;
    exam?: string;
    status?: 'In Progress' | 'Completed' | 'Missed' | 'in_progress' | 'submitted' | 'evaluated' | 'expired';
    startedAt: string;
    expiresAt: string;
    attemptNo?: number;
    attemptRevision?: number;
    isActive?: boolean;
    submittedAt?: string;
    sessionLocked?: boolean;
    lockReason?: string;
    violationsCount?: number;
    serverNow?: string;
    startTime?: string; // Legacy field
    endTime?: string;
    score?: number;
    savedAnswers: Array<{
        questionId: string;
        selectedAnswer?: string;
        selectedKey?: string;
        writtenAnswerUrl?: string;
        updatedAtUTC?: string;
        changeCount?: number;
    }>;
    answers?: Array<{
        question: string;
        selectedOption: 'A' | 'B' | 'C' | 'D';
    }>;
}

export interface ExamAttemptStateResponse {
    session: ApiExamSession;
    exam: ApiExam;
    questions: ApiQuestion[];
    serverNow?: string;
}

export type ExamAttemptEventType =
    | 'save'
    | 'tab_switch'
    | 'fullscreen_exit'
    | 'copy_attempt'
    | 'submit'
    | 'error'
    | 'resume';

export type ExamAnswerMap = Record<string, { selectedAnswer?: string; writtenAnswerUrl?: string }>;

export interface ExamAnswerPayloadItem {
    questionId: string;
    selectedAnswer?: string;
    writtenAnswerUrl?: string;
}

export interface SaveExamAttemptAnswerPayload {
    answers: ExamAnswerPayloadItem[] | ExamAnswerMap;
    tabSwitchCount?: number;
    cheat_flags?: Array<{ reason?: string; eventType?: string; timestamp?: string }>;
    attemptRevision?: number;
}

export interface SaveExamAttemptAnswerResponse {
    saved: boolean;
    savedAt: string;
    attemptRevision: number;
}

export interface SubmitExamAttemptPayload {
    answers?: ExamAnswerPayloadItem[] | ExamAnswerMap;
    tabSwitchCount?: number;
    isAutoSubmit?: boolean;
    cheat_flags?: Array<{ reason?: string; eventType?: string; timestamp?: string }>;
    attemptRevision?: number;
    submissionType?: 'manual' | 'auto_timeout' | 'auto_expired' | 'forced';
}

export interface SubmitExamAttemptResponse {
    message: string;
    resultId?: string;
    submitted?: boolean;
    alreadySubmitted?: boolean;
    obtainedMarks?: number;
    totalMarks?: number;
    percentage?: number;
    correctCount?: number;
    wrongCount?: number;
    unansweredCount?: number;
    resultPublishDate?: string;
    resultPublishMode?: 'immediate' | 'manual' | 'scheduled';
    resultPublished?: boolean;
    attemptRevision?: number;
}

export interface LogExamAttemptEventPayload {
    eventType: ExamAttemptEventType;
    metadata?: Record<string, unknown>;
    timestamp?: string;
    attemptRevision?: number;
}

export interface LogExamAttemptEventResponse {
    logged: boolean;
    action?: 'logged' | 'warning' | 'auto_submitted' | 'locked';
    violationAction?: 'warn' | 'submit' | 'lock';
    lockReason?: string;
    attemptRevision?: number;
    tabSwitchCount?: number;
    submit?: SubmitExamAttemptResponse;
}

export interface ApiExamCertificate {
    certificateId: string;
    issuedAt: string;
    status: 'active' | 'revoked';
    verifyUrl: string;
    verifyApiUrl?: string;
    downloadUrl: string;
    templateVersion?: string;
}

export interface ApiCertificateVerification {
    valid: boolean;
    message?: string;
    certificate?: {
        certificateId: string;
        status: 'active' | 'revoked';
        issuedAt: string;
        attemptNo: number;
    };
    exam?: {
        id: string;
        title: string;
        subject: string;
    };
    student?: {
        id: string;
        name: string;
        email: string;
    };
    result?: {
        percentage: number;
        obtainedMarks: number;
        totalMarks: number;
        submittedAt?: string | null;
    };
}

/* â”€â”€ Public Universities â”€â”€ */
export interface UniversityCategorySummary {
    categoryName: string;
    order: number;
    count: number;
    clusterGroups: string[];
}

export interface UniversityListQuery {
    category: string;
    clusterGroup?: string;
    q?: string;
    sort?: 'deadline' | 'alphabetical';
    page?: number;
    limit?: number;
}

export const getUniversities = (params: Record<string, string | number> = {}) =>
    api.get<{ universities: ApiUniversity[]; pagination: { total: number; page: number; limit: number; pages: number } }>('/universities', { params });

export const getUniversityCategories = () =>
    api.get<{ categories: UniversityCategorySummary[] }>('/university-categories');

export const getUniversityBySlug = (slug: string) =>
    api.get<{ university: ApiUniversity }>(`/universities/${slug}`);

/* â”€â”€ Contact â”€â”€ */
export interface ContactPayload { name: string; email: string; phone?: string; subject: string; message: string; }
export const submitContact = (data: ContactPayload) => api.post('/contact', data);

/* â”€â”€ Public Resources â”€â”€ */
export const getResources = (params: Record<string, string | number> = {}) =>
    api.get('/resources', { params });

/* â”€â”€ Public Dynamic Home System & Settings â”€â”€ */
export const getPublicSettings = () => api.get<ApiWebsiteSettings>('/settings/public');
export const getPublicSocialLinks = () =>
    api.get<{ items: PublicSocialLinkItem[] }>('/social-links/public');
export const getPublicHomeSettings = () =>
    api.get<{ homeSettings: HomeSettingsConfig; updatedAt?: string }>('/home-settings/public');
export const getHomeSystem = () => api.get<HomeApiResponse>('/home');
export const getHome = getHomeSystem;
export const getHomeStats = () => api.get('/stats');
export const getHomeStreamUrl = () => resolveApiUrl('/home/stream');
export const getPublicSubscriptionPlans = () =>
    api.get<{ items: SubscriptionPlanPublic[]; settings?: SubscriptionPlansPublicSettings; lastUpdatedAt?: string }>('/subscription-plans');
export const getPublicSubscriptionPlanById = (id: string) =>
    api.get<{ item: SubscriptionPlanPublic }>(`/subscription-plans/${id}`);
export const getMySubscriptionStatus = () =>
    api.get<UserSubscriptionStatus>('/subscriptions/me');
export const requestSubscriptionPayment = (
    planId: string,
    data: {
        method?: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cash' | 'manual' | 'bank' | 'card' | 'sslcommerz';
        transactionId?: string;
        proofUrl?: string;
        notes?: string;
    } = {},
) => api.post(`/subscriptions/${planId}/request-payment`, data);
export const uploadSubscriptionPaymentProof = (
    planId: string,
    data: {
        proofUrl?: string;
        proofFileUrl?: string;
        transactionId?: string;
        method?: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cash' | 'manual' | 'bank' | 'card' | 'sslcommerz';
    },
) => api.post(`/subscriptions/${planId}/upload-proof`, data);
export const getOauthProviders = () =>
    api.get<{ oauthEnabled: boolean; providers: Array<{ id: 'google' | 'apple' | 'twitter'; label: string; enabled: boolean; configured: boolean }> }>('/auth/oauth/providers');
export const startOauthProvider = (provider: 'google' | 'apple' | 'twitter') =>
    api.get<{ ok: boolean; code?: string; message?: string }>(`/auth/oauth/${provider}/start`);

/* â”€â”€ Public News â”€â”€ */
export const getPublicNews = (params: Record<string, string | number> = {}) =>
    api.get<{ success: boolean; data: ApiNews[]; total: number; currentPage: number; totalPages: number }>('/news', { params });
export const getPublicFeaturedNews = (params?: any) => api.get('/news/featured', { params });
export const getTrendingNews = (params?: any) => api.get('/news/trending', { params });
export const getPublicNewsBySlug = (slug: string) => api.get<{ success: boolean; data: ApiNews }>(`/news/${slug}`);
export const getPublicNewsCategories = () =>
    api.get<{ success: boolean; data: ApiNewsCategory[] }>('/news/categories');


/* â”€â”€ Student Profile & Dashboard â”€â”€ */
export const getProfileMe = () => api.get('/profile/me');
export const getProfileDashboard = () => api.get('/profile/dashboard');
export const updateProfile = (data: Record<string, unknown>) => api.put('/profile/update', data);
export const getStudentDashboard = () => api.get('/student/dashboard');
export const getStudentUpcomingExams = () => api.get<{ items: StudentUpcomingExam[]; lastUpdatedAt: string }>('/student/upcoming-exams');
export const getStudentFeaturedUniversities = () => api.get<{ items: StudentFeaturedUniversity[]; lastUpdatedAt: string }>('/student/featured-universities');
export const getStudentNotifications = () => api.get<{ items: StudentNotificationItem[]; lastUpdatedAt: string }>('/student/notifications');
export const getStudentLiveAlerts = () => api.get<{ items: StudentLiveAlertItem[]; lastUpdatedAt: string }>('/student/live-alerts');
export const getStudentDashboardProfileSection = () => api.get<StudentDashboardProfileSection>('/student/dashboard-profile');
export const getStudentExamHistory = () => api.get<StudentExamHistoryResponse>('/student/exam-history');
export const getStudentMe = () => api.get<StudentMeResponse>('/users/me');
export const updateStudentMe = (data: Record<string, unknown>) => api.put('/users/me', data);
export const getStudentMeExams = () => api.get<StudentHubExamListResponse>('/students/me/exams');
export const getStudentMeExamById = (examId: string) => api.get(`/students/me/exams/${examId}`);
export const getStudentMeResults = () => api.get<{
    items: StudentExamHistoryItem[];
    progress: StudentExamHistoryResponse['progress'];
    badges: StudentBadgeItem[];
    leaderboardPoints: number;
    lastUpdatedAt: string;
}>('/students/me/results');
export const getStudentMeResultByExam = (examId: string) => api.get('/students/me/results/' + examId);
export const getStudentMePayments = () => api.get<StudentHubPaymentsResponse>('/students/me/payments');
export const getStudentMeNotifications = (type?: 'exam' | 'payment' | 'system' | 'all') =>
    api.get<StudentHubNotificationsResponse>('/students/me/notifications', { params: type ? { type } : {} });
export const markStudentMeNotificationsRead = (ids?: string[]) =>
    api.post<{ updated: number }>('/students/me/notifications/mark-read', ids?.length ? { ids } : {});
export const getStudentMeResources = (params: { category?: string; q?: string } = {}) =>
    api.get<StudentHubResourcesResponse>('/students/me/resources', { params });
export const getStudentNotices = () => api.get<{ items: StudentNoticeItem[] }>('/student/notices');
export const getStudentSupportTickets = () => api.get<{ items: StudentSupportTicketItem[] }>('/student/support-tickets');
export const getStudentSupportTicket = (id: string) =>
    api.get<{ item: StudentSupportTicketItem }>(`/student/support-tickets/${id}`);
export const createStudentSupportTicket = (data: { subject: string; message: string; priority?: 'low' | 'medium' | 'high' | 'urgent' }) =>
    api.post<{ item: StudentSupportTicketItem; message: string }>('/student/support-tickets', data);
export const replyStudentSupportTicket = (id: string, message: string) =>
    api.post<{ item: StudentSupportTicketItem; message: string }>(`/student/support-tickets/${id}/reply`, { message });

/* ── Student Dashboard Full (Premium) ── */
export const getStudentDashboardFull = () => api.get<StudentDashboardFullResponse>('/student/dashboard-full');
export const getStudentWatchlist = (type?: string) =>
    api.get<WatchlistResponse>('/student/watchlist', { params: type ? { type } : {} });
export const toggleStudentWatchlistItem = (data: { itemType: string; itemId: string }) =>
    api.post<{ saved: boolean; message: string }>('/student/watchlist/toggle', data);
export const getStudentWatchlistCheck = (itemType: string, itemId: string) =>
    api.get<{ saved: boolean }>('/student/watchlist/check', { params: { itemType, itemId } });
export const getStudentDashboardStreamUrl = (token?: string) => {
    const authToken = token || readAccessToken();
    const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return resolveApiUrl(`/student/dashboard/stream${query}`);
};
export const getAuthSessionStreamUrl = (token?: string) => {
    const authToken = token || readAccessToken();
    const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return resolveApiUrl(`/auth/session-stream${query}`);
};
export const getExamAttemptStreamUrl = (examId: string, attemptId: string, token?: string) => {
    const authToken = token || readAccessToken();
    const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return resolveApiUrl(`/exams/${examId}/attempt/${attemptId}/stream${query}`);
};
export const getAdminLiveStreamUrl = (token?: string) => {
    const authToken = token || readAccessToken();
    const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return resolveApiUrl(`/${ADMIN_PATH}/live/stream${query}`);
};

/* â”€â”€ Exams (auth-required) â”€â”€ */
export const getStudentExams = () => api.get('/exams');
export const getExamLanding = (params: Record<string, string | number> = {}) => api.get('/exams/landing', { params });
export const getPublicExamList = (params: Record<string, string | number | undefined> = {}) =>
    api.get<{ items: PublicExamListItem[]; total: number; page: number; limit: number; pages: number; serverNow: string }>(
        '/exams/public-list',
        { params },
    );
export const getActiveStudentAlerts = () => api.get('/alerts/active');
export const ackStudentAlert = (alertId: string) => api.post(`/alerts/${alertId}/ack`);
export const getActiveBannersBySlot = (slot?: 'top' | 'middle' | 'footer') =>
    api.get('/banners/active', { params: slot ? { slot } : {} });

/* â”€â”€ Admin â€” Universities â”€â”€ */
export const adminGetUniversities = (params: Record<string, string | number> = {}) =>
    api.get(`/${ADMIN_PATH}/universities`, { params });
export const adminGetUniversityById = (id: string) =>
    api.get(`/${ADMIN_PATH}/universities/${id}`);
export const adminCreateUniversity = (data: Partial<ApiUniversity>) =>
    api.post(`/${ADMIN_PATH}/universities`, data);
export const adminUpdateUniversity = (id: string, data: Partial<ApiUniversity>) =>
    api.put(`/${ADMIN_PATH}/universities/${id}`, data);
export const adminDeleteUniversity = (id: string) =>
    api.delete(`/${ADMIN_PATH}/universities/${id}`);

export const adminBulkDeleteUniversities = (ids: string[], mode: 'soft' | 'hard' = 'soft') =>
    api.post(`/${ADMIN_PATH}/universities/bulk-delete`, { ids, mode });

export const adminBulkUpdateUniversities = (ids: string[], updates: Record<string, unknown>) =>
    api.patch(`/${ADMIN_PATH}/universities/bulk-update`, { ids, updates });

export const adminToggleUniversityStatus = (id: string) =>
    api.patch(`/${ADMIN_PATH}/universities/${id}/toggle-status`);

export interface AdminUniversityCategoryFacet {
    name: string;
    count: number;
}

export const adminGetUniversityCategories = (params: Record<string, string | number> = {}) =>
    api.get<{ categories: AdminUniversityCategoryFacet[] }>(`/${ADMIN_PATH}/universities/categories`, { params });

export interface AdminUniversityCategoryItem {
    _id: string;
    name: string;
    slug: string;
    labelBn?: string;
    labelEn?: string;
    colorToken?: string;
    icon?: string;
    isActive: boolean;
    homeHighlight: boolean;
    homeOrder: number;
    count?: number;
}

export const adminGetUniversityCategoryMaster = (params: Record<string, string | number> = {}) =>
    api.get<{ categories: AdminUniversityCategoryItem[] }>(`/${ADMIN_PATH}/university-categories`, { params });
export const adminCreateUniversityCategory = (data: Partial<AdminUniversityCategoryItem>) =>
    api.post<{ category: AdminUniversityCategoryItem; message: string }>(`/${ADMIN_PATH}/university-categories`, data);
export const adminUpdateUniversityCategory = (id: string, data: Partial<AdminUniversityCategoryItem>) =>
    api.put<{ category: AdminUniversityCategoryItem; message: string }>(`/${ADMIN_PATH}/university-categories/${id}`, data);
export const adminToggleUniversityCategory = (id: string) =>
    api.patch<{ category: AdminUniversityCategoryItem; message: string }>(`/${ADMIN_PATH}/university-categories/${id}/toggle`);
export const adminDeleteUniversityCategory = (id: string) =>
    api.delete<{ message: string }>(`/${ADMIN_PATH}/university-categories/${id}`);

export const adminExportUniversitiesSheet = (params: Record<string, string | number> = {}) =>
    api.get(`/${ADMIN_PATH}/universities/export`, { params, responseType: 'blob' });

export interface AdminUniversityCluster {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    memberUniversityIds: string[];
    categoryRules: string[];
    categoryRuleIds?: string[];
    memberCount?: number;
    dates: {
        applicationStartDate?: string;
        applicationEndDate?: string;
        scienceExamDate?: string;
        commerceExamDate?: string;
        artsExamDate?: string;
    };
    syncPolicy: 'inherit_with_override';
    homeVisible: boolean;
    homeOrder: number;
    createdAt: string;
    updatedAt: string;
}

export const adminGetUniversityClusters = (params: Record<string, string | number> = {}) =>
    api.get<{ clusters: AdminUniversityCluster[] }>(`/${ADMIN_PATH}/university-clusters`, { params });
export const adminCreateUniversityCluster = (data: Partial<AdminUniversityCluster>) =>
    api.post(`/${ADMIN_PATH}/university-clusters`, data);
export const adminGetUniversityClusterById = (id: string) =>
    api.get(`/${ADMIN_PATH}/university-clusters/${id}`);
export const adminUpdateUniversityCluster = (id: string, data: Partial<AdminUniversityCluster>) =>
    api.put(`/${ADMIN_PATH}/university-clusters/${id}`, data);
export const adminResolveUniversityClusterMembers = (id: string) =>
    api.post(`/${ADMIN_PATH}/university-clusters/${id}/members/resolve`);
export const adminSyncUniversityClusterDates = (id: string, dates?: Record<string, unknown>) =>
    api.patch(`/${ADMIN_PATH}/university-clusters/${id}/sync-dates`, dates ? { dates } : {});
export const adminDeleteUniversityCluster = (id: string) =>
    api.delete(`/${ADMIN_PATH}/university-clusters/${id}`);

export interface FeaturedUniversityCluster {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    homeOrder?: number;
    memberCount: number;
}

export const getFeaturedHomeClusters = (params: Record<string, string | number> = {}) =>
    api.get<{ clusters: FeaturedUniversityCluster[] }>('/home/clusters/featured', { params });

export const getHomeClusterMembers = (
    slug: string,
    params: Record<string, string | number> = {},
) => api.get<{ cluster: FeaturedUniversityCluster; universities: ApiUniversity[]; pagination: { total: number; page: number; limit: number; pages: number } }>(
    `/home/clusters/${slug}/members`,
    { params },
);

export interface AdminUniversityImportInitResponse {
    importJobId: string;
    headers: string[];
    sampleRows: Record<string, unknown>[];
    targetFields: string[];
}

export const adminInitUniversityImport = (file: File) => {
    const data = new FormData();
    data.append('file', file);
    return api.post<AdminUniversityImportInitResponse>(`/${ADMIN_PATH}/universities/import/init`, data);
};

export const adminValidateUniversityImport = (
    jobId: string,
    mapping: Record<string, string>,
    defaults: Record<string, unknown> = {},
) => api.post(`/${ADMIN_PATH}/universities/import/${jobId}/validate`, { mapping, defaults });

export const adminCommitUniversityImport = (jobId: string) =>
    api.post(`/${ADMIN_PATH}/universities/import/${jobId}/commit`);

export const adminCommitUniversityImportWithMode = (
    jobId: string,
    mode: 'create-only' | 'update-existing' = 'update-existing',
) => api.post(`/${ADMIN_PATH}/universities/import/${jobId}/commit`, { mode });

export const adminGetUniversityImportJob = (jobId: string) =>
    api.get(`/${ADMIN_PATH}/universities/import/${jobId}`);

export const adminDownloadUniversityImportErrors = (jobId: string) =>
    api.get(`/${ADMIN_PATH}/universities/import/${jobId}/errors.csv`, { responseType: 'blob' });
export const adminDownloadUniversityImportTemplate = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/universities/import/template`, { params: { format }, responseType: 'blob' });

/* â”€â”€ Admin â€” Exams â”€â”€ */
export const adminGetExamAnalytics = (id: string) => api.get(`/${ADMIN_PATH}/exams/${id}/analytics`);
export const adminForceSubmitSession = (examId: string, studentId: string) => api.patch(`/${ADMIN_PATH}/exams/${examId}/force-submit/${studentId}`);
export const adminEvaluateResult = (resultId: string, data: any) => api.patch(`/${ADMIN_PATH}/exams/evaluate/${resultId}`, data);
export const adminResetExamAttempt = (examId: string, studentId: string) => api.patch(`/${ADMIN_PATH}/exams/${examId}/reset-attempt/${studentId}`);
export const adminCloneExam = (id: string) => api.post(`/${ADMIN_PATH}/exams/${id}/clone`);
export const adminExportExamEvents = (examId: string, format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/${ADMIN_PATH}/exams/${examId}/events/export`, { params: { format }, responseType: 'blob' });
export const adminStartExamPreview = (examId: string) =>
    api.post(`/${ADMIN_PATH}/exams/${examId}/preview/start`);

export interface AdminLiveExamSession {
    _id: string;
    student: { _id: string; username: string; fullName: string; email: string };
    exam: { _id: string; title: string; subject: string };
    status: string;
    startedAt: string;
    expiresAt: string;
    lastSavedAt?: string;
    tabSwitchCount?: number;
    copyPasteViolations?: number;
    fullscreenExits?: number;
    currentQuestionId?: string;
    violationsCount?: number;
    progressPercent?: number;
    deviceIp?: string;
    isSuspicious?: boolean;
}

export const adminGetExams = (params: Record<string, string | number> = {}) =>
    api.get<{ exams: AdminExamCard[]; grouped?: { byCategory?: Record<string, AdminExamCard[]>; byStatus?: Record<string, AdminExamCard[]> }; pagination?: { total: number; page: number; limit: number; pages: number } }>(`/${ADMIN_PATH}/exams`, { params });
export const adminGetLiveExamSessions = (params: Record<string, string | number> = {}) =>
    api.get<{ sessions: AdminLiveExamSession[]; total: number; page: number; totalPages: number }>(`/${ADMIN_PATH}/live/attempts`, { params });
export const adminLiveAttemptAction = (
    attemptId: string,
    payload: { action: 'warn' | 'force_submit' | 'lock' | 'message'; message?: string },
) => api.post(`/${ADMIN_PATH}/live/attempts/${attemptId}/action`, payload);
export const adminGetExamById = (id: string) =>
    api.get(`/${ADMIN_PATH}/exams/${id}`);
export const adminCreateExam = (data: Record<string, unknown>) =>
    api.post(`/${ADMIN_PATH}/exams`, data);
export const adminUpdateExam = (id: string, data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/exams/${id}`, data);
export const adminDeleteExam = (id: string) =>
    api.delete(`/${ADMIN_PATH}/exams/${id}`);
export const adminPublishExam = (id: string) =>
    api.patch(`/${ADMIN_PATH}/exams/${id}/publish`);
export const adminPublishResult = (id: string) =>
    api.patch(`/${ADMIN_PATH}/exams/${id}/publish-result`);
export const adminRegenerateExamShareLink = (id: string) =>
    api.post<{ message: string; share_link: string; shareUrl: string; examId: string }>(`/${ADMIN_PATH}/exams/${id}/share-link/regenerate`);
export const adminSignExamBannerUpload = (filename: string, mimeType: string) =>
    api.post<{
        provider: 's3' | 'local' | 'firebase';
        method: 'PUT' | 'POST';
        uploadUrl: string;
        publicUrl: string;
        headers?: Record<string, string>;
        fields?: Record<string, string>;
        expiresIn: number;
    }>(`/${ADMIN_PATH}/exams/sign-banner-upload`, { filename, mimeType });

/* â”€â”€ Admin â€” Global Question Bank â”€â”€ */
export interface AdminQBankQuestion {
    _id: string;
    class_level?: string;
    department?: string;
    subject?: string;
    chapter?: string;
    topic?: string;
    question?: string;
    question_text?: string;
    questionText?: { en?: string; bn?: string };
    question_html?: string;
    question_type?: 'MCQ' | 'MULTI' | 'WRITTEN' | 'TF';
    questionType?: 'mcq' | 'written';
    languageMode?: 'EN' | 'BN' | 'BOTH';
    optionsLocalized?: Array<{
        key: string;
        text: { en?: string; bn?: string };
        media_id?: string | null;
    }>;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer?: string;
    correct_answer?: string[];
    explanation?: string;
    explanation_text?: string;
    explanationText?: { en?: string; bn?: string };
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    estimated_time?: number;
    skill_tags?: string[];
    image_media_id?: string | null;
    media_alt_text_bn?: string;
    media_status?: 'pending' | 'approved' | 'rejected';
    status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
    quality_score?: number;
    quality_flags?: string[];
    usage_count?: number;
    avg_correct_pct?: number | null;
    locked?: boolean;
    revision_no?: number;
    previous_revision_id?: string | null;
    created_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminQBankListResponse {
    questions: AdminQBankQuestion[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
    facets?: {
        subjects?: string[];
        chapters?: string[];
        tags?: string[];
        statuses?: string[];
        difficulty?: string[];
        qualityRange?: { min: number; max: number };
    };
    capabilities?: {
        questionCreate?: boolean;
        questionEdit?: boolean;
        questionDelete?: boolean;
        questionApprove?: boolean;
        questionBulkImport?: boolean;
        questionExport?: boolean;
        questionLock?: boolean;
    };
}

export interface AdminQBankImportJobResponse {
    import_job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    sourceFileName?: string;
    startedAt?: string;
    finishedAt?: string;
    summary: {
        totalRows: number;
        importedRows: number;
        skippedRows: number;
        failedRows: number;
        duplicateRows: number;
    };
    rowErrors: Array<{
        rowNumber: number;
        reason: string;
        payload?: Record<string, unknown>;
    }>;
}

export interface QBankSimilarityMatch {
    questionId: string;
    questionText: string;
    score: number;
    tokenOverlap: number;
    levenshteinRatio: number;
    optionSimilarity: number;
}

export const adminGetGlobalQuestions = (params: Record<string, string | number | boolean> = {}) =>
    api.get<AdminQBankListResponse>(`/${ADMIN_PATH}/question-bank`, { params });

export const adminGetGlobalQuestionById = (id: string) =>
    api.get<{ question: AdminQBankQuestion; revisions: Array<Record<string, unknown>>; capabilities?: Record<string, boolean> }>(`/${ADMIN_PATH}/question-bank/${id}`);

export const adminCreateGlobalQuestion = (data: Record<string, unknown>) =>
    api.post<{ message: string; warning?: string; question: AdminQBankQuestion; duplicateMatches?: QBankSimilarityMatch[] }>(`/${ADMIN_PATH}/question-bank`, data);

export const adminUpdateGlobalQuestion = (id: string, data: Record<string, unknown>) =>
    api.put<{ message: string; warning?: string; question: AdminQBankQuestion; duplicateMatches?: QBankSimilarityMatch[] }>(`/${ADMIN_PATH}/question-bank/${id}`, data);

export const adminDeleteGlobalQuestion = (id: string, hardDelete = false) =>
    api.delete<{ message: string }>(`/${ADMIN_PATH}/question-bank/${id}`, { params: hardDelete ? { hardDelete: 1 } : undefined });

export const adminApproveGlobalQuestion = (id: string, payload?: { action?: 'approve' | 'reject'; reason?: string }) =>
    api.post<{ message: string; question: AdminQBankQuestion }>(`/${ADMIN_PATH}/question-bank/${id}/approve`, payload || {});

export const adminLockGlobalQuestion = (id: string, payload?: { locked?: boolean; force?: boolean; reason?: string }) =>
    api.post<{ message: string; question: AdminQBankQuestion }>(`/${ADMIN_PATH}/question-bank/${id}/lock`, payload || {});

export const adminRevertGlobalQuestionRevision = (id: string, revisionNo: number) =>
    api.post<{ message: string; question: AdminQBankQuestion; revertedFrom: number }>(`/${ADMIN_PATH}/question-bank/${id}/revert/${revisionNo}`);

export const adminSearchSimilarGlobalQuestions = (payload: Record<string, unknown>) =>
    api.post<{ threshold: number; matches: QBankSimilarityMatch[]; warning?: string }>(`/${ADMIN_PATH}/question-bank/search/similar`, payload);

export const adminBulkImportGlobalQuestions = (payload: FormData | { questions?: any[]; rows?: any[]; mapping?: Record<string, string>; defaultStatus?: string; duplicateThreshold?: number; sourceFileName?: string }) =>
    api.post<{ message: string; import_job_id: string; summary: AdminQBankImportJobResponse['summary']; rowErrors: AdminQBankImportJobResponse['rowErrors'] }>(
        `/${ADMIN_PATH}/question-bank/bulk-import`,
        payload,
        payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );

export const adminGetGlobalQuestionImportJob = (jobId: string) =>
    api.get<AdminQBankImportJobResponse>(`/${ADMIN_PATH}/question-bank/import/${jobId}`);

export const adminExportGlobalQuestions = (payload: { filters?: Record<string, unknown>; format?: 'csv' | 'xlsx' } = {}) =>
    api.post(`/${ADMIN_PATH}/question-bank/export`, payload, { responseType: 'blob' });

export const adminSignQuestionMediaUpload = (filename: string, mimeType: string) =>
    api.post<{
        provider: 's3' | 'local' | 'firebase';
        method: 'PUT' | 'POST';
        uploadUrl: string;
        publicUrl: string;
        headers?: Record<string, string>;
        fields?: Record<string, string>;
        expiresIn: number;
    }>(`/${ADMIN_PATH}/question-bank/media/sign-upload`, { filename, mimeType });

export const adminCreateQuestionMedia = (payload: {
    sourceType?: 'upload' | 'external_link';
    url: string;
    mimeType?: string;
    sizeBytes?: number;
    alt_text_bn?: string;
    approveNow?: boolean;
}) =>
    api.post<{ message: string; media: Record<string, unknown> }>(`/${ADMIN_PATH}/question-bank/media`, payload);

export const getQbankPicker = (params: Record<string, string | number | boolean> = {}) =>
    api.get<{ questions: AdminQBankQuestion[]; total: number; filter: Record<string, unknown> }>(`/qbank/picker`, { params });

export const incrementQbankUsage = (payload: { examId?: string; items: Array<{ questionId: string; isCorrect?: boolean }> }) =>
    api.post<{ updated: Array<{ questionId: string; usage_count: number; avg_correct_pct: number | null }>; count: number }>(
        '/qbank/usage/increment',
        payload,
    );

/* Admin - Exam Queries (Legacy/Specific) */
export const adminGetQuestions = (examId: string) =>
    api.get(`/${ADMIN_PATH}/exams/${examId}/questions`);
export const adminCreateQuestion = (examId: string, data: Record<string, unknown>) =>
    api.post(`/${ADMIN_PATH}/exams/${examId}/questions`, data);
export const adminUpdateQuestion = (examId: string, qId: string, data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/exams/${examId}/questions/${qId}`, data);
export const adminDeleteQuestion = (examId: string, qId: string) =>
    api.delete(`/${ADMIN_PATH}/exams/${examId}/questions/${qId}`);
export const adminBulkImportExamQuestions = (examId: string, questions: any[]) =>
    api.post(`/${ADMIN_PATH}/exams/${examId}/questions/import-excel`, questions);

/* Admin - Users and Roles */
export const adminGetUsers = (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    scope?: 'students' | 'admins' | 'all';
    institution?: string;
    roll?: string;
}) => api.get(`/${ADMIN_PATH}/users`, { params });
export const getAdminUsersStreamUrl = (token?: string) => {
    const authToken = token || readAccessToken();
    const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return resolveApiUrl(`/${ADMIN_PATH}/users/stream${query}`);
};
export const adminGetUserById = (id: string) => api.get(`/${ADMIN_PATH}/users/${id}`);
export const adminCreateUser = (data: Record<string, unknown>) => api.post(`/${ADMIN_PATH}/users`, data);
export const adminUpdateUser = (id: string, data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/users/${id}`, data);
export const adminDeleteUser = (id: string) => api.delete(`/${ADMIN_PATH}/users/${id}`);
export const adminUpdateUserRole = (id: string, role: string) => api.patch(`/${ADMIN_PATH}/users/${id}/role`, { role });
export const adminSetUserStatus = (id: string, status: string) => api.patch(`/${ADMIN_PATH}/users/${id}/status`, { status });
export const adminToggleUserStatus = (id: string) => api.patch(`/${ADMIN_PATH}/users/${id}/toggle-status`);
export const adminSetUserPermissions = (id: string, permissions: Record<string, boolean>) =>
    api.patch(`/${ADMIN_PATH}/users/${id}/permissions`, { permissions });
export const adminBulkUserAction = (payload: { userIds: string[]; action: string; role?: string; status?: string }) =>
    api.post(`/${ADMIN_PATH}/users/bulk-action`, payload);
export const adminBulkImportStudents = (data: FormData | { students: any[] }) =>
    api.post(`/${ADMIN_PATH}/users/bulk-import-students`, data);

export const adminDownloadStudentTemplate = () =>
    api.get(`/${ADMIN_PATH}/students/template`, { responseType: 'blob' });

export const adminInitStudentImport = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{
        message: string;
        jobId: string;
        headers: string[];
        sampleRows: any[];
    }>(`/${ADMIN_PATH}/students/import/init`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const adminGetStudentImportJob = (jobId: string) =>
    api.get<{
        job: {
            _id: string;
            status: string;
            sourceFileName: string;
            headers: string[];
            sampleRows: any[];
            mapping: Record<string, string>;
            defaults: Record<string, any>;
            validationSummary: any;
            commitSummary: any;
            error?: string;
        };
    }>(`/${ADMIN_PATH}/students/import/${jobId}`);

export const adminValidateStudentImport = (jobId: string, payload: { mapping: Record<string, string>; defaults: Record<string, any> }) =>
    api.post<{ message: string; summary: any }>(`/${ADMIN_PATH}/students/import/${jobId}/validate`, payload);

export const adminCommitStudentImport = (jobId: string, payload: { dryRun?: boolean; skipExisting?: boolean }) =>
    api.post<{ message: string; summary: any }>(`/${ADMIN_PATH}/students/import/${jobId}/commit`, payload);
export const adminGetUserActivity = (id: string) => api.get(`/${ADMIN_PATH}/users/${id}/activity`);
export const adminGetStudentProfile = (id: string) => api.get(`/${ADMIN_PATH}/users/${id}/student-profile`);
export const adminUpdateStudentProfile = (id: string, data: any) => api.put(`/${ADMIN_PATH}/users/${id}/student-profile`, data);
export const adminGetAdminProfile = (id: string) => api.get(`/${ADMIN_PATH}/users/${id}/admin-profile`);
export const adminUpdateAdminProfile = (id: string, data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/users/${id}/admin-profile`, data);
export const adminResetUserPassword = (userId: string, newPassword?: string) =>
    api.post(`/${ADMIN_PATH}/users/${userId}/reset-password`, { newPassword });
export const adminMfaConfirm = (password: string) =>
    api.post<{ message: string; mfaToken: string }>(`/${ADMIN_PATH}/auth/mfa/confirm`, { password });
export const adminRevealStudentPassword = (studentId: string, payload: { mfaToken: string; reason: string }) =>
    api.post<{
        message: string;
        user: { _id: string; username: string; email: string; role: string };
        password: string;
    }>(`/${ADMIN_PATH}/students/${studentId}/password/reveal`, payload);
export const adminIssueGuardianOtp = (studentId: string) =>
    api.post(`/${ADMIN_PATH}/users/${studentId}/guardian-otp/issue`);
export const adminConfirmGuardianOtp = (studentId: string, code: string) =>
    api.post(`/${ADMIN_PATH}/users/${studentId}/guardian-otp/confirm`, { code });

/* Admin - Student Management */
export interface AdminStudentFilter {
    page?: number;
    limit?: number;
    search?: string;
    batch?: string;
    sscBatch?: string;
    department?: string;
    group?: string;
    planCode?: string;
    status?: string;
    profileScoreBand?: 'lt70' | 'gte70';
    paymentStatus?: 'pending' | 'paid' | 'clear';
    startDate?: string;
    endDate?: string;
}

export const adminGetStudents = (params: AdminStudentFilter) => api.get<{
    items: AdminStudentItem[];
    total: number;
    pages: number;
    summary: Record<string, number>;
}>(`/${ADMIN_PATH}/students`, { params });

export const adminExportStudents = (
    params: (AdminStudentFilter & { format?: 'csv' | 'xlsx' }) | undefined = undefined
) => api.get(`/${ADMIN_PATH}/export-students`, {
    params: { ...params, format: params?.format || 'xlsx' },
    responseType: 'blob',
});

export const adminCreateStudent = (data: Record<string, unknown>) =>
    api.post(`/${ADMIN_PATH}/students`, data);

export const adminUpdateStudent = (id: string, data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/students/${id}`, data);

export const adminUpdateStudentSubscription = (id: string, data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/students/${id}/subscription`, data);

export const adminUpdateStudentGroups = (id: string, groupIds: string[]) =>
    api.patch(`/${ADMIN_PATH}/students/${id}/groups`, { groupIds });

export const adminGetStudentExams = (id: string) =>
    api.get<{ items: AdminStudentExamItem[]; lastUpdatedAt: string }>(`/${ADMIN_PATH}/students/${id}/exams`);

export const adminGetStudentGroups = () =>
    api.get<{ items: AdminStudentGroup[]; lastUpdatedAt: string }>(`/${ADMIN_PATH}/student-groups`);

export const adminExportStudentGroups = (
    params: { q?: string; format?: 'csv' | 'xlsx' } = {}
) =>
    api.get(`/${ADMIN_PATH}/student-groups/export`, {
        params: { ...params, format: params.format || 'xlsx' },
        responseType: 'blob',
    });

export const adminImportStudentGroups = (formData: FormData) =>
    api.post<{
        message: string;
        created: number;
        updated: number;
        skipped: number;
        totalRows: number;
        errors: string[];
    }>(`/${ADMIN_PATH}/student-groups/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const adminCreateStudentGroup = (data: Partial<AdminStudentGroup>) =>
    api.post<{ item: AdminStudentGroup }>(`/${ADMIN_PATH}/student-groups`, data);

export const adminUpdateStudentGroup = (id: string, data: Partial<AdminStudentGroup>) =>
    api.put<{ item: AdminStudentGroup }>(`/${ADMIN_PATH}/student-groups/${id}`, data);

export const adminDeleteStudentGroup = (id: string) =>
    api.delete(`/${ADMIN_PATH}/student-groups/${id}`);

export const adminBulkStudentAction = (data: { studentIds: string[]; action: string; groupId?: string }) =>
    api.post<{ message: string; action: string; affected: number }>(`/${ADMIN_PATH}/students/bulk-action`, data);

export const adminGetSubscriptionPlans = () =>
    api.get<{ items: AdminSubscriptionPlan[]; lastUpdatedAt: string }>(`/${ADMIN_PATH}/subscription-plans`);
export const adminGetSubscriptionPlanById = (id: string) =>
    api.get<{ item: AdminSubscriptionPlan }>(`/${ADMIN_PATH}/subscription-plans/${id}`);

export const adminCreateSubscriptionPlan = (data: Partial<AdminSubscriptionPlan>) =>
    api.post<{ item: AdminSubscriptionPlan }>(`/${ADMIN_PATH}/subscription-plans`, data);

export const adminUpdateSubscriptionPlan = (id: string, data: Partial<AdminSubscriptionPlan>) =>
    api.put<{ item: AdminSubscriptionPlan }>(`/${ADMIN_PATH}/subscription-plans/${id}`, data);

export const adminDeleteSubscriptionPlan = (id: string) =>
    api.delete<{ message: string }>(`/${ADMIN_PATH}/subscription-plans/${id}`);

export const adminToggleSubscriptionPlan = (id: string) =>
    api.patch<{ item: AdminSubscriptionPlan }>(`/${ADMIN_PATH}/subscription-plans/${id}/toggle`);

export const adminReorderSubscriptionPlans = (order: string[]) =>
    api.put<{ message: string }>(`/${ADMIN_PATH}/subscription-plans/reorder`, { order });

export const adminAssignSubscriptionPlan = (payload: SubscriptionAssignmentPayload) =>
    api.post<{ message: string; item: Record<string, unknown> }>(`/${ADMIN_PATH}/subscriptions/assign`, payload);

export const adminSuspendSubscriptionPlan = (payload: { userId: string; notes?: string }) =>
    api.post<{ message: string; item: Record<string, unknown> }>(`/${ADMIN_PATH}/subscriptions/suspend`, payload);

export interface AdminManualPayment {
    _id: string;
    studentId?: {
        _id: string;
        username?: string;
        email?: string;
        full_name?: string;
    } | string;
    subscriptionPlanId?: {
        _id: string;
        name?: string;
        code?: string;
    } | string | null;
    amount: number;
    method: 'bkash' | 'cash' | 'manual' | 'bank';
    entryType: 'subscription' | 'due_settlement' | 'other_income';
    date: string;
    reference?: string;
    notes?: string;
    recordedBy?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminExpenseItem {
    _id: string;
    category: 'server' | 'marketing' | 'staff_salary' | 'moderator_salary' | 'tools' | 'misc';
    amount: number;
    date: string;
    vendor?: string;
    notes?: string;
    linkedStaffId?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    recordedBy?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminDueLedgerItem {
    _id: string;
    studentId?: {
        _id: string;
        username?: string;
        email?: string;
        full_name?: string;
    } | string;
    computedDue: number;
    manualAdjustment: number;
    waiverAmount: number;
    netDue: number;
    note?: string;
    lastComputedAt?: string;
    updatedBy?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminStaffPayoutItem {
    _id: string;
    userId?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    role: string;
    amount: number;
    periodMonth?: string;
    paidAt: string;
    method: 'bkash' | 'cash' | 'manual' | 'bank';
    notes?: string;
    recordedBy?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
}

export interface AdminFinanceSummary {
    totalIncome: number;
    totalExpenses: number;
    directExpenses: number;
    salaryPayouts: number;
    netProfit: number;
    window: { from: string | null; to: string | null };
}

export interface AdminSupportTicketItem {
    _id: string;
    ticketNo: string;
    studentId?: {
        _id: string;
        username?: string;
        email?: string;
        full_name?: string;
    } | string;
    subject: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string | null;
    timeline?: Array<{
        actorId?: string;
        actorRole?: string;
        message: string;
        createdAt: string;
    }>;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminNoticeItem {
    _id: string;
    title: string;
    message: string;
    target: 'all' | 'groups' | 'students';
    targetIds?: string[];
    startAt?: string;
    endAt?: string | null;
    isActive: boolean;
    createdBy?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminBackupJobItem {
    _id: string;
    type: 'full' | 'incremental';
    storage: 'local' | 's3' | 'both';
    status: 'running' | 'completed' | 'failed';
    localPath?: string;
    s3Key?: string;
    checksum?: string;
    error?: string;
    restoreMeta?: Record<string, unknown>;
    requestedBy?: {
        _id: string;
        username?: string;
        full_name?: string;
        role?: string;
    } | string;
    createdAt?: string;
    updatedAt?: string;
}

export const adminGetPayments = (params?: {
    page?: number;
    limit?: number;
    studentId?: string;
    method?: string;
    entryType?: string;
    from?: string;
    to?: string;
}) =>
    api.get<{ items: AdminManualPayment[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/payments`, { params });

export const adminCreatePayment = (data: {
    studentId: string;
    subscriptionPlanId?: string;
    amount: number;
    method: 'bkash' | 'cash' | 'manual' | 'bank';
    entryType?: 'subscription' | 'due_settlement' | 'other_income';
    date?: string;
    reference?: string;
    notes?: string;
}) =>
    api.post<{ item: AdminManualPayment; message: string }>(`/${ADMIN_PATH}/payments`, data);

export const adminUpdatePayment = (id: string, data: Partial<{
    amount: number;
    method: 'bkash' | 'cash' | 'manual' | 'bank';
    entryType: 'subscription' | 'due_settlement' | 'other_income';
    date: string;
    reference: string;
    notes: string;
    subscriptionPlanId: string;
}>) =>
    api.put<{ item: AdminManualPayment; message: string }>(`/${ADMIN_PATH}/payments/${id}`, data);

export const adminGetStudentPayments = (studentId: string) =>
    api.get<{ items: AdminManualPayment[]; totalPaid: number }>(`/${ADMIN_PATH}/students/${studentId}/payments`);

export const adminGetExpenses = (params?: {
    page?: number;
    limit?: number;
    category?: string;
    from?: string;
    to?: string;
}) =>
    api.get<{ items: AdminExpenseItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/expenses`, { params });

export const adminCreateExpense = (data: {
    category: 'server' | 'marketing' | 'staff_salary' | 'moderator_salary' | 'tools' | 'misc';
    amount: number;
    date?: string;
    vendor?: string;
    notes?: string;
    linkedStaffId?: string;
}) =>
    api.post<{ item: AdminExpenseItem; message: string }>(`/${ADMIN_PATH}/expenses`, data);

export const adminUpdateExpense = (id: string, data: Partial<{
    category: 'server' | 'marketing' | 'staff_salary' | 'moderator_salary' | 'tools' | 'misc';
    amount: number;
    date: string;
    vendor: string;
    notes: string;
    linkedStaffId: string;
}>) =>
    api.put<{ item: AdminExpenseItem; message: string }>(`/${ADMIN_PATH}/expenses/${id}`, data);

export const adminGetStaffPayouts = (params?: { page?: number; limit?: number; from?: string; to?: string }) =>
    api.get<{ items: AdminStaffPayoutItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/staff-payouts`, { params });

export const adminCreateStaffPayout = (data: {
    userId: string;
    role?: string;
    amount: number;
    periodMonth?: string;
    paidAt?: string;
    method?: 'bkash' | 'cash' | 'manual' | 'bank';
    notes?: string;
}) =>
    api.post<{ item: AdminStaffPayoutItem; message: string }>(`/${ADMIN_PATH}/staff-payouts`, data);

export const adminGetFinanceSummary = (params?: { from?: string; to?: string }) =>
    api.get<AdminFinanceSummary>(`/${ADMIN_PATH}/finance/summary`, { params });

export const adminGetFinanceRevenueSeries = (params?: { from?: string; to?: string; bucket?: 'day' | 'month' }) =>
    api.get<{ bucket: 'day' | 'month'; series: Array<{ period: string; amount: number }> }>(`/${ADMIN_PATH}/finance/revenue-series`, { params });

export const adminGetFinanceExpenseBreakdown = (params?: { from?: string; to?: string }) =>
    api.get<{ items: Array<{ category: string; amount: number }> }>(`/${ADMIN_PATH}/finance/expense-breakdown`, { params });

export const adminGetFinanceCashflow = (params?: { from?: string; to?: string; bucket?: 'day' | 'month' }) =>
    api.get<{ bucket: 'day' | 'month'; items: Array<{ period: string; income: number; expense: number; net: number }> }>(`/${ADMIN_PATH}/finance/cashflow`, { params });

export const adminGetFinanceStudentGrowth = (params?: { from?: string; to?: string; bucket?: 'day' | 'month' }) =>
    api.get<{ bucket: 'day' | 'month'; items: Array<{ period: string; count: number }> }>(`/${ADMIN_PATH}/finance/student-growth`, { params });

export const adminGetFinancePlanDistribution = () =>
    api.get<{ distribution: Array<{ _id: string; count: number; planName: string }> }>(`/${ADMIN_PATH}/finance/plan-distribution`);

export const adminGetFinanceTestBoard = (params?: { from?: string; to?: string }) =>
    api.get<{
        liveIncome: number;
        liveExpense: number;
        netPosition: number;
        totalLiabilities: number;
        totalOperationalCost: number;
        subscriptionRevenueTracking: Array<{ planCode: string; amount: number }>;
        asOf: string;
    }>(`/${ADMIN_PATH}/finance/test-board`, { params });

export const getAdminFinanceStreamUrl = (token?: string) => {
    const authToken = token || readAccessToken();
    const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    return resolveApiUrl(`/${ADMIN_PATH}/finance/stream${query}`);
};

export const adminGetDues = (params?: { page?: number; limit?: number; status?: 'due' | 'cleared' | '' }) =>
    api.get<{ items: AdminDueLedgerItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/dues`, { params });

export const adminUpdateDue = (studentId: string, data: {
    computedDue: number;
    manualAdjustment: number;
    waiverAmount: number;
    note?: string;
}) =>
    api.patch<{ item: AdminDueLedgerItem; message: string }>(`/${ADMIN_PATH}/dues/${studentId}`, data);

export const adminSendDueReminder = (studentId: string) =>
    api.post<{ message: string; netDue: number }>(`/${ADMIN_PATH}/dues/${studentId}/remind`);

export const adminDispatchReminders = () =>
    api.post<{ message: string; summary: Record<string, unknown> }>(`/${ADMIN_PATH}/reminders/dispatch`);

export const adminGetNotices = (params?: { page?: number; limit?: number; target?: string; status?: string }) =>
    api.get<{ items: AdminNoticeItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/notices`, { params });

export const adminCreateNotice = (data: {
    title: string;
    message: string;
    target?: 'all' | 'groups' | 'students';
    targetIds?: string[];
    startAt?: string;
    endAt?: string;
    isActive?: boolean;
}) =>
    api.post<{ item: AdminNoticeItem; message: string }>(`/${ADMIN_PATH}/notices`, data);

export const adminToggleNotice = (id: string) =>
    api.patch<{ item: AdminNoticeItem; message: string }>(`/${ADMIN_PATH}/notices/${id}/toggle`);

export const adminGetSupportTickets = (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
}) =>
    api.get<{ items: AdminSupportTicketItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/support-tickets`, { params });

export const adminUpdateSupportTicketStatus = (id: string, data: {
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string | null;
}) =>
    api.patch<{ item: AdminSupportTicketItem; message: string }>(`/${ADMIN_PATH}/support-tickets/${id}/status`, data);

export const adminReplySupportTicket = (id: string, message: string) =>
    api.post<{ item: AdminSupportTicketItem; message: string }>(`/${ADMIN_PATH}/support-tickets/${id}/reply`, { message });

export const adminGetActionableAlerts = (params: { page?: number; limit?: number } = {}) =>
    api.get<{ items: AdminActionableAlertItem[]; total: number; unreadCount: number; page: number; pages: number }>(
        `/${ADMIN_PATH}/alerts/feed`,
        { params },
    );

export const adminMarkActionableAlertsRead = (ids?: string[]) =>
    api.post<{ updated: number }>(`/${ADMIN_PATH}/alerts/mark-read`, ids?.length ? { ids } : {});

export const adminRunBackup = (data?: { type?: 'full' | 'incremental'; storage?: 'local' | 's3' | 'both' }) =>
    api.post<{ item: AdminBackupJobItem; message: string }>(`/${ADMIN_PATH}/backups/run`, data || {});

export const adminListBackups = (params?: { page?: number; limit?: number }) =>
    api.get<{ items: AdminBackupJobItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/backups`, { params });

export const adminRestoreBackup = (id: string, confirmation: string) =>
    api.post<{ message: string; restoredFrom: string; preRestoreSnapshotId: string }>(
        `/${ADMIN_PATH}/backups/${id}/restore`,
        { confirmation },
    );

export const adminDownloadBackup = (id: string) =>
    api.get(`/${ADMIN_PATH}/backups/${id}/download`, { responseType: 'blob' });

export const getAdminBackupDownloadUrl = (id: string) => resolveApiUrl(`/${ADMIN_PATH}/backups/${id}/download`);

/* Admin - Security */
export const adminGetSecuritySettings = () =>
    api.get<{ security: AdminSecuritySettings }>(`/${ADMIN_PATH}/security/settings`);

export const adminUpdateSecuritySettings = (data: Partial<AdminSecuritySettings>) =>
    api.put<{ security: AdminSecuritySettings; message: string }>(`/${ADMIN_PATH}/security/settings`, data);

export const adminGetSecurityCenterSettings = () =>
    api.get<{ settings: SecurityCenterSettings }>(`/${ADMIN_PATH}/security-settings`);

export const adminUpdateSecurityCenterSettings = (data: Partial<SecurityCenterSettings>) =>
    api.put<{ settings: SecurityCenterSettings; message: string }>(`/${ADMIN_PATH}/security-settings`, data);

export const adminResetSecurityCenterSettings = () =>
    api.post<{ settings: SecurityCenterSettings; message: string }>(`/${ADMIN_PATH}/security-settings/reset-defaults`);

export const adminForceLogoutAllUsers = (reason?: string) =>
    api.post<{ terminatedCount: number; terminatedAt: string; message: string }>(
        `/${ADMIN_PATH}/security-settings/force-logout-all`,
        { reason },
    );

export const adminSetAdminPanelLockState = (adminPanelEnabled: boolean) =>
    api.post<{ settings: SecurityCenterSettings; message: string }>(
        `/${ADMIN_PATH}/security-settings/admin-panel-lock`,
        { adminPanelEnabled },
    );

export const adminGetPendingApprovals = (params?: { limit?: number }) =>
    api.get<{ items: AdminActionApproval[]; total: number }>(`/${ADMIN_PATH}/approvals/pending`, { params });

export const adminApprovePendingAction = (id: string) =>
    api.post<{ item: AdminActionApproval; message: string }>(`/${ADMIN_PATH}/approvals/${id}/approve`);

export const adminRejectPendingAction = (id: string, reason: string) =>
    api.post<{ item: AdminActionApproval; message: string }>(`/${ADMIN_PATH}/approvals/${id}/reject`, { reason });

export const adminGetJobRuns = (params?: { limit?: number }) =>
    api.get<{ items: AdminJobRunItem[]; total: number }>(`/${ADMIN_PATH}/jobs/runs`, { params });

export const adminGetJobHealth = (params?: { hours?: number }) =>
    api.get<AdminJobHealthSnapshot>(`/${ADMIN_PATH}/jobs/health`, { params });

export const getPublicSecurityConfig = () =>
    api.get<{
        maintenanceMode: boolean;
        blockNewRegistrations: boolean;
        requireProfileScoreForExam: boolean;
        profileScoreThreshold: number;
    }>('/security/public-config');

export const adminGetRuntimeSettings = () =>
    api.get<AdminRuntimeSettings>(`/${ADMIN_PATH}/settings/runtime`);

export const adminUpdateRuntimeSettings = (data: { security?: Partial<AdminSecuritySettings>; featureFlags?: Partial<AdminFeatureFlags> }) =>
    api.put<AdminRuntimeSettings>(`/${ADMIN_PATH}/settings/runtime`, data);

export const adminGetSecuritySessions = (params?: {
    userId?: string;
    status?: 'active' | 'terminated';
    page?: number;
    limit?: number;
}) =>
    api.get<{ items: AdminSecuritySessionItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/security/sessions`, { params });

export const adminForceLogout = (payload: { userId?: string; sessionId?: string; reason?: string }) =>
    api.post<{ terminatedCount: number; sessionIds: string[]; terminatedAt: string; message: string }>(`/${ADMIN_PATH}/security/force-logout`, payload);

export const adminGetTwoFactorUsers = (params?: {
    role?: string;
    enabled?: string;
    search?: string;
    page?: number;
    limit?: number;
}) =>
    api.get<{ items: AdminTwoFactorUserItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/security/2fa/users`, { params });

export const adminUpdateTwoFactorUser = (id: string, data: { twoFactorEnabled?: boolean; two_factor_method?: 'email' | 'sms' | 'authenticator' | null }) =>
    api.patch<{ message: string; user: AdminTwoFactorUserItem }>(`/${ADMIN_PATH}/security/2fa/users/${id}`, data);

export const adminResetTwoFactorUser = (id: string) =>
    api.post<{ message: string }>(`/${ADMIN_PATH}/security/2fa/users/${id}/reset`);

export const adminGetTwoFactorFailures = (params?: {
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}) =>
    api.get<{ items: AdminTwoFactorFailureItem[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/security/2fa/failures`, { params });

/* â€”â€” Admin â€” Student Dashboard Controls â€”â€” */
export const adminGetStudentDashboardConfig = () =>
    api.get<{ config: StudentDashboardConfig }>(`/${ADMIN_PATH}/student-dashboard-config`);
export const adminUpdateStudentDashboardConfig = (data: Partial<StudentDashboardConfig>) =>
    api.put<{ config: StudentDashboardConfig; message: string }>(`/${ADMIN_PATH}/student-dashboard-config`, data);

export const adminGetNotifications = () =>
    api.get<{ items: AdminNotificationItem[] }>(`/${ADMIN_PATH}/notifications`);
export const adminCreateNotification = (data: Partial<AdminNotificationItem>) =>
    api.post<{ item: AdminNotificationItem }>(`/${ADMIN_PATH}/notifications`, data);
export const adminUpdateNotification = (id: string, data: Partial<AdminNotificationItem>) =>
    api.put<{ item: AdminNotificationItem }>(`/${ADMIN_PATH}/notifications/${id}`, data);
export const adminDeleteNotification = (id: string) =>
    api.delete(`/${ADMIN_PATH}/notifications/${id}`);
export const adminToggleNotification = (id: string) =>
    api.patch<{ item: AdminNotificationItem }>(`/${ADMIN_PATH}/notifications/${id}/toggle`);

export const adminGetBadges = () =>
    api.get<{ items: AdminBadgeItem[] }>(`/${ADMIN_PATH}/badges`);
export const adminCreateBadge = (data: Partial<AdminBadgeItem>) =>
    api.post<{ item: AdminBadgeItem }>(`/${ADMIN_PATH}/badges`, data);
export const adminUpdateBadge = (id: string, data: Partial<AdminBadgeItem>) =>
    api.put<{ item: AdminBadgeItem }>(`/${ADMIN_PATH}/badges/${id}`, data);
export const adminDeleteBadge = (id: string) =>
    api.delete(`/${ADMIN_PATH}/badges/${id}`);
export const adminAssignBadge = (studentId: string, badgeId: string, note?: string) =>
    api.post(`/${ADMIN_PATH}/badges/assign`, { studentId, badgeId, note });
export const adminRevokeBadge = (studentId: string, badgeId: string) =>
    api.delete(`/${ADMIN_PATH}/badges/assign/${studentId}/${badgeId}`);
export const adminUploadMedia = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; filename: string; mimetype: string; size: number }>(`/${ADMIN_PATH}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
/* â”€â”€ Admin â€” News â”€â”€ */
export const adminGetNews = (params: Record<string, string | number> = {}) =>
    api.get<{ news: ApiNews[]; pagination: { total: number; page: number; limit: number; pages: number } }>(`/${ADMIN_PATH}/news`, { params });
export const adminCreateNews = (data: Partial<ApiNews>) =>
    api.post(`/${ADMIN_PATH}/news`, data);
export const adminUpdateNews = (id: string, data: Partial<ApiNews>) =>
    api.put(`/${ADMIN_PATH}/news/${id}`, data);
export const adminDeleteNews = (id: string) =>
    api.delete(`/${ADMIN_PATH}/news/${id}`);
export const adminToggleNewsPublish = (id: string) =>
    api.patch(`/${ADMIN_PATH}/news/${id}/toggle-publish`);

export interface ApiNewsV2Source {
    _id: string;
    name: string;
    rssUrl?: string;
    feedUrl: string;
    siteUrl?: string;
    iconType?: 'upload' | 'url';
    iconUrl?: string;
    enabled?: boolean;
    isActive: boolean;
    priority?: number;
    order: number;
    fetchIntervalMinutes?: number;
    fetchIntervalMin: number;
    categoryTags?: string[];
    lastFetchedAt?: string;
    lastSuccessAt?: string;
    lastError?: string;
    language?: string;
    tagsDefault: string[];
    categoryDefault?: string;
    maxItemsPerFetch: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiNewsV2Media {
    _id: string;
    url: string;
    storageKey?: string;
    mimeType?: string;
    size?: number;
    width?: number;
    height?: number;
    altText?: string;
    sourceType: 'upload' | 'url' | 'rss';
    isDefaultBanner: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiNewsV2AuditLog {
    _id: string;
    action: string;
    entityType: 'news' | 'source' | 'settings' | 'media' | 'export' | 'workflow';
    entityId?: string;
    actorId?: { _id: string; fullName?: string; username?: string; email?: string; role?: string };
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    createdAt: string;
}

export interface ApiNewsV2Settings {
    pageTitle?: string;
    pageSubtitle?: string;
    headerBannerUrl?: string;
    defaultBannerUrl?: string;
    defaultThumbUrl?: string;
    defaultSourceIconUrl?: string;
    fetchFullArticleEnabled?: boolean;
    fullArticleFetchMode?: 'rss_content' | 'readability_scrape' | 'both';
    rss: {
        enabled: boolean;
        defaultFetchIntervalMin: number;
        maxItemsPerFetch: number;
        duplicateThreshold: number;
        autoCreateAs: 'pending_review' | 'draft';
    };
    ai: {
        enabled: boolean;
        language: 'bn' | 'en' | 'mixed';
        stylePreset: 'short' | 'standard' | 'detailed';
        apiProviderUrl: string;
        apiKey: string;
        customPrompt: string;
        strictNoHallucination: boolean;
        maxLength: number;
        duplicateSensitivity: 'strict' | 'medium' | 'loose';
        temperature: number;
    };
    aiSettings?: {
        enabled: boolean;
        language: 'bn' | 'en' | 'mixed' | 'BN' | 'EN' | 'MIXED';
        stylePreset: 'short' | 'very_short' | 'standard' | 'detailed';
        apiProviderUrl?: string;
        apiKey?: string;
        customPrompt?: string;
        strictNoHallucination?: boolean;
        strictMode?: boolean;
        duplicateSensitivity: 'strict' | 'medium' | 'loose';
        maxLength: number;
        promptTemplate?: string;
        autoRemoveDuplicates?: boolean;
    };
    appearance: {
        layoutMode: 'rss_reader' | 'grid' | 'list';
        density?: 'compact' | 'comfortable';
        paginationMode?: 'infinite' | 'pages';
        showWidgets?: {
            trending: boolean;
            latest: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        };
        showSourceIcons: boolean;
        showTrendingWidget: boolean;
        showCategoryWidget: boolean;
        showShareButtons: boolean;
        animationLevel: 'off' | 'minimal' | 'normal' | 'none' | 'subtle' | 'rich';
        cardDensity: 'compact' | 'comfortable';
        thumbnailFallbackUrl: string;
    };
    share: {
        enabledChannels: Array<'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text'>;
        shareButtons?: {
            whatsapp: boolean;
            facebook: boolean;
            messenger: boolean;
            telegram: boolean;
            copyLink: boolean;
            copyText: boolean;
        };
        templates: Record<string, string>;
        utm: {
            enabled: boolean;
            source: string;
            medium: string;
            campaign: string;
        };
    };
    shareTemplates?: {
        whatsapp: string;
        facebook: string;
        messenger: string;
        telegram: string;
    };
    workflow: {
        requireApprovalBeforePublish: boolean;
        allowSchedulePublish: boolean;
        allowAutoPublishFromAi: boolean;
        autoDraftFromRSS?: boolean;
        defaultIncomingStatus?: 'pending_review' | 'draft';
        allowScheduling?: boolean;
        openOriginalWhenExtractionIncomplete?: boolean;
        autoExpireDays?: number | null;
    };
}

export const adminNewsV2GetDashboard = () =>
    api.get<{
        cards: { pending: number; duplicate: number; published: number; scheduled: number; fetchFailed: number; activeSources: number };
        latestJobs: any[];
        latestRssItems: ApiNews[];
    }>(`/${ADMIN_PATH}/news-v2/dashboard`);
export const adminNewsV2FetchNow = (sourceIds: string[] = []) =>
    api.post<{ message: string; stats: { fetchedCount: number; createdCount: number; duplicateCount: number; failedCount: number; errors: Array<{ sourceId?: string; message: string }> } }>(`/${ADMIN_PATH}/rss/fetch-now`, { sourceIds });
export const adminNewsV2GetItems = (params: Record<string, string | number | boolean> = {}) =>
    api.get<{ items: ApiNews[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/news`, { params });
export const adminNewsV2GetItemById = (id: string) =>
    api.get<{ item: ApiNews }>(`/${ADMIN_PATH}/news/${id}`);
export const adminNewsV2CreateItem = (data: Partial<ApiNews>) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news`, data);
export const adminNewsV2UpdateItem = (id: string, data: Partial<ApiNews>) =>
    api.put<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}`, data);
export const adminNewsV2SubmitReview = (id: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/submit-review`);
export const adminNewsV2Approve = (id: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/approve`);
export const adminNewsV2ApprovePublish = (id: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/approve-publish`);
export const adminNewsV2Reject = (id: string, reason = '') =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/reject`, { reason });
export const adminNewsV2PublishNow = (id: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/publish-now`);
export const adminNewsV2Schedule = (id: string, scheduleAt: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/schedule`, { scheduleAt });
export const adminNewsV2MoveToDraft = (id: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/move-to-draft`);
export const adminNewsV2PublishAnyway = (id: string) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/publish-anyway`);
export const adminNewsV2MergeDuplicate = (
    id: string,
    payload: { targetNewsId: string; mergeContent?: boolean; appendSourceLink?: boolean },
) =>
    api.post<{ item: ApiNews; message: string }>(`/${ADMIN_PATH}/news/${id}/merge`, payload);
export const adminNewsV2AiCheckItem = (
    id: string,
    payload: { applyToDraft?: boolean; checkOnly?: boolean } = {}
) =>
    api.post<{
        item?: ApiNews;
        message: string;
        warning?: string;
        warnings?: string[];
        aiEnabled?: boolean;
        applied?: boolean;
        preview?: {
            title?: string;
            shortSummary?: string;
            fullContent?: string;
        };
    }>(`/${ADMIN_PATH}/news/${id}/ai-check`, payload);
export const adminNewsV2BulkApprove = (ids: string[]) =>
    api.post<{ modifiedCount: number; message: string }>(`/${ADMIN_PATH}/news-v2/items/bulk-approve`, { ids });
export const adminNewsV2BulkReject = (ids: string[], reason = '') =>
    api.post<{ modifiedCount: number; message: string }>(`/${ADMIN_PATH}/news-v2/items/bulk-reject`, { ids, reason });

export const adminNewsV2GetSources = () =>
    api.get<{ items: ApiNewsV2Source[] }>(`/${ADMIN_PATH}/rss-sources`);
export const adminGetRssSources = () =>
    api.get<{ items: ApiNewsV2Source[] }>(`/${ADMIN_PATH}/rss-sources`);
export const adminNewsV2CreateSource = (data: Partial<ApiNewsV2Source>) =>
    api.post<{ item: ApiNewsV2Source; message: string }>(`/${ADMIN_PATH}/rss-sources`, data);
export const adminCreateRssSource = (data: Partial<ApiNewsV2Source>) =>
    api.post<{ item: ApiNewsV2Source; message: string }>(`/${ADMIN_PATH}/rss-sources`, data);
export const adminNewsV2UpdateSource = (id: string, data: Partial<ApiNewsV2Source>) =>
    api.put<{ item: ApiNewsV2Source; message: string }>(`/${ADMIN_PATH}/rss-sources/${id}`, data);
export const adminUpdateRssSource = (id: string, data: Partial<ApiNewsV2Source>) =>
    api.put<{ item: ApiNewsV2Source; message: string }>(`/${ADMIN_PATH}/rss-sources/${id}`, data);
export const adminNewsV2DeleteSource = (id: string) =>
    api.delete<{ message: string }>(`/${ADMIN_PATH}/rss-sources/${id}`);
export const adminDeleteRssSource = (id: string) =>
    api.delete<{ message: string }>(`/${ADMIN_PATH}/rss-sources/${id}`);
export const adminNewsV2TestSource = (id: string) =>
    api.post<{ ok: boolean; title?: string; preview?: Array<{ title: string; link: string; pubDate: string }>; message?: string }>(`/${ADMIN_PATH}/rss-sources/${id}/test`);
export const adminTestRssSource = (id: string) =>
    api.post<{ ok: boolean; title?: string; preview?: Array<{ title: string; link: string; pubDate: string }>; message?: string }>(`/${ADMIN_PATH}/rss-sources/${id}/test`);
export const adminNewsV2ReorderSources = (ids: string[]) =>
    api.post<{ message: string }>(`/${ADMIN_PATH}/news-v2/sources/reorder`, { ids });

export const adminNewsV2GetAppearance = () =>
    api.get<{ appearance: ApiNewsV2Settings['appearance'] }>(`/${ADMIN_PATH}/news-v2/settings/appearance`);
export const adminNewsV2UpdateAppearance = (data: Partial<ApiNewsV2Settings['appearance']>) =>
    api.put<{ appearance: ApiNewsV2Settings['appearance']; message: string }>(`/${ADMIN_PATH}/news-v2/settings/appearance`, data);
export const adminNewsV2GetAiSettings = () =>
    api.get<{ ai: ApiNewsV2Settings['ai'] }>(`/${ADMIN_PATH}/news-v2/settings/ai`);
export const adminNewsV2UpdateAiSettings = (data: Partial<ApiNewsV2Settings['ai']>) =>
    api.put<{ ai: ApiNewsV2Settings['ai']; message: string }>(`/${ADMIN_PATH}/news-v2/settings/ai`, data);
export const adminNewsV2GetShareSettings = () =>
    api.get<{ share: ApiNewsV2Settings['share'] }>(`/${ADMIN_PATH}/news-v2/settings/share`);
export const adminNewsV2UpdateShareSettings = (data: Partial<ApiNewsV2Settings['share']>) =>
    api.put<{ share: ApiNewsV2Settings['share']; message: string }>(`/${ADMIN_PATH}/news-v2/settings/share`, data);
export const adminGetNewsSettings = () =>
    api.get<{ settings: ApiNewsV2Settings }>(`/${ADMIN_PATH}/news-settings`);
export const adminUpdateNewsSettings = (data: Partial<ApiNewsV2Settings>) =>
    api.put<{ settings: ApiNewsV2Settings; message: string }>(`/${ADMIN_PATH}/news-settings`, data);

export const adminNewsV2GetMedia = (params: Record<string, string | number> = {}) =>
    api.get<{ items: ApiNewsV2Media[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/news-v2/media`, { params });
export const adminNewsV2UploadMedia = (file: File, payload?: { altText?: string; isDefaultBanner?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (payload?.altText) formData.append('altText', payload.altText);
    if (payload?.isDefaultBanner) formData.append('isDefaultBanner', 'true');
    return api.post<{ item: ApiNewsV2Media; message: string }>(`/${ADMIN_PATH}/news-v2/media/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
export const adminUploadNewsMedia = (file: File, payload?: { altText?: string; isDefaultBanner?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (payload?.altText) formData.append('altText', payload.altText);
    if (payload?.isDefaultBanner) formData.append('isDefaultBanner', 'true');
    return api.post(`/${ADMIN_PATH}/media/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
export const adminNewsV2MediaFromUrl = (url: string, altText = '', isDefaultBanner = false) =>
    api.post<{ item: ApiNewsV2Media; message: string }>(`/${ADMIN_PATH}/news-v2/media/from-url`, { url, altText, isDefaultBanner });
export const adminNewsV2DeleteMedia = (id: string) =>
    api.delete<{ message: string }>(`/${ADMIN_PATH}/news-v2/media/${id}`);

export const adminNewsV2ExportNews = (
    options: {
        format?: 'csv' | 'xlsx';
        status?: string;
        dateRange?: string;
        sourceId?: string;
    } | 'csv' | 'xlsx' = 'xlsx'
) => {
    const resolved = typeof options === 'string'
        ? { format: options }
        : options;
    return api.get(`/${ADMIN_PATH}/news/export`, {
        params: {
            format: resolved.format || 'xlsx',
            status: resolved.status || undefined,
            dateRange: resolved.dateRange || undefined,
            sourceId: resolved.sourceId || undefined,
        },
        responseType: 'blob',
    });
};
export const adminNewsV2ExportSources = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/news/rss-sources/export`, { params: { format }, responseType: 'blob' });
export const adminNewsV2ExportLogs = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/news-v2/exports/logs`, { params: { format }, responseType: 'blob' });
export const adminExportNewsHub = (params: Record<string, string | number> = {}) =>
    api.get(`/${ADMIN_PATH}/news/export`, { params, responseType: 'blob' });
export const adminExportRssSources = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/news/rss-sources/export`, { params: { format }, responseType: 'blob' });
export const adminNewsV2GetAuditLogs = (params: Record<string, string | number> = {}) =>
    api.get<{ items: ApiNewsV2AuditLog[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/news-v2/audit-logs`, { params });
export const adminGetNewsAuditLogs = (params: Record<string, string | number> = {}) =>
    api.get<{ items: ApiNewsV2AuditLog[]; total: number; page: number; pages: number }>(`/${ADMIN_PATH}/audit-logs`, {
        params: { ...params, module: 'news' },
    });

export const getPublicNewsV2List = (params: Record<string, string | number> = {}) =>
    api.get<{ items: ApiNews[]; total: number; page: number; pages: number }>('/news', { params });
export const getPublicNewsV2BySlug = (slug: string) =>
    api.get<{ item: ApiNews; related?: ApiNews[] }>(`/news/${slug}`);
export const getPublicNewsV2Appearance = () =>
    api.get<{ appearance: ApiNewsV2Settings['appearance'] }>('/news-v2/config/appearance');
export const getPublicNewsV2Widgets = () =>
    api.get<{ trending: ApiNews[]; categories: Array<{ _id: string; count: number }>; tags: Array<{ _id: string; count: number }> }>('/news-v2/widgets');
export const getPublicNewsSources = () =>
    api.get<{ items: ApiNewsPublicSource[] }>('/news/sources');
export const getPublicNewsSettings = () =>
    api.get<ApiNewsPublicSettings>('/news/settings').then((response) => {
        const data = response.data || ({} as ApiNewsPublicSettings);
        const pageTitle = String(data.pageTitle || data.newsPageTitle || 'Admission News & Updates').trim() || 'Admission News & Updates';
        const pageSubtitle =
            String(data.pageSubtitle || data.newsPageSubtitle || 'Live updates from verified CampusWay RSS feeds.').trim()
            || 'Live updates from verified CampusWay RSS feeds.';

        response.data = {
            ...data,
            pageTitle,
            pageSubtitle,
            newsPageTitle: data.newsPageTitle || pageTitle,
            newsPageSubtitle: data.newsPageSubtitle || pageSubtitle,
        };
        return response;
    });
export const trackPublicNewsV2Share = (slug: string, channel: string) =>
    api.post<{ ok: boolean; shareCount: number }>('/news/share/track', { slug, channel });

/* â”€â”€ Admin â€” News Category â”€â”€ */
export const adminGetNewsCategories = () =>
    api.get<{ categories: ApiNewsCategory[] }>(`/${ADMIN_PATH}/news-category`);
export const adminCreateNewsCategory = (data: Partial<ApiNewsCategory>) =>
    api.post(`/${ADMIN_PATH}/news-category`, data);
export const adminUpdateNewsCategory = (id: string, data: Partial<ApiNewsCategory>) =>
    api.put(`/${ADMIN_PATH}/news-category/${id}`, data);
export const adminDeleteNewsCategory = (id: string) =>
    api.delete(`/${ADMIN_PATH}/news-category/${id}`);
export const adminToggleNewsCategory = (id: string) =>
    api.patch(`/${ADMIN_PATH}/news-category/${id}/toggle`);

/* â”€â”€ Admin â€” Services â”€â”€ */
export const adminGetServices = (params: Record<string, string | number> = {}) =>
    api.get<{ services: ApiService[]; pagination: any }>(`/${ADMIN_PATH}/services`, { params });
export const adminCreateService = (data: Partial<ApiService>) =>
    api.post<{ service: ApiService; message: string }>(`/${ADMIN_PATH}/services`, data);
export const adminUpdateService = (id: string, data: Partial<ApiService>) =>
    api.put<{ service: ApiService; message: string }>(`/${ADMIN_PATH}/services/${id}`, data);
export const adminDeleteService = (id: string) =>
    api.delete(`/${ADMIN_PATH}/services/${id}`);
export const adminReorderServices = (idsInOrder: string[]) =>
    api.post(`/${ADMIN_PATH}/services/reorder`, { ids_in_order: idsInOrder });
export const adminToggleServiceStatus = (id: string, is_active: boolean) =>
    api.patch<{ service: ApiService; message: string }>(`/${ADMIN_PATH}/services/${id}/toggle-status`, { is_active });
export const adminToggleServiceFeatured = (id: string, is_featured: boolean) =>
    api.patch<{ service: ApiService; message: string }>(`/${ADMIN_PATH}/services/${id}/toggle-featured`, { is_featured });

/* â”€â”€ Admin â€” Service Categories â”€â”€ */
export const adminGetServiceCategories = () =>
    api.get<{ categories: ApiServiceCategory[] }>(`/${ADMIN_PATH}/service-categories`);
export const adminCreateServiceCategory = (data: Partial<ApiServiceCategory>) =>
    api.post<{ category: ApiServiceCategory; message: string }>(`/${ADMIN_PATH}/service-categories`, data);
export const adminUpdateServiceCategory = (id: string, data: Partial<ApiServiceCategory>) =>
    api.put<{ category: ApiServiceCategory; message: string }>(`/${ADMIN_PATH}/service-categories/${id}`, data);
export const adminDeleteServiceCategory = (id: string) =>
    api.delete(`/${ADMIN_PATH}/service-categories/${id}`);

/* â”€â”€ Public â€” Services â”€â”€ */
export const getPublicServices = (params: Record<string, string | number | boolean> = {}) =>
    api.get<{ services: ApiService[]; pagination: any }>('/services', { params });
export const getPublicServiceCategories = () =>
    api.get<{ categories: ApiServiceCategory[] }>('/service-categories');
export const getPublicServiceDetails = (id: string) =>
    api.get<{ service: ApiService; relatedServices: ApiService[] }>(`/services/${id}`);
export const getPublicServiceConfig = () =>
    api.get<{ config: ApiServiceConfig }>('/services-config');
export const getServiceDetails = getPublicServiceDetails;
export const getServiceBySlug = getPublicServiceDetails;

/* â”€â”€ Admin â€” Resources â”€â”€ */
export const adminGetResources = (params: Record<string, string | number> = {}) =>
    api.get(`/${ADMIN_PATH}/resources`, { params });
export const adminCreateResource = (data: Record<string, unknown>) =>
    api.post(`/${ADMIN_PATH}/resources`, data);
export const adminUpdateResource = (id: string, data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/resources/${id}`, data);
export const adminDeleteResource = (id: string) =>
    api.delete(`/${ADMIN_PATH}/resources/${id}`);
export const adminToggleResourcePublish = (id: string) =>
    api.patch(`/${ADMIN_PATH}/resources/${id}/toggle-publish`);
export const adminToggleResourceFeatured = (id: string) =>
    api.patch(`/${ADMIN_PATH}/resources/${id}/toggle-featured`);
export const adminGetResourceSettings = () =>
    api.get(`/${ADMIN_PATH}/resource-settings`);
export const adminUpdateResourceSettings = (data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/resource-settings`, data);
export const getResourceBySlug = (slug: string) =>
    api.get(`/resources/${encodeURIComponent(slug)}`);

/* â”€â”€ Admin â€” Contact Messages â”€â”€ */
export const adminGetContactMessages = (params: Record<string, string | number> = {}) =>
    api.get(`/${ADMIN_PATH}/contact-messages`, { params });
export const adminUpdateContactMessage = (id: string, data: { isRead?: boolean; isReplied?: boolean }) =>
    api.patch<{ item: Record<string, unknown>; message: string }>(`/${ADMIN_PATH}/contact-messages/${id}`, data);
export const adminDeleteContactMessage = (id: string) =>
    api.delete(`/${ADMIN_PATH}/contact-messages/${id}`);

/* â”€â”€ Admin â€” Site Settings â”€â”€ */
export const adminGetSettings = () =>
    api.get(`/${ADMIN_PATH}/settings`);
export const adminUpdateSettings = (data: Record<string, unknown>) =>
    api.put(`/${ADMIN_PATH}/settings`, data);


/* â”€â”€ Admin â€” Data Exports â”€â”€ */
export const adminExportNews = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/news/export`, {
        params: { format },
        responseType: 'blob',
    });
export const adminExportSubscriptionPlans = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/subscription-plans/export`, {
        params: { format },
        responseType: 'blob',
    });
export const adminExportSubscriptionPlansLegacyJson = () =>
    api.get(`/${ADMIN_PATH}/export-subscription-plans`);
export const adminExportSubscriptions = (format: 'csv' | 'xlsx' = 'xlsx', status?: UserSubscriptionStatus['status']) =>
    api.get(`/${ADMIN_PATH}/subscriptions/export`, {
        params: { format, ...(status ? { status } : {}) },
        responseType: 'blob',
    });
export const adminExportUniversities = (params: Record<string, string | number> = {}) =>
    api.get(`/${ADMIN_PATH}/universities/export`, {
        params: { ...params, format: params['format'] || 'xlsx' },
        responseType: 'blob',
    });
export const adminExportStudentExamHistory = (format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/export/student-exam-history`, { params: { format }, responseType: 'blob' });

/* â”€â”€ Admin â€” Password Change â”€â”€ */
export const changePassword = (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword });

/* â”€â”€ Admin â€” Dynamic Home Page System â”€â”€ */
export const adminGetHomeSystem = () => api.get<HomeApiResponse>('/home');
export const adminGetHomeSettings = () =>
    api.get<{ homeSettings: HomeSettingsConfig; updatedAt?: string }>(`/${ADMIN_PATH}/home-settings`);
export const adminGetHomeSettingsDefaults = () =>
    api.get<{ defaults: HomeSettingsConfig }>(`/${ADMIN_PATH}/home-settings/defaults`);
export const adminUpdateHomeSettings = (patch: Partial<HomeSettingsConfig>) =>
    api.put<{ message: string; homeSettings: HomeSettingsConfig; updatedAt?: string }>(`/${ADMIN_PATH}/home-settings`, patch);
export const adminResetHomeSettingsSection = (section: keyof HomeSettingsConfig | string) =>
    api.post<{ message: string; section: string; value: unknown; updatedAt?: string }>(`/${ADMIN_PATH}/home-settings/reset-section`, { section });
/* ── Admin – Home Config (Section Order) ── */
export interface HomeConfigSection { id: string; title: string; isActive: boolean; order: number; config?: Record<string, unknown> }
export interface HomeConfigResponse { _id?: string; sections: HomeConfigSection[]; activeTheme?: string; selectedUniversityCategories?: string[]; highlightCategoryIds?: string[] }
export const adminGetHomeConfig = () => api.get<HomeConfigResponse>(`/${ADMIN_PATH}/home-config`);
export const adminUpdateHomeConfig = (data: Partial<HomeConfigResponse>) =>
    api.put<HomeConfigResponse>(`/${ADMIN_PATH}/home-config`, data);

export const adminGetSettingsSite = () => api.get(`/${ADMIN_PATH}/settings/site`);
export const adminUpdateSettingsSite = (data: FormData) => api.put(`/${ADMIN_PATH}/settings/site`, data);
export const adminGetDashboardSummary = () => api.get<AdminDashboardSummary>(`/${ADMIN_PATH}/dashboard/summary`);
export const adminGetSocialLinks = () => api.get<{ items: PublicSocialLinkItem[] }>(`/${ADMIN_PATH}/social-links`);
export const adminCreateSocialLink = (data: Record<string, unknown>) =>
    api.post<{ message: string; items: PublicSocialLinkItem[] }>(`/${ADMIN_PATH}/social-links`, data);
export const adminUpdateSocialLink = (id: string, data: Record<string, unknown>) =>
    api.put<{ message: string; items: PublicSocialLinkItem[] }>(`/${ADMIN_PATH}/social-links/${id}`, data);
export const adminDeleteSocialLink = (id: string) => api.delete(`/${ADMIN_PATH}/social-links/${id}`);
export const adminBulkImportUniversities = (data: FormData) =>
    api.post(`/${ADMIN_PATH}/universities/import-excel`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const adminExportExamResults = (examId: string) =>
    api.get(`/${ADMIN_PATH}/exams/${examId}/export`, { responseType: 'blob' });
export const adminDownloadExamResultImportTemplate = (examId: string, format: 'csv' | 'xlsx' = 'xlsx') =>
    api.get(`/${ADMIN_PATH}/exams/${examId}/results/import-template`, {
        params: { format },
        responseType: 'blob',
    });
export const adminImportExamResultsFile = (examId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/${ADMIN_PATH}/exams/${examId}/results/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
export const adminExportExamReport = (
    examId: string,
    options: { format?: 'xlsx' | 'csv' | 'pdf'; groupId?: string } = {},
) =>
    api.get(`/${ADMIN_PATH}/exams/${examId}/reports/export`, {
        params: options,
        responseType: 'blob',
    });
export const adminUpdateWebsiteSettings = (data: FormData) => api.put(`/${ADMIN_PATH}/home/settings`, data);
export const adminUpdateHomePage = (data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/home`, data);
export const adminUpdateHomeHero = (data: FormData) => api.put(`/${ADMIN_PATH}/home/hero`, data);
export const adminUpdateHomeBanner = (data: FormData) => api.put(`/${ADMIN_PATH}/home/banner`, data);
export const adminUpdateHomeAnnouncement = (data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/home/announcement`, data);
export const adminUpdateHomeStats = (data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/home/stats`, data);
export const adminGetAlerts = (params: Record<string, string | number> = {}) => api.get(`/${ADMIN_PATH}/home-alerts`, { params });
export const adminCreateAlert = (data: Record<string, unknown>) => api.post(`/${ADMIN_PATH}/home-alerts`, data);
export const adminUpdateAlert = (id: string, data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/home-alerts/${id}`, data);
export const adminPublishAlert = (id: string, publish = true) => api.put(`/${ADMIN_PATH}/home-alerts/${id}/publish`, { publish });
export const adminDeleteAlert = (id: string) => api.delete(`/${ADMIN_PATH}/home-alerts/${id}`);
export const adminGetBanners = () => api.get(`/${ADMIN_PATH}/banners`);
export const adminCreateBanner = (data: Record<string, unknown>) => api.post(`/${ADMIN_PATH}/banners`, data);
export const adminUpdateBanner = (id: string, data: Record<string, unknown>) => api.put(`/${ADMIN_PATH}/banners/${id}`, data);
export const adminPublishBanner = (id: string, publish = true) => api.put(`/${ADMIN_PATH}/banners/${id}/publish`, { publish });
export const adminDeleteBanner = (id: string) => api.delete(`/${ADMIN_PATH}/banners/${id}`);
export const adminSignBannerUpload = (filename: string, mimeType: string) =>
    api.post<{
        provider: 's3' | 'local' | 'firebase';
        method: 'PUT' | 'POST';
        uploadUrl: string;
        publicUrl: string;
        headers?: Record<string, string>;
        fields?: Record<string, string>;
        expiresIn: number;
    }>(`/${ADMIN_PATH}/banners/sign-upload`, { filename, mimeType });

/* â”€â”€ Student Exam Interfacing â”€â”€ */
export const getStudentExamById = (id: string) =>
    api.get<{
        exam: ApiExam & { require_instructions_agreement?: boolean };
        hasActiveSession: boolean;
        activeAttemptId?: string | null;
        eligibility?: {
            eligible: boolean;
            reasons: string[];
            profileComplete: boolean;
            requiredProfileCompletion: number;
            currentProfileCompletion: number;
            subscriptionActive: boolean;
            attemptsUsed: number;
            attemptsLeft: number;
            windowOpen: boolean;
            accessAllowed: boolean;
        };
        serverNow?: string;
    }>(`/exams/${id}`);
export const getStudentExamDetails = (id: string) =>
    api.get<{
        exam: ApiExam & { require_instructions_agreement?: boolean };
        hasActiveSession: boolean;
        activeAttemptId?: string | null;
        eligibility?: {
            eligible: boolean;
            reasons: string[];
            profileComplete: boolean;
            requiredProfileCompletion: number;
            currentProfileCompletion: number;
            subscriptionActive: boolean;
            attemptsUsed: number;
            attemptsLeft: number;
            windowOpen: boolean;
            accessAllowed: boolean;
        };
        serverNow?: string;
    }>(`/exams/${id}/details`);
export const startExam = (id: string) => api.post<{
    session: ApiExamSession;
    exam: ApiExam;
    questions: ApiQuestion[];
    redirect?: boolean;
    externalExamUrl?: string;
    serverNow?: string;
    serverOffsetMs?: number;
    resultPublishMode?: 'immediate' | 'manual' | 'scheduled';
    autosaveIntervalSec?: number;
}>(`/exams/${id}/start`);
export const autosaveExam = (id: string, payload: SaveExamAttemptAnswerPayload & { attemptId?: string; written_uploads?: any[] }) =>
    api.put<SaveExamAttemptAnswerResponse>(`/exams/${id}/autosave`, payload);
export const submitExam = (id: string, payload?: SubmitExamAttemptPayload & { attemptId?: string }) =>
    api.post<SubmitExamAttemptResponse>(`/exams/${id}/submit`, payload || {});
export const getExamResult = (id: string) => api.get<{
    resultPublished: boolean;
    resultPublishMode?: 'immediate' | 'manual' | 'scheduled';
    reviewSettings?: ApiExam['reviewSettings'];
    result: any;
    exam: any;
    publishDate?: string;
}>(`/exams/${id}/result`);
export const getExamAttemptState = (examId: string, attemptId: string) =>
    api.get<ExamAttemptStateResponse>(`/exams/${examId}/attempt/${attemptId}`);
export const saveExamAttemptAnswer = (examId: string, attemptId: string, payload: SaveExamAttemptAnswerPayload) =>
    api.post<SaveExamAttemptAnswerResponse>(`/exams/${examId}/attempt/${attemptId}/answer`, payload);
export const submitExamAttempt = (examId: string, attemptId: string, payload?: SubmitExamAttemptPayload) =>
    api.post<SubmitExamAttemptResponse>(`/exams/${examId}/attempt/${attemptId}/submit`, payload || {});
export const logExamAttemptEvent = (examId: string, attemptId: string, payload: LogExamAttemptEventPayload) =>
    api.post<LogExamAttemptEventResponse>(`/exams/${examId}/attempt/${attemptId}/event`, payload);
export const uploadWrittenAnswer = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/exams/upload-written-answer', formData);
};
export const getExamCertificate = (examId: string, download = false) =>
    api.get<{ eligible: boolean; certificate?: ApiExamCertificate; reasons?: string[]; message?: string }>(
        `/exams/${examId}/certificate`,
        { params: download ? { download: 1 } : undefined },
    );
export const verifyExamCertificate = (certificateId: string, token?: string) =>
    api.get<ApiCertificateVerification>(`/certificates/${certificateId}/verify`, {
        params: token ? { token } : undefined,
    });

// Legacy / Helper aliases to prevent breakage during refactor
export const getExamData = startExam;
export const getExamQuestions = (id: string, params?: { random?: boolean; limit?: number }) =>
    api.get<{ questions: ApiQuestion[]; total: number; serverNow?: string }>(`/exams/${id}/questions`, { params });
export const saveExamAnswer = (id: string, payload: any) => api.put(`/exams/${id}/autosave`, { answers: payload });
export const logCheatEvent = (id: string, payload: any) => api.put(`/exams/${id}/autosave`, { cheat_flags: [payload] });

/* â”€â”€ Admin â€” System Logs â”€â”€ */
export const adminGetAuditLogs = (params?: {
    page?: number;
    limit?: number;
    action?: string;
    actor?: string;
    dateFrom?: string;
    dateTo?: string;
    scope?: string;
    module?: string;
}) => api.get(`/${ADMIN_PATH}/audit-logs`, { params });

/* â”€â”€ Student Portal â”€â”€ */
export const getStudentProfile = () => api.get('/student/profile');
export const updateStudentProfile = (data: any) => api.put('/student/profile', data);
export const uploadStudentDocument = (data: FormData) => api.post('/student/profile/documents', data);
export const getStudentApplications = () => api.get('/student/applications');
export const createStudentApplication = (data: { university_id: string, program: string }) => api.post('/student/applications', data);

export const adminGetProfileUpdateRequests = (params: any = {}) =>
    api.get<{ items: AdminProfileUpdateRequestItem[] }>(`/${ADMIN_PATH}/students/profile-requests`, { params });
export const adminApproveProfileUpdateRequest = (id: string) => api.post(`/${ADMIN_PATH}/students/profile-requests/${id}/approve`);
export const adminRejectProfileUpdateRequest = (id: string, feedback?: string) => api.post(`/${ADMIN_PATH}/students/profile-requests/${id}/reject`, { feedback });

/* ── Analytics & Notification Automation ── */
export const getPublicAnalyticsSettings = () =>
    api.get<{ enabled: boolean; trackAnonymous: boolean; eventToggles: AnalyticsSettings['eventToggles'] }>('/settings/analytics');

export const trackAnalyticsEvent = (payload: {
    eventName: string;
    module?: string;
    source?: 'public' | 'student' | 'admin';
    sessionId?: string;
    meta?: Record<string, unknown>;
}) => api.post<{ accepted: boolean; id?: string; reason?: string }>('/events/track', payload);

export const adminGetNotificationAutomationSettings = () =>
    api.get<{ settings: NotificationAutomationSettings }>(`/${ADMIN_PATH}/settings/notifications`);

export const adminUpdateNotificationAutomationSettings = (data: Partial<NotificationAutomationSettings>) =>
    api.put<{ message: string; settings: NotificationAutomationSettings }>(`/${ADMIN_PATH}/settings/notifications`, data);

export const adminGetAnalyticsSettings = () =>
    api.get<{ settings: AnalyticsSettings }>(`/${ADMIN_PATH}/settings/analytics`);

export const adminUpdateAnalyticsSettings = (data: Partial<AnalyticsSettings>) =>
    api.put<{ message: string; settings: AnalyticsSettings }>(`/${ADMIN_PATH}/settings/analytics`, data);

export const adminGetReportsSummary = (params?: { from?: string; to?: string }) =>
    api.get<AdminReportsSummary>(`/${ADMIN_PATH}/reports/summary`, { params });

export const adminExportReportsSummary = (params?: { from?: string; to?: string; format?: 'csv' | 'xlsx' }) =>
    api.get(`/${ADMIN_PATH}/reports/export`, { params, responseType: 'blob' });

export const adminGetAnalyticsOverview = (params?: { from?: string; to?: string; module?: string }) =>
    api.get<AnalyticsOverview>(`/${ADMIN_PATH}/reports/analytics`, { params });

export const adminExportEventLogs = (params?: { from?: string; to?: string; module?: string; format?: 'csv' | 'xlsx' }) =>
    api.get(`/${ADMIN_PATH}/reports/events/export`, { params, responseType: 'blob' });

export const adminGetExamInsightsReport = (examId: string) =>
    api.get<ExamInsightsReport>(`/${ADMIN_PATH}/reports/exams/${examId}/insights`);

export const adminExportExamInsights = (examId: string, format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/${ADMIN_PATH}/reports/exams/${examId}/insights/export`, { params: { format }, responseType: 'blob' });

// ── University Settings ──
export interface AdminUniversitySettingsData {
    categoryOrder: string[];
    highlightedCategories: string[];
    defaultCategory: string;
    featuredUniversitySlugs: string[];
    maxFeaturedItems: number;
    enableClusterFilterOnHome: boolean;
    enableClusterFilterOnUniversities: boolean;
    defaultUniversityLogoUrl: string | null;
    allowCustomCategories: boolean;
}

export const adminGetUniversitySettings = () =>
    api.get<{ ok: boolean; data: AdminUniversitySettingsData }>(`/${ADMIN_PATH}/settings/university`);

export const adminUpdateUniversitySettings = (data: Partial<AdminUniversitySettingsData>) =>
    api.put<{ ok: boolean; data: AdminUniversitySettingsData }>(`/${ADMIN_PATH}/settings/university`, data);
