import mongoose, { Document } from 'mongoose';
export type UserRole = 'superadmin' | 'admin' | 'moderator' | 'editor' | 'viewer' | 'support_agent' | 'finance_agent' | 'student' | 'chairman';
export type UserStatus = 'active' | 'suspended' | 'blocked' | 'pending';
export type IUserPermissionsV2 = Partial<Record<string, Partial<Record<string, boolean>>>>;
export interface IUserPermissions {
    canEditExams: boolean;
    canManageStudents: boolean;
    canViewReports: boolean;
    canDeleteData: boolean;
    canManageFinance: boolean;
    canManagePlans: boolean;
    canManageTickets: boolean;
    canManageBackups: boolean;
    canRevealPasswords: boolean;
}
export interface IUser extends Document {
    full_name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    permissions: IUserPermissions;
    permissionsV2?: IUserPermissionsV2;
    phone_number?: string;
    phoneVerifiedAt?: Date | null;
    phoneVerificationPendingAt?: Date | null;
    profile_photo?: string;
    emailVerifiedAt?: Date | null;
    emailVerificationPendingAt?: Date | null;
    mustChangePassword: boolean;
    passwordResetRequired: boolean;
    passwordSetByAdminId?: mongoose.Types.ObjectId;
    passwordLastChangedAtUTC?: Date;
    passwordChangedByType?: 'admin' | 'user';
    forcePasswordResetRequired: boolean;
    teamRoleId?: mongoose.Types.ObjectId;
    notes?: string;
    accountInfoLastSentAtUTC?: Date;
    accountInfoLastSentChannels?: string[];
    credentialsLastResentAtUTC?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    lockReason?: string | null;
    lockedByUserId?: mongoose.Types.ObjectId | null;
    lastLockAt?: Date | null;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    two_factor_method?: 'email' | 'sms' | 'authenticator' | null;
    twoFactorBackupCodes?: Array<{
        codeHash: string;
        usedAt?: Date | null;
    }>;
    twoFactorRecoveryLastIssuedAt?: Date | null;
    twoFactorLastVerifiedAt?: Date | null;
    lastSecurityNoticeAt?: Date | null;
    passwordHistory?: Array<{
        hash: string;
        createdAt: Date;
        source?: 'admin' | 'user' | 'reset';
    }>;
    passwordExpiresAt?: Date | null;
    lastLogin?: Date;
    lastLoginAtUTC?: Date;
    ip_address?: string;
    device_info?: string;
    password_updated_at?: Date;
    subscription?: {
        plan?: string;
        planCode?: string;
        planId?: mongoose.Types.ObjectId;
        planSlug?: string;
        planName?: string;
        isActive?: boolean;
        startDate?: Date;
        expiryDate?: Date;
        ctaLabel?: string;
        ctaUrl?: string;
        ctaMode?: 'contact' | 'request_payment' | 'internal' | 'external';
        assignedBy?: mongoose.Types.ObjectId;
        assignedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map