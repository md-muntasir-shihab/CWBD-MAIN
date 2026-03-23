import mongoose, { Document } from 'mongoose';
export type NotificationJobType = 'scheduled' | 'bulk' | 'triggered' | 'test_send';
export type NotificationJobChannel = 'sms' | 'email' | 'both';
export type NotificationJobTarget = 'single' | 'group' | 'filter' | 'selected';
export type NotificationJobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'partial';
export interface INotificationJob extends Document {
    campaignName?: string;
    type: NotificationJobType;
    channel: NotificationJobChannel;
    target: NotificationJobTarget;
    targetStudentId?: mongoose.Types.ObjectId;
    targetGroupId?: mongoose.Types.ObjectId;
    targetStudentIds?: mongoose.Types.ObjectId[];
    targetFilterJson?: string;
    audienceType?: string;
    audienceRef?: string;
    templateKey: string;
    templateIds?: mongoose.Types.ObjectId[];
    payloadOverrides?: Record<string, string>;
    customBody?: string;
    customSubject?: string;
    selectedFieldMap?: Record<string, boolean>;
    recipientMode?: string;
    guardianTargeted: boolean;
    status: NotificationJobStatus;
    scheduledAtUTC?: Date;
    processedAtUTC?: Date;
    lastAttemptedAtUTC?: Date;
    nextRetryAtUTC?: Date;
    totalTargets: number;
    sentCount: number;
    failedCount: number;
    estimatedCost: number;
    actualCost: number;
    triggerKey?: string;
    duplicatePreventionKey?: string;
    originModule?: 'campaign' | 'news' | 'notice' | 'trigger';
    originEntityId?: string;
    originAction?: string;
    quietHoursApplied: boolean;
    createdByAdminId: mongoose.Types.ObjectId;
    errorMessage?: string;
    isTestSend?: boolean;
    testMeta?: {
        recipientMode?: string;
        messageMode?: string;
        recipientDisplay?: string;
        renderedPreview?: string;
        providerId?: string;
        logOnly?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INotificationJob, {}, {}, {}, mongoose.Document<unknown, {}, INotificationJob, {}, {}> & INotificationJob & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=NotificationJob.d.ts.map