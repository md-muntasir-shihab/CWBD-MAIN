/**
 * Notification Orchestration Service
 *
 * Resolves audience → recipients → channels → template rendering →
 * provider send → delivery log → finance sync → audit log.
 *
 * Supports: manual campaigns, automatic triggers, result publishing,
 * guardian combinations, duplicate prevention, quiet hours,
 * delayed scheduling, test-send, preview/estimate.
 */

import mongoose from 'mongoose';
import NotificationJob from '../models/NotificationJob';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog';
import NotificationTemplate from '../models/NotificationTemplate';
import NotificationSettings, { INotificationSettings } from '../models/NotificationSettings';
import StudentGroup from '../models/StudentGroup';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import UserSubscription from '../models/UserSubscription';
import FinanceSettings from '../models/FinanceSettings';
import FinanceTransaction from '../models/FinanceTransaction';
import AuditLog from '../models/AuditLog';
import {
    sendSMS,
    sendEmail,
    getActiveProvider,
    renderTemplate,
    SendResult,
} from './notificationProviderService';
import { nextTxnCode } from './financeCenterService';

/* ================================================================
   Types
   ================================================================ */

export interface RecipientInfo {
    userId: mongoose.Types.ObjectId;
    phone?: string;
    email?: string;
    fullName: string;
    isGuardian?: boolean;
    guardianPhone?: string;
    guardianEmail?: string;
    guardianName?: string;
}

export interface CampaignSendOptions {
    campaignName: string;
    channels: ('sms' | 'email')[];
    templateKey?: string;
    customBody?: string;
    customSubject?: string;
    vars?: Record<string, string>;
    audienceType: 'group' | 'filter' | 'manual' | 'all';
    audienceGroupId?: string;
    audienceFilters?: Record<string, unknown>;
    manualStudentIds?: string[];
    guardianTargeted?: boolean;
    recipientMode?: 'student' | 'guardian' | 'both';
    scheduledAtUTC?: Date;
    adminId: string;
    triggerKey?: string;
    testSend?: boolean;
}

export interface PreviewEstimate {
    recipientCount: number;
    guardianCount: number;
    channelBreakdown: { sms: number; email: number };
    estimatedCostBDT: number;
    sampleRendered?: { subject?: string; body: string };
}

function deriveJobChannel(channels: ('sms' | 'email')[]): 'sms' | 'email' | 'both' {
    if (channels.includes('sms') && channels.includes('email')) return 'both';
    return channels.includes('email') ? 'email' : 'sms';
}

function deriveJobTarget(audienceType: CampaignSendOptions['audienceType']): 'single' | 'group' | 'filter' | 'selected' {
    if (audienceType === 'group') return 'group';
    if (audienceType === 'manual') return 'selected';
    return 'filter';
}

/* ================================================================
   Settings helper (singleton)
   ================================================================ */

async function getSettings(): Promise<INotificationSettings> {
    let settings = await NotificationSettings.findOne().lean<INotificationSettings>();
    if (!settings) {
        settings = await NotificationSettings.create({});
    }
    return settings;
}

/* ================================================================
   Audience resolution
   ================================================================ */

export async function resolveAudience(
    audienceType: CampaignSendOptions['audienceType'],
    opts: {
        groupId?: string;
        filters?: Record<string, unknown>;
        manualStudentIds?: string[];
    },
): Promise<RecipientInfo[]> {
    let userIds: mongoose.Types.ObjectId[] = [];

    if (audienceType === 'manual' && opts.manualStudentIds?.length) {
        userIds = opts.manualStudentIds.map((id) => new mongoose.Types.ObjectId(id));
    } else if (audienceType === 'group' && opts.groupId) {
        const group = await StudentGroup.findById(opts.groupId).lean();
        if (!group) return [];
        if (group.type === 'dynamic' && group.rules) {
            userIds = await resolveDynamicGroupUserIds(group.rules);
        } else {
            // Use StudentProfile.groupIds as the authoritative membership source
            const memberProfiles = await StudentProfile.find(
                { groupIds: new mongoose.Types.ObjectId(opts.groupId), status: { $ne: 'deleted' } },
            ).select('user_id').lean();
            userIds = memberProfiles.map((p) => p.user_id as mongoose.Types.ObjectId);
        }
    } else if (audienceType === 'filter' && opts.filters) {
        userIds = await resolveFilterUserIds(opts.filters);
    } else if (audienceType === 'all') {
        const profiles = await StudentProfile.find({ status: { $ne: 'deleted' } })
            .select('user_id')
            .lean();
        userIds = profiles.map((p) => p.user_id as mongoose.Types.ObjectId);
    }

    if (!userIds.length) return [];

    const [users, profiles] = await Promise.all([
        User.find({ _id: { $in: userIds } })
            .select('email phone_number full_name')
            .lean(),
        StudentProfile.find({ user_id: { $in: userIds } })
            .select('user_id email phone_number full_name guardian_name guardian_phone guardian_email')
            .lean(),
    ]);

    const profileMap = new Map(
        profiles.map((p) => [String(p.user_id), p]),
    );

    return users.map((u) => {
        const p = profileMap.get(String(u._id)) as Record<string, unknown> | undefined;
        return {
            userId: u._id as mongoose.Types.ObjectId,
            phone: (p?.phone_number ?? u.phone_number ?? '') as string,
            email: (p?.email ?? u.email ?? '') as string,
            fullName: (p?.full_name ?? u.full_name ?? '') as string,
            guardianPhone: (p?.guardian_phone ?? '') as string,
            guardianEmail: (p?.guardian_email ?? '') as string,
            guardianName: (p?.guardian_name ?? '') as string,
        };
    });
}

async function resolveDynamicGroupUserIds(
    rules: Record<string, unknown>,
): Promise<mongoose.Types.ObjectId[]> {
    const planCodes = Array.isArray(rules.planCodes)
        ? rules.planCodes.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const filter: Record<string, unknown> = { status: { $ne: 'deleted' } };
    if (Array.isArray(rules.batches) && rules.batches.length)
        filter.hsc_batch = { $in: rules.batches };
    if (Array.isArray(rules.sscBatches) && rules.sscBatches.length)
        filter.ssc_batch = { $in: rules.sscBatches };
    if (Array.isArray(rules.departments) && rules.departments.length)
        filter.department = { $in: rules.departments };
    if (Array.isArray(rules.statuses) && rules.statuses.length)
        filter.status = { $in: rules.statuses };
    const profiles = await StudentProfile.find(filter).select('user_id').lean();
    const userIds = profiles.map((p) => p.user_id as mongoose.Types.ObjectId);
    return filterUserIdsByActivePlanCodes(userIds, planCodes);
}

async function resolveFilterUserIds(
    filters: Record<string, unknown>,
): Promise<mongoose.Types.ObjectId[]> {
    const planCodes = Array.isArray(filters.planCodes)
        ? filters.planCodes.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const filter: Record<string, unknown> = { status: { $ne: 'deleted' } };
    if (filters.batches) filter.hsc_batch = { $in: filters.batches };
    if (filters.sscBatches) filter.ssc_batch = { $in: filters.sscBatches };
    if (filters.departments) filter.department = { $in: filters.departments };
    if (filters.statuses) filter.status = { $in: filters.statuses };
    const profiles = await StudentProfile.find(filter).select('user_id').lean();
    const userIds = profiles.map((p) => p.user_id as mongoose.Types.ObjectId);
    return filterUserIdsByActivePlanCodes(userIds, planCodes);
}

async function filterUserIdsByActivePlanCodes(
    userIds: mongoose.Types.ObjectId[],
    planCodes: string[],
): Promise<mongoose.Types.ObjectId[]> {
    const normalizedPlanCodes = Array.from(new Set(planCodes.map((value) => value.trim().toLowerCase()).filter(Boolean)));
    if (!userIds.length || !normalizedPlanCodes.length) {
        return userIds;
    }

    const subscriptions = await UserSubscription.find({
        userId: { $in: userIds },
        status: 'active',
        expiresAtUTC: { $gt: new Date() },
    })
        .populate('planId', 'code')
        .select('userId planId')
        .lean();

    const allowedUserIds = new Set<string>();
    for (const subscription of subscriptions as Array<Record<string, unknown>>) {
        const plan = (subscription.planId as Record<string, unknown> | undefined) || {};
        const planCode = String(plan.code || '').trim().toLowerCase();
        if (!planCode || !normalizedPlanCodes.includes(planCode)) continue;
        allowedUserIds.add(String(subscription.userId || ''));
    }

    return userIds.filter((userId) => allowedUserIds.has(String(userId)));
}

/* ================================================================
   Duplicate prevention
   ================================================================ */

async function isDuplicate(
    studentId: mongoose.Types.ObjectId,
    channel: string,
    templateKey: string,
    windowMinutes: number,
): Promise<boolean> {
    if (windowMinutes <= 0) return false;
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    const existing = await NotificationDeliveryLog.findOne({
        studentId,
        channel,
        status: 'sent',
        sentAtUTC: { $gte: cutoff },
        // match by template key stored in the job or duplicatePreventionKey
    }).lean();
    return !!existing;
}

/* ================================================================
   Quiet hours check
   ================================================================ */

function isInQuietHours(settings: INotificationSettings): boolean {
    if (!settings.quietHours?.enabled) return false;
    const { startHour, endHour } = settings.quietHours;
    const now = new Date();
    const hour = now.getUTCHours() + 6; // rough Asia/Dhaka offset
    const normalizedHour = hour >= 24 ? hour - 24 : hour;
    if (startHour <= endHour) {
        return normalizedHour >= startHour && normalizedHour < endHour;
    }
    // wraps midnight: e.g. 22–7
    return normalizedHour >= startHour || normalizedHour < endHour;
}

/* ================================================================
   Preview / Estimate
   ================================================================ */

export async function previewAndEstimate(
    opts: CampaignSendOptions,
): Promise<PreviewEstimate> {
    const recipients = await resolveAudience(opts.audienceType, {
        groupId: opts.audienceGroupId,
        filters: opts.audienceFilters,
        manualStudentIds: opts.manualStudentIds,
    });

    const finSettings = await FinanceSettings.findOne().lean();
    const smsCost = finSettings?.smsCostPerMessageBDT ?? 0.35;
    const emailCost = finSettings?.emailCostPerMessageBDT ?? 0.05;

    let smsCount = 0;
    let emailCount = 0;
    let guardianCount = 0;

    for (const r of recipients) {
        for (const ch of opts.channels) {
            if (ch === 'sms' && r.phone) smsCount++;
            if (ch === 'email' && r.email) emailCount++;
        }
        if (opts.guardianTargeted || opts.recipientMode === 'guardian' || opts.recipientMode === 'both') {
            guardianCount++;
            for (const ch of opts.channels) {
                if (ch === 'sms' && r.guardianPhone) smsCount++;
                if (ch === 'email' && r.guardianEmail) emailCount++;
            }
        }
    }

    const estimatedCostBDT = smsCount * smsCost + emailCount * emailCost;

    let sampleRendered: PreviewEstimate['sampleRendered'] | undefined;
    if (opts.templateKey) {
        const tpl = await NotificationTemplate.findOne({
            key: opts.templateKey.toUpperCase(),
            isEnabled: true,
        }).lean();
        if (tpl) {
            const sampleVars: Record<string, string> = {
                student_name: 'সাকিব আহমেদ',
                guardian_name: 'জনাব আহমেদ',
                ...(opts.vars ?? {}),
            };
            sampleRendered = {
                body: renderTemplate(tpl.body, sampleVars),
                subject: tpl.subject ? renderTemplate(tpl.subject, sampleVars) : undefined,
            };
        }
    } else if (opts.customBody) {
        sampleRendered = {
            body: renderTemplate(opts.customBody, opts.vars ?? {}),
            subject: opts.customSubject,
        };
    }

    return {
        recipientCount: recipients.length,
        guardianCount,
        channelBreakdown: { sms: smsCount, email: emailCount },
        estimatedCostBDT: Math.round(estimatedCostBDT * 100) / 100,
        sampleRendered,
    };
}

/* ================================================================
   Finance sync
   ================================================================ */

async function syncCostToFinance(
    channel: 'sms' | 'email',
    count: number,
    costPerMessage: number,
    sourceType: string,
    jobId: string,
    adminId: string,
    description: string,
): Promise<void> {
    const totalCost = count * costPerMessage;
    if (totalCost <= 0) return;
    const txnCode = await nextTxnCode();
    await FinanceTransaction.create({
        txnCode,
        direction: 'expense',
        amount: totalCost,
        currency: 'BDT',
        dateUTC: new Date(),
        accountCode: channel === 'sms' ? 'COM-SMS' : 'COM-EMAIL',
        categoryLabel: `${channel.toUpperCase()} Campaign Cost`,
        description,
        status: 'paid',
        method: 'auto',
        sourceType,
        sourceId: jobId,
        paidAtUTC: new Date(),
        createdByAdminId: new mongoose.Types.ObjectId(adminId),
    });
}

/* ================================================================
   Core campaign execution
   ================================================================ */

export async function executeCampaign(
    opts: CampaignSendOptions,
): Promise<{ jobId: string; sent: number; failed: number; skipped: number }> {
    const settings = await getSettings();

    // Check quiet hours for non-test sends
    if (!opts.testSend && !opts.scheduledAtUTC && isInQuietHours(settings)) {
        // Defer: create a scheduled job instead
        const manualStudentObjectIds = (opts.manualStudentIds ?? [])
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));
        const job = await NotificationJob.create({
            type: 'scheduled',
            campaignName: opts.campaignName,
            status: 'queued',
            channel: deriveJobChannel(opts.channels),
            target: deriveJobTarget(opts.audienceType),
            targetGroupId: opts.audienceGroupId && mongoose.Types.ObjectId.isValid(opts.audienceGroupId)
                ? new mongoose.Types.ObjectId(opts.audienceGroupId)
                : undefined,
            targetStudentIds: manualStudentObjectIds.length > 0 ? manualStudentObjectIds : undefined,
            targetFilterJson: opts.audienceFilters ? JSON.stringify(opts.audienceFilters) : undefined,
            audienceType: opts.audienceType,
            audienceRef: opts.audienceGroupId,
            templateKey: (opts.templateKey || 'CUSTOM').toUpperCase(),
            customBody: opts.customBody,
            recipientMode: opts.recipientMode ?? 'student',
            guardianTargeted: opts.guardianTargeted ?? false,
            triggerKey: opts.triggerKey,
            quietHoursApplied: true,
            createdByAdminId: new mongoose.Types.ObjectId(opts.adminId),
            totalTargets: 0,
            sentCount: 0,
            failedCount: 0,
            estimatedCost: 0,
            actualCost: 0,
        });
        return { jobId: String(job._id), sent: 0, failed: 0, skipped: 0 };
    }

    const recipients = await resolveAudience(opts.audienceType, {
        groupId: opts.audienceGroupId,
        filters: opts.audienceFilters,
        manualStudentIds: opts.manualStudentIds,
    });

    // For test send, limit to 1 recipient
    const targetRecipients = opts.testSend ? recipients.slice(0, 1) : recipients;

    // Get finance rates
    const finSettings = await FinanceSettings.findOne().lean();
    const smsCost = finSettings?.smsCostPerMessageBDT ?? 0.35;
    const emailCost = finSettings?.emailCostPerMessageBDT ?? 0.05;

    // Estimate cost
    const estimatedCost = targetRecipients.length * opts.channels.length *
        ((opts.channels.includes('sms') ? smsCost : 0) + (opts.channels.includes('email') ? emailCost : 0));

    // Create the job record
    const manualStudentObjectIds = (opts.manualStudentIds ?? [])
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
    const job = await NotificationJob.create({
        type: opts.scheduledAtUTC ? 'scheduled' : opts.triggerKey ? 'triggered' : 'bulk',
        campaignName: opts.campaignName,
        status: 'processing',
        channel: deriveJobChannel(opts.channels),
        target: deriveJobTarget(opts.audienceType),
        targetGroupId: opts.audienceGroupId && mongoose.Types.ObjectId.isValid(opts.audienceGroupId)
            ? new mongoose.Types.ObjectId(opts.audienceGroupId)
            : undefined,
        targetStudentIds: manualStudentObjectIds.length > 0 ? manualStudentObjectIds : undefined,
        targetFilterJson: opts.audienceFilters ? JSON.stringify(opts.audienceFilters) : undefined,
        audienceType: opts.audienceType,
        audienceRef: opts.audienceGroupId,
        totalTargets: targetRecipients.length,
        recipientMode: opts.recipientMode ?? 'student',
        guardianTargeted: opts.guardianTargeted ?? false,
        estimatedCost,
        templateKey: (opts.templateKey || 'CUSTOM').toUpperCase(),
        triggerKey: opts.triggerKey,
        customBody: opts.customBody,
        scheduledAtUTC: opts.scheduledAtUTC,
        createdByAdminId: new mongoose.Types.ObjectId(opts.adminId),
    });

    const jobId = String(job._id);
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let smsSentCount = 0;
    let emailSentCount = 0;

    // Resolve template(s)
    let template: { body: string; subject?: string; key: string } | null = null;
    if (opts.templateKey) {
        const tpl = await NotificationTemplate.findOne({
            key: opts.templateKey.toUpperCase(),
            isEnabled: true,
        }).lean();
        if (tpl) template = { body: tpl.body, subject: tpl.subject, key: tpl.key };
    }

    for (const recipient of targetRecipients) {
        const recipientMode = opts.recipientMode ?? 'student';
        const targets: Array<{
            to: string;
            channel: 'sms' | 'email';
            isGuardian: boolean;
            name: string;
        }> = [];

        // Build send targets
        for (const ch of opts.channels) {
            if (recipientMode === 'student' || recipientMode === 'both') {
                const addr = ch === 'sms' ? recipient.phone : recipient.email;
                if (addr) targets.push({ to: addr, channel: ch, isGuardian: false, name: recipient.fullName });
            }
            if (recipientMode === 'guardian' || recipientMode === 'both') {
                const addr = ch === 'sms' ? recipient.guardianPhone : recipient.guardianEmail;
                if (addr) targets.push({ to: addr, channel: ch, isGuardian: true, name: recipient.guardianName || recipient.fullName });
            }
        }

        for (const target of targets) {
            // Duplicate check
            if (!opts.testSend && settings.duplicatePreventionWindowMinutes > 0) {
                const dup = await isDuplicate(
                    recipient.userId,
                    target.channel,
                    opts.templateKey ?? opts.campaignName,
                    settings.duplicatePreventionWindowMinutes,
                );
                if (dup) { skipped++; continue; }
            }

            // Get provider
            const provider = await getActiveProvider(target.channel);
            if (!provider) { failed++; continue; }

            // Render body
            const mergedVars: Record<string, string> = {
                student_name: recipient.fullName,
                guardian_name: recipient.guardianName || '',
                ...(opts.vars ?? {}),
            };
            const body = template
                ? renderTemplate(template.body, mergedVars)
                : opts.customBody
                    ? renderTemplate(opts.customBody, mergedVars)
                    : '';
            const subject = template?.subject
                ? renderTemplate(template.subject, mergedVars)
                : opts.customSubject ?? '';

            let result: SendResult;
            try {
                if (target.channel === 'sms') {
                    result = await sendSMS({ to: target.to, body }, provider);
                } else {
                    result = await sendEmail(
                        { to: target.to, subject, html: body, text: body },
                        provider,
                    );
                }
            } catch (err: unknown) {
                result = { success: false, error: err instanceof Error ? err.message : String(err) };
            }

            // Create delivery log
            await NotificationDeliveryLog.create({
                jobId: job._id,
                campaignId: job._id,
                studentId: recipient.userId,
                channel: target.channel,
                providerUsed: provider.provider,
                to: target.to,
                status: result.success ? 'sent' : 'failed',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                sentAtUTC: result.success ? new Date() : undefined,
                guardianTargeted: target.isGuardian,
                costAmount: result.success
                    ? (target.channel === 'sms' ? smsCost : emailCost)
                    : 0,
            });

            if (result.success) {
                sent++;
                if (target.channel === 'sms') smsSentCount++;
                else emailSentCount++;
            } else {
                failed++;
            }
        }
    }

    // Update job with final stats
    const actualCost = smsSentCount * smsCost + emailSentCount * emailCost;
    const totalAttempts = sent + failed;
    const finalStatus =
        totalAttempts === 0
            ? 'done'
            : sent === 0 && failed > 0
                ? 'failed'
                : failed > 0
                    ? 'partial'
                    : 'done';

    await NotificationJob.findByIdAndUpdate(job._id, {
        status: finalStatus,
        sentCount: sent,
        failedCount: failed,
        actualCost,
        processedAtUTC: new Date(),
    });

    // Finance sync
    if (settings.autoSyncCostToFinance && !opts.testSend) {
        const sourceType = opts.triggerKey
            ? 'auto_notification_cost'
            : opts.guardianTargeted
                ? 'guardian_notification_cost'
                : opts.channels.includes('sms')
                    ? 'sms_campaign_cost'
                    : 'email_campaign_cost';

        if (smsSentCount > 0) {
            await syncCostToFinance(
                'sms', smsSentCount, smsCost, sourceType, jobId, opts.adminId,
                `SMS campaign: ${opts.campaignName}`,
            );
        }
        if (emailSentCount > 0) {
            await syncCostToFinance(
                'email', emailSentCount, emailCost, sourceType, jobId, opts.adminId,
                `Email campaign: ${opts.campaignName}`,
            );
        }
    }

    // Audit log
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(opts.adminId),
        action: opts.testSend ? 'notification_test_send' : 'notification_campaign_sent',
        target_id: job._id,
        target_type: 'NotificationJob',
        details: {
            campaignName: opts.campaignName,
            channels: opts.channels,
            recipientCount: targetRecipients.length,
            sent, failed, skipped,
            actualCost,
        },
    });

    return { jobId, sent, failed, skipped };
}

/* ================================================================
   Retry failed deliveries
   ================================================================ */

export async function retryFailedDeliveries(
    jobId: string,
    adminId: string,
): Promise<{ retried: number; succeeded: number; failed: number }> {
    const settings = await getSettings();
    const failedLogs = await NotificationDeliveryLog.find({
        jobId: new mongoose.Types.ObjectId(jobId),
        status: 'failed',
        retryCount: { $lt: settings.maxRetryCount },
    }).lean();

    let retried = 0;
    let succeeded = 0;
    let failedCount = 0;

    for (const log of failedLogs) {
        const provider = await getActiveProvider(log.channel as 'sms' | 'email');
        if (!provider) { failedCount++; continue; }

        let result: SendResult;
        try {
            if (log.channel === 'sms') {
                result = await sendSMS({ to: log.to, body: '' }, provider);
            } else {
                result = await sendEmail(
                    { to: log.to, subject: '', html: '', text: '' },
                    provider,
                );
            }
        } catch (err: unknown) {
            result = { success: false, error: err instanceof Error ? err.message : String(err) };
        }

        retried++;
        await NotificationDeliveryLog.findByIdAndUpdate(log._id, {
            status: result.success ? 'sent' : 'failed',
            providerMessageId: result.messageId,
            errorMessage: result.error,
            sentAtUTC: result.success ? new Date() : undefined,
            $inc: { retryCount: 1 },
        });

        if (result.success) succeeded++;
        else failedCount++;
    }

    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(adminId),
        action: 'notification_retry',
        target_id: new mongoose.Types.ObjectId(jobId),
        target_type: 'NotificationJob',
        details: { retried, succeeded, failed: failedCount },
    });

    return { retried, succeeded, failed: failedCount };
}

/* ================================================================
   Trigger-based auto send (called by cron / hooks)
   ================================================================ */

export async function triggerAutoSend(
    triggerKey: string,
    studentIds: string[],
    vars: Record<string, string>,
    adminId: string,
): Promise<{ jobId: string; sent: number; failed: number }> {
    const settings = await getSettings();
    const trigger = settings.triggers.find((t) => t.triggerKey === triggerKey);
    if (!trigger || !trigger.enabled) {
        return { jobId: '', sent: 0, failed: 0 };
    }

    return executeCampaign({
        campaignName: `Auto: ${triggerKey}`,
        channels: trigger.channels,
        templateKey: triggerKey,
        vars,
        audienceType: 'manual',
        manualStudentIds: studentIds,
        guardianTargeted: trigger.guardianIncluded,
        recipientMode: trigger.guardianIncluded ? 'both' : 'student',
        adminId,
        triggerKey,
    });
}

/* ================================================================
   Send account info to student (onboarding)
   ================================================================ */

export async function sendAccountInfo(
    studentId: string,
    channels: ('sms' | 'email')[],
    credentials: { username: string; tempPassword: string },
    adminId: string,
): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const channel of channels) {
        const result = await (await import('./notificationProviderService')).sendNotificationToStudent(
            studentId,
            'ACCOUNT_CREATED',
            channel,
            {
                username: credentials.username,
                temp_password: credentials.tempPassword,
                login_url: process.env.LOGIN_URL ?? '',
            },
        );
        if (result.success) sent++;
        else failed++;
    }

    // Update user record
    await User.findByIdAndUpdate(studentId, {
        accountInfoLastSentAtUTC: new Date(),
        accountInfoLastSentChannels: channels,
    });

    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(adminId),
        action: 'account_info_sent',
        target_id: new mongoose.Types.ObjectId(studentId),
        target_type: 'User',
        details: { channels, sent, failed },
    });

    return { sent, failed };
}

/* ================================================================
   Resend credentials
   ================================================================ */

export async function resendCredentials(
    studentId: string,
    channels: ('sms' | 'email')[],
    credentials: { username: string; tempPassword: string },
    adminId: string,
): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const channel of channels) {
        const result = await (await import('./notificationProviderService')).sendNotificationToStudent(
            studentId,
            'CREDENTIALS_RESEND',
            channel,
            {
                username: credentials.username,
                temp_password: credentials.tempPassword,
                login_url: process.env.LOGIN_URL ?? '',
            },
        );
        if (result.success) sent++;
        else failed++;
    }

    await User.findByIdAndUpdate(studentId, {
        credentialsLastResentAtUTC: new Date(),
    });

    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(adminId),
        action: 'credentials_resent',
        target_id: new mongoose.Types.ObjectId(studentId),
        target_type: 'User',
        details: { channels, sent, failed },
    });

    return { sent, failed };
}
