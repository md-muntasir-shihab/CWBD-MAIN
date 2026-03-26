import mongoose, { Document } from 'mongoose';
export interface IQuietHours {
    enabled: boolean;
    startHour: number;
    endHour: number;
    timezone: string;
}
export interface ITriggerToggle {
    triggerKey: string;
    enabled: boolean;
    channels: ('sms' | 'email')[];
    guardianIncluded: boolean;
    templateKey?: string;
    delayMinutes?: number;
    batchSize?: number;
    retryEnabled?: boolean;
    quietHoursMode?: 'respect' | 'bypass';
    audienceMode?: 'affected' | 'subscription_active' | 'subscription_renewal_due' | 'custom';
}
export interface INotificationSettings extends Document {
    dailySmsLimit: number;
    dailyEmailLimit: number;
    monthlySmsBudgetBDT: number;
    monthlyEmailBudgetBDT: number;
    quietHours: IQuietHours;
    duplicatePreventionWindowMinutes: number;
    maxRetryCount: number;
    retryDelayMinutes: number;
    triggers: ITriggerToggle[];
    subscriptionReminderDays: number[];
    resultPublishAutoSend: boolean;
    resultPublishChannels: ('sms' | 'email')[];
    resultPublishGuardianIncluded: boolean;
    autoSyncCostToFinance: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INotificationSettings, {}, {}, {}, mongoose.Document<unknown, {}, INotificationSettings, {}, {}> & INotificationSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=NotificationSettings.d.ts.map