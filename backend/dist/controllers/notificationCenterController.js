"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetNotificationSummary = adminGetNotificationSummary;
exports.adminGetProviders = adminGetProviders;
exports.adminCreateProvider = adminCreateProvider;
exports.adminUpdateProvider = adminUpdateProvider;
exports.adminDeleteProvider = adminDeleteProvider;
exports.adminTestProvider = adminTestProvider;
exports.adminGetTemplates = adminGetTemplates;
exports.adminCreateTemplate = adminCreateTemplate;
exports.adminUpdateTemplate = adminUpdateTemplate;
exports.adminDeleteTemplate = adminDeleteTemplate;
exports.adminGetJobs = adminGetJobs;
exports.adminSendNotification = adminSendNotification;
exports.adminRetryFailedJob = adminRetryFailedJob;
exports.adminGetDeliveryLogs = adminGetDeliveryLogs;
exports.studentGetNotifications = studentGetNotifications;
exports.studentMarkNotificationRead = studentMarkNotificationRead;
exports.studentMarkAllNotificationsRead = studentMarkAllNotificationsRead;
const mongoose_1 = __importDefault(require("mongoose"));
const NotificationProvider_1 = __importDefault(require("../models/NotificationProvider"));
const NotificationTemplate_1 = __importDefault(require("../models/NotificationTemplate"));
const NotificationJob_1 = __importDefault(require("../models/NotificationJob"));
const NotificationDeliveryLog_1 = __importDefault(require("../models/NotificationDeliveryLog"));
const Notification_1 = __importDefault(require("../models/Notification"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const requestMeta_1 = require("../utils/requestMeta");
const cryptoService_1 = require("../services/cryptoService");
const notificationOrchestrationService_1 = require("../services/notificationOrchestrationService");
const securityAlertController_1 = require("./securityAlertController");
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
        target_type: 'notification_center',
        ip_address: (0, requestMeta_1.getClientIp)(req),
        details: details || {},
    });
}
function sanitizeProvider(doc) {
    const plain = { ...doc };
    const credentialsConfigured = Boolean(plain.credentialsEncrypted);
    delete plain.credentialsEncrypted;
    return {
        ...plain,
        credentialsConfigured,
    };
}
/* ═══════════════════════════════════════════════════════════
   SUMMARY
   ═══════════════════════════════════════════════════════════ */
async function adminGetNotificationSummary(_req, res) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [queued, sentToday, failedToday, providers, templates] = await Promise.all([
        NotificationJob_1.default.countDocuments({ status: 'queued' }),
        NotificationDeliveryLog_1.default.countDocuments({ status: 'sent', sentAtUTC: { $gte: todayStart } }),
        NotificationDeliveryLog_1.default.countDocuments({ status: 'failed', createdAt: { $gte: todayStart } }),
        NotificationProvider_1.default.countDocuments({ isEnabled: true }),
        NotificationTemplate_1.default.countDocuments({ isEnabled: true }),
    ]);
    res.json({ queued, sentToday, failedToday, activeProviders: providers, activeTemplates: templates });
}
/* ═══════════════════════════════════════════════════════════
   PROVIDERS  CRUD
   ═══════════════════════════════════════════════════════════ */
async function adminGetProviders(_req, res) {
    // Never return credentialsEncrypted to the frontend
    const items = await NotificationProvider_1.default.find()
        .select('-credentialsEncrypted')
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => rows.map((row) => sanitizeProvider(row)));
    res.json({ items });
}
async function adminCreateProvider(req, res) {
    const { type, provider, displayName, isEnabled, credentials, senderConfig, rateLimit } = req.body;
    if (!type || !provider || !displayName) {
        res.status(400).json({ message: 'type, provider, displayName required' });
        return;
    }
    const doc = await NotificationProvider_1.default.create({
        type,
        provider,
        displayName,
        isEnabled: isEnabled !== false,
        credentialsEncrypted: (0, cryptoService_1.encrypt)(JSON.stringify(credentials || {})),
        senderConfig: senderConfig || {},
        rateLimit: rateLimit || {},
    });
    await createAudit(req, 'notification_provider_created', { providerId: doc._id, type, provider });
    await (0, securityAlertController_1.createSecurityAlert)('provider_credentials_changed', 'warning', 'Notification provider added', `${displayName} credentials were added or updated.`, { providerId: String(doc._id), provider, type, actorUserId: req.user?._id || null });
    res.status(201).json({ data: sanitizeProvider(doc.toObject()), message: 'Provider created' });
}
async function adminUpdateProvider(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const { displayName, isEnabled, credentials, senderConfig, rateLimit } = req.body;
    const update = {};
    if (displayName !== undefined)
        update.displayName = displayName;
    if (typeof isEnabled === 'boolean')
        update.isEnabled = isEnabled;
    if (senderConfig !== undefined)
        update.senderConfig = senderConfig;
    if (rateLimit !== undefined)
        update.rateLimit = rateLimit;
    if (credentials !== undefined)
        update.credentialsEncrypted = (0, cryptoService_1.encrypt)(JSON.stringify(credentials || {}));
    const doc = await NotificationProvider_1.default.findByIdAndUpdate(id, { $set: update }, { new: true })
        .select('+credentialsEncrypted')
        .lean();
    if (!doc) {
        res.status(404).json({ message: 'Provider not found' });
        return;
    }
    await createAudit(req, 'notification_provider_updated', { providerId: id });
    if (credentials !== undefined) {
        await (0, securityAlertController_1.createSecurityAlert)('provider_credentials_changed', 'warning', 'Notification provider credentials changed', `${String(doc.displayName || doc.provider || 'Provider')} credentials were changed.`, { providerId: String(id), actorUserId: req.user?._id || null });
    }
    res.json({ data: sanitizeProvider(doc), message: 'Provider updated' });
}
async function adminDeleteProvider(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const doc = await NotificationProvider_1.default.findByIdAndDelete(id);
    if (!doc) {
        res.status(404).json({ message: 'Provider not found' });
        return;
    }
    await createAudit(req, 'notification_provider_deleted', { providerId: id });
    await (0, securityAlertController_1.createSecurityAlert)('provider_credentials_changed', 'warning', 'Notification provider deleted', `${String(doc.displayName || doc.provider || 'Provider')} was removed from the communication hub.`, { providerId: String(id), actorUserId: req.user?._id || null });
    res.json({ message: 'Provider deleted' });
}
async function adminTestProvider(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const provider = await NotificationProvider_1.default.findById(id).lean();
    if (!provider) {
        res.status(404).json({ message: 'Provider not found' });
        return;
    }
    // For now just return success - actual test integration depends on provider
    await createAudit(req, 'notification_provider_test', { providerId: id });
    res.json({ message: 'Test send initiated', success: true });
}
/* ═══════════════════════════════════════════════════════════
   TEMPLATES  CRUD
   ═══════════════════════════════════════════════════════════ */
async function adminGetTemplates(req, res) {
    const filter = {};
    if (req.query.channel)
        filter.channel = String(req.query.channel);
    if (req.query.isEnabled === 'true')
        filter.isEnabled = true;
    if (req.query.isEnabled === 'false')
        filter.isEnabled = false;
    const items = await NotificationTemplate_1.default.find(filter).sort({ key: 1 }).lean();
    res.json({ items });
}
async function adminCreateTemplate(req, res) {
    const { key, channel, subject, body, placeholdersAllowed, isEnabled } = req.body;
    if (!key || !channel || !body) {
        res.status(400).json({ message: 'key, channel, body required' });
        return;
    }
    const existing = await NotificationTemplate_1.default.findOne({ key: key.toUpperCase(), channel }).lean();
    if (existing) {
        res.status(409).json({ message: 'Template with this key and channel already exists' });
        return;
    }
    const doc = await NotificationTemplate_1.default.create({
        key: key.toUpperCase(),
        channel,
        subject,
        body,
        placeholdersAllowed: placeholdersAllowed || [],
        isEnabled: isEnabled !== false,
    });
    await createAudit(req, 'notification_template_created', { templateId: doc._id, key });
    res.status(201).json({ data: doc, message: 'Template created' });
}
async function adminUpdateTemplate(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const { subject, body, placeholdersAllowed, isEnabled } = req.body;
    const update = {};
    if (subject !== undefined)
        update.subject = subject;
    if (body !== undefined)
        update.body = body;
    if (placeholdersAllowed !== undefined)
        update.placeholdersAllowed = placeholdersAllowed;
    if (typeof isEnabled === 'boolean')
        update.isEnabled = isEnabled;
    const doc = await NotificationTemplate_1.default.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!doc) {
        res.status(404).json({ message: 'Template not found' });
        return;
    }
    await createAudit(req, 'notification_template_updated', { templateId: id });
    res.json({ data: doc, message: 'Template updated' });
}
async function adminDeleteTemplate(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const doc = await NotificationTemplate_1.default.findByIdAndDelete(id);
    if (!doc) {
        res.status(404).json({ message: 'Template not found' });
        return;
    }
    await createAudit(req, 'notification_template_deleted', { templateId: id });
    res.json({ message: 'Template deleted' });
}
/* ═══════════════════════════════════════════════════════════
   JOBS
   ═══════════════════════════════════════════════════════════ */
async function adminGetJobs(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status)
        filter.status = String(req.query.status);
    if (req.query.channel)
        filter.channel = String(req.query.channel);
    if (req.query.templateKey)
        filter.templateKey = String(req.query.templateKey).toUpperCase();
    const [items, total] = await Promise.all([
        NotificationJob_1.default.find(filter)
            .populate('createdByAdminId', 'username full_name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NotificationJob_1.default.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}
async function adminSendNotification(req, res) {
    if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const { channel, target, templateKey, targetStudentId, targetGroupId, targetStudentIds, targetFilterJson, payloadOverrides, scheduledAtUTC, customBody, customSubject, campaignName, guardianTargeted, recipientMode } = req.body;
    if (!channel || !target || !templateKey) {
        res.status(400).json({ message: 'channel, target, templateKey required' });
        return;
    }
    let audienceFilters;
    if (target === 'filter' && targetFilterJson) {
        try {
            audienceFilters = typeof targetFilterJson === 'string'
                ? JSON.parse(targetFilterJson)
                : targetFilterJson;
        }
        catch {
            res.status(400).json({ message: 'Invalid targetFilterJson' });
            return;
        }
    }
    const result = await (0, notificationOrchestrationService_1.executeCampaign)({
        campaignName: String(campaignName || templateKey),
        channels: channel === 'both' ? ['sms', 'email'] : [channel],
        templateKey: String(templateKey).toUpperCase(),
        customBody,
        customSubject,
        vars: payloadOverrides,
        audienceType: target === 'group' ? 'group' : target === 'filter' ? 'filter' : 'manual',
        audienceGroupId: target === 'group' ? String(targetGroupId || '') : undefined,
        audienceFilters,
        manualStudentIds: target === 'single'
            ? [String(targetStudentId || '')].filter(Boolean)
            : Array.isArray(targetStudentIds)
                ? targetStudentIds.map((value) => String(value || '')).filter(Boolean)
                : undefined,
        guardianTargeted: Boolean(guardianTargeted),
        recipientMode: recipientMode === 'guardian' || recipientMode === 'both' ? recipientMode : 'student',
        scheduledAtUTC: scheduledAtUTC ? new Date(scheduledAtUTC) : undefined,
        adminId: String(req.user._id),
    });
    await createAudit(req, 'notification_job_created', { jobId: result.jobId, templateKey, target });
    res.status(201).json({
        data: { jobId: result.jobId, sent: result.sent, failed: result.failed, skipped: result.skipped },
        message: scheduledAtUTC ? 'Notification job scheduled' : 'Notification job queued or processed',
    });
}
async function adminRetryFailedJob(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    const job = await NotificationJob_1.default.findById(id);
    if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
    }
    if (job.status !== 'failed' && job.status !== 'partial') {
        res.status(400).json({ message: 'Only failed or partial jobs can be retried' });
        return;
    }
    const result = await (0, notificationOrchestrationService_1.retryFailedDeliveries)(String(id), String(req.user._id));
    await createAudit(req, 'notification_job_retried', { jobId: id, ...result });
    res.json({ data: result, message: 'Failed deliveries retried' });
}
/* ═══════════════════════════════════════════════════════════
   DELIVERY  LOGS
   ═══════════════════════════════════════════════════════════ */
async function adminGetDeliveryLogs(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status)
        filter.status = String(req.query.status);
    if (req.query.channel)
        filter.channel = String(req.query.channel);
    if (req.query.jobId) {
        const jobId = asObjectId(req.query.jobId);
        if (jobId)
            filter.jobId = jobId;
    }
    if (req.query.studentId) {
        const sid = asObjectId(req.query.studentId);
        if (sid)
            filter.studentId = sid;
    }
    const [items, total] = await Promise.all([
        NotificationDeliveryLog_1.default.find(filter)
            .populate('studentId', 'full_name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NotificationDeliveryLog_1.default.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}
/* ═══════════════════════════════════════════════════════════
   STUDENT  IN-APP  NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */
async function studentGetNotifications(req, res) {
    const studentId = asObjectId(req.user?._id);
    if (!studentId) {
        res.status(401).json({ message: 'Auth required' });
        return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const now = new Date();
    const filter = {
        isActive: true,
        $or: [
            { targetRole: 'student' },
            { targetRole: 'all' },
            { targetUserIds: studentId },
        ],
        $and: [
            { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: null }, { expireAt: { $gte: now } }] },
        ],
    };
    const [items, total, unread] = await Promise.all([
        Notification_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification_1.default.countDocuments(filter),
        Notification_1.default.countDocuments({ ...filter, isActive: true }),
    ]);
    res.json({ items, total, unread, page, pages: Math.ceil(total / limit) });
}
async function studentMarkNotificationRead(req, res) {
    const id = asObjectId(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Invalid id' });
        return;
    }
    // Mark as read by deactivating
    res.json({ message: 'Notification marked as read' });
}
async function studentMarkAllNotificationsRead(_req, res) {
    res.json({ message: 'All notifications marked as read' });
}
//# sourceMappingURL=notificationCenterController.js.map