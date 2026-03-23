export type TwoFactorMethod = 'email' | 'sms' | 'authenticator';
export interface SecurityConfig {
    singleBrowserLogin: boolean;
    forceLogoutOnNewLogin: boolean;
    enable2faAdmin: boolean;
    enable2faStudent: boolean;
    force2faSuperAdmin: boolean;
    default2faMethod: TwoFactorMethod;
    otpExpiryMinutes: number;
    maxOtpAttempts: number;
    ipChangeAlert: boolean;
    allowLegacyTokens: boolean;
    strictExamTabLock: boolean;
    strictTokenHashValidation: boolean;
    testingAccessMode: boolean;
    requiredTwoFactorRoles: string[];
    allowedTwoFactorMethods: TwoFactorMethod[];
    stepUpSensitiveActions: boolean;
    allowTestOtp: boolean;
    testOtpCode: string;
    passwordPolicy: {
        minLength: number;
        requireNumber: boolean;
        requireUppercase: boolean;
        requireSpecial: boolean;
    };
    passwordPolicies: {
        default: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        admin: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        staff: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        student: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumber: boolean;
            requireSpecial: boolean;
            denyCommonPasswords: boolean;
            preventReuseCount: number;
            expiryDays: number;
            forceResetOnFirstLogin: boolean;
        };
        strengthMeterEnabled: boolean;
    };
    authentication: {
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
    };
    verificationRecovery: {
        requireVerifiedEmailForStudents: boolean;
        requireVerifiedEmailForAdmins: boolean;
        phoneVerificationEnabled: boolean;
        emailVerificationExpiryHours: number;
        passwordResetExpiryMinutes: number;
        resendCooldownMinutes: number;
        allowAdminRecovery: boolean;
    };
    loginProtection: {
        maxAttempts: number;
        lockoutMinutes: number;
        recaptchaEnabled: boolean;
    };
    session: {
        accessTokenTTLMinutes: number;
        refreshTokenTTLDays: number;
        idleTimeoutMinutes: number;
    };
    adminAccess: {
        require2FAForAdmins: boolean;
        allowedAdminIPs: string[];
        adminPanelEnabled: boolean;
    };
    siteAccess: {
        maintenanceMode: boolean;
        blockNewRegistrations: boolean;
    };
    examProtection: {
        maxActiveSessionsPerUser: number;
        logTabSwitch: boolean;
        requireProfileScoreForExam: boolean;
        profileScoreThreshold: number;
    };
    logging: {
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        logLoginFailures: boolean;
        logAdminActions: boolean;
    };
    rateLimit: {
        loginWindowMs: number;
        loginMax: number;
        examSubmitWindowMs: number;
        examSubmitMax: number;
        adminWindowMs: number;
        adminMax: number;
        uploadWindowMs: number;
        uploadMax: number;
    };
    panic: {
        readOnlyMode: boolean;
        disableStudentLogins: boolean;
        disablePaymentWebhooks: boolean;
        disableExamStarts: boolean;
    };
}
export declare function getSecurityConfig(forceRefresh?: boolean): Promise<SecurityConfig>;
export declare function invalidateSecurityConfigCache(): void;
//# sourceMappingURL=securityConfigService.d.ts.map