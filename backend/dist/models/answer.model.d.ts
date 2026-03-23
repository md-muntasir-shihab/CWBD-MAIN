import { Schema } from "mongoose";
export declare const AnswerModel: import("mongoose").Model<{
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    sessionId: string;
    userId: string;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    sessionId: string;
    userId: string;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}, {}, {
    timestamps: false;
}> & {
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    sessionId: string;
    userId: string;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: false;
}, {
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    sessionId: string;
    userId: string;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    sessionId: string;
    userId: string;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: false;
}>> & import("mongoose").FlatRecord<{
    examId: string;
    questionId: string;
    changeCount: number;
    updatedAtUTC: NativeDate;
    sessionId: string;
    userId: string;
    selectedKey?: "C" | "D" | "A" | "B" | null | undefined;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=answer.model.d.ts.map