"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentDashboardFull = getStudentDashboardFull;
exports.getStudentDashboardSectionsConfig = getStudentDashboardSectionsConfig;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Exam_1 = __importDefault(require("../models/Exam"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const StudentDashboardConfig_1 = __importDefault(require("../models/StudentDashboardConfig"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const StudentWatchlist_1 = __importDefault(require("../models/StudentWatchlist"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const Resource_1 = __importDefault(require("../models/Resource"));
const securityConfigService_1 = require("../services/securityConfigService");
const subscriptionAccessService_1 = require("../services/subscriptionAccessService");
const studentDashboardService_1 = require("../services/studentDashboardService");
function ensureStudent(req, res) {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return null;
    }
    if (req.user.role !== 'student') {
        res.status(403).json({ message: 'Student access only' });
        return null;
    }
    return req.user._id;
}
async function ensureDashboardConfig() {
    let config = await StudentDashboardConfig_1.default.findOne().lean();
    if (!config) {
        await StudentDashboardConfig_1.default.create({});
        config = await StudentDashboardConfig_1.default.findOne().lean();
    }
    return config;
}
async function getStudentDashboardFull(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const [header, upcomingExams, liveAlerts, notifications, examHistory, paymentData, supportData, watchlistData, config, leaderboardData, weakTopicData, userAuth, missedExams,] = await Promise.all([
            (0, studentDashboardService_1.getStudentDashboardHeader)(studentId),
            (0, studentDashboardService_1.getUpcomingExamCards)(studentId),
            (0, studentDashboardService_1.getStudentLiveAlerts)(studentId),
            (0, studentDashboardService_1.getStudentNotifications)(studentId),
            (0, studentDashboardService_1.getExamHistoryAndProgress)(studentId),
            getPaymentSummary(studentId),
            getSupportSummary(studentId),
            getWatchlistSummary(studentId),
            ensureDashboardConfig(),
            getLeaderboardSnapshot(studentId),
            getWeakTopicSummary(studentId),
            User_1.default.findById(studentId).select('twoFactorEnabled').lean(),
            getMissedExams(studentId),
        ]);
        const resourcesData = await getRecommendedResources(studentId, weakTopicData.topics.filter(t => t.isWeak).map(t => t.subject));
        const security = await (0, securityConfigService_1.getSecurityConfig)(true);
        // Build important dates
        const importantDates = buildImportantDates(upcomingExams, header.subscription, paymentData);
        // Build daily focus
        const dailyFocus = buildDailyFocus(upcomingExams, header, paymentData, liveAlerts.items);
        // Build personalized CTAs
        const personalizedCtas = buildPersonalizedCtas(header, paymentData, upcomingExams);
        // Section config
        const sections = config.sections || {};
        res.json({
            header,
            quickStatus: {
                profileScore: header.profileCompletionPercentage,
                subscriptionStatus: header.subscription.isActive ? 'active' : 'expired',
                paymentStatus: paymentData.pendingCount > 0 ? 'pending' : 'paid',
                upcomingExamsCount: upcomingExams.filter(e => e.status === 'upcoming' || e.status === 'live').length,
                completedExamsCount: examHistory.progress.totalExams,
                unreadAlertsCount: liveAlerts.items.length,
            },
            subscription: header.subscription,
            payments: paymentData,
            alerts: {
                items: liveAlerts.items.slice(0, config.maxAlertsVisible || 5),
                totalCount: liveAlerts.items.length,
            },
            notifications: {
                items: notifications.items.slice(0, 5),
                totalCount: notifications.items.length,
            },
            exams: {
                live: upcomingExams.filter(e => e.status === 'live'),
                upcoming: upcomingExams.filter(e => e.status === 'upcoming').slice(0, config.maxExamsVisible || 6),
                missed: missedExams.slice(0, 6),
                totalUpcoming: upcomingExams.filter(e => e.status === 'upcoming').length,
            },
            results: {
                recent: examHistory.history.slice(0, 5),
                progress: examHistory.progress,
                badges: examHistory.badges,
            },
            weakTopics: weakTopicData,
            leaderboard: leaderboardData,
            watchlist: watchlistData,
            resources: resourcesData,
            support: supportData,
            security: {
                lastLogin: header.lastUpdatedAt,
                twoFactorEnabled: Boolean(userAuth?.twoFactorEnabled),
            },
            importantDates,
            dailyFocus,
            personalizedCtas,
            sections,
            config: {
                enableRealtime: Boolean(config.enableRealtime),
                enableBadges: Boolean(config.enableBadges),
                enableProgressCharts: Boolean(config.enableProgressCharts),
                enableRecommendations: Boolean(config.enableRecommendations ?? true),
                enableLeaderboard: Boolean(config.enableLeaderboard ?? true),
                enableWeakTopics: Boolean(config.enableWeakTopics ?? true),
                enableWatchlist: Boolean(config.enableWatchlist ?? true),
                profileGatingMessage: config.profileGatingMessage || 'Complete your profile to unlock exams.',
                renewalCtaText: config.renewalCtaText || 'Renew Now',
                renewalCtaUrl: config.renewalCtaUrl || '/subscription-plans',
                celebrationRules: config.celebrationRules,
            },
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error('getStudentDashboardFull error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getPaymentSummary(studentId) {
    const [payments, dueLedger] = await Promise.all([
        ManualPayment_1.default.find({ studentId })
            .sort({ date: -1 })
            .limit(10)
            .lean(),
        StudentDueLedger_1.default.findOne({ studentId }).lean(),
    ]);
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lastPaid = payments.find(p => p.status === 'paid');
    return {
        totalPaid,
        pendingAmount,
        pendingCount: pendingPayments.length,
        pendingDue: dueLedger?.netDue || 0,
        lastPayment: lastPaid ? {
            amount: lastPaid.amount,
            method: lastPaid.method,
            date: lastPaid.paidAt || lastPaid.date,
            transactionId: lastPaid.transactionId || '',
            reference: lastPaid.reference || '',
        } : null,
        recentItems: payments.slice(0, 5).map(p => ({
            _id: String(p._id),
            amount: p.amount,
            method: p.method,
            status: p.status,
            date: p.date,
            paidAt: p.paidAt,
            entryType: p.entryType,
            reference: p.reference || '',
        })),
    };
}
async function getSupportSummary(studentId) {
    const [tickets, openCount] = await Promise.all([
        SupportTicket_1.default.find({ studentId })
            .sort({ createdAt: -1 })
            .limit(3)
            .select('ticketNo subject status priority createdAt')
            .lean(),
        SupportTicket_1.default.countDocuments({ studentId, status: { $in: ['open', 'in_progress'] } }),
    ]);
    return {
        openTickets: openCount,
        recentTickets: tickets.map(t => ({
            _id: String(t._id),
            ticketNo: t.ticketNo,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            createdAt: t.createdAt,
        })),
    };
}
async function getWatchlistSummary(studentId) {
    const counts = await StudentWatchlist_1.default.aggregate([
        { $match: { studentId: new mongoose_1.default.Types.ObjectId(studentId) } },
        { $group: { _id: '$itemType', count: { $sum: 1 } } },
    ]);
    const recentItems = await StudentWatchlist_1.default.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
    const summary = { universities: 0, resources: 0, exams: 0, news: 0 };
    let total = 0;
    for (const c of counts) {
        const key = c._id === 'university' ? 'universities' : c._id === 'resource' ? 'resources' : c._id === 'exam' ? 'exams' : 'news';
        summary[key] = c.count;
        total += c.count;
    }
    return {
        ...summary,
        total,
        recentItems: recentItems.map(i => ({
            _id: String(i._id),
            itemType: i.itemType,
            itemId: String(i.itemId),
            savedAt: i.createdAt,
        })),
    };
}
async function getRecommendedResources(_studentId, weakSubjects = []) {
    const subscriptionSnapshot = await (0, subscriptionAccessService_1.getCanonicalSubscriptionSnapshot)(_studentId);
    const resourceFilter = subscriptionSnapshot.allowsPremiumResources === true
        ? {}
        : { isPublic: true };
    const allResources = await Resource_1.default.find(resourceFilter)
        .sort({ isFeatured: -1, publishDate: -1 })
        .limit(20)
        .select('title description type category tags fileUrl externalUrl thumbnailUrl isFeatured')
        .lean();
    const scored = allResources.map(r => {
        const tags = [...(Array.isArray(r.tags) ? r.tags : []), r.category || ''].map(t => String(t).toLowerCase());
        const matchScore = weakSubjects.filter(s => tags.some(t => t.includes(s.toLowerCase()))).length;
        return { r, matchScore };
    });
    scored.sort((a, b) => b.matchScore - a.matchScore || (b.r.isFeatured ? 1 : 0) - (a.r.isFeatured ? 1 : 0));
    const resources = scored.slice(0, 4).map(s => s.r);
    return {
        items: resources.map(r => ({
            _id: String(r._id),
            title: r.title,
            description: r.description || '',
            type: r.type,
            category: r.category,
            fileUrl: r.fileUrl || r.externalUrl || '',
            thumbnailUrl: r.thumbnailUrl || '',
            isFeatured: r.isFeatured,
        })),
    };
}
async function getMissedExams(studentId) {
    const now = new Date();
    const completedExamIds = await ExamResult_1.default.distinct('exam', { student: studentId });
    const missed = await Exam_1.default.find({
        isPublished: true,
        endDate: { $lt: now },
        _id: { $nin: completedExamIds },
    }).sort({ endDate: -1 }).limit(6).select('title startDate endDate duration subject group_category').lean();
    return missed.map(e => ({
        _id: String(e._id),
        title: e.title,
        status: 'missed',
        startDate: e.startDate?.toISOString() || '',
        endDate: e.endDate?.toISOString() || '',
        canTakeExam: false,
        accessDeniedReason: 'Window closed',
        category: e.group_category || e.subject || '',
        duration: e.duration,
        isPaid: false,
        isFree: true,
    }));
}
async function getLeaderboardSnapshot(studentId) {
    const board = await ExamResult_1.default.aggregate([
        { $match: { status: 'evaluated' } },
        {
            $group: {
                _id: '$student',
                avgPercentage: { $avg: '$percentage' },
                attempts: { $sum: 1 },
                totalObtained: { $sum: '$obtainedMarks' },
            },
        },
        { $sort: { avgPercentage: -1, attempts: -1, totalObtained: -1 } },
        { $limit: 10 },
    ]);
    const studentIds = board.map(b => b._id);
    const users = await User_1.default.find({ _id: { $in: studentIds } })
        .select('full_name username profile_photo')
        .lean();
    const userMap = new Map(users.map(u => [String(u._id), u]));
    const myIdx = board.findIndex(b => String(b._id) === String(studentId));
    return {
        topPerformers: board.map((b, idx) => {
            const u = userMap.get(String(b._id));
            return {
                rank: idx + 1,
                studentId: String(b._id),
                name: u?.full_name || u?.username || 'Student',
                avatar: u?.profile_photo || '',
                avgPercentage: Number(b.avgPercentage.toFixed(1)),
                attempts: b.attempts,
                isMe: String(b._id) === String(studentId),
            };
        }),
        myRank: myIdx !== -1 ? myIdx + 1 : null,
        myAvgPercentage: myIdx !== -1 ? Number(board[myIdx].avgPercentage.toFixed(1)) : null,
    };
}
async function getWeakTopicSummary(studentId) {
    const results = await ExamResult_1.default.find({ student: studentId })
        .select('answers')
        .lean();
    if (results.length === 0) {
        return { topics: [], hasData: false };
    }
    const topicStats = {};
    for (const result of results) {
        if (!Array.isArray(result.answers))
            continue;
        for (const ans of result.answers) {
            const a = ans;
            const subject = String(a.subject || a.topic || 'General');
            if (!topicStats[subject]) {
                topicStats[subject] = { correct: 0, total: 0, subject };
            }
            topicStats[subject].total += 1;
            if (a.isCorrect)
                topicStats[subject].correct += 1;
        }
    }
    const topics = Object.values(topicStats)
        .filter(t => t.total >= 3)
        .map(t => ({
        subject: t.subject,
        accuracy: Number(((t.correct / t.total) * 100).toFixed(1)),
        totalAttempts: t.total,
        correctCount: t.correct,
        isWeak: (t.correct / t.total) * 100 < 50,
    }))
        .sort((a, b) => a.accuracy - b.accuracy);
    return {
        topics: topics.slice(0, 8),
        weakCount: topics.filter(t => t.isWeak).length,
        hasData: true,
    };
}
function buildImportantDates(exams, subscription, payments) {
    const dates = [];
    for (const exam of exams.filter(e => e.status === 'upcoming' || e.status === 'live').slice(0, 3)) {
        const d = new Date(exam.startDate);
        const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
        dates.push({
            type: 'exam',
            label: exam.title,
            date: exam.startDate,
            urgency: daysLeft <= 1 ? 'critical' : daysLeft <= 3 ? 'high' : 'normal',
        });
    }
    if (subscription.expiryDate) {
        const expiry = new Date(subscription.expiryDate);
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
        if (daysLeft <= 30 && daysLeft > 0) {
            dates.push({
                type: 'subscription',
                label: `Subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
                date: subscription.expiryDate,
                urgency: daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'high' : 'normal',
            });
        }
    }
    if (payments.pendingCount > 0) {
        dates.push({
            type: 'payment',
            label: `${payments.pendingCount} pending payment${payments.pendingCount === 1 ? '' : 's'}`,
            date: new Date().toISOString(),
            urgency: 'high',
        });
    }
    dates.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, normal: 2 };
        return (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2);
    });
    return dates.slice(0, 5);
}
function buildDailyFocus(exams, header, payments, alerts) {
    const focus = {
        nextExam: null,
        nextDeadline: null,
        recommendedAction: '',
    };
    const liveExam = exams.find(e => e.status === 'live');
    const nextUpcoming = exams.find(e => e.status === 'upcoming');
    if (liveExam) {
        focus.nextExam = liveExam.title;
        focus.recommendedAction = `Start "${liveExam.title}" now!`;
    }
    else if (nextUpcoming) {
        focus.nextExam = nextUpcoming.title;
        focus.nextDeadline = nextUpcoming.startDate;
        focus.recommendedAction = `Prepare for "${nextUpcoming.title}"`;
    }
    if (!header.isProfileEligible) {
        focus.recommendedAction = 'Complete your profile to unlock exams';
    }
    else if (payments.pendingCount > 0) {
        focus.recommendedAction = 'Resolve pending payments to maintain access';
    }
    return focus;
}
function buildPersonalizedCtas(header, payments, exams) {
    const ctas = [];
    if (!header.isProfileEligible) {
        ctas.push({ id: 'profile', text: 'Complete profile to unlock exams', url: '/profile', priority: 1, variant: 'warning' });
    }
    if (!header.subscription.isActive) {
        ctas.push({ id: 'subscribe', text: 'Subscribe to access premium content', url: '/subscription-plans', priority: 2, variant: 'info' });
    }
    else if (header.subscription.expiryDate) {
        const daysLeft = Math.ceil((new Date(header.subscription.expiryDate).getTime() - Date.now()) / 86400000);
        if (daysLeft <= 7 && daysLeft > 0) {
            ctas.push({ id: 'renew', text: `Renew now – ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, url: '/subscription-plans', priority: 1, variant: 'danger' });
        }
    }
    if (payments.pendingCount > 0) {
        ctas.push({ id: 'payment', text: 'Resolve pending payments', url: '/payments', priority: 2, variant: 'warning' });
    }
    const liveExam = exams.find(e => e.status === 'live' && e.canTakeExam);
    if (liveExam) {
        ctas.push({ id: 'exam', text: 'A live exam is available – take it now', url: '/exams', priority: 1, variant: 'success' });
    }
    ctas.sort((a, b) => a.priority - b.priority);
    return ctas.slice(0, 3);
}
async function getStudentDashboardSectionsConfig(req, res) {
    try {
        const studentId = ensureStudent(req, res);
        if (!studentId)
            return;
        const config = await ensureDashboardConfig();
        res.json({
            sections: config.sections || {},
            config: {
                enableRecommendations: config.enableRecommendations ?? true,
                enableLeaderboard: config.enableLeaderboard ?? true,
                enableWeakTopics: config.enableWeakTopics ?? true,
                enableWatchlist: config.enableWatchlist ?? true,
                profileGatingMessage: config.profileGatingMessage || '',
                renewalCtaText: config.renewalCtaText || 'Renew Now',
                renewalCtaUrl: config.renewalCtaUrl || '/subscription-plans',
            },
        });
    }
    catch (err) {
        console.error('getStudentDashboardSectionsConfig error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=studentDashboardFullController.js.map