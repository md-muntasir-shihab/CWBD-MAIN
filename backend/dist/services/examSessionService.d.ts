export declare const startSession: (examId: string, userId: string, reqMeta: {
    ip?: string;
    ua?: string;
}) => Promise<{
    blocked: {
        loginRequired: true;
        profileScoreMin: any;
        subscriptionRequired: any;
        paymentRequired: any;
        priceBDT: any;
        visibilityMode: any;
        accessStatus: string;
        blockReasons: string[];
    };
    sessionId?: undefined;
    startedAtUTC?: undefined;
    expiresAtUTC?: undefined;
    serverNowUTC?: undefined;
} | {
    sessionId: string;
    startedAtUTC: Date;
    expiresAtUTC: Date;
    serverNowUTC: string;
    blocked?: undefined;
}>;
export declare const getSessionQuestions: (examId: string, sessionId: string, userId: string) => Promise<{
    exam: {
        id: string;
        title: string;
        expiresAtUTC: NativeDate | null | undefined;
        durationMinutes: number;
        resultPublishAtUTC: NativeDate;
        rules: {
            negativeMarkingEnabled: boolean;
            negativePerWrong: number;
            answerChangeLimit: number | null | undefined;
            showQuestionPalette: boolean;
            showTimer: boolean;
            allowBackNavigation: boolean;
            randomizeQuestions: boolean;
            randomizeOptions: boolean;
            autoSubmitOnTimeout: boolean;
        };
    };
    questions: {
        id: string;
        orderIndex: number;
        question_en: any;
        question_bn: any;
        questionImageUrl: any;
        options: unknown[];
        marks: any;
        negativeMarks: any;
    }[];
    answers: {
        questionId: string;
        selectedKey: "C" | "D" | "A" | "B" | null | undefined;
        changeCount: number;
        updatedAtUTC: NativeDate;
    }[];
}>;
export declare const saveSessionAnswers: (examId: string, sessionId: string, userId: string, payload: any) => Promise<{
    ok: true;
    serverSavedAtUTC: string;
    updated: {
        questionId: string;
        changeCount: number;
        updatedAtUTC: Date;
    }[];
}>;
export declare const submitSession: (examId: string, sessionId: string, userId: string) => Promise<{
    ok: true;
    submittedAtUTC: NativeDate;
}>;
//# sourceMappingURL=examSessionService.d.ts.map