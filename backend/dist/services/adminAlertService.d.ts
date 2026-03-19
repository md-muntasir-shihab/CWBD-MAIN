import mongoose from 'mongoose';
import { type NotificationCategory, type NotificationTargetRole } from '../models/Notification';
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
        category: NotificationCategory;
        linkUrl: string;
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
export declare function markAdminAlertsRead(userIdInput: string | mongoose.Types.ObjectId, ids?: string[], role?: AlertAudienceRole): Promise<{
    updated: number;
}>;
export {};
//# sourceMappingURL=adminAlertService.d.ts.map