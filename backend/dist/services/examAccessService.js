"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAccessPayload = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const examSession_model_1 = require("../models/examSession.model");
const payment_model_1 = require("../models/payment.model");
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const user_model_1 = require("../models/user.model");
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const buildAccessPayload = async (exam, userId) => {
    const blockReasons = [];
    if (!userId)
        blockReasons.push("LOGIN_REQUIRED");
    const now = new Date();
    if (now < new Date(exam.examWindowStartUTC) || now > new Date(exam.examWindowEndUTC))
        blockReasons.push("EXAM_NOT_IN_WINDOW");
    let user = null;
    if (userId) {
        user = await user_model_1.UserModel.findOne({ userId });
        if (!user || (user.profileScore ?? 0) < 70)
            blockReasons.push("PROFILE_BELOW_70");
    }
    // Group-based visibility check
    const visibilityMode = exam.visibilityMode || 'all_students';
    if (userId && (visibilityMode === 'group_only' || visibilityMode === 'custom')) {
        const targetGroupIds = Array.isArray(exam.targetGroupIds) ? exam.targetGroupIds.map(String) : [];
        if (targetGroupIds.length > 0) {
            const profile = await StudentProfile_1.default.findOne({ user_id: userId }).select('groupIds').lean();
            const studentGroupIds = Array.isArray(profile?.groupIds) ? profile.groupIds.map(String) : [];
            const hasGroupAccess = targetGroupIds.some((gId) => studentGroupIds.includes(gId));
            if (!hasGroupAccess)
                blockReasons.push("GROUP_RESTRICTED");
        }
    }
    if (userId && (exam.subscriptionRequired || exam.requiresActiveSubscription)) {
        const active = mongoose_1.default.Types.ObjectId.isValid(userId)
            ? await UserSubscription_1.default.findOne({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                status: 'active',
                expiresAtUTC: { $gt: now },
            }).lean()
            : null;
        if (!active)
            blockReasons.push("SUBSCRIPTION_REQUIRED");
    }
    if (userId && (exam.paymentRequired || exam.requiresPayment)) {
        const paid = await payment_model_1.PaymentModel.findOne({ userId, examId: String(exam._id), status: "paid" });
        if (!paid)
            blockReasons.push("PAYMENT_PENDING");
    }
    // Custom minimum profile score from exam settings
    if (userId && exam.minimumProfileScore && user) {
        const profileScore = Number(user.profileScore ?? 0);
        if (profileScore < Number(exam.minimumProfileScore))
            blockReasons.push("PROFILE_SCORE_TOO_LOW");
    }
    if (userId) {
        const attempts = await examSession_model_1.ExamSessionModel.countDocuments({ examId: String(exam._id), userId, status: { $in: ["submitted", "evaluated", "expired"] } });
        if (attempts >= exam.attemptLimit && !exam.allowReAttempt)
            blockReasons.push("ATTEMPT_LIMIT_REACHED");
    }
    return {
        loginRequired: true,
        profileScoreMin: exam.minimumProfileScore || 70,
        subscriptionRequired: exam.subscriptionRequired || exam.requiresActiveSubscription,
        paymentRequired: exam.paymentRequired || exam.requiresPayment,
        priceBDT: exam.priceBDT ?? undefined,
        visibilityMode,
        accessStatus: blockReasons.length ? "blocked" : "allowed",
        blockReasons
    };
};
exports.buildAccessPayload = buildAccessPayload;
//# sourceMappingURL=examAccessService.js.map