"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSubscriptionExpiryCron = startSubscriptionExpiryCron;
const node_cron_1 = __importDefault(require("node-cron"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const User_1 = __importDefault(require("../models/User"));
const ActiveSession_1 = __importDefault(require("../models/ActiveSession"));
const StudentSettings_1 = require("../models/StudentSettings");
const notificationProviderService_1 = require("../services/notificationProviderService");
const notificationOrchestrationService_1 = require("../services/notificationOrchestrationService");
const subscriptionLifecycleService_1 = require("../services/subscriptionLifecycleService");
const logger_1 = require("../utils/logger");
// Map reminder day count to template key
const REMINDER_TEMPLATE_MAP = {
    7: 'SUB_EXPIRY_7D',
    3: 'SUB_EXPIRY_3D',
    1: 'SUB_EXPIRY_1D',
};
function dayStart(d) {
    const s = new Date(d);
    s.setUTCHours(0, 0, 0, 0);
    return s;
}
function dayEnd(d) {
    const e = new Date(d);
    e.setUTCHours(23, 59, 59, 999);
    return e;
}
function buildRenewalUrl(plan) {
    const frontEndUrl = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
    const slug = String(plan?.['slug'] || plan?.['code'] || '').trim();
    const path = slug ? `/subscription-plans/checkout/${slug}` : '/subscription-plans';
    return frontEndUrl ? `${frontEndUrl}${path}` : path;
}
async function runSubscriptionExpiryCheck() {
    logger_1.logger.info('[subscriptionExpiryCron] Starting run');
    // 1. Load settings
    let settings;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings = await StudentSettings_1.StudentSettingsModel.getDefault();
    }
    catch (err) {
        logger_1.logger.error('[subscriptionExpiryCron] Failed to load StudentSettings', undefined, {
            error: String(err),
        });
        return;
    }
    const now = new Date();
    // -------------------------------------------------------------------------
    // 2. Send reminder notifications
    // -------------------------------------------------------------------------
    const reminderDays = Array.isArray(settings['expiryReminderDays'])
        ? settings['expiryReminderDays']
        : [7, 3, 1];
    for (const reminderDay of reminderDays) {
        const targetDate = new Date(now.getTime() + reminderDay * 24 * 60 * 60 * 1000);
        const windowStart = dayStart(targetDate);
        const windowEnd = dayEnd(targetDate);
        const todayStart = dayStart(now);
        const todayEnd = dayEnd(now);
        const templateKey = REMINDER_TEMPLATE_MAP[reminderDay] ?? `SUB_EXPIRY_${reminderDay}D`;
        let subscriptionsToRemind = [];
        try {
            subscriptionsToRemind = await UserSubscription_1.default.find({
                status: 'active',
                expiresAtUTC: { $gte: windowStart, $lte: windowEnd },
                $or: [
                    { lastReminderSentAtUTC: null },
                    { lastReminderSentAtUTC: { $exists: false } },
                    { lastReminderSentAtUTC: { $lt: todayStart } },
                ],
            })
                .populate('planId', 'name slug code allowsSMSUpdates allowsEmailUpdates')
                .lean();
        }
        catch (err) {
            logger_1.logger.error(`[subscriptionExpiryCron] Failed to query reminders for day ${reminderDay}`, undefined, { error: String(err) });
            continue;
        }
        logger_1.logger.info(`[subscriptionExpiryCron] Reminder day=${reminderDay}: found ${subscriptionsToRemind.length} subscriptions`);
        for (const sub of subscriptionsToRemind) {
            try {
                if (sub['lastReminderSentAtUTC']) {
                    const lastSent = new Date(sub['lastReminderSentAtUTC']);
                    if (lastSent >= todayStart && lastSent <= todayEnd) {
                        continue;
                    }
                }
                const user = await User_1.default.findById(sub['userId']).select('full_name email phone_number').lean();
                const plan = sub['planId'] || {};
                const expiryDateStr = new Date(sub['expiresAtUTC']).toISOString().split('T')[0];
                const vars = {
                    expiry_date: expiryDateStr,
                    plan_name: String(plan['name'] || ''),
                    renewal_url: buildRenewalUrl(plan),
                    student_name: user?.full_name ?? '',
                };
                if (plan['allowsSMSUpdates'] !== false) {
                    try {
                        await (0, notificationProviderService_1.sendNotificationToStudent)(sub['userId'], templateKey, 'sms', vars);
                    }
                    catch (smsErr) {
                        logger_1.logger.warn(`[subscriptionExpiryCron] SMS reminder failed for userId=${sub['userId']}`, undefined, { error: String(smsErr) });
                    }
                }
                if (plan['allowsEmailUpdates'] !== false) {
                    try {
                        await (0, notificationProviderService_1.sendNotificationToStudent)(sub['userId'], templateKey, 'email', vars);
                    }
                    catch (emailErr) {
                        logger_1.logger.warn(`[subscriptionExpiryCron] Email reminder failed for userId=${sub['userId']}`, undefined, { error: String(emailErr) });
                    }
                }
                await UserSubscription_1.default.findByIdAndUpdate(sub['_id'], {
                    $set: { lastReminderSentAtUTC: now },
                });
                logger_1.logger.info(`[subscriptionExpiryCron] Reminder sent to userId=${sub['userId']} templateKey=${templateKey}`);
            }
            catch (err) {
                logger_1.logger.error(`[subscriptionExpiryCron] Error processing reminder for sub._id=${sub['_id']}`, undefined, { error: String(err) });
            }
        }
    }
    // -------------------------------------------------------------------------
    // 3. Expire overdue subscriptions
    // -------------------------------------------------------------------------
    if (!settings['autoExpireEnabled']) {
        logger_1.logger.info('[subscriptionExpiryCron] autoExpireEnabled=false, skipping expiry step');
        return;
    }
    let overdueSubscriptions = [];
    try {
        overdueSubscriptions = await UserSubscription_1.default.find({
            status: 'active',
            expiresAtUTC: { $lte: now },
        })
            .populate('planId', 'name slug code allowsSMSUpdates allowsEmailUpdates')
            .lean();
    }
    catch (err) {
        logger_1.logger.error('[subscriptionExpiryCron] Failed to query overdue subscriptions', undefined, {
            error: String(err),
        });
        return;
    }
    logger_1.logger.info(`[subscriptionExpiryCron] Found ${overdueSubscriptions.length} overdue subscriptions to expire`);
    for (const sub of overdueSubscriptions) {
        try {
            await UserSubscription_1.default.findByIdAndUpdate(sub['_id'], {
                $set: { status: 'expired' },
            });
            logger_1.logger.info(`[subscriptionExpiryCron] Expired subscription _id=${sub['_id']} userId=${sub['userId']}`);
        }
        catch (err) {
            logger_1.logger.error(`[subscriptionExpiryCron] Failed to expire subscription _id=${sub['_id']}`, undefined, { error: String(err) });
            continue;
        }
        try {
            const userUpdate = {};
            const plan = sub['planId'] || {};
            await (0, subscriptionLifecycleService_1.syncUserSubscriptionCache)({
                userId: String(sub['userId'] || ''),
                plan,
                status: 'expired',
                startAtUTC: sub['startAtUTC'] ? new Date(String(sub['startAtUTC'])) : null,
                expiresAtUTC: sub['expiresAtUTC'] ? new Date(String(sub['expiresAtUTC'])) : null,
            });
            if (settings['passwordResetOnExpiry']) {
                userUpdate['mustChangePassword'] = true;
                userUpdate['passwordResetRequired'] = true;
            }
            if (Object.keys(userUpdate).length > 0) {
                await User_1.default.findByIdAndUpdate(sub['userId'], { $set: userUpdate });
                logger_1.logger.info(`[subscriptionExpiryCron] Updated user expiry-side flags for userId=${sub['userId']}`);
            }
        }
        catch (err) {
            logger_1.logger.error(`[subscriptionExpiryCron] Failed to update user for subscription _id=${sub['_id']}`, undefined, { error: String(err) });
        }
        try {
            const deleteResult = await ActiveSession_1.default.deleteMany({ user_id: sub['userId'] });
            logger_1.logger.info(`[subscriptionExpiryCron] Revoked ${deleteResult.deletedCount} sessions for userId=${sub['userId']}`);
        }
        catch (err) {
            logger_1.logger.error(`[subscriptionExpiryCron] Failed to revoke sessions for userId=${sub['userId']}`, undefined, { error: String(err) });
        }
        try {
            const plan = sub['planId'] || {};
            const expiryDateStr = new Date(sub['expiresAtUTC']).toISOString().split('T')[0];
            const vars = {
                expiry_date: expiryDateStr,
                plan_name: String(plan['name'] || ''),
                renewal_url: buildRenewalUrl(plan),
            };
            if (plan['allowsSMSUpdates'] !== false) {
                try {
                    await (0, notificationProviderService_1.sendNotificationToStudent)(sub['userId'], 'SUB_EXPIRED', 'sms', vars);
                }
                catch { /* non-fatal */ }
            }
            if (plan['allowsEmailUpdates'] !== false) {
                try {
                    await (0, notificationProviderService_1.sendNotificationToStudent)(sub['userId'], 'SUB_EXPIRED', 'email', vars);
                }
                catch { /* non-fatal */ }
            }
            logger_1.logger.info(`[subscriptionExpiryCron] SUB_EXPIRED notification dispatched for userId=${sub['userId']}`);
        }
        catch (err) {
            logger_1.logger.error(`[subscriptionExpiryCron] Failed to send SUB_EXPIRED notification for userId=${sub['userId']}`, undefined, { error: String(err) });
        }
    }
    logger_1.logger.info('[subscriptionExpiryCron] Run complete');
    // 4. Trigger automatic audience-based notifications for subscription state changes
    try {
        const expiredUserIds = overdueSubscriptions.map(s => String(s['userId'])).filter(Boolean);
        if (expiredUserIds.length > 0) {
            await (0, notificationOrchestrationService_1.triggerAutoSend)('subscription_expired', expiredUserIds, {}, 'system');
            logger_1.logger.info('[subscriptionExpiryCron] triggerAutoSend(subscription_expired) dispatched');
        }
    }
    catch (err) {
        logger_1.logger.error('[subscriptionExpiryCron] triggerAutoSend failed', undefined, { error: String(err) });
    }
}
function startSubscriptionExpiryCron() {
    // Daily at 01:00 UTC
    node_cron_1.default.schedule('0 1 * * *', async () => {
        try {
            await runSubscriptionExpiryCheck();
        }
        catch (err) {
            logger_1.logger.error('[subscriptionExpiryCron] Unhandled error in cron run', undefined, {
                error: String(err),
            });
        }
    });
    logger_1.logger.info('[subscriptionExpiryCron] Scheduled daily at 01:00 UTC');
}
//# sourceMappingURL=subscriptionExpiryCron.js.map