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
const StudentGroupSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortCode: { type: String, trim: true, uppercase: true, sparse: true },
    batchTag: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    studentCount: { type: Number, default: 0 },
    memberCountCached: { type: Number, default: 0 },
    createdByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['manual', 'dynamic'], default: 'manual' },
    // Visual / card UI
    color: { type: String, trim: true, default: '#6366f1' },
    icon: { type: String, trim: true, default: 'Users' },
    cardStyleVariant: { type: String, enum: ['solid', 'gradient', 'outline', 'minimal'], default: 'solid' },
    sortOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    // Academic targeting
    batch: { type: String, trim: true },
    department: { type: String, trim: true },
    // Admin policy defaults
    visibilityNote: { type: String, trim: true, default: '' },
    defaultExamVisibility: { type: String, enum: ['all_students', 'group_only', 'hidden'], default: 'all_students' },
    defaultCommunicationAudience: { type: Boolean, default: false },
    /** @deprecated */
    manualStudents: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    rules: {
        batches: [String],
        sscBatches: [String],
        departments: [String],
        statuses: [String],
        planCodes: [String],
        planIds: [String],
        groupIds: [String],
        bucket: { type: String, trim: true, default: '' },
        hasPhone: { type: Boolean, default: undefined },
        hasEmail: { type: Boolean, default: undefined },
        hasGuardian: { type: Boolean, default: undefined },
        paymentDue: { type: Boolean, default: undefined },
        renewalThresholdDays: { type: Number, default: undefined },
        profileScoreRange: {
            min: { type: Number },
            max: { type: Number },
        },
    },
    meta: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
StudentGroupSchema.index({ isActive: 1, batchTag: 1, name: 1 });
StudentGroupSchema.index({ type: 1 });
StudentGroupSchema.index({ sortOrder: 1, name: 1 });
StudentGroupSchema.index({ isFeatured: 1, isActive: 1 });
exports.default = mongoose_1.default.model('StudentGroup', StudentGroupSchema);
//# sourceMappingURL=StudentGroup.js.map