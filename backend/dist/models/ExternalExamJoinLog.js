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
const ExternalExamJoinLogSchema = new mongoose_1.Schema({
    examId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinedAt: { type: Date, default: Date.now, index: true },
    attemptNo: { type: Number, default: 1 },
    attemptRef: { type: String, default: '', trim: true, index: true },
    status: { type: String, enum: ['awaiting_result', 'imported'], default: 'awaiting_result' },
    sourcePanel: { type: String, default: 'exam_start' },
    registration_id_snapshot: { type: String, default: '' },
    user_unique_id_snapshot: { type: String, default: '' },
    username_snapshot: { type: String, default: '' },
    email_snapshot: { type: String, default: '' },
    phone_number_snapshot: { type: String, default: '' },
    full_name_snapshot: { type: String, default: '' },
    groupIds_snapshot: { type: [String], default: [] },
    externalExamUrl: { type: String, default: '' },
    importedResultId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ExamResult', default: null },
    importedAt: { type: Date, default: null },
    matchedBy: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
}, { timestamps: true, collection: 'external_exam_join_logs' });
ExternalExamJoinLogSchema.index({ examId: 1, joinedAt: -1 });
ExternalExamJoinLogSchema.index({ studentId: 1, joinedAt: -1 });
ExternalExamJoinLogSchema.index({ examId: 1, studentId: 1, attemptNo: 1 });
ExternalExamJoinLogSchema.index({ attemptRef: 1 }, { sparse: true });
exports.default = mongoose_1.default.model('ExternalExamJoinLog', ExternalExamJoinLogSchema);
//# sourceMappingURL=ExternalExamJoinLog.js.map