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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebsiteStaticPagesDefaults = createWebsiteStaticPagesDefaults;
exports.normalizeWebsiteStaticPages = normalizeWebsiteStaticPages;
const mongoose_1 = __importStar(require("mongoose"));
const DEFAULT_CANONICAL_LOGO = '/uploads/logo-1773555868748-118876447.webp';
const DEFAULT_CANONICAL_FAVICON = '/uploads/favicon-1773555868749-501330119.webp';
function asRecord(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
function asString(value, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
}
function asBoolean(value, fallback = true) {
    return typeof value === 'boolean' ? value : fallback;
}
function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => asString(item))
        .filter(Boolean);
}
function createWebsiteStaticPagesDefaults() {
    return {
        about: {
            eyebrow: 'About CampusWay',
            title: 'Empowering Students Across Bangladesh',
            subtitle: 'CampusWay helps students navigate admissions, exams, scholarships, and university decisions with one reliable platform.',
            lastUpdatedLabel: 'Updated regularly by the CampusWay admin team.',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                {
                    title: 'Our Mission',
                    body: 'We want every student to have equal access to clear, practical, and timely admission guidance so opportunity does not depend on guesswork.',
                    bullets: [
                        'Keep admission information easy to understand.',
                        'Reduce confusion during university and scholarship applications.',
                        'Give students one place for guidance, exams, and resources.',
                    ],
                    iconKey: 'target',
                    tone: 'info',
                    enabled: true,
                    order: 1,
                },
                {
                    title: 'Our Vision',
                    body: 'CampusWay aims to become the most trusted student platform for admission preparation and decision support in the region.',
                    bullets: [
                        'Connect students with verified university information.',
                        'Support better academic planning with practical tools.',
                        'Keep growth focused on clarity, trust, and student outcomes.',
                    ],
                    iconKey: 'globe',
                    tone: 'success',
                    enabled: true,
                    order: 2,
                },
                {
                    title: 'Built With Care',
                    body: 'The platform is shaped around real student problems: deadline pressure, scattered information, and the need for better preparation support.',
                    bullets: [
                        'Designed for quick scanning on mobile and desktop.',
                        'Built to connect guidance, exams, results, and communication.',
                    ],
                    iconKey: 'heart',
                    tone: 'accent',
                    enabled: true,
                    order: 3,
                },
            ],
            featureCards: [
                {
                    title: 'University Database',
                    description: 'Track institutions, categories, deadlines, and application details from one place.',
                    iconKey: 'graduation-cap',
                    enabled: true,
                    order: 1,
                },
                {
                    title: 'Practice Exams',
                    description: 'Prepare with guided tests, question banks, and exam performance insights.',
                    iconKey: 'book-open',
                    enabled: true,
                    order: 2,
                },
                {
                    title: 'Student Guidance',
                    description: 'Support students with practical workflows, alerts, and communication tools.',
                    iconKey: 'users',
                    enabled: true,
                    order: 3,
                },
                {
                    title: 'Scholarship Support',
                    description: 'Surface useful opportunities and simplify decision-making around next steps.',
                    iconKey: 'award',
                    enabled: true,
                    order: 4,
                },
            ],
            founderProfiles: [],
        },
        terms: {
            eyebrow: 'Legal',
            title: 'Terms & Conditions',
            subtitle: 'Please review these terms before using CampusWay services, exam tools, and student resources.',
            lastUpdatedLabel: 'Last updated: March 2026',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                {
                    title: 'Acceptance of Terms',
                    body: 'By using CampusWay, you agree to these terms and all applicable rules governing educational services and digital access.',
                    bullets: [
                        'If you do not agree with the terms, you should stop using the platform.',
                    ],
                    iconKey: 'shield',
                    tone: 'info',
                    enabled: true,
                    order: 1,
                },
                {
                    title: 'Use of Services',
                    body: 'CampusWay provides admission guidance, exam preparation tools, news, and student resources for lawful educational purposes.',
                    bullets: [
                        'Users are responsible for their account activity.',
                        'Automated scraping or abusive usage is prohibited.',
                        'Exam integrity rules apply wherever assessment tools are used.',
                    ],
                    iconKey: 'file-text',
                    tone: 'neutral',
                    enabled: true,
                    order: 2,
                },
                {
                    title: 'Content Accuracy',
                    body: 'We work to keep information current, but official university and institutional sources remain the final authority for deadlines, seats, and requirements.',
                    bullets: [
                        'Always verify critical admission details with the official source.',
                    ],
                    iconKey: 'alert-triangle',
                    tone: 'warning',
                    enabled: true,
                    order: 3,
                },
                {
                    title: 'Liability & Contact',
                    body: 'CampusWay is not liable for direct or indirect decisions based solely on platform information. Use the contact page for legal or account-related questions.',
                    bullets: [],
                    iconKey: 'mail',
                    tone: 'neutral',
                    enabled: true,
                    order: 4,
                },
            ],
        },
        privacy: {
            eyebrow: 'Legal',
            title: 'Privacy Policy',
            subtitle: 'This policy explains what information CampusWay collects, why it is used, and how it is protected.',
            lastUpdatedLabel: 'Last updated: March 2026',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                {
                    title: 'Information We Collect',
                    body: 'CampusWay may collect account, contact, exam, and device information needed to deliver the platform safely and effectively.',
                    bullets: [
                        'Account information such as name, email, and phone.',
                        'Usage information related to learning activity and support flows.',
                        'Device and browser data for compatibility and security.',
                    ],
                    iconKey: 'eye',
                    tone: 'info',
                    enabled: true,
                    order: 1,
                },
                {
                    title: 'How We Use Data',
                    body: 'We use data to deliver services, personalize learning support, improve the product, and keep the platform secure.',
                    bullets: [
                        'Support admissions, exams, and communication workflows.',
                        'Generate aggregated analytics and service insights.',
                        'Protect the platform from misuse and fraud.',
                    ],
                    iconKey: 'database',
                    tone: 'neutral',
                    enabled: true,
                    order: 2,
                },
                {
                    title: 'Security & Retention',
                    body: 'Reasonable technical and organizational controls are used to protect stored data and limit access based on role and need.',
                    bullets: [
                        'Authentication and role-based access controls are enforced.',
                        'Sensitive data should be accessed only by authorized personnel.',
                    ],
                    iconKey: 'lock',
                    tone: 'success',
                    enabled: true,
                    order: 3,
                },
                {
                    title: 'Your Rights',
                    body: 'Users can contact CampusWay to request corrections, discuss account privacy concerns, or ask questions about communication preferences.',
                    bullets: [
                        'You may request correction of inaccurate personal information.',
                        'You may ask questions about stored communication data.',
                    ],
                    iconKey: 'shield',
                    tone: 'accent',
                    enabled: true,
                    order: 4,
                },
            ],
        },
    };
}
function normalizeStaticPageSection(value, fallback) {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        body: asString(source.body, fallback.body),
        bullets: source.bullets !== undefined ? asStringArray(source.bullets) : fallback.bullets,
        iconKey: asString(source.iconKey, fallback.iconKey),
        tone: asString(source.tone, fallback.tone) || fallback.tone,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}
function normalizeStaticFeatureCard(value, fallback) {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        description: asString(source.description, fallback.description),
        iconKey: asString(source.iconKey, fallback.iconKey),
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}
function normalizeFounderContactLink(value) {
    const source = asRecord(value);
    const label = asString(source.label);
    const url = asString(source.url);
    if (!label && !url)
        return null;
    return {
        label: label || 'Link',
        url,
    };
}
function normalizeFounderProfile(value, fallback) {
    const source = asRecord(value);
    const normalizedLinks = Array.isArray(source.contactLinks)
        ? source.contactLinks
            .map((item) => normalizeFounderContactLink(item))
            .filter((item) => Boolean(item))
        : fallback.contactLinks;
    return {
        name: asString(source.name, fallback.name),
        title: asString(source.title, fallback.title),
        photoUrl: asString(source.photoUrl, fallback.photoUrl),
        shortBio: asString(source.shortBio, fallback.shortBio),
        contactLinks: normalizedLinks,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}
function normalizeStaticPage(value, fallback) {
    const source = asRecord(value);
    const fallbackSections = Array.isArray(fallback.sections) ? fallback.sections : [];
    const sourceSections = Array.isArray(source.sections) ? source.sections : undefined;
    const sections = sourceSections
        ? sourceSections.map((item, index) => normalizeStaticPageSection(item, fallbackSections[index] || fallbackSections[fallbackSections.length - 1] || {
            title: '',
            body: '',
            bullets: [],
            iconKey: 'info',
            tone: 'neutral',
            enabled: true,
            order: index + 1,
        }))
        : fallbackSections;
    return {
        eyebrow: asString(source.eyebrow, fallback.eyebrow),
        title: asString(source.title, fallback.title),
        subtitle: asString(source.subtitle, fallback.subtitle),
        lastUpdatedLabel: asString(source.lastUpdatedLabel, fallback.lastUpdatedLabel),
        sections,
        backLinkLabel: asString(source.backLinkLabel, fallback.backLinkLabel),
        backLinkUrl: asString(source.backLinkUrl, fallback.backLinkUrl),
    };
}
function normalizeAboutStaticPage(value, fallback) {
    const source = asRecord(value);
    const normalizedBase = normalizeStaticPage(source, fallback);
    const fallbackFeatureCards = Array.isArray(fallback.featureCards) ? fallback.featureCards : [];
    const featureCards = Array.isArray(source.featureCards)
        ? source.featureCards.map((item, index) => normalizeStaticFeatureCard(item, fallbackFeatureCards[index] || fallbackFeatureCards[fallbackFeatureCards.length - 1] || {
            title: '',
            description: '',
            iconKey: 'info',
            enabled: true,
            order: index + 1,
        }))
        : fallbackFeatureCards;
    const fallbackFounderProfiles = Array.isArray(fallback.founderProfiles) ? fallback.founderProfiles : [];
    const founderProfiles = Array.isArray(source.founderProfiles)
        ? source.founderProfiles.map((item, index) => normalizeFounderProfile(item, fallbackFounderProfiles[index] || {
            name: '',
            title: '',
            photoUrl: '',
            shortBio: '',
            contactLinks: [],
            enabled: true,
            order: index + 1,
        }))
        : fallbackFounderProfiles;
    return {
        ...normalizedBase,
        featureCards,
        founderProfiles,
    };
}
function normalizeWebsiteStaticPages(value, current) {
    const defaults = createWebsiteStaticPagesDefaults();
    const currentValue = asRecord(current);
    const source = asRecord(value);
    const currentAbout = normalizeAboutStaticPage(currentValue.about, defaults.about);
    const currentTerms = normalizeStaticPage(currentValue.terms, defaults.terms);
    const currentPrivacy = normalizeStaticPage(currentValue.privacy, defaults.privacy);
    return {
        about: normalizeAboutStaticPage(source.about, currentAbout),
        terms: normalizeStaticPage(source.terms, currentTerms),
        privacy: normalizeStaticPage(source.privacy, currentPrivacy),
    };
}
const WebsiteSettingsSchema = new mongoose_1.Schema({
    websiteName: { type: String, default: 'CampusWay' },
    logo: { type: String, default: DEFAULT_CANONICAL_LOGO },
    favicon: { type: String, default: DEFAULT_CANONICAL_FAVICON },
    motto: { type: String, default: 'Your Admission Gateway' },
    metaTitle: { type: String, default: 'CampusWay - Admission Gateway' },
    metaDescription: { type: String, default: 'Prepare for university admissions with CampusWay.' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    socialLinks: {
        facebook: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        messenger: { type: String, default: '' },
        telegram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
        instagram: { type: String, default: '' },
    },
    theme: {
        modeDefault: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        allowSystemMode: { type: Boolean, default: true },
        switchVariant: { type: String, enum: ['default', 'pro'], default: 'pro' },
        animationLevel: { type: String, enum: ['none', 'subtle', 'rich'], default: 'subtle' },
        brandGradients: {
            type: [String],
            default: [
                'linear-gradient(135deg,#0D5FDB 0%,#0EA5E9 55%,#22D3EE 100%)',
                'linear-gradient(135deg,#0891B2 0%,#2563EB 100%)',
            ],
        },
    },
    socialUi: {
        clusterEnabled: { type: Boolean, default: true },
        buttonVariant: { type: String, enum: ['default', 'squircle'], default: 'squircle' },
        showLabels: { type: Boolean, default: false },
        platformOrder: {
            type: [String],
            default: ['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'],
        },
    },
    pricingUi: {
        currencyCode: { type: String, default: 'BDT' },
        currencySymbol: { type: String, default: '\\u09F3' },
        currencyLocale: { type: String, default: 'bn-BD' },
        displayMode: { type: String, enum: ['symbol', 'code'], default: 'symbol' },
        thousandSeparator: { type: Boolean, default: true },
    },
    subscriptionPageTitle: { type: String, default: 'Subscription Plans' },
    subscriptionPageSubtitle: { type: String, default: 'Choose free or paid plans to unlock premium exam access.' },
    subscriptionDefaultBannerUrl: { type: String, default: '' },
    subscriptionLoggedOutCtaMode: { type: String, enum: ['login', 'contact'], default: 'contact' },
    staticPages: { type: mongoose_1.Schema.Types.Mixed, default: createWebsiteStaticPagesDefaults },
}, { timestamps: true });
exports.default = mongoose_1.default.model('WebsiteSettings', WebsiteSettingsSchema);
//# sourceMappingURL=WebsiteSettings.js.map