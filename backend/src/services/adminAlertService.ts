import mongoose from 'mongoose';
import Notification, { type NotificationCategory, type NotificationTargetRole } from '../models/Notification';
import AdminNotificationRead from '../models/AdminNotificationRead';

type AlertAudienceRole = 'superadmin' | 'admin' | 'moderator';

type CreateAlertInput = {
    title: string;
    message: string;
    category?: NotificationCategory;
    linkUrl?: string;
    targetRole?: NotificationTargetRole;
    targetUserIds?: Array<string | mongoose.Types.ObjectId>;
    createdBy?: string | mongoose.Types.ObjectId | null;
};

type QueryAlertsInput = {
    userId: string | mongoose.Types.ObjectId;
    role: AlertAudienceRole;
    page?: number;
    limit?: number;
};

function toObjectId(value: string | mongoose.Types.ObjectId | null | undefined): mongoose.Types.ObjectId | null {
    if (!value) return null;
    if (value instanceof mongoose.Types.ObjectId) return value;
    const raw = String(value || '').trim();
    if (!mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function toObjectIdList(values: Array<string | mongoose.Types.ObjectId> = []): mongoose.Types.ObjectId[] {
    const seen = new Set<string>();
    const output: mongoose.Types.ObjectId[] = [];
    for (const value of values) {
        const objectId = toObjectId(value);
        if (!objectId) continue;
        const key = String(objectId);
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(objectId);
    }
    return output;
}

function resolveAllowedRoles(role: AlertAudienceRole): NotificationTargetRole[] {
    if (role === 'moderator') return ['moderator', 'all'];
    return ['admin', 'all'];
}

export async function createAdminAlert(input: CreateAlertInput) {
    const targetUserIds = toObjectIdList(input.targetUserIds);
    const createdBy = toObjectId(input.createdBy || null);
    return Notification.create({
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

export async function createStudentNotification(input: CreateAlertInput) {
    const targetUserIds = toObjectIdList(input.targetUserIds);
    const createdBy = toObjectId(input.createdBy || null);
    return Notification.create({
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

export async function queryAdminAlerts(input: QueryAlertsInput) {
    const userId = toObjectId(input.userId);
    if (!userId) {
        return { items: [], total: 0, unreadCount: 0, page: 1, pages: 1 };
    }

    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    const skip = (page - 1) * limit;
    const now = new Date();

    const filter: Record<string, unknown> = {
        isActive: true,
        targetRole: { $in: resolveAllowedRoles(input.role) },
        $or: [
            { targetUserIds: { $exists: false } },
            { targetUserIds: { $size: 0 } },
            { targetUserIds: userId },
        ],
        $and: [
            { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
        ],
    };

    const [rows, total] = await Promise.all([
        Notification.find(filter).sort({ publishAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
    ]);

    const notificationIds = rows.map((row) => row._id);
    const reads = notificationIds.length > 0
        ? await AdminNotificationRead.find({
            adminUserId: userId,
            notificationId: { $in: notificationIds },
        }).lean()
        : [];
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
        unreadCount: items.filter((item) => !item.isRead).length,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
    };
}

export async function markAdminAlertsRead(
    userIdInput: string | mongoose.Types.ObjectId,
    ids: string[] = [],
    role: AlertAudienceRole = 'admin',
) {
    const userId = toObjectId(userIdInput);
    if (!userId) return { updated: 0 };

    const cleanIds = ids
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    let targetIds = cleanIds;
    if (targetIds.length === 0) {
        const { items } = await queryAdminAlerts({ userId, role, page: 1, limit: 100 });
        targetIds = items
            .map((item) => String(item._id))
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));
    }

    if (targetIds.length === 0) return { updated: 0 };

    await AdminNotificationRead.bulkWrite(
        targetIds.map((notificationId) => ({
            updateOne: {
                filter: { adminUserId: userId, notificationId },
                update: { $set: { readAt: new Date() } },
                upsert: true,
            },
        }))
    );

    return { updated: targetIds.length };
}
