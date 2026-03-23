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
const ScheduleWindowSchema = new mongoose_1.Schema({
    startDateTimeUTC: { type: Date, required: true },
    endDateTimeUTC: { type: Date, required: true },
    allowedDaysOfWeek: [{ type: Number, min: 0, max: 6 }],
    recurrence: {
        type: { type: String, enum: ['none', 'weekly', 'monthly'], default: 'none' },
        interval: { type: Number, default: 1 },
    },
}, { _id: false });
const ExamSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, default: '', trim: true },
    title_bn: { type: String, default: '' },
    type: { type: String, enum: ['Science', 'Arts', 'Commerce', 'Mixed'], default: 'Mixed' },
    group_category: { type: String, enum: ['SSC', 'HSC', 'Admission', 'Custom'], default: 'Custom' },
    examCategory: { type: String, default: '', index: true },
    subject: { type: String, required: true },
    subjectBn: { type: String, default: '' },
    universityNameBn: { type: String, default: '' },
    examType: { type: String, enum: ['mcq_only', 'written_optional'], default: 'mcq_only' },
    classes: { type: [String], default: [] },
    subjects: { type: [String], default: [] },
    chapters: { type: [String], default: [] },
    branchFilters: { type: [String], default: [] },
    batchFilters: { type: [String], default: [] },
    question_selection_rules: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    description: String,
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    duration: { type: Number, required: true },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkValue: { type: Number, default: 0.25 },
    randomizeQuestions: { type: Boolean, default: false },
    randomizeOptions: { type: Boolean, default: false },
    allowBackNavigation: { type: Boolean, default: true },
    showQuestionPalette: { type: Boolean, default: true },
    showRemainingTime: { type: Boolean, default: true },
    autoSubmitOnTimeout: { type: Boolean, default: true },
    allowPause: { type: Boolean, default: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    scheduleWindows: { type: [ScheduleWindowSchema], default: [] },
    answerEditLimitPerQuestion: { type: Number, default: undefined },
    deliveryMode: { type: String, enum: ['internal', 'external_link'], default: 'internal' },
    externalExamUrl: { type: String, default: null },
    examCenterId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ExamCenter', default: null },
    examCenterSnapshot: {
        name: { type: String, default: '' },
        address: { type: String, default: '' },
        code: { type: String, default: '' },
        note: { type: String, default: '' },
    },
    templateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ExamImportTemplate', default: null },
    importProfileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ExamMappingProfile', default: null },
    logoUrl: { type: String, default: '' },
    share_link: { type: String, default: '', trim: true },
    short_link: { type: String, default: '', trim: true },
    share_link_expires_at: { type: Date, default: null },
    bannerSource: { type: String, enum: ['upload', 'url', 'default'], default: 'default' },
    bannerImageUrl: { type: String, default: null },
    bannerAltText: { type: String, default: '' },
    resultPublishDate: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    publish_results_after_minutes: { type: Number, default: 0 },
    solutionReleaseRule: { type: String, enum: ['after_exam_end', 'after_result_publish', 'manual'], default: 'after_result_publish' },
    solutionsEnabled: { type: Boolean, default: false },
    defaultMarksPerQuestion: { type: Number, default: 1 },
    accessMode: { type: String, enum: ['all', 'specific'], default: 'all' },
    access_type: { type: String, enum: ['restricted', 'public_link'], default: 'restricted' },
    allowedUsers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    allowed_user_ids: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    assignedUniversityIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'University' }],
    attemptLimit: { type: Number, default: 1 },
    allowReAttempt: { type: Boolean, default: false },
    subscriptionRequired: { type: Boolean, default: false },
    paymentRequired: { type: Boolean, default: false },
    priceBDT: { type: Number, default: null },
    visibilityMode: { type: String, enum: ['all_students', 'group_only', 'subscription_only', 'custom'], default: 'all_students' },
    targetGroupIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentGroup' }],
    requiresActiveSubscription: { type: Boolean, default: false },
    requiresPayment: { type: Boolean, default: false },
    minimumProfileScore: { type: Number, default: null },
    targetAudienceSummaryCache: { type: String, default: '' },
    displayOnDashboard: { type: Boolean, default: true },
    displayOnPublicList: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    written_upload_enabled: { type: Boolean, default: false },
    security_policies: {
        tab_switch_limit: { type: Number, default: 3 },
        copy_paste_violations: { type: Number, default: 3 },
        camera_enabled: { type: Boolean, default: false },
        require_fullscreen: { type: Boolean, default: true },
        auto_submit_on_violation: { type: Boolean, default: false },
        violation_action: { type: String, enum: ['warn', 'submit', 'lock'], default: 'warn' },
    },
    autosave_interval_sec: { type: Number, default: 5 },
    resultPublishMode: { type: String, enum: ['immediate', 'manual', 'scheduled'], default: 'scheduled' },
    reviewSettings: {
        showQuestion: { type: Boolean, default: true },
        showSelectedAnswer: { type: Boolean, default: true },
        showCorrectAnswer: { type: Boolean, default: true },
        showExplanation: { type: Boolean, default: true },
        showSolutionImage: { type: Boolean, default: true },
    },
    certificateSettings: {
        enabled: { type: Boolean, default: false },
        minPercentage: { type: Number, default: 40 },
        passOnly: { type: Boolean, default: true },
        templateVersion: { type: String, default: 'v1' },
    },
    accessControl: {
        allowedGroupIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'StudentGroup' }],
        allowedPlanCodes: [{ type: String }],
        allowedUserIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    },
    instructions: { type: String, default: '' },
    require_instructions_agreement: { type: Boolean, default: true },
    status: { type: String, enum: ['draft', 'scheduled', 'live', 'closed'], default: 'draft' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    totalParticipants: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    lowestScore: { type: Number, default: 0 },
}, { timestamps: true, collection: 'exam_collection' });
ExamSchema.index({ startDate: 1, endDate: 1, isPublished: 1 });
ExamSchema.index({ status: 1 });
ExamSchema.index({ group_category: 1, startDate: 1 });
ExamSchema.index({ isPublished: 1, startDate: 1, endDate: 1, group_category: 1 });
ExamSchema.index({ share_link: 1 }, { unique: true, sparse: true });
ExamSchema.index({ slug: 1 }, { unique: true, sparse: true });
ExamSchema.pre('validate', function validateExternalExamConfig(next) {
    const doc = this;
    const deliveryMode = String(doc.deliveryMode || 'internal').trim().toLowerCase();
    const externalExamUrl = String(doc.externalExamUrl || '').trim();
    const slugSeed = String(doc.slug || doc.title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    if (!doc.slug) {
        doc.slug = slugSeed || `exam-${Date.now()}`;
    }
    else {
        doc.slug = slugSeed || doc.slug;
    }
    if (deliveryMode === 'external_link') {
        if (!externalExamUrl) {
            next(new Error('externalExamUrl is required when deliveryMode is external_link.'));
            return;
        }
        try {
            const parsed = new URL(externalExamUrl);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                next(new Error('externalExamUrl must start with http:// or https://'));
                return;
            }
            doc.externalExamUrl = parsed.toString();
        }
        catch {
            next(new Error('externalExamUrl must be a valid URL.'));
            return;
        }
    }
    else {
        doc.deliveryMode = 'internal';
        doc.externalExamUrl = undefined;
    }
    next();
});
exports.default = mongoose_1.default.model('Exam', ExamSchema);
//# sourceMappingURL=Exam.js.map