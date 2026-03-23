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
import mongoose from 'mongoose';
export interface AdminSetPasswordOpts {
    studentId: string;
    newPassword: string;
    adminId: string;
    ipAddress?: string;
    sendVia?: ('sms' | 'email')[];
    revokeExistingSessions?: boolean;
}
export interface AdminSetPasswordResult {
    success: boolean;
    message: string;
    sendResult?: {
        sent: number;
        failed: number;
    };
}
export interface CreateStudentWithPasswordOpts {
    username: string;
    email?: string;
    phone_number?: string;
    full_name: string;
    password: string;
    role?: string;
    sendVia?: ('sms' | 'email')[];
    adminId: string;
    ipAddress?: string;
    profileData?: {
        department?: string;
        ssc_batch?: string;
        hsc_batch?: string;
        guardian_name?: string;
        guardian_phone?: string;
        guardian_email?: string;
        roll_number?: string;
    };
}
export interface CreateStudentResult {
    success: boolean;
    message: string;
    userId?: string;
    sendResult?: {
        sent: number;
        failed: number;
    };
}
export declare function adminSetPassword(opts: AdminSetPasswordOpts): Promise<AdminSetPasswordResult>;
export declare function createStudentWithPassword(opts: CreateStudentWithPasswordOpts): Promise<CreateStudentResult>;
export declare function adminResendAccountInfo(studentId: string, channels: ('sms' | 'email')[], adminId: string): Promise<{
    sent: number;
    failed: number;
}>;
export declare function toggleForceReset(studentId: string, force: boolean, adminId: string, ipAddress?: string): Promise<void>;
export declare function adminRevokeStudentSessions(studentId: string, adminId: string, ipAddress?: string): Promise<void>;
export declare function studentChangePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function getStudentSecurityMeta(studentId: string): Promise<{
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: import("../models/User").UserRole;
    passwordSetByAdminId: mongoose.Types.ObjectId | undefined;
    passwordSetByAdmin: boolean;
    passwordLastChangedAtUTC: Date | undefined;
    passwordChangedByType: "admin" | "user" | undefined;
    forcePasswordResetRequired: boolean;
    mustChangePassword: boolean;
    accountInfoLastSentAtUTC: Date | undefined;
    accountInfoLastSentChannels: string[] | undefined;
    credentialsLastResentAtUTC: Date | undefined;
    loginAttempts: number;
    lockUntil: Date | undefined;
    passwordUpdatedAt: Date | undefined;
    status: import("../models/User").UserStatus;
    lastLoginAt: Date | undefined;
    activeSessions: number;
    recentSecurityAudit: (mongoose.FlattenMaps<import("../models/AuditLog").IAuditLog> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[];
    recentAudit: (mongoose.FlattenMaps<import("../models/AuditLog").IAuditLog> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[];
} | null>;
//# sourceMappingURL=accountControlService.d.ts.map