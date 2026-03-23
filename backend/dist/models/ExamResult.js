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
const ExamResultSchema = new mongoose_1.Schema({
    exam: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNo: { type: Number, default: 1 },
    sourceType: { type: String, enum: ['internal_submission', 'external_import'], default: 'internal_submission' },
    importJobId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ExamImportJob', default: null },
    syncStatus: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    profileSyncLogId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ExamProfileSyncLog', default: null },
    answers: [{
            question: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Question' },
            questionType: { type: String, enum: ['mcq', 'written'], required: true, default: 'mcq' },
            selectedAnswer: String,
            writtenAnswerUrl: String,
            isCorrect: Boolean,
            timeTaken: Number,
        }],
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    rank: Number,
    serialId: { type: String, default: '' },
    rollNumber: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    admitCardNumber: { type: String, default: '' },
    attendanceStatus: { type: String, default: '' },
    passFail: { type: String, default: '' },
    resultNote: { type: String, default: '' },
    profileUpdateNote: { type: String, default: '' },
    examCenterName: { type: String, default: '' },
    examCenterCode: { type: String, default: '' },
    subjectMarks: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    pointsEarned: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    deviceInfo: String,
    browserInfo: String,
    ipAddress: String,
    tabSwitchCount: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    isAutoSubmitted: { type: Boolean, default: false },
    cheat_flags: [{
            reason: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }],
    status: { type: String, enum: ['submitted', 'evaluated'], default: 'evaluated' },
}, { timestamps: true, collection: 'student_results' });
ExamResultSchema.index({ exam: 1, student: 1, attemptNo: 1 }, { unique: true });
ExamResultSchema.index({ exam: 1, obtainedMarks: -1 });
ExamResultSchema.index({ student: 1, submittedAt: -1 });
exports.default = mongoose_1.default.model('ExamResult', ExamResultSchema);
//# sourceMappingURL=ExamResult.js.map