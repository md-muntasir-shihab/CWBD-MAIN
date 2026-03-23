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
const UserPermissionsSchema = new mongoose_1.Schema({
    canEditExams: { type: Boolean, default: false },
    canManageStudents: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canDeleteData: { type: Boolean, default: false },
    canManageFinance: { type: Boolean, default: false },
    canManagePlans: { type: Boolean, default: false },
    canManageTickets: { type: Boolean, default: false },
    canManageBackups: { type: Boolean, default: false },
    canRevealPasswords: { type: Boolean, default: false },
}, { _id: false });
const UserSchema = new mongoose_1.Schema({
    full_name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'student', 'chairman'],
        default: 'student',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'blocked', 'pending'],
        default: 'active',
    },
    permissions: {
        type: UserPermissionsSchema,
        default: () => ({
            canEditExams: false,
            canManageStudents: false,
            canViewReports: false,
            canDeleteData: false,
            canManageFinance: false,
            canManagePlans: false,
            canManageTickets: false,
            canManageBackups: false,
            canRevealPasswords: false,
        }),
    },
    permissionsV2: {
        type: mongoose_1.Schema.Types.Mixed,
        default: () => ({}),
    },
    phone_number: { type: String, unique: true, sparse: true, index: true },
    phoneVerifiedAt: { type: Date, default: null },
    phoneVerificationPendingAt: { type: Date, default: null },
    profile_photo: { type: String, trim: true },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationPendingAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    passwordResetRequired: { type: Boolean, default: false },
    passwordSetByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    passwordLastChangedAtUTC: { type: Date, default: null },
    passwordChangedByType: { type: String, enum: ['admin', 'user', null], default: null },
    forcePasswordResetRequired: { type: Boolean, default: false },
    teamRoleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'TeamRole', default: null, index: true },
    notes: { type: String, trim: true, default: '' },
    accountInfoLastSentAtUTC: { type: Date, default: null },
    accountInfoLastSentChannels: { type: [String], default: [] },
    credentialsLastResentAtUTC: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lockReason: { type: String, trim: true, default: null },
    lockedByUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    lastLockAt: { type: Date, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    two_factor_method: { type: String, enum: ['email', 'sms', 'authenticator', null], default: null },
    twoFactorBackupCodes: {
        type: [{
                codeHash: { type: String, required: true },
                usedAt: { type: Date, default: null },
            }],
        default: [],
        select: false,
    },
    twoFactorRecoveryLastIssuedAt: { type: Date, default: null },
    twoFactorLastVerifiedAt: { type: Date, default: null },
    lastSecurityNoticeAt: { type: Date, default: null },
    passwordHistory: {
        type: [{
                hash: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
                source: { type: String, enum: ['admin', 'user', 'reset'], default: 'user' },
            }],
        default: [],
        select: false,
    },
    passwordExpiresAt: { type: Date, default: null },
    lastLogin: { type: Date },
    lastLoginAtUTC: { type: Date },
    ip_address: { type: String, trim: true },
    device_info: { type: String, trim: true },
    password_updated_at: { type: Date },
    subscription: {
        plan: { type: String, trim: true },
        planCode: { type: String, trim: true },
        planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
        planSlug: { type: String, trim: true },
        planName: { type: String, trim: true },
        isActive: { type: Boolean, default: false },
        startDate: { type: Date },
        expiryDate: { type: Date },
        ctaLabel: { type: String, trim: true },
        ctaUrl: { type: String, trim: true },
        ctaMode: {
            type: String,
            enum: ['contact', 'request_payment', 'internal', 'external', null],
            default: null,
        },
        assignedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        assignedAt: { type: Date },
    },
}, { timestamps: true });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ username: 1, email: 1, phone_number: 1 });
exports.default = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map