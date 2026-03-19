"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminAlert = createAdminAlert;
exports.createStudentNotification = createStudentNotification;
exports.queryAdminAlerts = queryAdminAlerts;
exports.markAdminAlertsRead = markAdminAlertsRead;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = __importDefault(require("../models/Notification"));
const AdminNotificationRead_1 = __importDefault(require("../models/AdminNotificationRead"));
const ADMIN_LINK_PREFIX = /^\/__cw_admin__(\/|$)/i;
function toObjectId(value) {
    if (!value)
        return null;
    if (value instanceof mongoose_1.default.Types.ObjectId)
        return value;
    const raw = String(value || '').trim();
    if (!mongoose_1.default.Types.ObjectId.isValid(raw))
        return null;
    return new mongoose_1.default.Types.ObjectId(raw);
}
function toObjectIdList(values = []) {
    const seen = new Set();
    const output = [];
    for (const value of values) {
        const objectId = toObjectId(value);
        if (!objectId)
            continue;
        const key = String(objectId);
        if (seen.has(key))
            continue;
        seen.add(key);
        output.push(objectId);
    }
    return output;
}
function resolveAllowedRoles(role) {
    if (role === 'moderator')
        return ['moderator', 'admin', 'all'];
    return ['admin', 'all'];
}
function resolveActionableRoleFilter(role) {
    const allowed = resolveAllowedRoles(role);
    const baseRoles = allowed.filter((item) => item !== 'all');
    return {
        $or: [
            { targetRole: { $in: baseRoles } },
            { targetRole: 'all', linkUrl: ADMIN_LINK_PREFIX },
        ],
    };
}
async function createAdminAlert(input) {
    const targetUserIds = toObjectIdList(input.targetUserIds);
    const createdBy = toObjectId(input.createdBy || null);
    return Notification_1.default.create({
        title: input.title,
        message: input.message,
        category: input.category || 'update',
        linkUrl: input.linkUrl || '',
        isActive: true,
        targetRole: input.targetRole || 'admin',
        targetUserIds,
        createdBy: createdBy || undefined,
        updatedBy: createdBy || undefined,
    });
}
async function createStudentNotification(input) {
    const targetUserIds = toObjectIdList(input.targetUserIds);
    const createdBy = toObjectId(input.createdBy || null);
    return Notification_1.default.create({
        title: input.title,
        message: input.message,
        category: input.category || 'update',
        linkUrl: input.linkUrl || '',
        isActive: true,
        targetRole: input.targetRole || 'student',
        targetUserIds,
        createdBy: createdBy || undefined,
        updatedBy: createdBy || undefined,
    });
}
async function queryAdminAlerts(input) {
    const userId = toObjectId(input.userId);
    if (!userId) {
        return { items: [], total: 0, unreadCount: 0, page: 1, pages: 1 };
    }
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const skip = (page - 1) * limit;
    const now = new Date();
    const filter = {
        isActive: true,
        $or: [
            { targetUserIds: { $exists: false } },
            { targetUserIds: { $size: 0 } },
            { targetUserIds: userId },
        ],
        $and: [
            resolveActionableRoleFilter(input.role),
            { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
        ],
    };
    const [rows, total, allIds] = await Promise.all([
        Notification_1.default.find(filter).sort({ publishAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification_1.default.countDocuments(filter),
        Notification_1.default.find(filter).select('_id').lean(),
    ]);
    const notificationIds = rows.map((row) => row._id);
    const allNotificationIds = allIds.map((row) => row._id);
    const reads = notificationIds.length > 0
        ? await AdminNotificationRead_1.default.find({
            adminUserId: userId,
            notificationId: { $in: notificationIds },
        }).lean()
        : [];
    const totalRead = allNotificationIds.length > 0
        ? await AdminNotificationRead_1.default.countDocuments({
            adminUserId: userId,
            notificationId: { $in: allNotificationIds },
        })
        : 0;
    const readSet = new Set(reads.map((item) => String(item.notificationId)));
    const items = rows.map((item) => ({
        _id: String(item._id),
        title: item.title,
        message: item.message,
        category: item.category,
        linkUrl: item.linkUrl || '',
        publishAt: item.publishAt || item.createdAt,
        createdAt: item.createdAt,
        isRead: readSet.has(String(item._id)),
        targetRole: item.targetRole,
    }));
    return {
        items,
        total,
        unreadCount: Math.max(0, total - totalRead),
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
    };
}
async function markAdminAlertsRead(userIdInput, ids = [], role = 'admin') {
    const userId = toObjectId(userIdInput);
    if (!userId)
        return { updated: 0 };
    const cleanIds = ids
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
        .map((id) => new mongoose_1.default.Types.ObjectId(id));
    let targetIds = cleanIds;
    if (targetIds.length === 0) {
        const { items } = await queryAdminAlerts({ userId, role, page: 1, limit: 100 });
        targetIds = items
            .map((item) => String(item._id))
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_1.default.Types.ObjectId(id));
    }
    if (targetIds.length === 0)
        return { updated: 0 };
    await AdminNotificationRead_1.default.bulkWrite(targetIds.map((notificationId) => ({
        updateOne: {
            filter: { adminUserId: userId, notificationId },
            update: { $set: { readAt: new Date() } },
            upsert: true,
        },
    })));
    return { updated: targetIds.length };
}
//# sourceMappingURL=adminAlertService.js.map