"use strict";
/**
 * Admin Notification Routes
 *
 * Endpoints for the unified notification/campaign platform:
 * - Campaign management (list, create, preview, send, retry)
 * - Template management
 * - Notification settings
 * - Delivery logs
 * - Data hub exports
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const notificationOrchestrationService_1 = require("../services/notificationOrchestrationService");
const NotificationJob_1 = __importDefault(require("../models/NotificationJob"));
const NotificationDeliveryLog_1 = __importDefault(require("../models/NotificationDeliveryLog"));
const NotificationTemplate_1 = __importDefault(require("../models/NotificationTemplate"));
const NotificationSettings_1 = __importDefault(require("../models/NotificationSettings"));
const NotificationProvider_1 = __importDefault(require("../models/NotificationProvider"));
const AnnouncementNotice_1 = __importDefault(require("../models/AnnouncementNotice"));
const dataHubService_1 = require("../services/dataHubService");
const subscriptionContactCenterService_1 = require("../services/subscriptionContactCenterService");
const router = (0, express_1.Router)();
const adminAuth = [auth_1.authenticate, (0, auth_1.authorize)('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent')];
const contactCenterViewAuth = [auth_1.authenticate, (0, auth_1.authorize)('superadmin', 'admin', 'moderator', 'support_agent')];
const contactCenterExportAuth = [auth_1.authenticate, (0, auth_1.authorize)('superadmin', 'admin', 'moderator')];
const contactCenterGuardianAuth = [auth_1.authenticate, (0, auth_1.authorize)('superadmin', 'admin')];
const contactCenterPresetAuth = [auth_1.authenticate, (0, auth_1.authorize)('superadmin', 'admin', 'moderator')];
function hasGuardianScope(scope) {
    const normalized = String(scope || '').trim().toLowerCase();
    return normalized === 'guardian' || normalized === 'student_guardian';
}
function requiresGuardianAccess(body) {
    const preset = (body.preset && typeof body.preset === 'object') ? body.preset : null;
    return hasGuardianScope(body.scope) || Boolean(preset?.includeGuardian);
}
function assertAdminId(req) {
    return String(req.user._id || '');
}
function assertActorRole(req) {
    return String(req.user?.role || '');
}
function summarizeAudienceTarget(body) {
    const audienceType = String(body.audienceType || 'all').trim().toLowerCase();
    if (audienceType === 'group') {
        return body.audienceGroupId ? `saved-group:${String(body.audienceGroupId)}` : 'saved-group';
    }
    if (audienceType === 'manual') {
        const count = Array.isArray(body.manualStudentIds) ? body.manualStudentIds.length : 0;
        return count > 0 ? `manual:${count}` : 'manual';
    }
    if (audienceType === 'filter') {
        const filterKeys = body.audienceFilters && typeof body.audienceFilters === 'object'
            ? Object.keys(body.audienceFilters)
            : [];
        return filterKeys.length > 0 ? `filter:${filterKeys.join(',')}` : 'filter';
    }
    return 'all';
}
/* ────────────────────────────────────────────────────────────────
   Campaign management
   ──────────────────────────────────────────────────────────────── */
// List campaigns/jobs
router.get('/notifications/campaigns', ...adminAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
        const status = req.query.status;
        const type = req.query.type;
        const originModule = req.query.originModule;
        const originEntityId = req.query.originEntityId;
        const query = {};
        if (status)
            query.status = status;
        if (type)
            query.type = type;
        if (originModule)
            query.originModule = originModule;
        if (originEntityId)
            query.originEntityId = originEntityId;
        const [jobs, total] = await Promise.all([
            NotificationJob_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('createdByAdminId', 'full_name username')
                .lean(),
            NotificationJob_1.default.countDocuments(query),
        ]);
        res.json({ jobs, total, page, limit, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        console.error('GET /notifications/campaigns error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Get single campaign details
router.get('/notifications/campaigns/:id', ...adminAuth, async (req, res) => {
    try {
        const job = await NotificationJob_1.default.findById(req.params.id)
            .populate('createdByAdminId', 'full_name username')
            .lean();
        if (!job) {
            res.status(404).json({ message: 'Campaign not found' });
            return;
        }
        res.json(job);
    }
    catch (err) {
        console.error('GET /notifications/campaigns/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Preview & estimate campaign
router.post('/notifications/campaigns/preview', ...adminAuth, async (req, res) => {
    try {
        const estimate = await (0, notificationOrchestrationService_1.previewAndEstimate)({
            campaignName: req.body.campaignName ?? 'Preview',
            channels: req.body.channels ?? ['sms'],
            templateKey: req.body.templateKey,
            customBody: req.body.customBody,
            customSubject: req.body.customSubject,
            vars: req.body.vars,
            audienceType: req.body.audienceType ?? 'all',
            audienceGroupId: req.body.audienceGroupId,
            audienceFilters: req.body.audienceFilters,
            manualStudentIds: req.body.manualStudentIds,
            includeUserIds: req.body.includeUserIds,
            excludeUserIds: req.body.excludeUserIds,
            guardianTargeted: req.body.guardianTargeted,
            recipientMode: req.body.recipientMode,
            adminId: req.user._id,
        });
        res.json(estimate);
    }
    catch (err) {
        console.error('POST /notifications/campaigns/preview error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Send campaign
router.post('/notifications/campaigns/send', ...adminAuth, async (req, res) => {
    try {
        const result = await (0, notificationOrchestrationService_1.executeCampaign)({
            campaignName: req.body.campaignName,
            channels: req.body.channels,
            templateKey: req.body.templateKey,
            customBody: req.body.customBody,
            customSubject: req.body.customSubject,
            vars: req.body.vars,
            audienceType: req.body.audienceType,
            audienceGroupId: req.body.audienceGroupId,
            audienceFilters: req.body.audienceFilters,
            manualStudentIds: req.body.manualStudentIds,
            includeUserIds: req.body.includeUserIds,
            excludeUserIds: req.body.excludeUserIds,
            guardianTargeted: req.body.guardianTargeted ?? false,
            recipientMode: req.body.recipientMode ?? 'student',
            scheduledAtUTC: req.body.scheduledAtUTC ? new Date(req.body.scheduledAtUTC) : undefined,
            adminId: req.user._id,
            originModule: req.body.originModule,
            originEntityId: req.body.originEntityId,
            originAction: req.body.originAction,
            triggerKey: req.body.triggerKey,
            testSend: req.body.testSend ?? false,
        });
        const originModule = String(req.body.originModule || '').trim().toLowerCase();
        const originEntityId = String(req.body.originEntityId || '').trim();
        if (originModule === 'notice' && originEntityId) {
            const channels = Array.isArray(req.body.channels)
                ? req.body.channels
                    .map((channel) => String(channel || '').trim().toLowerCase())
                    .filter(Boolean)
                : [];
            await AnnouncementNotice_1.default.findByIdAndUpdate(originEntityId, {
                $set: {
                    deliveryMeta: {
                        lastJobId: result.jobId || null,
                        lastChannel: channels.length > 1 ? 'both' : channels[0] === 'sms' ? 'sms' : 'email',
                        lastAudienceSummary: summarizeAudienceTarget(req.body || {}),
                        lastSentAt: new Date(),
                    },
                },
            });
        }
        res.json(result);
    }
    catch (err) {
        console.error('POST /notifications/campaigns/send error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Retry failed deliveries
router.post('/notifications/campaigns/:id/retry', ...adminAuth, async (req, res) => {
    try {
        const result = await (0, notificationOrchestrationService_1.retryFailedDeliveries)(String(req.params.id), req.user._id);
        res.json(result);
    }
    catch (err) {
        console.error('POST /notifications/campaigns/:id/retry error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Delivery logs
   ──────────────────────────────────────────────────────────────── */
router.get('/notifications/delivery-logs', ...adminAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
        const query = {};
        if (req.query.jobId)
            query.jobId = req.query.jobId;
        if (req.query.status)
            query.status = req.query.status;
        if (req.query.channel)
            query.channel = req.query.channel;
        if (req.query.originModule)
            query.originModule = String(req.query.originModule);
        if (req.query.originEntityId)
            query.originEntityId = String(req.query.originEntityId);
        const [logs, total] = await Promise.all([
            NotificationDeliveryLog_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            NotificationDeliveryLog_1.default.countDocuments(query),
        ]);
        res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        console.error('GET /notifications/delivery-logs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Templates
   ──────────────────────────────────────────────────────────────── */
router.get('/notifications/templates', ...adminAuth, async (_req, res) => {
    try {
        const templates = await NotificationTemplate_1.default.find().sort({ category: 1, key: 1 }).lean();
        res.json(templates);
    }
    catch (err) {
        console.error('GET /notifications/templates error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/notifications/templates', ...adminAuth, async (req, res) => {
    try {
        const template = await NotificationTemplate_1.default.create({
            key: String(req.body.key ?? '').toUpperCase().trim(),
            channel: req.body.channel,
            subject: req.body.subject,
            body: req.body.body,
            placeholdersAllowed: req.body.placeholdersAllowed ?? [],
            isEnabled: req.body.isEnabled ?? true,
            category: req.body.category ?? 'other',
            versionNo: 1,
        });
        res.status(201).json(template);
    }
    catch (err) {
        console.error('POST /notifications/templates error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.put('/notifications/templates/:id', ...adminAuth, async (req, res) => {
    try {
        const template = await NotificationTemplate_1.default.findById(req.params.id);
        if (!template) {
            res.status(404).json({ message: 'Template not found' });
            return;
        }
        if (req.body.key)
            template.key = String(req.body.key).toUpperCase().trim();
        if (req.body.channel)
            template.channel = req.body.channel;
        if (req.body.subject !== undefined)
            template.subject = req.body.subject;
        if (req.body.body)
            template.body = req.body.body;
        if (req.body.placeholdersAllowed)
            template.placeholdersAllowed = req.body.placeholdersAllowed;
        if (req.body.isEnabled !== undefined)
            template.isEnabled = req.body.isEnabled;
        if (req.body.category)
            template.category = req.body.category;
        template.versionNo = (template.versionNo ?? 0) + 1;
        await template.save();
        res.json(template);
    }
    catch (err) {
        console.error('PUT /notifications/templates/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Notification Settings
   ──────────────────────────────────────────────────────────────── */
router.get('/notifications/settings', ...adminAuth, async (_req, res) => {
    try {
        let settings = await NotificationSettings_1.default.findOne().lean();
        if (!settings) {
            const created = await NotificationSettings_1.default.create({});
            settings = created.toObject();
        }
        res.json(settings);
    }
    catch (err) {
        console.error('GET /notifications/settings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.put('/notifications/settings', ...adminAuth, async (req, res) => {
    try {
        const settings = await NotificationSettings_1.default.findOneAndUpdate({}, { $set: req.body }, { new: true, upsert: true });
        res.json(settings);
    }
    catch (err) {
        console.error('PUT /notifications/settings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Data Hub exports
   ──────────────────────────────────────────────────────────────── */
router.get('/subscription-contact-center/overview', ...contactCenterViewAuth, async (req, res) => {
    try {
        const data = await (0, subscriptionContactCenterService_1.getSubscriptionContactCenterOverview)(req.query);
        res.json(data);
    }
    catch (err) {
        console.error('GET /subscription-contact-center/overview error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/notifications/dashboard-summary', ...adminAuth, async (_req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalCampaigns, queuedCount, processingCount, completedCount, failedCount, scheduledCount, sentToday, failedToday, activeTriggersDoc, providers, recentLogs, upcomingJobs, audienceOverview,] = await Promise.all([
            NotificationJob_1.default.countDocuments(),
            NotificationJob_1.default.countDocuments({ status: 'queued' }),
            NotificationJob_1.default.countDocuments({ status: 'processing' }),
            NotificationJob_1.default.countDocuments({ status: 'done' }),
            NotificationJob_1.default.countDocuments({ status: { $in: ['failed', 'partial'] } }),
            NotificationJob_1.default.countDocuments({ scheduledAtUTC: { $gt: now } }),
            NotificationDeliveryLog_1.default.countDocuments({ status: 'sent', createdAt: { $gte: startOfToday } }),
            NotificationDeliveryLog_1.default.countDocuments({ status: 'failed', createdAt: { $gte: startOfToday } }),
            NotificationSettings_1.default.findOne().lean(),
            NotificationProvider_1.default.find().select('displayName provider type isEnabled updatedAt').lean(),
            NotificationDeliveryLog_1.default.find({ createdAt: { $gte: sevenDaysAgo } })
                .sort({ createdAt: -1 })
                .limit(200)
                .select('providerUsed status createdAt originModule originEntityId')
                .lean(),
            NotificationJob_1.default.find({ scheduledAtUTC: { $gt: now } })
                .sort({ scheduledAtUTC: 1, createdAt: 1 })
                .limit(5)
                .select('campaignName channel scheduledAtUTC status totalTargets')
                .lean(),
            (0, subscriptionContactCenterService_1.getSubscriptionContactCenterOverview)({}),
        ]);
        const logsByProvider = new Map();
        for (const log of recentLogs) {
            const key = String(log.providerUsed || '').trim();
            if (!key)
                continue;
            const entry = logsByProvider.get(key) || { total: 0, failed: 0, lastSuccessAt: null };
            entry.total += 1;
            if (String(log.status) === 'failed') {
                entry.failed += 1;
            }
            else if (String(log.status) === 'sent' && !entry.lastSuccessAt) {
                entry.lastSuccessAt = String(log.createdAt || '');
            }
            logsByProvider.set(key, entry);
        }
        const providerHealth = providers.map((provider) => {
            const key = String(provider.displayName || provider.provider || '');
            const stats = logsByProvider.get(key) || { total: 0, failed: 0, lastSuccessAt: null };
            return {
                id: String(provider._id || ''),
                name: key,
                type: String(provider.type || ''),
                provider: String(provider.provider || ''),
                isEnabled: Boolean(provider.isEnabled),
                totalAttempts: stats.total,
                failedAttempts: stats.failed,
                failureRate: stats.total > 0 ? Number(((stats.failed / stats.total) * 100).toFixed(1)) : 0,
                lastSuccessAt: stats.lastSuccessAt,
                updatedAt: String(provider.updatedAt || ''),
            };
        });
        res.json({
            totals: {
                totalCampaigns,
                queuedCount,
                processingCount,
                completedCount,
                failedCount,
                scheduledCount,
                sentToday,
                failedToday,
                activeTriggers: Array.isArray(activeTriggersDoc?.triggers)
                    ? activeTriggersDoc.triggers.filter((trigger) => trigger.enabled).length
                    : 0,
                activeProviders: providerHealth.filter((provider) => provider.isEnabled).length,
                failedProviders: providerHealth.filter((provider) => provider.isEnabled && provider.failureRate >= 50 && provider.totalAttempts > 0).length,
            },
            audience: audienceOverview.summary,
            upcomingJobs,
            providerHealth,
            recentFailures: recentLogs
                .filter((log) => String(log.status) === 'failed')
                .slice(0, 8),
        });
    }
    catch (err) {
        console.error('GET /notifications/dashboard-summary error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/subscription-contact-center/members', ...contactCenterViewAuth, async (req, res) => {
    try {
        const role = assertActorRole(req);
        const canViewGuardian = ['superadmin', 'admin'].includes(role);
        const data = await (0, subscriptionContactCenterService_1.getSubscriptionContactCenterMembers)({
            filters: req.query,
            page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 25,
            includeGuardianData: canViewGuardian,
        });
        res.json({
            ...data,
            permissions: {
                canViewGuardian,
                canExport: ['superadmin', 'admin', 'moderator'].includes(role),
                canPersonalOutreach: ['superadmin', 'admin'].includes(role),
            },
        });
    }
    catch (err) {
        console.error('GET /subscription-contact-center/members error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/subscription-contact-center/copy-preview', ...contactCenterExportAuth, async (req, res) => {
    try {
        const role = assertActorRole(req);
        if (requiresGuardianAccess(req.body) && !['superadmin', 'admin'].includes(role)) {
            res.status(403).json({ message: 'Guardian contact access is restricted' });
            return;
        }
        if (String(req.body.mode || '') === 'personal_outreach' && !['superadmin', 'admin'].includes(role)) {
            res.status(403).json({ message: 'Personal outreach is restricted' });
            return;
        }
        const payload = await (0, subscriptionContactCenterService_1.previewSubscriptionContactCopy)({
            filters: (req.body.filters || {}),
            scope: String(req.body.scope || 'phones'),
            presetId: typeof req.body.presetId === 'string' ? req.body.presetId : null,
            preset: typeof req.body.preset === 'object' && req.body.preset !== null ? req.body.preset : null,
            adminId: assertAdminId(req),
            actorRole: role,
            mode: req.body.mode === 'personal_outreach' ? 'personal_outreach' : 'copy_preview',
        });
        res.json(payload);
    }
    catch (err) {
        console.error('POST /subscription-contact-center/copy-preview error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/subscription-contact-center/export', ...contactCenterExportAuth, async (req, res) => {
    try {
        const role = assertActorRole(req);
        if (requiresGuardianAccess(req.body) && !['superadmin', 'admin'].includes(role)) {
            res.status(403).json({ message: 'Guardian contact access is restricted' });
            return;
        }
        const result = await (0, subscriptionContactCenterService_1.exportSubscriptionContactData)({
            filters: (req.body.filters || {}),
            scope: String(req.body.scope || 'phones'),
            format: String(req.body.format || 'xlsx'),
            presetId: typeof req.body.presetId === 'string' ? req.body.presetId : null,
            preset: typeof req.body.preset === 'object' && req.body.preset !== null ? req.body.preset : null,
            adminId: assertAdminId(req),
            actorRole: role,
        });
        if (result.text && (req.body.format === 'txt' || req.body.format === 'clipboard')) {
            res.json({ text: result.text, previewText: result.previewText, rowCount: result.rowCount, fileName: result.fileName });
            return;
        }
        if (result.rows && req.body.format === 'json') {
            res.json({ data: result.rows, count: result.rowCount, fileName: result.fileName });
            return;
        }
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename=\"${result.fileName}\"`);
        res.send(result.buffer);
    }
    catch (err) {
        console.error('POST /subscription-contact-center/export error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/subscription-contact-center/presets', ...contactCenterPresetAuth, async (_req, res) => {
    try {
        const data = await (0, subscriptionContactCenterService_1.listSubscriptionContactPresets)();
        res.json({ items: data });
    }
    catch (err) {
        console.error('GET /subscription-contact-center/presets error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/subscription-contact-center/presets', ...contactCenterPresetAuth, async (req, res) => {
    try {
        const item = await (0, subscriptionContactCenterService_1.createSubscriptionContactPreset)({
            payload: req.body,
            adminId: assertAdminId(req),
            actorRole: assertActorRole(req),
        });
        res.status(201).json({ item });
    }
    catch (err) {
        console.error('POST /subscription-contact-center/presets error:', err);
        res.status(400).json({ message: err instanceof Error ? err.message : 'Server error' });
    }
});
router.patch('/subscription-contact-center/presets/:id', ...contactCenterPresetAuth, async (req, res) => {
    try {
        const item = await (0, subscriptionContactCenterService_1.updateSubscriptionContactPreset)({
            presetId: String(req.params.id || ''),
            payload: req.body,
            adminId: assertAdminId(req),
            actorRole: assertActorRole(req),
        });
        res.json({ item });
    }
    catch (err) {
        console.error('PATCH /subscription-contact-center/presets/:id error:', err);
        res.status(400).json({ message: err instanceof Error ? err.message : 'Server error' });
    }
});
router.delete('/subscription-contact-center/presets/:id', ...contactCenterPresetAuth, async (req, res) => {
    try {
        const result = await (0, subscriptionContactCenterService_1.deleteSubscriptionContactPreset)({
            presetId: String(req.params.id || ''),
            adminId: assertAdminId(req),
            actorRole: assertActorRole(req),
        });
        res.json(result);
    }
    catch (err) {
        console.error('DELETE /subscription-contact-center/presets/:id error:', err);
        res.status(400).json({ message: err instanceof Error ? err.message : 'Server error' });
    }
});
router.get('/subscription-contact-center/logs', ...contactCenterViewAuth, async (req, res) => {
    try {
        const data = await (0, subscriptionContactCenterService_1.getSubscriptionContactLogs)({
            page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 25,
        });
        res.json(data);
    }
    catch (err) {
        console.error('GET /subscription-contact-center/logs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/data-hub/export', ...adminAuth, async (req, res) => {
    try {
        const { category, format, filters, selectedFields, groupId, jobId, channel, includeGuardians } = req.body;
        const adminId = req.user._id;
        const actorRole = assertActorRole(req);
        const baseOpts = { category, format: format ?? 'xlsx', filters, selectedFields, adminId };
        if (['phone_list', 'email_list', 'guardians', 'manual_send_list', 'audience_segment'].includes(String(category || ''))) {
            const legacyFilters = { ...(filters || {}) };
            if (groupId)
                legacyFilters.groupIds = [String(groupId)];
            let scope = 'phones';
            if (category === 'email_list')
                scope = 'emails';
            if (category === 'guardians')
                scope = 'guardian';
            if (category === 'manual_send_list')
                scope = includeGuardians ? 'student_guardian' : (channel === 'email' ? 'emails' : 'phones');
            if (category === 'audience_segment')
                scope = 'raw';
            if ((scope === 'guardian' || scope === 'student_guardian') && !['superadmin', 'admin'].includes(actorRole)) {
                res.status(403).json({ message: 'Guardian contact access is restricted' });
                return;
            }
            const result = await (0, subscriptionContactCenterService_1.exportSubscriptionContactData)({
                filters: legacyFilters,
                scope,
                format: String(format || 'xlsx'),
                adminId: String(adminId),
                actorRole,
            });
            if (result.text && (format === 'txt' || format === 'clipboard')) {
                res.json({ text: result.text, rowCount: result.rowCount, fileName: result.fileName });
                return;
            }
            if (result.rows && format === 'json') {
                res.json({ data: result.rows, count: result.rowCount, fileName: result.fileName });
                return;
            }
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
            res.send(result.buffer);
            return;
        }
        let result;
        switch (category) {
            case 'phone_list':
                result = await (0, dataHubService_1.exportPhoneList)(baseOpts);
                break;
            case 'email_list':
                result = await (0, dataHubService_1.exportEmailList)(baseOpts);
                break;
            case 'guardians':
                result = await (0, dataHubService_1.exportGuardianList)(baseOpts);
                break;
            case 'audience_segment':
                result = await (0, dataHubService_1.exportAudienceSegment)({ ...baseOpts, groupId });
                break;
            case 'failed_deliveries':
                result = await (0, dataHubService_1.exportFailedDeliveries)({ ...baseOpts, jobId });
                break;
            case 'manual_send_list':
                result = await (0, dataHubService_1.exportManualSendList)({ ...baseOpts, channel: channel ?? 'sms', includeGuardians });
                break;
            default:
                res.status(400).json({ message: `Unknown export category: ${category}` });
                return;
        }
        if (result.text && (format === 'txt' || format === 'clipboard')) {
            res.json({ text: result.text, rowCount: result.rowCount, fileName: result.fileName });
            return;
        }
        if (result.data && format === 'json') {
            res.json({ data: result.data, count: result.rowCount, fileName: result.fileName });
            return;
        }
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.send(result.buffer);
    }
    catch (err) {
        console.error('POST /data-hub/export error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/data-hub/history', ...adminAuth, async (req, res) => {
    try {
        const result = await (0, dataHubService_1.getImportExportHistory)({
            direction: req.query.direction,
            category: req.query.category,
            page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        });
        res.json(result);
    }
    catch (err) {
        console.error('GET /data-hub/history error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Trigger auto-send (for internal use / cron)
   ──────────────────────────────────────────────────────────────── */
router.post('/notifications/trigger', ...adminAuth, async (req, res) => {
    try {
        const result = await (0, notificationOrchestrationService_1.triggerAutoSend)(req.body.triggerKey, req.body.studentIds, req.body.vars ?? {}, req.user._id);
        res.json(result);
    }
    catch (err) {
        console.error('POST /notifications/trigger error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Trigger configuration management
   ──────────────────────────────────────────────────────────────── */
// Get all configured triggers
router.get('/notifications/triggers', ...adminAuth, async (_req, res) => {
    try {
        const settings = await NotificationSettings_1.default.findOne().lean() ??
            (await NotificationSettings_1.default.create({})).toObject();
        res.json({
            triggers: settings.triggers ?? [],
            resultPublishAutoSend: settings.resultPublishAutoSend ?? false,
            resultPublishChannels: settings.resultPublishChannels ?? [],
            resultPublishGuardianIncluded: settings.resultPublishGuardianIncluded ?? false,
            subscriptionReminderDays: settings.subscriptionReminderDays ?? [7, 3, 1],
            autoSyncCostToFinance: settings.autoSyncCostToFinance ?? true,
        });
    }
    catch (err) {
        console.error('GET /notifications/triggers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Upsert a single trigger
router.put('/notifications/triggers/:triggerKey', ...adminAuth, async (req, res) => {
    try {
        const { triggerKey } = req.params;
        const { enabled, channels, guardianIncluded, templateKey, delayMinutes, batchSize, retryEnabled, quietHoursMode, audienceMode, } = req.body;
        if (!triggerKey || typeof triggerKey !== 'string') {
            res.status(400).json({ message: 'triggerKey is required' });
            return;
        }
        const allowedChannels = (channels ?? []).filter((c) => ['sms', 'email'].includes(c));
        const settings = await NotificationSettings_1.default.findOne();
        if (!settings) {
            res.status(500).json({ message: 'Settings not initialized' });
            return;
        }
        const idx = settings.triggers.findIndex((t) => t.triggerKey === triggerKey);
        const triggerData = {
            triggerKey,
            enabled: enabled ?? true,
            channels: allowedChannels.length > 0 ? allowedChannels : ['sms'],
            guardianIncluded: guardianIncluded ?? false,
            templateKey: templateKey ? String(templateKey).toUpperCase().trim() : '',
            delayMinutes: Number.isFinite(Number(delayMinutes)) ? Math.max(0, Number(delayMinutes)) : 0,
            batchSize: Number.isFinite(Number(batchSize)) ? Math.max(0, Number(batchSize)) : 0,
            retryEnabled: retryEnabled ?? true,
            quietHoursMode: quietHoursMode === 'bypass' ? 'bypass' : 'respect',
            audienceMode: ['affected', 'subscription_active', 'subscription_renewal_due', 'custom'].includes(String(audienceMode))
                ? String(audienceMode)
                : 'affected',
        };
        if (idx >= 0) {
            settings.triggers[idx] = triggerData;
        }
        else {
            settings.triggers.push(triggerData);
        }
        await settings.save();
        res.json({ trigger: triggerData });
    }
    catch (err) {
        console.error('PUT /notifications/triggers/:triggerKey error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Bulk update triggers
router.put('/notifications/triggers', ...adminAuth, async (req, res) => {
    try {
        const { triggers, resultPublishAutoSend, resultPublishChannels, resultPublishGuardianIncluded, subscriptionReminderDays } = req.body;
        const update = {};
        if (Array.isArray(triggers)) {
            update.triggers = triggers.map((t) => ({
                triggerKey: String(t.triggerKey ?? ''),
                enabled: t.enabled ?? true,
                channels: (Array.isArray(t.channels) ? t.channels : ['sms']).filter((c) => ['sms', 'email'].includes(c)),
                guardianIncluded: t.guardianIncluded ?? false,
                templateKey: t.templateKey ? String(t.templateKey).toUpperCase().trim() : '',
                delayMinutes: Number.isFinite(Number(t.delayMinutes)) ? Math.max(0, Number(t.delayMinutes)) : 0,
                batchSize: Number.isFinite(Number(t.batchSize)) ? Math.max(0, Number(t.batchSize)) : 0,
                retryEnabled: t.retryEnabled ?? true,
                quietHoursMode: t.quietHoursMode === 'bypass' ? 'bypass' : 'respect',
                audienceMode: ['affected', 'subscription_active', 'subscription_renewal_due', 'custom'].includes(String(t.audienceMode))
                    ? String(t.audienceMode)
                    : 'affected',
            }));
        }
        if (resultPublishAutoSend !== undefined)
            update.resultPublishAutoSend = !!resultPublishAutoSend;
        if (Array.isArray(resultPublishChannels))
            update.resultPublishChannels = resultPublishChannels.filter((c) => ['sms', 'email'].includes(c));
        if (resultPublishGuardianIncluded !== undefined)
            update.resultPublishGuardianIncluded = !!resultPublishGuardianIncluded;
        if (Array.isArray(subscriptionReminderDays))
            update.subscriptionReminderDays = subscriptionReminderDays.filter((d) => d > 0 && d <= 90);
        const settings = await NotificationSettings_1.default.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true });
        res.json({
            triggers: settings.triggers,
            resultPublishAutoSend: settings.resultPublishAutoSend,
            resultPublishChannels: settings.resultPublishChannels,
            resultPublishGuardianIncluded: settings.resultPublishGuardianIncluded,
            subscriptionReminderDays: settings.subscriptionReminderDays,
        });
    }
    catch (err) {
        console.error('PUT /notifications/triggers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ────────────────────────────────────────────────────────────────
   Test-Send endpoints
   ──────────────────────────────────────────────────────────────── */
exports.default = router;
//# sourceMappingURL=adminNotificationRoutes.js.map