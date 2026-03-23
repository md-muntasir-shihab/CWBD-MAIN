"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverallRankForStudent = getOverallRankForStudent;
exports.getStudentDashboardHeader = getStudentDashboardHeader;
exports.getUpcomingExamCards = getUpcomingExamCards;
exports.getFeaturedUniversities = getFeaturedUniversities;
exports.getStudentNotifications = getStudentNotifications;
exports.getExamHistoryAndProgress = getExamHistoryAndProgress;
exports.getStudentDashboardAggregate = getStudentDashboardAggregate;
exports.getStudentLiveAlerts = getStudentLiveAlerts;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const Exam_1 = __importDefault(require("../models/Exam"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const ExamSession_1 = __importDefault(require("../models/ExamSession"));
const University_1 = __importDefault(require("../models/University"));
const Notification_1 = __importDefault(require("../models/Notification"));
const StudentDashboardConfig_1 = __importDefault(require("../models/StudentDashboardConfig"));
const StudentBadge_1 = __importDefault(require("../models/StudentBadge"));
const StudentApplication_1 = __importDefault(require("../models/StudentApplication"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const examCardMetricsService_1 = require("./examCardMetricsService");
const externalExamAttemptService_1 = require("./externalExamAttemptService");
const securityConfigService_1 = require("./securityConfigService");
async function ensureDashboardConfig() {
    let config = await StudentDashboardConfig_1.default.findOne().lean();
    if (!config) {
        await StudentDashboardConfig_1.default.create({});
        config = await StudentDashboardConfig_1.default.findOne().lean();
    }
    return config;
}
function normalizeDepartment(value) {
    return String(value || '').trim().toLowerCase();
}
function matchFilterList(filterList, value) {
    const normalizedValue = normalizeDepartment(value);
    const list = Array.isArray(filterList)
        ? filterList.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
        : [];
    if (list.length === 0)
        return true;
    return list.includes(normalizedValue);
}
function normalizeObjectIdArray(input) {
    if (!Array.isArray(input))
        return [];
    return input
        .map((item) => {
        if (!item)
            return '';
        if (typeof item === 'string')
            return item;
        if (typeof item === 'object' && '_id' in item) {
            return String(item._id || '');
        }
        return String(item);
    })
        .map((item) => item.trim())
        .filter(Boolean);
}
function hasAnyIntersection(left, right) {
    if (left.length === 0 || right.length === 0)
        return false;
    const rightSet = new Set(right);
    return left.some((item) => rightSet.has(item));
}
function toStatus(startDate, endDate, attemptsLeft) {
    const now = new Date();
    if (attemptsLeft <= 0)
        return 'closed';
    if (now < startDate)
        return 'upcoming';
    if (now >= startDate && now <= endDate)
        return 'live';
    return 'completed';
}
async function getOverallRankForStudent(studentId) {
    const board = await ExamResult_1.default.aggregate([
        { $match: { status: 'evaluated' } },
        {
            $group: {
                _id: '$student',
                avgPercentage: { $avg: '$percentage' },
                attempts: { $sum: 1 },
                totalObtained: { $sum: '$obtainedMarks' },
            }
        },
        { $sort: { avgPercentage: -1, attempts: -1, totalObtained: -1 } },
    ]);
    const idx = board.findIndex((item) => String(item._id) === String(studentId));
    if (idx === -1)
        return null;
    return idx + 1;
}
async function getStudentDashboardHeader(studentId) {
    const [user, profile, config, overallRank, security] = await Promise.all([
        User_1.default.findById(studentId).select('_id username email full_name profile_photo subscription').lean(),
        StudentProfile_1.default.findOne({ user_id: studentId }).lean(),
        ensureDashboardConfig(),
        getOverallRankForStudent(studentId),
        (0, securityConfigService_1.getSecurityConfig)(true),
    ]);
    if (!user || !profile) {
        throw new Error('Student not found');
    }
    const persistedCompletion = Number(profile.profile_completion_percentage);
    const completion = Number.isFinite(persistedCompletion) ? persistedCompletion : 0;
    const messageTemplate = String(config?.welcomeMessageTemplate || 'স্বাগতম, {{name}}!');
    const welcomeMessage = messageTemplate
        .replace('{{name}}', String(profile.full_name || user.full_name || user.username))
        .replace('{{completion}}', String(completion));
    const subscription = user.subscription || { isActive: false };
    // Calculate Group Rank if student is in any groups
    let groupRank = null;
    if (profile?.groupIds && Array.isArray(profile.groupIds) && profile.groupIds.length > 0) {
        const groupId = profile.groupIds[0];
        const groupBoard = await ExamResult_1.default.aggregate([
            { $match: { status: 'evaluated' } },
            {
                $lookup: {
                    from: 'studentprofiles',
                    localField: 'student',
                    foreignField: 'user_id',
                    as: 'studentProfile'
                }
            },
            { $match: { 'studentProfile.groupIds': groupId } },
            {
                $group: {
                    _id: '$student',
                    avgPercentage: { $avg: '$percentage' }
                }
            },
            { $sort: { avgPercentage: -1 } }
        ]);
        const gIdx = groupBoard.findIndex(item => String(item._id) === String(studentId));
        if (gIdx !== -1)
            groupRank = gIdx + 1;
    }
    const profileThreshold = security.examProtection.requireProfileScoreForExam
        ? Number(security.examProtection.profileScoreThreshold || 70)
        : Number(config?.profileCompletionThreshold || 70);
    return {
        userId: String(user._id),
        userUniqueId: profile.user_unique_id || '',
        name: profile.full_name || user.full_name || user.username,
        email: user.email,
        profilePicture: profile.profile_photo_url || user.profile_photo || '',
        profileCompletionPercentage: completion,
        profileCompletionThreshold: profileThreshold,
        isProfileEligible: completion >= profileThreshold,
        overallRank,
        groupRank,
        welcomeMessage,
        subscription: {
            isActive: Boolean(subscription.isActive),
            planName: subscription.planName || subscription.plan || '',
            expiryDate: subscription.expiryDate ? new Date(subscription.expiryDate).toISOString() : null,
        },
        guardian_phone_verification_status: profile.guardianPhoneVerificationStatus || 'unverified',
        guardian_phone_verified_at: profile.guardianPhoneVerifiedAt || null,
        profile: {
            phone: profile.phone || profile.phone_number || '',
            guardian_phone: profile.guardian_phone || '',
            ssc_batch: profile.ssc_batch || '',
            hsc_batch: profile.hsc_batch || '',
            department: profile.department || '',
            college_name: profile.college_name || '',
            college_address: profile.college_address || '',
            dob: profile.dob || null,
        },
        missingFields: (() => {
            const missing = [];
            if (!profile.profile_photo_url && !user.profile_photo)
                missing.push('Profile Photo');
            if (!profile.phone && !profile.phone_number)
                missing.push('Phone Number');
            if (!profile.guardian_phone)
                missing.push('Guardian Phone');
            if (!profile.dob)
                missing.push('Date of Birth');
            if (!profile.ssc_batch)
                missing.push('SSC Batch');
            if (!profile.hsc_batch)
                missing.push('HSC Batch');
            if (!profile.department)
                missing.push('Department');
            if (!profile.college_name)
                missing.push('College Name');
            return missing;
        })(),
        config: {
            enableRealtime: Boolean(config?.enableRealtime),
            enableDeviceLock: Boolean(config?.enableDeviceLock),
            enableCheatFlags: Boolean(config?.enableCheatFlags),
            enableBadges: Boolean(config?.enableBadges),
            enableProgressCharts: Boolean(config?.enableProgressCharts),
            featuredOrderingMode: config?.featuredOrderingMode || 'manual',
        },
        lastUpdatedAt: new Date().toISOString(),
    };
}
async function getUpcomingExamCards(studentId) {
    const [profile, config, user, exams, results, activeSessions, security] = await Promise.all([
        StudentProfile_1.default.findOne({ user_id: studentId }).lean(),
        ensureDashboardConfig(),
        User_1.default.findById(studentId).select('subscription').lean(),
        Exam_1.default.find({ isPublished: true }).sort({ startDate: 1 }).lean(),
        ExamResult_1.default.find({ student: studentId }).select('exam attemptNo').lean(),
        ExamSession_1.default.find({ student: studentId, isActive: true }).select('exam sessionLocked').lean(),
        (0, securityConfigService_1.getSecurityConfig)(true),
    ]);
    if (!profile)
        return [];
    const completion = Number(profile.profile_completion_percentage || 0);
    const threshold = security.examProtection.requireProfileScoreForExam
        ? Number(security.examProtection.profileScoreThreshold || 70)
        : Number(config?.profileCompletionThreshold || 70);
    const now = new Date();
    const studentGroupIds = Array.isArray(profile.groupIds) ? profile.groupIds.map((id) => String(id)) : [];
    const studentPlanCode = String(user?.subscription?.planCode ||
        user?.subscription?.plan ||
        '').toLowerCase();
    const subscriptionExpiryRaw = user?.subscription?.expiryDate;
    const subscriptionExpiryTime = subscriptionExpiryRaw ? new Date(String(subscriptionExpiryRaw)).getTime() : 0;
    const subscriptionActive = Boolean(user?.subscription?.isActive &&
        Number.isFinite(subscriptionExpiryTime) &&
        subscriptionExpiryTime > Date.now());
    const examIds = exams.map((exam) => String(exam._id || '')).filter(Boolean);
    const [metricsMap, externalAttemptCountMap] = await Promise.all([
        (0, examCardMetricsService_1.getExamCardMetrics)(exams),
        (0, externalExamAttemptService_1.getExternalExamAttemptCountsForStudent)(studentId, examIds),
    ]);
    const resultCounts = new Map();
    for (const r of results) {
        const examId = String(r.exam);
        resultCounts.set(examId, (resultCounts.get(examId) || 0) + 1);
    }
    for (const [examId, count] of externalAttemptCountMap.entries()) {
        resultCounts.set(examId, Math.max(Number(resultCounts.get(examId) || 0), Number(count || 0)));
    }
    const lockedExamSet = new Set(activeSessions
        .filter((s) => Boolean(s.sessionLocked))
        .map((s) => String(s.exam)));
    const cards = [];
    for (const exam of exams) {
        const examId = String(exam._id);
        if (exam.accessMode === 'specific') {
            const allowedUsers = Array.isArray(exam.allowedUsers) ? exam.allowedUsers : [];
            const allowed = allowedUsers.some((id) => String(id) === String(studentId));
            if (!allowed)
                continue;
        }
        if (!matchFilterList(exam.branchFilters, profile.department))
            continue;
        if (!matchFilterList(exam.batchFilters, profile.hsc_batch))
            continue;
        const startDate = new Date(exam.startDate);
        const endDate = new Date(exam.endDate);
        const attemptsUsed = resultCounts.get(examId) || 0;
        const attemptLimit = Number(exam.attemptLimit || 1);
        const attemptsLeft = Math.max(0, attemptLimit - attemptsUsed);
        let status = toStatus(startDate, endDate, attemptsLeft);
        // Auto-hide completed/expired from the upcoming stream.
        if (status === 'completed' && !exam.externalExamUrl)
            continue;
        const sessionLocked = lockedExamSet.has(examId);
        if (sessionLocked)
            status = 'closed';
        const accessControl = (exam.accessControl && typeof exam.accessControl === 'object')
            ? exam.accessControl
            : {};
        const requiredUserIds = normalizeObjectIdArray(accessControl.allowedUserIds);
        const requiredGroupIds = normalizeObjectIdArray(accessControl.allowedGroupIds);
        const requiredPlanCodes = Array.isArray(accessControl.allowedPlanCodes)
            ? accessControl.allowedPlanCodes.map((code) => String(code).toLowerCase())
            : [];
        const visibilityMode = String(exam.visibilityMode || 'all_students');
        const targetGroupIds = normalizeObjectIdArray(exam.targetGroupIds || []);
        const subscriptionRequired = Boolean(exam.subscriptionRequired)
            || Boolean(exam.requiresActiveSubscription)
            || visibilityMode === 'subscription_only'
            || requiredPlanCodes.length > 0;
        let accessDeniedReason = '';
        if (requiredUserIds.length > 0 && !requiredUserIds.includes(String(studentId))) {
            accessDeniedReason = 'access_user_restricted';
        }
        else if (requiredGroupIds.length > 0 && !hasAnyIntersection(requiredGroupIds, studentGroupIds)) {
            accessDeniedReason = 'access_group_restricted';
        }
        else if ((visibilityMode === 'group_only' || visibilityMode === 'custom')
            && targetGroupIds.length > 0
            && !hasAnyIntersection(targetGroupIds, studentGroupIds)) {
            accessDeniedReason = 'access_group_restricted';
        }
        else if (requiredPlanCodes.length > 0 && !requiredPlanCodes.includes(studentPlanCode)) {
            accessDeniedReason = 'access_plan_restricted';
        }
        else if (subscriptionRequired && !subscriptionActive) {
            accessDeniedReason = 'subscription_required';
        }
        const metrics = metricsMap.get(examId) || {
            totalParticipants: 0,
            attemptedUsers: 0,
            remainingUsers: 0,
            activeUsers: 0,
        };
        const canTakeExam = (!sessionLocked &&
            !accessDeniedReason &&
            completion >= threshold &&
            attemptsLeft > 0 &&
            status === 'live');
        cards.push({
            _id: examId,
            title: exam.title,
            universityNameBn: String(exam.universityNameBn || exam.title),
            subject: String(exam.subject || ''),
            subjectBn: String(exam.subjectBn || exam.subject || ''),
            examDateTime: startDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            duration: Number(exam.duration || 0),
            daysRemaining: Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / 86400000)),
            examType: exam.examType || 'mcq_only',
            maxAttemptsAllowed: attemptLimit,
            attemptsUsed,
            attemptsLeft,
            negativeMarking: Boolean(exam.negativeMarking),
            negativeMarkValue: Number(exam.negativeMarkValue || 0),
            bannerImageUrl: String(exam.bannerImageUrl || ''),
            logoUrl: String(exam.logoUrl || ''),
            groupName: String(exam.group_category || 'Custom'),
            shareUrl: exam.share_link ? `/exam/take/${String(exam.share_link)}` : '',
            totalParticipants: Number(metrics.totalParticipants || 0),
            attemptedUsers: Number(metrics.attemptedUsers || 0),
            remainingUsers: Number(metrics.remainingUsers || 0),
            activeUsers: Number(metrics.activeUsers || 0),
            statusBadge: status === 'closed' ? 'draft' : (status === 'completed' ? 'completed' : status),
            subscriptionRequired,
            subscriptionActive,
            accessDeniedReason: accessDeniedReason || undefined,
            status,
            canTakeExam,
            externalExamUrl: String(exam.externalExamUrl || ''),
        });
    }
    cards.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return cards;
}
async function getFeaturedUniversities() {
    const [config, rows] = await Promise.all([
        ensureDashboardConfig(),
        University_1.default.find({ isActive: true, featured: true })
            .sort({ featuredOrder: 1, name: 1 })
            .select('name shortDescription logoUrl slug featuredOrder')
            .lean(),
    ]);
    const orderingMode = config?.featuredOrderingMode || 'manual';
    let sortedRows = [...rows];
    if (orderingMode === 'adaptive' && rows.length > 0) {
        const applicationStats = await StudentApplication_1.default.aggregate([
            {
                $group: {
                    _id: '$university_id',
                    applicationCount: { $sum: 1 },
                    lastAppliedAt: { $max: '$createdAt' },
                }
            }
        ]);
        const scoreByUniversity = new Map();
        for (const stat of applicationStats) {
            scoreByUniversity.set(String(stat._id), {
                applicationCount: Number(stat.applicationCount || 0),
                lastAppliedAt: stat.lastAppliedAt ? new Date(stat.lastAppliedAt).getTime() : 0,
            });
        }
        const hasSignal = rows.some((row) => (scoreByUniversity.get(String(row._id))?.applicationCount || 0) > 0);
        if (hasSignal) {
            sortedRows = [...rows].sort((a, b) => {
                const aScore = scoreByUniversity.get(String(a._id)) || { applicationCount: 0, lastAppliedAt: 0 };
                const bScore = scoreByUniversity.get(String(b._id)) || { applicationCount: 0, lastAppliedAt: 0 };
                if (bScore.applicationCount !== aScore.applicationCount) {
                    return bScore.applicationCount - aScore.applicationCount;
                }
                if (bScore.lastAppliedAt !== aScore.lastAppliedAt) {
                    return bScore.lastAppliedAt - aScore.lastAppliedAt;
                }
                const aOrder = Number(a.featuredOrder || 0);
                const bOrder = Number(b.featuredOrder || 0);
                if (aOrder !== bOrder)
                    return aOrder - bOrder;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });
        }
    }
    return {
        items: sortedRows.map((u) => ({
            _id: String(u._id),
            name: u.name,
            shortDescription: u.shortDescription || '',
            logoUrl: u.logoUrl || '',
            slug: u.slug,
            featuredOrder: Number(u.featuredOrder || 0),
            link: `/university/${u.slug}`,
        })),
        lastUpdatedAt: new Date().toISOString(),
    };
}
async function getStudentNotifications(studentId) {
    const now = new Date();
    const studentObjectId = new mongoose_1.default.Types.ObjectId(studentId);
    const rows = await Notification_1.default.find({
        isActive: true,
        targetRole: { $in: ['student', 'all'] },
        $or: [
            { targetUserIds: { $exists: false } },
            { targetUserIds: { $size: 0 } },
            { targetUserIds: studentObjectId },
        ],
        $and: [
            { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
        ]
    }).sort({ publishAt: -1, createdAt: -1 }).lean();
    return {
        items: rows.map((n) => ({
            _id: String(n._id),
            title: n.title,
            message: n.message,
            category: n.category,
            publishAt: n.publishAt || n.createdAt,
            expireAt: n.expireAt || null,
            linkUrl: n.linkUrl || '',
            attachmentUrl: n.attachmentUrl || '',
        })),
        lastUpdatedAt: now.toISOString(),
    };
}
async function getExamHistoryAndProgress(studentId) {
    const [results, badges] = await Promise.all([
        ExamResult_1.default.find({ student: studentId })
            .populate({ path: 'exam', select: 'title subject subjectBn resultPublishDate totalMarks bannerImageUrl' })
            .sort({ submittedAt: -1 })
            .lean(),
        StudentBadge_1.default.find({ student: studentId }).populate({ path: 'badge', select: 'code title description iconUrl' }).sort({ awardedAt: -1 }).lean(),
    ]);
    const history = results.map((r) => {
        const exam = r.exam || {};
        const writtenUploads = Array.isArray(r.answers)
            ? r.answers
                .map((ans) => ans.writtenAnswerUrl)
                .filter(Boolean)
            : [];
        return {
            resultId: String(r._id),
            examId: String(exam._id || r.exam),
            examTitle: String(exam.title || 'Untitled Exam'),
            subject: String(exam.subjectBn || exam.subject || ''),
            obtainedMarks: r.obtainedMarks,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            rank: r.rank || null,
            submittedAt: r.submittedAt,
            attemptNo: Number(r.attemptNo || 1),
            status: r.status || 'evaluated',
            writtenUploads,
        };
    });
    const total = history.length;
    const avgScore = total ? Number((history.reduce((sum, x) => sum + Number(x.percentage || 0), 0) / total).toFixed(2)) : 0;
    const bestScore = total ? Math.max(...history.map((x) => Number(x.percentage || 0))) : 0;
    // Identify Weakness: Average score per subject
    const subjectStats = {};
    for (const h of history) {
        if (!h.subject)
            continue;
        if (!subjectStats[h.subject])
            subjectStats[h.subject] = { total: 0, count: 0 };
        subjectStats[h.subject].total += h.percentage;
        subjectStats[h.subject].count += 1;
    }
    const weaknesses = Object.entries(subjectStats)
        .map(([subject, stats]) => ({ subject, avg: stats.total / stats.count }))
        .filter(s => s.avg < 50) // Threshold for weakness
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 3); // Top 3 weaknesses
    const chart = history
        .slice()
        .reverse()
        .map((item, index) => ({
        x: index + 1,
        label: item.examTitle,
        percentage: item.percentage,
        submittedAt: item.submittedAt,
    }));
    return {
        history,
        progress: {
            totalExams: total,
            avgScore,
            bestScore,
            weaknesses,
            chart,
        },
        badges: badges.map((item) => {
            const badge = item.badge || {};
            return {
                _id: String(item._id),
                code: String(badge.code || ''),
                title: String(badge.title || ''),
                description: String(badge.description || ''),
                iconUrl: String(badge.iconUrl || ''),
                awardedAt: item.awardedAt,
                source: item.source,
            };
        }),
        lastUpdatedAt: new Date().toISOString(),
    };
}
async function getStudentDashboardAggregate(studentId) {
    const [header, upcomingExams, featuredUniversities, notifications, examHistory] = await Promise.all([
        getStudentDashboardHeader(studentId),
        getUpcomingExamCards(studentId),
        getFeaturedUniversities(),
        getStudentNotifications(studentId),
        getExamHistoryAndProgress(studentId),
    ]);
    return {
        header,
        upcomingExams,
        featuredUniversities: featuredUniversities.items,
        notifications: notifications.items,
        examHistory: examHistory.history,
        progress: examHistory.progress,
        badges: examHistory.badges,
        lastUpdatedAt: new Date().toISOString(),
    };
}
async function getStudentLiveAlerts(studentId) {
    const now = new Date();
    const soonWindow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const [upcomingExams, closingUniversities, dueLedger, recentResults] = await Promise.all([
        Exam_1.default.find({
            isPublished: true,
            startDate: { $gte: now, $lte: soonWindow },
        })
            .sort({ startDate: 1 })
            .limit(6)
            .select('_id title subject startDate')
            .lean(),
        University_1.default.find({
            isActive: true,
            isArchived: { $ne: true },
            applicationEndDate: { $gte: now, $lte: soonWindow },
        })
            .sort({ applicationEndDate: 1 })
            .limit(6)
            .select('_id name shortForm slug applicationEndDate')
            .lean(),
        StudentDueLedger_1.default.findOne({ studentId })
            .select('netDue updatedAt')
            .lean(),
        ExamResult_1.default.find({ student: studentId, status: 'evaluated' })
            .sort({ submittedAt: -1 })
            .limit(5)
            .populate({ path: 'exam', select: 'title subject resultPublishDate resultPublishMode' })
            .lean(),
    ]);
    const alerts = [];
    for (const exam of upcomingExams) {
        const startDate = exam.startDate ? new Date(exam.startDate) : null;
        if (!startDate || Number.isNaN(startDate.getTime()))
            continue;
        const diffDays = Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        alerts.push({
            id: `exam-soon-${String(exam._id)}`,
            type: 'exam_soon',
            title: String(exam.title || 'Upcoming Exam'),
            message: `${String(exam.subject || 'General')} exam starts in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
            dateIso: startDate.toISOString(),
            severity: diffDays <= 1 ? 'warning' : 'info',
            ctaLabel: 'Open Exams',
            ctaUrl: '/exams',
        });
    }
    for (const university of closingUniversities) {
        const endDate = university.applicationEndDate
            ? new Date(university.applicationEndDate)
            : null;
        if (!endDate || Number.isNaN(endDate.getTime()))
            continue;
        const diffDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        alerts.push({
            id: `application-closing-${String(university._id)}`,
            type: 'application_closing',
            title: String(university.name || 'Application Deadline'),
            message: `Application closes in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
            dateIso: endDate.toISOString(),
            severity: diffDays <= 2 ? 'danger' : 'warning',
            ctaLabel: 'View Universities',
            ctaUrl: '/universities',
        });
    }
    const pendingDueAmount = Number(dueLedger?.netDue || 0);
    if (pendingDueAmount > 0) {
        alerts.push({
            id: 'payment-pending',
            type: 'payment_pending',
            title: 'Payment Pending',
            message: `You have an outstanding due of ৳${pendingDueAmount.toLocaleString()}.`,
            dateIso: new Date(dueLedger?.updatedAt || now).toISOString(),
            severity: 'danger',
            ctaLabel: 'Open Payments',
            ctaUrl: '/payments',
        });
    }
    for (const result of recentResults) {
        const examRaw = result.exam;
        const exam = examRaw &&
            typeof examRaw === 'object' &&
            !(examRaw instanceof mongoose_1.default.Types.ObjectId)
            ? examRaw
            : {};
        const submittedAt = result.submittedAt ? new Date(result.submittedAt) : now;
        alerts.push({
            id: `result-published-${String(result._id)}`,
            type: 'result_published',
            title: String(exam.title || 'Result Published'),
            message: `Your latest evaluated result (${Number(result.percentage || 0).toFixed(1)}%) is available.`,
            dateIso: submittedAt.toISOString(),
            severity: 'success',
            ctaLabel: 'View Results',
            ctaUrl: '/results',
        });
    }
    const severityWeight = {
        danger: 0,
        warning: 1,
        info: 2,
        success: 3,
    };
    alerts.sort((a, b) => {
        if (severityWeight[a.severity] !== severityWeight[b.severity]) {
            return severityWeight[a.severity] - severityWeight[b.severity];
        }
        return new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime();
    });
    return {
        items: alerts.slice(0, 12),
        lastUpdatedAt: now.toISOString(),
    };
}
//# sourceMappingURL=studentDashboardService.js.map