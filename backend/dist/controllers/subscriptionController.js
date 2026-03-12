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
function planToDto(plan) {
    const priceBDT = Math.max(0, safeNumber(plan.priceBDT, safeNumber(plan.price, 0)));
    const durationDays = Math.max(1, safeNumber(plan.durationDays, 30));
    const displayOrder = safeNumber(plan.displayOrder, safeNumber(plan.sortOrder, safeNumber(plan.priority, 100)));
    const enabled = plan.enabled !== undefined ? toBoolean(plan.enabled, true) : toBoolean(plan.isActive, true);
    const features = Array.isArray(plan.features) ? plan.features.map((item) => safeString(item)).filter(Boolean) : [];
    const includedModules = Array.isArray(plan.includedModules)
        ? plan.includedModules.map((item) => safeString(item)).filter(Boolean)
        : [];
    const mergedFeatures = Array.from(new Set([...features, ...includedModules]));
    const planTypeRaw = safeString(plan.type).toLowerCase();
    const type = (planTypeRaw === 'free' || planTypeRaw === 'paid')
        ? planTypeRaw
        : (priceBDT <= 0 ? 'free' : 'paid');
    return {
        id: String(plan._id || ''),
        _id: String(plan._id || ''),
        code: safeString(plan.code),
        name: safeString(plan.name, 'Subscription Plan'),
        type,
        priceBDT: type === 'free' ? 0 : priceBDT,
        price: type === 'free' ? 0 : priceBDT,
        durationDays,
        durationValue: safeNumber(plan.durationValue, durationDays),
        durationUnit: safeString(plan.durationUnit, 'days') === 'months' ? 'months' : 'days',
        bannerImageUrl: safeString(plan.bannerImageUrl) || null,
        shortDescription: safeString(plan.shortDescription || plan.description),
        description: safeString(plan.description || plan.shortDescription),
        features: mergedFeatures,
        includedModules,
        tags: Array.isArray(plan.tags) ? plan.tags.map((item) => safeString(item)).filter(Boolean) : [],
        enabled,
        isActive: enabled,
        isFeatured: toBoolean(plan.isFeatured, false),
        displayOrder,
        sortOrder: displayOrder,
        priority: safeNumber(plan.priority, displayOrder || 100),
        contactCtaLabel: safeString(plan.contactCtaLabel, 'Contact to Subscribe'),
        contactCtaUrl: safeString(plan.contactCtaUrl, '/contact'),
        createdAt: plan.createdAt || null,
        updatedAt: plan.updatedAt || null,
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
async function syncUserSubscriptionCache(payload) {
    const plan = payload.plan;
    const startAtUTC = payload.startAtUTC || new Date();
    const expiresAtUTC = payload.expiresAtUTC || null;
    const active = payload.status === 'active' && !!expiresAtUTC && new Date(expiresAtUTC).getTime() > Date.now();
    await User_1.default.findByIdAndUpdate(payload.userId, {
        $set: {
            subscription: {
                plan: plan ? String(plan.code || '') : '',
                planCode: plan ? String(plan.code || '') : '',
                planName: plan ? String(plan.name || '') : '',
                isActive: active,
                startDate: startAtUTC,
                expiryDate: expiresAtUTC,
                assignedBy: null,
                assignedAt: new Date(),
            },
        },
    });
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
            SubscriptionPlan_1.default.find({ $or: [{ enabled: true }, { isActive: true }] })
                .sort({ displayOrder: 1, sortOrder: 1, priority: 1, code: 1 })
                .lean(),
            WebsiteSettings_1.default.findOne().lean(),
            ensureSubscriptionSettings(),
        ]);
        const items = plans.map((plan) => planToDto(plan));
        const settings = {
            pageTitle: safeString(subscriptionSettings?.pageTitle || websiteSettings?.subscriptionPageTitle, 'Subscription Plans'),
            pageSubtitle: safeString(subscriptionSettings?.pageSubtitle || websiteSettings?.subscriptionPageSubtitle, 'Choose free or paid plans to unlock premium exam access.'),
            headerBannerUrl: safeString(subscriptionSettings?.headerBannerUrl) || null,
            defaultPlanBannerUrl: safeString(subscriptionSettings?.defaultPlanBannerUrl || websiteSettings?.subscriptionDefaultBannerUrl) || null,
            currencyLabel: safeString(subscriptionSettings?.currencyLabel || websiteSettings?.pricingUi?.currencyCode, 'BDT'),
            showFeaturedFirst: subscriptionSettings?.showFeaturedFirst !== false,
        };
        const featuredFirstItems = settings.showFeaturedFirst
            ? [...items].sort((a, b) => {
                if (Boolean(a.isFeatured) !== Boolean(b.isFeatured))
                    return a.isFeatured ? -1 : 1;
                return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
            })
            : items;
        res.json({ items: featuredFirstItems, settings });
    }
    catch (error) {
        console.error('getPublicSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getPublicSubscriptionPlanById(req, res) {
    try {
        const id = safeString(req.params?.id);
        const query = mongoose_1.default.Types.ObjectId.isValid(id) ? { _id: id } : { code: String(id).trim().toLowerCase() };
        const plan = await SubscriptionPlan_1.default.findOne(query).lean();
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
                planName: hasAnyPlanName ? String(cache.planName || cache.plan || '') : undefined,
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
            planName: plan?.name || undefined,
            expiresAtUTC: expiresAtUTC ? expiresAtUTC.toISOString() : null,
            daysLeft,
        });
    }
    catch (error) {
        console.error('getMySubscription error:', error);
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
        const plan = await SubscriptionPlan_1.default.findById(planId).lean();
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
        const payment = await ManualPayment_1.default.create({
            studentId: new mongoose_1.default.Types.ObjectId(userId),
            subscriptionPlanId: new mongoose_1.default.Types.ObjectId(planId),
            amount,
            currency: 'BDT',
            method,
            status: planDto.type === 'free' ? 'paid' : 'pending',
            date: new Date(),
            paidAt: planDto.type === 'free' ? new Date() : null,
            transactionId,
            reference: transactionId,
            proofUrl,
            proofFileUrl: proofUrl,
            notes,
            entryType: 'subscription',
            recordedBy: new mongoose_1.default.Types.ObjectId(userId),
        });
        const now = new Date();
        const expiresAtUTC = new Date(now.getTime() + Math.max(1, planDto.durationDays) * 24 * 60 * 60 * 1000);
        const status = planDto.type === 'free' ? 'active' : 'pending';
        const subscription = await UserSubscription_1.default.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            planId: new mongoose_1.default.Types.ObjectId(planId),
            status,
            startAtUTC: now,
            expiresAtUTC,
            paymentId: payment._id,
            notes: notes || `Plan request created via public API (${status})`,
        });
        await syncUserSubscriptionCache({
            userId,
            plan,
            status,
            startAtUTC: now,
            expiresAtUTC,
        });
        res.status(201).json({
            message: status === 'active' ? 'Free plan activated' : 'Payment request submitted',
            payment,
            subscription,
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
        const proofUrl = safeString(req.body?.proofUrl || req.body?.proofFileUrl);
        const transactionId = safeString(req.body?.transactionId);
        const methodRaw = safeString(req.body?.method).toLowerCase();
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
            .sort({ displayOrder: 1, sortOrder: 1, priority: 1, code: 1 })
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
        const query = mongoose_1.default.Types.ObjectId.isValid(id) ? { _id: id } : { code: id.toLowerCase() };
        const item = await SubscriptionPlan_1.default.findOne(query).lean();
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
        const name = safeString(body.name);
        if (!name) {
            res.status(400).json({ message: 'name is required' });
            return;
        }
        const code = safeString(body.code || name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (!code) {
            res.status(400).json({ message: 'code is required' });
            return;
        }
        const exists = await SubscriptionPlan_1.default.exists({ code });
        if (exists) {
            res.status(400).json({ message: 'Plan code already exists' });
            return;
        }
        const type = safeString(body.type, safeNumber(body.priceBDT || body.price, 0) <= 0 ? 'free' : 'paid') === 'free' ? 'free' : 'paid';
        const priceBDT = type === 'free' ? 0 : Math.max(0, safeNumber(body.priceBDT, safeNumber(body.price, 0)));
        const durationDays = Math.max(1, safeNumber(body.durationDays, 30));
        const displayOrder = safeNumber(body.displayOrder, safeNumber(body.sortOrder, safeNumber(body.priority, 100)));
        const bannerImageUrl = safeString(body.bannerImageUrl);
        const contactCtaUrl = safeString(body.contactCtaUrl, '/contact');
        if (safeNumber(body.priceBDT, safeNumber(body.price, 0)) < 0) {
            res.status(400).json({ message: 'priceBDT cannot be negative' });
            return;
        }
        if (safeNumber(body.durationDays, 30) <= 0) {
            res.status(400).json({ message: 'durationDays must be greater than 0' });
            return;
        }
        if (!isValidRelativeOrAbsoluteUrl(bannerImageUrl)) {
            res.status(400).json({ message: 'bannerImageUrl must be a valid URL or relative path' });
            return;
        }
        if (!isValidRelativeOrAbsoluteUrl(contactCtaUrl)) {
            res.status(400).json({ message: 'contactCtaUrl must be a valid URL or relative path' });
            return;
        }
        const created = await SubscriptionPlan_1.default.create({
            code,
            name,
            type,
            priceBDT,
            price: priceBDT,
            durationDays,
            durationValue: safeNumber(body.durationValue, durationDays),
            durationUnit: safeString(body.durationUnit, 'days') === 'months' ? 'months' : 'days',
            bannerImageUrl: bannerImageUrl || null,
            shortDescription: safeString(body.shortDescription || body.description),
            description: safeString(body.description || body.shortDescription),
            features: Array.isArray(body.features) ? body.features.map((item) => safeString(item)).filter(Boolean) : [],
            tags: Array.isArray(body.tags) ? body.tags.map((item) => safeString(item)).filter(Boolean) : [],
            includedModules: Array.isArray(body.includedModules) ? body.includedModules.map((item) => safeString(item)).filter(Boolean) : [],
            enabled: toBoolean(body.enabled, toBoolean(body.isActive, true)),
            isActive: toBoolean(body.enabled, toBoolean(body.isActive, true)),
            isFeatured: toBoolean(body.isFeatured, false),
            displayOrder,
            sortOrder: displayOrder,
            priority: safeNumber(body.priority, displayOrder || 100),
            contactCtaLabel: safeString(body.contactCtaLabel, 'Contact to Subscribe'),
            contactCtaUrl,
        });
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
        const update = {};
        if (body.name !== undefined)
            update.name = safeString(body.name);
        if (body.code !== undefined) {
            const nextCode = safeString(body.code)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            if (!nextCode) {
                res.status(400).json({ message: 'Invalid code' });
                return;
            }
            const dup = await SubscriptionPlan_1.default.exists({ code: nextCode, _id: { $ne: id } });
            if (dup) {
                res.status(400).json({ message: 'Plan code already exists' });
                return;
            }
            update.code = nextCode;
        }
        if (body.type !== undefined)
            update.type = safeString(body.type) === 'free' ? 'free' : 'paid';
        if (body.priceBDT !== undefined || body.price !== undefined) {
            const priceBDT = Math.max(0, safeNumber(body.priceBDT, safeNumber(body.price, 0)));
            update.priceBDT = priceBDT;
            update.price = priceBDT;
        }
        if (body.durationDays !== undefined)
            update.durationDays = Math.max(1, safeNumber(body.durationDays, 30));
        if (body.durationValue !== undefined)
            update.durationValue = Math.max(1, safeNumber(body.durationValue, 30));
        if (body.durationUnit !== undefined)
            update.durationUnit = safeString(body.durationUnit, 'days') === 'months' ? 'months' : 'days';
        if (body.bannerImageUrl !== undefined)
            update.bannerImageUrl = safeString(body.bannerImageUrl) || null;
        if (body.shortDescription !== undefined || body.description !== undefined) {
            update.shortDescription = safeString(body.shortDescription || body.description);
            update.description = safeString(body.description || body.shortDescription);
        }
        if (body.features !== undefined && Array.isArray(body.features)) {
            update.features = body.features.map((item) => safeString(item)).filter(Boolean);
        }
        if (body.tags !== undefined && Array.isArray(body.tags)) {
            update.tags = body.tags.map((item) => safeString(item)).filter(Boolean);
        }
        if (body.includedModules !== undefined && Array.isArray(body.includedModules)) {
            update.includedModules = body.includedModules.map((item) => safeString(item)).filter(Boolean);
        }
        if (body.enabled !== undefined || body.isActive !== undefined) {
            const enabled = toBoolean(body.enabled, toBoolean(body.isActive, true));
            update.enabled = enabled;
            update.isActive = enabled;
        }
        if (body.isFeatured !== undefined)
            update.isFeatured = toBoolean(body.isFeatured, false);
        if (body.displayOrder !== undefined || body.sortOrder !== undefined || body.priority !== undefined) {
            const displayOrder = safeNumber(body.displayOrder, safeNumber(body.sortOrder, safeNumber(body.priority, 100)));
            update.displayOrder = displayOrder;
            update.sortOrder = displayOrder;
            update.priority = safeNumber(body.priority, displayOrder || 100);
        }
        if (body.contactCtaLabel !== undefined)
            update.contactCtaLabel = safeString(body.contactCtaLabel, 'Contact to Subscribe');
        if (body.contactCtaUrl !== undefined)
            update.contactCtaUrl = safeString(body.contactCtaUrl, '/contact');
        if ((body.priceBDT !== undefined || body.price !== undefined) && safeNumber(body.priceBDT, safeNumber(body.price, 0)) < 0) {
            res.status(400).json({ message: 'priceBDT cannot be negative' });
            return;
        }
        if (body.durationDays !== undefined && safeNumber(body.durationDays, 0) <= 0) {
            res.status(400).json({ message: 'durationDays must be greater than 0' });
            return;
        }
        if (body.bannerImageUrl !== undefined && !isValidRelativeOrAbsoluteUrl(body.bannerImageUrl)) {
            res.status(400).json({ message: 'bannerImageUrl must be a valid URL or relative path' });
            return;
        }
        if (body.contactCtaUrl !== undefined && !isValidRelativeOrAbsoluteUrl(body.contactCtaUrl)) {
            res.status(400).json({ message: 'contactCtaUrl must be a valid URL or relative path' });
            return;
        }
        const updated = await SubscriptionPlan_1.default.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
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
        const deleted = await SubscriptionPlan_1.default.findByIdAndDelete(id).lean();
        if (!deleted) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        res.json({ message: 'Subscription plan deleted' });
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
        plan.isActive = enabled;
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
            .map((id, index) => {
            const text = String(id || '').trim();
            if (!mongoose_1.default.Types.ObjectId.isValid(text))
                return null;
            const nextOrder = index + 1;
            return SubscriptionPlan_1.default.updateOne({ _id: text }, {
                $set: {
                    displayOrder: nextOrder,
                    sortOrder: nextOrder,
                    priority: nextOrder,
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
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || !mongoose_1.default.Types.ObjectId.isValid(planId)) {
            res.status(400).json({ message: 'userId and planId are required' });
            return;
        }
        const [user, plan] = await Promise.all([
            User_1.default.findById(userId),
            SubscriptionPlan_1.default.findById(planId).lean(),
        ]);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (!plan) {
            res.status(404).json({ message: 'Plan not found' });
            return;
        }
        const planDto = planToDto(plan);
        const startAtUTC = req.body?.startAtUTC ? new Date(String(req.body.startAtUTC)) : new Date();
        const expiresAtUTC = req.body?.expiresAtUTC
            ? new Date(String(req.body.expiresAtUTC))
            : new Date(startAtUTC.getTime() + Math.max(1, planDto.durationDays) * 24 * 60 * 60 * 1000);
        if (Number.isNaN(startAtUTC.getTime()) || Number.isNaN(expiresAtUTC.getTime())) {
            res.status(400).json({ message: 'Invalid date values' });
            return;
        }
        const statusRaw = safeString(req.body?.status, 'active').toLowerCase();
        const status = ['active', 'expired', 'pending', 'suspended'].includes(statusRaw)
            ? statusRaw
            : 'active';
        const notes = safeString(req.body?.notes);
        const record = await UserSubscription_1.default.create({
            userId: user._id,
            planId: new mongoose_1.default.Types.ObjectId(planId),
            status,
            startAtUTC,
            expiresAtUTC,
            activatedByAdminId: req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
                ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
                : null,
            notes,
        });
        await syncUserSubscriptionCache({
            userId: String(user._id),
            plan,
            status,
            startAtUTC,
            expiresAtUTC,
        });
        const shouldRecordPayment = req.body?.recordPayment === undefined
            ? true
            : toBoolean(req.body?.recordPayment, true);
        let payment = null;
        if (shouldRecordPayment) {
            const amount = Math.max(0, safeNumber(req.body?.paymentAmount, safeNumber(planDto.priceBDT, 0)));
            if (amount > 0) {
                const paymentStatus = safeString(req.body?.paymentStatus, status === 'active' ? 'paid' : 'pending').toLowerCase();
                const normalizedStatus = ['pending', 'paid', 'failed', 'refunded', 'rejected'].includes(paymentStatus)
                    ? paymentStatus
                    : (status === 'active' ? 'paid' : 'pending');
                const methodRaw = safeString(req.body?.paymentMethod, 'manual').toLowerCase();
                const method = ['bkash', 'nagad', 'rocket', 'upay', 'cash', 'manual', 'bank', 'card', 'sslcommerz'].includes(methodRaw)
                    ? methodRaw
                    : 'manual';
                const paymentDate = req.body?.paymentDate ? new Date(String(req.body.paymentDate)) : new Date();
                const safePaymentDate = Number.isNaN(paymentDate.getTime()) ? new Date() : paymentDate;
                const transactionId = safeString(req.body?.transactionId);
                payment = await ManualPayment_1.default.create({
                    studentId: user._id,
                    subscriptionPlanId: new mongoose_1.default.Types.ObjectId(planId),
                    amount,
                    currency: 'BDT',
                    method,
                    status: normalizedStatus,
                    date: safePaymentDate,
                    paidAt: normalizedStatus === 'paid' ? safePaymentDate : null,
                    transactionId,
                    reference: transactionId,
                    notes: safeString(req.body?.paymentNotes, `Subscription assignment (${planDto.name})`),
                    entryType: 'subscription',
                    recordedBy: req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
                        ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
                        : user._id,
                });
            }
        }
        const responseStatus = req.params?.id ? 200 : 201;
        res.status(responseStatus).json({ message: 'Subscription assigned', item: record, payment });
    }
    catch (error) {
        console.error('adminAssignSubscription error:', error);
        res.status(500).json({ message: 'Server error' });
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
        await syncUserSubscriptionCache({
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
        const plans = await SubscriptionPlan_1.default.find().sort({ displayOrder: 1, sortOrder: 1, priority: 1, code: 1 }).lean();
        const exportRows = plans.map((item) => {
            const plan = planToDto(item);
            return {
                id: plan._id,
                code: plan.code,
                name: plan.name,
                type: plan.type,
                priceBDT: plan.priceBDT,
                durationDays: plan.durationDays,
                enabled: plan.enabled,
                isFeatured: plan.isFeatured,
                displayOrder: plan.displayOrder,
                contactCtaLabel: plan.contactCtaLabel,
                contactCtaUrl: plan.contactCtaUrl,
                shortDescription: plan.shortDescription,
                features: plan.features.join(' | '),
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
        await plan.save();
        res.json({ item: planToDto(plan.toObject()), message: plan.isFeatured ? 'Plan marked as featured' : 'Plan unfeatured' });
    }
    catch (error) {
        console.error('adminToggleSubscriptionPlanFeatured error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetSubscriptionSettings(req, res) {
    try {
        const settings = await ensureSubscriptionSettings();
        res.json({ settings });
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
        const update = {
            pageTitle: safeString(body.pageTitle, safeString(settings.pageTitle, 'Subscription Plans')),
            pageSubtitle: safeString(body.pageSubtitle, safeString(settings.pageSubtitle, 'Choose free or paid plans to unlock premium exam access.')),
            headerBannerUrl: safeString(body.headerBannerUrl, safeString(settings.headerBannerUrl)) || null,
            defaultPlanBannerUrl: safeString(body.defaultPlanBannerUrl, safeString(settings.defaultPlanBannerUrl)) || null,
            currencyLabel: safeString(body.currencyLabel, safeString(settings.currencyLabel, 'BDT')),
            showFeaturedFirst: toBoolean(body.showFeaturedFirst, settings.showFeaturedFirst !== false),
            allowFreePlans: toBoolean(body.allowFreePlans, toBoolean(settings.allowFreePlans, true)),
            lastEditedByAdminId: req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
                ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
                : null,
        };
        const updated = await SubscriptionSettings_1.default.findByIdAndUpdate(String(settings._id), update, { new: true, runValidators: true }).lean();
        res.json({ settings: updated, message: 'Subscription settings updated' });
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
        await syncUserSubscriptionCache({
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
        await syncUserSubscriptionCache({
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
        await syncUserSubscriptionCache({
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