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
function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}
function normalizePhone(value) {
    return String(value || '').replace(/\D+/g, '');
}
const ContactMessageSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['new', 'opened', 'replied', 'resolved', 'archived'],
        default: 'new',
        index: true,
    },
    unreadByAdmin: { type: Boolean, default: true, index: true },
    adminOpenedAt: { type: Date, default: null },
    sourceType: {
        type: String,
        enum: ['public', 'user', 'student', 'subscriber'],
        default: 'public',
        index: true,
    },
    linkedUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    linkedStudentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    matchedBy: {
        type: String,
        enum: ['email', 'phone', 'userId', 'none'],
        default: 'none',
    },
    normalizedEmail: { type: String, trim: true, default: '', index: true },
    normalizedPhone: { type: String, trim: true, default: '', index: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    isReplied: { type: Boolean, default: false },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
}, { timestamps: true });
ContactMessageSchema.pre('validate', function syncLegacyState(next) {
    this.email = normalizeEmail(this.email);
    this.normalizedEmail = normalizeEmail(this.normalizedEmail || this.email);
    this.normalizedPhone = normalizePhone(this.normalizedPhone || this.phone);
    const hasCanonicalStatus = Boolean(this.status);
    if (!hasCanonicalStatus) {
        if (this.isReplied)
            this.status = 'replied';
        else if (this.isRead)
            this.status = 'opened';
        else
            this.status = 'new';
    }
    if (this.unreadByAdmin === undefined || this.unreadByAdmin === null) {
        this.unreadByAdmin = !Boolean(this.isRead);
    }
    if (this.adminOpenedAt === undefined) {
        this.adminOpenedAt = null;
    }
    if (!this.unreadByAdmin && !this.adminOpenedAt) {
        this.adminOpenedAt = this.updatedAt || new Date();
    }
    if (this.status === 'resolved' || this.status === 'archived') {
        this.unreadByAdmin = false;
    }
    this.isRead = !this.unreadByAdmin;
    this.isReplied = ['replied', 'resolved', 'archived'].includes(this.status);
    if (!this.unreadByAdmin && this.status === 'new') {
        this.status = 'opened';
    }
    if (this.unreadByAdmin && ['opened', 'resolved', 'archived'].includes(this.status)) {
        this.unreadByAdmin = false;
    }
    next();
});
ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ unreadByAdmin: 1, createdAt: -1 });
ContactMessageSchema.index({ linkedUserId: 1, createdAt: -1 });
ContactMessageSchema.index({ linkedStudentId: 1, createdAt: -1 });
exports.default = mongoose_1.default.model('ContactMessage', ContactMessageSchema);
//# sourceMappingURL=ContactMessage.js.map