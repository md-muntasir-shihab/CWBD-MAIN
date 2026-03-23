"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityConfig = getSecurityConfig;
exports.invalidateSecurityConfigCache = invalidateSecurityConfigCache;
const securityCenterService_1 = require("./securityCenterService");
let cache = null;
async function getSecurityConfig(forceRefresh = false) {
    if (!forceRefresh && cache && Date.now() - cache.ts < 30000) {
        return cache.data;
    }
    const settings = await (0, securityCenterService_1.getSecuritySettingsSnapshot)(forceRefresh);
    const requiredTwoFactorRoles = settings.twoFactor.requireForRoles.map((role) => role.toLowerCase());
    const enable2faAdmin = requiredTwoFactorRoles.some((role) => ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'].includes(role));
    const enable2faStudent = requiredTwoFactorRoles.includes('student');
    const forceLogoutOnNewLogin = !settings.sessions.allowConcurrentSessions || settings.sessions.maxActiveSessionsPerUser <= 1;
    const data = {
        singleBrowserLogin: forceLogoutOnNewLogin,
        forceLogoutOnNewLogin,
        enable2faAdmin,
        enable2faStudent,
        force2faSuperAdmin: requiredTwoFactorRoles.includes('superadmin'),
        default2faMethod: settings.twoFactor.defaultMethod,
        otpExpiryMinutes: settings.twoFactor.otpExpiryMinutes,
        maxOtpAttempts: settings.twoFactor.maxAttempts,
        ipChangeAlert: settings.authentication.newDeviceAlerts || settings.authentication.suspiciousLoginAlerts,
        allowLegacyTokens: false,
        strictExamTabLock: settings.examProtection.logTabSwitch,
        strictTokenHashValidation: true,
        testingAccessMode: settings.runtimeGuards.testingAccessMode,
        requiredTwoFactorRoles,
        allowedTwoFactorMethods: settings.twoFactor.allowedMethods,
        stepUpSensitiveActions: settings.twoFactor.stepUpForSensitiveActions,
        allowTestOtp: String(process.env.ALLOW_TEST_OTP ||
            (process.env.NODE_ENV === 'production' ? 'false' : 'true')).trim().toLowerCase() === 'true',
        testOtpCode: String(process.env.TEST_OTP_CODE || '123456'),
        passwordPolicy: settings.passwordPolicy,
        passwordPolicies: settings.passwordPolicies,
        authentication: settings.authentication,
        loginProtection: settings.loginProtection,
        session: settings.session,
        adminAccess: settings.adminAccess,
        siteAccess: settings.siteAccess,
        examProtection: settings.examProtection,
        logging: settings.logging,
        rateLimit: settings.rateLimit,
        panic: settings.panic,
        verificationRecovery: settings.verificationRecovery,
    };
    cache = { data, ts: Date.now() };
    return data;
}
function invalidateSecurityConfigCache() {
    cache = null;
    (0, securityCenterService_1.invalidateSecuritySettingsCache)();
}
//# sourceMappingURL=securityConfigService.js.map