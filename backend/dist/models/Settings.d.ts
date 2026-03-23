import mongoose, { Document } from 'mongoose';
export interface ISiteSettings extends Document {
    siteName: string;
    tagline: string;
    metaTitle: string;
    metaDescription: string;
    logoUrl: string;
    faviconUrl: string;
    footerText: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    socialLinks: {
        platform: string;
        url: string;
        icon?: string;
        description?: string;
        enabled?: boolean;
        placements?: Array<'header' | 'footer' | 'home' | 'news' | 'contact'>;
    }[];
    maintenanceMode: boolean;
    security: {
        singleBrowserLogin: boolean;
        forceLogoutOnNewLogin: boolean;
        enable2faAdmin: boolean;
        enable2faStudent: boolean;
        force2faSuperAdmin: boolean;
        default2faMethod: 'email' | 'sms' | 'authenticator';
        otpExpiryMinutes: number;
        maxOtpAttempts: number;
        ipChangeAlert: boolean;
        allowLegacyTokens: boolean;
        strictExamTabLock: boolean;
        strictTokenHashValidation: boolean;
        allowTestOtp: boolean;
        testOtpCode: string;
    };
    featureFlags: {
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
    };
    notificationAutomation: {
        examStartsSoon: {
            enabled: boolean;
            hoursBefore: number[];
        };
        applicationClosingSoon: {
            enabled: boolean;
            hoursBefore: number[];
        };
        paymentPendingReminder: {
            enabled: boolean;
            hoursBefore: number[];
        };
        resultPublished: {
            enabled: boolean;
            hoursBefore: number[];
        };
        profileScoreGate: {
            enabled: boolean;
            hoursBefore: number[];
            minScore: number;
        };
        templates: {
            languageMode: 'bn' | 'en' | 'mixed';
            examStartsSoon: string;
            applicationClosingSoon: string;
            paymentPendingReminder: string;
            resultPublished: string;
            profileScoreGate: string;
        };
    };
    analyticsSettings: {
        enabled: boolean;
        trackAnonymous: boolean;
        retentionDays: number;
        eventToggles: {
            universityApplyClick: boolean;
            universityOfficialClick: boolean;
            newsView: boolean;
            newsShare: boolean;
            resourceDownload: boolean;
            examViewed: boolean;
            examStarted: boolean;
            examSubmitted: boolean;
            subscriptionPlanView: boolean;
            subscriptionPlanClick: boolean;
            supportTicketCreated: boolean;
        };
    };
    examCenterSettings: {
        defaultSyncMode: 'fill_missing_only' | 'overwrite_mapped_fields';
        autoCreateExamCenters: boolean;
        notifyStudentsOnSync: boolean;
        notifyGuardiansOnResult: boolean;
        allowExternalImports: boolean;
    };
    adminUiLayout: {
        sidebarOrder: string[];
        settingsCardOrder: string[];
    };
    runtimeVersion: number;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ISiteSettings, {}, {}, {}, mongoose.Document<unknown, {}, ISiteSettings, {}, {}> & ISiteSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Settings.d.ts.map