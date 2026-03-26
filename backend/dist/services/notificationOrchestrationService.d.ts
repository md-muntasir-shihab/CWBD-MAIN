/**
 * Notification Orchestration Service
 *
 * Resolves audience → recipients → channels → template rendering →
 * provider send → delivery log → finance sync → audit log.
 *
 * Supports: manual campaigns, automatic triggers, result publishing,
 * guardian combinations, duplicate prevention, quiet hours,
 * delayed scheduling, test-send, preview/estimate.
 */
import mongoose from 'mongoose';
export interface RecipientInfo {
    userId: mongoose.Types.ObjectId;
    phone?: string;
    email?: string;
    fullName: string;
    isGuardian?: boolean;
    guardianPhone?: string;
    guardianEmail?: string;
    guardianName?: string;
}
export interface CampaignSendOptions {
    campaignName: string;
    channels: ('sms' | 'email')[];
    templateKey?: string;
    customBody?: string;
    customSubject?: string;
    vars?: Record<string, string>;
    audienceType: 'group' | 'filter' | 'manual' | 'all';
    audienceGroupId?: string;
    audienceFilters?: Record<string, unknown>;
    manualStudentIds?: string[];
    includeUserIds?: string[];
    excludeUserIds?: string[];
    guardianTargeted?: boolean;
    recipientMode?: 'student' | 'guardian' | 'both';
    scheduledAtUTC?: Date;
    quietHoursMode?: 'respect' | 'bypass';
    adminId: string;
    triggerKey?: string;
    testSend?: boolean;
    originModule?: 'campaign' | 'news' | 'notice' | 'trigger';
    originEntityId?: string;
    originAction?: string;
}
export interface PreviewEstimate {
    recipientCount: number;
    guardianCount: number;
    channelBreakdown: {
        sms: number;
        email: number;
    };
    estimatedCostBDT: number;
    sampleRendered?: {
        subject?: string;
        body: string;
    };
}
export declare function resolveAudience(audienceType: CampaignSendOptions['audienceType'], opts: {
    groupId?: string;
    filters?: Record<string, unknown>;
    manualStudentIds?: string[];
    includeUserIds?: string[];
    excludeUserIds?: string[];
}): Promise<RecipientInfo[]>;
export declare function previewAndEstimate(opts: CampaignSendOptions): Promise<PreviewEstimate>;
export declare function executeCampaign(opts: CampaignSendOptions): Promise<{
    jobId: string;
    sent: number;
    failed: number;
    skipped: number;
}>;
export declare function processQueuedNotificationJobs(limit?: number): Promise<{
    processed: number;
    failed: number;
}>;
export declare function retryFailedDeliveries(jobId: string, adminId: string): Promise<{
    retried: number;
    succeeded: number;
    failed: number;
}>;
export declare function triggerAutoSend(triggerKey: string, studentIds: string[], vars: Record<string, string>, adminId: string): Promise<{
    jobId: string;
    sent: number;
    failed: number;
}>;
//# sourceMappingURL=notificationOrchestrationService.d.ts.map