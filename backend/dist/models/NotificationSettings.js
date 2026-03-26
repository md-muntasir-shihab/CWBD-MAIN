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
const QuietHoursSchema = new mongoose_1.Schema({
    enabled: { type: Boolean, default: false },
    startHour: { type: Number, default: 22, min: 0, max: 23 },
    endHour: { type: Number, default: 7, min: 0, max: 23 },
    timezone: { type: String, default: 'Asia/Dhaka' },
}, { _id: false });
const TriggerToggleSchema = new mongoose_1.Schema({
    triggerKey: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    channels: [{ type: String, enum: ['sms', 'email'] }],
    guardianIncluded: { type: Boolean, default: false },
    templateKey: { type: String, trim: true, uppercase: true, default: '' },
    delayMinutes: { type: Number, default: 0, min: 0, max: 10080 },
    batchSize: { type: Number, default: 0, min: 0, max: 10000 },
    retryEnabled: { type: Boolean, default: true },
    quietHoursMode: { type: String, enum: ['respect', 'bypass'], default: 'respect' },
    audienceMode: {
        type: String,
        enum: ['affected', 'subscription_active', 'subscription_renewal_due', 'custom'],
        default: 'affected',
    },
}, { _id: false });
const NotificationSettingsSchema = new mongoose_1.Schema({
    dailySmsLimit: { type: Number, default: 500 },
    dailyEmailLimit: { type: Number, default: 2000 },
    monthlySmsBudgetBDT: { type: Number, default: 5000 },
    monthlyEmailBudgetBDT: { type: Number, default: 1000 },
    quietHours: { type: QuietHoursSchema, default: () => ({}) },
    duplicatePreventionWindowMinutes: { type: Number, default: 60 },
    maxRetryCount: { type: Number, default: 3 },
    retryDelayMinutes: { type: Number, default: 15 },
    triggers: { type: [TriggerToggleSchema], default: [] },
    subscriptionReminderDays: { type: [Number], default: [7, 3, 1] },
    resultPublishAutoSend: { type: Boolean, default: false },
    resultPublishChannels: [{ type: String, enum: ['sms', 'email'] }],
    resultPublishGuardianIncluded: { type: Boolean, default: false },
    autoSyncCostToFinance: { type: Boolean, default: true },
}, { timestamps: true });
exports.default = mongoose_1.default.model('NotificationSettings', NotificationSettingsSchema);
//# sourceMappingURL=NotificationSettings.js.map