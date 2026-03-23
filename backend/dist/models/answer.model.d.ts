import { Schema } from "mongoose";
export declare const AnswerModel: import("mongoose").Model<{
    userId: string;
    sessionId: string;
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    userId: string;
    sessionId: string;
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}, {}, {
    timestamps: false;
}> & {
    userId: string;
    sessionId: string;
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: false;
}, {
    userId: string;
    sessionId: string;
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    userId: string;
    sessionId: string;
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: false;
}>> & import("mongoose").FlatRecord<{
    userId: string;
    sessionId: string;
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=answer.model.d.ts.map