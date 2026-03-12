"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const universityController_1 = require("../controllers/universityController");
const universityClusterController_1 = require("../controllers/universityClusterController");
const resourceController_1 = require("../controllers/resourceController");
const bannerController_1 = require("../controllers/bannerController");
const homeConfigController_1 = require("../controllers/homeConfigController");
const cmsController_1 = require("../controllers/cmsController");
const cmsController_2 = require("../controllers/cmsController");
const homeAlertController_1 = require("../controllers/homeAlertController");
const homeSystemController_1 = require("../controllers/homeSystemController");
const homeAggregateController_1 = require("../controllers/homeAggregateController");
const homeSettingsAdminController_1 = require("../controllers/homeSettingsAdminController");
const universityCategoriesPublicController_1 = require("../controllers/universityCategoriesPublicController");
const examController_1 = require("../controllers/examController");
const questionBankController_1 = require("../controllers/questionBankController");
const auth_1 = require("../middlewares/auth");
const securityGuards_1 = require("../middlewares/securityGuards");
const securityRateLimit_1 = require("../middlewares/securityRateLimit");
const profileController_1 = require("../controllers/profileController");
const serviceController_1 = require("../controllers/serviceController");
const serviceCategoryController_1 = require("../controllers/serviceCategoryController");
const adminSupportController_1 = require("../controllers/adminSupportController");
const studentController_1 = require("../controllers/studentController");
const subscriptionController_1 = require("../controllers/subscriptionController");
const newsV2Controller_1 = require("../controllers/newsV2Controller");
const securityCenterController_1 = require("../controllers/securityCenterController");
const studentHubController_1 = require("../controllers/studentHubController");
const ContactMessage_1 = __importDefault(require("../models/ContactMessage"));
const securityRateLimit_2 = require("../middlewares/securityRateLimit");
const mediaController_1 = require("../controllers/mediaController");
const adminAlertService_1 = require("../services/adminAlertService");
const cmsController_3 = require("../controllers/cmsController");
const socialLinksController_1 = require("../controllers/socialLinksController");
const analyticsController_1 = require("../controllers/analyticsController");
const helpCenterController_1 = require("../controllers/helpCenterController");
const contentBlockController_1 = require("../controllers/contentBlockController");
const securityAlertController_1 = require("../controllers/securityAlertController");
const router = (0, express_1.Router)();
const examAccessMiddlewares = [auth_1.authenticate, auth_1.requireAuthStudent];
/* ── Auth ── */
router.post('/auth/register', securityRateLimit_1.loginRateLimiter, securityGuards_1.enforceRegistrationPolicy, authController_1.register);
router.post('/auth/login', securityRateLimit_1.loginRateLimiter, authController_1.login);
router.post('/auth/admin/login', securityRateLimit_1.adminLoginRateLimiter, authController_1.loginAdmin);
router.post('/auth/chairman/login', securityRateLimit_1.loginRateLimiter, authController_1.loginChairman);
router.post('/auth/refresh', authController_1.refresh);
router.post('/auth/logout', auth_1.authenticate, authController_1.logout);
router.get('/auth/verify', authController_1.verifyEmail);
router.post('/auth/forgot-password', authController_1.forgotPassword);
router.post('/auth/reset-password', authController_1.resetPassword);
router.get('/auth/me', auth_1.authenticate, authController_1.getMe);
router.post('/auth/change-password', auth_1.authenticate, authController_1.changePassword);
router.post('/auth/verify-2fa', authController_1.verify2fa);
router.post('/auth/resend-otp', authController_1.resendOtp);
router.get('/auth/session-check', auth_1.authenticate, authController_1.checkSession);
router.get('/auth/session-stream', auth_1.authenticate, authController_1.sessionStream);
router.get('/auth/oauth/providers', authController_1.getOauthProviders);
router.get('/auth/oauth/:provider/start', authController_1.startOauth);
router.get('/auth/oauth/:provider/callback', authController_1.oauthCallback);
/* ── Public — Universities ── */
router.get('/universities', universityController_1.getUniversities);
router.get('/university-categories', universityController_1.getUniversityCategories);
router.get('/universities/categories', universityController_1.getUniversityCategories);
router.get('/university-categories/with-clusters', universityCategoriesPublicController_1.getUniversityCategories);
router.get('/home/clusters/featured', universityClusterController_1.getFeaturedUniversityClusters);
router.get('/home/clusters/:slug/members', universityClusterController_1.getPublicUniversityClusterMembers);
/* ── Public — Banners & Config ── */
router.get('/banners', bannerController_1.getActiveBanners);
router.get('/banners/active', bannerController_1.getActiveBanners);
router.get('/home-config', homeConfigController_1.getHomeConfig);
/* ── Public — Resources ── */
router.get('/resources', resourceController_1.getPublicResources);
router.get('/resources/:slug', resourceController_1.getPublicResourceBySlug);
router.post('/resources/:id/view', resourceController_1.incrementResourceView);
router.post('/resources/:id/download', resourceController_1.incrementResourceDownload);
router.get('/universities/:slug', universityController_1.getUniversityBySlug);
/* ── Public — Settings ── */
router.get('/settings/site', cmsController_1.getSiteSettings);
router.get('/settings/public', homeSystemController_1.getSettings);
router.get('/settings/analytics', analyticsController_1.getPublicAnalyticsSettings);
router.get('/security/public-config', securityCenterController_1.getPublicSecurityConfigController);
router.get('/subscription-plans', subscriptionController_1.getPublicSubscriptionPlans);
router.get('/subscription-plans/:id', subscriptionController_1.getPublicSubscriptionPlanById);
router.get('/subscription-plans/public', subscriptionController_1.getPublicSubscriptionPlans);
router.get('/home-settings/public', homeSettingsAdminController_1.getPublicHomeSettings);
router.get('/social-links/public', socialLinksController_1.getPublicSocialLinks);
/* ── Public — Dynamic Home System ── */
router.get('/home', auth_1.optionalAuthenticate, homeAggregateController_1.getAggregatedHomeData);
router.get('/home/stream', homeSystemController_1.getHomeStream);
router.get('/home/alerts', homeAlertController_1.getPublicAlerts);
router.get('/settings', homeSystemController_1.getSettings);
router.get('/stats', homeSystemController_1.getStats);
/* ── Public — News ── */
router.get('/news', newsV2Controller_1.getPublicNewsV2List);
router.get('/news/settings', newsV2Controller_1.getPublicNewsV2Settings);
router.get('/news/sources', newsV2Controller_1.getPublicNewsV2Sources);
router.get('/news/featured', cmsController_3.getPublicFeaturedNews);
router.get('/news/trending', cmsController_3.getTrendingNews);
router.get('/news/categories', cmsController_3.getPublicNewsCategories);
router.get('/news/:slug', newsV2Controller_1.getPublicNewsV2BySlug);
router.get('/news-v2/list', newsV2Controller_1.getPublicNewsV2List);
router.get('/news-v2/config/appearance', newsV2Controller_1.getPublicNewsV2Appearance);
router.get('/news-v2/widgets', newsV2Controller_1.getPublicNewsV2Widgets);
router.get('/news-v2/sources', newsV2Controller_1.getPublicNewsV2Sources);
router.get('/news-v2/settings', newsV2Controller_1.getPublicNewsV2Settings);
router.get('/news-v2/:slug', newsV2Controller_1.getPublicNewsV2BySlug);
router.post('/news-v2/share/track', newsV2Controller_1.trackPublicNewsV2Share);
router.post('/news/share/track', newsV2Controller_1.trackPublicNewsV2Share);
router.post('/events/track', auth_1.optionalAuthenticate, analyticsController_1.trackEvent);
/* ── Public — Help Center ── */
router.get('/help-center', helpCenterController_1.getPublicHelpCenter);
router.get('/help-center/search', helpCenterController_1.searchPublicHelpArticles);
router.get('/help-center/:slug', helpCenterController_1.getPublicHelpArticle);
router.post('/help-center/:slug/feedback', helpCenterController_1.submitHelpArticleFeedback);
/* ── Public — Content Blocks ── */
router.get('/content-blocks', contentBlockController_1.getPublicContentBlocks);
router.post('/content-blocks/:id/impression', contentBlockController_1.trackContentBlockImpression);
router.post('/content-blocks/:id/click', contentBlockController_1.trackContentBlockClick);
/* ── Public — System Status ── */
router.get('/system/status', securityAlertController_1.getPublicSystemStatus);
/* ── Public — Services ── */
router.get('/services', serviceController_1.getServices);
router.get('/services-config', cmsController_2.getPublicServiceConfig);
router.get('/service-categories', serviceCategoryController_1.getCategories);
router.get('/services/:id', serviceController_1.getServiceDetails);
/* ── Public — Contact Submit ── */
router.post('/contact', securityRateLimit_2.contactRateLimiter, async (req, res) => {
    try {
        const { name, email, subject, message, phone } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        const msg = await ContactMessage_1.default.create({
            name: String(name).slice(0, 100),
            email: String(email).toLowerCase(),
            phone: phone ? String(phone).slice(0, 20) : undefined,
            subject: String(subject).slice(0, 200),
            message: String(message).slice(0, 5000),
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        await (0, adminAlertService_1.createAdminAlert)({
            title: 'New contact message',
            message: `${msg.subject} from ${msg.name}`,
            linkUrl: `/__cw_admin__/contact?focus=${String(msg._id)}`,
            category: 'update',
            targetRole: 'admin',
        });
        res.status(201).json({ message: 'Message sent successfully', id: msg._id });
    }
    catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
/* ── Protected — Student Exam Portal ── */
router.get('/exams/public-list', auth_1.optionalAuthenticate, examController_1.getPublicExamList);
router.get('/exams', ...examAccessMiddlewares, examController_1.getStudentExams);
router.get('/exams/landing', ...examAccessMiddlewares, examController_1.getExamLanding);
router.get('/exams/:id', ...examAccessMiddlewares, examController_1.getStudentExamById);
router.get('/exams/:id/details', ...examAccessMiddlewares, examController_1.getStudentExamDetails);
router.post('/exams/:id/start', ...examAccessMiddlewares, securityRateLimit_1.examStartRateLimiter, examController_1.startExam);
router.put('/exams/:id/autosave', ...examAccessMiddlewares, examController_1.autosaveExam);
router.post('/exams/:id/submit', ...examAccessMiddlewares, securityRateLimit_1.examSubmitRateLimiter, examController_1.submitExam);
router.get('/exams/:id/result', ...examAccessMiddlewares, examController_1.getExamResult);
router.get('/exams/:examId/questions', ...examAccessMiddlewares, examController_1.getStudentExamQuestions);
router.get('/exams/:examId/attempt/:attemptId', ...examAccessMiddlewares, examController_1.getExamAttemptState);
router.get('/exams/:examId/attempt/:attemptId/stream', ...examAccessMiddlewares, examController_1.streamExamAttempt);
router.post('/exams/:examId/attempt/:attemptId/answer', ...examAccessMiddlewares, examController_1.saveExamAttemptAnswer);
router.post('/exams/:examId/attempt/:attemptId/event', ...examAccessMiddlewares, examController_1.logExamAttemptEvent);
router.post('/exams/:examId/attempt/:attemptId/submit', ...examAccessMiddlewares, securityRateLimit_1.examSubmitRateLimiter, examController_1.submitExamAttempt);
router.get('/exams/:id/certificate', ...examAccessMiddlewares, examController_1.getExamCertificate);
router.get('/certificates/:certificateId/verify', examController_1.verifyExamCertificate);
router.post('/exams/upload-written-answer', ...examAccessMiddlewares, securityRateLimit_1.uploadRateLimiter, mediaController_1.uploadMiddleware.single('file'), mediaController_1.uploadMedia);
router.get('/alerts/active', auth_1.authenticate, homeAlertController_1.getActiveStudentAlerts);
router.post('/alerts/:alertId/ack', auth_1.authenticate, homeAlertController_1.ackStudentAlert);
router.get('/qbank/picker', auth_1.authenticate, questionBankController_1.getQbankPicker);
router.post('/qbank/usage/increment', auth_1.authenticate, questionBankController_1.incrementQbankUsage);
router.get('/student/notices', auth_1.authenticate, adminSupportController_1.studentGetNotices);
router.post('/student/support-tickets', auth_1.authenticate, adminSupportController_1.studentCreateSupportTicket);
router.get('/student/support-tickets', auth_1.authenticate, adminSupportController_1.studentGetSupportTickets);
router.get('/student/support-tickets/:id', auth_1.authenticate, adminSupportController_1.studentGetSupportTicketById);
router.post('/student/support-tickets/:id/reply', auth_1.authenticate, adminSupportController_1.studentReplySupportTicket);
router.get('/subscriptions/me', auth_1.authenticate, subscriptionController_1.getMySubscription);
router.post('/subscriptions/:planId/request-payment', auth_1.authenticate, securityRateLimit_1.subscriptionActionRateLimiter, subscriptionController_1.requestSubscriptionPayment);
router.post('/subscriptions/:planId/upload-proof', auth_1.authenticate, securityRateLimit_1.subscriptionActionRateLimiter, subscriptionController_1.uploadSubscriptionProof);
router.get('/users/me', auth_1.authenticate, studentHubController_1.getStudentMe);
router.put('/users/me', auth_1.authenticate, studentController_1.updateStudentProfile);
router.get('/students/me/exams', auth_1.authenticate, studentHubController_1.getStudentMeExams);
router.get('/students/me/exams/:examId', auth_1.authenticate, studentHubController_1.getStudentMeExamById);
router.get('/students/me/results', auth_1.authenticate, studentHubController_1.getStudentMeResults);
router.get('/students/me/results/:examId', auth_1.authenticate, studentHubController_1.getStudentMeResultByExam);
router.get('/students/me/payments', auth_1.authenticate, studentHubController_1.getStudentMePayments);
router.get('/students/me/notifications', auth_1.authenticate, studentHubController_1.getStudentMeNotifications);
router.post('/students/me/notifications/mark-read', auth_1.authenticate, studentHubController_1.markStudentNotificationsRead);
router.get('/students/me/resources', auth_1.authenticate, studentHubController_1.getStudentMeResources);
/* ── Protected — Password Change ── */
router.post('/auth/change-password', auth_1.authenticate, authController_1.changePassword);
/* ── Protected — Student Profile & Dashboard ── */
router.get('/profile/me', auth_1.authenticate, profileController_1.getProfile);
router.get('/profile/dashboard', auth_1.authenticate, profileController_1.getProfileDashboard);
router.put('/profile/update', auth_1.authenticate, profileController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=publicRoutes.js.map