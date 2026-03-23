"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SiteSettingsSchema = new mongoose_1.Schema({
    siteName: { type: String, default: 'CampusWay' },
    tagline: { type: String, default: "Bangladesh's #1 University Admission Guide" },
    metaTitle: { type: String, default: 'CampusWay - University Admission Guide' },
    metaDescription: { type: String, default: 'Compare admission details, seat counts, exam dates for every university in Bangladesh.' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    footerText: { type: String, default: '© CampusWay. All rights reserved.' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
    socialLinks: [{
            platform: String,
            url: String,
            icon: String,
            description: { type: String, default: '' },
            enabled: { type: Boolean, default: true },
            placements: {
                type: [String],
                default: ['header', 'footer', 'home', 'news', 'contact'],
            },
        }],
    maintenanceMode: { type: Boolean, default: false },
    security: {
        singleBrowserLogin: { type: Boolean, default: true },
        forceLogoutOnNewLogin: { type: Boolean, default: true },
        enable2faAdmin: { type: Boolean, default: false },
        enable2faStudent: { type: Boolean, default: false },
        force2faSuperAdmin: { type: Boolean, default: false },
        default2faMethod: { type: String, enum: ['email', 'sms', 'authenticator'], default: 'email' },
        otpExpiryMinutes: { type: Number, default: 5 },
        maxOtpAttempts: { type: Number, default: 5 },
        ipChangeAlert: { type: Boolean, default: true },
        allowLegacyTokens: { type: Boolean, default: true },
        strictExamTabLock: { type: Boolean, default: false },
        strictTokenHashValidation: { type: Boolean, default: false },
        allowTestOtp: { type: Boolean, default: true },
        testOtpCode: { type: String, default: '123456' },
    },
    featureFlags: {
        studentDashboardV2: { type: Boolean, default: true },
        studentManagementV2: { type: Boolean, default: true },
        subscriptionEngineV2: { type: Boolean, default: false },
        examShareLinks: { type: Boolean, default: false },
        proctoringSignals: { type: Boolean, default: false },
        aiQuestionSuggestions: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: false },
        strictExamTabLock: { type: Boolean, default: false },
        webNextEnabled: { type: Boolean, default: false },
        studentRegistrationEnabled: { type: Boolean, default: false },
        financeDashboardV1: { type: Boolean, default: false },
        smsReminderEnabled: { type: Boolean, default: false },
        emailReminderEnabled: { type: Boolean, default: true },
        backupS3MirrorEnabled: { type: Boolean, default: false },
        nextAdminEnabled: { type: Boolean, default: false },
        nextStudentEnabled: { type: Boolean, default: false },
        trainingMode: { type: Boolean, default: false },
        requireDeleteKeywordConfirm: { type: Boolean, default: true },
    },
    notificationAutomation: {
        examStartsSoon: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [24, 3] },
        },
        applicationClosingSoon: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [72, 24] },
        },
        paymentPendingReminder: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [24] },
        },
        resultPublished: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [0] },
        },
        profileScoreGate: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [48, 12] },
            minScore: { type: Number, default: 70 },
        },
        templates: {
            languageMode: { type: String, enum: ['bn', 'en', 'mixed'], default: 'mixed' },
            examStartsSoon: { type: String, default: 'Exam starts soon. Stay prepared.' },
            applicationClosingSoon: { type: String, default: 'Application window is closing soon.' },
            paymentPendingReminder: { type: String, default: 'Your payment is pending. Submit proof to unlock access.' },
            resultPublished: { type: String, default: 'Your result is now published.' },
            profileScoreGate: { type: String, default: 'Complete your profile to reach the minimum score before exam.' },
        },
    },
    analyticsSettings: {
        enabled: { type: Boolean, default: true },
        trackAnonymous: { type: Boolean, default: true },
        retentionDays: { type: Number, default: 90 },
        eventToggles: {
            universityApplyClick: { type: Boolean, default: true },
            universityOfficialClick: { type: Boolean, default: true },
            newsView: { type: Boolean, default: true },
            newsShare: { type: Boolean, default: true },
            resourceDownload: { type: Boolean, default: true },
            examViewed: { type: Boolean, default: true },
            examStarted: { type: Boolean, default: true },
            examSubmitted: { type: Boolean, default: true },
            subscriptionPlanView: { type: Boolean, default: true },
            subscriptionPlanClick: { type: Boolean, default: true },
            supportTicketCreated: { type: Boolean, default: true },
        },
    },
    examCenterSettings: {
        defaultSyncMode: { type: String, enum: ['fill_missing_only', 'overwrite_mapped_fields'], default: 'overwrite_mapped_fields' },
        autoCreateExamCenters: { type: Boolean, default: true },
        notifyStudentsOnSync: { type: Boolean, default: true },
        notifyGuardiansOnResult: { type: Boolean, default: false },
        allowExternalImports: { type: Boolean, default: true },
    },
    adminUiLayout: {
        sidebarOrder: { type: [String], default: [] },
        settingsCardOrder: { type: [String], default: [] },
    },
    runtimeVersion: { type: Number, default: 1 },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('SiteSettings', SiteSettingsSchema);
//# sourceMappingURL=Settings.js.map