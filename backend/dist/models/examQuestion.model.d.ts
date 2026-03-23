import { Schema } from "mongoose";
export declare const ExamQuestionModel: import("mongoose").Model<{
    tags: string[];
    options: import("mongoose").Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, any, {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }> & {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }>;
    examId: string;
    topic?: string | null | undefined;
    marks?: number | null | undefined;
    negativeMarks?: number | null | undefined;
    difficulty?: string | null | undefined;
    fromBankQuestionId?: string | null | undefined;
    orderIndex?: number | null | undefined;
    question_en?: string | null | undefined;
    question_bn?: string | null | undefined;
    questionImageUrl?: string | null | undefined;
    explanation_en?: string | null | undefined;
    explanation_bn?: string | null | undefined;
    explanationImageUrl?: string | null | undefined;
    correctKey?: "C" | "D" | "A" | "B" | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    tags: string[];
    options: import("mongoose").Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, any, {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }> & {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }>;
    examId: string;
    topic?: string | null | undefined;
    marks?: number | null | undefined;
    negativeMarks?: number | null | undefined;
    difficulty?: string | null | undefined;
    fromBankQuestionId?: string | null | undefined;
    orderIndex?: number | null | undefined;
    question_en?: string | null | undefined;
    question_bn?: string | null | undefined;
    questionImageUrl?: string | null | undefined;
    explanation_en?: string | null | undefined;
    explanation_bn?: string | null | undefined;
    explanationImageUrl?: string | null | undefined;
    correctKey?: "C" | "D" | "A" | "B" | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    tags: string[];
    options: import("mongoose").Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, any, {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }> & {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }>;
    examId: string;
    topic?: string | null | undefined;
    marks?: number | null | undefined;
    negativeMarks?: number | null | undefined;
    difficulty?: string | null | undefined;
    fromBankQuestionId?: string | null | undefined;
    orderIndex?: number | null | undefined;
    question_en?: string | null | undefined;
    question_bn?: string | null | undefined;
    questionImageUrl?: string | null | undefined;
    explanation_en?: string | null | undefined;
    explanation_bn?: string | null | undefined;
    explanationImageUrl?: string | null | undefined;
    correctKey?: "C" | "D" | "A" | "B" | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    tags: string[];
    options: import("mongoose").Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, any, {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }> & {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }>;
    examId: string;
    topic?: string | null | undefined;
    marks?: number | null | undefined;
    negativeMarks?: number | null | undefined;
    difficulty?: string | null | undefined;
    fromBankQuestionId?: string | null | undefined;
    orderIndex?: number | null | undefined;
    question_en?: string | null | undefined;
    question_bn?: string | null | undefined;
    questionImageUrl?: string | null | undefined;
    explanation_en?: string | null | undefined;
    explanation_bn?: string | null | undefined;
    explanationImageUrl?: string | null | undefined;
    correctKey?: "C" | "D" | "A" | "B" | null | undefined;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    tags: string[];
    options: import("mongoose").Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, any, {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }> & {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }>;
    examId: string;
    topic?: string | null | undefined;
    marks?: number | null | undefined;
    negativeMarks?: number | null | undefined;
    difficulty?: string | null | undefined;
    fromBankQuestionId?: string | null | undefined;
    orderIndex?: number | null | undefined;
    question_en?: string | null | undefined;
    question_bn?: string | null | undefined;
    questionImageUrl?: string | null | undefined;
    explanation_en?: string | null | undefined;
    explanation_bn?: string | null | undefined;
    explanationImageUrl?: string | null | undefined;
    correctKey?: "C" | "D" | "A" | "B" | null | undefined;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
}>> & import("mongoose").FlatRecord<{
    tags: string[];
    options: import("mongoose").Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, any, {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }> & {
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }>;
    examId: string;
    topic?: string | null | undefined;
    marks?: number | null | undefined;
    negativeMarks?: number | null | undefined;
    difficulty?: string | null | undefined;
    fromBankQuestionId?: string | null | undefined;
    orderIndex?: number | null | undefined;
    question_en?: string | null | undefined;
    question_bn?: string | null | undefined;
    questionImageUrl?: string | null | undefined;
    explanation_en?: string | null | undefined;
    explanation_bn?: string | null | undefined;
    explanationImageUrl?: string | null | undefined;
    correctKey?: "C" | "D" | "A" | "B" | null | undefined;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=examQuestion.model.d.ts.map