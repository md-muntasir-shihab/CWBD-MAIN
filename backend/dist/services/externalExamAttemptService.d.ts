import mongoose from 'mongoose';
type ObjectIdLike = string | mongoose.Types.ObjectId;
export declare function appendAttemptRefToExternalExamUrl(baseUrl: string, attemptRef: string): string;
export declare function getExternalExamAttemptCount(examId: ObjectIdLike, studentId: ObjectIdLike): Promise<number>;
export declare function getExternalExamAttemptCountsForStudent(studentId: ObjectIdLike, examIds: string[]): Promise<Map<string, number>>;
export declare function createExternalExamAttempt(input: {
    examId: ObjectIdLike;
    studentId: ObjectIdLike;
    attemptNo: number;
    sourcePanel?: string;
    registrationIdSnapshot?: string;
    userUniqueIdSnapshot?: string;
    usernameSnapshot?: string;
    emailSnapshot?: string;
    phoneNumberSnapshot?: string;
    fullNameSnapshot?: string;
    groupIdsSnapshot?: string[];
    ip?: string;
    userAgent?: string;
    externalExamUrl: string;
}): Promise<{
    attemptId: string;
    attemptRef: string;
    redirectUrl: string;
}>;
export declare function markExternalExamAttemptImported(input: {
    attemptId?: string;
    attemptRef?: string;
    resultId: string;
    matchedBy?: string;
}): Promise<void>;
export {};
//# sourceMappingURL=externalExamAttemptService.d.ts.map