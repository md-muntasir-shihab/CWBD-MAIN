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
const NotificationSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['contact_new', 'support_ticket_new', 'support_reply_new', 'profile_update_request', 'payment_review', 'system_alert', ''],
        default: '',
        index: true,
    },
    messagePreview: { type: String, trim: true, default: '' },
    category: { type: String, enum: ['general', 'exam', 'update'], default: 'general' },
    publishAt: { type: Date, default: null },
    expireAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    linkUrl: { type: String, default: '' },
    sourceType: { type: String, trim: true, default: '', index: true },
    sourceId: { type: String, trim: true, default: '', index: true },
    targetRoute: { type: String, trim: true, default: '' },
    targetEntityId: { type: String, trim: true, default: '', index: true },
    priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    actorUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    actorNameSnapshot: { type: String, trim: true, default: '' },
    dedupeKey: { type: String, trim: true, default: undefined },
    attachmentUrl: { type: String, default: '' },
    targetRole: { type: String, enum: ['student', 'admin', 'moderator', 'all'], default: 'student' },
    reminderKey: { type: String, default: undefined },
    targetUserIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
NotificationSchema.index({ isActive: 1, publishAt: -1, createdAt: -1 });
NotificationSchema.index({ category: 1, isActive: 1 });
NotificationSchema.index({ targetRole: 1, createdAt: -1 });
NotificationSchema.index({ reminderKey: 1 }, { unique: true, sparse: true });
NotificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
NotificationSchema.index({ sourceId: 1, createdAt: -1 });
NotificationSchema.index({ targetEntityId: 1, createdAt: -1 });
exports.default = mongoose_1.default.model('Notification', NotificationSchema);
//# sourceMappingURL=Notification.js.map