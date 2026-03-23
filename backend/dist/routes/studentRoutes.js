"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const studentController_1 = require("../controllers/studentController");
const studentDashboardController_1 = require("../controllers/studentDashboardController");
const adminSupportController_1 = require("../controllers/adminSupportController");
const supportController_1 = require("../controllers/supportController");
const studentHubController_1 = require("../controllers/studentHubController");
const studentDashboardFullController_1 = require("../controllers/studentDashboardFullController");
const studentWatchlistController_1 = require("../controllers/studentWatchlistController");
const weakTopicController_1 = require("../controllers/weakTopicController");
const router = (0, express_1.Router)();
// Apply auth middleware to all student routes
router.use(auth_1.authenticate);
const mediaController_1 = require("../controllers/mediaController");
// Profile Routes
router.get('/profile', studentController_1.getStudentProfile);
router.get('/profile-update-request', studentController_1.getStudentProfileUpdateRequestStatus);
router.put('/profile', studentController_1.updateStudentProfile);
router.post('/profile/documents', mediaController_1.uploadMiddleware.single('file'), studentController_1.uploadStudentDocument);
router.get('/dashboard', studentDashboardController_1.getStudentDashboardAggregateHandler);
router.get('/upcoming-exams', studentDashboardController_1.getStudentUpcomingExams);
router.get('/featured-universities', studentDashboardController_1.getStudentFeaturedUniversities);
router.get('/notifications', studentDashboardController_1.getStudentNotificationFeed);
router.get('/live-alerts', studentDashboardController_1.getStudentLiveAlertsHandler);
router.get('/exam-history', studentDashboardController_1.getStudentExamHistory);
router.get('/dashboard-profile', studentDashboardController_1.getStudentDashboardProfile);
router.get('/dashboard/stream', studentDashboardController_1.getStudentDashboardStream);
router.get('/notices', adminSupportController_1.studentGetNotices);
router.get('/support/eligibility', supportController_1.studentGetSupportEligibility);
router.post('/support-tickets', supportController_1.studentCreateSupportTicket);
router.get('/support-tickets', supportController_1.studentGetSupportTickets);
router.get('/support-tickets/:id', supportController_1.studentGetSupportTicketById);
router.post('/support-tickets/:id/reply', supportController_1.studentReplySupportTicket);
router.get('/me', studentHubController_1.getStudentMe);
router.get('/me/exams', studentHubController_1.getStudentMeExams);
router.get('/me/exams/:examId', studentHubController_1.getStudentMeExamById);
router.get('/me/results', studentHubController_1.getStudentMeResults);
router.get('/me/results/:examId', studentHubController_1.getStudentMeResultByExam);
router.get('/me/payments', studentHubController_1.getStudentMePayments);
router.post('/me/payments/proof', mediaController_1.uploadMiddleware.single('file'), studentHubController_1.studentSubmitPaymentProof);
router.get('/me/notifications', studentHubController_1.getStudentMeNotifications);
router.post('/me/notifications/mark-read', studentHubController_1.markStudentNotificationsRead);
router.get('/me/resources', studentHubController_1.getStudentMeResources);
router.get('/payments', studentHubController_1.getStudentMePayments);
router.get('/notifications/feed', studentHubController_1.getStudentMeNotifications);
router.post('/notifications/mark-read', studentHubController_1.markStudentNotificationsRead);
router.get('/resources', studentHubController_1.getStudentMeResources);
router.get('/leaderboard', studentHubController_1.getLeaderboard);
// Application Routes
router.get('/applications', studentController_1.getStudentApplications);
router.post('/applications', studentController_1.createStudentApplication);
// Dashboard Full (premium aggregated endpoint)
router.get('/dashboard-full', studentDashboardFullController_1.getStudentDashboardFull);
router.get('/dashboard-sections-config', studentDashboardFullController_1.getStudentDashboardSectionsConfig);
// Watchlist Routes
router.get('/watchlist', studentWatchlistController_1.getStudentWatchlist);
router.post('/watchlist/toggle', studentWatchlistController_1.toggleWatchlistItem);
router.get('/watchlist/summary', studentWatchlistController_1.getWatchlistSummary);
router.get('/watchlist/check', studentWatchlistController_1.checkWatchlistStatus);
// Weak Topics
router.get('/me/weak-topics', weakTopicController_1.getStudentWeakTopics);
exports.default = router;
//# sourceMappingURL=studentRoutes.js.map