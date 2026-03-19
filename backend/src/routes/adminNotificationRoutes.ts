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

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
    executeCampaign,
    previewAndEstimate,
    retryFailedDeliveries,
    triggerAutoSend,
} from '../services/notificationOrchestrationService';
import {
    getTestSendMeta,
    previewTestSend,
    executeTestSend,
    getTestSendLogs,
    retryTestSendLog,
    searchStudentsForTestSend,
} from '../services/testSendService';
import NotificationJob from '../models/NotificationJob';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import NotificationTemplate from '../models/NotificationTemplate';
import NotificationSettings from '../models/NotificationSettings';
import {
    exportPhoneList,
    exportEmailList,
    exportGuardianList,
    exportAudienceSegment,
    exportFailedDeliveries,
    exportManualSendList,
    getImportExportHistory,
} from '../services/dataHubService';

// AuthRequest is provided by global Express augmentation (express-user-augmentation.d.ts)
type AuthRequest = Request;

const router = Router();
const adminAuth = [authenticate, authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent')];

/* ────────────────────────────────────────────────────────────────
   Campaign management
   ──────────────────────────────────────────────────────────────── */

// List campaigns/jobs
router.get('/notifications/campaigns', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
        const status = req.query.status as string | undefined;
        const type = req.query.type as string | undefined;

        const query: Record<string, unknown> = {};
        if (status) query.status = status;
        if (type) query.type = type;

        const [jobs, total] = await Promise.all([
            NotificationJob.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('createdByAdminId', 'full_name username')
                .lean(),
            NotificationJob.countDocuments(query),
        ]);

        res.json({ jobs, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('GET /notifications/campaigns error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single campaign details
router.get('/notifications/campaigns/:id', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const job = await NotificationJob.findById(req.params.id)
            .populate('createdByAdminId', 'full_name username')
            .lean();
        if (!job) { res.status(404).json({ message: 'Campaign not found' }); return; }
        res.json(job);
    } catch (err) {
        console.error('GET /notifications/campaigns/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Preview & estimate campaign
router.post('/notifications/campaigns/preview', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const estimate = await previewAndEstimate({
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
            guardianTargeted: req.body.guardianTargeted,
            recipientMode: req.body.recipientMode,
            adminId: req.user!._id,
        });
        res.json(estimate);
    } catch (err) {
        console.error('POST /notifications/campaigns/preview error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send campaign
router.post('/notifications/campaigns/send', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await executeCampaign({
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
            guardianTargeted: req.body.guardianTargeted ?? false,
            recipientMode: req.body.recipientMode ?? 'student',
            scheduledAtUTC: req.body.scheduledAtUTC ? new Date(req.body.scheduledAtUTC) : undefined,
            adminId: req.user!._id,
            triggerKey: req.body.triggerKey,
            testSend: req.body.testSend ?? false,
        });
        res.json(result);
    } catch (err) {
        console.error('POST /notifications/campaigns/send error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Retry failed deliveries
router.post('/notifications/campaigns/:id/retry', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await retryFailedDeliveries(String(req.params.id), req.user!._id);
        res.json(result);
    } catch (err) {
        console.error('POST /notifications/campaigns/:id/retry error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Delivery logs
   ──────────────────────────────────────────────────────────────── */

router.get('/notifications/delivery-logs', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
        const query: Record<string, unknown> = {};
        if (req.query.jobId) query.jobId = req.query.jobId;
        if (req.query.status) query.status = req.query.status;
        if (req.query.channel) query.channel = req.query.channel;

        const [logs, total] = await Promise.all([
            NotificationDeliveryLog.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            NotificationDeliveryLog.countDocuments(query),
        ]);

        res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('GET /notifications/delivery-logs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Templates
   ──────────────────────────────────────────────────────────────── */

router.get('/notifications/templates', ...adminAuth, async (_req: Request, res: Response) => {
    try {
        const templates = await NotificationTemplate.find().sort({ category: 1, key: 1 }).lean();
        res.json(templates);
    } catch (err) {
        console.error('GET /notifications/templates error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/notifications/templates', ...adminAuth, async (req: Request, res: Response) => {
    try {
        const template = await NotificationTemplate.create({
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
    } catch (err) {
        console.error('POST /notifications/templates error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/notifications/templates/:id', ...adminAuth, async (req: Request, res: Response) => {
    try {
        const template = await NotificationTemplate.findById(req.params.id);
        if (!template) { res.status(404).json({ message: 'Template not found' }); return; }

        if (req.body.key) template.key = String(req.body.key).toUpperCase().trim();
        if (req.body.channel) template.channel = req.body.channel;
        if (req.body.subject !== undefined) template.subject = req.body.subject;
        if (req.body.body) template.body = req.body.body;
        if (req.body.placeholdersAllowed) template.placeholdersAllowed = req.body.placeholdersAllowed;
        if (req.body.isEnabled !== undefined) template.isEnabled = req.body.isEnabled;
        if (req.body.category) template.category = req.body.category;
        template.versionNo = (template.versionNo ?? 0) + 1;
        await template.save();
        res.json(template);
    } catch (err) {
        console.error('PUT /notifications/templates/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Notification Settings
   ──────────────────────────────────────────────────────────────── */

router.get('/notifications/settings', ...adminAuth, async (_req: Request, res: Response) => {
    try {
        let settings: unknown = await NotificationSettings.findOne().lean();
        if (!settings) {
            const created = await NotificationSettings.create({});
            settings = created.toObject();
        }
        res.json(settings);
    } catch (err) {
        console.error('GET /notifications/settings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/notifications/settings', ...adminAuth, async (req: Request, res: Response) => {
    try {
        const settings = await NotificationSettings.findOneAndUpdate(
            {},
            { $set: req.body },
            { new: true, upsert: true },
        );
        res.json(settings);
    } catch (err) {
        console.error('PUT /notifications/settings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Data Hub exports
   ──────────────────────────────────────────────────────────────── */

router.post('/data-hub/export', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { category, format, filters, selectedFields, groupId, jobId, channel, includeGuardians } = req.body;
        const adminId = req.user!._id;
        const baseOpts = { category, format: format ?? 'xlsx', filters, selectedFields, adminId };

        let result;
        switch (category) {
            case 'phone_list':
                result = await exportPhoneList(baseOpts);
                break;
            case 'email_list':
                result = await exportEmailList(baseOpts);
                break;
            case 'guardians':
                result = await exportGuardianList(baseOpts);
                break;
            case 'audience_segment':
                result = await exportAudienceSegment({ ...baseOpts, groupId });
                break;
            case 'failed_deliveries':
                result = await exportFailedDeliveries({ ...baseOpts, jobId });
                break;
            case 'manual_send_list':
                result = await exportManualSendList({ ...baseOpts, channel: channel ?? 'sms', includeGuardians });
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
    } catch (err) {
        console.error('POST /data-hub/export error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/data-hub/history', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await getImportExportHistory({
            direction: req.query.direction as 'import' | 'export' | undefined,
            category: req.query.category as string | undefined,
            page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        });
        res.json(result);
    } catch (err) {
        console.error('GET /data-hub/history error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Trigger auto-send (for internal use / cron)
   ──────────────────────────────────────────────────────────────── */

router.post('/notifications/trigger', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await triggerAutoSend(
            req.body.triggerKey,
            req.body.studentIds,
            req.body.vars ?? {},
            req.user!._id,
        );
        res.json(result);
    } catch (err) {
        console.error('POST /notifications/trigger error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Trigger configuration management
   ──────────────────────────────────────────────────────────────── */

// Get all configured triggers
router.get('/notifications/triggers', ...adminAuth, async (_req: Request, res: Response) => {
    try {
        const settings = await NotificationSettings.findOne().lean() ??
            (await NotificationSettings.create({})).toObject();
        res.json({
            triggers: settings.triggers ?? [],
            resultPublishAutoSend: settings.resultPublishAutoSend ?? false,
            resultPublishChannels: settings.resultPublishChannels ?? [],
            resultPublishGuardianIncluded: settings.resultPublishGuardianIncluded ?? false,
            subscriptionReminderDays: settings.subscriptionReminderDays ?? [7, 3, 1],
            autoSyncCostToFinance: settings.autoSyncCostToFinance ?? true,
        });
    } catch (err) {
        console.error('GET /notifications/triggers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Upsert a single trigger
router.put('/notifications/triggers/:triggerKey', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { triggerKey } = req.params;
        const { enabled, channels, guardianIncluded } = req.body;
        if (!triggerKey || typeof triggerKey !== 'string') {
            res.status(400).json({ message: 'triggerKey is required' });
            return;
        }
        const allowedChannels = (channels ?? []).filter((c: string) => ['sms', 'email'].includes(c));

        const settings = await NotificationSettings.findOne();
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
        };

        if (idx >= 0) {
            settings.triggers[idx] = triggerData;
        } else {
            settings.triggers.push(triggerData);
        }
        await settings.save();
        res.json({ trigger: triggerData });
    } catch (err) {
        console.error('PUT /notifications/triggers/:triggerKey error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk update triggers
router.put('/notifications/triggers', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { triggers, resultPublishAutoSend, resultPublishChannels, resultPublishGuardianIncluded, subscriptionReminderDays } = req.body;
        const update: Record<string, unknown> = {};

        if (Array.isArray(triggers)) {
            update.triggers = triggers.map((t: Record<string, unknown>) => ({
                triggerKey: String(t.triggerKey ?? ''),
                enabled: t.enabled ?? true,
                channels: (Array.isArray(t.channels) ? t.channels : ['sms']).filter((c: string) => ['sms', 'email'].includes(c)),
                guardianIncluded: t.guardianIncluded ?? false,
            }));
        }
        if (resultPublishAutoSend !== undefined) update.resultPublishAutoSend = !!resultPublishAutoSend;
        if (Array.isArray(resultPublishChannels)) update.resultPublishChannels = resultPublishChannels.filter((c: string) => ['sms', 'email'].includes(c));
        if (resultPublishGuardianIncluded !== undefined) update.resultPublishGuardianIncluded = !!resultPublishGuardianIncluded;
        if (Array.isArray(subscriptionReminderDays)) update.subscriptionReminderDays = subscriptionReminderDays.filter((d: number) => d > 0 && d <= 90);

        const settings = await NotificationSettings.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true });
        res.json({
            triggers: settings.triggers,
            resultPublishAutoSend: settings.resultPublishAutoSend,
            resultPublishChannels: settings.resultPublishChannels,
            resultPublishGuardianIncluded: settings.resultPublishGuardianIncluded,
            subscriptionReminderDays: settings.subscriptionReminderDays,
        });
    } catch (err) {
        console.error('PUT /notifications/triggers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ────────────────────────────────────────────────────────────────
   Test-Send endpoints
   ──────────────────────────────────────────────────────────────── */

// Meta: providers, templates, cost config, presets
router.get('/notifications/test-send/meta', ...adminAuth, async (_req: Request, res: Response) => {
    try {
        const meta = await getTestSendMeta();
        res.json(meta);
    } catch (err) {
        console.error('GET /notifications/test-send/meta error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search students for recipient picker
router.get('/notifications/test-send/search-students', ...adminAuth, async (req: Request, res: Response) => {
    try {
        const result = await searchStudentsForTestSend(String(req.query.q ?? ''));
        res.json(result);
    } catch (err) {
        console.error('GET /notifications/test-send/search-students error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Preview: validate + render without sending
router.post('/notifications/test-send/preview', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const preview = await previewTestSend({ ...req.body, adminId: req.user!._id });
        res.json(preview);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Preview failed';
        res.status(400).json({ message });
    }
});

// Send: actually dispatch or log-only
router.post('/notifications/test-send/send', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await executeTestSend({ ...req.body, adminId: req.user!._id });
        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed';
        res.status(400).json({ message });
    }
});

// Recent test-send logs
router.get('/notifications/test-send/logs', ...adminAuth, async (req: Request, res: Response) => {
    try {
        const result = await getTestSendLogs({
            page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
            channel: req.query.channel as string | undefined,
            status: req.query.status as string | undefined,
        });
        res.json(result);
    } catch (err) {
        console.error('GET /notifications/test-send/logs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Retry a failed test send
router.post('/notifications/test-send/logs/:id/retry', ...adminAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await retryTestSendLog(String(req.params.id), req.user!._id);
        res.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Retry failed';
        res.status(400).json({ message });
    }
});

export default router;
