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
const SupportTicketTimelineSchema = new mongoose_1.Schema({
    actorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, trim: true, required: true },
    message: { type: String, trim: true, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const SupportTicketSchema = new mongoose_1.Schema({
    ticketNo: { type: String, required: true, unique: true, index: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    subscriptionSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    messageCount: { type: Number, default: 0, min: 0 },
    latestMessagePreview: { type: String, trim: true, default: '' },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessageSenderType: { type: String, enum: ['student', 'admin', 'system', null], default: null },
    unreadCountForAdmin: { type: Number, default: 0, min: 0, index: true },
    unreadCountForUser: { type: Number, default: 0, min: 0, index: true },
    threadState: {
        type: String,
        enum: ['pending', 'replied', 'idle', 'resolved', 'closed'],
        default: 'pending',
        index: true,
    },
    timeline: { type: [SupportTicketTimelineSchema], default: [] },
}, { timestamps: true, collection: 'support_tickets' });
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ studentId: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ threadState: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ unreadCountForAdmin: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ unreadCountForUser: 1, lastMessageAt: -1 });
exports.default = mongoose_1.default.model('SupportTicket', SupportTicketSchema);
//# sourceMappingURL=SupportTicket.js.map