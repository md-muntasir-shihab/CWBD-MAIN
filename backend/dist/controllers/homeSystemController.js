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
exports.updateStats = exports.getStats = exports.updateAnnouncement = exports.updatePromotionalBanner = exports.updateHero = exports.updateHome = exports.updateSettings = exports.getSettings = exports.getHomeStream = exports.getAggregatedHomeData = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const WebsiteSettings_1 = __importStar(require("../models/WebsiteSettings"));
const HomePage_1 = __importDefault(require("../models/HomePage"));
const User_1 = __importDefault(require("../models/User"));
const Exam_1 = __importDefault(require("../models/Exam"));
const University_1 = __importDefault(require("../models/University"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const Settings_1 = __importDefault(require("../models/Settings"));
const homeStream_1 = require("../realtime/homeStream");
const homeAggregateController_1 = require("./homeAggregateController");
const DEFAULT_SOCIAL_LINKS = {
    facebook: '',
    whatsapp: '',
    messenger: '',
    telegram: '',
    twitter: '',
    youtube: '',
    instagram: '',
};
const DEFAULT_THEME_SETTINGS = {
    modeDefault: 'system',
    allowSystemMode: true,
    switchVariant: 'pro',
    animationLevel: 'subtle',
    brandGradients: [
        'linear-gradient(135deg,#0D5FDB 0%,#0EA5E9 55%,#22D3EE 100%)',
        'linear-gradient(135deg,#0891B2 0%,#2563EB 100%)',
    ],
};
const DEFAULT_SOCIAL_UI = {
    clusterEnabled: true,
    buttonVariant: 'squircle',
    showLabels: false,
    platformOrder: ['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'],
};
const DEFAULT_PRICING_UI = {
    currencyCode: 'BDT',
    currencySymbol: '\\u09F3',
    currencyLocale: 'bn-BD',
    displayMode: 'symbol',
    thousandSeparator: true,
};
const CANONICAL_BRAND_ASSETS = {
    logo: '/uploads/logo-1773555868748-118876447.webp',
    favicon: '/uploads/favicon-1773555868749-501330119.webp',
};
const LEGACY_BRAND_PATHS = new Set(['', '/logo.png', '/favicon.ico']);
const BRAND_UPLOAD_PATTERN = /^(logo|favicon|icon)[-_].+/i;
function getCanonicalBrandValue(currentValue, fallbackValue) {
    const normalized = String(currentValue || '').trim();
    return LEGACY_BRAND_PATHS.has(normalized) ? fallbackValue : normalized;
}
function getLocalUploadAsset(value) {
    const normalized = String(value || '').trim();
    return normalized.startsWith('/uploads/') ? normalized : null;
}
async function cleanupBrandLikeUploads(activeAssets) {
    const uploadDir = path_1.default.resolve(__dirname, '../../public/uploads');
    const activeFileNames = new Set(activeAssets
        .map((asset) => getLocalUploadAsset(asset))
        .filter((asset) => Boolean(asset))
        .map((asset) => path_1.default.basename(asset)));
    try {
        const files = await fs_1.promises.readdir(uploadDir);
        const deletions = files
            .filter((fileName) => BRAND_UPLOAD_PATTERN.test(fileName) && !activeFileNames.has(fileName))
            .map(async (fileName) => {
            try {
                await fs_1.promises.unlink(path_1.default.join(uploadDir, fileName));
            }
            catch {
                // Ignore individual cleanup failures so settings save does not fail.
            }
        });
        await Promise.all(deletions);
    }
    catch {
        // Ignore cleanup failures; settings persistence remains the primary concern.
    }
}
// Helper to ensure configs exist
const ensureConfigs = async () => {
    let settings = await WebsiteSettings_1.default.findOne();
    if (!settings)
        settings = await WebsiteSettings_1.default.create({
            logo: CANONICAL_BRAND_ASSETS.logo,
            favicon: CANONICAL_BRAND_ASSETS.favicon,
        });
    let settingsUpdated = false;
    const nextLogo = getCanonicalBrandValue(settings.logo, CANONICAL_BRAND_ASSETS.logo);
    const nextFavicon = getCanonicalBrandValue(settings.favicon, CANONICAL_BRAND_ASSETS.favicon);
    if (settings.logo !== nextLogo) {
        settings.logo = nextLogo;
        settingsUpdated = true;
    }
    if (settings.favicon !== nextFavicon) {
        settings.favicon = nextFavicon;
        settingsUpdated = true;
    }
    const nextStaticPages = (0, WebsiteSettings_1.normalizeWebsiteStaticPages)(settings.staticPages);
    if (JSON.stringify(settings.staticPages || null) !== JSON.stringify(nextStaticPages)) {
        settings.staticPages = nextStaticPages;
        settingsUpdated = true;
    }
    if (settingsUpdated)
        await settings.save();
    let home = await HomePage_1.default.findOne();
    if (!home)
        home = await HomePage_1.default.create({});
    return { settings, home };
};
function parseSeatValue(value) {
    if (value === null || value === undefined)
        return 0;
    const text = String(value).replace(/[^\d]/g, '');
    const num = Number(text);
    return Number.isFinite(num) ? num : 0;
}
function countUpcomingDateStrings(values, windowDays) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + windowDays);
    return values.reduce((count, value) => {
        if (!value)
            return count;
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime()))
            return count;
        return (date >= start && date <= end) ? count + 1 : count;
    }, 0);
}
function toTime(value) {
    if (!value)
        return 0;
    const time = new Date(String(value)).getTime();
    return Number.isFinite(time) ? time : 0;
}
const getAggregatedHomeData = async (req, res) => {
    await (0, homeAggregateController_1.getAggregatedHomeData)(req, res);
};
exports.getAggregatedHomeData = getAggregatedHomeData;
const getHomeStream = async (_req, res) => {
    (0, homeStream_1.addHomeStreamClient)(res);
};
exports.getHomeStream = getHomeStream;
const getSettings = async (req, res) => {
    try {
        const { settings } = await ensureConfigs();
        const siteSettings = await Settings_1.default.findOne().lean();
        const socialLinksList = Array.isArray(siteSettings?.socialLinks)
            ? siteSettings.socialLinks
                .filter((item) => item?.enabled !== false && item?.url)
                .map((item) => ({
                id: String(item?._id || ''),
                platformName: String(item?.platform || ''),
                targetUrl: String(item?.url || ''),
                iconUploadOrUrl: String(item?.icon || ''),
                description: String(item?.description || ''),
                enabled: item?.enabled !== false,
                placements: Array.isArray(item?.placements) ? item.placements : ['header', 'footer', 'home', 'news', 'contact'],
            }))
            : [];
        const socialLinksFromList = socialLinksList.reduce((acc, item) => {
            const key = String(item.platformName || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
            if (!key || !item.targetUrl)
                return acc;
            if (['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'].includes(key)) {
                acc[key] = item.targetUrl;
            }
            else if (key === 'x') {
                acc.twitter = item.targetUrl;
            }
            return acc;
        }, {});
        const base = settings.toObject();
        res.json({
            ...base,
            siteName: String(base.websiteName || ''),
            logoUrl: String(base.logo || ''),
            staticPages: (0, WebsiteSettings_1.normalizeWebsiteStaticPages)(base.staticPages),
            socialLinks: {
                ...DEFAULT_SOCIAL_LINKS,
                ...(base.socialLinks || {}),
                ...socialLinksFromList,
            },
            socialLinksList,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const payload = { ...req.body };
        const files = req.files;
        console.log('Update Settings Body:', req.body);
        console.log('Update Settings Files:', files);
        if (files?.logo?.[0])
            payload.logo = `/uploads/${files.logo[0].filename}`;
        if (files?.favicon?.[0])
            payload.favicon = `/uploads/${files.favicon[0].filename}`;
        const current = await WebsiteSettings_1.default.findOne();
        if (!files?.logo?.[0] && LEGACY_BRAND_PATHS.has(String(current?.logo || '').trim())) {
            payload.logo = CANONICAL_BRAND_ASSETS.logo;
        }
        if (!files?.favicon?.[0] && LEGACY_BRAND_PATHS.has(String(current?.favicon || '').trim())) {
            payload.favicon = CANONICAL_BRAND_ASSETS.favicon;
        }
        // Handle JSON-like payload fields coming through multipart/form-data.
        const parseIfStringifiedObject = (rawValue) => {
            if (typeof rawValue !== 'string')
                return rawValue;
            if (!rawValue.trim() || rawValue === '[object Object]')
                return undefined;
            try {
                return JSON.parse(rawValue);
            }
            catch {
                return undefined;
            }
        };
        const parsedSocial = parseIfStringifiedObject(payload.socialLinks);
        if (parsedSocial && typeof parsedSocial === 'object') {
            payload.socialLinks = { ...DEFAULT_SOCIAL_LINKS, ...(current?.socialLinks || {}), ...parsedSocial };
        }
        else if (payload.socialLinks !== undefined) {
            payload.socialLinks = { ...DEFAULT_SOCIAL_LINKS, ...(current?.socialLinks || {}) };
        }
        const parsedTheme = parseIfStringifiedObject(payload.theme);
        if (parsedTheme && typeof parsedTheme === 'object') {
            payload.theme = { ...DEFAULT_THEME_SETTINGS, ...(current?.theme || {}), ...parsedTheme };
        }
        else if (payload.theme !== undefined) {
            payload.theme = { ...DEFAULT_THEME_SETTINGS, ...(current?.theme || {}) };
        }
        const parsedSocialUi = parseIfStringifiedObject(payload.socialUi);
        if (parsedSocialUi && typeof parsedSocialUi === 'object') {
            payload.socialUi = { ...DEFAULT_SOCIAL_UI, ...(current?.socialUi || {}), ...parsedSocialUi };
        }
        else if (payload.socialUi !== undefined) {
            payload.socialUi = { ...DEFAULT_SOCIAL_UI, ...(current?.socialUi || {}) };
        }
        const parsedPricingUi = parseIfStringifiedObject(payload.pricingUi);
        if (parsedPricingUi && typeof parsedPricingUi === 'object') {
            payload.pricingUi = { ...DEFAULT_PRICING_UI, ...(current?.pricingUi || {}), ...parsedPricingUi };
        }
        else if (payload.pricingUi !== undefined) {
            payload.pricingUi = { ...DEFAULT_PRICING_UI, ...(current?.pricingUi || {}) };
        }
        const parsedStaticPages = parseIfStringifiedObject(payload.staticPages);
        if (parsedStaticPages && typeof parsedStaticPages === 'object') {
            payload.staticPages = (0, WebsiteSettings_1.normalizeWebsiteStaticPages)(parsedStaticPages, current?.staticPages);
        }
        else if (payload.staticPages !== undefined) {
            payload.staticPages = (0, WebsiteSettings_1.normalizeWebsiteStaticPages)(current?.staticPages);
        }
        // Use findOneAndUpdate to ensure we update the single settings document
        const settings = await WebsiteSettings_1.default.findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true, runValidators: true });
        if (settings) {
            const nextLogo = getCanonicalBrandValue(settings.logo, CANONICAL_BRAND_ASSETS.logo);
            const nextFavicon = getCanonicalBrandValue(settings.favicon, CANONICAL_BRAND_ASSETS.favicon);
            if (settings.logo !== nextLogo || settings.favicon !== nextFavicon) {
                settings.logo = nextLogo;
                settings.favicon = nextFavicon;
                await settings.save();
            }
            await cleanupBrandLikeUploads([settings.logo, settings.favicon]);
        }
        console.log('Settings updated in DB:', settings);
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'website-settings' } });
        res.json({ message: 'Settings updated successfully', settings });
    }
    catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.updateSettings = updateSettings;
const updateHome = async (req, res) => {
    try {
        const payload = req.body;
        let home = await HomePage_1.default.findOne();
        if (!home)
            home = new HomePage_1.default();
        Object.assign(home, payload);
        await home.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'home' } });
        res.json({ message: 'Home page updated successfully', home });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updateHome = updateHome;
const updateHero = async (req, res) => {
    try {
        const payload = req.body;
        const file = req.file;
        if (file)
            payload.backgroundImage = `/uploads/${file.filename}`;
        let home = await HomePage_1.default.findOne();
        if (!home)
            home = new HomePage_1.default();
        home.heroSection = { ...home.heroSection, ...payload };
        // ensure overlay is boolean
        if (payload.overlay !== undefined) {
            home.heroSection.overlay = payload.overlay === 'true' || payload.overlay === true;
        }
        await home.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'hero' } });
        res.json({ message: 'Hero section updated', heroSection: home.heroSection });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updateHero = updateHero;
const updatePromotionalBanner = async (req, res) => {
    try {
        const payload = req.body;
        const file = req.file;
        if (file)
            payload.image = `/uploads/${file.filename}`;
        let home = await HomePage_1.default.findOne();
        if (!home)
            home = new HomePage_1.default();
        home.promotionalBanner = { ...home.promotionalBanner, ...payload };
        if (payload.enabled !== undefined) {
            home.promotionalBanner.enabled = payload.enabled === 'true' || payload.enabled === true;
        }
        await home.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'banner-updated', meta: { section: 'promotionalBanner' } });
        res.json({ message: 'Banner updated', promotionalBanner: home.promotionalBanner });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updatePromotionalBanner = updatePromotionalBanner;
const updateAnnouncement = async (req, res) => {
    try {
        const payload = req.body;
        let home = await HomePage_1.default.findOne();
        if (!home)
            home = new HomePage_1.default();
        home.announcementBar = { ...home.announcementBar, ...payload };
        if (payload.enabled !== undefined) {
            home.announcementBar.enabled = payload.enabled === 'true' || payload.enabled === true;
        }
        await home.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'announcement' } });
        res.json({ message: 'Announcement updated', announcementBar: home.announcementBar });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updateAnnouncement = updateAnnouncement;
const getStats = async (req, res) => {
    try {
        const totalStudents = await User_1.default.countDocuments({ role: 'student' });
        const totalExams = await Exam_1.default.countDocuments();
        const totalUniversities = await University_1.default.countDocuments();
        const totalResults = await ExamResult_1.default.countDocuments();
        res.json({ totalStudents, totalExams, totalUniversities, totalResults });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getStats = getStats;
const updateStats = async (req, res) => {
    try {
        const payload = req.body;
        let home = await HomePage_1.default.findOne();
        if (!home)
            home = new HomePage_1.default();
        home.statistics = { ...home.statistics, ...payload };
        await home.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'statistics' } });
        res.json({ message: 'Stats updated', statistics: home.statistics });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updateStats = updateStats;
//# sourceMappingURL=homeSystemController.js.map