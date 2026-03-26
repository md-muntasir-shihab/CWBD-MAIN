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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const xlsx_1 = __importDefault(require("xlsx"));
const auth_1 = require("../middlewares/auth");
const sensitiveAction_1 = require("../middlewares/sensitiveAction");
const User_1 = __importDefault(require("../models/User"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const StudentGroup_1 = __importDefault(require("../models/StudentGroup"));
const GroupMembership_1 = __importDefault(require("../models/GroupMembership"));
const StudentContactTimeline_1 = __importDefault(require("../models/StudentContactTimeline"));
const NotificationProvider_1 = __importDefault(require("../models/NotificationProvider"));
const NotificationTemplate_1 = __importDefault(require("../models/NotificationTemplate"));
const NotificationJob_1 = __importDefault(require("../models/NotificationJob"));
const NotificationDeliveryLog_1 = __importDefault(require("../models/NotificationDeliveryLog"));
const StudentSettings_1 = require("../models/StudentSettings");
const payment_model_1 = require("../models/payment.model");
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const FinanceTransaction_1 = __importDefault(require("../models/FinanceTransaction"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const ImportExportLog_1 = __importDefault(require("../models/ImportExportLog"));
const cryptoService_1 = require("../services/cryptoService");
const notificationProviderService_1 = require("../services/notificationProviderService");
const notificationOrchestrationService_1 = require("../services/notificationOrchestrationService");
const studentImportExportService_1 = require("../services/studentImportExportService");
const adminStudentUnifiedService_1 = require("../services/adminStudentUnifiedService");
const groupMembershipService = __importStar(require("../services/groupMembershipService"));
const subscriptionLifecycleService_1 = require("../services/subscriptionLifecycleService");
const subscriptionContactCenterService_1 = require("../services/subscriptionContactCenterService");
const studentProfileScoreService_1 = require("../services/studentProfileScoreService");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
// All routes require admin auth
const adminAuth = [auth_1.authenticate, (0, auth_1.requireRole)('superadmin', 'admin', 'moderator')];
const notificationAdminAuth = [auth_1.authenticate, (0, auth_1.requireRole)('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent')];
const requireDestructiveStepUp = (moduleName, actionName) => (0, sensitiveAction_1.requireSensitiveAction)({
    actionKey: 'data.destructive_change',
    moduleName,
    actionName,
});
const requireSensitiveExport = (moduleName, actionName, enforceExportRolePolicy = false) => (0, sensitiveAction_1.requireSensitiveAction)({
    actionKey: 'students.export',
    moduleName,
    actionName,
    enforceExportRolePolicy,
});
// ============================================================================
// STUDENT METRICS (Dashboard overview) — must be before :id wildcard routes
// ============================================================================
router.get('/students-v2/metrics', ...adminAuth, async (_req, res) => {
    try {
        const [totalStudents, activeStudents, suspendedStudents, pendingStudents, activeSubs, expiredSubs, expiringSoon, pendingLegacyPayments, pendingManualPayments, totalPaidLegacyPayments, totalPaidManualPayments, groupCount,] = await Promise.all([
            User_1.default.countDocuments({ role: 'student' }),
            User_1.default.countDocuments({ role: 'student', status: 'active' }),
            User_1.default.countDocuments({ role: 'student', status: 'suspended' }),
            User_1.default.countDocuments({ role: 'student', status: 'pending' }),
            UserSubscription_1.default.countDocuments({ status: 'active' }),
            UserSubscription_1.default.countDocuments({ status: 'expired' }),
            UserSubscription_1.default.countDocuments({
                status: 'active',
                expiresAtUTC: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            }),
            payment_model_1.PaymentModel.countDocuments({ status: 'pending' }),
            ManualPayment_1.default.countDocuments({ status: 'pending' }),
            payment_model_1.PaymentModel.countDocuments({ status: 'paid' }),
            ManualPayment_1.default.countDocuments({ status: 'paid' }),
            StudentGroup_1.default.countDocuments({ isActive: true }),
        ]);
        // Profile completion stats
        const profileStats = await StudentProfile_1.default.aggregate([
            { $group: {
                    _id: null,
                    avgCompletion: { $avg: '$profile_completion_percentage' },
                    lowProfile: { $sum: { $cond: [{ $lt: ['$profile_completion_percentage', 50] }, 1, 0] } },
                } },
        ]);
        const avgProfileCompletion = Math.round(profileStats[0]?.avgCompletion ?? 0);
        const lowProfileCount = profileStats[0]?.lowProfile ?? 0;
        const pendingPayments = pendingLegacyPayments + pendingManualPayments;
        const totalPaidPayments = totalPaidLegacyPayments + totalPaidManualPayments;
        // Recent registrations (last 7 days)
        const recentRegistrations = await User_1.default.countDocuments({
            role: 'student',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        });
        res.json({
            totalStudents, activeStudents, suspendedStudents, pendingStudents,
            activeSubs, expiredSubs, expiringSoon,
            pendingPayments, totalPaidPayments,
            groupCount,
            avgProfileCompletion, lowProfileCount,
            recentRegistrations,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch metrics', error: String(err) });
    }
});
// ============================================================================
// UNIFIED STUDENT DETAIL (Student Management OS — canonical read model)
// ============================================================================
router.get('/students-v2/:id/unified', ...adminAuth, async (req, res) => {
    try {
        const payload = await (0, adminStudentUnifiedService_1.getUnifiedStudentDetail)(String(req.params.id));
        if (!payload)
            return res.status(404).json({ message: 'Student not found' });
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch unified student detail', error: String(err) });
    }
});
// ============================================================================
// STUDENT CREATE (Full admin create flow)
// ============================================================================
router.post('/students-v2/create', ...adminAuth, async (req, res) => {
    try {
        const { full_name, email, phone_number, password, department, ssc_batch, hsc_batch, college_name, guardian_name, guardian_phone, guardian_email, gender, dob, district, present_address, planId, sendCredentials, groupIds, paymentAmount, paymentMethod, recordPayment, paymentStatus, startDate, expiryDate, dueDateUTC, } = req.body;
        if (!full_name || !email || !password) {
            return res.status(400).json({ message: 'full_name, email, and password are required' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        // Check for duplicates
        const existing = await User_1.default.findOne({
            $or: [
                { email: String(email).toLowerCase() },
                ...(phone_number ? [{ phone_number: String(phone_number) }] : []),
            ],
        });
        if (existing) {
            return res.status(409).json({ message: 'A user with this email or phone already exists' });
        }
        if (planId && !mongoose_1.default.Types.ObjectId.isValid(String(planId))) {
            return res.status(400).json({ message: 'Invalid planId' });
        }
        if (planId) {
            const planExists = await SubscriptionPlan_1.default.exists({ _id: String(planId) });
            if (!planExists) {
                return res.status(404).json({ message: 'Plan not found' });
            }
        }
        const adminUser = req['user'];
        const hashed = await bcryptjs_1.default.hash(String(password), 12);
        const username = String(email).split('@')[0] + '-' + Date.now().toString(36);
        const user = await User_1.default.create({
            full_name: String(full_name).trim(),
            username,
            email: String(email).toLowerCase().trim(),
            password: hashed,
            role: 'student',
            status: 'active',
            phone_number: phone_number ? String(phone_number).trim() : undefined,
            mustChangePassword: true,
            passwordResetRequired: true,
            passwordSetByAdminId: adminUser?.['_id'],
        });
        // Create profile
        const profileData = {
            user_id: user._id,
            full_name: String(full_name).trim(),
            phone_number: phone_number ? String(phone_number).trim() : undefined,
            email: String(email).toLowerCase().trim(),
        };
        if (department)
            profileData['department'] = department;
        if (ssc_batch)
            profileData['ssc_batch'] = ssc_batch;
        if (hsc_batch)
            profileData['hsc_batch'] = hsc_batch;
        if (college_name)
            profileData['college_name'] = college_name;
        if (guardian_name)
            profileData['guardian_name'] = guardian_name;
        if (guardian_phone)
            profileData['guardian_phone'] = guardian_phone;
        if (guardian_email)
            profileData['guardian_email'] = guardian_email;
        if (gender)
            profileData['gender'] = gender;
        if (dob)
            profileData['dob'] = new Date(dob);
        if (district)
            profileData['district'] = district;
        if (present_address)
            profileData['present_address'] = present_address;
        const profile = await StudentProfile_1.default.create(profileData);
        const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile.toObject(), user.toObject());
        profile.profile_completion_percentage = scoreResult.score;
        await profile.save();
        const normalizedGroupIds = Array.isArray(groupIds)
            ? groupIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(String(id))).map((id) => String(id))
            : [];
        if (normalizedGroupIds.length > 0) {
            await groupMembershipService.setStudentGroups(user._id, normalizedGroupIds, adminUser?.['_id'], 'Assigned during student creation');
        }
        // Create CRM timeline entry
        await StudentContactTimeline_1.default.create({
            studentId: user._id,
            type: 'account_event',
            content: `Student account created by admin${adminUser?.['full_name'] ? ' (' + adminUser['full_name'] + ')' : ''}`,
            sourceType: 'system',
            createdByAdminId: adminUser?.['_id'],
        });
        // Assign plan if requested
        let subscription = null;
        let payment = null;
        let invoice = null;
        if (planId && mongoose_1.default.Types.ObjectId.isValid(planId)) {
            const assignment = await (0, subscriptionLifecycleService_1.assignSubscriptionLifecycle)({
                userId: String(user._id),
                planId: String(planId),
                actorId: String(adminUser?.['_id'] || ''),
                startAtUTC: startDate,
                expiresAtUTC: expiryDate,
                paymentAmount,
                paymentMethod,
                paymentStatus,
                recordPayment,
                dueDateUTC,
                notes: 'Assigned during student creation',
                paymentNotes: 'Student creation subscription payment',
            });
            subscription = assignment.subscription;
            payment = assignment.payment;
            invoice = assignment.invoice;
            await StudentContactTimeline_1.default.create({
                studentId: user._id,
                type: 'subscription_event',
                content: `Subscription plan "${String(assignment.plan['name'] || '')}" assigned during account creation (${assignment.subscription.status})`,
                sourceType: 'system',
                createdByAdminId: adminUser?.['_id'],
            });
        }
        // Send credentials if requested
        if (sendCredentials) {
            try {
                await (0, notificationProviderService_1.sendNotificationToStudent)(user._id, 'ACCOUNT_CREATED', 'sms', {
                    full_name: String(full_name),
                    username,
                    email: String(email),
                });
            }
            catch { /* Best-effort, don't fail the create */ }
        }
        const safeUser = await User_1.default.findById(user._id).select('-password -twoFactorSecret').lean();
        res.status(201).json({
            message: 'Student created successfully',
            student: safeUser,
            user: safeUser,
            profile,
            subscription,
            payment,
            invoice,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create student', error: String(err) });
    }
});
// ============================================================================
// STUDENTS V2
// ============================================================================
router.get('/students-v2', ...adminAuth, async (req, res) => {
    try {
        const { q, status, group, page = '1', limit = '20', profileScoreMin, subscriptionStatus, expiringDays, department, sscBatch, hscBatch, guardianStatus, hasPaymentDue, sortBy, sortOrder, } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const userQuery = { role: 'student' };
        if (status)
            userQuery['status'] = status;
        if (q) {
            const re = new RegExp(String(q), 'i');
            userQuery['$or'] = [{ full_name: re }, { email: re }, { username: re }, { phone_number: re }];
        }
        if (group && mongoose_1.default.Types.ObjectId.isValid(group)) {
            const groupId = new mongoose_1.default.Types.ObjectId(group);
            const memberships = await GroupMembership_1.default.find({ groupId }).select('studentId').lean();
            const memberIds = memberships.map((m) => m.studentId);
            userQuery['_id'] = { $in: memberIds };
        }
        if (subscriptionStatus || expiringDays) {
            const subQuery = {};
            if (subscriptionStatus)
                subQuery['status'] = subscriptionStatus;
            if (expiringDays) {
                const days = parseInt(expiringDays, 10);
                if (!isNaN(days)) {
                    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                    subQuery['expiresAtUTC'] = { $lte: cutoff };
                    subQuery['status'] = 'active';
                }
            }
            const subs = await UserSubscription_1.default.find(subQuery).select('userId').lean();
            const subUserIds = subs.map((s) => s.userId);
            const existingId = userQuery['_id'];
            userQuery['_id'] = existingId
                ? { $in: existingId.$in.filter((id) => subUserIds.some((sid) => String(sid) === String(id))) }
                : { $in: subUserIds };
        }
        // Profile-based pre-filtering (department, batch, guardian)
        if (department || sscBatch || hscBatch || guardianStatus) {
            const profileQuery = {};
            if (department)
                profileQuery['department'] = department;
            if (sscBatch)
                profileQuery['ssc_batch'] = sscBatch;
            if (hscBatch)
                profileQuery['hsc_batch'] = hscBatch;
            if (guardianStatus === 'verified')
                profileQuery['guardianPhoneVerificationStatus'] = 'verified';
            if (guardianStatus === 'unverified')
                profileQuery['guardianPhoneVerificationStatus'] = { $ne: 'verified' };
            if (guardianStatus === 'has_guardian')
                profileQuery['guardian_phone'] = { $exists: true, $ne: '' };
            if (guardianStatus === 'no_guardian')
                profileQuery['guardian_phone'] = { $in: [null, '', undefined] };
            const filteredProfiles = await StudentProfile_1.default.find(profileQuery).select('user_id').lean();
            const profileUserIds = filteredProfiles.map((p) => p.user_id);
            const existingId2 = userQuery['_id'];
            userQuery['_id'] = existingId2
                ? { $in: existingId2.$in.filter((id) => profileUserIds.some((pid) => String(pid) === String(id))) }
                : { $in: profileUserIds };
        }
        // Payment due filter
        if (hasPaymentDue === 'true') {
            const dueStudents = await StudentDueLedger_1.default.find({ netDue: { $gt: 0 } }).select('studentId').lean();
            const dueIds = dueStudents.map((d) => d.studentId);
            const existingId3 = userQuery['_id'];
            userQuery['_id'] = existingId3
                ? { $in: existingId3.$in.filter((id) => dueIds.some((did) => String(did) === String(id))) }
                : { $in: dueIds };
        }
        // Determine sort
        const sortField = sortBy === 'name' ? 'full_name'
            : sortBy === 'status' ? 'status'
                : sortBy === 'lastLogin' ? 'lastLoginAtUTC'
                    : 'createdAt';
        const sortDir = sortOrder === 'asc' ? 1 : -1;
        const [users, total] = await Promise.all([
            User_1.default.find(userQuery)
                .select('-password -twoFactorSecret')
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            User_1.default.countDocuments(userQuery),
        ]);
        const userIds = users.map((u) => u._id);
        const [profiles, subscriptions] = await Promise.all([
            StudentProfile_1.default.find({ user_id: { $in: userIds } }).lean(),
            UserSubscription_1.default.find({ userId: { $in: userIds }, status: 'active' })
                .populate('planId', 'name code')
                .lean(),
        ]);
        const profileMap = new Map(profiles.map((p) => [String(p.user_id), p]));
        const subMap = new Map(subscriptions.map((s) => [String(s.userId), s]));
        const filterScore = profileScoreMin ? parseInt(profileScoreMin, 10) : undefined;
        const data = users
            .map((u) => ({
            ...u,
            profile: profileMap.get(String(u._id)) ?? null,
            subscription: subMap.get(String(u._id)) ?? null,
        }))
            .filter((row) => {
            if (filterScore === undefined)
                return true;
            const score = row.profile?.['profile_completion_percentage'] ?? 0;
            return score >= filterScore;
        });
        res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch students', error: String(err) });
    }
});
router.get('/students-v2/template.xlsx', ...adminAuth, async (_req, res) => {
    try {
        const buffer = await (0, studentImportExportService_1.generateTemplateXlsx)();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="students_import_template.xlsx"');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/students-v2/export', ...adminAuth, requireSensitiveExport('students_groups', 'students_v2_export', true), (0, sensitiveAction_1.trackSensitiveExport)({ moduleName: 'students_groups', actionName: 'students_v2_export' }), async (req, res) => {
    try {
        const format = String(req.query['format'] ?? req.query['type'] ?? 'xlsx').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
        const filters = {};
        const passthroughKeys = [
            'q',
            'status',
            'group',
            'profileScoreMin',
            'subscriptionStatus',
            'expiringDays',
            'department',
            'sscBatch',
            'hscBatch',
            'guardianStatus',
            'hasPaymentDue',
            'sortBy',
            'sortOrder',
        ];
        passthroughKeys.forEach((key) => {
            if (req.query[key] !== undefined)
                filters[key] = req.query[key];
        });
        const buffer = await (0, studentImportExportService_1.exportStudents)(filters, format === 'csv' ? 'csv' : 'xlsx');
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
        }
        else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="students_export.xlsx"');
        }
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/import/preview', ...adminAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'file is required' });
        const { rows, columns } = await (0, studentImportExportService_1.parseFileBuffer)(req.file.buffer, req.file.mimetype);
        const preview = await (0, studentImportExportService_1.generatePreview)(rows, columns);
        res.json({ ...preview, allRows: rows });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/import/commit', ...adminAuth, async (req, res) => {
    try {
        const { mode, dedupeField, mapping, rows } = req.body;
        if (!mode || !dedupeField || !mapping || !Array.isArray(rows)) {
            return res.status(400).json({ message: 'mode, dedupeField, mapping, rows required' });
        }
        const adminId = String(req['user'] && req['user']['_id'] || '');
        const result = await (0, studentImportExportService_1.commitImport)({ mode, dedupeField, mapping, rows }, adminId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/bulk-delete', ...adminAuth, requireDestructiveStepUp('students_groups', 'students_v2_bulk_delete'), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'ids array required' });
        }
        const validIds = ids.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        await Promise.all([
            User_1.default.deleteMany({ _id: { $in: validIds } }),
            StudentProfile_1.default.deleteMany({ user_id: { $in: validIds } }),
        ]);
        res.json({ message: `Deleted ${validIds.length} students`, deleted: validIds.length });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/bulk-update', ...adminAuth, async (req, res) => {
    try {
        const { ids, update } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'ids array required' });
        }
        const validIds = ids.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        const allowedUserFields = {};
        const allowedProfileFields = {};
        if (update['status'] && ['active', 'suspended', 'blocked', 'pending'].includes(String(update['status']))) {
            allowedUserFields['status'] = update['status'];
        }
        if (update['department'] !== undefined)
            allowedProfileFields['department'] = String(update['department'] || '').trim();
        if (update['ssc_batch'] !== undefined)
            allowedProfileFields['ssc_batch'] = String(update['ssc_batch'] || '').trim();
        if (update['hsc_batch'] !== undefined)
            allowedProfileFields['hsc_batch'] = String(update['hsc_batch'] || '').trim();
        if (Object.keys(allowedUserFields).length > 0) {
            await User_1.default.updateMany({ _id: { $in: validIds } }, { $set: allowedUserFields });
        }
        if (Object.keys(allowedProfileFields).length > 0) {
            await StudentProfile_1.default.updateMany({ user_id: { $in: validIds } }, { $set: allowedProfileFields });
        }
        res.json({ message: `Updated ${validIds.length} students`, updated: validIds.length });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// WEAK TOPICS ADMIN REPORT — must be before :id wildcard
// ============================================================================
router.get('/students-v2/weak-topics-report', ...adminAuth, async (_req, res) => {
    try {
        const results = await ExamResult_1.default.aggregate([
            { $unwind: '$answers' },
            { $group: {
                    _id: '$answers.question',
                    totalAttempts: { $sum: 1 },
                    correctCount: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } },
                } },
            { $match: { totalAttempts: { $gte: 5 } } },
            { $addFields: { accuracy: { $multiply: [{ $divide: ['$correctCount', '$totalAttempts'] }, 100] } } },
            { $match: { accuracy: { $lte: 50 } } },
            { $sort: { accuracy: 1 } },
            { $limit: 100 },
        ]);
        res.json({ data: results });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ── Global CRM Timeline — must be before :id wildcard ───────
router.get('/students-v2/crm-timeline', ...adminAuth, async (req, res) => {
    try {
        const { type, sourceType, limit: limitStr } = req.query;
        const filter = {};
        if (type)
            filter['type'] = type;
        if (sourceType)
            filter['sourceType'] = sourceType;
        const lim = Math.min(Number(limitStr) || 100, 500);
        const entries = await StudentContactTimeline_1.default.find(filter)
            .sort({ createdAt: -1 })
            .limit(lim)
            .populate('studentId', 'full_name email')
            .populate('createdByAdminId', 'full_name')
            .lean();
        // Reshape so studentId → student for frontend consumption
        const data = entries.map((e) => ({
            ...e,
            student: e['studentId'],
        }));
        res.json({ entries: data });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/students-v2/:id', ...adminAuth, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('-password -twoFactorSecret').lean();
        if (!user)
            return res.status(404).json({ message: 'Student not found' });
        const [profile, subscription, subscriptionHistory] = await Promise.all([
            StudentProfile_1.default.findOne({ user_id: user._id }).lean(),
            UserSubscription_1.default.findOne({ userId: user._id, status: 'active' })
                .populate('planId', 'name code durationDays')
                .lean(),
            UserSubscription_1.default.find({ userId: user._id })
                .populate('planId', 'name code')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);
        res.json({ ...user, profile, subscription, subscriptionHistory });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.put('/students-v2/:id', ...adminAuth, async (req, res) => {
    try {
        const { full_name, email, phone_number, status, planId, planCode, startDate, expiryDate, paymentAmount, paymentMethod, paymentStatus, recordPayment, dueDateUTC, subscriptionNotes, ...profileFields } = req.body;
        const userUpdate = {};
        if (full_name)
            userUpdate['full_name'] = full_name;
        if (email)
            userUpdate['email'] = email;
        if (phone_number)
            userUpdate['phone_number'] = phone_number;
        if (status && ['active', 'suspended', 'blocked', 'pending'].includes(status)) {
            userUpdate['status'] = status;
        }
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { $set: userUpdate }, { new: true })
            .select('-password -twoFactorSecret').lean();
        if (!user)
            return res.status(404).json({ message: 'Student not found' });
        const profileUpdate = {};
        const profileKeys = [
            'guardian_phone', 'department', 'ssc_batch', 'hsc_batch', 'college_name',
            'college_address', 'present_address', 'district', 'gender', 'dob',
            'guardian_name', 'roll_number', 'registration_id',
        ];
        for (const key of profileKeys) {
            if (profileFields[key] !== undefined)
                profileUpdate[key] = profileFields[key];
        }
        if (full_name)
            profileUpdate['full_name'] = full_name;
        if (phone_number)
            profileUpdate['phone_number'] = phone_number;
        const profile = await StudentProfile_1.default.findOneAndUpdate({ user_id: req.params.id }, { $set: profileUpdate }, { upsert: true, new: true }).lean();
        let subscription = null;
        if (planId || planCode) {
            const adminUser = req['user'];
            const assignment = await (0, subscriptionLifecycleService_1.assignSubscriptionLifecycle)({
                userId: String(req.params.id),
                planId: planId ? String(planId) : undefined,
                planCode: planCode ? String(planCode) : undefined,
                actorId: String(adminUser?.['_id'] || ''),
                startAtUTC: startDate,
                expiresAtUTC: expiryDate,
                paymentAmount,
                paymentMethod,
                paymentStatus,
                recordPayment,
                dueDateUTC,
                notes: subscriptionNotes || 'Assigned via student update',
            });
            subscription = assignment.subscription;
        }
        res.json({ ...user, profile, subscription });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/:id/suspend', ...adminAuth, async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { $set: { status: 'suspended' } }, { new: true }).select('-password').lean();
        if (!user)
            return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Student suspended', user });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/:id/activate', ...adminAuth, async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { $set: { status: 'active' } }, { new: true }).select('-password').lean();
        if (!user)
            return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Student activated', user });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/students-v2/:id/reset-password', ...adminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
        }
        const hashed = await bcryptjs_1.default.hash(String(newPassword), 12);
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { $set: { password: hashed, mustChangePassword: true, passwordResetRequired: true } }, { new: true }).select('-password').lean();
        if (!user)
            return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Password reset successfully' });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// STUDENT GROUPS
// ============================================================================
router.get('/student-groups', ...adminAuth, async (req, res) => {
    try {
        const { q, isActive, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const query = {};
        if (isActive !== undefined)
            query['isActive'] = isActive === 'true';
        if (q)
            query['name'] = new RegExp(String(q), 'i');
        const [groups, total] = await Promise.all([
            StudentGroup_1.default.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
            StudentGroup_1.default.countDocuments(query),
        ]);
        res.json({ data: groups, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/student-groups/export', ...adminAuth, requireSensitiveExport('students_groups', 'student_groups_legacy_export', true), (0, sensitiveAction_1.trackSensitiveExport)({ moduleName: 'students_groups', actionName: 'student_groups_legacy_export' }), async (req, res) => {
    try {
        const { q, isActive } = req.query;
        const format = String(req.query['format'] ?? req.query['type'] ?? 'xlsx').trim().toLowerCase() === 'csv' ? 'csv' : 'xlsx';
        const query = {};
        if (isActive !== undefined)
            query['isActive'] = isActive === 'true';
        if (q) {
            const matcher = new RegExp(String(q), 'i');
            query['$or'] = [{ name: matcher }, { slug: matcher }, { batchTag: matcher }, { description: matcher }];
        }
        const [groups, counts] = await Promise.all([
            StudentGroup_1.default.find(query).sort({ createdAt: -1 }).lean(),
            GroupMembership_1.default.aggregate([
                { $match: { membershipStatus: 'active' } },
                { $group: { _id: '$groupId', studentCount: { $sum: 1 } } },
            ]),
        ]);
        const countMap = new Map(counts.map((item) => [String(item._id), Number(item.studentCount || 0)]));
        const rows = groups.map((group) => ({
            name: group.name,
            slug: group.slug,
            batchTag: group.batchTag || '',
            description: group.description || '',
            type: group.type || 'manual',
            isActive: Boolean(group.isActive),
            isFeatured: Boolean(group.isFeatured),
            department: String(group.department || ''),
            batch: String(group.batch || ''),
            memberCount: countMap.get(String(group._id)) || Number(group.studentCount || 0),
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
        }));
        if (format === 'csv') {
            const sheet = xlsx_1.default.utils.json_to_sheet(rows);
            const csv = xlsx_1.default.utils.sheet_to_csv(sheet);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="student_groups_export.csv"');
            res.send(csv);
            return;
        }
        const workbook = xlsx_1.default.utils.book_new();
        const worksheet = xlsx_1.default.utils.json_to_sheet(rows);
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, 'Student Groups');
        const buffer = xlsx_1.default.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="student_groups_export.xlsx"');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/student-groups/bulk-update', ...adminAuth, async (req, res) => {
    try {
        const { ids, update } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'ids array required' });
        }
        if (!update || typeof update !== 'object') {
            return res.status(400).json({ message: 'update payload required' });
        }
        const validIds = ids.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        const allowed = {};
        const directFields = ['description', 'department', 'batch', 'visibilityNote', 'color', 'icon'];
        directFields.forEach((field) => {
            if (update[field] !== undefined)
                allowed[field] = String(update[field] || '').trim();
        });
        if (update['isActive'] !== undefined)
            allowed['isActive'] = Boolean(update['isActive']);
        if (update['isFeatured'] !== undefined)
            allowed['isFeatured'] = Boolean(update['isFeatured']);
        if (update['sortOrder'] !== undefined)
            allowed['sortOrder'] = Number(update['sortOrder']) || 0;
        if (update['cardStyleVariant'] !== undefined && ['solid', 'gradient', 'outline', 'minimal'].includes(String(update['cardStyleVariant']))) {
            allowed['cardStyleVariant'] = update['cardStyleVariant'];
        }
        if (update['defaultExamVisibility'] !== undefined && ['all_students', 'group_only', 'hidden'].includes(String(update['defaultExamVisibility']))) {
            allowed['defaultExamVisibility'] = update['defaultExamVisibility'];
        }
        if (update['defaultCommunicationAudience'] !== undefined) {
            allowed['defaultCommunicationAudience'] = Boolean(update['defaultCommunicationAudience']);
        }
        if (Object.keys(allowed).length === 0) {
            return res.status(400).json({ message: 'No safe bulk fields provided' });
        }
        const result = await StudentGroup_1.default.updateMany({ _id: { $in: validIds } }, { $set: allowed });
        res.json({ message: `Updated ${Number(result.modifiedCount || 0)} groups`, updated: Number(result.modifiedCount || 0) });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/student-groups/bulk-delete', ...adminAuth, requireDestructiveStepUp('students_groups', 'student_groups_bulk_delete'), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'ids array required' });
        }
        const validIds = ids.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        const deletedIds = [];
        const skipped = [];
        for (const id of validIds) {
            const safety = await groupMembershipService.canDeleteGroup(id);
            if (!safety.safe) {
                skipped.push({ id, blockers: safety.blockers });
                continue;
            }
            const objectId = new mongoose_1.default.Types.ObjectId(id);
            const removed = await StudentGroup_1.default.findByIdAndDelete(objectId).lean();
            if (!removed)
                continue;
            deletedIds.push(id);
            await Promise.all([
                GroupMembership_1.default.updateMany({ groupId: objectId, membershipStatus: 'active' }, { $set: { membershipStatus: 'archived', removedAtUTC: new Date(), note: 'Bulk deleted group' } }),
                StudentProfile_1.default.updateMany({ groupIds: objectId }, { $pull: { groupIds: objectId } }),
            ]);
        }
        res.json({
            message: `Deleted ${deletedIds.length} groups`,
            deleted: deletedIds.length,
            deletedIds,
            skipped,
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/student-groups', ...adminAuth, async (req, res) => {
    try {
        const { name, description, batchTag, type, rules, isActive, shortCode, color, icon, cardStyleVariant, sortOrder, isFeatured, batch, department, visibilityNote, defaultExamVisibility, defaultCommunicationAudience } = req.body;
        if (!name)
            return res.status(400).json({ message: 'name is required' });
        const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
        const adminUser = req['user'];
        const group = await StudentGroup_1.default.create({
            name, slug, description, batchTag,
            type: type || 'manual',
            rules: rules || {},
            isActive: isActive !== false,
            createdByAdminId: adminUser?.['_id'],
            shortCode: shortCode || undefined,
            color: color || '#6366f1',
            icon: icon || 'Users',
            cardStyleVariant: cardStyleVariant || 'solid',
            sortOrder: Number(sortOrder) || 0,
            isFeatured: isFeatured === true,
            batch: batch || undefined,
            department: department || undefined,
            visibilityNote: visibilityNote || '',
            defaultExamVisibility: defaultExamVisibility || 'all_students',
            defaultCommunicationAudience: defaultCommunicationAudience === true,
        });
        res.status(201).json(group);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/student-groups/:id', ...adminAuth, async (req, res) => {
    try {
        const group = await StudentGroup_1.default.findById(req.params.id).lean();
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        const memberCount = await groupMembershipService.getGroupMemberCount(group._id, 'active');
        res.json({ ...group, memberCount });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.put('/student-groups/:id', ...adminAuth, async (req, res) => {
    try {
        const { name, description, batchTag, type, rules, isActive, shortCode, color, icon, cardStyleVariant, sortOrder, isFeatured, batch, department, visibilityNote, defaultExamVisibility, defaultCommunicationAudience } = req.body;
        const update = {};
        if (name !== undefined)
            update['name'] = name;
        if (description !== undefined)
            update['description'] = description;
        if (batchTag !== undefined)
            update['batchTag'] = batchTag;
        if (type !== undefined)
            update['type'] = type;
        if (rules !== undefined)
            update['rules'] = rules;
        if (isActive !== undefined)
            update['isActive'] = isActive;
        if (shortCode !== undefined)
            update['shortCode'] = shortCode;
        if (color !== undefined)
            update['color'] = color;
        if (icon !== undefined)
            update['icon'] = icon;
        if (cardStyleVariant !== undefined)
            update['cardStyleVariant'] = cardStyleVariant;
        if (sortOrder !== undefined)
            update['sortOrder'] = Number(sortOrder) || 0;
        if (isFeatured !== undefined)
            update['isFeatured'] = isFeatured === true;
        if (batch !== undefined)
            update['batch'] = batch;
        if (department !== undefined)
            update['department'] = department;
        if (visibilityNote !== undefined)
            update['visibilityNote'] = visibilityNote;
        if (defaultExamVisibility !== undefined)
            update['defaultExamVisibility'] = defaultExamVisibility;
        if (defaultCommunicationAudience !== undefined)
            update['defaultCommunicationAudience'] = defaultCommunicationAudience === true;
        const group = await StudentGroup_1.default.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        res.json(group);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.delete('/student-groups/:id', ...adminAuth, requireDestructiveStepUp('students_groups', 'student_group_delete'), async (req, res) => {
    try {
        // Safety check before deletion
        const safety = await groupMembershipService.canDeleteGroup(String(req.params.id));
        if (!safety.safe) {
            return res.status(409).json({ message: 'Cannot delete group', blockers: safety.blockers });
        }
        const group = await StudentGroup_1.default.findByIdAndDelete(req.params.id).lean();
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        // Archive all memberships instead of hard delete
        await GroupMembership_1.default.updateMany({ groupId: req.params.id, membershipStatus: 'active' }, { $set: { membershipStatus: 'archived', removedAtUTC: new Date(), note: 'Group deleted' } });
        // Remove group from all student profiles
        await StudentProfile_1.default.updateMany({ groupIds: req.params.id }, { $pull: { groupIds: new mongoose_1.default.Types.ObjectId(String(req.params.id)) } });
        res.json({ message: 'Group deleted' });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/student-groups/:id/members/add', ...adminAuth, async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'studentIds array required' });
        }
        const normalizedIds = [...new Set(studentIds
                .map(id => String(id || '').trim())
                .filter(Boolean))];
        const objectIds = normalizedIds.filter(id => mongoose_1.default.Types.ObjectId.isValid(id));
        const unresolvedTokens = normalizedIds.filter(id => !mongoose_1.default.Types.ObjectId.isValid(id));
        const resolvedIdSet = new Set(objectIds);
        if (unresolvedTokens.length > 0) {
            const lowerTokens = unresolvedTokens.map(token => token.toLowerCase());
            const [usersByDirectFields, profilesByLegacyIds] = await Promise.all([
                User_1.default.find({
                    role: 'student',
                    $or: [
                        { username: { $in: lowerTokens } },
                        { email: { $in: lowerTokens } },
                        { phone_number: { $in: unresolvedTokens } },
                    ],
                }).select('_id').lean(),
                StudentProfile_1.default.find({
                    $or: [
                        { user_unique_id: { $in: unresolvedTokens } },
                        { phone_number: { $in: unresolvedTokens } },
                        { email: { $in: lowerTokens } },
                    ],
                }).select('user_id').lean(),
            ]);
            usersByDirectFields.forEach(user => resolvedIdSet.add(String(user._id)));
            profilesByLegacyIds.forEach(profile => resolvedIdSet.add(String(profile.user_id)));
        }
        const resolvedIds = [...resolvedIdSet];
        const adminUser = req['user'];
        const adminId = adminUser?.['_id'];
        const result = await groupMembershipService.bulkAddMembers(String(req.params.id), resolvedIds, adminId, 'Added via group member management');
        res.json({
            message: `Added ${result.added} members`,
            added: result.added,
            skipped: result.skipped,
            requested: normalizedIds.length,
            resolved: resolvedIds.length,
            unresolved: Math.max(0, normalizedIds.length - resolvedIds.length),
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/student-groups/:id/members/remove', ...adminAuth, async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'studentIds array required' });
        }
        const adminUser = req['user'];
        const adminId = adminUser?.['_id'];
        const result = await groupMembershipService.bulkRemoveMembers(String(req.params.id), studentIds.filter(id => mongoose_1.default.Types.ObjectId.isValid(id)), adminId, 'Removed via group member management');
        res.json({ message: `Removed ${result.removed} members`, removed: result.removed });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/student-groups/:id/members/export', ...adminAuth, requireSensitiveExport('students_groups', 'student_group_members_export', true), (0, sensitiveAction_1.trackSensitiveExport)({ moduleName: 'students_groups', actionName: 'student_group_members_export', targetType: 'student_group', targetParam: 'id' }), async (req, res) => {
    try {
        const format = String(req.query['format'] ?? req.query['type'] ?? 'csv').trim().toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
        const groupId = new mongoose_1.default.Types.ObjectId(String(req.params.id));
        const memberships = await GroupMembership_1.default.find({ groupId, membershipStatus: 'active' })
            .select('studentId joinedAtUTC note')
            .lean();
        const memberIds = memberships.map((m) => m.studentId);
        const [users, profiles] = await Promise.all([
            User_1.default.find({ _id: { $in: memberIds } }).select('full_name email phone_number status createdAt').lean(),
            StudentProfile_1.default.find({ user_id: { $in: memberIds } })
                .select('user_id full_name email phone_number department ssc_batch hsc_batch guardian_name guardian_phone roll_number')
                .lean(),
        ]);
        const profileMap = new Map(profiles.map(p => [p.user_id.toString(), p]));
        const membershipMap = new Map(memberships.map(m => [m.studentId.toString(), m]));
        const columns = ['Full Name', 'Email', 'Phone', 'Department', 'Batch', 'Roll', 'Guardian', 'Guardian Phone', 'Status', 'Joined At', 'Note'];
        const rows = users.map(u => {
            const prof = profileMap.get(u._id.toString()) ?? {};
            const mem = membershipMap.get(u._id.toString());
            return [
                prof.full_name ?? u.full_name ?? '',
                prof.email ?? u.email ?? '',
                prof.phone_number ?? u.phone_number ?? '',
                prof.department ?? '',
                prof.hsc_batch ?? '',
                prof.roll_number ?? '',
                prof.guardian_name ?? '',
                prof.guardian_phone ?? '',
                u.status ?? '',
                mem?.joinedAtUTC ? new Date(mem.joinedAtUTC).toISOString() : '',
                mem?.note ?? '',
            ].map(v => String(v ?? ''));
        });
        if (format === 'xlsx') {
            const ExcelJS = await Promise.resolve().then(() => __importStar(require('exceljs')));
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Members');
            ws.addRow(columns).eachCell(cell => { cell.font = { bold: true }; });
            rows.forEach(r => ws.addRow(r));
            columns.forEach((_, i) => { const col = ws.getColumn(i + 1); col.width = 18; });
            const buf = await wb.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="group_${req.params.id}_members.xlsx"`);
            res.send(Buffer.from(buf));
        }
        else {
            const escCsv = (v) => `"${v.replace(/"/g, '""')}"`;
            const csv = [columns.join(','), ...rows.map(r => r.map(escCsv).join(','))].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="group_${req.params.id}_members.csv"`);
            res.send(csv);
        }
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Membership import template XLSX download
router.get('/student-groups/members/template', ...adminAuth, async (_req, res) => {
    try {
        const ExcelJS = await Promise.resolve().then(() => __importStar(require('exceljs')));
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Import Template');
        const headerRow = ws.addRow(['Email', 'Phone Number', 'Student ID (optional)']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        });
        ws.addRow(['student@example.com', '01700000000', '']);
        ws.addRow(['another@example.com', '01800000000', '']);
        ws.getColumn(1).width = 30;
        ws.getColumn(2).width = 20;
        ws.getColumn(3).width = 28;
        const buf = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="group_members_import_template.xlsx"');
        res.send(Buffer.from(buf));
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Membership import preview — upload file, match students by email/phone/ID
router.post('/student-groups/:id/members/import/preview', ...adminAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'file is required' });
        const groupId = new mongoose_1.default.Types.ObjectId(req.params.id);
        const { rows: rawRows } = await (0, studentImportExportService_1.parseFileBuffer)(req.file.buffer, req.file.mimetype);
        // Resolve column mapping (flexible header aliasing)
        const emailAliases = ['email', 'e-mail', 'email address', 'student email', 'ইমেইল'];
        const phoneAliases = ['phone', 'phone number', 'phone_number', 'mobile', 'cell', 'ফোন'];
        const idAliases = ['student id', 'studentid', 'student_id', 'id', '_id', 'user id', 'userid'];
        const findCol = (aliases, cols) => {
            for (const a of aliases) {
                const found = cols.find(c => c.toLowerCase().trim() === a);
                if (found)
                    return found;
            }
            return null;
        };
        const cols = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
        const emailCol = findCol(emailAliases, cols);
        const phoneCol = findCol(phoneAliases, cols);
        const idCol = findCol(idAliases, cols);
        if (!emailCol && !phoneCol && !idCol) {
            return res.status(400).json({ message: 'File must contain at least one of: Email, Phone Number, or Student ID columns' });
        }
        // Existing members set
        const existingMemberships = await GroupMembership_1.default.find({ groupId, membershipStatus: 'active' }).select('studentId').lean();
        const existingSet = new Set(existingMemberships.map(m => m.studentId.toString()));
        const matched = [];
        const unmatched = [];
        for (let i = 0; i < rawRows.length; i++) {
            const r = rawRows[i];
            const email = emailCol ? String(r[emailCol] ?? '').trim().toLowerCase() : '';
            const phone = phoneCol ? String(r[phoneCol] ?? '').trim() : '';
            const rawId = idCol ? String(r[idCol] ?? '').trim() : '';
            let user = null;
            // Try ID first, then email, then phone
            if (rawId && mongoose_1.default.Types.ObjectId.isValid(rawId)) {
                user = await User_1.default.findById(rawId).select('_id full_name').lean();
            }
            if (!user && email) {
                user = await User_1.default.findOne({ email, role: 'student' }).select('_id full_name').lean();
            }
            if (!user && phone) {
                user = await User_1.default.findOne({ phone_number: phone, role: 'student' }).select('_id full_name').lean();
            }
            if (user) {
                const sid = String(user._id);
                matched.push({
                    row: i + 2,
                    email: email || undefined,
                    phone: phone || undefined,
                    studentId: sid,
                    fullName: user.full_name || '',
                    status: existingSet.has(sid) ? 'existing' : 'new',
                });
            }
            else {
                unmatched.push({
                    row: i + 2,
                    email: email || undefined,
                    phone: phone || undefined,
                    reason: 'No matching student found',
                });
            }
        }
        const newCount = matched.filter(m => m.status === 'new').length;
        const existingCount = matched.filter(m => m.status === 'existing').length;
        res.json({
            totalRows: rawRows.length,
            matched,
            unmatched,
            summary: { total: rawRows.length, newMembers: newCount, alreadyMembers: existingCount, notFound: unmatched.length },
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Membership import commit — add matched students to group
router.post('/student-groups/:id/members/import/commit', ...adminAuth, async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'studentIds array required' });
        }
        const adminUser = req['user'];
        const adminId = adminUser?.['_id'];
        const validIds = studentIds.filter(id => mongoose_1.default.Types.ObjectId.isValid(id));
        const result = await groupMembershipService.bulkAddMembers(String(req.params.id), validIds, adminId, 'Added via file import');
        res.json({ message: `Imported ${result.added} members`, added: result.added, skipped: result.skipped, errors: result.errors });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Group members list (paginated, with profile data)
router.get('/student-groups/:id/members', ...adminAuth, async (req, res) => {
    try {
        const { page = '1', limit = '50', q } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const groupId = new mongoose_1.default.Types.ObjectId(req.params.id);
        const memberships = await GroupMembership_1.default.find({ groupId, membershipStatus: 'active' })
            .sort({ joinedAtUTC: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .select('studentId joinedAtUTC addedByAdminId note')
            .lean();
        const total = await GroupMembership_1.default.countDocuments({ groupId, membershipStatus: 'active' });
        const studentIds = memberships.map(m => m.studentId);
        let profileQuery = { user_id: { $in: studentIds } };
        if (q) {
            profileQuery = {
                ...profileQuery,
                $or: [
                    { full_name: new RegExp(String(q), 'i') },
                    { email: new RegExp(String(q), 'i') },
                    { phone_number: new RegExp(String(q), 'i') },
                ],
            };
        }
        const profiles = await StudentProfile_1.default.find(profileQuery)
            .select('user_id full_name email phone_number ssc_batch hsc_batch department')
            .lean();
        const users = await User_1.default.find({ _id: { $in: studentIds } })
            .select('_id status subscription')
            .lean();
        const profileMap = new Map(profiles.map(p => [p.user_id.toString(), p]));
        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        const data = memberships.map(m => {
            const sid = m.studentId.toString();
            const prof = profileMap.get(sid);
            const usr = userMap.get(sid);
            return {
                studentId: sid,
                fullName: prof?.full_name || '',
                email: prof?.email || '',
                phone: prof?.phone_number || '',
                batch: prof?.hsc_batch || '',
                department: prof?.department || '',
                status: usr?.status || '',
                subscription: usr?.subscription || null,
                joinedAtUTC: m.joinedAtUTC,
                note: m.note || '',
            };
        });
        res.json({ data, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Group detail metrics
router.get('/student-groups/:id/metrics', ...adminAuth, async (req, res) => {
    try {
        const groupId = new mongoose_1.default.Types.ObjectId(req.params.id);
        const memberships = await GroupMembership_1.default.find({ groupId, membershipStatus: 'active' }).select('studentId').lean();
        const memberIds = memberships.map(m => m.studentId);
        const [users, activeSubCount] = await Promise.all([
            User_1.default.find({ _id: { $in: memberIds } }).select('status subscription').lean(),
            User_1.default.countDocuments({
                _id: { $in: memberIds },
                'subscription.isActive': true,
            }),
        ]);
        const statusCounts = {};
        for (const u of users) {
            const s = u.status || 'unknown';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        }
        res.json({
            totalMembers: memberIds.length,
            activeMembersWithSubscription: activeSubCount,
            membersByStatus: statusCounts,
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Move members between groups
router.post('/student-groups/:id/members/move', ...adminAuth, async (req, res) => {
    try {
        const { studentIds, targetGroupId } = req.body;
        if (!Array.isArray(studentIds) || !targetGroupId) {
            return res.status(400).json({ message: 'studentIds array and targetGroupId required' });
        }
        const adminUser = req['user'];
        const adminId = adminUser?.['_id'];
        const result = await groupMembershipService.moveMembers(String(req.params.id), targetGroupId, studentIds.filter(id => mongoose_1.default.Types.ObjectId.isValid(id)), adminId, 'Moved via group management');
        res.json({ message: `Moved ${result.added} members`, ...result });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// Delete safety check
router.get('/student-groups/:id/can-delete', ...adminAuth, async (req, res) => {
    try {
        const result = await groupMembershipService.canDeleteGroup(String(req.params.id));
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// STUDENT CONTACT TIMELINE (CRM)
// ============================================================================
router.get('/student-contact-timeline/:studentId', ...adminAuth, async (req, res) => {
    try {
        const entries = await StudentContactTimeline_1.default.find({ studentId: req.params.studentId })
            .sort({ createdAt: -1 })
            .populate('createdByAdminId', 'full_name username')
            .lean();
        res.json({ data: entries });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/student-contact-timeline/:studentId', ...adminAuth, async (req, res) => {
    try {
        const { type, content, linkedId } = req.body;
        if (!type || !content)
            return res.status(400).json({ message: 'type and content required' });
        const adminUser = req['user'];
        const entry = await StudentContactTimeline_1.default.create({
            studentId: new mongoose_1.default.Types.ObjectId(req.params.studentId),
            type,
            content: String(content).slice(0, 2000),
            linkedId: linkedId ? new mongoose_1.default.Types.ObjectId(linkedId) : undefined,
            createdByAdminId: adminUser?.['_id'],
        });
        res.status(201).json(entry);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.delete('/student-contact-timeline/:studentId/:entryId', ...adminAuth, requireDestructiveStepUp('students_groups', 'student_contact_timeline_delete'), async (req, res) => {
    try {
        const entry = await StudentContactTimeline_1.default.findOneAndDelete({
            _id: req.params.entryId,
            studentId: req.params.studentId,
        }).lean();
        if (!entry)
            return res.status(404).json({ message: 'Entry not found' });
        res.json({ message: 'Entry deleted' });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// SUBSCRIPTIONS V2
// ============================================================================
router.get('/subscriptions-v2', ...adminAuth, async (req, res) => {
    try {
        const { status, page = '1', limit = '20', q } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const query = {};
        if (status)
            query['status'] = status;
        if (q) {
            const users = await User_1.default.find({
                $or: [
                    { full_name: new RegExp(q, 'i') },
                    { email: new RegExp(q, 'i') },
                    { phone_number: new RegExp(q, 'i') },
                ],
            }).select('_id').lean();
            query['userId'] = { $in: users.map((u) => u._id) };
        }
        const [subs, total] = await Promise.all([
            UserSubscription_1.default.find(query)
                .populate('userId', 'full_name email phone_number status')
                .populate('planId', 'name code priceBDT')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            UserSubscription_1.default.countDocuments(query),
        ]);
        res.json({ data: subs, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/subscriptions-v2/users/:studentId/assign', ...adminAuth, async (req, res) => {
    try {
        const { planId, startDate, notes, paymentAmount, paymentMethod, paymentStatus, recordPayment, dueDateUTC } = req.body;
        if (!planId)
            return res.status(400).json({ message: 'planId required' });
        const adminUser = req['user'];
        const assignment = await (0, subscriptionLifecycleService_1.assignSubscriptionLifecycle)({
            userId: String(req.params.studentId),
            planId: String(planId),
            actorId: String(adminUser?.['_id'] || ''),
            startAtUTC: startDate,
            paymentAmount,
            paymentMethod,
            paymentStatus,
            recordPayment,
            dueDateUTC,
            notes,
        });
        res.status(201).json({
            message: assignment.subscription.status === 'active' ? 'Subscription assigned' : 'Subscription created in pending state',
            subscription: assignment.subscription,
            payment: assignment.payment,
            invoice: assignment.invoice,
            cache: assignment.cache,
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/subscriptions-v2/users/:studentId/extend', ...adminAuth, async (req, res) => {
    try {
        const { days, notes } = req.body;
        if (!days || isNaN(Number(days)))
            return res.status(400).json({ message: 'days (number) required' });
        const adminUser = req['user'];
        const result = await (0, subscriptionLifecycleService_1.extendSubscriptionForUser)(String(req.params.studentId), Number(days), String(adminUser?.['_id'] || ''), notes);
        res.json({ message: `Extended by ${days} days`, newExpiry: result.subscription.expiresAtUTC, sub: result.subscription });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/subscriptions-v2/users/:studentId/expire-now', ...adminAuth, async (req, res) => {
    try {
        const adminUser = req['user'];
        const result = await (0, subscriptionLifecycleService_1.expireSubscriptionForUser)(String(req.params.studentId), String(adminUser?.['_id'] || ''), 'Expired from student management');
        res.json({ message: 'Subscription expired immediately', subscription: result.subscription });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/subscriptions-v2/users/:studentId/toggle-auto-renew', ...adminAuth, async (req, res) => {
    try {
        const sub = await (0, subscriptionLifecycleService_1.toggleAutoRenewForUser)(String(req.params.studentId));
        res.json({ message: `Auto-renew ${sub.autoRenewEnabled ? 'enabled' : 'disabled'}`, autoRenewEnabled: sub.autoRenewEnabled });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// NOTIFICATION PROVIDERS
// ============================================================================
router.get('/notification-providers', ...notificationAdminAuth, async (_req, res) => {
    try {
        const providers = await NotificationProvider_1.default.find().select('-credentialsEncrypted').lean();
        res.json({ data: providers });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/notification-providers', ...notificationAdminAuth, (0, sensitiveAction_1.requireSensitiveAction)({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_create' }), async (req, res) => {
    try {
        const { type, provider, displayName, credentials, senderConfig, rateLimit, isEnabled } = req.body;
        if (!type || !provider || !displayName || !credentials) {
            return res.status(400).json({ message: 'type, provider, displayName, credentials required' });
        }
        const credentialsEncrypted = (0, cryptoService_1.encrypt)(JSON.stringify(credentials));
        const doc = await NotificationProvider_1.default.create({
            type, provider, displayName,
            credentialsEncrypted,
            senderConfig: senderConfig ?? {},
            rateLimit: rateLimit ?? { perMinute: 30, perDay: 1000 },
            isEnabled: isEnabled !== false,
        });
        const safe = doc.toObject();
        delete safe['credentialsEncrypted'];
        res.status(201).json(safe);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/notification-providers/:id', ...notificationAdminAuth, async (req, res) => {
    try {
        const doc = await NotificationProvider_1.default.findById(req.params.id).select('-credentialsEncrypted').lean();
        if (!doc)
            return res.status(404).json({ message: 'Provider not found' });
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.put('/notification-providers/:id', ...notificationAdminAuth, (0, sensitiveAction_1.requireSensitiveAction)({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_update' }), async (req, res) => {
    try {
        const { displayName, credentials, senderConfig, rateLimit, isEnabled } = req.body;
        const update = {};
        if (displayName !== undefined)
            update['displayName'] = displayName;
        if (senderConfig !== undefined)
            update['senderConfig'] = senderConfig;
        if (rateLimit !== undefined)
            update['rateLimit'] = rateLimit;
        if (isEnabled !== undefined)
            update['isEnabled'] = isEnabled;
        if (credentials !== undefined)
            update['credentialsEncrypted'] = (0, cryptoService_1.encrypt)(JSON.stringify(credentials));
        const doc = await NotificationProvider_1.default.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-credentialsEncrypted').lean();
        if (!doc)
            return res.status(404).json({ message: 'Provider not found' });
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.delete('/notification-providers/:id', ...notificationAdminAuth, (0, sensitiveAction_1.requireSensitiveAction)({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_delete' }), async (req, res) => {
    try {
        const doc = await NotificationProvider_1.default.findByIdAndDelete(req.params.id).lean();
        if (!doc)
            return res.status(404).json({ message: 'Provider not found' });
        res.json({ message: 'Provider deleted' });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/notification-providers/:id/test-send', ...notificationAdminAuth, (0, sensitiveAction_1.requireSensitiveAction)({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_test_send' }), async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId)
            return res.status(400).json({ message: 'studentId required' });
        const provider = await NotificationProvider_1.default.findById(req.params.id).select('+credentialsEncrypted').lean();
        if (!provider)
            return res.status(404).json({ message: 'Provider not found' });
        const result = await (0, notificationProviderService_1.sendNotificationToStudent)(studentId, 'SUB_EXPIRY_7D', provider['type'], { expiry_date: new Date().toISOString().split('T')[0], plan_name: 'Test' });
        res.json({ result });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================
router.get('/notification-templates', ...notificationAdminAuth, async (_req, res) => {
    try {
        const templates = await NotificationTemplate_1.default.find().sort({ key: 1 }).lean();
        res.json({ data: templates });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/notification-templates', ...notificationAdminAuth, async (req, res) => {
    try {
        const { key, channel, subject, body, placeholdersAllowed, isEnabled } = req.body;
        if (!key || !channel || !body) {
            return res.status(400).json({ message: 'key, channel, body required' });
        }
        const template = await NotificationTemplate_1.default.create({
            key: String(key).toUpperCase(),
            channel, subject: subject ?? '', body,
            placeholdersAllowed: placeholdersAllowed ?? [],
            isEnabled: isEnabled !== false,
        });
        res.status(201).json(template);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/notification-templates/:id', ...notificationAdminAuth, async (req, res) => {
    try {
        const template = await NotificationTemplate_1.default.findById(req.params.id).lean();
        if (!template)
            return res.status(404).json({ message: 'Template not found' });
        res.json(template);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.put('/notification-templates/:id', ...notificationAdminAuth, requireDestructiveStepUp('notification_center', 'template_update'), async (req, res) => {
    try {
        const { subject, body, placeholdersAllowed, isEnabled } = req.body;
        const update = {};
        if (subject !== undefined)
            update['subject'] = subject;
        if (body !== undefined)
            update['body'] = body;
        if (placeholdersAllowed !== undefined)
            update['placeholdersAllowed'] = placeholdersAllowed;
        if (isEnabled !== undefined)
            update['isEnabled'] = isEnabled;
        const template = await NotificationTemplate_1.default.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
        if (!template)
            return res.status(404).json({ message: 'Template not found' });
        res.json(template);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.delete('/notification-templates/:id', ...notificationAdminAuth, requireDestructiveStepUp('notification_center', 'template_delete'), async (req, res) => {
    try {
        const template = await NotificationTemplate_1.default.findByIdAndDelete(req.params.id).lean();
        if (!template)
            return res.status(404).json({ message: 'Template not found' });
        res.json({ message: 'Template deleted' });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// NOTIFICATIONS V2 - SEND / JOBS / LOGS
// ============================================================================
router.post('/notifications-v2/send', ...notificationAdminAuth, async (req, res) => {
    try {
        const { channel, target, templateKey, payloadOverrides, targetStudentId, targetGroupId, targetStudentIds, targetFilterJson, scheduledAtUTC, customBody, customSubject, campaignName, guardianTargeted, recipientMode, } = req.body;
        if (!channel || !target || !templateKey) {
            return res.status(400).json({ message: 'channel, target, templateKey required' });
        }
        const adminUser = req['user'];
        const adminId = String(adminUser?.['_id'] || '');
        let totalTargets = 0;
        let audienceFilters;
        if (target === 'group' && targetGroupId) {
            const recipients = await (0, notificationOrchestrationService_1.resolveAudience)('group', { groupId: String(targetGroupId) });
            totalTargets = recipients.length;
        }
        else if (target === 'single' && targetStudentId) {
            totalTargets = 1;
        }
        else if (target === 'selected' && Array.isArray(targetStudentIds)) {
            totalTargets = targetStudentIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)).length;
        }
        else if (target === 'filter' && targetFilterJson) {
            try {
                const parsedFilters = JSON.parse(targetFilterJson);
                audienceFilters = { ...parsedFilters };
                if (!audienceFilters.statuses && audienceFilters.status) {
                    audienceFilters.statuses = [audienceFilters.status];
                }
                const recipients = await (0, notificationOrchestrationService_1.resolveAudience)('filter', { filters: audienceFilters });
                totalTargets = recipients.length;
            }
            catch {
                return res.status(400).json({ message: 'Invalid targetFilterJson' });
            }
        }
        const result = await (0, notificationOrchestrationService_1.executeCampaign)({
            campaignName: String(campaignName || templateKey),
            channels: channel === 'both' ? ['sms', 'email'] : [channel],
            templateKey: String(templateKey).toUpperCase(),
            customBody: typeof customBody === 'string' ? customBody : undefined,
            customSubject: typeof customSubject === 'string' ? customSubject : undefined,
            vars: (payloadOverrides ?? {}),
            audienceType: target === 'group' ? 'group' : target === 'filter' ? 'filter' : 'manual',
            audienceGroupId: target === 'group' ? String(targetGroupId || '') : undefined,
            audienceFilters,
            manualStudentIds: target === 'single'
                ? [String(targetStudentId || '')].filter(Boolean)
                : Array.isArray(targetStudentIds)
                    ? targetStudentIds.map((id) => String(id || '')).filter(Boolean)
                    : undefined,
            guardianTargeted: Boolean(guardianTargeted),
            recipientMode: recipientMode === 'guardian' || recipientMode === 'both' ? recipientMode : 'student',
            scheduledAtUTC: scheduledAtUTC ? new Date(scheduledAtUTC) : undefined,
            adminId,
        });
        res.status(201).json({
            message: scheduledAtUTC ? 'Notification job scheduled' : 'Notification job queued or completed',
            jobId: result.jobId,
            totalTargets,
            sent: result.sent,
            failed: result.failed,
            skipped: result.skipped,
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/notifications-v2/jobs', ...notificationAdminAuth, async (req, res) => {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const query = {};
        if (status)
            query['status'] = status;
        const [jobs, total] = await Promise.all([
            NotificationJob_1.default.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
            NotificationJob_1.default.countDocuments(query),
        ]);
        res.json({ data: jobs, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/notifications-v2/jobs/:id', ...notificationAdminAuth, async (req, res) => {
    try {
        const job = await NotificationJob_1.default.findById(req.params.id).lean();
        if (!job)
            return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/notifications-v2/jobs/:id/retry-failed', ...notificationAdminAuth, async (req, res) => {
    try {
        const job = await NotificationJob_1.default.findById(req.params.id);
        if (!job)
            return res.status(404).json({ message: 'Job not found' });
        if (!['failed', 'partial'].includes(job.status)) {
            return res.status(400).json({ message: 'Only failed or partial jobs can be retried' });
        }
        const adminUser = req['user'];
        const result = await (0, notificationOrchestrationService_1.retryFailedDeliveries)(String(job._id), String(adminUser?.['_id'] || ''));
        res.json({ message: 'Retry complete', ...result });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.get('/notifications-v2/logs', ...notificationAdminAuth, async (req, res) => {
    try {
        const { jobId, studentId, status, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const query = {};
        if (jobId && mongoose_1.default.Types.ObjectId.isValid(jobId))
            query['jobId'] = new mongoose_1.default.Types.ObjectId(jobId);
        if (studentId && mongoose_1.default.Types.ObjectId.isValid(studentId))
            query['studentId'] = new mongoose_1.default.Types.ObjectId(studentId);
        if (status)
            query['status'] = status;
        const [logs, total] = await Promise.all([
            NotificationDeliveryLog_1.default.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
            NotificationDeliveryLog_1.default.countDocuments(query),
        ]);
        res.json({ data: logs, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// STUDENT SETTINGS
// ============================================================================
router.get('/student-settings', ...adminAuth, async (_req, res) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settings = await StudentSettings_1.StudentSettingsModel.getDefault();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.put('/student-settings', ...adminAuth, async (req, res) => {
    try {
        const allowedFields = [
            'expiryReminderDays', 'autoExpireEnabled', 'passwordResetOnExpiry',
            'autoAlertTriggers', 'smsEnabled', 'emailEnabled',
            'quietHoursStart', 'quietHoursEnd', 'defaultSmsFromName', 'defaultEmailFromName',
        ];
        const update = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined)
                update[field] = req.body[field];
        }
        const settings = await StudentSettings_1.StudentSettingsModel.findOneAndUpdate({ key: 'default' }, { $set: update }, { upsert: true, new: true }).lean();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// AUDIENCE SEGMENTS (extends StudentGroup with type='audience')
// ============================================================================
router.get('/audience-segments', ...adminAuth, async (req, res) => {
    try {
        const { q, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const query = { type: 'dynamic' };
        if (q)
            query['name'] = new RegExp(String(q), 'i');
        const [segments, total] = await Promise.all([
            StudentGroup_1.default.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
            StudentGroup_1.default.countDocuments(query),
        ]);
        // Enrich with live preview count
        const enriched = await Promise.all(segments.map(async (seg) => {
            const count = await resolveAudienceCount(seg.rules);
            return { ...seg, liveCount: count };
        }));
        res.json({ data: enriched, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/audience-segments', ...adminAuth, async (req, res) => {
    try {
        const { name, description, rules } = req.body;
        if (!name)
            return res.status(400).json({ message: 'name is required' });
        const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
        const adminUser = req['user'];
        const count = await resolveAudienceCount(rules);
        const segment = await StudentGroup_1.default.create({
            name, slug, description,
            type: 'dynamic',
            rules: rules || {},
            isActive: true,
            createdByAdminId: adminUser?.['_id'],
            memberCountCached: count,
        });
        res.status(201).json({ ...segment.toObject(), liveCount: count });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.post('/audience-segments/preview', ...adminAuth, async (req, res) => {
    try {
        const { rules } = req.body;
        const count = await resolveAudienceCount(rules);
        res.json({ count });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
router.delete('/audience-segments/:id', ...adminAuth, requireDestructiveStepUp('students_groups', 'audience_segment_delete'), async (req, res) => {
    try {
        const segment = await StudentGroup_1.default.findOneAndDelete({ _id: req.params.id, type: 'dynamic' }).lean();
        if (!segment)
            return res.status(404).json({ message: 'Segment not found' });
        res.json({ message: 'Segment deleted' });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// FINANCE ADJUSTMENT (Admin adds manual finance entries for a student)
// ============================================================================
router.post('/students-v2/:id/finance-adjustment', ...adminAuth, requireDestructiveStepUp('payments', 'student_finance_adjustment'), async (req, res) => {
    try {
        const { amount, direction, description, method, categoryLabel } = req.body;
        if (!amount || !direction || !description) {
            return res.status(400).json({ message: 'amount, direction, description required' });
        }
        const adminUser = req['user'];
        const studentId = new mongoose_1.default.Types.ObjectId(req.params.id);
        const txnCode = `ADJ-${Date.now().toString(36).toUpperCase()}`;
        const txn = await FinanceTransaction_1.default.create({
            txnCode,
            direction: direction === 'income' ? 'income' : 'expense',
            amount: Math.abs(Number(amount)),
            currency: 'BDT',
            dateUTC: new Date(),
            accountCode: direction === 'income' ? 'STU-INC' : 'STU-EXP',
            categoryLabel: categoryLabel || 'Manual Adjustment',
            description: String(description).slice(0, 500),
            status: 'approved',
            method: method || 'manual',
            sourceType: direction === 'income' ? 'manual_income' : 'expense',
            sourceId: req.params.id,
            studentId,
            createdByAdminId: adminUser?.['_id'],
        });
        // Update due ledger
        const ledger = await StudentDueLedger_1.default.findOne({ studentId });
        if (ledger) {
            ledger.manualAdjustment += direction === 'income' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
            ledger.netDue = ledger.computedDue + ledger.manualAdjustment - ledger.waiverAmount;
            ledger.lastComputedAt = new Date();
            ledger.updatedBy = adminUser?.['_id'];
            await ledger.save();
        }
        // Timeline entry
        await StudentContactTimeline_1.default.create({
            studentId,
            type: 'payment_note',
            content: `Finance adjustment: ${direction} ৳${Math.abs(Number(amount))} — ${description}`,
            sourceType: 'system',
            createdByAdminId: adminUser?.['_id'],
            metadata: { txnId: txn._id, txnCode },
        });
        res.status(201).json(txn);
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// STUDENT PAYMENT HISTORY
// ============================================================================
router.get('/students-v2/:id/payments', ...adminAuth, async (req, res) => {
    try {
        const studentId = String(req.params.id || '');
        const studentObjectId = mongoose_1.default.Types.ObjectId.isValid(studentId)
            ? new mongoose_1.default.Types.ObjectId(studentId)
            : null;
        const [legacyPayments, manualPayments, ledger] = await Promise.all([
            payment_model_1.PaymentModel.find({ userId: studentId })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),
            studentObjectId
                ? ManualPayment_1.default.find({ studentId: studentObjectId })
                    .sort({ date: -1, createdAt: -1 })
                    .limit(100)
                    .lean()
                : Promise.resolve([]),
            StudentDueLedger_1.default.findOne({ studentId }).lean(),
        ]);
        const payments = [
            ...legacyPayments.map((payment) => ({
                _id: String(payment._id),
                amountBDT: Number(payment.amountBDT) || 0,
                method: String(payment.method || 'manual'),
                status: String(payment.status || 'pending'),
                date: payment.paidAt || payment.createdAt,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt || null,
                source: 'legacy',
                entryType: payment.examId ? 'exam_fee' : 'legacy_payment',
            })),
            ...manualPayments.map((payment) => ({
                _id: String(payment._id),
                amountBDT: Number(payment.amount) || 0,
                method: String(payment.method || 'manual'),
                status: String(payment.status || 'pending'),
                date: payment.date || payment.createdAt,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt || null,
                source: 'manual',
                entryType: payment.entryType || 'manual_payment',
            })),
        ].sort((a, b) => {
            const aTime = new Date(String(a.date || a.createdAt || 0)).getTime();
            const bTime = new Date(String(b.date || b.createdAt || 0)).getTime();
            return bTime - aTime;
        });
        const dueLedger = ledger || null;
        const totals = {
            totalPaid: payments
                .filter((payment) => payment.status === 'paid')
                .reduce((sum, payment) => sum + payment.amountBDT, 0),
            pendingCount: payments.filter((payment) => payment.status === 'pending').length,
        };
        res.json({
            payments,
            ledger: dueLedger,
            dueLedger,
            totals,
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// STUDENT FINANCE STATEMENT
// ============================================================================
router.get('/students-v2/:id/finance-statement', ...adminAuth, async (req, res) => {
    try {
        const studentId = String(req.params.id || '');
        const studentObjectId = new mongoose_1.default.Types.ObjectId(studentId);
        const transactions = await FinanceTransaction_1.default.find({
            studentId: studentObjectId,
            isDeleted: false,
        }).sort({ dateUTC: -1 }).limit(200).lean();
        const totals = await FinanceTransaction_1.default.aggregate([
            { $match: { studentId: studentObjectId, isDeleted: false } },
            { $group: {
                    _id: '$direction',
                    total: { $sum: '$amount' },
                } },
        ]);
        const income = totals.find((t) => t._id === 'income')?.total ?? 0;
        const expense = totals.find((t) => t._id === 'expense')?.total ?? 0;
        const dueLedger = await StudentDueLedger_1.default.findOne({ studentId }).lean();
        res.json({
            transactions: transactions.map((transaction) => ({
                _id: String(transaction._id),
                txnCode: transaction.txnCode,
                direction: transaction.direction,
                amount: transaction.amount,
                description: transaction.description ?? '',
                status: transaction.status,
                dateUTC: transaction.dateUTC,
            })),
            totals: {
                income,
                expense,
            },
            totalIncome: income,
            totalExpenses: expense,
            net: income - expense,
            dueLedger: dueLedger || null,
        });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// IMPORT / EXPORT LOGS
// ============================================================================
router.get('/import-export-logs', ...adminAuth, async (req, res) => {
    try {
        const { direction, category, page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const query = {};
        if (direction)
            query['direction'] = direction;
        if (category)
            query['category'] = category;
        const [logs, total] = await Promise.all([
            ImportExportLog_1.default.find(query)
                .populate('performedBy', 'full_name username')
                .sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
            ImportExportLog_1.default.countDocuments(query),
        ]);
        res.json({ data: logs, total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        res.status(500).json({ message: String(err) });
    }
});
// ============================================================================
// AUDIENCE RESOLUTION HELPER
// ============================================================================
async function resolveAudienceCount(rules) {
    const userIds = await (0, subscriptionContactCenterService_1.resolveSubscriptionContactUserIds)(rules || {});
    return userIds.length;
}
exports.default = router;
//# sourceMappingURL=adminStudentMgmtRoutes.js.map