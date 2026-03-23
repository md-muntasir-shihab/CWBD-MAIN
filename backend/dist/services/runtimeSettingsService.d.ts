import { SecurityConfig } from './securityConfigService';
export interface RuntimeFeatureFlags {
    studentDashboardV2: boolean;
    studentManagementV2: boolean;
    subscriptionEngineV2: boolean;
    examShareLinks: boolean;
    proctoringSignals: boolean;
    aiQuestionSuggestions: boolean;
    pushNotifications: boolean;
    strictExamTabLock: boolean;
    webNextEnabled: boolean;
    studentRegistrationEnabled: boolean;
    financeDashboardV1: boolean;
    smsReminderEnabled: boolean;
    emailReminderEnabled: boolean;
    backupS3MirrorEnabled: boolean;
    nextAdminEnabled: boolean;
    nextStudentEnabled: boolean;
    trainingMode: boolean;
    requireDeleteKeywordConfirm: boolean;
}
export interface RuntimeSettingsSnapshot {
    security: SecurityConfig;
    featureFlags: RuntimeFeatureFlags;
    updatedAt: Date | null;
    updatedBy: string | null;
    runtimeVersion: number;
}
export interface RuntimeSettingsUpdateInput {
    security?: Partial<SecurityConfig>;
    featureFlags?: Partial<RuntimeFeatureFlags>;
    updatedBy?: string;
}
export declare function getDefaultRuntimeFeatureFlags(): RuntimeFeatureFlags;
export declare function getRuntimeSettingsSnapshot(forceRefreshSecurity?: boolean): Promise<RuntimeSettingsSnapshot>;
export declare function updateRuntimeSettings(input: RuntimeSettingsUpdateInput): Promise<RuntimeSettingsSnapshot>;
//# sourceMappingURL=runtimeSettingsService.d.ts.map