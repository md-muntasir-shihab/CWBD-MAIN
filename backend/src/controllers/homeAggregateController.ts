import { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import SubscriptionPlan from '../models/SubscriptionPlan';
import University from '../models/University';
import Exam from '../models/Exam';
import News from '../models/News';
import Resource from '../models/Resource';
import User from '../models/User';
import Banner from '../models/Banner';
import WebsiteSettings from '../models/WebsiteSettings';
import SiteSettings from '../models/Settings';
import type { HomeSettingsShape } from '../models/HomeSettings';
import {
    ensureHomeSettings,
    getHomeSettingsDefaults,
    mergeHomeSettings,
} from '../services/homeSettingsService';
import UniversitySettingsModel from '../models/UniversitySettings';
import ContentBlock from '../models/ContentBlock';
import HomeConfig from '../models/HomeConfig';

const DAY_MS = 24 * 60 * 60 * 1000;

type TimelineBadgeTone = 'danger' | 'warning' | 'info' | 'success';

type TimelineItem = {
    id: string;
    name: string;
    shortForm: string;
    slug: string;
    unit: string;
    dateIso: string;
    daysLeft: number;
    countdownLabel: string;
    badgeTone: TimelineBadgeTone;
    source: 'university' | 'exam';
    university?: UniversityCardPreviewItem;
};

type ExamWidgetItem = {
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
};

type UniversityCardPreviewItem = {
    id: string;
    name: string;
    shortForm: string;
    slug: string;
    category: string;
    clusterGroup: string;
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
};

function parseSeatValue(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const text = String(value).replace(/[^\d]/g, '');
    const num = Number(text);
    return Number.isFinite(num) ? num : 0;
}

function parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const dateFromNumber = new Date(value > 1e12 ? value : value * 1000);
        const year = dateFromNumber.getUTCFullYear();
        if (!Number.isFinite(dateFromNumber.getTime()) || year < 1900 || year > 2100) return null;
        return dateFromNumber;
    }
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) {
        let numeric = Number(raw);
        if (Number.isFinite(numeric)) {
            while (numeric > 1e13) numeric = Math.floor(numeric / 10);
            const dateFromEpoch = new Date(numeric < 1e11 ? numeric * 1000 : numeric);
            const year = dateFromEpoch.getUTCFullYear();
            if (Number.isFinite(dateFromEpoch.getTime()) && year >= 1900 && year <= 2100) return dateFromEpoch;
        }
        return null;
    }
    const date = new Date(raw);
    const year = date.getUTCFullYear();
    if (!Number.isFinite(date.getTime()) || year < 1900 || year > 2100) return null;
    return date;
}

function toIsoDateString(value: unknown): string {
    const parsed = parseDate(value);
    return parsed ? parsed.toISOString() : '';
}

function toStringOrEmpty(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function daysUntil(now: Date, target: Date): number {
    const nowDay = startOfDay(now).getTime();
    const targetDay = startOfDay(target).getTime();
    return Math.floor((targetDay - nowDay) / DAY_MS);
}

function badgeToneByDays(daysLeft: number): TimelineBadgeTone {
    if (daysLeft <= 1) return 'danger';
    if (daysLeft <= 3) return 'warning';
    if (daysLeft <= 7) return 'info';
    return 'success';
}

function countdownLabel(daysLeft: number): string {
    if (daysLeft <= 0) return 'Today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
}

function pickString(value: unknown, fallback = ''): string {
    if (typeof value !== 'string') return fallback;
    return value.trim() || fallback;
}

function normalizeTimelineItem(item: TimelineItem): TimelineItem {
    return {
        ...item,
        shortForm: item.shortForm || 'N/A',
        slug: item.slug || '',
        unit: item.unit || 'N/A',
    };
}

function buildUniversityTimeline(
    universities: Array<Record<string, unknown>>,
    now: Date,
    closingSoonDays: number,
    examSoonDays: number
): { closingSoonItems: TimelineItem[]; examSoonItems: TimelineItem[] } {
    const closingSoonItems: TimelineItem[] = [];
    const examSoonItems: TimelineItem[] = [];

    for (const university of universities) {
        const universityId = String(university._id || '');
        const name = pickString(university.name, 'University');
        const shortForm = pickString(university.shortForm, 'N/A');
        const slug = pickString(university.slug, '');

        const closingDate = parseDate((university as { applicationEndDate?: unknown }).applicationEndDate);
        if (closingDate) {
            const daysLeft = daysUntil(now, closingDate);
            if (daysLeft >= 0 && daysLeft <= closingSoonDays) {
                closingSoonItems.push(normalizeTimelineItem({
                    id: `closing-${universityId}`,
                    name,
                    shortForm,
                    slug,
                    unit: 'N/A',
                    dateIso: closingDate.toISOString(),
                    daysLeft,
                    countdownLabel: countdownLabel(daysLeft),
                    badgeTone: badgeToneByDays(daysLeft),
                    source: 'university',
                    university: mapUniversityPreviewItem(university as Record<string, unknown>),
                }));
            }
        }

        const unitDates: Array<{ unit: string; dateValue: unknown }> = [
            { unit: 'Science', dateValue: (university as { scienceExamDate?: unknown }).scienceExamDate },
            { unit: 'Arts', dateValue: (university as { artsExamDate?: unknown }).artsExamDate },
            { unit: 'Business', dateValue: (university as { businessExamDate?: unknown }).businessExamDate },
        ];

        for (const row of unitDates) {
            const examDate = parseDate(row.dateValue);
            if (!examDate) continue;
            const daysLeft = daysUntil(now, examDate);
            if (daysLeft < 0 || daysLeft > examSoonDays) continue;

            examSoonItems.push(normalizeTimelineItem({
                id: `uni-exam-${universityId}-${row.unit.toLowerCase()}`,
                name,
                shortForm,
                slug,
                unit: row.unit,
                dateIso: examDate.toISOString(),
                daysLeft,
                countdownLabel: countdownLabel(daysLeft),
                badgeTone: badgeToneByDays(daysLeft),
                source: 'university',
                university: mapUniversityPreviewItem(university as Record<string, unknown>),
            }));
        }
    }

    closingSoonItems.sort((a, b) => a.daysLeft - b.daysLeft);
    examSoonItems.sort((a, b) => a.daysLeft - b.daysLeft);

    return { closingSoonItems, examSoonItems };
}

function buildExamWidgetItem(
    exam: Record<string, unknown>,
    access: { loggedIn: boolean; hasActivePlan: boolean }
): ExamWidgetItem {
    const startDate = parseDate((exam as { startDate?: unknown }).startDate);
    const endDate = parseDate((exam as { endDate?: unknown }).endDate);

    let lockReason: ExamWidgetItem['lockReason'] = 'none';
    if (!access.loggedIn) lockReason = 'login_required';
    if (access.loggedIn && !access.hasActivePlan) lockReason = 'subscription_required';

    return {
        id: String(exam._id || ''),
        title: pickString(exam.title, 'Online Exam'),
        subject: pickString(exam.subject, 'General'),
        status: pickString(exam.status, 'scheduled'),
        startDate: startDate ? startDate.toISOString() : '',
        endDate: endDate ? endDate.toISOString() : '',
        durationMinutes: Number(exam.duration || 0),
        isLocked: lockReason !== 'none',
        lockReason,
        canJoin: lockReason === 'none',
        joinUrl: `/exam/take/${String(exam._id || '')}`,
    };
}

async function getSubscriptionState(req: AuthRequest): Promise<{
    loggedIn: boolean;
    hasActivePlan: boolean;
    expiry: string | null;
    reason: string;
}> {
    if (!req.user?._id) {
        return {
            loggedIn: false,
            hasActivePlan: false,
            expiry: null,
            reason: 'not_logged_in',
        };
    }

    const user = await User.findById(req.user._id)
        .select('role subscription')
        .lean();

    if (!user) {
        return {
            loggedIn: false,
            hasActivePlan: false,
            expiry: null,
            reason: 'not_logged_in',
        };
    }

    // Admin and content roles should not appear subscription-locked on home widgets.
    if (String(user.role || '') !== 'student') {
        return {
            loggedIn: true,
            hasActivePlan: true,
            expiry: null,
            reason: 'non_student',
        };
    }

    const expiryDate = parseDate((user as { subscription?: { expiryDate?: unknown } }).subscription?.expiryDate);
    const hasActivePlan = Boolean(
        (user as { subscription?: { isActive?: boolean } }).subscription?.isActive
        && expiryDate
        && expiryDate.getTime() > Date.now()
    );

    return {
        loggedIn: true,
        hasActivePlan,
        expiry: expiryDate ? expiryDate.toISOString() : null,
        reason: hasActivePlan ? 'active_plan' : 'subscription_required',
    };
}

function buildGlobalSettings(
    settings: Record<string, unknown> | null,
    managedSocialLinks: Partial<Record<'facebook' | 'whatsapp' | 'telegram' | 'twitter' | 'youtube' | 'instagram', string>> = {}
) {
    const socialLinks = ((settings?.socialLinks as Record<string, unknown>) || {});
    return {
        websiteName: pickString(settings?.websiteName, 'CampusWay'),
        logoUrl: pickString(settings?.logo, '/logo.png'),
        motto: pickString(settings?.motto, ''),
        contactEmail: pickString(settings?.contactEmail, ''),
        contactPhone: pickString(settings?.contactPhone, ''),
        theme: (settings?.theme as Record<string, unknown>) || {},
        socialLinks: {
            facebook: pickString(managedSocialLinks.facebook || socialLinks.facebook),
            whatsapp: pickString(managedSocialLinks.whatsapp || socialLinks.whatsapp),
            telegram: pickString(managedSocialLinks.telegram || socialLinks.telegram),
            twitter: pickString(managedSocialLinks.twitter || socialLinks.twitter),
            youtube: pickString(managedSocialLinks.youtube || socialLinks.youtube),
            instagram: pickString(managedSocialLinks.instagram || socialLinks.instagram),
        },
    };
}

function computeStatValues(params: {
    totalUniversities: number;
    totalStudents: number;
    totalExams: number;
    totalResources: number;
    totalNews: number;
    totalSeats: number;
    closingSoonCount: number;
    examSoonCount: number;
    liveExamsCount: number;
}): Record<string, number> {
    return {
        universities: params.totalUniversities,
        students: params.totalStudents,
        exams: params.totalExams,
        resources: params.totalResources,
        news: params.totalNews,
        seats: params.totalSeats,
        closingSoon: params.closingSoonCount,
        examSoon: params.examSoonCount,
        liveExams: params.liveExamsCount,
    };
}

function getSafeMax(value: number, fallback: number, min = 1, max = 20): number {
    const next = Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, Math.floor(next)));
}

function mapUniversityPreviewItem(item: Record<string, unknown>): UniversityCardPreviewItem {
    const applicationStartIso = toIsoDateString((item as { applicationStartDate?: unknown }).applicationStartDate);
    const applicationEndIso = toIsoDateString((item as { applicationEndDate?: unknown }).applicationEndDate);
    const scienceExamIso = toIsoDateString((item as { scienceExamDate?: unknown }).scienceExamDate);
    const artsExamIso = toIsoDateString((item as { artsExamDate?: unknown }).artsExamDate);
    const businessExamIso = toIsoDateString((item as { businessExamDate?: unknown }).businessExamDate);

    const examCentersRaw = Array.isArray((item as { examCenters?: unknown[] }).examCenters)
        ? ((item as { examCenters?: unknown[] }).examCenters as Array<Record<string, unknown>>)
        : [];
    const examCentersPreview = examCentersRaw
        .map((center) => pickString(center.city))
        .filter(Boolean)
        .slice(0, 6);

    return {
        id: String(item._id || ''),
        name: pickString((item as { name?: unknown }).name, 'University'),
        shortForm: pickString((item as { shortForm?: unknown }).shortForm, 'N/A'),
        slug: pickString((item as { slug?: unknown }).slug, ''),
        category: pickString((item as { category?: unknown }).category, 'Uncategorized'),
        clusterGroup: pickString((item as { clusterGroup?: unknown }).clusterGroup, ''),
        contactNumber: pickString((item as { contactNumber?: unknown }).contactNumber, ''),
        established: (() => {
            const year = Number((item as { established?: unknown }).established);
            return Number.isFinite(year) && year > 0 ? year : null;
        })(),
        address: pickString((item as { address?: unknown }).address, ''),
        email: pickString((item as { email?: unknown }).email, ''),
        website: pickString((item as { website?: unknown }).website, ''),
        admissionWebsite: pickString((item as { admissionWebsite?: unknown }).admissionWebsite, ''),
        totalSeats: toStringOrEmpty((item as { totalSeats?: unknown }).totalSeats),
        scienceSeats: toStringOrEmpty((item as { scienceSeats?: unknown }).scienceSeats),
        artsSeats: toStringOrEmpty((item as { artsSeats?: unknown }).artsSeats),
        businessSeats: toStringOrEmpty((item as { businessSeats?: unknown }).businessSeats),
        applicationStart: applicationStartIso,
        applicationEnd: applicationEndIso,
        applicationStartDate: applicationStartIso,
        applicationEndDate: applicationEndIso,
        scienceExamDate: scienceExamIso,
        artsExamDate: artsExamIso,
        businessExamDate: businessExamIso,
        examDateScience: scienceExamIso,
        examDateArts: artsExamIso,
        examDateBusiness: businessExamIso,
        examCentersPreview,
        shortDescription: pickString((item as { shortDescription?: unknown }).shortDescription, pickString((item as { description?: unknown }).description, '')),
        logoUrl: pickString((item as { logoUrl?: unknown }).logoUrl, ''),
    };
}

function sortUniversityPreviewItems(
    items: UniversityCardPreviewItem[],
    mode: 'nearest_deadline' | 'alphabetical'
): UniversityCardPreviewItem[] {
    const sorted = [...items];
    if (mode === 'alphabetical') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        return sorted;
    }

    sorted.sort((a, b) => {
        const left = parseDate(a.applicationEndDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const right = parseDate(b.applicationEndDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        if (left !== right) return left - right;
        return a.name.localeCompare(b.name);
    });
    return sorted;
}

export const getAggregatedHomeData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();

        const [homeSettingsDoc, rawGlobalSettings, rawSiteSettings, subscriptionBannerState, uniSettingsDoc] = await Promise.all([
            ensureHomeSettings(),
            WebsiteSettings.findOne().lean(),
            SiteSettings.findOne().select('socialLinks').lean(),
            getSubscriptionState(req),
            UniversitySettingsModel.findOne().lean(),
        ]);

        const defaults = getHomeSettingsDefaults();
        const homeSettings = mergeHomeSettings(
            defaults,
            homeSettingsDoc.toObject()
        ) as HomeSettingsShape;

        const [universities, allRelevantExams, totalStudents, totalResources, totalNews, subscriptionPlansRaw, activeBanners] = await Promise.all([
            University.find({ isActive: true, isArchived: { $ne: true } })
                .select('name shortForm slug category clusterGroup contactNumber established address email website admissionWebsite totalSeats scienceSeats artsSeats businessSeats applicationStartDate applicationEndDate scienceExamDate artsExamDate businessExamDate examCenters shortDescription description logoUrl')
                .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
                .lean(),
            Exam.find({ isPublished: true, status: { $in: ['live', 'scheduled'] } })
                .select('title subject status startDate endDate duration')
                .sort({ startDate: 1 })
                .lean(),
            User.countDocuments({ role: 'student', status: 'active' }),
            Resource.countDocuments({ isPublic: true }),
            News.countDocuments({ isPublished: true, status: 'published' }),
            SubscriptionPlan.find({ isActive: true })
                .sort({ sortOrder: 1, priority: 1, code: 1 })
                .lean(),
            Banner.find({ isActive: true, status: 'published' })
                .sort({ priority: -1, order: 1, createdAt: -1 })
                .lean(),
        ]);

        const validBanners = activeBanners.filter((b: any) => {
            if (b.startDate && new Date(b.startDate) > now) return false;
            if (b.endDate && new Date(b.endDate) < now) return false;
            return true;
        });

        const topBannerDoc = validBanners.find(b => b.slot === 'top');
        const middleBannerDoc = validBanners.find(b => b.slot === 'middle');
        const bottomBannerDoc = validBanners.find(b => b.slot === 'footer');
        const homeAdsBanners = validBanners.filter(b => b.slot === 'home_ads');

        if (topBannerDoc) {
            homeSettings.topBanner = {
                enabled: true,
                imageUrl: topBannerDoc.imageUrl,
                linkUrl: topBannerDoc.linkUrl || '',
            };
        }
        if (middleBannerDoc) {
            homeSettings.middleBanner = {
                enabled: true,
                imageUrl: middleBannerDoc.imageUrl,
                linkUrl: middleBannerDoc.linkUrl || '',
            };
        }
        if (bottomBannerDoc) {
            homeSettings.bottomBanner = {
                enabled: true,
                imageUrl: bottomBannerDoc.imageUrl,
                linkUrl: bottomBannerDoc.linkUrl || '',
            };
        }

        const totalUniversities = universities.length;
        const totalSeats = universities.reduce((sum, item) => {
            return sum + parseSeatValue((item as { totalSeats?: unknown }).totalSeats);
        }, 0);

        const timelineWindowClosing = getSafeMax(homeSettings.timeline.closingSoonDays, 10, 1, 60);
        const timelineWindowExam = getSafeMax(homeSettings.timeline.examSoonDays, 10, 1, 60);
        const timelineMaxClosing = getSafeMax(homeSettings.timeline.maxClosingItems, 6);
        const timelineMaxExam = getSafeMax(homeSettings.timeline.maxExamItems, 6);

        const universityTimeline = buildUniversityTimeline(
            universities as Array<Record<string, unknown>>,
            now,
            timelineWindowClosing,
            timelineWindowExam
        );

        const examSoonFromExams = allRelevantExams
            .map((exam) => {
                const startDate = parseDate((exam as { startDate?: unknown }).startDate);
                if (!startDate) return null;
                const daysLeft = daysUntil(now, startDate);
                if (daysLeft < 0 || daysLeft > timelineWindowExam) return null;
                return normalizeTimelineItem({
                    id: `exam-${String(exam._id || '')}`,
                    name: pickString(exam.title, 'Exam'),
                    shortForm: 'Online',
                    slug: '',
                    unit: pickString(exam.subject, 'N/A'),
                    dateIso: startDate.toISOString(),
                    daysLeft,
                    countdownLabel: countdownLabel(daysLeft),
                    badgeTone: badgeToneByDays(daysLeft),
                    source: 'exam',
                });
            })
            .filter((item): item is TimelineItem => Boolean(item));

        const closingSoonItems = universityTimeline.closingSoonItems.slice(0, timelineMaxClosing);
        const examSoonItems = [...universityTimeline.examSoonItems, ...examSoonFromExams]
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, timelineMaxExam);

        const categoriesMap = new Map<string, number>();
        const openUniversities = universities.filter((item) => {
            const deadline = parseDate((item as { applicationEndDate?: unknown }).applicationEndDate);
            return Boolean(deadline && deadline.getTime() >= now.getTime());
        }).length;

        for (const item of universities) {
            const category = pickString((item as { category?: unknown }).category, 'Uncategorized');
            categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
        }

        const categories = [
            { key: 'all', label: 'All', count: universities.length },
            ...Array.from(categoriesMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([label, count]) => ({ key: label, label, count })),
        ];

        const highlightedFromUniversitySettings = Array.isArray(uniSettingsDoc?.highlightedCategories)
            ? (uniSettingsDoc?.highlightedCategories as unknown[])
                .map((entry, index) => ({
                    category: pickString(entry),
                    order: index + 1,
                    enabled: true,
                    badgeText: '',
                }))
                .filter((entry) => entry.category)
            : [];

        const highlightedFromHomeSettings = (homeSettings.highlightedCategories || [])
            .map((item) => ({
                category: pickString((item as { category?: unknown }).category),
                order: Number((item as { order?: unknown }).order || 0),
                enabled: Boolean((item as { enabled?: unknown }).enabled !== false),
                badgeText: pickString((item as { badgeText?: unknown }).badgeText),
            }))
            .filter((item) => item.enabled && item.category)
            .sort((a, b) => a.order - b.order);

        // Home settings should be the canonical source when explicitly configured.
        // Fall back to university settings only when home settings are empty.
        const highlightedCategories = highlightedFromHomeSettings.length > 0
            ? highlightedFromHomeSettings
            : highlightedFromUniversitySettings;

        const highlightedSet = new Set(highlightedCategories.map((item) => item.category));
        const categoriesWithHighlightRaw = categories.map((item) => ({
            ...item,
            isHighlighted: highlightedSet.has(item.key),
            badgeText: highlightedCategories.find((h) => h.category === item.key)?.badgeText || '',
        }));
        const highlightedOrderMap = new Map<string, number>(
            highlightedCategories.map((entry, index) => [entry.category, index + 1]),
        );
        const categoriesWithHighlight = [
            ...categoriesWithHighlightRaw.filter((item) => item.key === 'all'),
            ...categoriesWithHighlightRaw
                .filter((item) => item.key !== 'all')
                .sort((a, b) => {
                    const aOrder = highlightedOrderMap.get(a.key);
                    const bOrder = highlightedOrderMap.get(b.key);
                    const aHighlighted = typeof aOrder === 'number';
                    const bHighlighted = typeof bOrder === 'number';
                    if (aHighlighted && bHighlighted) return (aOrder as number) - (bOrder as number);
                    if (aHighlighted) return -1;
                    if (bHighlighted) return 1;
                    return a.label.localeCompare(b.label);
                }),
        ];

        const universityById = new Map<string, Record<string, unknown>>(
            universities.map((item) => [String(item._id || ''), item as Record<string, unknown>])
        );


        // Build per-category clusterGroups map
        const categoryClusterMap = new Map<string, Set<string>>();
        for (const item of universities) {
            const cat = pickString((item as { category?: unknown }).category, 'Uncategorized');
            const cluster = pickString((item as { clusterGroup?: unknown }).clusterGroup);
            if (!categoryClusterMap.has(cat)) {
                categoryClusterMap.set(cat, new Set<string>());
            }
            if (cluster) categoryClusterMap.get(cat)!.add(cluster);
        }

        const previewItems = sortUniversityPreviewItems(
            universities.map((item) => mapUniversityPreviewItem(item as Record<string, unknown>)),
            homeSettings.universityCardConfig.defaultSort
        );
        const clusterGroups = Array.from(
            new Set(
                previewItems
                    .map((item) => pickString(item.clusterGroup))
                    .filter(Boolean),
            ),
        ).sort((a, b) => a.localeCompare(b));

        // Build universityCategories array with per-category clusterGroups
        const categoryOrder: string[] = (uniSettingsDoc?.categoryOrder || []);
        const categoryOrderMap = new Map(categoryOrder.map((cat, i) => [cat, i]));
        const universityCategories = Array.from(categoryClusterMap.entries())
            .map(([categoryName, clusters]) => ({
                categoryName,
                count: categoriesMap.get(categoryName) || 0,
                clusterGroups: Array.from(clusters).sort((a, b) => a.localeCompare(b)),
            }))
            .sort((a, b) => {
                const aOrder = categoryOrderMap.get(a.categoryName) ?? 999;
                const bOrder = categoryOrderMap.get(b.categoryName) ?? 999;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.categoryName.localeCompare(b.categoryName);
            });

        // Build featuredItems based on universityPreview settings
        const uniBySlug = new Map<string, Record<string, unknown>>(
            universities.map((item) => [pickString((item as { slug?: unknown }).slug), item as Record<string, unknown>])
        );
        let featuredItems: UniversityCardPreviewItem[] = [];
        const maxFeatured = homeSettings.universityPreview?.maxFeaturedItems ?? uniSettingsDoc?.maxFeaturedItems ?? 12;
        const featuredMode = homeSettings.universityPreview?.featuredMode ?? 'manual';

        if (featuredMode === 'auto') {
            const openUnis = previewItems.filter(item => {
                const deadline = parseDate(item.applicationEndDate);
                return deadline && deadline.getTime() >= now.getTime();
            });
            openUnis.sort((a, b) => {
                const aTime = parseDate(a.applicationEndDate)?.getTime() ?? 0;
                const bTime = parseDate(b.applicationEndDate)?.getTime() ?? 0;
                return aTime - bTime;
            });
            featuredItems = openUnis.slice(0, maxFeatured);
        } else {
            const homeFeaturedEntries = Array.isArray(homeSettings.featuredUniversities)
                ? homeSettings.featuredUniversities
                : [];

            if (homeFeaturedEntries.length > 0) {
                featuredItems = homeFeaturedEntries
                    .map((item) => ({
                        universityId: pickString((item as { universityId?: unknown }).universityId),
                        order: Number((item as { order?: unknown }).order || 0),
                        enabled: Boolean((item as { enabled?: unknown }).enabled !== false),
                    }))
                    .filter((item) => item.enabled && item.universityId && universityById.has(item.universityId))
                    .sort((a, b) => a.order - b.order)
                    .slice(0, maxFeatured)
                    .map((item) => mapUniversityPreviewItem(universityById.get(item.universityId)!));
            } else {
                const featuredSlugs = uniSettingsDoc?.featuredUniversitySlugs as string[] | undefined;
                featuredItems = Array.isArray(featuredSlugs)
                    ? featuredSlugs
                        .slice(0, maxFeatured)
                        .map((slug) => {
                            const uni = uniBySlug.get(slug);
                            return uni ? mapUniversityPreviewItem(uni) : null;
                        })
                        .filter((item): item is UniversityCardPreviewItem => item !== null)
                    : [];
            }
        }

        const reqCategory = typeof req.query.category === 'string' ? req.query.category.trim() : '';
        const reqCluster = typeof req.query.clusterGroup === 'string' ? req.query.clusterGroup.trim() : '';

        let filteredPreviewItems = previewItems;
        if (reqCategory && reqCategory.toLowerCase() !== 'all') {
            filteredPreviewItems = filteredPreviewItems.filter(item => item.category === reqCategory);
        }
        if (reqCluster && reqCluster.toLowerCase() !== 'all') {
            filteredPreviewItems = filteredPreviewItems.filter(item => item.clusterGroup === reqCluster);
        }

        const maxDeadlineCards = homeSettings.universityPreview?.maxDeadlineItems ?? 6;
        const maxExamCards = homeSettings.universityPreview?.maxExamItems ?? 6;
        const deadlineWithinDays = homeSettings.universityPreview?.deadlineWithinDays ?? 30;
        const examWithinDaysCards = homeSettings.universityPreview?.examWithinDays ?? 30;

        const nowStartTime = startOfDay(now).getTime();
        const maxDeadlineTime = nowStartTime + (deadlineWithinDays * DAY_MS);
        const maxExamTime = nowStartTime + (examWithinDaysCards * DAY_MS);

        const deadlineUniversities = filteredPreviewItems
            .filter(item => {
                const deadline = parseDate(item.applicationEndDate);
                if (!deadline) return false;
                const dTime = startOfDay(deadline).getTime();
                return dTime >= nowStartTime && dTime <= maxDeadlineTime;
            })
            .sort((a, b) => {
                const aDate = parseDate(a.applicationEndDate);
                const bDate = parseDate(b.applicationEndDate);
                const aTime = aDate ? startOfDay(aDate).getTime() : 0;
                const bTime = bDate ? startOfDay(bDate).getTime() : 0;
                return aTime - bTime;
            })
            .slice(0, maxDeadlineCards);

        const upcomingExamUniversities = filteredPreviewItems
            .filter(item => {
                const dates = [
                    item.scienceExamDate, item.artsExamDate, item.businessExamDate,
                    item.examDateScience, item.examDateArts, item.examDateBusiness
                ].filter(Boolean);
                if (dates.length === 0) return false;
                return dates.some(d => {
                    const parsed = parseDate(d);
                    if (!parsed) return false;
                    const pTime = startOfDay(parsed).getTime();
                    return pTime >= nowStartTime && pTime <= maxExamTime;
                });
            })
            .slice(0, maxExamCards);

        const universityDashboardData = {
            categories: categoriesWithHighlight,
            filtersMeta: {
                totalItems: universities.length,
                statuses: [
                    { value: 'all', label: 'All', count: universities.length },
                    { value: 'open', label: 'Open', count: openUniversities },
                    { value: 'closed', label: 'Closed', count: universities.length - openUniversities },
                ],
                defaultCategory: pickString(
                    uniSettingsDoc?.defaultCategory,
                    homeSettings.universityPreview?.defaultActiveCategory || pickString(homeSettings.universityDashboard.defaultCategory, 'all'),
                ),
                showFilters: homeSettings.universityDashboard.showFilters,
                defaultSort: homeSettings.universityCardConfig.defaultSort,
                clusterGroups,
            },
            highlightedCategories,
            featuredItems,
            itemsPreview: previewItems,
        };

        const showLockedExams = homeSettings.examsWidget.showLockedExamsToUnsubscribed === 'show_locked';

        const liveNow = allRelevantExams
            .filter((exam) => {
                const status = pickString((exam as { status?: unknown }).status, 'scheduled');
                if (status === 'live') return true;
                const startDate = parseDate((exam as { startDate?: unknown }).startDate);
                const endDate = parseDate((exam as { endDate?: unknown }).endDate);
                if (!startDate || !endDate) return false;
                return now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
            })
            .map((exam) => buildExamWidgetItem(exam as Record<string, unknown>, subscriptionBannerState))
            .filter((item) => showLockedExams || !item.isLocked)
            .slice(0, getSafeMax(homeSettings.examsWidget.maxLive, 4));

        const upcoming = allRelevantExams
            .filter((exam) => {
                const startDate = parseDate((exam as { startDate?: unknown }).startDate);
                if (!startDate) return false;
                return startDate.getTime() > now.getTime();
            })
            .map((exam) => buildExamWidgetItem(exam as Record<string, unknown>, subscriptionBannerState))
            .filter((item) => showLockedExams || !item.isLocked)
            .slice(0, getSafeMax(homeSettings.examsWidget.maxUpcoming, 6));

        const newsLimit = getSafeMax(homeSettings.newsPreview.maxItems, 4, 1, 12);
        const resourcesLimit = getSafeMax(homeSettings.resourcesPreview.maxItems, 4, 1, 12);

        const [newsPreview, resourcesPreview, homeContentBlocks, homeConfigDoc] = await Promise.all([
            News.find({ isPublished: true, status: 'published' })
                .sort({ publishDate: -1, createdAt: -1 })
                .limit(newsLimit)
                .select('title slug shortSummary shortDescription category sourceName publishDate coverImageUrl featuredImage thumbnailImage')
                .lean(),
            Resource.find({ isPublic: true, $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: now } }] })
                .sort({ isFeatured: -1, order: 1, publishDate: -1, createdAt: -1 })
                .limit(resourcesLimit)
                .select('title description type fileUrl externalUrl thumbnailUrl category isFeatured publishDate')
                .lean(),
            ContentBlock.find({
                isEnabled: true,
                placements: { $in: ['HOME_TOP', 'HOME_MID', 'HOME_BOTTOM'] },
                $and: [
                    { $or: [{ startAtUTC: { $exists: false } }, { startAtUTC: null }, { startAtUTC: { $lte: now } }] },
                    { $or: [{ endAtUTC: { $exists: false } }, { endAtUTC: null }, { endAtUTC: { $gte: now } }] },
                ],
            })
                .sort({ priority: -1, createdAt: -1 })
                .limit(6)
                .lean(),
            HomeConfig.findOne().lean(),
        ]);

        const planIdSet = new Set(homeSettings.subscriptionBanner.planIdsToShow || []);
        const subscriptionPlans = homeSettings.subscriptionBanner.showPlanCards
            ? subscriptionPlansRaw.filter((plan) => {
                if (!planIdSet.size) return true;
                return planIdSet.has(String(plan._id));
            })
            : [];

        const managedSocialLinks = (Array.isArray((rawSiteSettings as { socialLinks?: unknown[] } | null)?.socialLinks)
            ? (rawSiteSettings as { socialLinks?: unknown[] }).socialLinks || []
            : []
        ).reduce<Partial<Record<'facebook' | 'whatsapp' | 'telegram' | 'twitter' | 'youtube' | 'instagram', string>>>((acc, item: any) => {
            if (!item || item.enabled === false) return acc;
            const key = String(item.platform || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
            const url = pickString(item.url);
            if (!url) return acc;
            if (key === 'x') {
                acc.twitter = url;
                return acc;
            }
            if (['facebook', 'whatsapp', 'telegram', 'twitter', 'youtube', 'instagram'].includes(key)) {
                (acc as any)[key] = url;
            }
            return acc;
        }, {});

        const globalSettings = buildGlobalSettings(
            rawGlobalSettings as Record<string, unknown> | null,
            managedSocialLinks
        );

        const statValues = computeStatValues({
            totalUniversities,
            totalStudents,
            totalExams: allRelevantExams.length,
            totalResources,
            totalNews,
            totalSeats,
            closingSoonCount: closingSoonItems.length,
            examSoonCount: examSoonItems.length,
            liveExamsCount: liveNow.length,
        });

        const stats = {
            values: statValues,
            items: homeSettings.stats.items.map((item) => ({
                key: pickString(item.key, 'unknown'),
                label: pickString(item.label, item.key),
                enabled: Boolean(item.enabled),
                value: statValues[pickString(item.key)] || 0,
            })),
        };

        const categoriesSafe = Array.isArray(universityCategories) ? universityCategories : [];
        const newsPreviewItems = Array.isArray(newsPreview) ? newsPreview : [];
        const resourcePreviewItems = Array.isArray(resourcesPreview) ? resourcesPreview : [];
        const featuredUniversities = Array.isArray(featuredItems) ? featuredItems : [];
        const deadlineItems = Array.isArray(deadlineUniversities) ? deadlineUniversities : [];
        const upcomingExamItems = Array.isArray(upcomingExamUniversities) ? upcomingExamUniversities : [];
        const liveExamItems = Array.isArray(liveNow) ? liveNow : [];
        const upcomingOnlineExamItems = Array.isArray(upcoming) ? upcoming : [];
        const campaignBannersActive = homeAdsBanners.map(b => ({
            _id: b._id,
            title: b.title,
            subtitle: b.subtitle,
            imageUrl: b.imageUrl,
            mobileImageUrl: b.mobileImageUrl,
            linkUrl: b.linkUrl,
            altText: b.altText,
        }));
        const siteSettings = {
            websiteName: globalSettings.websiteName,
            logoUrl: globalSettings.logoUrl,
            motto: globalSettings.motto,
            contactEmail: globalSettings.contactEmail,
            contactPhone: globalSettings.contactPhone,
            socialLinks: globalSettings.socialLinks,
        };

        const DEFAULT_SECTIONS = [
            { id: 'search', title: 'Search Bar', isActive: true, order: 0 },
            { id: 'hero', title: 'Hero Banner', isActive: true, order: 1 },
            { id: 'campaign_banners', title: 'Campaign Banners', isActive: true, order: 2 },
            { id: 'featured', title: 'Featured Universities', isActive: true, order: 3 },
            { id: 'category_filter', title: 'Category & Cluster Filter', isActive: true, order: 4 },
            { id: 'deadlines', title: 'Admission Deadlines', isActive: true, order: 5 },
            { id: 'upcoming_exams', title: 'Upcoming Exams', isActive: true, order: 6 },
            { id: 'online_exam_preview', title: 'Online Exam Preview', isActive: true, order: 7 },
            { id: 'news', title: 'Latest News', isActive: true, order: 8 },
            { id: 'resources', title: 'Resources Preview', isActive: true, order: 9 },
            { id: 'content_blocks', title: 'Global CTA / Content Block', isActive: true, order: 10 },
            { id: 'stats', title: 'Quick Stats', isActive: true, order: 11 },
        ];
        const sectionOrder = (homeConfigDoc?.sections || DEFAULT_SECTIONS)
            .filter((s: any) => s.isActive !== false)
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((s: any) => ({ id: s.id, title: s.title, order: s.order }));

        const contentBlocksForHome = (homeContentBlocks || []).map((block: any) => ({
            _id: block._id,
            type: block.type,
            title: block.title,
            body: block.body,
            imageUrl: block.imageUrl,
            ctaLabel: block.ctaLabel,
            ctaUrl: block.ctaUrl,
            placements: block.placements,
            priority: block.priority,
            dismissible: block.dismissible,
        }));

        res.json({
            homeSettings,
            globalSettings,
            siteSettings,
            subscriptionPlans,
            subscriptionBannerState,
            stats,
            timeline: {
                serverNow: now.toISOString(),
                closingSoonItems,
                examSoonItems,
            },
            universityDashboardData,
            universityCategories: categoriesSafe,
            featuredUniversities,
            deadlineUniversities: deadlineItems,
            upcomingExamUniversities: upcomingExamItems,
            uniSettings: {
                enableClusterFilterOnHome: uniSettingsDoc?.enableClusterFilterOnHome ?? true,
                defaultCategory: uniSettingsDoc?.defaultCategory || homeSettings.universityDashboard.defaultCategory || 'all',
            },
            examsWidget: {
                liveNow: liveExamItems,
                upcoming: upcomingOnlineExamItems,
            },
            onlineExamsPreview: {
                loggedIn: Boolean(subscriptionBannerState.loggedIn),
                hasActivePlan: Boolean(subscriptionBannerState.hasActivePlan),
                liveNow: liveExamItems,
                upcoming: upcomingOnlineExamItems,
                items: [...liveExamItems, ...upcomingOnlineExamItems],
            },
            newsPreview: newsPreviewItems,
            newsPreviewItems,
            resourcesPreview: resourcePreviewItems,
            resourcePreviewItems,
            homeAdsBanners: campaignBannersActive,
            campaignBannersActive,
            socialLinks: globalSettings.socialLinks,
            sectionOrder,
            contentBlocksForHome,
        });
    } catch (error) {
        console.error('Error fetching strict home data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
