import mongoose from 'mongoose';
import { IQuestionBankQuestion } from '../models/QuestionBankQuestion';
import { IQuestionBankSet } from '../models/QuestionBankSet';
export declare function computeContentHash(q: {
    question_en?: string;
    question_bn?: string;
    options?: {
        key: string;
        text_en?: string;
        text_bn?: string;
    }[];
    correctKey?: string;
}): string;
export declare function getSettings(): Promise<any>;
export declare function updateSettings(data: Record<string, unknown>, adminId: string): Promise<import("../models/QuestionBankSettings").IQuestionBankSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function createBankQuestion(data: Record<string, unknown>, adminId: string): Promise<IQuestionBankQuestion>;
export declare function getBankQuestion(id: string): Promise<{
    question: mongoose.FlattenMaps<IQuestionBankQuestion> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
    usageCount: number;
    analytics: (mongoose.FlattenMaps<import("../models/QuestionBankAnalytics").IQuestionBankAnalytics> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null;
    versions: (mongoose.FlattenMaps<IQuestionBankQuestion> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[];
} | null>;
export declare function updateBankQuestion(id: string, data: Record<string, unknown>, adminId: string): Promise<{
    question: mongoose.Document<unknown, {}, IQuestionBankQuestion, {}, {}> & IQuestionBankQuestion & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
    versioned: boolean;
    parentId: string;
} | {
    question: mongoose.Document<unknown, {}, IQuestionBankQuestion, {}, {}> & IQuestionBankQuestion & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    };
    versioned: boolean;
    parentId?: undefined;
} | null>;
export declare function deleteBankQuestion(id: string, adminId: string): Promise<(mongoose.Document<unknown, {}, IQuestionBankQuestion, {}, {}> & IQuestionBankQuestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function archiveBankQuestion(id: string, adminId: string): Promise<(mongoose.Document<unknown, {}, IQuestionBankQuestion, {}, {}> & IQuestionBankQuestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function restoreBankQuestion(id: string, adminId: string): Promise<(mongoose.Document<unknown, {}, IQuestionBankQuestion, {}, {}> & IQuestionBankQuestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function duplicateBankQuestion(id: string, adminId: string): Promise<(mongoose.Document<unknown, {}, IQuestionBankQuestion, {}, {}> & IQuestionBankQuestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export interface ListBankQuestionsParams {
    q?: string;
    subject?: string;
    moduleCategory?: string;
    topic?: string;
    difficulty?: string;
    tag?: string;
    status?: string;
    page?: number;
    limit?: number;
    sort?: string;
}
export declare function listBankQuestions(params: ListBankQuestionsParams): Promise<any>;
interface ImportValidationError {
    row: number;
    field: string;
    message: string;
}
export declare function importPreview(buffer: Buffer, filename: string, mapping?: Record<string, string>): Promise<{
    totalRows: number;
    headers: string[];
    mapping: Record<string, string>;
    preview: {
        rowIndex: number;
        raw: Record<string, unknown>;
        mapped: Record<string, unknown>;
        errors: ImportValidationError[];
        contentHash: string;
    }[];
    availableColumns: string[];
}>;
export declare function importCommit(buffer: Buffer, filename: string, mapping: Record<string, string>, mode: 'create' | 'upsert', adminId: string): Promise<{
    totalRows: number;
    imported: number;
    skipped: number;
    failed: number;
    errorRows: {
        row: number;
        reason: string;
        data: Record<string, unknown>;
    }[];
}>;
export declare function exportQuestions(filters: ListBankQuestionsParams, format: 'csv' | 'xlsx'): Promise<any>;
export declare function generateImportTemplate(): Buffer;
export declare function listSets(adminId?: string): Promise<(mongoose.FlattenMaps<IQuestionBankSet> & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
})[]>;
export declare function getSet(id: string): Promise<(mongoose.FlattenMaps<IQuestionBankSet> & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function createSet(data: Record<string, unknown>, adminId: string): Promise<mongoose.Document<unknown, {}, IQuestionBankSet, {}, {}> & IQuestionBankSet & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function updateSet(id: string, data: Record<string, unknown>, adminId: string): Promise<(mongoose.Document<unknown, {}, IQuestionBankSet, {}, {}> & IQuestionBankSet & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function deleteSet(id: string, adminId: string): Promise<(mongoose.Document<unknown, {}, IQuestionBankSet, {}, {}> & IQuestionBankSet & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function resolveSetQuestions(setId: string): Promise<any[] | null>;
export declare function searchBankQuestionsForExam(examId: string, params: ListBankQuestionsParams): Promise<any>;
export declare function attachBankQuestionsToExam(examId: string, bankQuestionIds: string[], adminId: string): Promise<mongoose.MergeType<mongoose.Document<unknown, {}, {
    tags: string[];
    options: mongoose.Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
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
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    tags: string[];
    options: mongoose.Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
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
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, Omit<{
    examId: string;
    fromBankQuestionId: string;
    orderIndex: number;
    question_en: any;
    question_bn: any;
    questionImageUrl: any;
    options: any;
    correctKey: any;
    explanation_en: any;
    explanation_bn: any;
    explanationImageUrl: any;
    marks: any;
    negativeMarks: any;
    topic: any;
    difficulty: any;
    tags: any;
}, "_id">>[]>;
export declare function removeBankQuestionFromExam(examId: string, examQuestionId: string, adminId: string): Promise<(mongoose.Document<unknown, {}, {
    tags: string[];
    options: mongoose.Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
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
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    tags: string[];
    options: mongoose.Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
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
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}) | null>;
export declare function reorderExamQuestions(examId: string, orderMap: {
    id: string;
    orderIndex: number;
}[], adminId: string): Promise<(mongoose.FlattenMaps<{
    tags: string[];
    options: mongoose.Types.DocumentArray<{
        key?: string | null | undefined;
        imageUrl?: string | null | undefined;
        text_en?: string | null | undefined;
        text_bn?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
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
    createdAt: NativeDate;
    updatedAt: NativeDate;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
})[]>;
export declare function finalizeExamSnapshot(examId: string, adminId: string): Promise<{
    totalQuestions: number;
    bankLinked: number;
}>;
export declare function getAnalytics(params: {
    subject?: string;
    moduleCategory?: string;
    topic?: string;
    examId?: string;
    groupId?: string;
}): Promise<{
    summary: {
        bySubject: any[];
        byCategory: any[];
        byTopic: any[];
        byDifficulty: any[];
        totalQuestions: number;
        totalActive: number;
        totalArchived: number;
    };
    mostUsed: any[];
    lowAccuracy: (mongoose.FlattenMaps<import("../models/QuestionBankAnalytics").IQuestionBankAnalytics> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[];
    highSkip: (mongoose.FlattenMaps<import("../models/QuestionBankAnalytics").IQuestionBankAnalytics> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[];
    neverUsed: (mongoose.FlattenMaps<IQuestionBankQuestion> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[];
    topicPerformance: any[];
}>;
export declare function refreshAnalyticsForQuestion(bankQuestionId: string): Promise<(mongoose.Document<unknown, {}, import("../models/QuestionBankAnalytics").IQuestionBankAnalytics, {}, {}> & import("../models/QuestionBankAnalytics").IQuestionBankAnalytics & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}) | null>;
export declare function refreshAllAnalytics(): Promise<{
    refreshed: number;
}>;
export declare function bulkArchive(ids: string[], adminId: string): Promise<mongoose.UpdateWriteOpResult>;
export declare function bulkActivate(ids: string[], active: boolean, adminId: string): Promise<mongoose.UpdateWriteOpResult>;
export declare function bulkUpdateTags(ids: string[], tags: string[], mode: 'add' | 'set', adminId: string): Promise<mongoose.UpdateWriteOpResult>;
export declare function bulkDelete(ids: string[], adminId: string): Promise<mongoose.mongo.DeleteResult | mongoose.UpdateWriteOpResult>;
export {};
//# sourceMappingURL=questionBankAdvancedService.d.ts.map