import mongoose, { Document } from 'mongoose';
export interface IExamResult extends Document {
    exam: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    attemptNo: number;
    sourceType?: 'internal_submission' | 'external_import';
    importJobId?: mongoose.Types.ObjectId | null;
    syncStatus?: 'pending' | 'synced' | 'failed';
    profileSyncLogId?: mongoose.Types.ObjectId | null;
    answers: {
        question: mongoose.Types.ObjectId;
        questionType: 'mcq' | 'written';
        selectedAnswer: string;
        writtenAnswerUrl?: string;
        isCorrect: boolean;
        timeTaken: number;
    }[];
    totalMarks: number;
    obtainedMarks: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    percentage: number;
    rank?: number;
    serialId?: string;
    rollNumber?: string;
    registrationNumber?: string;
    admitCardNumber?: string;
    attendanceStatus?: string;
    passFail?: string;
    resultNote?: string;
    profileUpdateNote?: string;
    examCenterName?: string;
    examCenterCode?: string;
    subjectMarks?: Array<Record<string, unknown>>;
    pointsEarned: number;
    timeTaken: number;
    deviceInfo: string;
    browserInfo: string;
    ipAddress: string;
    tabSwitchCount: number;
    submittedAt: Date;
    isAutoSubmitted: boolean;
    cheat_flags?: {
        reason: string;
        timestamp: Date;
    }[];
    createdAt: Date;
    status: 'submitted' | 'evaluated';
}
declare const _default: mongoose.Model<IExamResult, {}, {}, {}, mongoose.Document<unknown, {}, IExamResult, {}, {}> & IExamResult & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ExamResult.d.ts.map