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
const StudentProfileSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    user_unique_id: { type: String, unique: true, sparse: true },
    full_name: { type: String, required: true, trim: true },
    guardian_name: { type: String, trim: true },
    username: { type: String, trim: true, lowercase: true },
    email: { type: String, trim: true, lowercase: true },
    profile_photo_url: { type: String },
    phone: { type: String, trim: true },
    phone_number: { type: String, unique: true, sparse: true, index: true },
    guardian_phone: { type: String, trim: true },
    guardian_email: { type: String, trim: true, lowercase: true },
    guardianOtpHash: { type: String, default: '' },
    guardianOtpExpiresAt: { type: Date, default: null },
    guardianPhoneVerifiedAt: { type: Date, default: null },
    guardianPhoneVerificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified'
    },
    roll_number: { type: String, trim: true, index: true },
    registration_id: { type: String, trim: true, index: true },
    institution_name: { type: String, trim: true, index: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    department: { type: String, enum: ['science', 'arts', 'commerce'] },
    ssc_batch: { type: String },
    hsc_batch: { type: String },
    admittedAt: { type: Date, default: null },
    groupIds: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentGroup' }], default: [] },
    college_name: { type: String },
    college_address: { type: String },
    present_address: { type: String },
    permanent_address: { type: String },
    district: { type: String },
    country: { type: String, default: 'Bangladesh' },
    profile_completion_percentage: { type: Number, default: 0, min: 0, max: 100 },
    points: { type: Number, default: 0, index: true },
    rank: { type: Number },
    examIdentity: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    examHistory: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    latestExamResultSummary: { type: String, default: '' },
    examDataLastSyncAt: { type: Date, default: null },
    examDataLastSyncSource: { type: String, default: '' },
}, { timestamps: true });
StudentProfileSchema.index({ full_name: 1 });
StudentProfileSchema.index({ institution_name: 1, roll_number: 1 });
StudentProfileSchema.index({ hsc_batch: 1, admittedAt: -1 });
StudentProfileSchema.index({ groupIds: 1 });
exports.default = mongoose_1.default.model('StudentProfile', StudentProfileSchema);
//# sourceMappingURL=StudentProfile.js.map