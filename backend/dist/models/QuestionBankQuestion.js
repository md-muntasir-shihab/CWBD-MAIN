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
const BankQuestionOptionSchema = new mongoose_1.Schema({
    key: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    text_en: { type: String, default: '' },
    text_bn: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
}, { _id: false });
const QuestionBankQuestionSchema = new mongoose_1.Schema({
    bankQuestionId: { type: String, trim: true, sparse: true, unique: true },
    subject: { type: String, required: true, trim: true, index: true },
    moduleCategory: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    topic: { type: String, trim: true, default: '', index: true },
    subtopic: { type: String, trim: true, default: '' },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
        index: true,
    },
    languageMode: {
        type: String,
        enum: ['en', 'bn', 'both'],
        default: 'en',
    },
    question_en: { type: String, default: '' },
    question_bn: { type: String, default: '' },
    questionImageUrl: { type: String, default: '' },
    questionFormulaLatex: { type: String, default: '' },
    options: { type: [BankQuestionOptionSchema], default: [] },
    correctKey: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    explanation_en: { type: String, default: '' },
    explanation_bn: { type: String, default: '' },
    explanationImageUrl: { type: String, default: '' },
    marks: { type: Number, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },
    tags: { type: [String], default: [], index: true },
    sourceLabel: { type: String, default: '' },
    chapter: { type: String, default: '' },
    boardOrPattern: { type: String, default: '' },
    yearOrSession: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    createdByAdminId: { type: String, default: '' },
    updatedByAdminId: { type: String, default: '' },
    contentHash: { type: String, default: '' },
    versionNo: { type: Number, default: 1 },
    parentQuestionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'QuestionBankQuestion',
        default: null,
    },
}, {
    timestamps: true,
    collection: 'question_bank_questions',
});
QuestionBankQuestionSchema.index({ subject: 1, moduleCategory: 1, topic: 1 });
QuestionBankQuestionSchema.index({ isActive: 1, isArchived: 1 });
QuestionBankQuestionSchema.index({ contentHash: 1 }, { sparse: true });
QuestionBankQuestionSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model('QuestionBankQuestion', QuestionBankQuestionSchema);
//# sourceMappingURL=QuestionBankQuestion.js.map