import { Schema } from "mongoose";
export declare const ResultModel: import("mongoose").Model<{
    examId: string;
    sessionId: string;
    userId: string;
    totalMarks?: number | null | undefined;
    obtainedMarks?: number | null | undefined;
    correctCount?: number | null | undefined;
    wrongCount?: number | null | undefined;
    percentage?: number | null | undefined;
    rank?: number | null | undefined;
    timeTakenSeconds?: number | null | undefined;
    skippedCount?: number | null | undefined;
    evaluatedAtUTC?: NativeDate | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    examId: string;
    sessionId: string;
    userId: string;
    totalMarks?: number | null | undefined;
    obtainedMarks?: number | null | undefined;
    correctCount?: number | null | undefined;
    wrongCount?: number | null | undefined;
    percentage?: number | null | undefined;
    rank?: number | null | undefined;
    timeTakenSeconds?: number | null | undefined;
    skippedCount?: number | null | undefined;
    evaluatedAtUTC?: NativeDate | null | undefined;
}, {}, {
    timestamps: false;
}> & {
    examId: string;
    sessionId: string;
    userId: string;
    totalMarks?: number | null | undefined;
    obtainedMarks?: number | null | undefined;
    correctCount?: number | null | undefined;
    wrongCount?: number | null | undefined;
    percentage?: number | null | undefined;
    rank?: number | null | undefined;
    timeTakenSeconds?: number | null | undefined;
    skippedCount?: number | null | undefined;
    evaluatedAtUTC?: NativeDate | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: false;
}, {
    examId: string;
    sessionId: string;
    userId: string;
    totalMarks?: number | null | undefined;
    obtainedMarks?: number | null | undefined;
    correctCount?: number | null | undefined;
    wrongCount?: number | null | undefined;
    percentage?: number | null | undefined;
    rank?: number | null | undefined;
    timeTakenSeconds?: number | null | undefined;
    skippedCount?: number | null | undefined;
    evaluatedAtUTC?: NativeDate | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    examId: string;
    sessionId: string;
    userId: string;
    totalMarks?: number | null | undefined;
    obtainedMarks?: number | null | undefined;
    correctCount?: number | null | undefined;
    wrongCount?: number | null | undefined;
    percentage?: number | null | undefined;
    rank?: number | null | undefined;
    timeTakenSeconds?: number | null | undefined;
    skippedCount?: number | null | undefined;
    evaluatedAtUTC?: NativeDate | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: false;
}>> & import("mongoose").FlatRecord<{
    examId: string;
    sessionId: string;
    userId: string;
    totalMarks?: number | null | undefined;
    obtainedMarks?: number | null | undefined;
    correctCount?: number | null | undefined;
    wrongCount?: number | null | undefined;
    percentage?: number | null | undefined;
    rank?: number | null | undefined;
    timeTakenSeconds?: number | null | undefined;
    skippedCount?: number | null | undefined;
    evaluatedAtUTC?: NativeDate | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=result.model.d.ts.map