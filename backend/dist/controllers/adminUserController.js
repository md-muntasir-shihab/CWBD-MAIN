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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUserStream = adminUserStream;
exports.adminGetUsers = adminGetUsers;
exports.adminGetUserById = adminGetUserById;
exports.adminGetStudentProfile = adminGetStudentProfile;
exports.adminUpdateStudentProfile = adminUpdateStudentProfile;
exports.adminGetAdminProfile = adminGetAdminProfile;
exports.adminUpdateAdminProfile = adminUpdateAdminProfile;
exports.adminCreateUser = adminCreateUser;
exports.adminUpdateUser = adminUpdateUser;
exports.adminDeleteUser = adminDeleteUser;
exports.adminUpdateUserRole = adminUpdateUserRole;
exports.adminSetUserPermissions = adminSetUserPermissions;
exports.adminSetUserStatus = adminSetUserStatus;
exports.adminToggleUserStatus = adminToggleUserStatus;
exports.adminBulkUserAction = adminBulkUserAction;
exports.adminBulkStudentAction = adminBulkStudentAction;
exports.adminBulkImportStudents = adminBulkImportStudents;
exports.adminResetUserPassword = adminResetUserPassword;
exports.adminGetAuditLogs = adminGetAuditLogs;
exports.adminGetUserActivity = adminGetUserActivity;
exports.adminExportStudents = adminExportStudents;
exports.adminGetStudents = adminGetStudents;
exports.adminCreateStudent = adminCreateStudent;
exports.adminUpdateStudent = adminUpdateStudent;
exports.adminUpdateStudentSubscription = adminUpdateStudentSubscription;
exports.adminUpdateStudentGroups = adminUpdateStudentGroups;
exports.adminGetStudentExams = adminGetStudentExams;
exports.adminGetStudentGroups = adminGetStudentGroups;
exports.adminCreateStudentGroup = adminCreateStudentGroup;
exports.adminUpdateStudentGroup = adminUpdateStudentGroup;
exports.adminDeleteStudentGroup = adminDeleteStudentGroup;
exports.adminExportStudentGroups = adminExportStudentGroups;
exports.adminImportStudentGroups = adminImportStudentGroups;
exports.adminGetSubscriptionPlans = adminGetSubscriptionPlans;
exports.getPublicSubscriptionPlans = getPublicSubscriptionPlans;
exports.adminCreateSubscriptionPlan = adminCreateSubscriptionPlan;
exports.adminUpdateSubscriptionPlan = adminUpdateSubscriptionPlan;
exports.adminToggleSubscriptionPlan = adminToggleSubscriptionPlan;
exports.adminGetProfileUpdateRequests = adminGetProfileUpdateRequests;
exports.adminApproveProfileUpdateRequest = adminApproveProfileUpdateRequest;
exports.adminRejectProfileUpdateRequest = adminRejectProfileUpdateRequest;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const stream_1 = require("stream");
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const AdminProfile_1 = __importDefault(require("../models/AdminProfile"));
const StudentGroup_1 = __importDefault(require("../models/StudentGroup"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const StudentApplication_1 = __importDefault(require("../models/StudentApplication"));
const LoginActivity_1 = __importDefault(require("../models/LoginActivity"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const ProfileUpdateRequest_1 = __importDefault(require("../models/ProfileUpdateRequest"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const requestMeta_1 = require("../utils/requestMeta");
const mailer_1 = require("../utils/mailer");
const permissions_1 = require("../utils/permissions");
const userStream_1 = require("../realtime/userStream");
const studentDashboardStream_1 = require("../realtime/studentDashboardStream");
const homeStream_1 = require("../realtime/homeStream");
const studentProfileScoreService_1 = require("../services/studentProfileScoreService");
const adminAlertService_1 = require("../services/adminAlertService");
const groupMembershipService = __importStar(require("../services/groupMembershipService"));
const securityTokenService_1 = require("../services/securityTokenService");
function normalizeRole(value, fallback = 'student') {
    const role = String(value || '').trim().toLowerCase();
    const valid = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'student', 'chairman'];
    return valid.includes(role) ? role : fallback;
}
function normalizeStatus(value, fallback = 'active') {
    const status = String(value || '').trim().toLowerCase();
    const valid = ['active', 'suspended', 'blocked', 'pending'];
    return valid.includes(status) ? status : fallback;
}
function normalizeHeader(key) {
    return key.trim().toLowerCase().replace(/[\s\-]+/g, '_');
}
function normalizeRow(input) {
    const output = {};
    for (const [rawKey, rawValue] of Object.entries(input)) {
        output[normalizeHeader(rawKey)] = String(rawValue ?? '').trim();
    }
    return output;
}
function computeProfileCompletion(profile) {
    return (0, studentProfileScoreService_1.computeStudentProfileScore)(profile).score;
}
function newRandomPassword(length = 12) {
    return crypto_1.default.randomBytes(length).toString('base64url').slice(0, length);
}
const APP_DOMAIN = process.env.APP_DOMAIN || 'http://localhost:5173';
async function issueSetPasswordInvite(user) {
    if (!user.email)
        return false;
    const { rawToken } = await (0, securityTokenService_1.issueSecurityToken)({
        userId: user._id,
        purpose: 'set_password',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        channel: 'email',
        meta: { email: user.email },
        replaceExisting: true,
    });
    const setPasswordUrl = `${APP_DOMAIN}/student/reset-password?token=${rawToken}`;
    await (0, mailer_1.sendCampusMail)({
        to: user.email,
        subject: 'CampusWay: Set your password',
        text: `Set your CampusWay password: ${setPasswordUrl}`,
        html: `<p>Hello ${user.full_name || user.username},</p><p>Your account is ready. Set your CampusWay password here:</p><p><a href="${setPasswordUrl}">${setPasswordUrl}</a></p><p>This link expires in 24 hours and can be used once.</p>`,
    });
    return true;
}
function toBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    const normalized = String(value || '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
}
function normalizePaymentStatus(value, fallback = 'paid') {
    const status = String(value || '').trim().toLowerCase();
    if (status === 'pending' || status === 'paid' || status === 'failed' || status === 'refunded' || status === 'rejected') {
        return status;
    }
    return fallback;
}
function normalizePaymentMethod(value) {
    const method = String(value || '').trim().toLowerCase();
    if (['bkash', 'nagad', 'rocket', 'upay', 'cash', 'manual', 'bank', 'card', 'sslcommerz'].includes(method)) {
        return method;
    }
    return 'manual';
}
async function createEnrollmentPaymentEntry(payload) {
    const amount = Number(payload.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0)
        return null;
    const recordedBy = payload.recordedById && mongoose_1.default.Types.ObjectId.isValid(payload.recordedById)
        ? new mongoose_1.default.Types.ObjectId(payload.recordedById)
        : null;
    if (!recordedBy)
        return null;
    let subscriptionPlanId;
    if (payload.planCode) {
        const plan = await SubscriptionPlan_1.default.findOne({ code: payload.planCode }).select('_id name').lean();
        if (plan?._id && mongoose_1.default.Types.ObjectId.isValid(String(plan._id))) {
            subscriptionPlanId = new mongoose_1.default.Types.ObjectId(String(plan._id));
        }
    }
    const status = normalizePaymentStatus(payload.status, 'paid');
    const date = payload.date ? new Date(String(payload.date)) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const transactionId = String(payload.transactionId || '').trim();
    const planLabel = String(payload.planName || payload.planCode || '').trim();
    const notesRaw = String(payload.notes || '').trim();
    const notes = notesRaw || (planLabel ? `Enrollment payment for ${planLabel}` : 'Enrollment payment');
    return ManualPayment_1.default.create({
        studentId: payload.studentId,
        ...(subscriptionPlanId ? { subscriptionPlanId } : {}),
        amount,
        currency: 'BDT',
        method: normalizePaymentMethod(payload.method),
        status,
        date: safeDate,
        paidAt: status === 'paid' ? safeDate : null,
        transactionId,
        reference: transactionId,
        notes,
        entryType: 'subscription',
        recordedBy,
    });
}
function readFirstString(source, keys) {
    for (const key of keys) {
        const raw = source[key];
        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed)
                return trimmed;
        }
    }
    return '';
}
function readOptionalString(source, keys) {
    const value = readFirstString(source, keys);
    return value || undefined;
}
function buildPermissions(role, input) {
    return (0, permissions_1.resolvePermissions)(role, input);
}
function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function daysLeft(expiryDate) {
    if (!expiryDate)
        return 0;
    const expiryMs = new Date(expiryDate).getTime();
    if (!Number.isFinite(expiryMs))
        return 0;
    return Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
}
function validateMfaTokenForUser(userId, token) {
    if (!token)
        return false;
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [tokenUserId, expiresAtRaw] = decoded.split(':');
        const expiresAt = Number(expiresAtRaw || 0);
        if (!tokenUserId || !Number.isFinite(expiresAt))
            return false;
        if (tokenUserId !== userId)
            return false;
        return expiresAt > Date.now();
    }
    catch {
        return false;
    }
}
async function resolveSubscriptionPayload(input, fallback) {
    const now = new Date();
    const fallbackStart = fallback?.startDate ? new Date(String(fallback.startDate)) : now;
    const fallbackExpiry = fallback?.expiryDate ? new Date(String(fallback.expiryDate)) : new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    const fallbackPlanCode = String(fallback?.planCode || fallback?.plan || 'legacy_free').trim().toLowerCase();
    const fallbackPlanName = String(fallback?.planName || fallback?.plan || 'Legacy Free Access').trim();
    const planId = String(input.planId || '').trim();
    const planCodeInput = String(input.planCode || input.plan || '').trim().toLowerCase();
    let planNameInput = String(input.planName || '').trim();
    let durationDays = Number(input.durationDays || 0);
    if (planId && mongoose_1.default.Types.ObjectId.isValid(planId)) {
        const plan = await SubscriptionPlan_1.default.findById(planId).lean();
        if (plan) {
            durationDays = Number(plan.durationDays || durationDays || 0);
            planNameInput = planNameInput || String(plan.name || '');
            const codeFromPlan = String(plan.code || '').trim().toLowerCase();
            if (codeFromPlan) {
                return {
                    planCode: codeFromPlan,
                    planName: planNameInput || String(plan.name || codeFromPlan),
                    startDate: input.startDate ? new Date(String(input.startDate)) : fallbackStart,
                    expiryDate: input.expiryDate
                        ? new Date(String(input.expiryDate))
                        : new Date((input.startDate ? new Date(String(input.startDate)) : fallbackStart).getTime() + (Math.max(1, durationDays || 30) * 24 * 60 * 60 * 1000)),
                    isActive: input.isActive !== undefined ? toBoolean(input.isActive) : true,
                };
            }
        }
    }
    if (planCodeInput) {
        const plan = await SubscriptionPlan_1.default.findOne({ code: planCodeInput }).lean();
        if (plan) {
            durationDays = Number(plan.durationDays || durationDays || 0);
            planNameInput = planNameInput || String(plan.name || '');
        }
    }
    const startDate = input.startDate ? new Date(String(input.startDate)) : fallbackStart;
    const expiryDate = input.expiryDate
        ? new Date(String(input.expiryDate))
        : new Date(startDate.getTime() + (Math.max(1, durationDays || 365) * 24 * 60 * 60 * 1000));
    return {
        planCode: planCodeInput || fallbackPlanCode,
        planName: planNameInput || fallbackPlanName,
        startDate,
        expiryDate,
        isActive: input.isActive !== undefined ? toBoolean(input.isActive) : Boolean(fallback?.isActive ?? true),
    };
}
async function parseCsvBuffer(buffer) {
    return await new Promise((resolve, reject) => {
        const rows = [];
        stream_1.Readable.from([buffer])
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => rows.push(normalizeRow(row)))
            .on('error', reject)
            .on('end', () => resolve(rows));
    });
}
async function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName)
        return [];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map((row) => normalizeRow(row));
}
async function getUploadedFileBuffer(file) {
    if (!file)
        return null;
    if (file.buffer && file.buffer.length > 0)
        return file.buffer;
    if (file.path) {
        try {
            return await promises_1.default.readFile(file.path);
        }
        finally {
            await promises_1.default.unlink(file.path).catch(() => null);
        }
    }
    return null;
}
async function createAuditLog(req, action, target_id, target_type = 'user', details) {
    if (!req.user)
        return;
    await AuditLog_1.default.create({
        actor_id: req.user._id,
        actor_role: req.user.role,
        action,
        target_id,
        target_type,
        ip_address: (0, requestMeta_1.getClientIp)(req),
        details,
    });
}
async function loadStudentDetails(userId) {
    const [profile, applications, examHistory, loginHistory, payments, dueLedger, user] = await Promise.all([
        StudentProfile_1.default.findOne({ user_id: userId }).lean(),
        StudentApplication_1.default.find({ student_id: userId })
            .populate('university_id', 'name slug')
            .sort({ createdAt: -1 })
            .lean(),
        ExamResult_1.default.find({ student: userId })
            .populate('exam', 'title subject totalMarks')
            .sort({ submittedAt: -1 })
            .limit(30)
            .lean(),
        LoginActivity_1.default.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean(),
        ManualPayment_1.default.find({ studentId: userId })
            .populate('recordedBy', 'username full_name role')
            .sort({ date: -1, createdAt: -1 })
            .lean(),
        StudentDueLedger_1.default.findOne({ studentId: userId }).lean(),
        User_1.default.findById(userId).select('email profile_photo').lean(),
    ]);
    const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile, user);
    const totalPaid = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pendingDue = Number(dueLedger?.netDue || 0);
    const paymentStatus = pendingDue > 0 ? 'pending' : (payments.length > 0 ? 'paid' : 'clear');
    return {
        profile: profile
            ? {
                ...profile,
                profileScore: scoreResult.score,
                profileScoreBreakdown: scoreResult.breakdown,
                missingProfileFields: scoreResult.missingFields,
            }
            : null,
        applications,
        examHistory,
        loginHistory,
        payments,
        dueLedger: dueLedger || null,
        paymentSummary: {
            totalPaid,
            pendingDue,
            status: paymentStatus,
        },
    };
}
function mapUserForClient(raw) {
    return {
        _id: raw._id,
        username: raw.username,
        email: raw.email,
        fullName: raw.full_name || raw.fullName || raw.username,
        role: raw.role,
        status: raw.status,
        phone_number: raw.phone_number || raw.phone || '',
        profile_photo: raw.profile_photo || raw.profile_photo_url || '',
        roll_number: raw.roll_number || '',
        registration_id: raw.registration_id || '',
        institution_name: raw.institution_name || '',
        user_unique_id: raw.user_unique_id || '',
        admittedAt: raw.admittedAt || '',
        groupIds: raw.groupIds || [],
        subscription: raw.subscription || {},
        permissions: raw.permissions || {},
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        lastLogin: raw.lastLogin,
        ip_address: raw.ip_address || '',
        device_info: raw.device_info || '',
    };
}
async function adminUserStream(_req, res) {
    (0, userStream_1.addUserStreamClient)(res);
}
async function adminGetUsers(req, res) {
    try {
        const { role, status, search, institution, roll, scope, page = '1', limit = '20', } = req.query;
        const match = {};
        if (scope === 'students') {
            match.role = 'student';
        }
        else if (scope === 'admins') {
            match.role = { $in: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'chairman'] };
        }
        else if (role) {
            const roles = role.split(',').map((r) => normalizeRole(r));
            match.role = roles.length > 1 ? { $in: roles } : roles[0];
        }
        if (status) {
            const statuses = status.split(',').map((s) => normalizeStatus(s));
            match.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
        }
        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: StudentProfile_1.default.collection.name,
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'studentProfile',
                },
            },
            {
                $lookup: {
                    from: AdminProfile_1.default.collection.name,
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'adminProfile',
                },
            },
            {
                $addFields: {
                    studentProfile: { $arrayElemAt: ['$studentProfile', 0] },
                    adminProfile: { $arrayElemAt: ['$adminProfile', 0] },
                },
            },
            {
                $addFields: {
                    full_name: {
                        $ifNull: ['$full_name', { $ifNull: ['$studentProfile.full_name', '$adminProfile.admin_name'] }],
                    },
                    roll_number: '$studentProfile.roll_number',
                    registration_id: '$studentProfile.registration_id',
                    institution_name: '$studentProfile.institution_name',
                    phone_number: { $ifNull: ['$phone_number', '$studentProfile.phone_number'] },
                    profile_photo: { $ifNull: ['$profile_photo', '$studentProfile.profile_photo_url'] },
                },
            },
        ];
        const searchFilters = [];
        if (search) {
            const regex = new RegExp(search, 'i');
            searchFilters.push({ full_name: regex }, { username: regex }, { email: regex }, { 'studentProfile.institution_name': regex }, { 'studentProfile.roll_number': regex }, { 'studentProfile.registration_id': regex });
        }
        if (institution) {
            searchFilters.push({ 'studentProfile.institution_name': new RegExp(institution, 'i') });
        }
        if (roll) {
            searchFilters.push({
                $or: [
                    { 'studentProfile.roll_number': new RegExp(roll, 'i') },
                    { 'studentProfile.registration_id': new RegExp(roll, 'i') },
                ],
            });
        }
        if (searchFilters.length > 0) {
            pipeline.push({ $match: { $or: searchFilters } });
        }
        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.max(1, Math.min(200, Number(limit) || 20));
        const skip = (pageNumber - 1) * limitNumber;
        const countPipeline = [...pipeline, { $count: 'total' }];
        const usersPipeline = [
            ...pipeline,
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNumber },
            {
                $project: {
                    password: 0,
                    twoFactorSecret: 0,
                    studentProfile: 0,
                    adminProfile: 0,
                },
            },
        ];
        const [usersRaw, countRaw, summaryRaw] = await Promise.all([
            User_1.default.aggregate(usersPipeline),
            User_1.default.aggregate(countPipeline),
            User_1.default.aggregate([
                { $group: { _id: null, total: { $sum: 1 } } },
                {
                    $lookup: {
                        from: User_1.default.collection.name,
                        pipeline: [
                            {
                                $group: {
                                    _id: null,
                                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                                    suspended: { $sum: { $cond: [{ $in: ['$status', ['suspended', 'blocked']] }, 1, 0] } },
                                    students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
                                    admins: { $sum: { $cond: [{ $in: ['$role', ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'chairman']] }, 1, 0] } },
                                },
                            },
                        ],
                        as: 'summary',
                    },
                },
                { $project: { summary: { $arrayElemAt: ['$summary', 0] } } },
            ]),
        ]);
        const users = usersRaw.map((user) => mapUserForClient(user));
        const total = countRaw[0]?.total || 0;
        const pages = Math.max(1, Math.ceil(total / limitNumber));
        const summary = summaryRaw[0]?.summary || {
            total: 0,
            active: 0,
            suspended: 0,
            students: 0,
            admins: 0,
        };
        res.json({ users, total, page: pageNumber, pages, summary });
    }
    catch (error) {
        console.error('adminGetUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetUserById(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id).select('-password -twoFactorSecret').lean();
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const loginHistory = await LoginActivity_1.default.find({ user_id: user._id })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        if (user.role === 'student') {
            const details = await loadStudentDetails(String(user._id));
            res.json({
                user: mapUserForClient(user),
                profile: details.profile,
                applications: details.applications,
                examHistory: details.examHistory,
                loginHistory,
            });
            return;
        }
        const [adminProfile, actionHistory] = await Promise.all([
            AdminProfile_1.default.findOne({ user_id: user._id }).lean(),
            AuditLog_1.default.find({ actor_id: user._id }).sort({ timestamp: -1 }).limit(50).lean(),
        ]);
        res.json({
            user: mapUserForClient(user),
            profile: adminProfile,
            loginHistory,
            actionHistory,
        });
    }
    catch (error) {
        console.error('adminGetUserById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetStudentProfile(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id).select('role');
        if (!user || user.role !== 'student') {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const details = await loadStudentDetails(String(req.params.id));
        if (!details.profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        res.json(details);
    }
    catch (error) {
        console.error('adminGetStudentProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateStudentProfile(req, res) {
    try {
        const body = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user || user.role !== 'student') {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const nextUsername = String(body.username || user.username).trim().toLowerCase();
        const nextEmail = String(body.email || user.email).trim().toLowerCase();
        if (nextUsername && nextUsername !== user.username) {
            const exists = await User_1.default.exists({ username: nextUsername, _id: { $ne: user._id } });
            if (exists) {
                res.status(400).json({ message: 'Username already in use' });
                return;
            }
            user.username = nextUsername;
        }
        if (nextEmail && nextEmail !== user.email) {
            const exists = await User_1.default.exists({ email: nextEmail, _id: { $ne: user._id } });
            if (exists) {
                res.status(400).json({ message: 'Email already in use' });
                return;
            }
            user.email = nextEmail;
        }
        if (typeof body.full_name === 'string' && body.full_name.trim())
            user.full_name = body.full_name.trim();
        if (typeof body.phone_number === 'string')
            user.phone_number = body.phone_number.trim();
        if (typeof body.profile_photo === 'string')
            user.profile_photo = body.profile_photo.trim();
        if (body.status)
            user.status = normalizeStatus(body.status, user.status);
        await user.save();
        const profile = await StudentProfile_1.default.findOne({ user_id: user._id });
        if (!profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        const allowed = [
            'full_name', 'phone', 'phone_number', 'guardian_phone', 'ssc_batch', 'hsc_batch', 'department',
            'college_name', 'college_address', 'dob', 'profile_photo_url', 'present_address', 'district',
            'permanent_address', 'gender', 'roll_number', 'registration_id', 'institution_name',
            'guardianPhoneVerificationStatus', 'guardianPhoneVerifiedAt',
        ];
        for (const field of allowed) {
            if (body[field] !== undefined) {
                profile[field] = body[field];
            }
        }
        profile.username = user.username;
        profile.email = user.email;
        if (!profile.phone && profile.phone_number)
            profile.phone = profile.phone_number;
        if (!profile.phone_number && profile.phone)
            profile.phone_number = profile.phone;
        profile.profile_completion_percentage = computeProfileCompletion(profile.toObject());
        await profile.save();
        await createAuditLog(req, 'student_profile_updated', String(user._id), 'student', {
            edited_fields: Object.keys(body),
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_updated',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { source: 'student_profile', editedFields: Object.keys(body) },
        });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({
            type: 'profile_updated',
            meta: { studentId: String(user._id), source: 'admin_update' },
        });
        res.json({
            message: 'Student profile updated successfully',
            user: mapUserForClient(user.toObject()),
            profile,
        });
    }
    catch (error) {
        console.error('adminUpdateStudentProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetAdminProfile(req, res) {
    try {
        const profile = await AdminProfile_1.default.findOne({ user_id: req.params.id }).lean();
        if (!profile) {
            res.status(404).json({ message: 'Admin profile not found' });
            return;
        }
        const loginHistory = await LoginActivity_1.default.find({ user_id: req.params.id }).sort({ createdAt: -1 }).limit(30).lean();
        const actionHistory = await AuditLog_1.default.find({ actor_id: req.params.id }).sort({ timestamp: -1 }).limit(50).lean();
        res.json({ profile, loginHistory, actionHistory });
    }
    catch (error) {
        console.error('adminGetAdminProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateAdminProfile(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user || !['superadmin', 'admin', 'moderator', 'editor', 'viewer'].includes(user.role)) {
            res.status(404).json({ message: 'Admin user not found' });
            return;
        }
        const body = req.body;
        if (typeof body.full_name === 'string' && body.full_name.trim())
            user.full_name = body.full_name.trim();
        if (typeof body.profile_photo === 'string')
            user.profile_photo = body.profile_photo.trim();
        if (typeof body.phone_number === 'string')
            user.phone_number = body.phone_number.trim();
        if (body.status)
            user.status = normalizeStatus(body.status, user.status);
        await user.save();
        const profile = await AdminProfile_1.default.findOneAndUpdate({ user_id: user._id }, {
            $set: {
                admin_name: user.full_name,
                profile_photo: user.profile_photo,
                role_level: user.role,
            },
        }, { new: true, upsert: true });
        await createAuditLog(req, 'admin_profile_updated', String(user._id), 'admin', { edited_fields: Object.keys(body) });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_updated',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { source: 'admin_profile', editedFields: Object.keys(body) },
        });
        res.json({
            message: 'Admin profile updated successfully',
            user: mapUserForClient(user.toObject()),
            profile,
        });
    }
    catch (error) {
        console.error('adminUpdateAdminProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateUser(req, res) {
    try {
        const body = req.body;
        const role = normalizeRole(body.role, 'student');
        if (role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can create superadmin accounts' });
            return;
        }
        const username = String(body.username || '').trim().toLowerCase();
        const email = String(body.email || '').trim().toLowerCase();
        const fullName = String(body.full_name || body.name || '').trim();
        if (!username || !email || !fullName) {
            res.status(400).json({ message: 'full_name, username and email are required' });
            return;
        }
        const existing = await User_1.default.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            res.status(400).json({ message: 'Username or email already exists' });
            return;
        }
        const providedPassword = String(body.password || '').trim();
        const generatedPassword = providedPassword || newRandomPassword(24);
        const hashedPassword = await bcryptjs_1.default.hash(generatedPassword, 12);
        const permissionsInput = (body.permissions || {});
        const permissions = buildPermissions(role, permissionsInput);
        const defaultSubscription = role === 'student'
            ? {
                plan: 'legacy_free',
                planCode: 'legacy_free',
                planName: 'Legacy Free Access',
                isActive: true,
                startDate: new Date(),
                expiryDate: new Date(Date.now() + (3650 * 24 * 60 * 60 * 1000)),
                assignedBy: req.user?._id,
                assignedAt: new Date(),
            }
            : undefined;
        const user = await User_1.default.create({
            full_name: fullName,
            username,
            email,
            password: hashedPassword,
            role,
            status: normalizeStatus(body.status, 'active'),
            permissions,
            profile_photo: typeof body.profile_photo === 'string' ? body.profile_photo : undefined,
            phone_number: typeof body.phone_number === 'string' ? body.phone_number : undefined,
            mustChangePassword: toBoolean(body.mustChangePassword) || !providedPassword,
            forcePasswordResetRequired: toBoolean(body.mustChangePassword) || !providedPassword,
            subscription: defaultSubscription,
        });
        const inviteSent = !providedPassword ? await issueSetPasswordInvite(user) : false;
        if (role === 'student') {
            const profile = await StudentProfile_1.default.create({
                user_id: user._id,
                user_unique_id: body.user_unique_id || `CW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)}`,
                full_name: fullName,
                username,
                email,
                phone: body.phone || body.phone_number || '',
                phone_number: body.phone_number || body.phone || '',
                roll_number: body.roll_number || '',
                registration_id: body.registration_id || '',
                institution_name: body.institution_name || '',
                profile_photo_url: body.profile_photo || '',
                admittedAt: body.admittedAt ? new Date(String(body.admittedAt)) : user.createdAt,
                groupIds: parseGroupIds(body.groupIds),
                profile_completion_percentage: 20,
            });
            profile.profile_completion_percentage = computeProfileCompletion(profile.toObject());
            await profile.save();
        }
        else {
            await AdminProfile_1.default.create({
                user_id: user._id,
                admin_name: fullName,
                role_level: role,
                permissions,
                profile_photo: body.profile_photo || '',
            });
        }
        await createAuditLog(req, 'user_created', String(user._id), 'user', {
            role: user.role,
            status: user.status,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_created',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { role: user.role, status: user.status },
        });
        res.status(201).json({
            message: 'User created successfully',
            user: mapUserForClient(user.toObject()),
            inviteSent,
        });
    }
    catch (error) {
        console.error('adminCreateUser error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateUser(req, res) {
    try {
        const body = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can modify another superadmin' });
            return;
        }
        if (typeof body.username === 'string') {
            const username = body.username.trim().toLowerCase();
            if (username && username !== user.username) {
                const exists = await User_1.default.exists({ username, _id: { $ne: user._id } });
                if (exists) {
                    res.status(400).json({ message: 'Username already in use' });
                    return;
                }
                user.username = username;
            }
        }
        if (typeof body.email === 'string') {
            const email = body.email.trim().toLowerCase();
            if (email && email !== user.email) {
                const exists = await User_1.default.exists({ email, _id: { $ne: user._id } });
                if (exists) {
                    res.status(400).json({ message: 'Email already in use' });
                    return;
                }
                user.email = email;
            }
        }
        if (typeof body.full_name === 'string' && body.full_name.trim())
            user.full_name = body.full_name.trim();
        if (typeof body.phone_number === 'string')
            user.phone_number = body.phone_number.trim();
        if (typeof body.profile_photo === 'string')
            user.profile_photo = body.profile_photo.trim();
        if (body.status)
            user.status = normalizeStatus(body.status, user.status);
        if (body.role) {
            const nextRole = normalizeRole(body.role, user.role);
            if (nextRole === 'superadmin' && req.user?.role !== 'superadmin') {
                res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
                return;
            }
            user.role = nextRole;
        }
        if (body.permissions) {
            user.permissions = buildPermissions(user.role, body.permissions);
        }
        await user.save();
        if (user.role === 'student') {
            const studentProfile = await StudentProfile_1.default.findOneAndUpdate({ user_id: user._id }, {
                $set: {
                    full_name: user.full_name,
                    username: user.username,
                    email: user.email,
                    profile_photo_url: user.profile_photo,
                    phone_number: user.phone_number,
                },
            }, { new: true, upsert: true });
            if (studentProfile) {
                studentProfile.profile_completion_percentage = computeProfileCompletion(studentProfile.toObject());
                await studentProfile.save();
            }
            await AdminProfile_1.default.deleteOne({ user_id: user._id });
        }
        else {
            await AdminProfile_1.default.findOneAndUpdate({ user_id: user._id }, {
                $set: {
                    admin_name: user.full_name,
                    role_level: user.role,
                    permissions: user.permissions,
                    profile_photo: user.profile_photo,
                },
            }, { upsert: true, new: true });
            await StudentProfile_1.default.deleteOne({ user_id: user._id });
        }
        await createAuditLog(req, 'user_updated', String(user._id), 'user', {
            edited_fields: Object.keys(body),
            role: user.role,
            status: user.status,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_updated',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { editedFields: Object.keys(body), role: user.role, status: user.status },
        });
        res.json({
            message: 'User updated successfully',
            user: mapUserForClient(user.toObject()),
        });
    }
    catch (error) {
        console.error('adminUpdateUser error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteUser(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (String(user._id) === req.user?._id) {
            res.status(400).json({ message: 'You cannot delete your own account' });
            return;
        }
        if (user.role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can delete superadmin account' });
            return;
        }
        await Promise.all([
            User_1.default.deleteOne({ _id: user._id }),
            StudentProfile_1.default.deleteOne({ user_id: user._id }),
            AdminProfile_1.default.deleteOne({ user_id: user._id }),
            LoginActivity_1.default.deleteMany({ user_id: user._id }),
        ]);
        await createAuditLog(req, 'user_deleted', String(user._id), 'user', {
            role: user.role,
            email: user.email,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_deleted',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { role: user.role, email: user.email },
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('adminDeleteUser error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateUserRole(req, res) {
    try {
        const role = normalizeRole(req.body.role);
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
            return;
        }
        user.role = role;
        user.permissions = buildPermissions(role, user.permissions);
        await user.save();
        if (role === 'student') {
            await StudentProfile_1.default.findOneAndUpdate({ user_id: user._id }, {
                $setOnInsert: {
                    user_id: user._id,
                    full_name: user.full_name,
                    username: user.username,
                    email: user.email,
                    phone_number: user.phone_number || '',
                    profile_completion_percentage: 10,
                },
            }, { upsert: true });
            await AdminProfile_1.default.deleteOne({ user_id: user._id });
        }
        else {
            await AdminProfile_1.default.findOneAndUpdate({ user_id: user._id }, {
                $set: {
                    admin_name: user.full_name,
                    role_level: role,
                    permissions: user.permissions,
                    profile_photo: user.profile_photo,
                },
            }, { new: true, upsert: true });
            await StudentProfile_1.default.deleteOne({ user_id: user._id });
        }
        await createAuditLog(req, 'user_role_updated', String(user._id), 'user', { role });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_role_changed',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { role },
        });
        res.json({
            message: 'User role updated',
            user: mapUserForClient(user.toObject()),
        });
    }
    catch (error) {
        console.error('adminUpdateUserRole error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminSetUserPermissions(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const permissions = buildPermissions(user.role, req.body.permissions);
        user.permissions = permissions;
        await user.save();
        if (user.role !== 'student') {
            await AdminProfile_1.default.findOneAndUpdate({ user_id: user._id }, {
                $set: {
                    permissions,
                    role_level: user.role,
                    admin_name: user.full_name,
                },
            }, { upsert: true });
        }
        await createAuditLog(req, 'user_permissions_updated', String(user._id), 'user', permissions);
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_permissions_changed',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: permissions,
        });
        res.json({ message: 'Permissions updated', permissions });
    }
    catch (error) {
        console.error('adminSetUserPermissions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminSetUserStatus(req, res) {
    try {
        const status = normalizeStatus(req.body.status, 'active');
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can update superadmin status' });
            return;
        }
        user.status = status;
        await user.save();
        await createAuditLog(req, 'user_status_updated', String(user._id), 'user', { status });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_status_changed',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { status },
        });
        res.json({ message: `User status updated to ${status}`, status });
    }
    catch (error) {
        console.error('adminSetUserStatus error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleUserStatus(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Cannot modify superadmin status' });
            return;
        }
        user.status = user.status === 'active' ? 'suspended' : 'active';
        await user.save();
        await createAuditLog(req, 'user_status_toggled', String(user._id), 'user', { status: user.status });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_status_changed',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { status: user.status, toggled: true },
        });
        res.json({ message: `User status changed to ${user.status}`, status: user.status });
    }
    catch (error) {
        console.error('adminToggleUserStatus error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminBulkUserAction(req, res) {
    try {
        const body = req.body;
        const userIds = Array.isArray(body.userIds)
            ? body.userIds.map((id) => String(id)).filter(Boolean)
            : [];
        const action = String(body.action || '').trim().toLowerCase();
        if (userIds.length === 0 || !action) {
            res.status(400).json({ message: 'userIds and action are required' });
            return;
        }
        const users = await User_1.default.find({ _id: { $in: userIds } });
        const protectedUsers = users.filter((u) => u.role === 'superadmin' && req.user?.role !== 'superadmin');
        if (protectedUsers.length > 0) {
            res.status(403).json({ message: 'Operation includes protected superadmin accounts' });
            return;
        }
        let affected = 0;
        if (action === 'delete') {
            await Promise.all([
                User_1.default.deleteMany({ _id: { $in: userIds } }),
                StudentProfile_1.default.deleteMany({ user_id: { $in: userIds } }),
                AdminProfile_1.default.deleteMany({ user_id: { $in: userIds } }),
                LoginActivity_1.default.deleteMany({ user_id: { $in: userIds } }),
            ]);
            affected = userIds.length;
        }
        else if (action === 'suspend') {
            const result = await User_1.default.updateMany({ _id: { $in: userIds } }, { $set: { status: 'suspended' } });
            affected = result.modifiedCount;
        }
        else if (action === 'activate') {
            const result = await User_1.default.updateMany({ _id: { $in: userIds } }, { $set: { status: 'active' } });
            affected = result.modifiedCount;
        }
        else if (action === 'set_role') {
            const role = normalizeRole(body.role);
            const result = await User_1.default.updateMany({ _id: { $in: userIds } }, { $set: { role, permissions: buildPermissions(role) } });
            affected = result.modifiedCount;
        }
        else if (action === 'set_status') {
            const status = normalizeStatus(body.status);
            const result = await User_1.default.updateMany({ _id: { $in: userIds } }, { $set: { status } });
            affected = result.modifiedCount;
        }
        else {
            res.status(400).json({ message: 'Unsupported bulk action' });
            return;
        }
        await createAuditLog(req, 'bulk_user_action', undefined, 'user', {
            action,
            affected,
            requested: userIds.length,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'bulk_user_action',
            actorId: req.user?._id,
            meta: {
                action,
                affected,
                requested: userIds.length,
            },
        });
        res.json({ message: 'Bulk action completed', action, affected });
    }
    catch (error) {
        console.error('adminBulkUserAction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminBulkStudentAction(req, res) {
    try {
        const body = req.body;
        const studentIds = Array.isArray(body.studentIds)
            ? body.studentIds.map((id) => String(id)).filter(Boolean)
            : [];
        const action = String(body.action || '').trim().toLowerCase();
        if (studentIds.length === 0 || !action) {
            res.status(400).json({ message: 'studentIds and action are required' });
            return;
        }
        let affected = 0;
        if (action === 'delete') {
            const users = await User_1.default.find({ _id: { $in: studentIds } });
            const protectedUsers = users.filter((u) => u.role === 'superadmin' && req.user?.role !== 'superadmin');
            if (protectedUsers.length > 0) {
                res.status(403).json({ message: 'Operation includes protected accounts' });
                return;
            }
            await Promise.all([
                User_1.default.deleteMany({ _id: { $in: studentIds } }),
                StudentProfile_1.default.deleteMany({ user_id: { $in: studentIds } }),
                AdminProfile_1.default.deleteMany({ user_id: { $in: studentIds } }),
                LoginActivity_1.default.deleteMany({ user_id: { $in: studentIds } }),
                StudentGroup_1.default.updateMany({}, { $pull: { manualStudents: { $in: studentIds } } }),
            ]);
            affected = studentIds.length;
        }
        else if (action === 'suspend') {
            const result = await User_1.default.updateMany({ _id: { $in: studentIds } }, { $set: { status: 'suspended' } });
            affected = result.modifiedCount;
        }
        else if (action === 'activate') {
            const result = await User_1.default.updateMany({ _id: { $in: studentIds } }, { $set: { status: 'active' } });
            affected = result.modifiedCount;
        }
        else if (action === 'add_to_group') {
            const groupId = String(body.groupId || '');
            if (!groupId) {
                res.status(400).json({ message: 'groupId is required for this action' });
                return;
            }
            const group = await StudentGroup_1.default.findById(groupId);
            if (!group) {
                res.status(404).json({ message: 'Target group not found' });
                return;
            }
            if (group.type === 'dynamic') {
                res.status(400).json({ message: 'Cannot manually add students to a dynamic group' });
                return;
            }
            const currentMembers = Array.isArray(group.manualStudents) ? group.manualStudents : [];
            const incomingMembers = studentIds
                .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_1.default.Types.ObjectId(id));
            const uniqueById = new Map();
            for (const memberId of [...currentMembers, ...incomingMembers]) {
                uniqueById.set(String(memberId), memberId);
            }
            group.manualStudents = Array.from(uniqueById.values());
            await group.save();
            affected = studentIds.length;
        }
        else {
            res.status(400).json({ message: 'Unsupported bulk action' });
            return;
        }
        await createAuditLog(req, 'bulk_student_action', undefined, 'student', {
            action,
            affected,
            requested: studentIds.length,
        });
        res.json({ message: 'Bulk action completed', action, affected });
    }
    catch (error) {
        console.error('adminBulkStudentAction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminBulkImportStudents(req, res) {
    try {
        const body = req.body;
        const targetGroupId = body.targetGroupId;
        const targetPlanCode = body.targetPlanCode;
        let rows = [];
        const studentsBody = body.students;
        if (Array.isArray(studentsBody)) {
            rows = studentsBody
                .map((item) => normalizeRow(item))
                .filter((item) => Object.keys(item).length > 0);
        }
        else {
            const uploadedBuffer = await getUploadedFileBuffer(req.file);
            if (uploadedBuffer) {
                const mime = req.file?.mimetype || '';
                const filename = req.file?.originalname?.toLowerCase() || '';
                const isCsv = mime.includes('csv') || filename.endsWith('.csv');
                rows = isCsv ? await parseCsvBuffer(uploadedBuffer) : await parseExcelBuffer(uploadedBuffer);
            }
        }
        if (rows.length === 0) {
            res.status(400).json({ message: 'No valid student records found. Provide JSON array or upload CSV/Excel file.' });
            return;
        }
        // Validate target plan if provided
        let targetPlan = null;
        if (targetPlanCode) {
            targetPlan = await SubscriptionPlan_1.default.findOne({ planCode: targetPlanCode });
            if (!targetPlan) {
                res.status(400).json({ message: `Target subscription plan '${targetPlanCode}' not found.` });
                return;
            }
        }
        // Validate target group if provided
        if (targetGroupId && !mongoose_1.default.Types.ObjectId.isValid(targetGroupId)) {
            res.status(400).json({ message: 'Invalid targetGroupId provided.' });
            return;
        }
        let imported = 0;
        let skipped = 0;
        const errors = [];
        let inviteSentCount = 0;
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const fullName = row.full_name || row.fullname || row.name || '';
            const email = (row.email || '').toLowerCase();
            let username = (row.username || '').toLowerCase();
            const providedPassword = row.password || '';
            if (!fullName || !email) {
                skipped += 1;
                errors.push(`Row ${index + 1}: missing full_name or email`);
                continue;
            }
            if (!username) {
                const prefix = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'student';
                username = `${prefix}${Math.floor(100 + Math.random() * 899)}`;
            }
            const existing = await User_1.default.findOne({
                $or: [{ email }, { username }],
            }).select('_id');
            if (existing) {
                skipped += 1;
                errors.push(`Row ${index + 1}: duplicate email/username (${email})`);
                continue;
            }
            const plainPassword = providedPassword || newRandomPassword(24);
            const hashedPassword = await bcryptjs_1.default.hash(plainPassword, 12);
            try {
                // Determine subscription
                const subscription = targetPlan ? {
                    plan: targetPlan.planCode,
                    planCode: targetPlan.planCode,
                    planName: targetPlan.name,
                    isActive: true,
                    startDate: new Date(),
                    expiryDate: new Date(Date.now() + (targetPlan.durationDays || 365) * 24 * 60 * 60 * 1000),
                    assignedBy: req.user?._id,
                    assignedAt: new Date(),
                } : {
                    plan: 'legacy_free',
                    planCode: 'legacy_free',
                    planName: 'Legacy Free Access',
                    isActive: true,
                    startDate: new Date(),
                    expiryDate: new Date(Date.now() + (3650 * 24 * 60 * 60 * 1000)),
                    assignedBy: req.user?._id,
                    assignedAt: new Date(),
                };
                const user = await User_1.default.create({
                    full_name: fullName,
                    username,
                    email,
                    password: hashedPassword,
                    role: 'student',
                    status: normalizeStatus(row.status, 'active'),
                    permissions: buildPermissions('student'),
                    phone_number: row.phone_number || row.phone || undefined,
                    mustChangePassword: true,
                    forcePasswordResetRequired: true,
                    subscription,
                });
                if (!providedPassword && await issueSetPasswordInvite(user)) {
                    inviteSentCount += 1;
                }
                const profile = await StudentProfile_1.default.create({
                    user_id: user._id,
                    user_unique_id: row.user_unique_id || `CW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)}`,
                    full_name: fullName,
                    username,
                    email,
                    phone: row.phone || row.phone_number || undefined,
                    phone_number: row.phone_number || row.phone || undefined,
                    guardian_phone: row.guardian_phone || undefined,
                    ssc_batch: row.ssc_batch || '',
                    hsc_batch: row.hsc_batch || '',
                    department: ['science', 'arts', 'commerce'].includes((row.department || '').toLowerCase())
                        ? row.department.toLowerCase()
                        : undefined,
                    college_name: row.college_name || '',
                    college_address: row.college_address || '',
                    roll_number: row.roll_number || row.roll || '',
                    registration_id: row.registration_id || row.registration || '',
                    institution_name: row.institution_name || row.institution || '',
                    profile_photo_url: row.profile_photo_url || row.profile_photo || '',
                    admittedAt: row.admitted_at ? new Date(row.admitted_at) : user.createdAt,
                    groupIds: targetGroupId ? [new mongoose_1.default.Types.ObjectId(targetGroupId)] : [],
                    profile_completion_percentage: 20,
                });
                profile.profile_completion_percentage = computeProfileCompletion(profile.toObject());
                await profile.save();
                imported += 1;
            }
            catch (error) {
                skipped += 1;
                errors.push(`Row ${index + 1}: ${error.message}`);
            }
        }
        await createAuditLog(req, 'students_bulk_imported', undefined, 'student', {
            imported,
            skipped,
            total: rows.length,
            targetGroupId,
            targetPlanCode,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'students_imported',
            actorId: req.user?._id,
            meta: { imported, skipped, total: rows.length },
        });
        res.status(201).json({
            message: `Imported ${imported} students. Skipped ${skipped}.`,
            imported,
            skipped,
            errors,
            inviteSentCount,
        });
    }
    catch (error) {
        console.error('adminBulkImportStudents error:', error);
        res.status(500).json({ message: 'Server error during bulk import' });
    }
}
async function adminResetUserPassword(req, res) {
    try {
        const user = await User_1.default.findById(req.params.id).select('+password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can reset superadmin password' });
            return;
        }
        const replacementPassword = newRandomPassword(24);
        user.password = await bcryptjs_1.default.hash(replacementPassword, 12);
        user.mustChangePassword = true;
        user.forcePasswordResetRequired = true;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.password_updated_at = new Date();
        await user.save();
        const inviteSent = await issueSetPasswordInvite(user);
        await createAuditLog(req, 'user_password_reset', String(user._id), 'user');
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_updated',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { passwordReset: true },
        });
        res.json({
            message: inviteSent
                ? 'Password reset link sent successfully.'
                : 'Password reset enforced. No email address is available to send the reset link.',
            inviteSent,
        });
    }
    catch (error) {
        console.error('adminResetUserPassword error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetAuditLogs(req, res) {
    try {
        const query = req.query;
        const page = Array.isArray(query.page) ? query.page[0] : query.page;
        const limit = Array.isArray(query.limit) ? query.limit[0] : query.limit;
        const action = Array.isArray(query.action) ? query.action[0] : query.action;
        const actor = Array.isArray(query.actor) ? query.actor[0] : query.actor;
        const dateFrom = Array.isArray(query.dateFrom) ? query.dateFrom[0] : query.dateFrom;
        const dateTo = Array.isArray(query.dateTo) ? query.dateTo[0] : query.dateTo;
        const pageNumber = Math.max(1, Number(page || '1') || 1);
        const limitNumber = Math.max(1, Math.min(200, Number(limit || '50') || 50));
        const skip = (pageNumber - 1) * limitNumber;
        const filter = {};
        if (action)
            filter.action = new RegExp(action, 'i');
        if (actor && mongoose_1.default.Types.ObjectId.isValid(actor))
            filter.actor_id = actor;
        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom)
                filter.timestamp.$gte = new Date(dateFrom);
            if (dateTo)
                filter.timestamp.$lte = new Date(dateTo);
        }
        const [logs, total] = await Promise.all([
            AuditLog_1.default.find(filter)
                .populate('actor_id', 'full_name username email role')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean(),
            AuditLog_1.default.countDocuments(filter),
        ]);
        res.json({
            logs,
            total,
            page: pageNumber,
            pages: Math.max(1, Math.ceil(total / limitNumber)),
        });
    }
    catch (error) {
        console.error('adminGetAuditLogs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetUserActivity(req, res) {
    try {
        const userId = req.params.id;
        const [loginHistory, actionHistory, targetHistory] = await Promise.all([
            LoginActivity_1.default.find({ user_id: userId }).sort({ createdAt: -1 }).limit(100).lean(),
            AuditLog_1.default.find({ actor_id: userId }).sort({ timestamp: -1 }).limit(100).lean(),
            AuditLog_1.default.find({ target_id: userId }).sort({ timestamp: -1 }).limit(100).lean(),
        ]);
        res.json({ loginHistory, actionHistory, targetHistory });
    }
    catch (error) {
        console.error('adminGetUserActivity error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportStudents(req, res) {
    try {
        const format = String(req.query.format || req.query.type || 'xlsx').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
        const { search = '', batch = '', sscBatch = '', department = '', group = '', planCode = '', status = '', daysLeft: daysLeftFilter = '', profileScoreBand = '', paymentStatus = '', startDate = '', endDate = '', } = req.query;
        const allRows = await listStudentRows();
        const searchTerm = String(search || '').trim().toLowerCase();
        const batchTerm = String(batch || '').trim().toLowerCase();
        const sscBatchTerm = String(sscBatch || '').trim().toLowerCase();
        const departmentTerm = String(department || '').trim().toLowerCase();
        const groupTerm = String(group || '').trim().toLowerCase();
        const planTerm = String(planCode || '').trim().toLowerCase();
        const statusTerm = String(status || '').trim().toLowerCase();
        const daysTerm = String(daysLeftFilter || '').trim().toLowerCase();
        const scoreBandTerm = String(profileScoreBand || '').trim().toLowerCase();
        const paymentTerm = String(paymentStatus || '').trim().toLowerCase();
        const startDateTime = startDate ? new Date(startDate).getTime() : 0;
        const endDateTime = endDate ? new Date(endDate).getTime() : 0;
        const filteredRows = allRows.filter((row) => {
            if (searchTerm) {
                const haystack = [
                    row.fullName,
                    row.username,
                    row.email,
                    row.userUniqueId,
                    row.batch,
                    row.department,
                    ...row.groups.map((groupItem) => groupItem.name),
                ].join(' ').toLowerCase();
                if (!haystack.includes(searchTerm))
                    return false;
            }
            if (batchTerm && row.batch.toLowerCase() !== batchTerm)
                return false;
            if (sscBatchTerm && row.ssc_batch.toLowerCase() !== sscBatchTerm)
                return false;
            if (departmentTerm && row.department.toLowerCase() !== departmentTerm)
                return false;
            if (groupTerm) {
                const hasGroup = row.groups.some((groupItem) => String(groupItem._id).toLowerCase() === groupTerm || String(groupItem.slug).toLowerCase() === groupTerm);
                if (!hasGroup)
                    return false;
            }
            if (planTerm && row.subscription.planCode.toLowerCase() !== planTerm)
                return false;
            if (statusTerm && String(row.status).toLowerCase() !== statusTerm)
                return false;
            if (paymentTerm && String(row.paymentStatus || '').toLowerCase() !== paymentTerm)
                return false;
            if (startDateTime || endDateTime) {
                const rowTime = new Date(row.admittedAt || row.createdAt).getTime();
                if (startDateTime && rowTime < startDateTime)
                    return false;
                if (endDateTime && rowTime > endDateTime)
                    return false;
            }
            if (daysTerm === 'expired') {
                if (row.subscription.daysLeft > 0 || !row.subscription.expiryDate)
                    return false;
            }
            else if (daysTerm === '<=7' || daysTerm === 'lte7') {
                if (row.subscription.daysLeft > 7)
                    return false;
            }
            if (scoreBandTerm === 'lt70' || scoreBandTerm === '<70') {
                if (Number(row.profileScore || 0) >= 70)
                    return false;
            }
            else if (scoreBandTerm === 'gte70' || scoreBandTerm === '>=70') {
                if (Number(row.profileScore || 0) < 70)
                    return false;
            }
            return true;
        });
        // Map to flat, user-friendly export format with all admission fields
        const exportData = filteredRows.map((row) => ({
            'Full Name': row.fullName,
            'Username': row.username,
            'Email': row.email,
            'Phone Number': row.phoneNumber,
            'Roll Number': row.rollNumber || 'N/A',
            'Registration Number': row.registrationId || 'N/A',
            'Batch': row.batch,
            'SSC Batch': row.ssc_batch,
            'Department': row.department,
            'Guardian Name': row.guardianName || 'N/A',
            'Guardian Number': row.guardianPhone || 'N/A',
            'Address': row.presentAddress || row.permanentAddress || 'N/A',
            'Institution': row.institutionName || 'N/A',
            'Status': row.status,
            'Admitted At': row.admittedAt || row.createdAt,
            'Subscription Plan': row.subscription.planName || 'None',
            'Plan Code': row.subscription.planCode || 'N/A',
            'Days Left': row.subscription.daysLeft ?? 'N/A',
            'Expiry Date': row.subscription.expiryDate || 'N/A'
        }));
        if (format === 'csv') {
            const sheet = XLSX.utils.json_to_sheet(exportData);
            const csv = XLSX.utils.sheet_to_csv(sheet);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
            res.send(csv);
            return;
        }
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="students_export.xlsx"');
        res.send(buffer);
    }
    catch (error) {
        console.error('adminExportStudents error:', error);
        res.status(500).json({ message: 'Server error during export' });
    }
}
function parseGroupIds(input) {
    if (!Array.isArray(input))
        return [];
    return input
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
        .map((id) => new mongoose_1.default.Types.ObjectId(id));
}
function getSubscriptionResponse(subscription) {
    const expiryDate = subscription?.expiryDate ? new Date(String(subscription.expiryDate)) : null;
    const startDate = subscription?.startDate ? new Date(String(subscription.startDate)) : null;
    const isActive = Boolean(subscription?.isActive === true && expiryDate && expiryDate.getTime() >= Date.now());
    return {
        planCode: String(subscription?.planCode || subscription?.plan || ''),
        planName: String(subscription?.planName || subscription?.plan || ''),
        isActive,
        startDate,
        expiryDate,
        daysLeft: daysLeft(expiryDate),
    };
}
function matchesRules(profile, user, rules) {
    if (!rules)
        return false;
    // Rules are OR within a field, but AND across fields
    if (rules.batches?.length > 0) {
        const studentBatch = String(profile.hsc_batch || '').trim().toLowerCase();
        if (!rules.batches.some((b) => b.toLowerCase() === studentBatch))
            return false;
    }
    if (rules.sscBatches?.length > 0) {
        const studentSscBatch = String(profile.ssc_batch || '').trim().toLowerCase();
        if (!rules.sscBatches.some((b) => b.toLowerCase() === studentSscBatch))
            return false;
    }
    if (rules.departments?.length > 0) {
        const studentDept = String(profile.department || '').trim().toLowerCase();
        if (!rules.departments.some((d) => d.toLowerCase() === studentDept))
            return false;
    }
    if (rules.statuses?.length > 0) {
        const studentStatus = String(user.status || '').trim().toLowerCase();
        if (!rules.statuses.some((s) => s.toLowerCase() === studentStatus))
            return false;
    }
    if (rules.planCodes?.length > 0) {
        const studentPlan = String(user.subscription?.planCode || user.subscription?.plan || '').trim().toLowerCase();
        if (!rules.planCodes.some((p) => p.toLowerCase() === studentPlan))
            return false;
    }
    if (rules.profileScoreRange) {
        const score = Number(profile.profileScore || 0);
        if (rules.profileScoreRange.min !== undefined && score < rules.profileScoreRange.min)
            return false;
        if (rules.profileScoreRange.max !== undefined && score > rules.profileScoreRange.max)
            return false;
    }
    return true;
}
async function listStudentRows() {
    const users = await User_1.default.find({ role: 'student' })
        .select('username email full_name status phone_number profile_photo subscription createdAt updatedAt lastLogin')
        .sort({ createdAt: -1 })
        .lean();
    const userIds = users.map((user) => user._id);
    const [profiles, groupCountsRaw, examStatsRaw, dueLedgers, paymentAgg] = await Promise.all([
        StudentProfile_1.default.find({ user_id: { $in: userIds } })
            .select('user_id user_unique_id full_name phone phone_number ssc_batch hsc_batch department admittedAt groupIds guardian_name guardian_phone roll_number registration_id institution_name dob gender district country present_address permanent_address')
            .lean(),
        StudentProfile_1.default.aggregate([
            { $unwind: { path: '$groupIds', preserveNullAndEmptyArrays: false } },
            { $group: { _id: '$groupIds', studentCount: { $sum: 1 } } },
        ]),
        ExamResult_1.default.aggregate([
            { $match: { student: { $in: userIds } } },
            {
                $group: {
                    _id: '$student',
                    totalAttempts: { $sum: 1 },
                    avgPercentage: { $avg: '$percentage' },
                    bestPercentage: { $max: '$percentage' },
                    lastSubmittedAt: { $max: '$submittedAt' },
                },
            },
        ]),
        StudentDueLedger_1.default.find({ studentId: { $in: userIds } })
            .select('studentId netDue')
            .lean(),
        ManualPayment_1.default.aggregate([
            { $match: { studentId: { $in: userIds } } },
            { $sort: { date: -1, createdAt: -1 } },
            {
                $group: {
                    _id: '$studentId',
                    totalPaid: { $sum: '$amount' },
                    paymentCount: { $sum: 1 },
                    lastPaymentAt: { $first: '$date' },
                    lastMethod: { $first: '$method' },
                },
            },
        ]),
    ]);
    const allGroupsInDb = await StudentGroup_1.default.find({ isActive: true }).lean();
    const manualGroupMap = new Map(allGroupsInDb.filter(g => g.type !== 'dynamic').map(g => [String(g._id), g]));
    const dynamicGroups = allGroupsInDb.filter(g => g.type === 'dynamic');
    const profileMap = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
    const examStatsMap = new Map(examStatsRaw.map((item) => [String(item._id), item]));
    const groupCountMap = new Map(groupCountsRaw.map((item) => [String(item._id), Number(item.studentCount || 0)]));
    const dueLedgerMap = new Map(dueLedgers.map((row) => [String(row.studentId), Number(row.netDue || 0)]));
    const paymentMap = new Map(paymentAgg.map((row) => [String(row._id), {
            totalPaid: Number(row.totalPaid || 0),
            paymentCount: Number(row.paymentCount || 0),
            lastPaymentAt: row.lastPaymentAt || null,
            lastMethod: String(row.lastMethod || ''),
        }]));
    return users.map((user) => {
        const profile = profileMap.get(String(user._id));
        const stats = examStatsMap.get(String(user._id));
        const profileScore = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile, user);
        const pendingDue = Number(dueLedgerMap.get(String(user._id)) || 0);
        const payment = paymentMap.get(String(user._id)) || {
            totalPaid: 0,
            paymentCount: 0,
            lastPaymentAt: null,
            lastMethod: '',
        };
        const paymentStatus = pendingDue > 0 ? 'pending' : (payment.paymentCount > 0 ? 'paid' : 'clear');
        const subscription = getSubscriptionResponse(user.subscription);
        const manualGroupIds = Array.isArray(profile?.groupIds) ? profile.groupIds : [];
        const manualGroups = manualGroupIds.map(id => manualGroupMap.get(String(id))).filter(Boolean);
        const matchedDynamicGroups = dynamicGroups.filter(dg => matchesRules(profile, user, dg.rules));
        const mergedGroups = [...manualGroups, ...matchedDynamicGroups].map(group => ({
            _id: String(group?._id || ''),
            name: String(group?.name || ''),
            slug: String(group?.slug || ''),
            batchTag: String(group?.batchTag || ''),
            isActive: Boolean(group?.isActive),
            studentCount: groupCountMap.get(String(group?._id || '')) || Number(group?.studentCount || 0),
        }));
        return {
            _id: String(user._id),
            id: String(user._id),
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            status: user.status,
            phoneNumber: user.phone_number || profile?.phone_number || '',
            profilePhoto: user.profile_photo || '',
            userUniqueId: profile?.user_unique_id || '',
            profileScore: profileScore.score,
            profileScoreBreakdown: profileScore.breakdown,
            missingProfileFields: profileScore.missingFields,
            batch: profile?.hsc_batch || '',
            ssc_batch: profile?.ssc_batch || '',
            department: profile?.department || '',
            admittedAt: profile?.admittedAt || user.createdAt,
            groupIds: Array.isArray(profile?.groupIds) ? profile.groupIds.map((id) => String(id)) : [],
            groups: mergedGroups,
            subscription,
            paymentStatus,
            pendingDue,
            paymentSummary: payment,
            guardianName: String(profile?.guardian_name || ''),
            guardianNumber: String(profile?.guardian_phone || ''),
            guardianPhone: String(profile?.guardian_phone || ''),
            rollNumber: String(profile?.roll_number || ''),
            registrationNumber: String(profile?.registration_id || ''),
            registrationId: String(profile?.registration_id || ''),
            institutionName: String(profile?.institution_name || ''),
            dob: profile?.dob || null,
            gender: String(profile?.gender || ''),
            district: String(profile?.district || ''),
            country: String(profile?.country || ''),
            presentAddress: String(profile?.present_address || ''),
            permanentAddress: String(profile?.permanent_address || ''),
            examStats: {
                totalAttempts: Number(stats?.totalAttempts || 0),
                avgPercentage: Number(stats?.avgPercentage || 0),
                bestPercentage: Number(stats?.bestPercentage || 0),
                lastSubmittedAt: stats?.lastSubmittedAt || null,
            },
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin || null,
        };
    });
}
async function adminGetStudents(req, res) {
    try {
        const { page = '1', limit = '20', search = '', batch = '', sscBatch = '', department = '', group = '', planCode = '', status = '', daysLeft: daysLeftFilter = '', profileScoreBand = '', paymentStatus = '', startDate = '', endDate = '', } = req.query;
        const allRows = await listStudentRows();
        const searchTerm = String(search || '').trim().toLowerCase();
        const batchTerm = String(batch || '').trim().toLowerCase();
        const sscBatchTerm = String(sscBatch || '').trim().toLowerCase();
        const departmentTerm = String(department || '').trim().toLowerCase();
        const groupTerm = String(group || '').trim().toLowerCase();
        const planTerm = String(planCode || '').trim().toLowerCase();
        const statusTerm = String(status || '').trim().toLowerCase();
        const daysTerm = String(daysLeftFilter || '').trim().toLowerCase();
        const scoreBandTerm = String(profileScoreBand || '').trim().toLowerCase();
        const paymentTerm = String(paymentStatus || '').trim().toLowerCase();
        const startDateTime = startDate ? new Date(startDate).getTime() : 0;
        const endDateTime = endDate ? new Date(endDate).getTime() : 0;
        const filteredRows = allRows.filter((row) => {
            if (searchTerm) {
                const haystack = [
                    row.fullName,
                    row.username,
                    row.email,
                    row.userUniqueId,
                    row.batch,
                    row.department,
                    ...row.groups.map((groupItem) => groupItem.name),
                ].join(' ').toLowerCase();
                if (!haystack.includes(searchTerm))
                    return false;
            }
            if (batchTerm && row.batch.toLowerCase() !== batchTerm)
                return false;
            if (sscBatchTerm && row.ssc_batch.toLowerCase() !== sscBatchTerm)
                return false;
            if (departmentTerm && row.department.toLowerCase() !== departmentTerm)
                return false;
            if (groupTerm) {
                const hasGroup = row.groups.some((groupItem) => String(groupItem._id).toLowerCase() === groupTerm || String(groupItem.slug).toLowerCase() === groupTerm);
                if (!hasGroup)
                    return false;
            }
            if (planTerm && row.subscription.planCode.toLowerCase() !== planTerm)
                return false;
            if (statusTerm && String(row.status).toLowerCase() !== statusTerm)
                return false;
            if (paymentTerm && String(row.paymentStatus || '').toLowerCase() !== paymentTerm)
                return false;
            if (startDateTime || endDateTime) {
                const rowTime = new Date(row.admittedAt || row.createdAt).getTime();
                if (startDateTime && rowTime < startDateTime)
                    return false;
                if (endDateTime && rowTime > endDateTime)
                    return false;
            }
            if (daysTerm === 'expired') {
                if (row.subscription.daysLeft > 0 || !row.subscription.expiryDate)
                    return false;
            }
            else if (daysTerm === '<=7' || daysTerm === 'lte7') {
                if (row.subscription.daysLeft > 7)
                    return false;
            }
            if (scoreBandTerm === 'lt70' || scoreBandTerm === '<70') {
                if (Number(row.profileScore || 0) >= 70)
                    return false;
            }
            else if (scoreBandTerm === 'gte70' || scoreBandTerm === '>=70') {
                if (Number(row.profileScore || 0) < 70)
                    return false;
            }
            return true;
        });
        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.max(1, Math.min(200, Number(limit) || 20));
        const start = (pageNumber - 1) * limitNumber;
        const items = filteredRows.slice(start, start + limitNumber);
        const total = filteredRows.length;
        const pages = Math.max(1, Math.ceil(total / limitNumber));
        const summary = {
            total,
            active: filteredRows.filter((row) => row.status === 'active').length,
            inactive: filteredRows.filter((row) => row.status !== 'active').length,
            expired: filteredRows.filter((row) => row.subscription.expiryDate && row.subscription.daysLeft === 0).length,
            expiringSoon: filteredRows.filter((row) => row.subscription.daysLeft > 0 && row.subscription.daysLeft <= 7).length,
            profileBelow70: filteredRows.filter((row) => Number(row.profileScore || 0) < 70).length,
            paymentPending: filteredRows.filter((row) => String(row.paymentStatus || '') === 'pending').length,
        };
        res.json({ items, total, page: pageNumber, pages, summary, lastUpdatedAt: new Date().toISOString() });
    }
    catch (error) {
        console.error('adminGetStudents error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateStudent(req, res) {
    try {
        const body = req.body;
        const username = String(body.username || '').trim().toLowerCase();
        const email = String(body.email || '').trim().toLowerCase();
        const fullName = String(body.full_name || body.fullName || body.name || '').trim();
        const phoneNumber = readOptionalString(body, ['phone_number', 'phoneNumber', 'phone']);
        const guardianPhone = readOptionalString(body, ['guardian_phone', 'guardianNumber']);
        const userUniqueId = readOptionalString(body, ['user_unique_id', 'userUniqueId']);
        const sscBatch = readFirstString(body, ['ssc_batch', 'sscBatch']);
        const hscBatch = readFirstString(body, ['hsc_batch', 'hscBatch', 'batch']);
        const collegeName = readFirstString(body, ['college_name', 'collegeName']);
        const collegeAddress = readFirstString(body, ['college_address', 'collegeAddress']);
        const rollNumber = readFirstString(body, ['roll_number', 'rollNumber']);
        const registrationId = readFirstString(body, ['registration_id', 'registrationNumber']);
        const institutionName = readFirstString(body, ['institution_name', 'institutionName']);
        if (!username || !email || !fullName) {
            res.status(400).json({ message: 'full_name, username and email are required' });
            return;
        }
        const exists = await User_1.default.findOne({ $or: [{ username }, { email }] }).select('_id').lean();
        if (exists) {
            res.status(400).json({ message: 'Username or email already exists' });
            return;
        }
        const providedPassword = String(body.password || '').trim();
        const plainPassword = providedPassword || newRandomPassword(10);
        const hashedPassword = await bcryptjs_1.default.hash(plainPassword, 12);
        const normalizedSubscription = await resolveSubscriptionPayload((body.subscription && typeof body.subscription === 'object')
            ? body.subscription
            : body);
        const user = await User_1.default.create({
            full_name: fullName,
            username,
            email,
            password: hashedPassword,
            role: 'student',
            status: normalizeStatus(body.status, 'active'),
            phone_number: phoneNumber,
            profile_photo: typeof body.profile_photo === 'string' ? body.profile_photo : '',
            permissions: buildPermissions('student'),
            mustChangePassword: toBoolean(body.mustChangePassword) || !providedPassword,
            forcePasswordResetRequired: toBoolean(body.mustChangePassword) || !providedPassword,
            subscription: {
                plan: normalizedSubscription.planCode,
                planCode: normalizedSubscription.planCode,
                planName: normalizedSubscription.planName,
                isActive: normalizedSubscription.isActive,
                startDate: normalizedSubscription.startDate,
                expiryDate: normalizedSubscription.expiryDate,
                assignedBy: req.user?._id,
                assignedAt: new Date(),
            },
        });
        const inviteSent = !providedPassword ? await issueSetPasswordInvite(user) : false;
        const profile = await StudentProfile_1.default.create({
            user_id: user._id,
            user_unique_id: userUniqueId || `CW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)}`,
            full_name: fullName,
            username,
            email,
            phone: phoneNumber,
            phone_number: phoneNumber,
            guardian_phone: guardianPhone,
            ssc_batch: sscBatch,
            hsc_batch: hscBatch,
            department: ['science', 'arts', 'commerce'].includes(String(body.department || '').toLowerCase())
                ? String(body.department || '').toLowerCase()
                : undefined,
            college_name: collegeName,
            college_address: collegeAddress,
            roll_number: rollNumber,
            registration_id: registrationId,
            institution_name: institutionName,
            admittedAt: body.admittedAt ? new Date(String(body.admittedAt)) : user.createdAt,
            groupIds: [],
            profile_completion_percentage: 20,
        });
        profile.profile_completion_percentage = computeProfileCompletion(profile.toObject());
        await profile.save();
        // Sync group memberships through the centralized service
        const requestedGroupIds = parseGroupIds(body.groupIds || body.group_ids);
        if (requestedGroupIds.length > 0) {
            await groupMembershipService.setStudentGroups(user._id, requestedGroupIds, req.user?._id, 'Assigned during student creation');
            // Reload profile to get updated groupIds
            const refreshed = await StudentProfile_1.default.findOne({ user_id: user._id }).select('groupIds').lean();
            if (refreshed)
                profile.groupIds = refreshed.groupIds;
        }
        let paymentSyncWarning;
        try {
            let enrollmentAmount = Number(body.paymentAmount ?? body.enrollmentAmount ?? body.paidAmount ?? NaN);
            if (!Number.isFinite(enrollmentAmount) || enrollmentAmount < 0) {
                const assignedPlan = normalizedSubscription.planCode
                    ? await SubscriptionPlan_1.default.findOne({ code: normalizedSubscription.planCode })
                        .select('price priceBDT')
                        .lean()
                    : null;
                const defaultPlanAmount = Number(assignedPlan?.priceBDT
                    ?? assignedPlan?.price
                    ?? 0);
                enrollmentAmount = defaultPlanAmount > 0 ? defaultPlanAmount : 0;
            }
            const hasRecordPaymentFlag = body.recordPayment !== undefined || body.autoAddToFinance !== undefined;
            const shouldRecordPayment = hasRecordPaymentFlag
                ? toBoolean(body.recordPayment ?? body.autoAddToFinance)
                : enrollmentAmount > 0;
            if (shouldRecordPayment && enrollmentAmount > 0) {
                await createEnrollmentPaymentEntry({
                    studentId: user._id,
                    recordedById: req.user?._id || null,
                    planCode: normalizedSubscription.planCode,
                    planName: normalizedSubscription.planName,
                    amount: enrollmentAmount,
                    method: body.paymentMethod,
                    status: body.paymentStatus,
                    transactionId: body.transactionId,
                    notes: body.paymentNotes,
                    date: body.paymentDate,
                });
            }
        }
        catch (paymentError) {
            console.error('adminCreateStudent payment sync error:', paymentError);
            paymentSyncWarning = 'Student created but finance payment sync failed.';
        }
        await createAuditLog(req, 'student_created', String(user._id), 'student', {
            subscriptionPlanCode: normalizedSubscription.planCode,
            groupCount: Array.isArray(profile.groupIds) ? profile.groupIds.length : 0,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_created',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { role: 'student', source: 'student_management' },
        });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId: String(user._id), source: 'student_create' } });
        res.status(201).json({
            message: 'Student created successfully',
            student: {
                _id: String(user._id),
                username: user.username,
                email: user.email,
                fullName,
                userUniqueId: profile.user_unique_id,
                subscription: getSubscriptionResponse(user.subscription),
            },
            inviteSent,
            paymentSyncWarning,
        });
    }
    catch (error) {
        console.error('adminCreateStudent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateStudent(req, res) {
    try {
        const studentId = req.params.id;
        const body = req.body;
        const normalizedBody = { ...body };
        if (normalizedBody.full_name === undefined && typeof body.fullName === 'string')
            normalizedBody.full_name = body.fullName;
        if (normalizedBody.phone_number === undefined && body.phoneNumber !== undefined)
            normalizedBody.phone_number = body.phoneNumber;
        if (normalizedBody.phone_number === undefined && body.phone !== undefined)
            normalizedBody.phone_number = body.phone;
        if (normalizedBody.guardian_phone === undefined && body.guardianNumber !== undefined)
            normalizedBody.guardian_phone = body.guardianNumber;
        if (normalizedBody.ssc_batch === undefined && body.sscBatch !== undefined)
            normalizedBody.ssc_batch = body.sscBatch;
        if (normalizedBody.hsc_batch === undefined && body.hscBatch !== undefined)
            normalizedBody.hsc_batch = body.hscBatch;
        if (normalizedBody.college_name === undefined && body.collegeName !== undefined)
            normalizedBody.college_name = body.collegeName;
        if (normalizedBody.college_address === undefined && body.collegeAddress !== undefined)
            normalizedBody.college_address = body.collegeAddress;
        if (normalizedBody.roll_number === undefined && body.rollNumber !== undefined)
            normalizedBody.roll_number = body.rollNumber;
        if (normalizedBody.registration_id === undefined && body.registrationNumber !== undefined)
            normalizedBody.registration_id = body.registrationNumber;
        if (normalizedBody.institution_name === undefined && body.institutionName !== undefined)
            normalizedBody.institution_name = body.institutionName;
        if (normalizedBody.user_unique_id === undefined && body.userUniqueId !== undefined)
            normalizedBody.user_unique_id = body.userUniqueId;
        if (normalizedBody.groupIds === undefined && body.group_ids !== undefined)
            normalizedBody.groupIds = body.group_ids;
        const user = await User_1.default.findById(studentId);
        if (!user || user.role !== 'student') {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        if (typeof body.username === 'string') {
            const username = body.username.trim().toLowerCase();
            if (username && username !== user.username) {
                const exists = await User_1.default.exists({ username, _id: { $ne: user._id } });
                if (exists) {
                    res.status(400).json({ message: 'Username already in use' });
                    return;
                }
                user.username = username;
            }
        }
        if (typeof body.email === 'string') {
            const email = body.email.trim().toLowerCase();
            if (email && email !== user.email) {
                const exists = await User_1.default.exists({ email, _id: { $ne: user._id } });
                if (exists) {
                    res.status(400).json({ message: 'Email already in use' });
                    return;
                }
                user.email = email;
            }
        }
        if (typeof normalizedBody.full_name === 'string' && normalizedBody.full_name.trim())
            user.full_name = normalizedBody.full_name.trim();
        if (normalizedBody.phone_number !== undefined) {
            user.phone_number = readOptionalString(normalizedBody, ['phone_number']) || undefined;
        }
        if (typeof normalizedBody.profile_photo === 'string')
            user.profile_photo = normalizedBody.profile_photo.trim();
        if (normalizedBody.status)
            user.status = normalizeStatus(normalizedBody.status, user.status);
        if (normalizedBody.subscription ||
            normalizedBody.planCode ||
            normalizedBody.plan ||
            normalizedBody.planId ||
            normalizedBody.expiryDate ||
            normalizedBody.startDate ||
            normalizedBody.isActive !== undefined) {
            const normalizedSubscription = await resolveSubscriptionPayload((normalizedBody.subscription && typeof normalizedBody.subscription === 'object')
                ? normalizedBody.subscription
                : normalizedBody, user.subscription);
            user.subscription = {
                ...(user.subscription || {}),
                plan: normalizedSubscription.planCode,
                planCode: normalizedSubscription.planCode,
                planName: normalizedSubscription.planName,
                isActive: normalizedSubscription.isActive,
                startDate: normalizedSubscription.startDate,
                expiryDate: normalizedSubscription.expiryDate,
                assignedBy: req.user?._id && mongoose_1.default.Types.ObjectId.isValid(req.user._id)
                    ? new mongoose_1.default.Types.ObjectId(req.user._id)
                    : undefined,
                assignedAt: new Date(),
            };
        }
        await user.save();
        const profile = await StudentProfile_1.default.findOne({ user_id: user._id });
        if (!profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        const allowedProfileFields = [
            'full_name', 'phone', 'phone_number', 'guardian_phone',
            'ssc_batch', 'hsc_batch', 'department', 'college_name', 'college_address',
            'roll_number', 'registration_id', 'institution_name', 'user_unique_id',
            'present_address', 'permanent_address', 'district', 'country', 'dob',
            'guardianPhoneVerificationStatus', 'guardianPhoneVerifiedAt',
        ];
        for (const field of allowedProfileFields) {
            if (normalizedBody[field] !== undefined) {
                profile[field] = normalizedBody[field];
            }
        }
        if (normalizedBody.admittedAt !== undefined) {
            profile.admittedAt = normalizedBody.admittedAt ? new Date(String(normalizedBody.admittedAt)) : null;
        }
        if (normalizedBody.groupIds !== undefined) {
            const desiredGroupIds = parseGroupIds(normalizedBody.groupIds);
            await groupMembershipService.setStudentGroups(user._id, desiredGroupIds, req.user?._id, 'Updated via student management');
            // Reload profile to get updated groupIds
            const refreshed = await StudentProfile_1.default.findOne({ user_id: user._id }).select('groupIds').lean();
            if (refreshed)
                profile.groupIds = refreshed.groupIds;
        }
        profile.username = user.username;
        profile.email = user.email;
        if (!profile.phone && profile.phone_number)
            profile.phone = profile.phone_number;
        if (!profile.phone_number && profile.phone)
            profile.phone_number = profile.phone;
        profile.profile_completion_percentage = computeProfileCompletion(profile.toObject());
        await profile.save();
        await createAuditLog(req, 'student_updated', String(user._id), 'student', {
            edited_fields: Object.keys(normalizedBody),
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_updated',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { source: 'student_management', editedFields: Object.keys(normalizedBody) },
        });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId: String(user._id), source: 'student_update' } });
        res.json({
            message: 'Student updated successfully',
            student: {
                _id: String(user._id),
                username: user.username,
                email: user.email,
                fullName: profile.full_name || user.full_name,
                userUniqueId: profile.user_unique_id || '',
                batch: profile.hsc_batch || '',
                admittedAt: profile.admittedAt || user.createdAt,
                groupIds: Array.isArray(profile.groupIds) ? profile.groupIds.map((id) => String(id)) : [],
                subscription: getSubscriptionResponse(user.subscription),
            },
        });
    }
    catch (error) {
        console.error('adminUpdateStudent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateStudentSubscription(req, res) {
    try {
        const studentId = req.params.id;
        const user = await User_1.default.findById(studentId);
        if (!user || user.role !== 'student') {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const body = req.body;
        const normalizedSubscription = await resolveSubscriptionPayload(body, user.subscription);
        user.subscription = {
            ...(user.subscription || {}),
            plan: normalizedSubscription.planCode,
            planCode: normalizedSubscription.planCode,
            planName: normalizedSubscription.planName,
            isActive: normalizedSubscription.isActive,
            startDate: normalizedSubscription.startDate,
            expiryDate: normalizedSubscription.expiryDate,
            assignedBy: req.user?._id && mongoose_1.default.Types.ObjectId.isValid(req.user._id)
                ? new mongoose_1.default.Types.ObjectId(req.user._id)
                : undefined,
            assignedAt: new Date(),
        };
        await user.save();
        let paymentSyncWarning;
        try {
            const shouldRecordPayment = req.body?.recordPayment === undefined
                ? true
                : toBoolean(req.body?.recordPayment);
            if (shouldRecordPayment) {
                let enrollmentAmount = Number(body.paymentAmount ?? body.enrollmentAmount ?? body.paidAmount ?? NaN);
                if (!Number.isFinite(enrollmentAmount) || enrollmentAmount < 0) {
                    const assignedPlan = normalizedSubscription.planCode
                        ? await SubscriptionPlan_1.default.findOne({ code: normalizedSubscription.planCode })
                            .select('price priceBDT')
                            .lean()
                        : null;
                    const defaultPlanAmount = Number(assignedPlan?.priceBDT
                        ?? assignedPlan?.price
                        ?? 0);
                    enrollmentAmount = defaultPlanAmount > 0 ? defaultPlanAmount : 0;
                }
                if (enrollmentAmount > 0) {
                    await createEnrollmentPaymentEntry({
                        studentId: user._id,
                        recordedById: req.user?._id || null,
                        planCode: normalizedSubscription.planCode,
                        planName: normalizedSubscription.planName,
                        amount: enrollmentAmount,
                        method: body.paymentMethod,
                        status: body.paymentStatus,
                        transactionId: body.transactionId,
                        notes: body.paymentNotes,
                        date: body.paymentDate,
                    });
                }
            }
        }
        catch (paymentError) {
            console.error('adminUpdateStudentSubscription payment sync error:', paymentError);
            paymentSyncWarning = 'Subscription updated but finance payment sync failed.';
        }
        await createAuditLog(req, 'student_subscription_updated', String(user._id), 'student', {
            planCode: normalizedSubscription.planCode,
            expiryDate: normalizedSubscription.expiryDate,
            isActive: normalizedSubscription.isActive,
        });
        (0, userStream_1.broadcastUserEvent)({
            type: 'user_updated',
            userId: String(user._id),
            actorId: req.user?._id,
            meta: { subscriptionUpdated: true, source: 'student_management' },
        });
        res.json({
            message: 'Student subscription updated successfully',
            subscription: getSubscriptionResponse(user.subscription),
            paymentSyncWarning,
        });
    }
    catch (error) {
        console.error('adminUpdateStudentSubscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateStudentGroups(req, res) {
    try {
        const studentId = String(req.params.id);
        const user = await User_1.default.findById(studentId).select('role');
        if (!user || user.role !== 'student') {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const body = req.body;
        const profile = await StudentProfile_1.default.findOne({ user_id: studentId });
        if (!profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        const desiredGroupIds = parseGroupIds(body.groupIds);
        const diff = await groupMembershipService.setStudentGroups(studentId, desiredGroupIds, req.user?._id, 'Updated via student groups endpoint');
        // Reload profile
        const refreshed = await StudentProfile_1.default.findOne({ user_id: studentId }).select('groupIds').lean();
        const finalGroupIds = (refreshed?.groupIds ?? []).map((id) => String(id));
        await createAuditLog(req, 'student_groups_updated', String(studentId), 'student', {
            groupIds: finalGroupIds,
            added: diff.added,
            removed: diff.removed,
        });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId, source: 'group_update' } });
        res.json({
            message: 'Student groups updated successfully',
            groupIds: finalGroupIds,
        });
    }
    catch (error) {
        console.error('adminUpdateStudentGroups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetStudentExams(req, res) {
    try {
        const studentId = req.params.id;
        const user = await User_1.default.findById(studentId).select('role').lean();
        if (!user || user.role !== 'student') {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const rows = await ExamResult_1.default.find({ student: studentId })
            .populate('exam', 'title subject resultPublishDate')
            .sort({ submittedAt: -1 })
            .lean();
        const now = Date.now();
        const items = rows.map((item) => {
            const exam = item.exam || {};
            const writtenUploads = Array.isArray(item.answers)
                ? item.answers.filter((answer) => Boolean(answer.writtenAnswerUrl)).length
                : 0;
            const publishDate = exam.resultPublishDate ? new Date(String(exam.resultPublishDate)) : null;
            return {
                resultId: String(item._id),
                examId: String(exam._id || item.exam),
                examTitle: String(exam.title || ''),
                subject: String(exam.subject || ''),
                attemptNo: Number(item.attemptNo || 1),
                obtainedMarks: Number(item.obtainedMarks || 0),
                totalMarks: Number(item.totalMarks || 0),
                percentage: Number(item.percentage || 0),
                rank: item.rank || null,
                status: item.status || 'evaluated',
                submittedAt: item.submittedAt,
                resultPublished: Boolean(publishDate && publishDate.getTime() <= now),
                publishDate,
                hasWrittenAttachment: writtenUploads > 0,
                writtenAttachmentCount: writtenUploads,
            };
        });
        res.json({ items, lastUpdatedAt: new Date().toISOString() });
    }
    catch (error) {
        console.error('adminGetStudentExams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetStudentGroups(_req, res) {
    try {
        const [groups, groupCountsRaw] = await Promise.all([
            StudentGroup_1.default.find().sort({ isActive: -1, batchTag: 1, name: 1 }).lean(),
            StudentProfile_1.default.aggregate([
                { $unwind: { path: '$groupIds', preserveNullAndEmptyArrays: false } },
                { $group: { _id: '$groupIds', studentCount: { $sum: 1 } } },
            ]),
        ]);
        const countMap = new Map(groupCountsRaw.map((item) => [String(item._id), Number(item.studentCount || 0)]));
        const items = groups.map((group) => ({
            ...group,
            studentCount: countMap.get(String(group._id)) || 0,
        }));
        res.json({ items, lastUpdatedAt: new Date().toISOString() });
    }
    catch (error) {
        console.error('adminGetStudentGroups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateStudentGroup(req, res) {
    try {
        const body = req.body;
        const name = String(body.name || '').trim();
        if (!name) {
            res.status(400).json({ message: 'Group name is required' });
            return;
        }
        const baseSlug = slugify(body.slug || name);
        let slug = baseSlug || `group-${Date.now()}`;
        let suffix = 1;
        while (await StudentGroup_1.default.exists({ slug })) {
            suffix += 1;
            slug = `${baseSlug}-${suffix}`;
        }
        const item = await StudentGroup_1.default.create({
            name,
            slug,
            type: body.type === 'dynamic' ? 'dynamic' : 'manual',
            rules: body.type === 'dynamic' ? (body.rules || {}) : undefined,
            batchTag: String(body.batchTag || ''),
            description: String(body.description || ''),
            isActive: body.isActive !== undefined ? toBoolean(body.isActive) : true,
            // New product fields
            shortCode: typeof body.shortCode === 'string' ? body.shortCode.trim().toUpperCase() : undefined,
            color: typeof body.color === 'string' ? body.color.trim() : '#6366f1',
            icon: typeof body.icon === 'string' ? body.icon.trim() : 'Users',
            cardStyleVariant: ['solid', 'gradient', 'outline', 'minimal'].includes(String(body.cardStyleVariant)) ? body.cardStyleVariant : 'solid',
            sortOrder: Number(body.sortOrder) || 0,
            isFeatured: toBoolean(body.isFeatured),
            batch: typeof body.batch === 'string' ? body.batch.trim() : undefined,
            department: typeof body.department === 'string' ? body.department.trim() : undefined,
            visibilityNote: typeof body.visibilityNote === 'string' ? body.visibilityNote.trim() : '',
            defaultExamVisibility: ['all_students', 'group_only', 'hidden'].includes(String(body.defaultExamVisibility)) ? body.defaultExamVisibility : 'all_students',
            defaultCommunicationAudience: toBoolean(body.defaultCommunicationAudience),
            meta: (body.meta && typeof body.meta === 'object') ? body.meta : {},
        });
        await createAuditLog(req, 'student_group_created', String(item._id), 'student_group', { name: item.name, slug: item.slug });
        res.status(201).json({ item, message: 'Student group created' });
    }
    catch (error) {
        console.error('adminCreateStudentGroup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateStudentGroup(req, res) {
    try {
        const body = req.body;
        const update = {};
        if (body.name !== undefined)
            update.name = String(body.name || '').trim();
        if (body.batchTag !== undefined)
            update.batchTag = String(body.batchTag || '').trim();
        if (body.description !== undefined)
            update.description = String(body.description || '');
        if (body.isActive !== undefined)
            update.isActive = toBoolean(body.isActive);
        if (body.type !== undefined)
            update.type = body.type === 'dynamic' ? 'dynamic' : 'manual';
        if (body.rules !== undefined)
            update.rules = body.rules;
        if (body.meta !== undefined && typeof body.meta === 'object')
            update.meta = body.meta;
        // New product fields
        if (body.shortCode !== undefined)
            update.shortCode = String(body.shortCode || '').trim().toUpperCase();
        if (body.color !== undefined)
            update.color = String(body.color || '').trim();
        if (body.icon !== undefined)
            update.icon = String(body.icon || '').trim();
        if (body.cardStyleVariant !== undefined && ['solid', 'gradient', 'outline', 'minimal'].includes(String(body.cardStyleVariant))) {
            update.cardStyleVariant = body.cardStyleVariant;
        }
        if (body.sortOrder !== undefined)
            update.sortOrder = Number(body.sortOrder) || 0;
        if (body.isFeatured !== undefined)
            update.isFeatured = toBoolean(body.isFeatured);
        if (body.batch !== undefined)
            update.batch = String(body.batch || '').trim();
        if (body.department !== undefined)
            update.department = String(body.department || '').trim();
        if (body.visibilityNote !== undefined)
            update.visibilityNote = String(body.visibilityNote || '').trim();
        if (body.defaultExamVisibility !== undefined && ['all_students', 'group_only', 'hidden'].includes(String(body.defaultExamVisibility))) {
            update.defaultExamVisibility = body.defaultExamVisibility;
        }
        if (body.defaultCommunicationAudience !== undefined)
            update.defaultCommunicationAudience = toBoolean(body.defaultCommunicationAudience);
        if (body.slug !== undefined) {
            const slug = slugify(body.slug);
            if (!slug) {
                res.status(400).json({ message: 'Invalid slug' });
                return;
            }
            const exists = await StudentGroup_1.default.exists({ slug, _id: { $ne: req.params.id } });
            if (exists) {
                res.status(400).json({ message: 'Slug already exists' });
                return;
            }
            update.slug = slug;
        }
        const item = await StudentGroup_1.default.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!item) {
            res.status(404).json({ message: 'Student group not found' });
            return;
        }
        // Handle member updates via centralized service
        const addStudentIds = Array.isArray(body.addStudentIds) ? body.addStudentIds : [];
        const removeStudentIds = Array.isArray(body.removeStudentIds) ? body.removeStudentIds : [];
        let addResult = { added: 0, skipped: 0, errors: [] };
        let removeResult = { removed: 0, skipped: 0, errors: [] };
        if (addStudentIds.length > 0) {
            addResult = await groupMembershipService.bulkAddMembers(item._id, addStudentIds, req.user?._id, 'Added via group update');
        }
        if (removeStudentIds.length > 0) {
            removeResult = await groupMembershipService.bulkRemoveMembers(item._id, removeStudentIds, req.user?._id, 'Removed via group update');
        }
        await createAuditLog(req, 'student_group_updated', String(item._id), 'student_group', {
            edited_fields: Object.keys(update),
            added_members: addResult.added,
            removed_members: removeResult.removed,
        });
        res.json({ item, message: 'Student group updated' });
    }
    catch (error) {
        console.error('adminUpdateStudentGroup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteStudentGroup(req, res) {
    try {
        const groupId = req.params.id;
        const item = await StudentGroup_1.default.findByIdAndDelete(groupId);
        if (!item) {
            res.status(404).json({ message: 'Student group not found' });
            return;
        }
        await StudentProfile_1.default.updateMany({ groupIds: item._id }, { $pull: { groupIds: item._id } });
        await createAuditLog(req, 'student_group_deleted', String(groupId), 'student_group', { slug: item.slug });
        res.json({ message: 'Student group deleted' });
    }
    catch (error) {
        console.error('adminDeleteStudentGroup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportStudentGroups(_req, res) {
    try {
        const format = String(_req.query.format || _req.query.type || 'xlsx').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
        const search = String(_req.query.q || '').trim().toLowerCase();
        const [groups, groupCountsRaw] = await Promise.all([
            StudentGroup_1.default.find().sort({ isActive: -1, batchTag: 1, name: 1 }).lean(),
            StudentProfile_1.default.aggregate([
                { $unwind: { path: '$groupIds', preserveNullAndEmptyArrays: false } },
                { $group: { _id: '$groupIds', studentCount: { $sum: 1 } } },
            ]),
        ]);
        const countMap = new Map(groupCountsRaw.map((item) => [String(item._id), Number(item.studentCount || 0)]));
        const rows = groups.map((group) => ({
            name: group.name,
            slug: group.slug,
            batchTag: group.batchTag || '',
            description: group.description || '',
            isActive: group.isActive,
            studentCount: countMap.get(String(group._id)) || 0,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
        })).filter((group) => {
            if (!search)
                return true;
            return [group.name, group.slug, group.batchTag, group.description]
                .join(' ')
                .toLowerCase()
                .includes(search);
        });
        if (format === 'csv') {
            const sheet = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(sheet);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="student_groups_export.csv"');
            res.send(csv);
            return;
        }
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Groups');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="student_groups_export.xlsx"');
        res.send(buffer);
    }
    catch (error) {
        console.error('adminExportStudentGroups error:', error);
        res.status(500).json({ message: 'Server error during group export' });
    }
}
async function adminImportStudentGroups(req, res) {
    try {
        const file = req.file;
        const uploadedBuffer = await getUploadedFileBuffer(file);
        if (!file || !uploadedBuffer) {
            res.status(400).json({ message: 'File upload is required' });
            return;
        }
        const filename = String(file.originalname || '').toLowerCase();
        const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
        const rows = isExcel ? await parseExcelBuffer(uploadedBuffer) : await parseCsvBuffer(uploadedBuffer);
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const name = String(row.name || '').trim();
            const slug = slugify(row.slug || name);
            if (!name || !slug) {
                skipped += 1;
                errors.push(`Row ${index + 1}: Missing group name/slug`);
                continue;
            }
            const isActiveRaw = String(row.is_active || row.isactive || row.active || '').trim().toLowerCase();
            const parsedIsActive = isActiveRaw
                ? ['1', 'true', 'yes', 'on', 'active'].includes(isActiveRaw)
                : true;
            let meta = {};
            const rawMeta = String(row.meta || row.meta_json || '').trim();
            if (rawMeta) {
                try {
                    meta = JSON.parse(rawMeta);
                }
                catch {
                    errors.push(`Row ${index + 1}: Invalid meta JSON, ignored`);
                }
            }
            const payload = {
                name,
                slug,
                batchTag: String(row.batch_tag || row.batchtag || '').trim(),
                description: String(row.description || '').trim(),
                isActive: parsedIsActive,
                meta,
            };
            const existing = await StudentGroup_1.default.findOne({ slug }).select('_id').lean();
            if (existing?._id) {
                await StudentGroup_1.default.findByIdAndUpdate(existing._id, payload, { new: false });
                updated += 1;
            }
            else {
                await StudentGroup_1.default.create(payload);
                created += 1;
            }
        }
        await createAuditLog(req, 'student_group_imported', undefined, 'student_group', {
            totalRows: rows.length,
            created,
            updated,
            skipped,
            errors: errors.length,
        });
        res.json({
            message: `Group import completed. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}.`,
            created,
            updated,
            skipped,
            totalRows: rows.length,
            errors,
        });
    }
    catch (error) {
        console.error('adminImportStudentGroups error:', error);
        res.status(500).json({
            message: 'Server error during group import',
            error: process.env.NODE_ENV === 'production'
                ? undefined
                : (error instanceof Error ? error.message : String(error)),
        });
    }
}
async function adminGetSubscriptionPlans(_req, res) {
    try {
        const items = await SubscriptionPlan_1.default.find().sort({ isActive: -1, priority: 1, code: 1 }).lean();
        res.json({ items, lastUpdatedAt: new Date().toISOString() });
    }
    catch (error) {
        console.error('adminGetSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getPublicSubscriptionPlans(_req, res) {
    try {
        const items = await SubscriptionPlan_1.default.find({ isActive: true })
            .sort({ sortOrder: 1, priority: 1, code: 1 })
            .lean();
        res.json({
            items,
            lastUpdatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('getPublicSubscriptionPlans error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateSubscriptionPlan(req, res) {
    try {
        const body = req.body;
        const code = slugify(body.code || body.name);
        if (!code) {
            res.status(400).json({ message: 'Plan code is required' });
            return;
        }
        const exists = await SubscriptionPlan_1.default.exists({ code });
        if (exists) {
            res.status(400).json({ message: 'Plan code already exists' });
            return;
        }
        const durationValue = Math.max(1, Number(body.durationValue || body.durationDays || 30));
        const durationUnit = String(body.durationUnit || 'days') === 'months' ? 'months' : 'days';
        const durationDays = body.durationDays !== undefined
            ? Math.max(1, Number(body.durationDays || 30))
            : (durationUnit === 'months' ? durationValue * 30 : durationValue);
        const item = await SubscriptionPlan_1.default.create({
            code,
            name: String(body.name || code).trim(),
            durationDays,
            durationValue,
            durationUnit,
            price: Math.max(0, Number(body.price || 0)),
            description: String(body.description || ''),
            features: Array.isArray(body.features) ? body.features.map((feature) => String(feature)) : [],
            includedModules: Array.isArray(body.includedModules) ? body.includedModules.map((item) => String(item)) : [],
            isActive: body.isActive !== undefined ? toBoolean(body.isActive) : true,
            priority: Number(body.priority || 100),
            sortOrder: Number(body.sortOrder || body.priority || 100),
        });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'subscriptionPlans' } });
        await createAuditLog(req, 'subscription_plan_created', String(item._id), 'subscription_plan', { code: item.code });
        res.status(201).json({ item, message: 'Subscription plan created' });
    }
    catch (error) {
        console.error('adminCreateSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateSubscriptionPlan(req, res) {
    try {
        const body = req.body;
        const update = {};
        if (body.code !== undefined) {
            const nextCode = slugify(body.code);
            if (!nextCode) {
                res.status(400).json({ message: 'Invalid plan code' });
                return;
            }
            const exists = await SubscriptionPlan_1.default.exists({ code: nextCode, _id: { $ne: req.params.id } });
            if (exists) {
                res.status(400).json({ message: 'Plan code already exists' });
                return;
            }
            update.code = nextCode;
        }
        if (body.name !== undefined)
            update.name = String(body.name || '').trim();
        if (body.durationValue !== undefined)
            update.durationValue = Math.max(1, Number(body.durationValue || 30));
        if (body.durationUnit !== undefined)
            update.durationUnit = String(body.durationUnit) === 'months' ? 'months' : 'days';
        if (body.durationDays !== undefined) {
            update.durationDays = Math.max(1, Number(body.durationDays || 30));
        }
        else if (update.durationValue !== undefined || update.durationUnit !== undefined) {
            const nextDurationValue = Number(update.durationValue || body.durationValue || 30);
            const nextDurationUnit = String(update.durationUnit || body.durationUnit || 'days') === 'months' ? 'months' : 'days';
            update.durationDays = nextDurationUnit === 'months'
                ? Math.max(1, nextDurationValue) * 30
                : Math.max(1, nextDurationValue);
        }
        if (body.price !== undefined)
            update.price = Math.max(0, Number(body.price || 0));
        if (body.description !== undefined)
            update.description = String(body.description || '');
        if (body.features !== undefined && Array.isArray(body.features)) {
            update.features = body.features.map((feature) => String(feature));
        }
        if (body.includedModules !== undefined && Array.isArray(body.includedModules)) {
            update.includedModules = body.includedModules.map((item) => String(item));
        }
        if (body.priority !== undefined)
            update.priority = Number(body.priority || 100);
        if (body.sortOrder !== undefined)
            update.sortOrder = Number(body.sortOrder || 100);
        if (body.isActive !== undefined)
            update.isActive = toBoolean(body.isActive);
        const item = await SubscriptionPlan_1.default.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!item) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'subscriptionPlans' } });
        await createAuditLog(req, 'subscription_plan_updated', String(item._id), 'subscription_plan', { edited_fields: Object.keys(update) });
        res.json({ item, message: 'Subscription plan updated' });
    }
    catch (error) {
        console.error('adminUpdateSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleSubscriptionPlan(req, res) {
    try {
        const item = await SubscriptionPlan_1.default.findById(req.params.id);
        if (!item) {
            res.status(404).json({ message: 'Subscription plan not found' });
            return;
        }
        item.isActive = !item.isActive;
        await item.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'subscriptionPlans' } });
        await createAuditLog(req, 'subscription_plan_toggled', String(item._id), 'subscription_plan', { isActive: item.isActive });
        res.json({ item, message: `Subscription plan ${item.isActive ? 'activated' : 'deactivated'}` });
    }
    catch (error) {
        console.error('adminToggleSubscriptionPlan error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ── Profile Update Approvals ── */
async function adminGetProfileUpdateRequests(req, res) {
    try {
        const { status = 'pending' } = req.query;
        const requests = await ProfileUpdateRequest_1.default.find({ status })
            .populate('student_id', 'username email full_name')
            .sort({ createdAt: -1 })
            .lean();
        const studentIds = requests
            .map((request) => String(request.student_id && typeof request.student_id === 'object' ? request.student_id._id : request.student_id || ''))
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_1.default.Types.ObjectId(id));
        const profiles = studentIds.length > 0
            ? await StudentProfile_1.default.find({ user_id: { $in: studentIds } }).lean()
            : [];
        const profileMap = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
        const items = requests.map((request) => {
            const studentId = String(request.student_id && typeof request.student_id === 'object' ? request.student_id._id : request.student_id || '');
            const profile = profileMap.get(studentId);
            const requestedChanges = (request.requested_changes || {});
            const currentValues = Object.keys(requestedChanges).reduce((acc, key) => {
                acc[key] = profile?.[key];
                return acc;
            }, {});
            return {
                ...request,
                currentValues,
            };
        });
        res.json({ items });
    }
    catch (error) {
        console.error('adminGetProfileUpdateRequests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminApproveProfileUpdateRequest(req, res) {
    try {
        const request = await ProfileUpdateRequest_1.default.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            res.status(404).json({ message: 'Pending request not found' });
            return;
        }
        const profile = await StudentProfile_1.default.findOne({ user_id: request.student_id });
        if (!profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        // Apply changes
        const changes = request.requested_changes;
        for (const [key, value] of Object.entries(changes)) {
            profile[key] = value;
        }
        // Sync and recompute
        if (changes.phone_number && !changes.phone)
            profile.phone = changes.phone_number;
        if (changes.phone && !changes.phone_number)
            profile.phone_number = changes.phone;
        profile.profile_completion_percentage = computeProfileCompletion(profile.toObject());
        await profile.save();
        request.status = 'approved';
        request.reviewed_at = new Date();
        request.reviewed_by = req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
            ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
            : undefined;
        await request.save();
        await createAuditLog(req, 'profile_update_approved', String(request.student_id), 'student', { request_id: request._id });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId: String(request.student_id), source: 'admin_approval' } });
        await (0, adminAlertService_1.createStudentNotification)({
            title: 'Profile update approved',
            message: 'Your profile update request was approved.',
            linkUrl: '/profile',
            category: 'update',
            targetUserIds: [request.student_id],
            createdBy: req.user?._id,
        });
        res.json({ message: 'Profile update approved', profile });
    }
    catch (error) {
        console.error('adminApproveProfileUpdateRequest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminRejectProfileUpdateRequest(req, res) {
    try {
        const { feedback } = req.body;
        const request = await ProfileUpdateRequest_1.default.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            res.status(404).json({ message: 'Pending request not found' });
            return;
        }
        request.status = 'rejected';
        request.admin_feedback = feedback || 'Changes rejected by admin.';
        request.reviewed_at = new Date();
        request.reviewed_by = req.user?._id && mongoose_1.default.Types.ObjectId.isValid(String(req.user._id))
            ? new mongoose_1.default.Types.ObjectId(String(req.user._id))
            : undefined;
        await request.save();
        await createAuditLog(req, 'profile_update_rejected', String(request.student_id), 'student', { request_id: request._id, feedback });
        await (0, adminAlertService_1.createStudentNotification)({
            title: 'Profile update rejected',
            message: String(feedback || 'Your requested changes were rejected by admin.'),
            linkUrl: '/profile',
            category: 'update',
            targetUserIds: [request.student_id],
            createdBy: req.user?._id,
        });
        res.json({ message: 'Profile update rejected' });
    }
    catch (error) {
        console.error('adminRejectProfileUpdateRequest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=adminUserController.js.map