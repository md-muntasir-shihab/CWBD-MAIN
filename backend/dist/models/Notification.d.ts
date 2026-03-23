import mongoose, { Document } from 'mongoose';
export type NotificationCategory = 'general' | 'exam' | 'update';
export type NotificationTargetRole = 'student' | 'admin' | 'moderator' | 'all';
export type NotificationType = 'contact_new' | 'support_ticket_new' | 'support_reply_new' | 'profile_update_request' | 'payment_review' | 'system_alert' | '';
export type NotificationPriority = 'normal' | 'high' | 'urgent';
export interface INotification extends Document {
    title: string;
    message: string;
    type?: NotificationType;
    messagePreview?: string;
    category: NotificationCategory;
    publishAt?: Date;
    expireAt?: Date;
    isActive: boolean;
    linkUrl?: string;
    sourceType?: string;
    sourceId?: string;
    targetRoute?: string;
    targetEntityId?: string;
    priority?: NotificationPriority;
    actorUserId?: mongoose.Types.ObjectId;
    actorNameSnapshot?: string;
    dedupeKey?: string;
    attachmentUrl?: string;
    targetRole: NotificationTargetRole;
    reminderKey?: string;
    targetUserIds?: mongoose.Types.ObjectId[];
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Notification.d.ts.map