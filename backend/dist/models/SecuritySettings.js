"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const legacyPasswordPolicySchema = new mongoose_1.Schema({
    minLength: { type: Number, default: 10, min: 8, max: 64 },
    requireNumber: { type: Boolean, default: true },
    requireUppercase: { type: Boolean, default: true },
    requireSpecial: { type: Boolean, default: true },
}, { _id: false });
const loginProtectionSchema = new mongoose_1.Schema({
    maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
    lockoutMinutes: { type: Number, default: 15, min: 1, max: 240 },
    recaptchaEnabled: { type: Boolean, default: false },
}, { _id: false });
const legacySessionSchema = new mongoose_1.Schema({
    accessTokenTTLMinutes: { type: Number, default: 20, min: 5, max: 180 },
    refreshTokenTTLDays: { type: Number, default: 7, min: 1, max: 120 },
    idleTimeoutMinutes: { type: Number, default: 60, min: 5, max: 1440 },
}, { _id: false });
const adminAccessSchema = new mongoose_1.Schema({
    require2FAForAdmins: { type: Boolean, default: false },
    allowedAdminIPs: { type: [String], default: [] },
    adminPanelEnabled: { type: Boolean, default: true },
}, { _id: false });
const siteAccessSchema = new mongoose_1.Schema({
    maintenanceMode: { type: Boolean, default: false },
    blockNewRegistrations: { type: Boolean, default: false },
}, { _id: false });
const examProtectionSchema = new mongoose_1.Schema({
    maxActiveSessionsPerUser: { type: Number, default: 1, min: 1, max: 20 },
    logTabSwitch: { type: Boolean, default: true },
    requireProfileScoreForExam: { type: Boolean, default: true },
    profileScoreThreshold: { type: Number, default: 70, min: 0, max: 100 },
}, { _id: false });
const loggingSchema = new mongoose_1.Schema({
    logLevel: { type: String, enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
    logLoginFailures: { type: Boolean, default: true },
    logAdminActions: { type: Boolean, default: true },
}, { _id: false });
const rateLimitSchema = new mongoose_1.Schema({
    loginWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10000 },
    loginMax: { type: Number, default: 10, min: 1, max: 500 },
    examSubmitWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10000 },
    examSubmitMax: { type: Number, default: 60, min: 1, max: 1000 },
    adminWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10000 },
    adminMax: { type: Number, default: 300, min: 1, max: 2000 },
    uploadWindowMs: { type: Number, default: 15 * 60 * 1000, min: 10000 },
    uploadMax: { type: Number, default: 80, min: 1, max: 1000 },
}, { _id: false });
const twoPersonApprovalSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: false },
    riskyActions: {
        type: [String],
        default: [
            'students.bulk_delete',
            'data.destructive_change',
            'universities.bulk_delete',
            'news.bulk_delete',
            'exams.publish_result',
            'news.publish_breaking',
            'payments.mark_refunded',
            'students.export',
            'finance.adjustment',
            'providers.credentials_change',
            'security.settings_change',
        ],
    },
    approvalExpiryMinutes: { type: Number, default: 120, min: 5, max: 1440 },
}, { _id: false });
const retentionSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: false },
    examSessionsDays: { type: Number, default: 30, min: 7, max: 3650 },
    auditLogsDays: { type: Number, default: 180, min: 30, max: 3650 },
    eventLogsDays: { type: Number, default: 90, min: 30, max: 3650 },
}, { _id: false });
const panicSchema = new mongoose_1.Schema({
    readOnlyMode: { type: Boolean, default: false },
    disableStudentLogins: { type: Boolean, default: false },
    disablePaymentWebhooks: { type: Boolean, default: false },
    disableExamStarts: { type: Boolean, default: false },
}, { _id: false });
const roleScopedPasswordPolicySchema = new mongoose_1.Schema({
    minLength: { type: Number, default: 10, min: 8, max: 128 },
    requireUppercase: { type: Boolean, default: true },
    requireLowercase: { type: Boolean, default: true },
    requireNumber: { type: Boolean, default: true },
    requireSpecial: { type: Boolean, default: true },
    denyCommonPasswords: { type: Boolean, default: true },
    preventReuseCount: { type: Number, default: 5, min: 0, max: 24 },
    expiryDays: { type: Number, default: 0, min: 0, max: 3650 },
    forceResetOnFirstLogin: { type: Boolean, default: false },
}, { _id: false });
const authenticationSchema = new mongoose_1.Schema({
    loginAttemptsLimit: { type: Number, default: 5, min: 1, max: 50 },
    lockDurationMinutes: { type: Number, default: 15, min: 1, max: 240 },
    genericErrorMessages: { type: Boolean, default: true },
    verificationRequired: { type: Boolean, default: true },
    allowedLoginMethods: { type: [String], default: ['username', 'email'] },
    accountLockEnabled: { type: Boolean, default: true },
    newDeviceAlerts: { type: Boolean, default: true },
    suspiciousLoginAlerts: { type: Boolean, default: true },
    adminLoginAlerts: { type: Boolean, default: true },
    throttleWindowMinutes: { type: Number, default: 15, min: 1, max: 240 },
    otpResendLimit: { type: Number, default: 8, min: 1, max: 50 },
    otpVerifyLimit: { type: Number, default: 25, min: 1, max: 200 },
    recaptchaEnabled: { type: Boolean, default: false },
}, { _id: false });
const passwordPoliciesSchema = new mongoose_1.Schema({
    default: { type: roleScopedPasswordPolicySchema, default: () => ({}) },
    admin: {
        type: roleScopedPasswordPolicySchema,
        default: () => ({
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: true,
            denyCommonPasswords: true,
            preventReuseCount: 8,
            expiryDays: 90,
            forceResetOnFirstLogin: true,
        }),
    },
    staff: {
        type: roleScopedPasswordPolicySchema,
        default: () => ({
            minLength: 10,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: true,
            denyCommonPasswords: true,
            preventReuseCount: 5,
            expiryDays: 180,
            forceResetOnFirstLogin: true,
        }),
    },
    student: {
        type: roleScopedPasswordPolicySchema,
        default: () => ({
            minLength: 10,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: false,
            denyCommonPasswords: true,
            preventReuseCount: 3,
            expiryDays: 0,
            forceResetOnFirstLogin: false,
        }),
    },
    strengthMeterEnabled: { type: Boolean, default: true },
}, { _id: false });
const twoFactorSchema = new mongoose_1.Schema({
    requireForRoles: { type: [String], default: ['superadmin', 'admin'] },
    optionalForStudents: { type: Boolean, default: true },
    allowedMethods: { type: [String], default: ['authenticator', 'email'] },
    defaultMethod: { type: String, enum: ['authenticator', 'email', 'sms'], default: 'authenticator' },
    emailFallbackEnabled: { type: Boolean, default: true },
    smsFallbackEnabled: { type: Boolean, default: false },
    backupCodesEnabled: { type: Boolean, default: true },
    stepUpForSensitiveActions: { type: Boolean, default: true },
    otpExpiryMinutes: { type: Number, default: 10, min: 1, max: 30 },
    maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
}, { _id: false });
const sessionsSchema = new mongoose_1.Schema({
    accessTokenTTLMinutes: { type: Number, default: 20, min: 5, max: 180 },
    refreshTokenTTLDays: { type: Number, default: 7, min: 1, max: 120 },
    idleTimeoutMinutes: { type: Number, default: 60, min: 5, max: 1440 },
    absoluteTimeoutHours: { type: Number, default: 24, min: 1, max: 720 },
    rememberDeviceDays: { type: Number, default: 30, min: 0, max: 365 },
    maxActiveSessionsPerUser: { type: Number, default: 5, min: 1, max: 20 },
    allowConcurrentSessions: { type: Boolean, default: true },
}, { _id: false });
const accessControlSchema = new mongoose_1.Schema({
    enforceRoutePolicies: { type: Boolean, default: true },
    allowedAdminIPs: { type: [String], default: [] },
    requireApprovalForRiskyActions: { type: Boolean, default: false },
    sensitiveActionReasonRequired: { type: Boolean, default: true },
    exportAllowedRoles: { type: [String], default: ['superadmin', 'admin', 'finance_agent'] },
}, { _id: false });
const verificationRecoverySchema = new mongoose_1.Schema({
    requireVerifiedEmailForStudents: { type: Boolean, default: true },
    requireVerifiedEmailForAdmins: { type: Boolean, default: false },
    phoneVerificationEnabled: { type: Boolean, default: false },
    emailVerificationExpiryHours: { type: Number, default: 24, min: 1, max: 168 },
    passwordResetExpiryMinutes: { type: Number, default: 60, min: 5, max: 1440 },
    resendCooldownMinutes: { type: Number, default: 5, min: 1, max: 120 },
    allowAdminRecovery: { type: Boolean, default: true },
}, { _id: false });
const uploadSecuritySchema = new mongoose_1.Schema({
    publicAllowedExtensions: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
    protectedAllowedExtensions: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'] },
    maxImageSizeMB: { type: Number, default: 5, min: 1, max: 50 },
    maxDocumentSizeMB: { type: Number, default: 10, min: 1, max: 100 },
    blockDangerousExtensions: { type: Boolean, default: true },
    protectedAccessEnabled: { type: Boolean, default: true },
    virusScanStatus: { type: String, enum: ['disabled', 'hook_ready', 'enabled'], default: 'hook_ready' },
}, { _id: false });
const alertingSchema = new mongoose_1.Schema({
    recipients: { type: [String], default: [] },
    failedLoginThreshold: { type: Number, default: 10, min: 1, max: 1000 },
    otpFailureThreshold: { type: Number, default: 10, min: 1, max: 1000 },
    backupFailureAlerts: { type: Boolean, default: true },
    providerChangeAlerts: { type: Boolean, default: true },
    exportAlerts: { type: Boolean, default: true },
    suspiciousAdminAlerts: { type: Boolean, default: true },
}, { _id: false });
const exportSecuritySchema = new mongoose_1.Schema({
    allowedRoles: { type: [String], default: ['superadmin', 'admin', 'finance_agent'] },
    requireApproval: { type: Boolean, default: false },
    requireReason: { type: Boolean, default: true },
    logAllExports: { type: Boolean, default: true },
    maskSensitiveFields: { type: Boolean, default: true },
}, { _id: false });
const backupRestoreSchema = new mongoose_1.Schema({
    backupHealthWarnAfterHours: { type: Number, default: 24, min: 1, max: 720 },
    requireRestoreApproval: { type: Boolean, default: true },
    archiveBeforeHardDelete: { type: Boolean, default: true },
    showStatusOnDashboard: { type: Boolean, default: true },
}, { _id: false });
const runtimeGuardsSchema = new mongoose_1.Schema({
    maintenanceMode: { type: Boolean, default: false },
    blockNewRegistrations: { type: Boolean, default: false },
    readOnlyMode: { type: Boolean, default: false },
    disableStudentLogins: { type: Boolean, default: false },
    disablePaymentWebhooks: { type: Boolean, default: false },
    disableExamStarts: { type: Boolean, default: false },
    adminPanelEnabled: { type: Boolean, default: true },
    testingAccessMode: { type: Boolean, default: false },
}, { _id: false });
const SecuritySettingsSchema = new mongoose_1.Schema({
    key: { type: String, default: 'global', unique: true, index: true },
    passwordPolicy: { type: legacyPasswordPolicySchema, default: () => ({}) },
    loginProtection: { type: loginProtectionSchema, default: () => ({}) },
    session: { type: legacySessionSchema, default: () => ({}) },
    adminAccess: { type: adminAccessSchema, default: () => ({}) },
    siteAccess: { type: siteAccessSchema, default: () => ({}) },
    examProtection: { type: examProtectionSchema, default: () => ({}) },
    logging: { type: loggingSchema, default: () => ({}) },
    rateLimit: { type: rateLimitSchema, default: () => ({}) },
    twoPersonApproval: { type: twoPersonApprovalSchema, default: () => ({}) },
    retention: { type: retentionSchema, default: () => ({}) },
    panic: { type: panicSchema, default: () => ({}) },
    authentication: { type: authenticationSchema, default: () => ({}) },
    passwordPolicies: { type: passwordPoliciesSchema, default: () => ({}) },
    twoFactor: { type: twoFactorSchema, default: () => ({}) },
    sessions: { type: sessionsSchema, default: () => ({}) },
    accessControl: { type: accessControlSchema, default: () => ({}) },
    verificationRecovery: { type: verificationRecoverySchema, default: () => ({}) },
    uploadSecurity: { type: uploadSecuritySchema, default: () => ({}) },
    alerting: { type: alertingSchema, default: () => ({}) },
    exportSecurity: { type: exportSecuritySchema, default: () => ({}) },
    backupRestore: { type: backupRestoreSchema, default: () => ({}) },
    runtimeGuards: { type: runtimeGuardsSchema, default: () => ({}) },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
    timestamps: true,
    collection: 'security_settings',
    strict: true,
});
exports.default = mongoose_1.default.model('SecuritySettings', SecuritySettingsSchema);
//# sourceMappingURL=SecuritySettings.js.map