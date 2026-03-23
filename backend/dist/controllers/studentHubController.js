"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentMe = getStudentMe;
exports.getStudentMeExams = getStudentMeExams;
exports.getStudentMeExamById = getStudentMeExamById;
exports.getStudentMeResults = getStudentMeResults;
exports.getStudentMeResultByExam = getStudentMeResultByExam;
exports.getStudentMePayments = getStudentMePayments;
exports.getStudentMeNotifications = getStudentMeNotifications;
exports.markStudentNotificationsRead = markStudentNotificationsRead;
exports.getStudentMeResources = getStudentMeResources;
exports.getLeaderboard = getLeaderboard;
exports.studentSubmitPaymentProof = studentSubmitPaymentProof;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const Exam_1 = __importDefault(require("../models/Exam"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Resource_1 = __importDefault(require("../models/Resource"));
const StudentNotificationRead_1 = __importDefault(require("../models/StudentNotificationRead"));
const studentDashboardService_1 = require("../services/studentDashboardService");
const externalExamAttemptService_1 = require("../services/externalExamAttemptService");
const studentProfileScoreService_1 = require("../services/studentProfileScoreService");
const securityConfigService_1 = require("../services/securityConfigService");
function ensureStudent(req, res) {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return null;
    }
    if (req.user.role !== 'student') {
        res.status(403).json({ message: 'Student access only' });
        return null;
    }
    return req.user._id;
}
async function getProfileScoreThreshold() {
    const security = await (0, securityConfigService_1.getSecurityConfig)(true);
    if (security.examProtection.requireProfileScoreForExam) {
        return Number(security.examProtection.profileScoreThreshold || 70);
    }
    return 70;
}
function normalizeObjectIdArray(input) {
    if (!Array.isArray(input))
        return [];
    return input
        .map((item) => String(item || '').trim())
        .filter((value) => mongoose_1.default.Types.ObjectId.isValid(value));
}
function hasAnyIntersection(left, right) {
    if (!left.length || !right.length)
        return false;
    const rightSet = new Set(right);
    return left.some((item) => rightSet.has(item));
}
function pickNotificationCategory(raw) {
    const category = String(raw || '').trim().toLowerCase();
    if (category === 'exam')
        return 'exam';
    if (category === 'payment')
        return 'payment';
    return 'system';
}
async function getStudentMe(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const [user, profile, dashboardHeader, history, dueLedger, payments] = await Promise.all([
            User_1.default.findById(studentId)
                .select('username email full_name profile_photo subscription createdAt lastLogin')
                .lean(),
            StudentProfile_1.default.findOne({ user_id: studentId }).lean(),
            (0, studentDashboardService_1.getStudentDashboardHeader)(studentId),
            (0, studentDashboardService_1.getExamHistoryAndProgress)(studentId),
            StudentDueLedger_1.default.findOne({ studentId }).lean(),
            ManualPayment_1.default.find({ studentId }).sort({ date: -1, createdAt: -1 }).limit(5).lean(),
        ]);
        if (!user || !profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        const threshold = await getProfileScoreThreshold();
        const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile, user, threshold);
        const totalPaid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const pendingDue = Number(dueLedger?.netDue || 0);
        res.json({
            student: {
                _id: String(user._id),
                username: user.username,
                email: user.email,
                fullName: String(profile.full_name || user.full_name || user.username),
                userId: String(profile.user_unique_id || ''),
                avatar: String(profile.profile_photo_url || user.profile_photo || ''),
                profileScore: scoreResult.score,
                profileScoreThreshold: scoreResult.threshold,
                profileEligibleForExam: scoreResult.eligible,
                profileScoreBreakdown: scoreResult.breakdown,
                missingProfileFields: scoreResult.missingFields,
                overallRank: dashboardHeader.overallRank,
                groupRank: dashboardHeader.groupRank,
                subscription: dashboardHeader.subscription,
                lastLogin: user.lastLogin || null,
                createdAt: user.createdAt,
            },
            stats: {
                totalExamsAttempted: Number(history.progress.totalExams || 0),
                averageScore: Number(history.progress.avgScore || 0),
                bestScore: Number(history.progress.bestScore || 0),
                leaderboardPoints: history.history.reduce((sum, item) => {
                    const rankBonus = item.rank ? Math.max(0, 100 - Number(item.rank)) : 0;
                    return sum + Number(item.percentage || 0) + rankBonus;
                }, 0),
            },
            payments: {
                totalPaid,
                pendingDue,
                pendingCount: pendingDue > 0 ? 1 : 0,
                lastSuccessfulPayment: payments.length > 0 ? {
                    amount: Number(payments[0].amount || 0),
                    method: String(payments[0].method || 'manual'),
                    paidAt: payments[0].date || null,
                } : null,
            },
            profile: profile,
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getStudentMe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMeExams(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const [cards, history] = await Promise.all([
            (0, studentDashboardService_1.getUpcomingExamCards)(studentId),
            (0, studentDashboardService_1.getExamHistoryAndProgress)(studentId),
        ]);
        const live = cards.filter((item) => item.status === 'live');
        const upcoming = cards.filter((item) => item.status === 'upcoming');
        const missed = cards.filter((item) => item.status === 'completed' && Number(item.attemptsUsed || 0) === 0);
        const completed = history.history;
        res.json({
            live,
            upcoming,
            completed,
            missed,
            all: cards,
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getStudentMeExams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMeExamById(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const examId = String(req.params.examId || '').trim();
        if (!mongoose_1.default.Types.ObjectId.isValid(examId)) {
            res.status(400).json({ message: 'Invalid exam id' });
            return;
        }
        const [exam, user, profile, dueLedger, resultCount, externalAttemptCount, myResult] = await Promise.all([
            Exam_1.default.findById(examId).lean(),
            User_1.default.findById(studentId).select('subscription').lean(),
            StudentProfile_1.default.findOne({ user_id: studentId }).lean(),
            StudentDueLedger_1.default.findOne({ studentId }).lean(),
            ExamResult_1.default.countDocuments({ exam: examId, student: studentId }),
            (0, externalExamAttemptService_1.getExternalExamAttemptCount)(examId, studentId),
            ExamResult_1.default.findOne({ exam: examId, student: studentId }).sort({ submittedAt: -1 }).lean(),
        ]);
        if (!exam) {
            res.status(404).json({ message: 'Exam not found' });
            return;
        }
        const threshold = await getProfileScoreThreshold();
        const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile, user, threshold);
        const accessControl = (exam.accessControl && typeof exam.accessControl === 'object')
            ? exam.accessControl
            : {};
        const requiredUserIds = normalizeObjectIdArray(accessControl.allowedUserIds);
        const requiredGroupIds = normalizeObjectIdArray(accessControl.allowedGroupIds);
        const visibilityMode = String(exam.visibilityMode || 'all_students');
        const targetGroupIds = normalizeObjectIdArray(exam.targetGroupIds || []);
        const requiredPlanCodes = Array.isArray(accessControl.allowedPlanCodes)
            ? accessControl.allowedPlanCodes.map((item) => String(item || '').toLowerCase()).filter(Boolean)
            : [];
        const studentGroupIds = normalizeObjectIdArray(profile?.groupIds || []);
        const subscriptionRequired = Boolean(exam.subscriptionRequired)
            || Boolean(exam.requiresActiveSubscription)
            || visibilityMode === 'subscription_only'
            || requiredPlanCodes.length > 0;
        const studentPlanCode = String(user?.subscription?.planCode ||
            user?.subscription?.plan ||
            '').toLowerCase();
        const subscriptionExpiryRaw = user?.subscription?.expiryDate;
        const subscriptionExpiryTime = subscriptionExpiryRaw ? new Date(String(subscriptionExpiryRaw)).getTime() : 0;
        const subscriptionActive = Boolean(user?.subscription?.isActive &&
            Number.isFinite(subscriptionExpiryTime) &&
            subscriptionExpiryTime > Date.now());
        const planEligible = requiredPlanCodes.length === 0 || requiredPlanCodes.includes(studentPlanCode);
        const subscriptionEligible = !subscriptionRequired || subscriptionActive;
        const paymentRequired = subscriptionRequired && subscriptionActive;
        const pendingDue = Number(dueLedger?.netDue || 0);
        const paymentPaid = !paymentRequired || pendingDue <= 0;
        const examWindowOpen = new Date(exam.startDate).getTime() <= Date.now() && Date.now() <= new Date(exam.endDate).getTime();
        const attemptLimit = Number(exam.attemptLimit || 1);
        const attemptsUsed = Math.max(Number(resultCount || 0), Number(externalAttemptCount || 0));
        const attemptsLeft = Math.max(0, attemptLimit - attemptsUsed);
        const userEligible = requiredUserIds.length === 0 || requiredUserIds.includes(studentId);
        const groupEligible = requiredGroupIds.length === 0 || hasAnyIntersection(requiredGroupIds, studentGroupIds);
        const visibilityGroupEligible = !((visibilityMode === 'group_only' || visibilityMode === 'custom')
            && targetGroupIds.length > 0
            && !hasAnyIntersection(targetGroupIds, studentGroupIds));
        const assignedEligible = String(exam.accessMode || 'all') !== 'specific'
            || (Array.isArray(exam.allowedUsers) && exam.allowedUsers.some((id) => String(id) === studentId));
        if (!userEligible || !groupEligible || !visibilityGroupEligible || !assignedEligible) {
            res.status(403).json({
                message: 'You are not assigned to this exam.',
                eligibility: {
                    eligible: false,
                    checks: {
                        access: {
                            userRestricted: requiredUserIds.length > 0,
                            groupRestricted: requiredGroupIds.length > 0 || targetGroupIds.length > 0,
                            passed: false,
                        },
                    },
                },
            });
            return;
        }
        const eligible = Boolean(scoreResult.eligible &&
            subscriptionEligible &&
            planEligible &&
            userEligible &&
            groupEligible &&
            visibilityGroupEligible &&
            assignedEligible &&
            paymentPaid &&
            examWindowOpen &&
            attemptsLeft > 0 &&
            exam.isPublished);
        res.json({
            exam: {
                ...exam,
                attemptsUsed,
                attemptsLeft,
            },
            eligibility: {
                eligible,
                checks: {
                    profileScore: {
                        required: scoreResult.threshold,
                        current: scoreResult.score,
                        passed: scoreResult.eligible,
                    },
                    payment: {
                        required: paymentRequired,
                        pendingDue,
                        passed: paymentPaid,
                    },
                    subscription: {
                        required: subscriptionRequired,
                        active: subscriptionActive,
                        passed: subscriptionEligible,
                    },
                    plan: {
                        requiredPlanCodes,
                        studentPlanCode,
                        passed: planEligible,
                    },
                    access: {
                        userRestricted: requiredUserIds.length > 0,
                        groupRestricted: requiredGroupIds.length > 0 || targetGroupIds.length > 0,
                        passed: userEligible && groupEligible && visibilityGroupEligible && assignedEligible,
                    },
                    examWindow: {
                        passed: examWindowOpen,
                    },
                },
            },
            latestResult: myResult || null,
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getStudentMeExamById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMeResults(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const payload = await (0, studentDashboardService_1.getExamHistoryAndProgress)(studentId);
        const leaderboardPoints = payload.history.reduce((sum, item) => {
            const rankBonus = item.rank ? Math.max(0, 100 - Number(item.rank)) : 0;
            return sum + Number(item.percentage || 0) + rankBonus;
        }, 0);
        res.json({
            items: payload.history,
            progress: payload.progress,
            badges: payload.badges,
            leaderboardPoints,
            lastUpdatedAt: payload.lastUpdatedAt,
        });
    }
    catch (error) {
        console.error('getStudentMeResults error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMeResultByExam(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const examId = String(req.params.examId || '').trim();
        if (!mongoose_1.default.Types.ObjectId.isValid(examId)) {
            res.status(400).json({ message: 'Invalid exam id' });
            return;
        }
        const result = await ExamResult_1.default.findOne({ exam: examId, student: studentId })
            .populate('exam', 'title subject totalMarks totalQuestions reviewSettings resultPublishDate')
            .sort({ submittedAt: -1 })
            .lean();
        if (!result) {
            res.status(404).json({ message: 'Result not found' });
            return;
        }
        const exam = result.exam || {};
        const totalParticipants = await ExamResult_1.default.countDocuments({ exam: examId });
        const rank = Number(result.rank || 0) || null;
        const percentile = rank && totalParticipants > 0
            ? Number((((totalParticipants - rank) / totalParticipants) * 100).toFixed(2))
            : null;
        const answers = Array.isArray(result.answers) ? result.answers : [];
        const correctCount = Number(result.correctCount || answers.filter((item) => Boolean(item.isCorrect)).length);
        const wrongCount = Number(result.wrongCount || answers.filter((item) => item.selectedAnswer && !item.isCorrect).length);
        const unansweredCount = Math.max(0, Number(exam.totalQuestions || answers.length) - correctCount - wrongCount);
        res.json({
            result: {
                resultId: String(result._id),
                examId: String(exam._id || examId),
                examTitle: String(exam.title || ''),
                subject: String(exam.subject || ''),
                totalMarks: Number(result.totalMarks || exam.totalMarks || 0),
                obtainedMarks: Number(result.obtainedMarks || 0),
                percentage: Number(result.percentage || 0),
                correctCount,
                wrongCount,
                unansweredCount,
                timeTaken: Number(result.timeTaken || 0),
                rank,
                percentile,
                totalParticipants,
                submittedAt: result.submittedAt,
                reviewSettings: exam.reviewSettings || {},
                answers,
            },
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getStudentMeResultByExam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMePayments(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const [payments, dueLedger] = await Promise.all([
            ManualPayment_1.default.find({ studentId }).sort({ date: -1, createdAt: -1 }).lean(),
            StudentDueLedger_1.default.findOne({ studentId }).lean(),
        ]);
        const items = payments.map((item) => ({
            _id: String(item._id),
            studentId: String(item.studentId),
            examId: item.examId ? String(item.examId) : null,
            amount: Number(item.amount || 0),
            currency: String(item.currency || 'BDT'),
            method: item.method,
            status: ['pending', 'paid', 'failed', 'refunded'].includes(String(item.status || ''))
                ? String(item.status || 'pending')
                : 'pending',
            transactionId: String(item.transactionId || item.reference || ''),
            reference: String(item.reference || ''),
            createdAt: item.createdAt || new Date(),
            paidAt: String(item.status || '') === 'paid'
                ? (item.paidAt || item.date)
                : null,
            notes: String(item.notes || ''),
        }));
        const pendingDue = Number(dueLedger?.netDue || 0);
        if (pendingDue > 0) {
            items.unshift({
                _id: `due-${studentId}`,
                studentId: String(studentId),
                examId: null,
                amount: pendingDue,
                currency: 'BDT',
                method: 'manual',
                status: 'pending',
                transactionId: '',
                reference: '',
                createdAt: dueLedger?.updatedAt || new Date(),
                paidAt: null,
                notes: String(dueLedger?.note || 'Outstanding due'),
            });
        }
        const totalPaid = payments
            .filter((item) => String(item.status || '') === 'paid')
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const lastPaid = payments.find((item) => String(item.status || '') === 'paid') || null;
        res.json({
            summary: {
                totalPaid,
                pendingAmount: pendingDue,
                pendingCount: pendingDue > 0 ? 1 : 0,
                lastPayment: lastPaid ? {
                    amount: Number(lastPaid.amount || 0),
                    method: lastPaid.method,
                    date: lastPaid.date,
                } : null,
            },
            items,
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getStudentMePayments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMeNotifications(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const type = String(req.query.type || '').trim().toLowerCase();
        const now = new Date();
        const filter = {
            isActive: true,
            targetRole: { $in: ['student', 'all'] },
            $or: [
                { targetUserIds: { $exists: false } },
                { targetUserIds: { $size: 0 } },
                { targetUserIds: new mongoose_1.default.Types.ObjectId(studentId) },
            ],
            $and: [
                { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
                { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
            ],
        };
        const rows = await Notification_1.default.find(filter).sort({ publishAt: -1, createdAt: -1 }).lean();
        const notificationIds = rows.map((row) => row._id);
        const reads = await StudentNotificationRead_1.default.find({
            studentId,
            notificationId: { $in: notificationIds },
        }).lean();
        const readSet = new Set(reads.map((item) => String(item.notificationId)));
        const items = rows
            .map((item) => ({
            _id: String(item._id),
            title: item.title,
            body: item.message,
            type: pickNotificationCategory(item.category),
            category: item.category,
            isRead: readSet.has(String(item._id)),
            createdAt: item.createdAt,
            publishAt: item.publishAt || item.createdAt,
            linkUrl: item.linkUrl || '',
        }))
            .filter((item) => !type || type === 'all' || item.type === type);
        res.json({ items, unreadCount: items.filter((item) => !item.isRead).length, lastUpdatedAt: new Date().toISOString() });
    }
    catch (error) {
        console.error('getStudentMeNotifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function markStudentNotificationsRead(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const idsRaw = Array.isArray(req.body.ids)
            ? req.body.ids
            : [];
        const ids = idsRaw
            .map((id) => String(id || '').trim())
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_1.default.Types.ObjectId(id));
        let targetIds = ids;
        if (targetIds.length === 0) {
            const now = new Date();
            const allRows = await Notification_1.default.find({
                isActive: true,
                targetRole: { $in: ['student', 'all'] },
                $or: [
                    { targetUserIds: { $exists: false } },
                    { targetUserIds: { $size: 0 } },
                    { targetUserIds: new mongoose_1.default.Types.ObjectId(studentId) },
                ],
                $and: [
                    { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
                    { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
                ],
            }).select('_id').lean();
            targetIds = allRows.map((row) => row._id);
        }
        if (targetIds.length === 0) {
            res.json({ updated: 0 });
            return;
        }
        const bulkOps = targetIds.map((notificationId) => ({
            updateOne: {
                filter: { studentId: new mongoose_1.default.Types.ObjectId(studentId), notificationId },
                update: { $set: { readAt: new Date() } },
                upsert: true,
            },
        }));
        await StudentNotificationRead_1.default.bulkWrite(bulkOps);
        res.json({ updated: targetIds.length });
    }
    catch (error) {
        console.error('markStudentNotificationsRead error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getStudentMeResources(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const category = String(req.query.category || '').trim();
        const q = String(req.query.q || '').trim();
        const filter = { isPublic: true };
        if (category && category.toLowerCase() !== 'all')
            filter.category = category;
        if (q) {
            const regex = new RegExp(q, 'i');
            filter.$or = [{ title: regex }, { description: regex }, { category: regex }];
        }
        const rows = await Resource_1.default.find(filter)
            .sort({ isFeatured: -1, order: 1, publishDate: -1 })
            .lean();
        const categories = Array.from(new Set(rows.map((row) => String(row.category || 'General'))));
        res.json({
            items: rows,
            categories,
            total: rows.length,
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getStudentMeResources error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getLeaderboard(req, res) {
    try {
        const { limit = '50', offset = '0' } = req.query;
        const limitNum = Math.min(100, parseInt(limit));
        const offsetNum = Math.max(0, parseInt(offset));
        const topStudents = await StudentProfile_1.default.find({})
            .sort({ points: -1 })
            .skip(offsetNum)
            .limit(limitNum)
            .select('user_id full_name profile_photo_url points rank')
            .lean();
        const total = await StudentProfile_1.default.countDocuments({});
        // Get my rank
        let myRank = null;
        if (req.user) {
            const me = await StudentProfile_1.default.findOne({ user_id: req.user._id }).select('rank').lean();
            myRank = me?.rank || null;
        }
        res.json({
            items: topStudents.map((s, idx) => ({
                id: s.user_id,
                name: s.full_name,
                avatar: s.profile_photo_url,
                points: s.points,
                rank: s.rank || (offsetNum + idx + 1)
            })),
            total,
            myRank,
            lastUpdatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('getLeaderboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function studentSubmitPaymentProof(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const { amount, method, reference, notes, proofUrl, entryType, subscriptionPlanId } = req.body;
        if (!amount || Number(amount) <= 0) {
            res.status(400).json({ message: 'Valid amount is required' });
            return;
        }
        const payment = await ManualPayment_1.default.create({
            studentId,
            examId: req.body?.examId || null,
            amount: Number(amount),
            currency: String(req.body?.currency || 'BDT'),
            method: method || 'manual',
            status: 'pending',
            transactionId: String(req.body?.transactionId || '').trim(),
            reference: reference || '',
            proofUrl: proofUrl || '',
            proofFileUrl: proofUrl || '',
            notes: notes || '',
            entryType: entryType || 'subscription',
            subscriptionPlanId: subscriptionPlanId || null,
            date: new Date(),
            recordedBy: studentId, // Initially recorded by student
        });
        // Notify admins
        // notification logic here (optional but good)
        res.status(201).json({
            message: 'Payment proof submitted. Waiting for admin approval.',
            paymentId: payment._id
        });
    }
    catch (error) {
        console.error('studentSubmitPaymentProof error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=studentHubController.js.map