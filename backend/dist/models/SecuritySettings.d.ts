import mongoose, { Document } from 'mongoose';
export type SecurityLogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface PasswordPolicy {
    minLength: number;
    requireNumber: boolean;
    requireUppercase: boolean;
    requireSpecial: boolean;
}
export interface LoginProtectionSettings {
    maxAttempts: number;
    lockoutMinutes: number;
    recaptchaEnabled: boolean;
}
export interface SessionSecuritySettings {
    accessTokenTTLMinutes: number;
    refreshTokenTTLDays: number;
    idleTimeoutMinutes: number;
}
export interface AdminAccessSettings {
    require2FAForAdmins: boolean;
    allowedAdminIPs: string[];
    adminPanelEnabled: boolean;
}
export interface SiteAccessSettings {
    maintenanceMode: boolean;
    blockNewRegistrations: boolean;
}
export interface ExamProtectionSettings {
    maxActiveSessionsPerUser: number;
    logTabSwitch: boolean;
    requireProfileScoreForExam: boolean;
    profileScoreThreshold: number;
}
export interface LoggingSettings {
    logLevel: SecurityLogLevel;
    logLoginFailures: boolean;
    logAdminActions: boolean;
}
export type RiskyActionKey = 'data.destructive_change' | 'students.bulk_delete' | 'universities.bulk_delete' | 'news.bulk_delete' | 'exams.publish_result' | 'news.publish_breaking' | 'payments.mark_refunded' | 'students.export' | 'finance.adjustment' | 'providers.credentials_change' | 'security.settings_change' | 'backups.restore';
export interface TwoPersonApprovalSettings {
    enabled: boolean;
    riskyActions: RiskyActionKey[];
    approvalExpiryMinutes: number;
}
export interface RetentionSettings {
    enabled: boolean;
    examSessionsDays: number;
    auditLogsDays: number;
    eventLogsDays: number;
}
export interface PanicSettings {
    readOnlyMode: boolean;
    disableStudentLogins: boolean;
    disablePaymentWebhooks: boolean;
    disableExamStarts: boolean;
}
export interface RateLimitSettings {
    loginWindowMs: number;
    loginMax: number;
    examSubmitWindowMs: number;
    examSubmitMax: number;
    adminWindowMs: number;
    adminMax: number;
    uploadWindowMs: number;
    uploadMax: number;
}
export interface RoleScopedPasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    denyCommonPasswords: boolean;
    preventReuseCount: number;
    expiryDays: number;
    forceResetOnFirstLogin: boolean;
}
export interface AuthenticationSecuritySettings {
    loginAttemptsLimit: number;
    lockDurationMinutes: number;
    genericErrorMessages: boolean;
    verificationRequired: boolean;
    allowedLoginMethods: Array<'username' | 'email' | 'phone'>;
    accountLockEnabled: boolean;
    newDeviceAlerts: boolean;
    suspiciousLoginAlerts: boolean;
    adminLoginAlerts: boolean;
    throttleWindowMinutes: number;
    otpResendLimit: number;
    otpVerifyLimit: number;
    recaptchaEnabled: boolean;
}
export interface PasswordPoliciesSettings {
    default: RoleScopedPasswordPolicy;
    admin: RoleScopedPasswordPolicy;
    staff: RoleScopedPasswordPolicy;
    student: RoleScopedPasswordPolicy;
    strengthMeterEnabled: boolean;
}
export interface TwoFactorSecuritySettings {
    requireForRoles: string[];
    optionalForStudents: boolean;
    allowedMethods: Array<'authenticator' | 'email' | 'sms'>;
    defaultMethod: 'authenticator' | 'email' | 'sms';
    emailFallbackEnabled: boolean;
    smsFallbackEnabled: boolean;
    backupCodesEnabled: boolean;
    stepUpForSensitiveActions: boolean;
    otpExpiryMinutes: number;
    maxAttempts: number;
}
export interface SessionsSecurityCenterSettings {
    accessTokenTTLMinutes: number;
    refreshTokenTTLDays: number;
    idleTimeoutMinutes: number;
    absoluteTimeoutHours: number;
    rememberDeviceDays: number;
    maxActiveSessionsPerUser: number;
    allowConcurrentSessions: boolean;
}
export interface AccessControlSecuritySettings {
    enforceRoutePolicies: boolean;
    allowedAdminIPs: string[];
    requireApprovalForRiskyActions: boolean;
    sensitiveActionReasonRequired: boolean;
    exportAllowedRoles: string[];
}
export interface VerificationRecoverySettings {
    requireVerifiedEmailForStudents: boolean;
    requireVerifiedEmailForAdmins: boolean;
    phoneVerificationEnabled: boolean;
    emailVerificationExpiryHours: number;
    passwordResetExpiryMinutes: number;
    resendCooldownMinutes: number;
    allowAdminRecovery: boolean;
}
export interface UploadSecuritySettings {
    publicAllowedExtensions: string[];
    protectedAllowedExtensions: string[];
    maxImageSizeMB: number;
    maxDocumentSizeMB: number;
    blockDangerousExtensions: boolean;
    protectedAccessEnabled: boolean;
    virusScanStatus: 'disabled' | 'hook_ready' | 'enabled';
}
export interface AlertingSecuritySettings {
    recipients: string[];
    failedLoginThreshold: number;
    otpFailureThreshold: number;
    backupFailureAlerts: boolean;
    providerChangeAlerts: boolean;
    exportAlerts: boolean;
    suspiciousAdminAlerts: boolean;
}
export interface ExportSecuritySettings {
    allowedRoles: string[];
    requireApproval: boolean;
    requireReason: boolean;
    logAllExports: boolean;
    maskSensitiveFields: boolean;
}
export interface BackupRestoreSecuritySettings {
    backupHealthWarnAfterHours: number;
    requireRestoreApproval: boolean;
    archiveBeforeHardDelete: boolean;
    showStatusOnDashboard: boolean;
}
export interface RuntimeGuardSettings {
    maintenanceMode: boolean;
    blockNewRegistrations: boolean;
    readOnlyMode: boolean;
    disableStudentLogins: boolean;
    disablePaymentWebhooks: boolean;
    disableExamStarts: boolean;
    adminPanelEnabled: boolean;
    testingAccessMode: boolean;
}
export interface ISecuritySettings extends Document {
    key: 'global';
    passwordPolicy: PasswordPolicy;
    loginProtection: LoginProtectionSettings;
    session: SessionSecuritySettings;
    adminAccess: AdminAccessSettings;
    siteAccess: SiteAccessSettings;
    examProtection: ExamProtectionSettings;
    logging: LoggingSettings;
    rateLimit: RateLimitSettings;
    twoPersonApproval: TwoPersonApprovalSettings;
    retention: RetentionSettings;
    panic: PanicSettings;
    authentication: AuthenticationSecuritySettings;
    passwordPolicies: PasswordPoliciesSettings;
    twoFactor: TwoFactorSecuritySettings;
    sessions: SessionsSecurityCenterSettings;
    accessControl: AccessControlSecuritySettings;
    verificationRecovery: VerificationRecoverySettings;
    uploadSecurity: UploadSecuritySettings;
    alerting: AlertingSecuritySettings;
    exportSecurity: ExportSecuritySettings;
    backupRestore: BackupRestoreSecuritySettings;
    runtimeGuards: RuntimeGuardSettings;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ISecuritySettings, {}, {}, {}, mongoose.Document<unknown, {}, ISecuritySettings, {}, {}> & ISecuritySettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SecuritySettings.d.ts.map