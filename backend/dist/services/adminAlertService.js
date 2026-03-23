"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminAlert = createAdminAlert;
exports.createStudentNotification = createStudentNotification;
exports.queryAdminAlerts = queryAdminAlerts;
exports.countAdminUnreadAlerts = countAdminUnreadAlerts;
exports.markAdminAlertsRead = markAdminAlertsRead;
exports.markAdminAlertRead = markAdminAlertRead;
exports.markAllAdminAlertsRead = markAllAdminAlertsRead;
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
function buildDerivedLinkUrl(input) {
    if (String(input.linkUrl || '').trim())
        return String(input.linkUrl || '').trim();
    const targetRoute = String(input.targetRoute || '').trim();
    const targetEntityId = String(input.targetEntityId || '').trim();
    if (!targetRoute)
        return '';
    if (!targetEntityId)
        return targetRoute;
    if (targetRoute.includes('/contact'))
        return `${targetRoute}?focus=${targetEntityId}`;
    if (targetRoute.includes('/support-center'))
        return `${targetRoute}?ticketId=${targetEntityId}`;
    return `${targetRoute}?id=${targetEntityId}`;
}
function parseTargetMetaFromLink(linkUrl) {
    const raw = String(linkUrl || '').trim();
    if (!raw)
        return { targetRoute: '', targetEntityId: '' };
    const [pathname, query = ''] = raw.split('?');
    const params = new URLSearchParams(query);
    const targetEntityId = String(params.get('ticketId')
        || params.get('focus')
        || params.get('id')
        || params.get('requestId')
        || params.get('studentId')
        || params.get('userId')
        || params.get('profileId')
        || params.get('paymentId')
        || params.get('notificationId')
        || params.get('sourceId')
        || '').trim();
    return {
        targetRoute: pathname || '',
        targetEntityId,
    };
}
function buildActionableFilter(userId, role, type) {
    const now = new Date();
    const filter = {
        isActive: true,
        $or: [
            { targetUserIds: { $exists: false } },
            { targetUserIds: { $size: 0 } },
            { targetUserIds: userId },
        ],
        $and: [
            resolveActionableRoleFilter(role),
            { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
        ],
    };
    const normalizedType = String(type || '').trim();
    if (normalizedType) {
        filter.type = normalizedType;
    }
    return filter;
}
async function createAlertDocument(input, defaultRole) {
    const targetUserIds = toObjectIdList(input.targetUserIds);
    const createdBy = toObjectId(input.createdBy || null);
    const actorUserId = toObjectId(input.actorUserId || null);
    const payload = {
        title: input.title,
        message: input.message,
        type: input.type || '',
        messagePreview: String(input.messagePreview || '').trim(),
        category: input.category || 'update',
        linkUrl: buildDerivedLinkUrl(input),
        sourceType: String(input.sourceType || '').trim(),
        sourceId: String(input.sourceId || '').trim(),
        targetRoute: String(input.targetRoute || '').trim(),
        targetEntityId: String(input.targetEntityId || '').trim(),
        priority: input.priority || 'normal',
        actorUserId: actorUserId || undefined,
        actorNameSnapshot: String(input.actorNameSnapshot || '').trim(),
        isActive: true,
        targetRole: input.targetRole || defaultRole,
        targetUserIds,
        createdBy: createdBy || undefined,
        updatedBy: createdBy || undefined,
        dedupeKey: String(input.dedupeKey || '').trim() || undefined,
    };
    if (!payload.dedupeKey) {
        return Notification_1.default.create(payload);
    }
    try {
        return await Notification_1.default.create(payload);
    }
    catch (error) {
        if (error?.code !== 11000)
            throw error;
        const existing = await Notification_1.default.findOne({ dedupeKey: payload.dedupeKey });
        if (existing)
            return existing;
        throw error;
    }
}
async function createAdminAlert(input) {
    return createAlertDocument(input, 'admin');
}
async function createStudentNotification(input) {
    return createAlertDocument(input, 'student');
}
async function queryAdminAlerts(input) {
    const userId = toObjectId(input.userId);
    if (!userId) {
        return { items: [], total: 0, unreadCount: 0, page: 1, pages: 1 };
    }
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const skip = (page - 1) * limit;
    const filter = buildActionableFilter(userId, input.role, input.type);
    const allRows = await Notification_1.default.find(filter)
        .sort({ publishAt: -1, createdAt: -1 })
        .lean();
    const allIds = allRows.map((row) => row._id);
    const readRows = allIds.length > 0
        ? await AdminNotificationRead_1.default.find({
            adminUserId: userId,
            notificationId: { $in: allIds },
        }).lean()
        : [];
    const readSet = new Set(readRows.map((row) => String(row.notificationId)));
    const unreadRows = allRows.filter((row) => !readSet.has(String(row._id)));
    const selectedRows = input.unread ? unreadRows : allRows;
    const pagedRows = selectedRows.slice(skip, skip + limit);
    const items = pagedRows.map((item) => {
        const fallbackMeta = parseTargetMetaFromLink(String(item.linkUrl || ''));
        return {
            _id: String(item._id),
            title: item.title,
            message: item.message,
            type: item.type || '',
            messagePreview: item.messagePreview || item.message,
            category: item.category,
            linkUrl: item.linkUrl || '',
            sourceType: item.sourceType || '',
            sourceId: item.sourceId || '',
            targetRoute: item.targetRoute || fallbackMeta.targetRoute,
            targetEntityId: item.targetEntityId || fallbackMeta.targetEntityId,
            priority: item.priority || 'normal',
            actorUserId: item.actorUserId ? String(item.actorUserId) : '',
            actorNameSnapshot: item.actorNameSnapshot || '',
            publishAt: item.publishAt || item.createdAt,
            createdAt: item.createdAt,
            isRead: readSet.has(String(item._id)),
            targetRole: item.targetRole,
        };
    });
    return {
        items,
        total: selectedRows.length,
        unreadCount: unreadRows.length,
        page,
        pages: Math.max(1, Math.ceil(selectedRows.length / limit)),
    };
}
async function countAdminUnreadAlerts(userId, role, type) {
    const result = await queryAdminAlerts({
        userId,
        role,
        page: 1,
        limit: 1,
        type,
    });
    return { unreadCount: result.unreadCount };
}
async function markAdminAlertsRead(userIdInput, ids = [], role = 'admin') {
    const userId = toObjectId(userIdInput);
    if (!userId)
        return { updated: 0 };
    const filter = buildActionableFilter(userId, role);
    if (ids.length > 0) {
        filter._id = {
            $in: ids
                .map((id) => String(id || '').trim())
                .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_1.default.Types.ObjectId(id)),
        };
    }
    const targetIds = (await Notification_1.default.find(filter).select('_id').lean())
        .map((item) => item._id);
    if (targetIds.length === 0)
        return { updated: 0 };
    const existingReads = await AdminNotificationRead_1.default.find({
        adminUserId: userId,
        notificationId: { $in: targetIds },
    }).select('notificationId').lean();
    const alreadyReadSet = new Set(existingReads.map((item) => String(item.notificationId)));
    const unreadTargetIds = targetIds.filter((notificationId) => !alreadyReadSet.has(String(notificationId)));
    if (unreadTargetIds.length === 0)
        return { updated: 0 };
    await AdminNotificationRead_1.default.bulkWrite(unreadTargetIds.map((notificationId) => ({
        updateOne: {
            filter: { adminUserId: userId, notificationId },
            update: { $set: { readAt: new Date() } },
            upsert: true,
        },
    })));
    return { updated: unreadTargetIds.length };
}
async function markAdminAlertRead(userIdInput, id, role = 'admin') {
    return markAdminAlertsRead(userIdInput, [id], role);
}
async function markAllAdminAlertsRead(userIdInput, role = 'admin') {
    return markAdminAlertsRead(userIdInput, [], role);
}
//# sourceMappingURL=adminAlertService.js.map