"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamCardMetrics = getExamCardMetrics;
const mongoose_1 = __importDefault(require("mongoose"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const ExamSession_1 = __importDefault(require("../models/ExamSession"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const User_1 = __importDefault(require("../models/User"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
function normalizeId(value) {
    return String(value || '').trim();
}
function uniqueStringArray(values) {
    const set = new Set();
    for (const value of values) {
        const next = normalizeId(value);
        if (next)
            set.add(next);
    }
    return Array.from(set);
}
function normalizeObjectIdArray(values) {
    if (!Array.isArray(values))
        return [];
    return uniqueStringArray(values);
}
function normalizePlanCodes(values) {
    if (!Array.isArray(values))
        return [];
    return Array.from(new Set(values
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)));
}
function intersectSets(base, filter) {
    if (base.size === 0 || filter.size === 0)
        return new Set();
    const next = new Set();
    for (const id of base) {
        if (filter.has(id))
            next.add(id);
    }
    return next;
}
function toObjectIds(ids) {
    return ids
        .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
        .map((id) => new mongoose_1.default.Types.ObjectId(id));
}
function getStudentPlanCode(user) {
    const subscription = user.subscription || {};
    return String(subscription.planCode || subscription.plan || '').trim().toLowerCase();
}
function buildSetIndexMap(values, key) {
    return values.get(key) || new Set();
}
async function getExamCardMetrics(exams) {
    const metricMap = new Map();
    if (!Array.isArray(exams) || exams.length === 0) {
        return metricMap;
    }
    const examIds = uniqueStringArray(exams.map((exam) => normalizeId(exam._id)));
    const examObjectIds = toObjectIds(examIds);
    if (examObjectIds.length === 0) {
        return metricMap;
    }
    const [attemptedRows, activeRows, activeStudents, profiles] = await Promise.all([
        ExamResult_1.default.aggregate([
            { $match: { exam: { $in: examObjectIds } } },
            { $group: { _id: { exam: '$exam', student: '$student' } } },
            { $group: { _id: '$_id.exam', attemptedUsers: { $sum: 1 } } },
        ]),
        ExamSession_1.default.aggregate([
            { $match: { exam: { $in: examObjectIds }, isActive: true, status: 'in_progress' } },
            { $group: { _id: { exam: '$exam', student: '$student' } } },
            { $group: { _id: '$_id.exam', activeUsers: { $sum: 1 } } },
        ]),
        User_1.default.find({ role: 'student', status: 'active' }).select('_id subscription').lean(),
        StudentProfile_1.default.find({}).select('user_id groupIds').lean(),
    ]);
    const attemptedByExam = new Map(attemptedRows.map((row) => [String(row._id), Number(row.attemptedUsers || 0)]));
    const activeByExam = new Map(activeRows.map((row) => [String(row._id), Number(row.activeUsers || 0)]));
    const activeStudentIdSet = new Set();
    const planToStudents = new Map();
    const activeStudentIds = activeStudents
        .map((user) => normalizeId(user._id))
        .filter(Boolean);
    const activeSubscriptions = activeStudentIds.length > 0
        ? await UserSubscription_1.default.find({
            userId: { $in: toObjectIds(activeStudentIds) },
            status: 'active',
            expiresAtUTC: { $gt: new Date() },
        })
            .populate('planId', 'code')
            .select('userId planId')
            .lean()
        : [];
    const studentsWithCanonicalPlans = new Set();
    for (const subscription of activeSubscriptions) {
        const studentId = normalizeId(subscription.userId);
        const plan = subscription.planId || {};
        const planCode = String(plan.code || '').trim().toLowerCase();
        if (!studentId || !planCode)
            continue;
        studentsWithCanonicalPlans.add(studentId);
        if (!planToStudents.has(planCode)) {
            planToStudents.set(planCode, new Set());
        }
        planToStudents.get(planCode)?.add(studentId);
    }
    for (const user of activeStudents) {
        const studentId = normalizeId(user._id);
        if (!studentId)
            continue;
        activeStudentIdSet.add(studentId);
        if (studentsWithCanonicalPlans.has(studentId))
            continue;
        const planCode = getStudentPlanCode(user);
        if (!planCode)
            continue;
        if (!planToStudents.has(planCode)) {
            planToStudents.set(planCode, new Set());
        }
        planToStudents.get(planCode)?.add(studentId);
    }
    const groupToStudents = new Map();
    for (const profile of profiles) {
        const studentId = normalizeId(profile.user_id);
        if (!studentId || !activeStudentIdSet.has(studentId))
            continue;
        for (const groupId of normalizeObjectIdArray(profile.groupIds)) {
            if (!groupToStudents.has(groupId)) {
                groupToStudents.set(groupId, new Set());
            }
            groupToStudents.get(groupId)?.add(studentId);
        }
    }
    for (const exam of exams) {
        const examId = normalizeId(exam._id);
        if (!examId)
            continue;
        const allowedUsers = uniqueStringArray([
            ...normalizeObjectIdArray(exam.allowedUsers),
            ...normalizeObjectIdArray(exam.allowed_user_ids),
            ...normalizeObjectIdArray(exam.accessControl?.allowedUserIds),
        ]);
        const allowedGroupIds = normalizeObjectIdArray(exam.accessControl?.allowedGroupIds);
        const allowedPlanCodes = normalizePlanCodes(exam.accessControl?.allowedPlanCodes);
        let eligibleStudents = new Set();
        if (allowedUsers.length > 0) {
            for (const studentId of allowedUsers) {
                if (activeStudentIdSet.has(studentId))
                    eligibleStudents.add(studentId);
            }
        }
        else {
            eligibleStudents = new Set(activeStudentIdSet);
        }
        if (allowedGroupIds.length > 0) {
            const groupEligible = new Set();
            for (const groupId of allowedGroupIds) {
                const groupMembers = buildSetIndexMap(groupToStudents, groupId);
                for (const memberId of groupMembers) {
                    groupEligible.add(memberId);
                }
            }
            eligibleStudents = intersectSets(eligibleStudents, groupEligible);
        }
        if (allowedPlanCodes.length > 0) {
            const planEligible = new Set();
            for (const planCode of allowedPlanCodes) {
                const members = buildSetIndexMap(planToStudents, planCode);
                for (const memberId of members) {
                    planEligible.add(memberId);
                }
            }
            eligibleStudents = intersectSets(eligibleStudents, planEligible);
        }
        const totalParticipants = eligibleStudents.size;
        const attemptedUsers = Number(attemptedByExam.get(examId) || 0);
        const activeUsers = Number(activeByExam.get(examId) || 0);
        const remainingUsers = Math.max(totalParticipants - attemptedUsers, 0);
        metricMap.set(examId, {
            examId,
            totalParticipants,
            attemptedUsers,
            remainingUsers,
            activeUsers,
        });
    }
    return metricMap;
}
//# sourceMappingURL=examCardMetricsService.js.map