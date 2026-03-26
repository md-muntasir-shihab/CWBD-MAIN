"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExamCronJobs = startExamCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const ExamSession_1 = __importDefault(require("../models/ExamSession"));
const ExamEvent_1 = __importDefault(require("../models/ExamEvent"));
const examFinalizationService_1 = require("../services/examFinalizationService");
const jobRunLogService_1 = require("../services/jobRunLogService");
async function autoSubmitExpiredSession(session) {
    try {
        const result = await (0, examFinalizationService_1.finalizeExamSession)({
            examId: String(session.exam),
            studentId: String(session.student),
            attemptId: String(session._id),
            submissionType: 'auto_expired',
            isAutoSubmit: true,
            now: new Date(),
            requestMeta: {
                ipAddress: String(session.ipAddress || ''),
                userAgent: 'CampusWay-Cron',
            },
        });
        if (!result.ok) {
            if (Number(result.statusCode || 0) === 423) {
                console.info(`[CRON] Skipped locked attempt ${session._id}`);
                return;
            }
            console.warn(`[CRON] Skipped attempt ${session._id} -> ${result.statusCode}: ${result.message}`);
            return;
        }
        await ExamEvent_1.default.create({
            attempt: session._id,
            student: String(session.student),
            exam: String(session.exam),
            eventType: 'submit',
            metadata: {
                action: 'auto_submit_cron',
                score: result.obtainedMarks,
                percentage: result.percentage,
            },
            ip: String(session.ipAddress || ''),
            userAgent: 'CampusWay-Cron',
        });
        console.log(`[CRON] Auto-submitted expired ExamSession: ${session._id} for student ${session.student}`);
    }
    catch (error) {
        console.error(`[CRON] Error auto-submitting session ${session._id}:`, error);
    }
}
function startExamCronJobs() {
    console.log('[cron] Starting exam auto-submit worker (every minute).');
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            await (0, jobRunLogService_1.runJobWithLog)('exam.autosubmit_expired_sessions', async () => {
                const now = new Date();
                const bufferTime = new Date(now.getTime() - 5000);
                const expiredSessions = await ExamSession_1.default.find({
                    isActive: true,
                    sessionLocked: { $ne: true },
                    expiresAt: { $lt: bufferTime },
                    status: { $in: ['in_progress', 'expired'] },
                }).select('_id exam student attemptNo expiresAt status ipAddress').lean();
                if (expiredSessions.length === 0) {
                    return { summary: { expiredSessions: 0, processed: 0 } };
                }
                console.log(`[CRON] Found ${expiredSessions.length} expired exam sessions. Processing...`);
                await Promise.all(expiredSessions.map((session) => autoSubmitExpiredSession(session)));
                return { summary: { expiredSessions: expiredSessions.length, processed: expiredSessions.length } };
            });
        }
        catch (error) {
            console.error('[CRON] Error in auto-submit cron job:', error);
        }
    });
}
//# sourceMappingURL=examJobs.js.map