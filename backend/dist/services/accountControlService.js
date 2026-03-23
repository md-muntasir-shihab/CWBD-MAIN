"use strict";
/**
 * Account Control Service
 *
 * Admin-side account lifecycle operations:
 * - Create student with admin-set password
 * - Send / resend account info
 * - Admin set new password
 * - Force password reset toggle
 * - Revoke all sessions
 * - Student self-service change password (with audit)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSetPassword = adminSetPassword;
exports.createStudentWithPassword = createStudentWithPassword;
exports.adminResendAccountInfo = adminResendAccountInfo;
exports.toggleForceReset = toggleForceReset;
exports.adminRevokeStudentSessions = adminRevokeStudentSessions;
exports.studentChangePassword = studentChangePassword;
exports.getStudentSecurityMeta = getStudentSecurityMeta;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const ActiveSession_1 = __importDefault(require("../models/ActiveSession"));
const securityConfigService_1 = require("./securityConfigService");
const sessionSecurityService_1 = require("./sessionSecurityService");
const securityTokenService_1 = require("./securityTokenService");
const mailer_1 = require("../utils/mailer");
const APP_DOMAIN = process.env.APP_DOMAIN || process.env.FRONTEND_URL || 'http://localhost:5173';
function newRandomPassword(length = 24) {
    return crypto_1.default.randomBytes(length).toString('base64url').slice(0, length);
}
async function issueSetPasswordInvite(user, adminId) {
    const email = String(user.email || '').trim().toLowerCase();
    if (!email)
        return false;
    const { rawToken } = await (0, securityTokenService_1.issueSecurityToken)({
        userId: user._id,
        purpose: 'set_password',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        channel: 'email',
        replaceExisting: true,
        createdBy: new mongoose_1.default.Types.ObjectId(adminId),
        meta: { email },
    });
    const setPasswordUrl = `${APP_DOMAIN}/student/reset-password?token=${rawToken}`;
    return (0, mailer_1.sendCampusMail)({
        to: email,
        subject: 'CampusWay: Set your password',
        text: `Set your CampusWay password: ${setPasswordUrl}`,
        html: `<p>Hello ${user.full_name || user.username},</p><p>Your CampusWay account is ready.</p><p><a href="${setPasswordUrl}">Set your password</a></p><p>This link expires in 24 hours and can be used once.</p>`,
    });
}
async function applyInviteOnlyPasswordState(user, adminId) {
    user.password = await bcryptjs_1.default.hash(newRandomPassword(), 12);
    user.passwordSetByAdminId = new mongoose_1.default.Types.ObjectId(adminId);
    user.passwordLastChangedAtUTC = new Date();
    user.passwordChangedByType = 'admin';
    user.forcePasswordResetRequired = true;
    user.mustChangePassword = true;
    user.password_updated_at = new Date();
    user.passwordExpiresAt = null;
}
/* ================================================================
   Admin: set password for student
   ================================================================ */
async function adminSetPassword(opts) {
    const user = await User_1.default.findById(opts.studentId).select('+password');
    if (!user) {
        return { success: false, message: 'Student not found.' };
    }
    await applyInviteOnlyPasswordState(user, opts.adminId);
    await user.save();
    if (opts.revokeExistingSessions !== false) {
        await (0, sessionSecurityService_1.terminateSessionsForUser)(String(user._id), 'admin_password_reset', {
            initiatedBy: opts.adminId,
            meta: { trigger: 'admin_set_password' },
        });
    }
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(opts.adminId),
        actor_role: 'admin',
        action: 'admin_reset_student_password',
        target_id: user._id,
        target_type: 'User',
        ip_address: opts.ipAddress,
        details: {
            revokedSessions: opts.revokeExistingSessions !== false,
            flow: 'invite_only',
        },
    });
    let sendResult;
    if (!opts.sendVia || opts.sendVia.includes('email')) {
        const inviteSent = await issueSetPasswordInvite(user, opts.adminId);
        sendResult = { sent: inviteSent ? 1 : 0, failed: inviteSent ? 0 : 1 };
        user.accountInfoLastSentAtUTC = inviteSent ? new Date() : user.accountInfoLastSentAtUTC;
        user.accountInfoLastSentChannels = inviteSent ? ['email'] : user.accountInfoLastSentChannels;
        user.credentialsLastResentAtUTC = new Date();
        await user.save();
    }
    return {
        success: true,
        message: sendResult?.sent ? 'Password reset link issued successfully.' : 'Password reset prepared. No invite was delivered.',
        sendResult,
    };
}
/* ================================================================
   Admin: create student with password (and optional send)
   ================================================================ */
async function createStudentWithPassword(opts) {
    // Check for existing user
    const existing = await User_1.default.findOne({
        $or: [
            { username: opts.username },
            ...(opts.email ? [{ email: opts.email }] : []),
        ],
    }).lean();
    if (existing) {
        return { success: false, message: 'A user with this username or email already exists.' };
    }
    const hashed = await bcryptjs_1.default.hash(newRandomPassword(), 12);
    const user = await User_1.default.create({
        username: opts.username,
        email: opts.email,
        phone_number: opts.phone_number,
        full_name: opts.full_name,
        password: hashed,
        role: opts.role ?? 'student',
        status: 'active',
        passwordSetByAdminId: new mongoose_1.default.Types.ObjectId(opts.adminId),
        passwordLastChangedAtUTC: new Date(),
        passwordChangedByType: 'admin',
        forcePasswordResetRequired: true,
        mustChangePassword: true,
        passwordExpiresAt: null,
    });
    // Create student profile
    if (opts.profileData || opts.role === 'student') {
        await StudentProfile_1.default.create({
            user_id: user._id,
            full_name: opts.full_name,
            email: opts.email,
            phone_number: opts.phone_number,
            department: opts.profileData?.department,
            ssc_batch: opts.profileData?.ssc_batch,
            hsc_batch: opts.profileData?.hsc_batch,
            guardian_name: opts.profileData?.guardian_name,
            guardian_phone: opts.profileData?.guardian_phone,
            guardian_email: opts.profileData?.guardian_email,
            roll_number: opts.profileData?.roll_number,
        });
    }
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(opts.adminId),
        actor_role: 'admin',
        action: 'admin_created_student',
        target_id: user._id,
        target_type: 'User',
        ip_address: opts.ipAddress,
        details: {
            sendVia: opts.sendVia,
            flow: 'invite_only',
        },
    });
    let sendResult;
    const inviteSent = await issueSetPasswordInvite(user, opts.adminId);
    sendResult = { sent: inviteSent ? 1 : 0, failed: inviteSent ? 0 : 1 };
    if (inviteSent) {
        user.accountInfoLastSentAtUTC = new Date();
        user.accountInfoLastSentChannels = ['email'];
        await user.save();
    }
    return {
        success: true,
        message: inviteSent ? 'Student created and password setup link sent.' : 'Student created. No password setup invite was delivered.',
        userId: String(user._id),
        sendResult,
    };
}
/* ================================================================
   Admin: resend account info
   ================================================================ */
async function adminResendAccountInfo(studentId, channels, adminId) {
    const user = await User_1.default.findById(studentId).select('username full_name email').lean();
    if (!user)
        throw new Error('Student not found');
    const inviteSent = (!channels.length || channels.includes('email'))
        ? await issueSetPasswordInvite(user, adminId)
        : false;
    await User_1.default.findByIdAndUpdate(studentId, {
        $set: {
            accountInfoLastSentAtUTC: inviteSent ? new Date() : undefined,
            accountInfoLastSentChannels: inviteSent ? ['email'] : undefined,
            credentialsLastResentAtUTC: new Date(),
        },
    });
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(adminId),
        actor_role: 'admin',
        action: 'account_setup_invite_resent',
        target_id: new mongoose_1.default.Types.ObjectId(studentId),
        target_type: 'User',
        details: { channels, inviteSent },
    });
    return { sent: inviteSent ? 1 : 0, failed: inviteSent ? 0 : 1 };
}
/* ================================================================
   Admin: force password reset toggle
   ================================================================ */
async function toggleForceReset(studentId, force, adminId, ipAddress) {
    await User_1.default.findByIdAndUpdate(studentId, {
        forcePasswordResetRequired: force,
        mustChangePassword: force,
    });
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(adminId),
        actor_role: 'admin',
        action: force ? 'force_password_reset_enabled' : 'force_password_reset_disabled',
        target_id: new mongoose_1.default.Types.ObjectId(studentId),
        target_type: 'User',
        ip_address: ipAddress,
    });
}
/* ================================================================
   Admin: revoke all sessions for a student
   ================================================================ */
async function adminRevokeStudentSessions(studentId, adminId, ipAddress) {
    await (0, sessionSecurityService_1.terminateSessionsForUser)(studentId, 'admin_revoked', {
        initiatedBy: adminId,
        meta: { trigger: 'admin_revoke_sessions' },
    });
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(adminId),
        actor_role: 'admin',
        action: 'admin_revoked_student_sessions',
        target_id: new mongoose_1.default.Types.ObjectId(studentId),
        target_type: 'User',
        ip_address: ipAddress,
    });
}
/* ================================================================
   Student: self-service change password (with new metadata)
   ================================================================ */
async function studentChangePassword(userId, currentPassword, newPassword, ipAddress) {
    const security = await (0, securityConfigService_1.getSecurityConfig)(true);
    const policyCheck = {
        ok: String(newPassword || '').length >= security.passwordPolicies.student.minLength &&
            (!security.passwordPolicies.student.requireUppercase || /[A-Z]/.test(newPassword)) &&
            (!security.passwordPolicies.student.requireLowercase || /[a-z]/.test(newPassword)) &&
            (!security.passwordPolicies.student.requireNumber || /\d/.test(newPassword)) &&
            (!security.passwordPolicies.student.requireSpecial || /[^A-Za-z0-9]/.test(newPassword)),
        message: 'Password does not meet policy.',
    };
    if (!policyCheck.ok) {
        return { success: false, message: policyCheck.message || 'Password does not meet policy.' };
    }
    const user = await User_1.default.findById(userId).select('+password');
    if (!user || ['suspended', 'blocked'].includes(user.status)) {
        return { success: false, message: 'User not found or blocked.' };
    }
    const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isMatch) {
        return { success: false, message: 'Current password is incorrect.' };
    }
    user.password = await bcryptjs_1.default.hash(newPassword, 12);
    user.mustChangePassword = false;
    user.forcePasswordResetRequired = false;
    user.passwordLastChangedAtUTC = new Date();
    user.passwordChangedByType = 'user';
    user.password_updated_at = new Date();
    await user.save();
    await (0, sessionSecurityService_1.terminateSessionsForUser)(String(user._id), 'password_changed', {
        initiatedBy: String(user._id),
        meta: { trigger: 'student_change_password' },
    });
    await AuditLog_1.default.create({
        actor_id: user._id,
        actor_role: user.role,
        action: 'student_password_changed',
        target_id: user._id,
        target_type: 'User',
        ip_address: ipAddress,
    });
    return { success: true, message: 'Password changed successfully.' };
}
/* ================================================================
   Get student security metadata (for admin detail view)
   ================================================================ */
async function getStudentSecurityMeta(studentId) {
    const user = await User_1.default.findById(studentId)
        .select('passwordSetByAdminId passwordLastChangedAtUTC passwordChangedByType ' +
        'forcePasswordResetRequired mustChangePassword accountInfoLastSentAtUTC ' +
        'accountInfoLastSentChannels credentialsLastResentAtUTC loginAttempts ' +
        'lockUntil password_updated_at status lastLoginAtUTC email phone_number full_name role')
        .lean();
    if (!user)
        return null;
    const activeSessions = await ActiveSession_1.default.countDocuments({
        user_id: new mongoose_1.default.Types.ObjectId(studentId),
        status: 'active',
    });
    const recentAudit = await AuditLog_1.default.find({
        target_id: new mongoose_1.default.Types.ObjectId(studentId),
        target_type: 'User',
        action: {
            $in: [
                'admin_set_student_password',
                'admin_reset_student_password',
                'student_password_changed',
                'account_setup_invite_resent',
                'admin_revoked_student_sessions',
                'force_password_reset_enabled',
                'force_password_reset_disabled',
            ],
        },
    })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();
    return {
        userId: String(user._id),
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone_number || '',
        role: user.role,
        passwordSetByAdminId: user.passwordSetByAdminId,
        passwordSetByAdmin: Boolean(user.passwordSetByAdminId),
        passwordLastChangedAtUTC: user.passwordLastChangedAtUTC,
        passwordChangedByType: user.passwordChangedByType,
        forcePasswordResetRequired: user.forcePasswordResetRequired,
        mustChangePassword: user.mustChangePassword,
        accountInfoLastSentAtUTC: user.accountInfoLastSentAtUTC,
        accountInfoLastSentChannels: user.accountInfoLastSentChannels,
        credentialsLastResentAtUTC: user.credentialsLastResentAtUTC,
        loginAttempts: user.loginAttempts,
        lockUntil: user.lockUntil,
        passwordUpdatedAt: user.password_updated_at,
        status: user.status,
        lastLoginAt: user.lastLoginAtUTC,
        activeSessions,
        recentSecurityAudit: recentAudit,
        recentAudit: recentAudit,
    };
}
//# sourceMappingURL=accountControlService.js.map