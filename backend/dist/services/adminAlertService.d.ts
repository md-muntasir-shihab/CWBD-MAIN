import mongoose from 'mongoose';
import { type NotificationCategory, type NotificationPriority, type NotificationTargetRole, type NotificationType } from '../models/Notification';
type AlertAudienceRole = 'superadmin' | 'admin' | 'moderator' | 'viewer' | 'support_agent' | 'finance_agent';
type CreateAlertInput = {
    title: string;
    message: string;
    type?: NotificationType;
    messagePreview?: string;
    category?: NotificationCategory;
    linkUrl?: string;
    sourceType?: string;
    sourceId?: string;
    targetRoute?: string;
    targetEntityId?: string;
    priority?: NotificationPriority;
    actorUserId?: string | mongoose.Types.ObjectId | null;
    actorNameSnapshot?: string;
    targetRole?: NotificationTargetRole;
    targetUserIds?: Array<string | mongoose.Types.ObjectId>;
    createdBy?: string | mongoose.Types.ObjectId | null;
    dedupeKey?: string;
};
type QueryAlertsInput = {
    userId: string | mongoose.Types.ObjectId;
    role: AlertAudienceRole;
    page?: number;
    limit?: number;
    unread?: boolean;
    type?: string;
};
export declare function createAdminAlert(input: CreateAlertInput): Promise<mongoose.Document<unknown, {}, import("../models/Notification").INotification, {}, {}> & import("../models/Notification").INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function createStudentNotification(input: CreateAlertInput): Promise<mongoose.Document<unknown, {}, import("../models/Notification").INotification, {}, {}> & import("../models/Notification").INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function queryAdminAlerts(input: QueryAlertsInput): Promise<{
    items: {
        _id: string;
        title: string;
        message: string;
        type: string;
        messagePreview: string;
        category: NotificationCategory;
        linkUrl: string;
        sourceType: string;
        sourceId: string;
        targetRoute: string;
        targetEntityId: string;
        priority: NotificationPriority;
        actorUserId: string;
        actorNameSnapshot: string;
        publishAt: Date;
        createdAt: Date;
        isRead: boolean;
        targetRole: NotificationTargetRole;
    }[];
    total: number;
    unreadCount: number;
    page: number;
    pages: number;
}>;
export declare function countAdminUnreadAlerts(userId: string | mongoose.Types.ObjectId, role: AlertAudienceRole, type?: string): Promise<{
    unreadCount: number;
}>;
export declare function markAdminAlertsRead(userIdInput: string | mongoose.Types.ObjectId, ids?: string[], role?: AlertAudienceRole): Promise<{
    updated: number;
}>;
export declare function markAdminAlertRead(userIdInput: string | mongoose.Types.ObjectId, id: string, role?: AlertAudienceRole): Promise<{
    updated: number;
}>;
export declare function markAllAdminAlertsRead(userIdInput: string | mongoose.Types.ObjectId, role?: AlertAudienceRole): Promise<{
    updated: number;
}>;
export {};
//# sourceMappingURL=adminAlertService.d.ts.map