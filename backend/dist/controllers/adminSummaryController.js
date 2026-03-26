"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetDashboardSummary = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const University_1 = __importDefault(require("../models/University"));
const HomeSettings_1 = __importDefault(require("../models/HomeSettings"));
const News_1 = __importDefault(require("../models/News"));
const Exam_1 = __importDefault(require("../models/Exam"));
const Question_1 = __importDefault(require("../models/Question"));
const User_1 = __importDefault(require("../models/User"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const ContactMessage_1 = __importDefault(require("../models/ContactMessage"));
const Resource_1 = __importDefault(require("../models/Resource"));
const NotificationJob_1 = __importDefault(require("../models/NotificationJob"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const TeamInvite_1 = __importDefault(require("../models/TeamInvite"));
const TeamRole_1 = __importDefault(require("../models/TeamRole"));
const SecurityAlertLog_1 = __importDefault(require("../models/SecurityAlertLog"));
const adminGetDashboardSummary = async (_req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);
        const renewalDueUntil = new Date(now);
        renewalDueUntil.setDate(renewalDueUntil.getDate() + 7);
        const staffRoles = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'];
        const [totalUniversities, activeUniversities, featuredUniversities, homeSettings, pendingNews, publishedToday, liveExams, upcomingExams, totalQuestions, totalActiveStudents, suspendedStudents, pendingPaymentStudents, pendingPaymentApprovals, paidToday, unreadSupportTickets, unreadContactMessages, publicResources, featuredResources, totalCampaigns, queuedOrProcessingCampaigns, failedCampaignsToday, activeSubscribers, renewalDueSubscribers, activePlans, activeStaff, pendingInvites, activeRoles, unreadSecurityAlerts, criticalSecurityAlerts,] = await Promise.all([
            University_1.default.countDocuments({}),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true } }),
            University_1.default.countDocuments({ featured: true }),
            HomeSettings_1.default.findOne().lean(),
            News_1.default.countDocuments({ status: { $in: ['pending_review', 'draft'] } }),
            News_1.default.countDocuments({ isPublished: true, publishDate: { $gte: startOfToday, $lt: endOfToday } }),
            Exam_1.default.countDocuments({ isPublished: true, status: 'live' }),
            Exam_1.default.countDocuments({ isPublished: true, status: 'scheduled' }),
            Question_1.default.countDocuments({}),
            User_1.default.countDocuments({ role: 'student', status: 'active' }),
            User_1.default.countDocuments({ role: 'student', status: 'suspended' }),
            User_1.default.countDocuments({ role: 'student', status: 'pending' }),
            ManualPayment_1.default.countDocuments({ status: 'pending' }),
            ManualPayment_1.default.countDocuments({
                status: 'paid',
                $or: [
                    { paidAt: { $gte: startOfToday, $lt: endOfToday } },
                    { paidAt: { $exists: false }, date: { $gte: startOfToday, $lt: endOfToday } },
                    { paidAt: null, date: { $gte: startOfToday, $lt: endOfToday } },
                ],
            }),
            SupportTicket_1.default.countDocuments({
                $or: [
                    { unreadCountForAdmin: { $gt: 0 } },
                    {
                        unreadCountForAdmin: { $exists: false },
                        status: { $in: ['open', 'in_progress'] },
                    },
                ],
            }),
            ContactMessage_1.default.countDocuments({ unreadByAdmin: true }),
            Resource_1.default.countDocuments({
                isPublic: true,
                publishDate: { $lte: now },
                $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }],
            }),
            Resource_1.default.countDocuments({
                isPublic: true,
                isFeatured: true,
                publishDate: { $lte: now },
                $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }],
            }),
            NotificationJob_1.default.countDocuments({ isTestSend: { $ne: true } }),
            NotificationJob_1.default.countDocuments({ isTestSend: { $ne: true }, status: { $in: ['queued', 'processing'] } }),
            NotificationJob_1.default.countDocuments({ isTestSend: { $ne: true }, status: 'failed', updatedAt: { $gte: startOfToday, $lt: endOfToday } }),
            UserSubscription_1.default.countDocuments({ status: 'active', expiresAtUTC: { $gt: now } }),
            UserSubscription_1.default.countDocuments({
                status: 'active',
                expiresAtUTC: { $gt: now, $lte: renewalDueUntil },
            }),
            SubscriptionPlan_1.default.countDocuments({ enabled: true, isArchived: { $ne: true } }),
            User_1.default.countDocuments({ role: { $in: staffRoles }, status: 'active' }),
            TeamInvite_1.default.countDocuments({ status: { $in: ['pending', 'sent'] } }),
            TeamRole_1.default.countDocuments({ isActive: true }),
            SecurityAlertLog_1.default.countDocuments({ isRead: false }),
            SecurityAlertLog_1.default.countDocuments({ isRead: false, severity: 'critical' }),
        ]);
        const highlightedCategories = Array.isArray(homeSettings?.highlightedCategories)
            ? homeSettings.highlightedCategories.filter((item) => item?.enabled !== false).length
            : 0;
        const featuredHomeUniversities = Array.isArray(homeSettings?.featuredUniversities)
            ? homeSettings.featuredUniversities.filter((item) => item?.enabled !== false).length
            : 0;
        const enabledSections = homeSettings?.sectionVisibility
            ? Object.values(homeSettings.sectionVisibility).filter(Boolean).length
            : 0;
        const dbStateMap = {
            0: 'down',
            1: 'connected',
            2: 'down',
            3: 'down',
            99: 'down',
        };
        const db = dbStateMap[mongoose_1.default.connection.readyState] || 'down';
        const unreadSupportMessages = unreadSupportTickets + unreadContactMessages;
        res.json({
            universities: {
                total: totalUniversities,
                active: activeUniversities,
                featured: featuredUniversities,
            },
            home: {
                highlightedCategories,
                featuredUniversities: featuredHomeUniversities,
                enabledSections,
            },
            news: {
                pendingReview: pendingNews,
                publishedToday,
            },
            exams: {
                upcoming: upcomingExams,
                live: liveExams,
            },
            questionBank: {
                totalQuestions,
            },
            students: {
                totalActive: totalActiveStudents,
                pendingPayment: pendingPaymentStudents,
                suspended: suspendedStudents,
            },
            payments: {
                pendingApprovals: pendingPaymentApprovals,
                paidToday,
            },
            financeCenter: {
                pendingApprovals: pendingPaymentApprovals,
                paidToday,
            },
            subscriptions: {
                activeSubscribers,
                renewalDue: renewalDueSubscribers,
                activePlans,
            },
            resources: {
                publicResources,
                featuredResources,
            },
            campaigns: {
                totalCampaigns,
                queuedOrProcessing: queuedOrProcessingCampaigns,
                failedToday: failedCampaignsToday,
            },
            supportCenter: {
                unreadMessages: unreadSupportMessages,
                unreadTickets: unreadSupportTickets,
                unreadContactMessages,
            },
            teamAccess: {
                activeStaff,
                pendingInvites,
                activeRoles,
            },
            security: {
                unreadAlerts: unreadSecurityAlerts,
                criticalAlerts: criticalSecurityAlerts,
                db,
            },
            systemStatus: {
                db,
                timeUTC: now.toISOString(),
            },
        });
    }
    catch (error) {
        console.error('adminGetDashboardSummary error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.adminGetDashboardSummary = adminGetDashboardSummary;
//# sourceMappingURL=adminSummaryController.js.map