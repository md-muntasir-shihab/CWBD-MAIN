"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetActiveSubscriptions = adminGetActiveSubscriptions;
exports.adminGetSubscriptionStats = adminGetSubscriptionStats;
exports.adminExtendSubscription = adminExtendSubscription;
exports.adminExpireSubscription = adminExpireSubscription;
exports.adminReactivateSubscription = adminReactivateSubscription;
exports.adminToggleAutoRenew = adminToggleAutoRenew;
exports.adminGetAutomationLogs = adminGetAutomationLogs;
exports.adminGetStudentSubscriptionHistory = adminGetStudentSubscriptionHistory;
const mongoose_1 = __importDefault(require("mongoose"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const SubscriptionAutomationLog_1 = __importDefault(require("../models/SubscriptionAutomationLog"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const subscriptionLifecycleService_1 = require("../services/subscriptionLifecycleService");
const requestMeta_1 = require("../utils/requestMeta");
/* ── helpers ── */
function asObjectId(value) {
    const raw = String(value || '').trim();
    if (!raw || !mongoose_1.default.Types.ObjectId.isValid(raw))
        return null;
    return new mongoose_1.default.Types.ObjectId(raw);
}
async function createAudit(req, action, details) {
    if (!req.user || !mongoose_1.default.Types.ObjectId.isValid(req.user._id))
        return;
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'subscription',
        ip_address: (0, requestMeta_1.getClientIp)(req),
        details: details || {},
    });
}
async function syncCacheFromSubscription(sub) {
    const plan = await SubscriptionPlan_1.default.findById(sub.planId).lean();
    await (0, subscriptionLifecycleService_1.syncUserSubscriptionCache)({
        userId: String(sub.userId),
        plan: plan || null,
        status: String(sub.status || 'expired'),
        startAtUTC: sub.startAtUTC || null,
        expiresAtUTC: sub.expiresAtUTC || null,
    });
}
/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Subscription Management
   ═══════════════════════════════════════════════════════════ */
/** GET /admin/subscriptions/active — list active subscriptions */
async function adminGetActiveSubscriptions(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status)
        filter.status = String(req.query.status);
    if (req.query.autoRenew === 'true')
        filter.autoRenewEnabled = true;
    if (req.query.autoRenew === 'false')
        filter.autoRenewEnabled = false;
    const expiringSoon = String(req.query.expiringSoon || '').trim();
    if (expiringSoon === 'true') {
        const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        filter.status = 'active';
        filter.expiresAtUTC = { $lte: sevenDays, $gte: new Date() };
    }
    const [items, total] = await Promise.all([
        UserSubscription_1.default.find(filter)
            .populate('userId', 'username full_name email phone')
            .populate('planId', 'name price durationDays')
            .sort({ expiresAtUTC: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        UserSubscription_1.default.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}
/** GET /admin/subscriptions/stats — summary counts */
async function adminGetSubscriptionStats(_req, res) {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [active, expired, expiringSoon, autoRenewEnabled, totalRevenue] = await Promise.all([
        UserSubscription_1.default.countDocuments({ status: 'active' }),
        UserSubscription_1.default.countDocuments({ status: 'expired' }),
        UserSubscription_1.default.countDocuments({ status: 'active', expiresAtUTC: { $lte: sevenDays, $gte: now } }),
        UserSubscription_1.default.countDocuments({ status: 'active', autoRenewEnabled: true }),
        SubscriptionAutomationLog_1.default.countDocuments({ action: 'renewed' }),
    ]);
    res.json({ active, expired, expiringSoon, autoRenewEnabled, totalRenewals: totalRevenue });
}
/** POST /admin/subscriptions/:id/extend — manually extend */
async function adminExtendSubscription(req, res) {
    if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const { days } = req.body;
    if (!days || days < 1 || days > 365) {
        res.status(400).json({ message: 'days must be between 1 and 365' });
        return;
    }
    const sub = await UserSubscription_1.default.findById(id);
    if (!sub) {
        res.status(404).json({ message: 'Subscription not found' });
        return;
    }
    const base = sub.expiresAtUTC && sub.expiresAtUTC > new Date() ? sub.expiresAtUTC : new Date();
    sub.expiresAtUTC = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    if (sub.status === 'expired')
        sub.status = 'active';
    await sub.save();
    await syncCacheFromSubscription(sub);
    await SubscriptionAutomationLog_1.default.create({
        studentId: sub.userId,
        planId: sub.planId,
        subscriptionId: sub._id,
        action: 'renewed',
        metadata: { days, extendedBy: req.user._id, manual: true },
    });
    await createAudit(req, 'subscription_extended', { subscriptionId: id, days });
    res.json({ data: sub, message: `Subscription extended by ${days} days` });
}
/** POST /admin/subscriptions/:id/expire — force expire */
async function adminExpireSubscription(req, res) {
    if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const sub = await UserSubscription_1.default.findById(id);
    if (!sub) {
        res.status(404).json({ message: 'Subscription not found' });
        return;
    }
    sub.status = 'expired';
    sub.expiresAtUTC = new Date();
    await sub.save();
    await syncCacheFromSubscription(sub);
    await SubscriptionAutomationLog_1.default.create({
        studentId: sub.userId,
        planId: sub.planId,
        subscriptionId: sub._id,
        action: 'expired',
        metadata: { expiredBy: req.user._id, manual: true },
    });
    await createAudit(req, 'subscription_force_expired', { subscriptionId: id });
    res.json({ data: sub, message: 'Subscription expired' });
}
/** POST /admin/subscriptions/:id/reactivate — reactivate expired */
async function adminReactivateSubscription(req, res) {
    if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const { days } = req.body;
    if (!days || days < 1) {
        res.status(400).json({ message: 'days required' });
        return;
    }
    const sub = await UserSubscription_1.default.findById(id);
    if (!sub) {
        res.status(404).json({ message: 'Subscription not found' });
        return;
    }
    sub.status = 'active';
    sub.expiresAtUTC = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await sub.save();
    await syncCacheFromSubscription(sub);
    await SubscriptionAutomationLog_1.default.create({
        studentId: sub.userId,
        planId: sub.planId,
        subscriptionId: sub._id,
        action: 'renewed',
        metadata: { days, reactivatedBy: req.user._id },
    });
    await createAudit(req, 'subscription_reactivated', { subscriptionId: id, days });
    res.json({ data: sub, message: 'Subscription reactivated' });
}
/** PATCH /admin/subscriptions/:id/auto-renew — toggle auto-renew */
async function adminToggleAutoRenew(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const sub = await UserSubscription_1.default.findById(id);
    if (!sub) {
        res.status(404).json({ message: 'Subscription not found' });
        return;
    }
    sub.autoRenewEnabled = !sub.autoRenewEnabled;
    await sub.save();
    await createAudit(req, 'subscription_auto_renew_toggled', { subscriptionId: id, autoRenewEnabled: sub.autoRenewEnabled });
    res.json({ data: sub, message: `Auto-renew ${sub.autoRenewEnabled ? 'enabled' : 'disabled'}` });
}
/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS — Automation Logs
   ═══════════════════════════════════════════════════════════ */
/** GET /admin/subscriptions/automation-logs */
async function adminGetAutomationLogs(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.action)
        filter.action = String(req.query.action);
    if (req.query.studentId) {
        const sid = asObjectId(req.query.studentId);
        if (sid)
            filter.studentId = sid;
    }
    const [items, total] = await Promise.all([
        SubscriptionAutomationLog_1.default.find(filter)
            .populate('studentId', 'username full_name email')
            .populate('planId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SubscriptionAutomationLog_1.default.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}
/** GET /admin/subscriptions/:studentId/history — subscription history for a student */
async function adminGetStudentSubscriptionHistory(req, res) {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) {
        res.status(400).json({ message: 'Invalid studentId' });
        return;
    }
    const [subscriptions, logs] = await Promise.all([
        UserSubscription_1.default.find({ userId: studentId })
            .populate('planId', 'name price durationDays')
            .sort({ createdAt: -1 })
            .lean(),
        SubscriptionAutomationLog_1.default.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
    ]);
    res.json({ subscriptions, automationLogs: logs });
}
//# sourceMappingURL=renewalAutomationController.js.map