"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSystemTimelineEvent = void 0;
exports.adminGetStudentTimeline = adminGetStudentTimeline;
exports.adminAddTimelineEntry = adminAddTimelineEntry;
exports.adminDeleteTimelineEntry = adminDeleteTimelineEntry;
exports.adminGetTimelineSummary = adminGetTimelineSummary;
const mongoose_1 = __importDefault(require("mongoose"));
const StudentContactTimeline_1 = __importDefault(require("../models/StudentContactTimeline"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const requestMeta_1 = require("../utils/requestMeta");
const studentTimelineService_1 = require("../services/studentTimelineService");
Object.defineProperty(exports, "addSystemTimelineEvent", { enumerable: true, get: function () { return studentTimelineService_1.addSystemTimelineEvent; } });
/* ── helpers ── */
function asObjectId(value) {
    const raw = String(value || '').trim();
    if (!raw || !mongoose_1.default.Types.ObjectId.isValid(raw))
        return null;
    return new mongoose_1.default.Types.ObjectId(raw);
}
async function createAudit(req, action, details) {
    if (!req.user || !mongoose_1.default.Types.ObjectId.isValid(req.user._id))
        return;
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'student_timeline',
        ip_address: (0, requestMeta_1.getClientIp)(req),
        details: details || {},
    });
}
/* ═══════════════════════════════════════════════════════════
   ADMIN  ENDPOINTS
   ═══════════════════════════════════════════════════════════ */
/** GET /admin/students/:studentId/timeline */
async function adminGetStudentTimeline(req, res) {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) {
        res.status(400).json({ message: 'Invalid studentId' });
        return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;
    const filter = { studentId };
    if (req.query.type)
        filter.type = String(req.query.type);
    if (req.query.sourceType)
        filter.sourceType = String(req.query.sourceType);
    const [items, total] = await Promise.all([
        StudentContactTimeline_1.default.find(filter)
            .populate('createdByAdminId', 'username full_name role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        StudentContactTimeline_1.default.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
}
/** POST /admin/students/:studentId/timeline — add a manual note */
async function adminAddTimelineEntry(req, res) {
    if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) {
        res.status(400).json({ message: 'Invalid studentId' });
        return;
    }
    const { type, content, linkedId } = req.body;
    const allowedManual = ['note', 'call', 'message', 'support_ticket_link', 'payment_note'];
    if (!type || !allowedManual.includes(type)) {
        res.status(400).json({ message: `type must be one of: ${allowedManual.join(', ')}` });
        return;
    }
    if (!content || !content.trim()) {
        res.status(400).json({ message: 'content is required' });
        return;
    }
    const entry = await StudentContactTimeline_1.default.create({
        studentId,
        type,
        content: content.trim(),
        linkedId: linkedId ? asObjectId(linkedId) : undefined,
        createdByAdminId: new mongoose_1.default.Types.ObjectId(String(req.user._id)),
        sourceType: 'manual',
    });
    await createAudit(req, 'timeline_entry_added', { studentId, type, entryId: entry._id });
    res.status(201).json({ data: entry, message: 'Timeline entry added' });
}
/** DELETE /admin/students/:studentId/timeline/:entryId */
async function adminDeleteTimelineEntry(req, res) {
    const studentId = asObjectId(req.params.studentId);
    const entryId = asObjectId(req.params.entryId);
    if (!studentId || !entryId) {
        res.status(400).json({ message: 'Invalid ids' });
        return;
    }
    const entry = await StudentContactTimeline_1.default.findOneAndDelete({
        _id: entryId,
        studentId,
        sourceType: 'manual',
    });
    if (!entry) {
        res.status(404).json({ message: 'Entry not found or is a system event (cannot delete)' });
        return;
    }
    await createAudit(req, 'timeline_entry_deleted', { studentId, entryId });
    res.json({ message: 'Timeline entry deleted' });
}
/** GET /admin/students/:studentId/timeline/summary — counts by type */
async function adminGetTimelineSummary(req, res) {
    const studentId = asObjectId(req.params.studentId);
    if (!studentId) {
        res.status(400).json({ message: 'Invalid studentId' });
        return;
    }
    const summary = await StudentContactTimeline_1.default.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$type', count: { $sum: 1 }, latest: { $max: '$createdAt' } } },
        { $sort: { latest: -1 } },
    ]);
    const total = await StudentContactTimeline_1.default.countDocuments({ studentId });
    res.json({ summary, total });
}
//# sourceMappingURL=studentTimelineController.js.map