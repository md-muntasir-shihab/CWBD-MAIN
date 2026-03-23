import mongoose, { Document } from 'mongoose';
export interface IScheduleWindow {
    startDateTimeUTC: Date;
    endDateTimeUTC: Date;
    allowedDaysOfWeek?: number[];
    recurrence?: {
        type: 'none' | 'weekly' | 'monthly';
        interval: number;
    };
}
export interface IExam extends Document {
    title: string;
    slug?: string;
    title_bn?: string;
    type?: 'Science' | 'Arts' | 'Commerce' | 'Mixed';
    group_category?: 'SSC' | 'HSC' | 'Admission' | 'Custom';
    examCategory?: string;
    subject: string;
    subjectBn?: string;
    universityNameBn?: string;
    examType?: 'mcq_only' | 'written_optional';
    classes?: string[];
    subjects?: string[];
    chapters?: string[];
    branchFilters?: string[];
    batchFilters?: string[];
    question_selection_rules?: any[];
    description?: string;
    totalQuestions: number;
    totalMarks: number;
    duration: number;
    negativeMarking: boolean;
    negativeMarkValue: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    allowBackNavigation: boolean;
    showQuestionPalette: boolean;
    showRemainingTime: boolean;
    autoSubmitOnTimeout: boolean;
    allowPause: boolean;
    startDate: Date;
    endDate: Date;
    scheduleWindows: IScheduleWindow[];
    answerEditLimitPerQuestion?: number;
    deliveryMode?: 'internal' | 'external_link';
    externalExamUrl?: string;
    examCenterId?: mongoose.Types.ObjectId | null;
    examCenterSnapshot?: {
        name?: string;
        address?: string;
        code?: string;
        note?: string;
    };
    templateId?: mongoose.Types.ObjectId | null;
    importProfileId?: mongoose.Types.ObjectId | null;
    logoUrl?: string;
    share_link?: string;
    short_link?: string;
    share_link_expires_at?: Date;
    bannerSource?: 'upload' | 'url' | 'default';
    bannerImageUrl?: string;
    bannerAltText?: string;
    resultPublishDate: Date;
    isPublished: boolean;
    publish_results_after_minutes?: number;
    resultPublishMode?: 'immediate' | 'manual' | 'scheduled';
    solutionReleaseRule?: 'after_exam_end' | 'after_result_publish' | 'manual';
    solutionsEnabled?: boolean;
    defaultMarksPerQuestion: number;
    accessMode: 'all' | 'specific';
    access_type?: 'restricted' | 'public_link';
    allowedUsers: mongoose.Types.ObjectId[];
    allowed_user_ids?: mongoose.Types.ObjectId[];
    assignedUniversityIds: mongoose.Types.ObjectId[];
    attemptLimit: number;
    allowReAttempt?: boolean;
    subscriptionRequired?: boolean;
    paymentRequired?: boolean;
    priceBDT?: number;
    visibilityMode?: 'all_students' | 'group_only' | 'subscription_only' | 'custom';
    targetGroupIds?: mongoose.Types.ObjectId[];
    requiresActiveSubscription?: boolean;
    requiresPayment?: boolean;
    minimumProfileScore?: number;
    targetAudienceSummaryCache?: string;
    displayOnDashboard?: boolean;
    displayOnPublicList?: boolean;
    isActive?: boolean;
    written_upload_enabled?: boolean;
    security_policies?: {
        tab_switch_limit: number;
        copy_paste_violations: number;
        camera_enabled: boolean;
        require_fullscreen: boolean;
        auto_submit_on_violation: boolean;
        violation_action?: 'warn' | 'submit' | 'lock';
    };
    autosave_interval_sec?: number;
    reviewSettings?: {
        showQuestion: boolean;
        showSelectedAnswer: boolean;
        showCorrectAnswer: boolean;
        showExplanation: boolean;
        showSolutionImage: boolean;
    };
    certificateSettings?: {
        enabled: boolean;
        minPercentage: number;
        passOnly: boolean;
        templateVersion: string;
    };
    accessControl?: {
        allowedGroupIds: mongoose.Types.ObjectId[];
        allowedPlanCodes: string[];
        allowedUserIds: mongoose.Types.ObjectId[];
    };
    instructions?: string;
    require_instructions_agreement?: boolean;
    status: 'draft' | 'scheduled' | 'live' | 'closed';
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    totalParticipants: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
}
declare const _default: mongoose.Model<IExam, {}, {}, {}, mongoose.Document<unknown, {}, IExam, {}, {}> & IExam & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Exam.d.ts.map