"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendAttemptRefToExternalExamUrl = appendAttemptRefToExternalExamUrl;
exports.getExternalExamAttemptCount = getExternalExamAttemptCount;
exports.getExternalExamAttemptCountsForStudent = getExternalExamAttemptCountsForStudent;
exports.createExternalExamAttempt = createExternalExamAttempt;
exports.markExternalExamAttemptImported = markExternalExamAttemptImported;
const mongoose_1 = __importDefault(require("mongoose"));
const ExternalExamJoinLog_1 = __importDefault(require("../models/ExternalExamJoinLog"));
function normalizeObjectId(value) {
    return value instanceof mongoose_1.default.Types.ObjectId
        ? value
        : new mongoose_1.default.Types.ObjectId(String(value));
}
function appendAttemptRefToExternalExamUrl(baseUrl, attemptRef) {
    const parsed = new URL(String(baseUrl || '').trim());
    parsed.searchParams.set('cw_ref', attemptRef);
    return parsed.toString();
}
async function getExternalExamAttemptCount(examId, studentId) {
    return ExternalExamJoinLog_1.default.countDocuments({
        examId: normalizeObjectId(examId),
        studentId: normalizeObjectId(studentId),
    });
}
async function getExternalExamAttemptCountsForStudent(studentId, examIds) {
    const validExamIds = examIds
        .map((examId) => String(examId || '').trim())
        .filter((examId) => mongoose_1.default.Types.ObjectId.isValid(examId))
        .map((examId) => new mongoose_1.default.Types.ObjectId(examId));
    if (validExamIds.length === 0)
        return new Map();
    const rows = await ExternalExamJoinLog_1.default.aggregate([
        {
            $match: {
                studentId: normalizeObjectId(studentId),
                examId: { $in: validExamIds },
            },
        },
        {
            $group: {
                _id: '$examId',
                count: { $sum: 1 },
            },
        },
    ]);
    return new Map(rows.map((row) => [String(row._id), Number(row.count || 0)]));
}
async function createExternalExamAttempt(input) {
    const attemptRef = `cwref_${new mongoose_1.default.Types.ObjectId().toString()}`;
    const redirectUrl = appendAttemptRefToExternalExamUrl(input.externalExamUrl, attemptRef);
    const attempt = await ExternalExamJoinLog_1.default.create({
        examId: normalizeObjectId(input.examId),
        studentId: normalizeObjectId(input.studentId),
        joinedAt: new Date(),
        attemptNo: Math.max(1, Number(input.attemptNo || 1)),
        attemptRef,
        status: 'awaiting_result',
        sourcePanel: String(input.sourcePanel || 'exam_start').trim() || 'exam_start',
        registration_id_snapshot: String(input.registrationIdSnapshot || '').trim(),
        user_unique_id_snapshot: String(input.userUniqueIdSnapshot || '').trim(),
        username_snapshot: String(input.usernameSnapshot || '').trim().toLowerCase(),
        email_snapshot: String(input.emailSnapshot || '').trim().toLowerCase(),
        phone_number_snapshot: String(input.phoneNumberSnapshot || '').trim(),
        full_name_snapshot: String(input.fullNameSnapshot || '').trim(),
        groupIds_snapshot: Array.isArray(input.groupIdsSnapshot) ? input.groupIdsSnapshot.map((value) => String(value || '').trim()).filter(Boolean) : [],
        externalExamUrl: redirectUrl,
        ip: String(input.ip || '').trim(),
        userAgent: String(input.userAgent || '').trim(),
    });
    return {
        attemptId: String(attempt._id),
        attemptRef,
        redirectUrl,
    };
}
async function markExternalExamAttemptImported(input) {
    const filter = {};
    if (input.attemptId && mongoose_1.default.Types.ObjectId.isValid(input.attemptId)) {
        filter._id = new mongoose_1.default.Types.ObjectId(input.attemptId);
    }
    else if (input.attemptRef) {
        filter.attemptRef = String(input.attemptRef).trim();
    }
    else {
        return;
    }
    await ExternalExamJoinLog_1.default.updateOne(filter, {
        $set: {
            status: 'imported',
            importedAt: new Date(),
            importedResultId: mongoose_1.default.Types.ObjectId.isValid(input.resultId) ? new mongoose_1.default.Types.ObjectId(input.resultId) : undefined,
            matchedBy: String(input.matchedBy || '').trim(),
        },
    });
}
//# sourceMappingURL=externalExamAttemptService.js.map