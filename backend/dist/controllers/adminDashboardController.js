"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetNotifications = adminGetNotifications;
exports.adminCreateNotification = adminCreateNotification;
exports.adminUpdateNotification = adminUpdateNotification;
exports.adminDeleteNotification = adminDeleteNotification;
exports.adminToggleNotification = adminToggleNotification;
exports.adminGetStudentDashboardConfig = adminGetStudentDashboardConfig;
exports.adminUpdateStudentDashboardConfig = adminUpdateStudentDashboardConfig;
exports.adminGetBadges = adminGetBadges;
exports.adminCreateBadge = adminCreateBadge;
exports.adminUpdateBadge = adminUpdateBadge;
exports.adminDeleteBadge = adminDeleteBadge;
exports.adminAssignBadge = adminAssignBadge;
exports.adminRevokeBadge = adminRevokeBadge;
exports.adminIssueGuardianOtp = adminIssueGuardianOtp;
exports.adminConfirmGuardianOtp = adminConfirmGuardianOtp;
exports.adminExportStudentExamHistory = adminExportStudentExamHistory;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const exceljs_1 = __importDefault(require("exceljs"));
const Notification_1 = __importDefault(require("../models/Notification"));
const StudentDashboardConfig_1 = __importDefault(require("../models/StudentDashboardConfig"));
const Badge_1 = __importDefault(require("../models/Badge"));
const StudentBadge_1 = __importDefault(require("../models/StudentBadge"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const studentDashboardStream_1 = require("../realtime/studentDashboardStream");
const secureUploadService_1 = require("../services/secureUploadService");
function hashOtp(code) {
    return crypto_1.default.createHash('sha256').update(code).digest('hex');
}
function toObjectIdOrUndefined(value) {
    if (!value || !mongoose_1.default.Types.ObjectId.isValid(value))
        return undefined;
    return new mongoose_1.default.Types.ObjectId(value);
}
const DEFAULT_CELEBRATION_RULES = {
    enabled: true,
    windowDays: 7,
    minPercentage: 80,
    maxRank: 10,
    ruleMode: 'score_or_rank',
    messageTemplates: [
        'Excellent performance! Keep it up.',
        'Top result achieved. Great work!',
        'You are in the top performers this week.',
    ],
    showForSec: 10,
    dismissible: true,
    maxShowsPerDay: 2,
};
const NOTIFICATION_ATTACHMENT_ACCESS_ROLES = ['student', 'superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'chairman'];
function normalizeCelebrationRules(raw) {
    const input = (raw && typeof raw === 'object') ? raw : {};
    const mode = String(input.ruleMode || DEFAULT_CELEBRATION_RULES.ruleMode).trim().toLowerCase();
    const ruleMode = (mode === 'score_and_rank' || mode === 'custom') ? mode : 'score_or_rank';
    const templates = Array.isArray(input.messageTemplates)
        ? input.messageTemplates.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    return {
        enabled: input.enabled === undefined ? DEFAULT_CELEBRATION_RULES.enabled : Boolean(input.enabled),
        windowDays: Math.max(1, Math.min(90, Number(input.windowDays ?? DEFAULT_CELEBRATION_RULES.windowDays) || DEFAULT_CELEBRATION_RULES.windowDays)),
        minPercentage: Math.max(0, Math.min(100, Number(input.minPercentage ?? DEFAULT_CELEBRATION_RULES.minPercentage) || DEFAULT_CELEBRATION_RULES.minPercentage)),
        maxRank: Math.max(1, Math.min(1000, Number(input.maxRank ?? DEFAULT_CELEBRATION_RULES.maxRank) || DEFAULT_CELEBRATION_RULES.maxRank)),
        ruleMode,
        messageTemplates: templates.length ? templates : DEFAULT_CELEBRATION_RULES.messageTemplates,
        showForSec: Math.max(3, Math.min(60, Number(input.showForSec ?? DEFAULT_CELEBRATION_RULES.showForSec) || DEFAULT_CELEBRATION_RULES.showForSec)),
        dismissible: input.dismissible === undefined ? DEFAULT_CELEBRATION_RULES.dismissible : Boolean(input.dismissible),
        maxShowsPerDay: Math.max(1, Math.min(10, Number(input.maxShowsPerDay ?? DEFAULT_CELEBRATION_RULES.maxShowsPerDay) || DEFAULT_CELEBRATION_RULES.maxShowsPerDay)),
    };
}
async function adminGetNotifications(_req, res) {
    try {
        const items = await Notification_1.default.find().sort({ publishAt: -1, createdAt: -1 }).lean();
        res.json({ items });
    }
    catch (err) {
        console.error('adminGetNotifications error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateNotification(req, res) {
    try {
        const attachmentUrl = await (0, secureUploadService_1.ensureSecureUploadUrl)({
            url: String(req.body?.attachmentUrl || '').trim(),
            category: 'admin_upload',
            visibility: 'protected',
            uploadedBy: req.user?._id || null,
            accessRoles: NOTIFICATION_ATTACHMENT_ACCESS_ROLES,
        });
        const payload = {
            ...req.body,
            attachmentUrl,
            createdBy: toObjectIdOrUndefined(req.user?._id),
            updatedBy: toObjectIdOrUndefined(req.user?._id),
        };
        const item = await Notification_1.default.create(payload);
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'notification_updated', meta: { action: 'create', id: String(item._id) } });
        res.status(201).json({ item, message: 'Notification created' });
    }
    catch (err) {
        console.error('adminCreateNotification error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateNotification(req, res) {
    try {
        const nextBody = { ...req.body };
        if (nextBody.attachmentUrl !== undefined) {
            nextBody.attachmentUrl = await (0, secureUploadService_1.ensureSecureUploadUrl)({
                url: String(nextBody.attachmentUrl || '').trim(),
                category: 'admin_upload',
                visibility: 'protected',
                uploadedBy: req.user?._id || null,
                accessRoles: NOTIFICATION_ATTACHMENT_ACCESS_ROLES,
            });
        }
        const item = await Notification_1.default.findByIdAndUpdate(req.params.id, { ...nextBody, updatedBy: toObjectIdOrUndefined(req.user?._id) }, { new: true, runValidators: true });
        if (!item) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'notification_updated', meta: { action: 'update', id: String(item._id) } });
        res.json({ item, message: 'Notification updated' });
    }
    catch (err) {
        console.error('adminUpdateNotification error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteNotification(req, res) {
    try {
        const item = await Notification_1.default.findByIdAndDelete(req.params.id);
        if (!item) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'notification_updated', meta: { action: 'delete', id: String(item._id) } });
        res.json({ message: 'Notification deleted' });
    }
    catch (err) {
        console.error('adminDeleteNotification error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleNotification(req, res) {
    try {
        const item = await Notification_1.default.findById(req.params.id);
        if (!item) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }
        item.isActive = !item.isActive;
        await item.save();
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'notification_updated', meta: { action: 'toggle', id: String(item._id), isActive: item.isActive } });
        res.json({ item, message: 'Notification status toggled' });
    }
    catch (err) {
        console.error('adminToggleNotification error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetStudentDashboardConfig(_req, res) {
    try {
        let config = await StudentDashboardConfig_1.default.findOne().lean();
        if (!config) {
            await StudentDashboardConfig_1.default.create({ celebrationRules: DEFAULT_CELEBRATION_RULES });
            config = await StudentDashboardConfig_1.default.findOne().lean();
        }
        else if (!config.celebrationRules) {
            await StudentDashboardConfig_1.default.updateOne({ _id: config._id }, { $set: { celebrationRules: DEFAULT_CELEBRATION_RULES } });
            config = await StudentDashboardConfig_1.default.findOne().lean();
        }
        res.json({ config });
    }
    catch (err) {
        console.error('adminGetStudentDashboardConfig error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateStudentDashboardConfig(req, res) {
    try {
        let config = await StudentDashboardConfig_1.default.findOne();
        if (!config)
            config = new StudentDashboardConfig_1.default();
        const body = req.body;
        Object.assign(config, body);
        config.celebrationRules = normalizeCelebrationRules(body.celebrationRules);
        config.profileCompletionThreshold = 60;
        config.updatedBy = toObjectIdOrUndefined(req.user?._id);
        await config.save();
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'dashboard_config_updated', meta: { updatedBy: req.user?._id } });
        res.json({ config, message: 'Student dashboard config updated' });
    }
    catch (err) {
        console.error('adminUpdateStudentDashboardConfig error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetBadges(_req, res) {
    try {
        const items = await Badge_1.default.find().sort({ createdAt: -1 }).lean();
        res.json({ items });
    }
    catch (err) {
        console.error('adminGetBadges error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateBadge(req, res) {
    try {
        const item = await Badge_1.default.create(req.body);
        res.status(201).json({ item, message: 'Badge created' });
    }
    catch (err) {
        console.error('adminCreateBadge error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateBadge(req, res) {
    try {
        const item = await Badge_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) {
            res.status(404).json({ message: 'Badge not found' });
            return;
        }
        res.json({ item, message: 'Badge updated' });
    }
    catch (err) {
        console.error('adminUpdateBadge error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteBadge(req, res) {
    try {
        const item = await Badge_1.default.findByIdAndDelete(req.params.id);
        if (!item) {
            res.status(404).json({ message: 'Badge not found' });
            return;
        }
        await StudentBadge_1.default.deleteMany({ badge: req.params.id });
        res.json({ message: 'Badge deleted' });
    }
    catch (err) {
        console.error('adminDeleteBadge error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminAssignBadge(req, res) {
    try {
        const { studentId, badgeId, note } = req.body;
        const item = await StudentBadge_1.default.findOneAndUpdate({ student: studentId, badge: badgeId }, {
            $set: {
                awardedBy: req.user?._id,
                source: 'manual',
                note: note || '',
                awardedAt: new Date(),
            }
        }, { upsert: true, new: true });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId, badgeId } });
        res.status(201).json({ item, message: 'Badge assigned' });
    }
    catch (err) {
        console.error('adminAssignBadge error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminRevokeBadge(req, res) {
    try {
        const { studentId, badgeId } = req.params;
        await StudentBadge_1.default.deleteOne({ student: studentId, badge: badgeId });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId, badgeId, revoked: true } });
        res.json({ message: 'Badge revoked' });
    }
    catch (err) {
        console.error('adminRevokeBadge error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminIssueGuardianOtp(req, res) {
    try {
        const { studentId } = req.params;
        const profile = await StudentProfile_1.default.findOne({ user_id: studentId });
        if (!profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        profile.guardianOtpHash = hashOtp(otp);
        profile.guardianOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        profile.guardianPhoneVerificationStatus = 'pending';
        await profile.save();
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId, guardianOtpIssued: true } });
        // Admin-assisted flow: OTP is returned for manual offline verification.
        res.json({ message: 'OTP issued', otp, expiresAt: profile.guardianOtpExpiresAt });
    }
    catch (err) {
        console.error('adminIssueGuardianOtp error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminConfirmGuardianOtp(req, res) {
    try {
        const { studentId } = req.params;
        const { code } = req.body;
        const profile = await StudentProfile_1.default.findOne({ user_id: studentId });
        if (!profile) {
            res.status(404).json({ message: 'Student profile not found' });
            return;
        }
        if (!profile.guardianOtpHash || !profile.guardianOtpExpiresAt || profile.guardianOtpExpiresAt.getTime() < Date.now()) {
            res.status(400).json({ message: 'OTP not issued or expired' });
            return;
        }
        if (hashOtp(String(code || '')) !== profile.guardianOtpHash) {
            res.status(400).json({ message: 'Invalid OTP' });
            return;
        }
        profile.guardianPhoneVerifiedAt = new Date();
        profile.guardianPhoneVerificationStatus = 'verified';
        profile.guardianOtpHash = '';
        profile.guardianOtpExpiresAt = undefined;
        await profile.save();
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId, guardianVerified: true } });
        res.json({ message: 'Guardian phone verified', verifiedAt: profile.guardianPhoneVerifiedAt });
    }
    catch (err) {
        console.error('adminConfirmGuardianOtp error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
function toCsvValue(value) {
    if (value == null)
        return '';
    const stringValue = String(value);
    if (!/[",\r\n]/.test(stringValue))
        return stringValue;
    return `"${stringValue.replace(/"/g, '""')}"`;
}
async function adminExportStudentExamHistory(req, res) {
    try {
        const format = String(req.query.format || 'xlsx').toLowerCase() === 'csv' ? 'csv' : 'xlsx';
        const rows = await ExamResult_1.default.find({})
            .populate('student', 'username full_name email')
            .populate('exam', 'title subject')
            .sort({ submittedAt: -1 })
            .lean();
        const normalizedRows = rows.map((item) => {
            const student = item.student;
            const exam = item.exam;
            return {
                username: String(student?.username || ''),
                fullName: String(student?.full_name || student?.fullName || ''),
                email: String(student?.email || ''),
                examTitle: String(exam?.title || ''),
                subject: String(exam?.subject || ''),
                attemptNo: Number(item.attemptNo || 1),
                obtainedMarks: Number(item.obtainedMarks || 0),
                totalMarks: Number(item.totalMarks || 0),
                percentage: Number(item.percentage || 0),
                rank: item.rank || '',
                submittedAt: item.submittedAt ? new Date(item.submittedAt).toISOString() : '',
            };
        });
        if (format === 'csv') {
            const headers = [
                'Student Username',
                'Student Name',
                'Student Email',
                'Exam Title',
                'Subject',
                'Attempt No',
                'Marks',
                'Total Marks',
                'Percentage',
                'Rank',
                'Submitted At',
            ];
            const csvRows = [
                headers.join(','),
                ...normalizedRows.map((row) => ([
                    row.username,
                    row.fullName,
                    row.email,
                    row.examTitle,
                    row.subject,
                    row.attemptNo,
                    row.obtainedMarks,
                    row.totalMarks,
                    row.percentage,
                    row.rank,
                    row.submittedAt,
                ]).map(toCsvValue).join(',')),
            ];
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="student_exam_history.csv"');
            res.send(`\uFEFF${csvRows.join('\n')}`);
            return;
        }
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet('Student Exam History');
        sheet.columns = [
            { header: 'Student Username', key: 'username', width: 20 },
            { header: 'Student Name', key: 'fullName', width: 25 },
            { header: 'Student Email', key: 'email', width: 30 },
            { header: 'Exam Title', key: 'examTitle', width: 30 },
            { header: 'Subject', key: 'subject', width: 20 },
            { header: 'Attempt No', key: 'attemptNo', width: 12 },
            { header: 'Marks', key: 'obtainedMarks', width: 12 },
            { header: 'Total Marks', key: 'totalMarks', width: 12 },
            { header: 'Percentage', key: 'percentage', width: 12 },
            { header: 'Rank', key: 'rank', width: 10 },
            { header: 'Submitted At', key: 'submittedAt', width: 24 },
        ];
        sheet.getRow(1).font = { bold: true };
        for (const item of normalizedRows) {
            sheet.addRow({
                username: item.username,
                fullName: item.fullName,
                email: item.email,
                examTitle: item.examTitle,
                subject: item.subject,
                attemptNo: item.attemptNo,
                obtainedMarks: item.obtainedMarks,
                totalMarks: item.totalMarks,
                percentage: item.percentage,
                rank: item.rank,
                submittedAt: item.submittedAt,
            });
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="student_exam_history.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (err) {
        console.error('adminExportStudentExamHistory error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=adminDashboardController.js.map