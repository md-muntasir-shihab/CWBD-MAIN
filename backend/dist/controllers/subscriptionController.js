"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicSubscriptionPlans = getPublicSubscriptionPlans;
exports.getPublicSubscriptionPlanById = getPublicSubscriptionPlanById;
exports.getMySubscription = getMySubscription;
exports.getHomeSubscriptionPlans = getHomeSubscriptionPlans;
exports.requestSubscriptionPayment = requestSubscriptionPayment;
exports.uploadSubscriptionProof = uploadSubscriptionProof;
exports.adminGetSubscriptionPlans = adminGetSubscriptionPlans;
exports.adminGetSubscriptionPlanById = adminGetSubscriptionPlanById;
exports.adminCreateSubscriptionPlan = adminCreateSubscriptionPlan;
exports.adminUpdateSubscriptionPlan = adminUpdateSubscriptionPlan;
exports.adminDeleteSubscriptionPlan = adminDeleteSubscriptionPlan;
exports.adminToggleSubscriptionPlan = adminToggleSubscriptionPlan;
exports.adminReorderSubscriptionPlans = adminReorderSubscriptionPlans;
exports.adminAssignSubscription = adminAssignSubscription;
exports.adminLegacyAssignStudentSubscription = adminLegacyAssignStudentSubscription;
exports.adminSuspendSubscription = adminSuspendSubscription;
exports.adminExportSubscriptions = adminExportSubscriptions;
exports.adminExportSubscriptionPlans = adminExportSubscriptionPlans;
exports.adminToggleSubscriptionPlanFeatured = adminToggleSubscriptionPlanFeatured;
exports.adminDuplicateSubscriptionPlan = adminDuplicateSubscriptionPlan;
exports.adminGetSubscriptionSettings = adminGetSubscriptionSettings;
exports.adminUpdateSubscriptionSettings = adminUpdateSubscriptionSettings;
exports.adminGetUserSubscriptions = adminGetUserSubscriptions;
exports.adminCreateUserSubscription = adminCreateUserSubscription;
exports.adminActivateUserSubscription = adminActivateUserSubscription;
exports.adminExpireUserSubscription = adminExpireUserSubscription;
exports.adminSuspendUserSubscriptionById = adminSuspendUserSubscriptionById;
const mongoose_1 = __importDefault(require("mongoose"));
const XLSX = __importStar(require("xlsx"));
const User_1 = __importDefault(require("../models/User"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const WebsiteSettings_1 = __importDefault(require("../models/WebsiteSettings"));
const SubscriptionSettings_1 = __importDefault(require("../models/SubscriptionSettings"));
const homeSettingsService_1 = require("../services/homeSettingsService");
const subscriptionLifecycleService_1 = require("../services/subscriptionLifecycleService");
const secureUploadService_1 = require("../services/secureUploadService");
const PLAN_CTA_MODES = ['contact', 'request_payment', 'internal', 'external'];
const PLAN_TYPES = ['free', 'paid', 'custom', 'enterprise'];
const BILLING_CYCLES = ['monthly', 'yearly', 'custom', 'one_time'];
const THEME_KEYS = ['basic', 'standard', 'premium', 'enterprise', 'custom'];
const SUPPORT_LEVELS = ['basic', 'priority', 'premium', 'enterprise'];
const PLAN_SORT = { isArchived: 1, displayOrder: 1, sortOrder: 1, priority: 1, code: 1 };
function toBoolean(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (value === null || value === undefined)
        return fallback;
    const text = String(value).trim().toLowerCase();
    if (!text)
        return fallback;
    return ['1', 'true', 'yes', 'on'].includes(text);
}
function safeString(value, fallback = '') {
    if (value === null || value === undefined)
        return fallback;
    const text = String(value).trim();
    return text || fallback;
}
function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}
function normalizeSlug(value, fallback = 'plan') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback;
}
function safeStringList(value, limit = 50) {
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value
        .map((item) => safeString(item))
        .filter(Boolean))).slice(0, limit);
}
function safeFaqItems(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => {
        if (!item || typeof item !== 'object')
            return null;
        const row = item;
        const question = safeString(row.question);
        const answer = safeString(row.answer);
        if (!question || !answer)
            return null;
        return { question, answer };
    })
        .filter(Boolean);
}
function safeComparisonRows(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => {
        if (!item || typeof item !== 'object')
            return null;
        const row = item;
        const key = safeString(row.key);
        const label = safeString(row.label);
        if (!key || !label)
            return null;
        return { key, label };
    })
        .filter(Boolean);
}
function isValidRelativeOrAbsoluteUrl(value) {
    const text = safeString(value);
    if (!text)
        return true;
    if (text.startsWith('/'))
        return true;
    try {
        const parsed = new URL(text);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
    }
    catch {
        return false;
    }
}
function resolvePlanCtaMode(value, fallback = 'contact') {
    const text = safeString(value).toLowerCase();
    return PLAN_CTA_MODES.includes(text) ? text : fallback;
}
function resolvePlanType(value, priceBDT, fallback = 'paid') {
    const text = safeString(value).toLowerCase();
    if (PLAN_TYPES.includes(text)) {
        if (text === 'free')
            return 'free';
        return priceBDT <= 0 && text === 'paid' ? 'free' : text;
    }
    if (priceBDT <= 0)
        return 'free';
    return fallback;
}
function resolveBillingCycle(value, fallback = 'monthly') {
    const text = safeString(value).toLowerCase();
    return BILLING_CYCLES.includes(text) ? text : fallback;
}
function resolveThemeKey(value, planHint, fallback = 'basic') {
    const text = safeString(value).toLowerCase();
    if (THEME_KEYS.includes(text))
        return text;
    const hint = planHint.toLowerCase();
    if (hint.includes('premium') || hint.includes('pro'))
        return 'premium';
    if (hint.includes('standard') || hint.includes('plus'))
        return 'standard';
    if (hint.includes('enterprise') || hint.includes('elite'))
        return 'enterprise';
    return fallback;
}
function resolveSupportLevel(value, fallback = 'basic') {
    const text = safeString(value).toLowerCase();
    return SUPPORT_LEVELS.includes(text) ? text : fallback;
}
function buildDurationLabel(plan) {
    if (plan.durationUnit === 'months') {
        const months = Math.max(1, plan.durationValue || 1);
        return `${months} month${months === 1 ? '' : 's'}`;
    }
    const days = Math.max(1, plan.durationDays || plan.durationValue || 1);
    return `${days} day${days === 1 ? '' : 's'}`;
}
function buildDefaultCtaUrl(mode) {
    if (mode === 'request_payment')
        return '/subscription-plans/checkout';
    if (mode === 'internal')
        return '/subscription-plans/checkout';
    if (mode === 'external')
        return '/contact';
    return '/contact';
}
function getPlanLookupQuery(identifier) {
    const trimmed = safeString(identifier);
    const normalized = normalizeSlug(trimmed, trimmed || 'plan');
    const or = [
        { slug: normalized },
        { code: normalized },
    ];
    if (mongoose_1.default.Types.ObjectId.isValid(trimmed)) {
        or.unshift({ _id: trimmed });
    }
    return { $or: or };
}
function buildPublicPlanFilter() {
    return {
        isArchived: { $ne: true },
        showOnPricingPage: { $ne: false },
        $or: [{ enabled: true }, { isActive: true }],
    };
}
function planToDto(plan) {
    const id = String(plan._id || '');
    const code = normalizeSlug(plan.code || plan.name || id, id ? `plan-${id}` : 'plan');
    const slug = normalizeSlug(plan.slug || code, code);
    const name = safeString(plan.name, 'Subscription Plan');
    const shortTitle = safeString(plan.shortTitle, name);
    const priceBDT = Math.max(0, safeNumber(plan.priceBDT, safeNumber(plan.price, 0)));
    const oldPriceRaw = plan.oldPrice === null || plan.oldPrice === undefined ? null : Math.max(0, safeNumber(plan.oldPrice, 0));
    const durationDays = Math.max(1, safeNumber(plan.durationDays, 30));
    const durationValue = Math.max(1, safeNumber(plan.durationValue, durationDays));
    const durationUnit = safeString(plan.durationUnit, 'days') === 'months' ? 'months' : 'days';
    const durationMonths = plan.durationMonths === null || plan.durationMonths === undefined
        ? null
        : Math.max(0, safeNumber(plan.durationMonths, 0));
    const displayOrder = safeNumber(plan.displayOrder, safeNumber(plan.sortOrder, safeNumber(plan.priority, 100)));
    const isArchived = toBoolean(plan.isArchived, false);
    const enabled = (plan.enabled !== undefined ? toBoolean(plan.enabled, true) : toBoolean(plan.isActive, true)) && !isArchived;
    const includedModules = safeStringList(plan.includedModules);
    const visibleFeatures = safeStringList(Array.isArray(plan.visibleFeatures) && plan.visibleFeatures.length
        ? plan.visibleFeatures
        : (Array.isArray(plan.features) && plan.features.length ? plan.features : plan.includedModules), 8);
    const fullFeatures = Array.from(new Set(safeStringList(plan.fullFeatures)
        .concat(visibleFeatures)
        .concat(safeStringList(plan.features))
        .concat(includedModules)));
    const excludedFeatures = safeStringList(plan.excludedFeatures);
    const planType = resolvePlanType(plan.planType || plan.type, priceBDT);
    const type = planType === 'free' ? 'free' : 'paid';
    const ctaMode = resolvePlanCtaMode(plan.ctaMode, type === 'free' ? 'internal' : 'contact');
    const ctaUrl = safeString(plan.ctaUrl || plan.contactCtaUrl, buildDefaultCtaUrl(ctaMode));
    const contactCtaUrl = safeString(plan.contactCtaUrl || ctaUrl, '/contact');
    const shortDescription = safeString(plan.shortDescription || plan.description);
    const fullDescription = safeString(plan.fullDescription || plan.description || shortDescription);
    const billingCycle = resolveBillingCycle(plan.billingCycle, 'monthly');
    const durationLabel = buildDurationLabel({ durationValue, durationUnit, durationDays });
    const validityLabel = safeString(plan.validityLabel, durationLabel);
    const currency = safeString(plan.currency, 'BDT');
    return {
        id,
        _id: id,
        code,
        slug,
        name,
        shortTitle,
        shortLabel: shortTitle,
        tagline: safeString(plan.tagline),
        type,
        planType,
        priceBDT: type === 'free' ? 0 : priceBDT,
        price: type === 'free' ? 0 : priceBDT,
        oldPrice: oldPriceRaw,
        currency,
        billingCycle,
        durationDays,
        durationMonths,
        durationValue,
        durationUnit,
        durationLabel,
        validityLabel,
        isFree: type === 'free',
        isPaid: type !== 'free',
        bannerImageUrl: safeString(plan.bannerImageUrl) || null,
        shortDescription,
        fullDescription,
        description: fullDescription,
        themeKey: resolveThemeKey(plan.themeKey, `${code} ${name}`),
        badgeText: safeString(plan.badgeText),
        highlightText: safeString(plan.highlightText),
        features: visibleFeatures,
        visibleFeatures,
        fullFeatures,
        excludedFeatures,
        includedModules,
        tags: safeStringList(plan.tags),
        recommendedFor: safeString(plan.recommendedFor),
        comparisonNote: safeString(plan.comparisonNote),
        supportLevel: resolveSupportLevel(plan.supportLevel, 'basic'),
        accessScope: safeString(plan.accessScope),
        renewalNotes: safeString(plan.renewalNotes),
        policyNote: safeString(plan.policyNote),
        faqItems: safeFaqItems(plan.faqItems),
        allowsExams: toBoolean(plan.allowsExams, true),
        allowsPremiumResources: toBoolean(plan.allowsPremiumResources, false),
        allowsSMSUpdates: toBoolean(plan.allowsSMSUpdates, false),
        allowsEmailUpdates: toBoolean(plan.allowsEmailUpdates, true),
        allowsGuardianAlerts: toBoolean(plan.allowsGuardianAlerts, false),
        allowsSpecialGroups: toBoolean(plan.allowsSpecialGroups, false),
        dashboardPrivileges: safeStringList(plan.dashboardPrivileges, 20),
        maxAttempts: plan.maxAttempts === null || plan.maxAttempts === undefined ? null : Math.max(0, safeNumber(plan.maxAttempts, 0)),
        enabled,
        isActive: enabled,
        isArchived,
        isFeatured: toBoolean(plan.isFeatured, false),
        showOnHome: toBoolean(plan.showOnHome, false),
        showOnPricingPage: toBoolean(plan.showOnPricingPage, true),
        displayOrder,
        sortOrder: displayOrder,
        priority: safeNumber(plan.priority, displayOrder || 100),
        ctaLabel: safeString(plan.ctaLabel || plan.contactCtaLabel, type === 'free' ? 'Get Started' : 'Subscribe Now'),
        ctaUrl,
        ctaMode,
        contactCtaLabel: safeString(plan.contactCtaLabel || plan.ctaLabel, 'Contact to Subscribe'),
        contactCtaUrl,
        priceLabel: type === 'free' ? 'Free' : `${currency} ${priceBDT.toLocaleString()}`,
        createdByAdminId: plan.createdByAdminId ? String(plan.createdByAdminId) : null,
        updatedByAdminId: plan.updatedByAdminId ? String(plan.updatedByAdminId) : null,
        createdAt: plan.createdAt || null,
        updatedAt: plan.updatedAt || null,
    };
}
function buildSettingsDto(subscriptionSettings, websiteSettings) {
    const pricingUi = websiteSettings?.pricingUi || {};
    const sectionToggles = subscriptionSettings?.sectionToggles || {};
    const comparisonRows = safeComparisonRows(subscriptionSettings?.comparisonRows);
    const faqItems = safeFaqItems(subscriptionSettings?.pageFaqItems);
    return {
        pageTitle: safeString(subscriptionSettings?.pageTitle || websiteSettings?.subscriptionPageTitle, 'Subscription Plans'),
        pageSubtitle: safeString(subscriptionSettings?.pageSubtitle || websiteSettings?.subscriptionPageSubtitle, 'Choose the right plan for your CampusWay journey.'),
        heroEyebrow: safeString(subscriptionSettings?.heroEyebrow, 'CampusWay Memberships'),
        heroNote: safeString(subscriptionSettings?.heroNote, 'Premium access, clear comparisons, and one-click plan details.'),
        headerBannerUrl: safeString(subscriptionSettings?.headerBannerUrl) || null,
        defaultPlanBannerUrl: safeString(subscriptionSettings?.defaultPlanBannerUrl || websiteSettings?.subscriptionDefaultBannerUrl) || null,
        currencyLabel: safeString(subscriptionSettings?.currencyLabel || pricingUi.currencyCode, 'BDT'),
        showFeaturedFirst: subscriptionSettings?.showFeaturedFirst !== false,
        allowFreePlans: toBoolean(subscriptionSettings?.allowFreePlans, true),
        comparisonEnabled: toBoolean(subscriptionSettings?.comparisonEnabled, comparisonRows.length > 0),
        comparisonTitle: safeString(subscriptionSettings?.comparisonTitle, 'Compare Plans'),
        comparisonSubtitle: safeString(subscriptionSettings?.comparisonSubtitle, 'See what changes as you upgrade.'),
        comparisonRows,
        pageFaqEnabled: toBoolean(subscriptionSettings?.pageFaqEnabled, faqItems.length > 0),
        pageFaqTitle: safeString(subscriptionSettings?.pageFaqTitle, 'Frequently Asked Questions'),
        pageFaqItems: faqItems,
        sectionToggles: {
            detailsDrawer: toBoolean(sectionToggles.detailsDrawer, true),
            comparisonTable: toBoolean(sectionToggles.comparisonTable, true),
            faqBlock: toBoolean(sectionToggles.faqBlock, true),
            homePreview: toBoolean(sectionToggles.homePreview, true),
        },
        defaultCtaMode: resolvePlanCtaMode(subscriptionSettings?.defaultCtaMode, 'contact'),
        updatedAt: subscriptionSettings?.updatedAt || null,
        createdAt: subscriptionSettings?.createdAt || null,
    };
}
function toAdminObjectId(value) {
    const id = safeString(value);
    return mongoose_1.default.Types.ObjectId.isValid(id) ? new mongoose_1.default.Types.ObjectId(id) : null;
}
function buildPlanMutationPayload(body, options) {
    const existing = options.existing || {};
    const name = body.name !== undefined ? safeString(body.name) : safeString(existing.name);
    if (!name) {
        return { error: 'name is required' };
    }
    const nextCode = normalizeSlug(body.code !== undefined ? body.code : (existing.code || name), normalizeSlug(name, 'plan'));
    const nextSlug = normalizeSlug(body.slug !== undefined ? body.slug : (existing.slug || nextCode), nextCode);
    if (!nextCode || !nextSlug) {
        return { error: 'code and slug are required' };
    }
    const priceInput = body.priceBDT !== undefined || body.price !== undefined
        ? safeNumber(body.priceBDT, safeNumber(body.price, 0))
        : safeNumber(existing.priceBDT, safeNumber(existing.price, 0));
    if (priceInput < 0) {
        return { error: 'priceBDT cannot be negative' };
    }
    const durationDays = Math.max(1, safeNumber(body.durationDays !== undefined ? body.durationDays : existing.durationDays, 30));
    if (safeNumber(body.durationDays !== undefined ? body.durationDays : durationDays, durationDays) <= 0) {
        return { error: 'durationDays must be greater than 0' };
    }
    const durationUnit = safeString(body.durationUnit !== undefined ? body.durationUnit : existing.durationUnit, 'days') === 'months'
        ? 'months'
        : 'days';
    const durationValue = Math.max(1, safeNumber(body.durationValue !== undefined ? body.durationValue : existing.durationValue, durationUnit === 'months'
        ? safeNumber(body.durationMonths !== undefined ? body.durationMonths : existing.durationMonths, 1)
        : durationDays));
    const durationMonths = durationUnit === 'months'
        ? Math.max(1, safeNumber(body.durationMonths !== undefined ? body.durationMonths : existing.durationMonths, durationValue))
        : null;
    const planType = resolvePlanType(body.planType !== undefined ? body.planType : (body.type !== undefined ? body.type : existing.planType || existing.type), priceInput, 'paid');
    const type = planType === 'free' || priceInput <= 0 ? 'free' : 'paid';
    const priceBDT = type === 'free' ? 0 : Math.max(0, priceInput);
    const oldPrice = body.oldPrice === undefined
        ? (existing.oldPrice === null || existing.oldPrice === undefined ? null : Math.max(0, safeNumber(existing.oldPrice, 0)))
        : (body.oldPrice === null || safeString(body.oldPrice) === '' ? null : Math.max(0, safeNumber(body.oldPrice, 0)));
    if (oldPrice !== null && oldPrice < priceBDT) {
        // keep admin input but avoid a negative-looking discount stack
    }
    const defaultCtaMode = options.defaultCtaMode || 'contact';
    const ctaMode = resolvePlanCtaMode(body.ctaMode !== undefined ? body.ctaMode : existing.ctaMode, defaultCtaMode);
    const ctaUrl = safeString(body.ctaUrl !== undefined ? body.ctaUrl : existing.ctaUrl, buildDefaultCtaUrl(ctaMode));
    const contactCtaUrl = safeString(body.contactCtaUrl !== undefined ? body.contactCtaUrl : existing.contactCtaUrl, ctaUrl || '/contact');
    const bannerImageUrl = safeString(body.bannerImageUrl !== undefined ? body.bannerImageUrl : existing.bannerImageUrl);
    if (!isValidRelativeOrAbsoluteUrl(bannerImageUrl)) {
        return { error: 'bannerImageUrl must be a valid URL or relative path' };
    }
    if (!isValidRelativeOrAbsoluteUrl(ctaUrl)) {
        return { error: 'ctaUrl must be a valid URL or relative path' };
    }
    if (!isValidRelativeOrAbsoluteUrl(contactCtaUrl)) {
        return { error: 'contactCtaUrl must be a valid URL or relative path' };
    }
    const visibleFeatures = safeStringList(body.visibleFeatures !== undefined
        ? body.visibleFeatures
        : (body.features !== undefined ? body.features : (existing.visibleFeatures || existing.features || existing.includedModules)), 8);
    const fullFeatures = Array.from(new Set(safeStringList(body.fullFeatures !== undefined ? body.fullFeatures : existing.fullFeatures)
        .concat(visibleFeatures)
        .concat(safeStringList(body.features !== undefined ? body.features : existing.features))
        .concat(safeStringList(body.includedModules !== undefined ? body.includedModules : existing.includedModules))));
    const payload = {
        code: nextCode,
        slug: nextSlug,
        name,
        shortTitle: safeString(body.shortTitle !== undefined ? body.shortTitle : existing.shortTitle, name),
        tagline: safeString(body.tagline !== undefined ? body.tagline : existing.tagline),
        type,
        planType,
        priceBDT,
        price: priceBDT,
        oldPrice,
        currency: safeString(body.currency !== undefined ? body.currency : existing.currency, 'BDT'),
        billingCycle: resolveBillingCycle(body.billingCycle !== undefined ? body.billingCycle : existing.billingCycle, 'monthly'),
        durationDays,
        durationMonths,
        durationValue,
        durationUnit,
        isFree: type === 'free',
        isPaid: type !== 'free',
        bannerImageUrl: bannerImageUrl || null,
        shortDescription: safeString(body.shortDescription !== undefined ? body.shortDescription : (existing.shortDescription || existing.description)),
        fullDescription: safeString(body.fullDescription !== undefined
            ? body.fullDescription
            : (body.description !== undefined ? body.description : (existing.fullDescription || existing.description || existing.shortDescription))),
        description: safeString(body.fullDescription !== undefined
            ? body.fullDescription
            : (body.description !== undefined ? body.description : (existing.fullDescription || existing.description || existing.shortDescription))),
        themeKey: resolveThemeKey(body.themeKey !== undefined ? body.themeKey : existing.themeKey, `${nextCode} ${name}`, 'basic'),
        badgeText: safeString(body.badgeText !== undefined ? body.badgeText : existing.badgeText),
        highlightText: safeString(body.highlightText !== undefined ? body.highlightText : existing.highlightText),
        features: visibleFeatures,
        visibleFeatures,
        fullFeatures,
        excludedFeatures: safeStringList(body.excludedFeatures !== undefined ? body.excludedFeatures : existing.excludedFeatures),
        tags: safeStringList(body.tags !== undefined ? body.tags : existing.tags),
        includedModules: safeStringList(body.includedModules !== undefined ? body.includedModules : existing.includedModules),
        recommendedFor: safeString(body.recommendedFor !== undefined ? body.recommendedFor : existing.recommendedFor),
        comparisonNote: safeString(body.comparisonNote !== undefined ? body.comparisonNote : existing.comparisonNote),
        supportLevel: resolveSupportLevel(body.supportLevel !== undefined ? body.supportLevel : existing.supportLevel, 'basic'),
        accessScope: safeString(body.accessScope !== undefined ? body.accessScope : existing.accessScope),
        validityLabel: safeString(body.validityLabel !== undefined ? body.validityLabel : existing.validityLabel, buildDurationLabel({ durationValue, durationUnit, durationDays })),
        renewalNotes: safeString(body.renewalNotes !== undefined ? body.renewalNotes : existing.renewalNotes),
        policyNote: safeString(body.policyNote !== undefined ? body.policyNote : existing.policyNote),
        faqItems: safeFaqItems(body.faqItems !== undefined ? body.faqItems : existing.faqItems),
        allowsExams: toBoolean(body.allowsExams !== undefined ? body.allowsExams : existing.allowsExams, true),
        allowsPremiumResources: toBoolean(body.allowsPremiumResources !== undefined ? body.allowsPremiumResources : existing.allowsPremiumResources, false),
        allowsSMSUpdates: toBoolean(body.allowsSMSUpdates !== undefined ? body.allowsSMSUpdates : existing.allowsSMSUpdates, false),
        allowsEmailUpdates: toBoolean(body.allowsEmailUpdates !== undefined ? body.allowsEmailUpdates : existing.allowsEmailUpdates, true),
        allowsGuardianAlerts: toBoolean(body.allowsGuardianAlerts !== undefined ? body.allowsGuardianAlerts : existing.allowsGuardianAlerts, false),
        allowsSpecialGroups: toBoolean(body.allowsSpecialGroups !== undefined ? body.allowsSpecialGroups : existing.allowsSpecialGroups, false),
        dashboardPrivileges: safeStringList(body.dashboardPrivileges !== undefined ? body.dashboardPrivileges : existing.dashboardPrivileges, 20),
        maxAttempts: body.maxAttempts === undefined
            ? (existing.maxAttempts === null || existing.maxAttempts === undefined ? null : Math.max(0, safeNumber(existing.maxAttempts, 0)))
            : (body.maxAttempts === null || safeString(body.maxAttempts) === '' ? null : Math.max(0, safeNumber(body.maxAttempts, 0))),
        enabled: toBoolean(body.enabled !== undefined ? body.enabled : (body.isActive !== undefined ? body.isActive : existing.enabled), true),
        isFeatured: toBoolean(body.isFeatured !== undefined ? body.isFeatured : existing.isFeatured, false),
        isArchived: toBoolean(body.isArchived !== undefined ? body.isArchived : existing.isArchived, false),
        showOnHome: toBoolean(body.showOnHome !== undefined ? body.showOnHome : existing.showOnHome, false),
        showOnPricingPage: toBoolean(body.showOnPricingPage !== undefined ? body.showOnPricingPage : existing.showOnPricingPage, true),
        displayOrder: safeNumber(body.displayOrder !== undefined ? body.displayOrder : (body.sortOrder !== undefined ? body.sortOrder : (existing.displayOrder || existing.sortOrder || existing.priority)), 100),
        sortOrder: safeNumber(body.sortOrder !== undefined ? body.sortOrder : (body.displayOrder !== undefined ? body.displayOrder : (existing.sortOrder || existing.displayOrder || existing.priority)), 100),
        priority: safeNumber(body.priority !== undefined ? body.priority : (existing.priority || existing.displayOrder || existing.sortOrder), 100),
        ctaLabel: safeString(body.ctaLabel !== undefined ? body.ctaLabel : (existing.ctaLabel || existing.contactCtaLabel), type === 'free' ? 'Get Started' : 'Subscribe Now'),
        ctaUrl,
        ctaMode,
        contactCtaLabel: safeString(body.contactCtaLabel !== undefined ? body.contactCtaLabel : (existing.contactCtaLabel || existing.ctaLabel), 'Contact to Subscribe'),
        contactCtaUrl,
        createdByAdminId: options.isCreate ? toAdminObjectId(options.adminId) : existing.createdByAdminId || null,
        updatedByAdminId: toAdminObjectId(options.adminId),
    };
    payload.isActive = !toBoolean(payload.isArchived, false) && toBoolean(payload.enabled, true);
    return { payload };
}
async function buildUniqueDuplicateIdentity(baseCode, baseSlug) {
    const seed = `${baseCode || 'plan'}-copy`;
    const slugSeed = `${baseSlug || baseCode || 'plan'}-copy`;
    for (let index = 1; index <= 1000; index += 1) {
        const suffix = index === 1 ? '' : `-${index}`;
        const code = normalizeSlug(`${seed}${suffix}`, 'plan-copy');
        const slug = normalizeSlug(`${slugSeed}${suffix}`, code);
        const exists = await SubscriptionPlan_1.default.exists({
            $or: [{ code }, { slug }],
        });
        if (!exists) {
            return { code, slug };
        }
    }
    const stamp = Date.now();
    return {
        code: normalizeSlug(`${seed}-${stamp}`, 'plan-copy'),
        slug: normalizeSlug(`${slugSeed}-${stamp}`, 'plan-copy'),
    };
}
function getExportType(raw) {
    return String(raw || '').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
}
function sendExport(res, type, filenameBase, rows) {
    if (type === 'csv') {
        const headers = rows.length ? Object.keys(rows[0]) : [];
        const lines = [headers.join(',')];
        for (const row of rows) {
            lines.push(headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
        res.send(lines.join('\n'));
        return;
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
    res.send(buffer);
}
async function ensureSubscriptionSettings() {
    let settings = await SubscriptionSettings_1.default.findOne().lean();
    if (settings)
        return settings;
    const created = await SubscriptionSettings_1.default.create({});
    return created.toObject();
}
async function getPublicSubscriptionPlans(req, res) {
    try {
        const [plans, websiteSettings, subscriptionSettings] = await Promise.all([
            SubscriptionPlan_1.default.find(buildPublicPlanFilter())
                .sort(PLAN_SORT)
                .lean(),
            WebsiteSettings_1.default.findOne().lean(),
            ensureSubscriptionSettings(),
        ]);
        const settings = buildSettingsDto(subscriptionSettings, websiteSettings);
        let items = plans
            .map((plan) => planToDto(plan))
            .filter((plan) => settings.allowFreePlans || !plan.isFree);
        if (settings.showFeaturedFirst) {
            items = [...items].sort((a, b) => {
                if (Boolean(a.isFeatured) !== Boolean(b.isFeatured))
                    return a.isFeatured ? -1 : 1;
                return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
            });
        }
        res.json({
            items,
            settings,
            lastUpdatedAt: subscriptionSettings?.updatedAt || null,
        });
    }
    catch (error) {
        console.error('getPublicSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getPublicSubscriptionPlanById(req, res) {
    try {
        const id = safeString(req.params?.slug || req.params?.id);
        const plan = await SubscriptionPlan_1.default.findOne({
            $and: [
                getPlanLookupQuery(id),
                {
                    isArchived: { $ne: true },
                    $or: [{ enabled: true }, { isActive: true }],
                },
            ],
        }).lean();
        if (!plan) {
            res.status(404).json({ message: 'Plan not found' });
            return;
        }
        res.json({ item: planToDto(plan) });
    }
    catch (error) {
        console.error('getPublicSubscriptionPlanById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getMySubscription(req, res) {
    try {
        const userId = String(req.user?._id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const [latest, user] = await Promise.all([
            UserSubscription_1.default.findOne({ userId })
                .sort({ updatedAt: -1, createdAt: -1 })
                .populate('planId')
                .lean(),
            User_1.default.findById(userId).select('subscription').lean(),
        ]);
        if (!latest) {
            const cache = user?.subscription || {};
            const expiresAtUTC = cache.expiryDate ? new Date(String(cache.expiryDate)) : null;
            const nowMs = Date.now();
            const isActive = Boolean(cache.isActive && expiresAtUTC && expiresAtUTC.getTime() > nowMs);
            const hasAnyPlanName = Boolean(String(cache.planName || cache.plan || '').trim());
            const daysLeft = isActive && expiresAtUTC
                ? Math.max(0, Math.ceil((expiresAtUTC.getTime() - nowMs) / 86400000))
                : null;
            res.json({
                status: isActive ? 'active' : (hasAnyPlanName ? 'expired' : 'none'),
                isActive,
                planId: cache.planId ? String(cache.planId) : null,
                planSlug: safeString(cache.planSlug) || null,
                planCode: safeString(cache.planCode || cache.plan) || null,
                planName: hasAnyPlanName ? String(cache.planName || cache.plan || '') : undefined,
                ctaLabel: safeString(cache.ctaLabel, 'View Plans'),
                ctaUrl: safeString(cache.ctaUrl, '/subscription-plans'),
                ctaMode: resolvePlanCtaMode(cache.ctaMode, 'contact'),
                expiresAtUTC: expiresAtUTC ? expiresAtUTC.toISOString() : null,
                daysLeft,
            });
            return;
        }
        const plan = latest.planId && typeof latest.planId === 'object'
            ? planToDto(latest.planId)
            : null;
        const expiresAtUTC = latest.expiresAtUTC ? new Date(latest.expiresAtUTC) : null;
        const nowMs = Date.now();
        const activeWindow = !!expiresAtUTC && expiresAtUTC.getTime() > nowMs;
        const normalizedStatus = latest.status === 'pending'
            ? 'pending'
            : (latest.status === 'active' && activeWindow ? 'active' : (latest.status === 'active' ? 'expired' : (latest.status === 'expired' ? 'expired' : (latest.status === 'suspended' ? 'pending' : 'none'))));
        const daysLeft = normalizedStatus === 'active' && expiresAtUTC
            ? Math.max(0, Math.ceil((expiresAtUTC.getTime() - nowMs) / 86400000))
            : null;
        res.json({
            status: normalizedStatus,
            isActive: normalizedStatus === 'active',
            rawStatus: latest.status,
            planId: plan?._id || String(latest.planId || ''),
            planSlug: plan?.slug || null,
            planCode: plan?.code || null,
            planName: plan?.name || undefined,
            ctaLabel: plan?.ctaLabel || 'View Plans',
            ctaUrl: plan?.ctaUrl || '/subscription-plans',
            ctaMode: plan?.ctaMode || 'contact',
            startAtUTC: latest.startAtUTC ? new Date(latest.startAtUTC).toISOString() : null,
            expiresAtUTC: expiresAtUTC ? expiresAtUTC.toISOString() : null,
            daysLeft,
            plan,
        });
    }
    catch (error) {
        console.error('getMySubscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getHomeSubscriptionPlans(req, res) {
    try {
        const [homeSettingsDoc, websiteSettings, subscriptionSettings, plans, user] = await Promise.all([
            (0, homeSettingsService_1.ensureHomeSettings)(),
            WebsiteSettings_1.default.findOne().lean(),
            ensureSubscriptionSettings(),
            SubscriptionPlan_1.default.find({
                isArchived: { $ne: true },
                $or: [{ enabled: true }, { isActive: true }],
            })
                .sort(PLAN_SORT)
                .lean(),
            req.user?._id ? User_1.default.findById(req.user._id).select('subscription').lean() : Promise.resolve(null),
        ]);
        const settings = buildSettingsDto(subscriptionSettings, websiteSettings);
        const homeSettings = typeof homeSettingsDoc.toObject === 'function'
            ? homeSettingsDoc.toObject()
            : homeSettingsDoc;
        const curatedIds = Array.isArray(homeSettings?.subscriptionBanner?.planIdsToShow)
            ? homeSettings.subscriptionBanner.planIdsToShow
                .map((item) => String(item || '').trim())
                .filter(Boolean)
            : [];
        const availablePlans = plans
            .map((plan) => planToDto(plan))
            .filter((plan) => settings.allowFreePlans || !plan.isFree);
        const findPlanByToken = (token) => {
            return availablePlans.find((plan) => (token === String(plan.id || '').trim()
                || token === String(plan.code || '').trim()
                || token === String(plan.slug || '').trim()));
        };
        const curatedPlans = Array.from(new Set(curatedIds))
            .map((token) => findPlanByToken(token))
            .filter(Boolean);
        const homeTaggedPlans = availablePlans.filter((plan) => Boolean(plan.showOnHome));
        const fallbackPlans = homeTaggedPlans.length > 0 ? homeTaggedPlans : availablePlans;
        const items = curatedPlans.length > 0 ? curatedPlans : fallbackPlans;
        const cache = user?.subscription || {};
        const expiryDate = cache.expiryDate ? new Date(String(cache.expiryDate)) : null;
        const hasActivePlan = Boolean(cache.isActive &&
            expiryDate &&
            !Number.isNaN(expiryDate.getTime()) &&
            expiryDate.getTime() > Date.now());
        res.json({
            items,
            settings,
            banner: {
                enabled: toBoolean(homeSettings?.subscriptionBanner?.enabled, true),
                title: safeString(homeSettings?.subscriptionBanner?.title, 'Unlock Premium Exam Access'),
                subtitle: safeString(homeSettings?.subscriptionBanner?.subtitle, 'Choose a plan to access live exams, smart practice, and result analytics.'),
                loginMessage: safeString(homeSettings?.subscriptionBanner?.loginMessage, 'Contact admin to subscribe and unlock online exams.'),
                noPlanMessage: safeString(homeSettings?.subscriptionBanner?.noPlanMessage, 'Subscription required to start online exams.'),
                activePlanMessage: safeString(homeSettings?.subscriptionBanner?.activePlanMessage, 'Plan Active'),
                bannerImageUrl: safeString(homeSettings?.subscriptionBanner?.bannerImageUrl) || null,
                primaryCTA: {
                    label: safeString(homeSettings?.subscriptionBanner?.primaryCTA?.label, 'See Plans'),
                    url: safeString(homeSettings?.subscriptionBanner?.primaryCTA?.url, '/subscription-plans'),
                },
                secondaryCTA: {
                    label: safeString(homeSettings?.subscriptionBanner?.secondaryCTA?.label, 'Contact Admin'),
                    url: safeString(homeSettings?.subscriptionBanner?.secondaryCTA?.url, '/contact'),
                },
                showPlanCards: toBoolean(homeSettings?.subscriptionBanner?.showPlanCards, true),
                planIdsToShow: curatedIds,
            },
            state: {
                loggedIn: Boolean(req.user?._id),
                hasActivePlan,
                expiryDate: expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate.toISOString() : null,
                reason: !req.user?._id ? 'not_logged_in' : (hasActivePlan ? 'active_plan' : 'subscription_required'),
            },
        });
    }
    catch (error) {
        console.error('getHomeSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function requestSubscriptionPayment(req, res) {
    try {
        const userId = String(req.user?._id || '');
        const planId = String(req.params.planId || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || !mongoose_1.default.Types.ObjectId.isValid(planId)) {
            res.status(400).json({ message: 'Invalid request' });
            return;
        }
        const plan = await SubscriptionPlan_1.default.findOne({
            _id: planId,
            isArchived: { $ne: true },
            $or: [{ enabled: true }, { isActive: true }],
        }).lean();
        if (!plan) {
            res.status(404).json({ message: 'Plan not found' });
            return;
        }
        const planDto = planToDto(plan);
        const amount = Math.max(0, safeNumber(planDto.priceBDT, 0));
        const methodRaw = safeString(req.body?.method, 'manual').toLowerCase();
        const method = ['bkash', 'nagad', 'rocket', 'upay', 'cash', 'manual', 'bank', 'card', 'sslcommerz'].includes(methodRaw)
            ? methodRaw
            : 'manual';
        const transactionId = safeString(req.body?.transactionId);
        const proofUrl = safeString(req.body?.proofUrl);
        const notes = safeString(req.body?.notes);
        const result = await (0, subscriptionLifecycleService_1.assignSubscriptionLifecycle)({
            userId,
            planId,
            actorId: userId,
            startAtUTC: new Date(),
            paymentAmount: amount,
            paymentStatus: planDto.type === 'free' ? 'paid' : 'pending',
            paymentMethod: method,
            transactionId,
            proofUrl,
            notes: notes || `Plan request created via public API (${planDto.type === 'free' ? 'active' : 'pending'})`,
            paymentNotes: notes || `Subscription request for ${planDto.name}`,
            recordPayment: false,
        });
        res.status(201).json({
            message: result.subscription.status === 'active' ? 'Free plan activated' : 'Payment request submitted',
            payment: result.payment,
            subscription: result.subscription,
            invoice: result.invoice,
            plan: planDto,
        });
    }
    catch (error) {
        console.error('requestSubscriptionPayment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function uploadSubscriptionProof(req, res) {
    try {
        const userId = String(req.user?._id || '');
        const planId = String(req.params.planId || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || !mongoose_1.default.Types.ObjectId.isValid(planId)) {
            res.status(400).json({ message: 'Invalid request' });
            return;
        }
        const payment = await ManualPayment_1.default.findOne({
            studentId: userId,
            subscriptionPlanId: planId,
            entryType: 'subscription',
        }).sort({ createdAt: -1 });
        if (!payment) {
            res.status(404).json({ message: 'No payment request found for this plan' });
            return;
        }
        let proofUrl = safeString(req.body?.proofUrl || req.body?.proofFileUrl);
        const transactionId = safeString(req.body?.transactionId);
        const methodRaw = safeString(req.body?.method).toLowerCase();
        if (req.file) {
            const secureUpload = await (0, secureUploadService_1.registerSecureUpload)({
                file: req.file,
                category: 'payment_proof',
                visibility: 'protected',
                ownerUserId: userId,
                ownerRole: req.user?.role || 'student',
                uploadedBy: userId,
                accessRoles: ['student', 'superadmin', 'admin', 'finance_agent'],
            });
            proofUrl = (0, secureUploadService_1.buildSecureUploadUrl)(secureUpload.storedName);
        }
        if (proofUrl) {
            payment.proofUrl = proofUrl;
            payment.proofFileUrl = proofUrl;
        }
        if (transactionId) {
            payment.transactionId = transactionId;
            payment.reference = transactionId;
        }
        if (methodRaw && ['bkash', 'nagad', 'rocket', 'upay', 'cash', 'manual', 'bank', 'card', 'sslcommerz'].includes(methodRaw)) {
            payment.method = methodRaw;
        }
        payment.status = payment.status === 'paid' ? 'paid' : 'pending';
        await payment.save();
        res.json({ message: 'Payment proof uploaded', payment });
    }
    catch (error) {
        console.error('uploadSubscriptionProof error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetSubscriptionPlans(req, res) {
    try {
        const items = await SubscriptionPlan_1.default.find()
            .sort(PLAN_SORT)
            .lean();
        res.json({
            items: items.map((item) => planToDto(item)),
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('adminGetSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetSubscriptionPlanById(req, res) {
    try {
        const id = safeString(req.params?.id);
        const item = await SubscriptionPlan_1.default.findOne(getPlanLookupQuery(id)).lean();
        if (!item) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        res.json({ item: planToDto(item) });
    }
    catch (error) {
        console.error('adminGetSubscriptionPlanById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateSubscriptionPlan(req, res) {
    try {
        const body = (req.body || {});
        const settings = await ensureSubscriptionSettings();
        const built = buildPlanMutationPayload(body, {
            isCreate: true,
            adminId: safeString(req.user?._id),
            defaultCtaMode: resolvePlanCtaMode(settings?.defaultCtaMode, 'contact'),
        });
        if (built.error || !built.payload) {
            res.status(400).json({ message: built.error || 'Invalid payload' });
            return;
        }
        const duplicate = await SubscriptionPlan_1.default.exists({
            $or: [
                { code: safeString(built.payload.code) },
                { slug: safeString(built.payload.slug) },
            ],
        });
        if (duplicate) {
            res.status(400).json({ message: 'Plan code or slug already exists' });
            return;
        }
        const created = await SubscriptionPlan_1.default.create(built.payload);
        res.status(201).json({ item: planToDto(created.toObject()), message: 'Subscription plan created' });
    }
    catch (error) {
        console.error('adminCreateSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateSubscriptionPlan(req, res) {
    try {
        const body = (req.body || {});
        const id = String(req.params.id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid plan id' });
            return;
        }
        const existing = await SubscriptionPlan_1.default.findById(id).lean();
        if (!existing) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        const settings = await ensureSubscriptionSettings();
        const built = buildPlanMutationPayload(body, {
            isCreate: false,
            existing: existing,
            adminId: safeString(req.user?._id),
            defaultCtaMode: resolvePlanCtaMode(settings?.defaultCtaMode, 'contact'),
        });
        if (built.error || !built.payload) {
            res.status(400).json({ message: built.error || 'Invalid payload' });
            return;
        }
        const duplicate = await SubscriptionPlan_1.default.exists({
            _id: { $ne: id },
            $or: [
                { code: safeString(built.payload.code) },
                { slug: safeString(built.payload.slug) },
            ],
        });
        if (duplicate) {
            res.status(400).json({ message: 'Plan code or slug already exists' });
            return;
        }
        const updated = await SubscriptionPlan_1.default.findByIdAndUpdate(id, built.payload, { new: true, runValidators: true }).lean();
        if (!updated) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        res.json({ item: planToDto(updated), message: 'Subscription plan updated' });
    }
    catch (error) {
        console.error('adminUpdateSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteSubscriptionPlan(req, res) {
    try {
        const id = String(req.params.id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid plan id' });
            return;
        }
        const archived = await SubscriptionPlan_1.default.findByIdAndUpdate(id, {
            $set: {
                isArchived: true,
                enabled: false,
                isActive: false,
                showOnHome: false,
                showOnPricingPage: false,
                updatedByAdminId: toAdminObjectId(req.user?._id),
            },
        }, { new: true }).lean();
        if (!archived) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        res.json({
            message: 'Subscription plan archived',
            item: planToDto(archived),
        });
    }
    catch (error) {
        console.error('adminDeleteSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleSubscriptionPlan(req, res) {
    try {
        const id = String(req.params.id || '');
        const plan = await SubscriptionPlan_1.default.findById(id);
        if (!plan) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        const enabled = !(plan.enabled !== false && plan.isActive !== false);
        plan.enabled = enabled;
        plan.isArchived = false;
        plan.isActive = enabled && !plan.isArchived;
        plan.updatedByAdminId = toAdminObjectId(req.user?._id);
        await plan.save();
        res.json({ item: planToDto(plan.toObject()), message: enabled ? 'Plan enabled' : 'Plan disabled' });
    }
    catch (error) {
        console.error('adminToggleSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminReorderSubscriptionPlans(req, res) {
    try {
        const rawOrder = req.body?.order || req.body?.ids || req.body?.planIds || [];
        if (!Array.isArray(rawOrder) || rawOrder.length === 0) {
            res.status(400).json({ message: 'order array is required' });
            return;
        }
        const ops = rawOrder
            .map((entry, index) => {
            const text = typeof entry === 'object' && entry !== null
                ? String(entry.id || entry._id || '')
                : String(entry || '').trim();
            if (!mongoose_1.default.Types.ObjectId.isValid(text))
                return null;
            const explicitOrder = typeof entry === 'object' && entry !== null
                ? safeNumber(entry.sortOrder ?? entry.displayOrder, index + 1)
                : index + 1;
            const nextOrder = explicitOrder || index + 1;
            return SubscriptionPlan_1.default.updateOne({ _id: text }, {
                $set: {
                    displayOrder: nextOrder,
                    sortOrder: nextOrder,
                    priority: nextOrder,
                    updatedByAdminId: toAdminObjectId(req.user?._id),
                },
            });
        })
            .filter(Boolean);
        await Promise.all(ops);
        res.json({ message: 'Subscription plans reordered' });
    }
    catch (error) {
        console.error('adminReorderSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminAssignSubscription(req, res) {
    try {
        const userId = safeString(req.body?.userId);
        const planId = safeString(req.body?.planId);
        const planCode = safeString(req.body?.planCode || req.body?.plan);
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || (!mongoose_1.default.Types.ObjectId.isValid(planId) && !planCode)) {
            res.status(400).json({ message: 'userId and a valid planId or planCode are required' });
            return;
        }
        const notes = safeString(req.body?.notes);
        const result = await (0, subscriptionLifecycleService_1.assignSubscriptionLifecycle)({
            userId,
            planId,
            planCode,
            actorId: safeString(req.user?._id),
            startAtUTC: req.body?.startAtUTC || req.body?.startDate,
            expiresAtUTC: req.body?.expiresAtUTC || req.body?.expiryDate || req.body?.endDate,
            subscriptionStatus: req.body?.subscriptionStatus || req.body?.status,
            paymentAmount: req.body?.paymentAmount,
            paymentStatus: req.body?.paymentStatus,
            paymentMethod: req.body?.paymentMethod,
            paymentDate: req.body?.paymentDate,
            transactionId: req.body?.transactionId,
            notes,
            paymentNotes: req.body?.paymentNotes,
            proofUrl: req.body?.proofUrl || req.body?.proofFileUrl,
            recordPayment: req.body?.recordPayment,
            autoRenewEnabled: req.body?.autoRenewEnabled,
            dueDateUTC: req.body?.dueDateUTC,
        });
        const responseStatus = req.params?.id ? 200 : 201;
        res.status(responseStatus).json({
            message: result.subscription.status === 'active' ? 'Subscription assigned' : 'Subscription created in pending state',
            item: result.subscription,
            payment: result.payment,
            invoice: result.invoice,
            cache: result.cache,
        });
    }
    catch (error) {
        console.error('adminAssignSubscription error:', error);
        const message = error instanceof Error ? error.message : 'Server error';
        const statusCode = /not found|required|valid/i.test(message) ? 400 : 500;
        res.status(statusCode).json({ message });
    }
}
async function adminLegacyAssignStudentSubscription(req, res) {
    try {
        const userId = safeString(req.params?.id || req.body?.userId);
        const planIdRaw = safeString(req.body?.planId);
        const planCode = safeString(req.body?.planCode || req.body?.plan).toLowerCase();
        let planId = planIdRaw;
        if (!mongoose_1.default.Types.ObjectId.isValid(planId) && planCode) {
            const plan = await SubscriptionPlan_1.default.findOne({ code: planCode }).select('_id').lean();
            if (plan?._id) {
                planId = String(plan._id);
            }
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || !mongoose_1.default.Types.ObjectId.isValid(planId)) {
            res.status(400).json({ message: 'Valid student id and plan reference are required' });
            return;
        }
        const startAtUTC = safeString(req.body?.startAtUTC || req.body?.startDate);
        const expiresAtUTC = safeString(req.body?.expiresAtUTC || req.body?.expiryDate || req.body?.endDate);
        const isActive = req.body?.isActive === undefined ? true : toBoolean(req.body?.isActive, true);
        let status = isActive ? 'active' : 'suspended';
        if (!isActive && expiresAtUTC) {
            const expiresMs = new Date(expiresAtUTC).getTime();
            if (!Number.isNaN(expiresMs) && expiresMs <= Date.now()) {
                status = 'expired';
            }
        }
        req.body = {
            ...(req.body || {}),
            userId,
            planId,
            status,
            startAtUTC: startAtUTC || undefined,
            expiresAtUTC: expiresAtUTC || undefined,
            notes: safeString(req.body?.notes, 'Assigned via legacy student subscription endpoint'),
        };
        await adminAssignSubscription(req, res);
    }
    catch (error) {
        console.error('adminLegacyAssignStudentSubscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminSuspendSubscription(req, res) {
    try {
        const userId = safeString(req.body?.userId);
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ message: 'userId is required' });
            return;
        }
        const latest = await UserSubscription_1.default.findOne({ userId }).sort({ updatedAt: -1, createdAt: -1 });
        if (!latest) {
            res.status(404).json({ message: 'No subscription record found for this user' });
            return;
        }
        latest.status = 'suspended';
        const notes = safeString(req.body?.notes);
        if (notes)
            latest.notes = notes;
        await latest.save();
        const plan = await SubscriptionPlan_1.default.findById(latest.planId).lean();
        await (0, subscriptionLifecycleService_1.syncUserSubscriptionCache)({
            userId,
            plan: plan,
            status: 'suspended',
            startAtUTC: latest.startAtUTC,
            expiresAtUTC: latest.expiresAtUTC,
        });
        res.json({ message: 'Subscription suspended', item: latest });
    }
    catch (error) {
        console.error('adminSuspendSubscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportSubscriptions(req, res) {
    try {
        const type = getExportType(req.query.format ?? req.query.type);
        const statusFilter = safeString(req.query.status).toLowerCase();
        const filter = {};
        if (statusFilter && ['active', 'expired', 'pending', 'suspended'].includes(statusFilter)) {
            filter.status = statusFilter;
        }
        const rows = await UserSubscription_1.default.find(filter)
            .sort({ createdAt: -1 })
            .populate('userId', 'username email full_name')
            .populate('planId', 'name code')
            .lean();
        const exportRows = rows.map((item) => ({
            userId: String(item.userId && typeof item.userId === 'object' ? item.userId._id : item.userId || ''),
            username: safeString(item.userId?.username),
            email: safeString(item.userId?.email),
            fullName: safeString(item.userId?.full_name),
            planId: String(item.planId && typeof item.planId === 'object' ? item.planId._id : item.planId || ''),
            planCode: safeString(item.planId?.code),
            planName: safeString(item.planId?.name),
            status: safeString(item.status),
            startAtUTC: item.startAtUTC ? new Date(item.startAtUTC).toISOString() : '',
            expiresAtUTC: item.expiresAtUTC ? new Date(item.expiresAtUTC).toISOString() : '',
            notes: safeString(item.notes),
            createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : '',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : '',
        }));
        sendExport(res, type, 'subscriptions_export', exportRows);
    }
    catch (error) {
        console.error('adminExportSubscriptions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportSubscriptionPlans(req, res) {
    try {
        const type = getExportType(req.query.format ?? req.query.type);
        const plans = await SubscriptionPlan_1.default.find().sort(PLAN_SORT).lean();
        const exportRows = plans.map((item) => {
            const plan = planToDto(item);
            return {
                id: plan._id,
                code: plan.code,
                slug: plan.slug,
                name: plan.name,
                type: plan.type,
                planType: plan.planType,
                priceBDT: plan.priceBDT,
                oldPrice: plan.oldPrice ?? '',
                billingCycle: plan.billingCycle,
                durationDays: plan.durationDays,
                enabled: plan.enabled,
                isArchived: plan.isArchived,
                isFeatured: plan.isFeatured,
                showOnHome: plan.showOnHome,
                showOnPricingPage: plan.showOnPricingPage,
                displayOrder: plan.displayOrder,
                ctaLabel: plan.ctaLabel,
                ctaUrl: plan.ctaUrl,
                ctaMode: plan.ctaMode,
                shortDescription: plan.shortDescription,
                highlightText: plan.highlightText,
                visibleFeatures: plan.visibleFeatures.join(' | '),
                fullFeatures: plan.fullFeatures.join(' | '),
                tags: plan.tags.join(' | '),
            };
        });
        sendExport(res, type, 'subscription_plans_export', exportRows);
    }
    catch (error) {
        console.error('adminExportSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleSubscriptionPlanFeatured(req, res) {
    try {
        const id = String(req.params.id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid plan id' });
            return;
        }
        const plan = await SubscriptionPlan_1.default.findById(id);
        if (!plan) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        plan.isFeatured = !Boolean(plan.isFeatured);
        if (plan.isFeatured && !plan.showOnHome) {
            plan.showOnHome = true;
        }
        plan.updatedByAdminId = toAdminObjectId(req.user?._id);
        await plan.save();
        res.json({ item: planToDto(plan.toObject()), message: plan.isFeatured ? 'Plan marked as featured' : 'Plan unfeatured' });
    }
    catch (error) {
        console.error('adminToggleSubscriptionPlanFeatured error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDuplicateSubscriptionPlan(req, res) {
    try {
        const id = safeString(req.params.id);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid plan id' });
            return;
        }
        const source = await SubscriptionPlan_1.default.findById(id).lean();
        if (!source) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        const identity = await buildUniqueDuplicateIdentity(safeString(source.code, 'plan'), safeString(source.slug || source.code, 'plan'));
        const created = await SubscriptionPlan_1.default.create({
            ...source,
            _id: undefined,
            code: identity.code,
            slug: identity.slug,
            name: `${safeString(source.name, 'Plan')} Copy`,
            isArchived: false,
            enabled: false,
            isActive: false,
            isFeatured: false,
            createdByAdminId: toAdminObjectId(req.user?._id),
            updatedByAdminId: toAdminObjectId(req.user?._id),
        });
        res.status(201).json({
            item: planToDto(created.toObject()),
            message: 'Subscription plan duplicated',
        });
    }
    catch (error) {
        console.error('adminDuplicateSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetSubscriptionSettings(req, res) {
    try {
        const settings = await ensureSubscriptionSettings();
        res.json({ settings: buildSettingsDto(settings, null) });
    }
    catch (error) {
        console.error('adminGetSubscriptionSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateSubscriptionSettings(req, res) {
    try {
        const body = (req.body || {});
        const settings = await ensureSubscriptionSettings();
        const bodySectionToggles = body.sectionToggles || {};
        const existingSectionToggles = settings.sectionToggles || {};
        const update = {
            pageTitle: safeString(body.pageTitle, safeString(settings.pageTitle, 'Subscription Plans')),
            pageSubtitle: safeString(body.pageSubtitle, safeString(settings.pageSubtitle, 'Choose the right plan for your CampusWay journey.')),
            heroEyebrow: safeString(body.heroEyebrow, safeString(settings.heroEyebrow, 'CampusWay Memberships')),
            heroNote: safeString(body.heroNote, safeString(settings.heroNote, 'Premium access, clear comparisons, and one-click plan details.')),
            headerBannerUrl: safeString(body.headerBannerUrl, safeString(settings.headerBannerUrl)) || null,
            defaultPlanBannerUrl: safeString(body.defaultPlanBannerUrl, safeString(settings.defaultPlanBannerUrl)) || null,
            currencyLabel: safeString(body.currencyLabel, safeString(settings.currencyLabel, 'BDT')),
            showFeaturedFirst: toBoolean(body.showFeaturedFirst, settings.showFeaturedFirst !== false),
            allowFreePlans: toBoolean(body.allowFreePlans, toBoolean(settings.allowFreePlans, true)),
            comparisonEnabled: toBoolean(body.comparisonEnabled, toBoolean(settings.comparisonEnabled, true)),
            comparisonTitle: safeString(body.comparisonTitle, safeString(settings.comparisonTitle, 'Compare Plans')),
            comparisonSubtitle: safeString(body.comparisonSubtitle, safeString(settings.comparisonSubtitle, 'See what changes as you upgrade.')),
            comparisonRows: safeComparisonRows(body.comparisonRows !== undefined ? body.comparisonRows : settings.comparisonRows),
            pageFaqEnabled: toBoolean(body.pageFaqEnabled, toBoolean(settings.pageFaqEnabled, true)),
            pageFaqTitle: safeString(body.pageFaqTitle, safeString(settings.pageFaqTitle, 'Frequently Asked Questions')),
            pageFaqItems: safeFaqItems(body.pageFaqItems !== undefined ? body.pageFaqItems : settings.pageFaqItems),
            sectionToggles: {
                detailsDrawer: toBoolean(bodySectionToggles.detailsDrawer, toBoolean(existingSectionToggles.detailsDrawer, true)),
                comparisonTable: toBoolean(bodySectionToggles.comparisonTable, toBoolean(existingSectionToggles.comparisonTable, true)),
                faqBlock: toBoolean(bodySectionToggles.faqBlock, toBoolean(existingSectionToggles.faqBlock, true)),
                homePreview: toBoolean(bodySectionToggles.homePreview, toBoolean(existingSectionToggles.homePreview, true)),
            },
            defaultCtaMode: resolvePlanCtaMode(body.defaultCtaMode, resolvePlanCtaMode(settings.defaultCtaMode, 'contact')),
            lastEditedByAdminId: req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
                ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
                : null,
        };
        const updated = await SubscriptionSettings_1.default.findByIdAndUpdate(String(settings._id), update, { new: true, runValidators: true }).lean();
        res.json({
            settings: buildSettingsDto(updated, null),
            message: 'Subscription settings updated',
        });
    }
    catch (error) {
        console.error('adminUpdateSubscriptionSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetUserSubscriptions(req, res) {
    try {
        const status = safeString(req.query.status).toLowerCase();
        const q = safeString(req.query.q).toLowerCase();
        const planId = safeString(req.query.planId);
        const page = Math.max(1, safeNumber(req.query.page, 1));
        const limit = Math.min(200, Math.max(1, safeNumber(req.query.limit, 20)));
        const filter = {};
        if (status && ['active', 'expired', 'pending', 'suspended'].includes(status))
            filter.status = status;
        if (planId && mongoose_1.default.Types.ObjectId.isValid(planId))
            filter.planId = new mongoose_1.default.Types.ObjectId(planId);
        const rows = await UserSubscription_1.default.find(filter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .populate('userId', 'username email full_name')
            .populate('planId', 'name code durationDays')
            .lean();
        const nowMs = Date.now();
        const shaped = rows.map((row) => {
            const expiresAt = row.expiresAtUTC ? new Date(row.expiresAtUTC) : null;
            const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - nowMs) / 86400000) : null;
            return {
                ...row,
                daysLeft,
            };
        }).filter((row) => {
            if (!q)
                return true;
            const username = safeString(row.userId?.username).toLowerCase();
            const email = safeString(row.userId?.email).toLowerCase();
            const fullName = safeString(row.userId?.full_name).toLowerCase();
            const planName = safeString(row.planId?.name).toLowerCase();
            return username.includes(q) || email.includes(q) || fullName.includes(q) || planName.includes(q);
        });
        const total = shaped.length;
        const start = (page - 1) * limit;
        const items = shaped.slice(start, start + limit);
        res.json({
            items,
            pagination: {
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    }
    catch (error) {
        console.error('adminGetUserSubscriptions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateUserSubscription(req, res) {
    req.params.id = req.params.id || '';
    await adminAssignSubscription(req, res);
}
async function adminActivateUserSubscription(req, res) {
    try {
        const id = String(req.params.id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid subscription id' });
            return;
        }
        const record = await UserSubscription_1.default.findById(id);
        if (!record) {
            res.status(404).json({ message: 'Subscription not found' });
            return;
        }
        const plan = await SubscriptionPlan_1.default.findById(record.planId).lean();
        const planDto = plan ? planToDto(plan) : null;
        const startAtUTC = new Date();
        const durationDays = Math.max(1, safeNumber(planDto?.durationDays, 30));
        const expiresAtUTC = new Date(startAtUTC.getTime() + durationDays * 24 * 60 * 60 * 1000);
        record.status = 'active';
        record.startAtUTC = startAtUTC;
        record.expiresAtUTC = expiresAtUTC;
        record.activatedByAdminId = req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
            ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
            : record.activatedByAdminId;
        await record.save();
        await (0, subscriptionLifecycleService_1.syncUserSubscriptionCache)({
            userId: String(record.userId),
            plan: plan,
            status: 'active',
            startAtUTC,
            expiresAtUTC,
        });
        res.json({ message: 'Subscription activated', item: record });
    }
    catch (error) {
        console.error('adminActivateUserSubscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExpireUserSubscription(req, res) {
    try {
        const id = String(req.params.id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid subscription id' });
            return;
        }
        const record = await UserSubscription_1.default.findById(id);
        if (!record) {
            res.status(404).json({ message: 'Subscription not found' });
            return;
        }
        record.status = 'expired';
        record.expiresAtUTC = new Date();
        await record.save();
        const plan = await SubscriptionPlan_1.default.findById(record.planId).lean();
        await (0, subscriptionLifecycleService_1.syncUserSubscriptionCache)({
            userId: String(record.userId),
            plan: plan,
            status: 'expired',
            startAtUTC: record.startAtUTC,
            expiresAtUTC: record.expiresAtUTC,
        });
        res.json({ message: 'Subscription expired', item: record });
    }
    catch (error) {
        console.error('adminExpireUserSubscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminSuspendUserSubscriptionById(req, res) {
    try {
        const id = String(req.params.id || '');
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid subscription id' });
            return;
        }
        const record = await UserSubscription_1.default.findById(id);
        if (!record) {
            res.status(404).json({ message: 'Subscription not found' });
            return;
        }
        record.status = 'suspended';
        await record.save();
        const plan = await SubscriptionPlan_1.default.findById(record.planId).lean();
        await (0, subscriptionLifecycleService_1.syncUserSubscriptionCache)({
            userId: String(record.userId),
            plan: plan,
            status: 'suspended',
            startAtUTC: record.startAtUTC,
            expiresAtUTC: record.expiresAtUTC,
        });
        res.json({ message: 'Subscription suspended', item: record });
    }
    catch (error) {
        console.error('adminSuspendUserSubscriptionById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=subscriptionController.js.map