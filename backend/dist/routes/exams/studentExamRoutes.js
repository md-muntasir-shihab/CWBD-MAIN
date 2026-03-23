"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentExamRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const examRateLimit_1 = require("../../middleware/examRateLimit");
const examController_1 = require("../../controllers/examController");
const examPdfController_1 = require("../../controllers/examPdfController");
exports.studentExamRoutes = (0, express_1.Router)();
function withLegacyExamId(req, examId) {
    const attemptId = String(req.params.attemptId || req.params.sessionId || "");
    const proxiedReq = Object.create(req);
    proxiedReq.params = {
        ...req.params,
        id: examId,
        examId,
        attemptId,
    };
    return proxiedReq;
}
exports.studentExamRoutes.post("/exams/:examId/sessions/start", auth_1.requireAuth, examRateLimit_1.examSessionStartLimit, async (req, res) => {
    await (0, examController_1.startExam)(withLegacyExamId(req, String(req.params.examId || "")), res);
});
exports.studentExamRoutes.get("/exams/:examId/sessions/:sessionId/questions", auth_1.requireAuth, async (req, res) => {
    await (0, examController_1.getExamAttemptState)(withLegacyExamId(req, String(req.params.examId || "")), res);
});
exports.studentExamRoutes.post("/exams/:examId/sessions/:sessionId/answers", auth_1.requireAuth, examRateLimit_1.examAutoSaveLimit, async (req, res) => {
    await (0, examController_1.saveExamAttemptAnswer)(withLegacyExamId(req, String(req.params.examId || "")), res);
});
exports.studentExamRoutes.post("/exams/:examId/sessions/:sessionId/submit", auth_1.requireAuth, examRateLimit_1.examSubmitLimit, async (req, res) => {
    await (0, examController_1.submitExamAttempt)(withLegacyExamId(req, String(req.params.examId || "")), res);
});
exports.studentExamRoutes.get("/exams/:examId/sessions/:sessionId/result", auth_1.requireAuth, async (req, res) => {
    await (0, examController_1.getExamAttemptResult)(withLegacyExamId(req, String(req.params.examId || "")), res);
});
exports.studentExamRoutes.get("/exams/:examId/sessions/:sessionId/solutions", auth_1.requireAuth, async (req, res) => {
    await (0, examController_1.getExamAttemptSolutions)(withLegacyExamId(req, String(req.params.examId || "")), res);
});
exports.studentExamRoutes.get("/exams/:examId/pdf/questions", examPdfController_1.generateQuestionsPdf);
exports.studentExamRoutes.get("/exams/:examId/pdf/solutions", examPdfController_1.generateSolutionsPdf);
exports.studentExamRoutes.get("/exams/:examId/sessions/:sessionId/pdf/answers", auth_1.requireAuth, examPdfController_1.generateAnswersPdf);
//# sourceMappingURL=studentExamRoutes.js.map