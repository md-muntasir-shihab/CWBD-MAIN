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
const NotificationJobSchema = new mongoose_1.Schema({
    campaignName: { type: String, trim: true },
    type: {
        type: String,
        enum: ['scheduled', 'bulk', 'triggered', 'test_send'],
        required: true,
        index: true,
    },
    channel: {
        type: String,
        enum: ['sms', 'email', 'both'],
        required: true,
    },
    target: {
        type: String,
        enum: ['single', 'group', 'filter', 'selected'],
        required: true,
    },
    targetStudentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    targetGroupId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentGroup' },
    targetStudentIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    targetFilterJson: { type: String },
    audienceType: { type: String, trim: true },
    audienceRef: { type: String, trim: true },
    templateKey: { type: String, required: true, trim: true, uppercase: true },
    templateIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'NotificationTemplate' }],
    payloadOverrides: { type: mongoose_1.Schema.Types.Mixed },
    customBody: { type: String },
    customSubject: { type: String },
    selectedFieldMap: { type: mongoose_1.Schema.Types.Mixed },
    recipientMode: { type: String, trim: true },
    guardianTargeted: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['queued', 'processing', 'done', 'failed', 'partial'],
        default: 'queued',
        index: true,
    },
    scheduledAtUTC: { type: Date },
    processedAtUTC: { type: Date },
    lastAttemptedAtUTC: { type: Date },
    nextRetryAtUTC: { type: Date },
    totalTargets: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    estimatedCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, default: 0, min: 0 },
    triggerKey: { type: String, trim: true, uppercase: true },
    duplicatePreventionKey: { type: String, trim: true, sparse: true },
    originModule: { type: String, enum: ['campaign', 'news', 'notice', 'trigger'], default: 'campaign', index: true },
    originEntityId: { type: String, trim: true, default: '' },
    originAction: { type: String, trim: true, default: '' },
    quietHoursApplied: { type: Boolean, default: false },
    createdByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    errorMessage: { type: String },
    isTestSend: { type: Boolean, default: false, index: true },
    testMeta: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
}, { timestamps: true, collection: 'notification_jobs' });
NotificationJobSchema.index({ status: 1, scheduledAtUTC: 1 });
NotificationJobSchema.index({ createdByAdminId: 1, createdAt: -1 });
NotificationJobSchema.index({ originModule: 1, originEntityId: 1, createdAt: -1 });
exports.default = mongoose_1.default.model('NotificationJob', NotificationJobSchema);
//# sourceMappingURL=NotificationJob.js.map