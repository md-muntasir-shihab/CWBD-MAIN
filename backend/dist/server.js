"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const db_1 = require("./config/db");
const auth_1 = require("./middlewares/auth");
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const webhookRoutes_1 = __importDefault(require("./routes/webhookRoutes"));
const studentExamRoutes_1 = require("./routes/exams/studentExamRoutes");
const defaultSetup_1 = require("./setup/defaultSetup");
const examJobs_1 = require("./cron/examJobs");
const modernExamJobs_1 = require("./cron/modernExamJobs");
const dashboardJobs_1 = require("./cron/dashboardJobs");
const financeRecurringJobs_1 = require("./cron/financeRecurringJobs");
const financeSeedService_1 = require("./services/financeSeedService");
const newsJobs_1 = require("./cron/newsJobs");
const notificationJobs_1 = require("./cron/notificationJobs");
const retentionJobs_1 = require("./cron/retentionJobs");
const subscriptionExpiryCron_1 = require("./cron/subscriptionExpiryCron");
const adminStudentMgmtRoutes_1 = __importDefault(require("./routes/adminStudentMgmtRoutes"));
const adminProviderRoutes_1 = __importDefault(require("./routes/adminProviderRoutes"));
const adminNotificationRoutes_1 = __importDefault(require("./routes/adminNotificationRoutes"));
const adminStudentSecurityRoutes_1 = __importDefault(require("./routes/adminStudentSecurityRoutes"));
const secureUploadController_1 = require("./controllers/secureUploadController");
const securityGuards_1 = require("./middlewares/securityGuards");
const requestSanitizer_1 = require("./middlewares/requestSanitizer");
const securityRateLimit_1 = require("./middlewares/securityRateLimit");
const requestId_1 = require("./middlewares/requestId");
const logger_1 = require("./utils/logger");
const migrate_communication_center_v1_1 = require("./scripts/migrate-communication-center-v1");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || 'campusway-secure-admin';
const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000'];
const APP_VERSION = process.env.npm_package_version || '1.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DISABLE_RATE_LIMIT = process.env.DISABLE_SECURITY_RATE_LIMIT === 'true' ||
    process.env.E2E_DISABLE_RATE_LIMIT === 'true';
function shouldSkipExpressRateLimit(req) {
    if (DISABLE_RATE_LIMIT)
        return true;
    if (!IS_PRODUCTION) {
        const ip = String(req.ip || req.socket?.remoteAddress || '').toLowerCase();
        const forwarded = String(req.headers['x-forwarded-for'] || '').toLowerCase();
        const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || '').toLowerCase();
        const isLoopbackIp = ip.includes('127.0.0.1') ||
            ip.includes('::1') ||
            forwarded.includes('127.0.0.1') ||
            forwarded.includes('::1');
        if (isLoopbackIp)
            return true;
        if (identifier.includes('e2e_') || identifier.endsWith('@campusway.local'))
            return true;
    }
    return false;
}
function validateRequiredEnv() {
    if (!String(process.env.MONGODB_URI || '').trim() && String(process.env.MONGO_URI || '').trim()) {
        process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    const requiredKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    if (IS_PRODUCTION) {
        requiredKeys.push('FRONTEND_URL', 'ADMIN_ORIGIN');
    }
    const missing = requiredKeys.filter((key) => !String(process.env[key] || '').trim());
    const hasMongoUri = Boolean(String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim());
    if (!hasMongoUri)
        missing.push('MONGODB_URI|MONGO_URI');
    if (missing.length > 0) {
        console.error(`[startup] Missing required env keys: ${missing.join(', ')}`);
        console.error('[startup] Please update backend/.env (see backend/.env.example).');
        process.exit(1);
    }
}
function parseCorsOrigins(raw) {
    if (!raw)
        return DEFAULT_CORS_ORIGINS;
    const parsed = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : DEFAULT_CORS_ORIGINS;
}
const allowedCorsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN ||
    [process.env.FRONTEND_URL, process.env.ADMIN_ORIGIN].filter(Boolean).join(','));
if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}
function isLoopbackOrigin(origin) {
    const normalized = origin.trim();
    if (!normalized)
        return false;
    if (normalized === 'null')
        return true;
    const loopbackPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|::1)(?::\d+)?$/i;
    if (loopbackPattern.test(normalized))
        return true;
    try {
        const parsed = new URL(normalized);
        return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    }
    catch {
        return false;
    }
}
function inferStandaloneAdminModule(pathname) {
    const clean = String(pathname || '').trim().toLowerCase();
    if (!clean || clean === '/health' || clean.startsWith('/openapi'))
        return null;
    if (clean.endsWith('/security') ||
        clean.includes('/set-password') ||
        clean.includes('/force-reset') ||
        clean.includes('/revoke-sessions') ||
        clean.includes('/resend-account-info')) {
        return 'security_logs';
    }
    if (clean.startsWith('/students-v2') ||
        clean.startsWith('/students/create-with-password') ||
        clean.startsWith('/students/') ||
        clean.startsWith('/student-groups') ||
        clean.startsWith('/student-contact-timeline') ||
        clean.startsWith('/student-settings') ||
        clean.startsWith('/audience-segments') ||
        clean.startsWith('/import-export-logs')) {
        return 'students_groups';
    }
    if (clean.startsWith('/subscriptions-v2') || clean.startsWith('/subscription-plans') || clean.startsWith('/subscriptions')) {
        return 'subscription_plans';
    }
    if (clean.startsWith('/payments') ||
        clean.startsWith('/finance') ||
        clean.startsWith('/expenses') ||
        clean.startsWith('/staff-payouts') ||
        clean.startsWith('/dues') ||
        clean.includes('/payments') ||
        clean.includes('/finance')) {
        return 'payments';
    }
    if (clean.startsWith('/support-tickets') || clean.startsWith('/contact-messages') || clean.startsWith('/notices')) {
        return 'support_center';
    }
    if (clean.startsWith('/notifications') ||
        clean.startsWith('/notifications-v2') ||
        clean.startsWith('/notification-providers') ||
        clean.startsWith('/notification-templates') ||
        clean.startsWith('/data-hub')) {
        return 'notifications';
    }
    return null;
}
function inferStandaloneAdminAction(method, pathname) {
    const cleanPath = String(pathname || '').toLowerCase();
    const upperMethod = String(method || '').toUpperCase();
    if (cleanPath.includes('bulk'))
        return 'bulk';
    if (cleanPath.includes('/export'))
        return 'export';
    if (cleanPath.includes('publish'))
        return 'publish';
    if (cleanPath.includes('approve') || cleanPath.includes('reject'))
        return 'approve';
    if (upperMethod === 'GET' || upperMethod === 'HEAD' || upperMethod === 'OPTIONS')
        return 'view';
    if (upperMethod === 'POST')
        return 'create';
    if (upperMethod === 'DELETE')
        return 'delete';
    return 'edit';
}
const enforceStandaloneAdminModulePermissions = (req, res, next) => {
    const moduleName = inferStandaloneAdminModule(req.path);
    if (!moduleName) {
        next();
        return;
    }
    const action = inferStandaloneAdminAction(req.method, req.path);
    return (0, auth_1.requirePermission)(moduleName, action)(req, res, next);
};
const standaloneAdminApiHardening = [
    auth_1.authenticate,
    securityGuards_1.enforceAdminPanelPolicy,
    securityGuards_1.enforceAdminReadOnlyMode,
    enforceStandaloneAdminModulePermissions,
];
// =============
// Middleware
// =============
app.use(requestId_1.requestIdMiddleware);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    xssFilter: true,
    hsts: IS_PRODUCTION
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    frameguard: { action: 'deny' },
    contentSecurityPolicy: IS_PRODUCTION ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])],
        },
    } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_mongo_sanitize_1.default)({ replaceWith: '_' }));
app.use(requestSanitizer_1.sanitizeRequestPayload);
app.use(securityGuards_1.enforceSiteAccess);
// Serve uploaded media files
app.get('/uploads/:storedName', secureUploadController_1.serveSecureUpload);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads'), {
    maxAge: IS_PRODUCTION ? '7d' : 0,
    etag: true,
    setHeaders: (res, filePath) => {
        if (IS_PRODUCTION && /\.(png|jpe?g|webp|gif|svg|pdf|woff2?|ttf|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
        else if (!IS_PRODUCTION) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));
// CORS
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        const allowLoopback = !IS_PRODUCTION && isLoopbackOrigin(origin);
        if (allowedCorsOrigins.includes(origin) || allowLoopback) {
            callback(null, true);
            return;
        }
        console.warn('[cors] blocked origin', origin);
        callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
}));
// Rate limiting
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_PRODUCTION ? 500 : 1000, // more generous for local development
    message: { message: 'Too many requests, please try again later.' },
    skip: shouldSkipExpressRateLimit,
});
app.use('/api/', apiLimiter);
// Stricter rate limit for auth
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: IS_PRODUCTION ? 20 : 100,
    message: { message: 'Too many login attempts, please try again later.' },
    skip: shouldSkipExpressRateLimit,
});
app.use('/api/auth/login', authLimiter);
// =============
// Routes
// =============
// Public API
app.use('/api', publicRoutes_1.default);
// Admin API (behind secret path)
app.use(`/api/${ADMIN_SECRET_PATH}`, securityRateLimit_1.adminRateLimiter);
app.use(`/api/${ADMIN_SECRET_PATH}`, adminRoutes_1.default);
app.use('/api/admin', securityRateLimit_1.adminRateLimiter);
app.use('/api/admin', standaloneAdminApiHardening, adminStudentMgmtRoutes_1.default);
app.use('/api/admin', standaloneAdminApiHardening, adminNotificationRoutes_1.default);
app.use('/api/admin', standaloneAdminApiHardening, adminProviderRoutes_1.default);
app.use('/api/admin', standaloneAdminApiHardening, adminStudentSecurityRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Student API
app.use('/api/student', studentRoutes_1.default);
// Modern exam routes (session-based)
app.use('/api', studentExamRoutes_1.studentExamRoutes);
// Webhooks
app.use('/api/webhooks', webhookRoutes_1.default);
app.use('/api/payments', webhookRoutes_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    const dbStateMap = {
        0: 'down',
        1: 'connected',
        2: 'down',
        3: 'down',
        99: 'down',
    };
    const readyState = mongoose_1.default.connection.readyState;
    const db = dbStateMap[readyState] || 'down';
    res.json({
        status: 'OK',
        timeUTC: new Date().toISOString(),
        version: APP_VERSION,
        db,
    });
});
// 404 handler / Frontend Serve
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path_1.default.join(frontendDist, 'index.html'));
        }
        else {
            res.status(404).json({ message: 'API Route not found' });
        }
    });
}
else {
    app.use((_req, res) => {
        res.status(404).json({ message: 'Route not found' });
    });
}
// Error handler
app.use((err, req, res, _next) => {
    const statusCode = Number(err.status || 500);
    const isClientError = statusCode >= 400 && statusCode < 500;
    const message = isClientError ? err.message || 'Request failed' : 'Internal server error';
    logger_1.logger.error(`Unhandled error: ${err.message}`, req, {
        statusCode,
        stack: IS_PRODUCTION ? undefined : err.stack,
        path: req.path,
        method: req.method,
    });
    res.status(statusCode).json({ message, requestId: req.requestId });
});
// =============
// Start
// =============
async function start() {
    validateRequiredEnv();
    await (0, db_1.connectDB)();
    const communicationMigrationResult = await (0, migrate_communication_center_v1_1.runCommunicationCenterMigration)();
    console.log('[startup] communication migration completed', communicationMigrationResult);
    // First-boot setup (controlled by ALLOW_DEFAULT_SETUP env)
    await (0, defaultSetup_1.runDefaultSetup)();
    // Start background cron jobs (e.g. auto-submitting expired exams)
    (0, examJobs_1.startExamCronJobs)();
    (0, modernExamJobs_1.startModernExamCronJobs)();
    (0, dashboardJobs_1.startStudentDashboardCronJobs)();
    (0, newsJobs_1.startNewsV2CronJobs)();
    (0, notificationJobs_1.startNotificationJobCron)();
    (0, retentionJobs_1.startRetentionCronJobs)();
    (0, subscriptionExpiryCron_1.startSubscriptionExpiryCron)();
    (0, financeRecurringJobs_1.startFinanceRecurringCronJobs)();
    // Seed default Chart-of-Account entries (idempotent)
    await (0, financeSeedService_1.seedDefaultChartOfAccounts)();
    const server = app.listen(PORT, () => {
        console.log(`🚀 CampusWay Backend running on port ${PORT}`);
        console.log(`📡 Public API: http://localhost:${PORT}/api`);
        console.log(`🔒 Admin API:  http://localhost:${PORT}/api/${ADMIN_SECRET_PATH}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use. Please:`);
            console.error(`   1. Stop the other process using port ${PORT}, or`);
            console.error(`   2. Set a different PORT in your .env file`);
            process.exit(1);
        }
        else {
            console.error('❌ Server error:', err);
            process.exit(1);
        }
    });
}
start();
//# sourceMappingURL=server.js.map