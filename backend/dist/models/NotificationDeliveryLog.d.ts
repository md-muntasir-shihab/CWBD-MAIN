import mongoose, { Document } from 'mongoose';
export type DeliveryLogStatus = 'sent' | 'failed' | 'queued';
export interface INotificationDeliveryLog extends Document {
    jobId: mongoose.Types.ObjectId;
    campaignId?: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    guardianTargeted: boolean;
    channel: 'sms' | 'email';
    providerUsed: string;
    templateKey?: string;
    templateId?: mongoose.Types.ObjectId;
    to: string;
    status: DeliveryLogStatus;
    providerMessageId?: string;
    errorMessage?: string;
    originModule?: 'campaign' | 'news' | 'notice' | 'trigger';
    originEntityId?: string;
    originAction?: string;
    sentAtUTC?: Date;
    costAmount: number;
    retryCount: number;
    isTestSend?: boolean;
    recipientMode?: string;
    messageMode?: string;
    recipientDisplay?: string;
    renderedPreview?: string;
    financeSynced?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INotificationDeliveryLog, {}, {}, {}, mongoose.Document<unknown, {}, INotificationDeliveryLog, {}, {}> & INotificationDeliveryLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=NotificationDeliveryLog.d.ts.map