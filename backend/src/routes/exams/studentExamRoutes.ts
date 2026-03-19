import { Router } from "express";
import type { AuthRequest } from "../../middlewares/auth";
import { requireAuth } from "../../middlewares/auth";
import { examAutoSaveLimit, examSessionStartLimit, examSubmitLimit } from "../../middleware/examRateLimit";
import {
  getExamAttemptResult,
  getExamAttemptSolutions,
  getExamAttemptState,
  saveExamAttemptAnswer,
  startExam,
  submitExamAttempt,
} from "../../controllers/examController";
import { generateAnswersPdf, generateQuestionsPdf, generateSolutionsPdf } from "../../controllers/examPdfController";

export const studentExamRoutes = Router();

function withLegacyExamId(req: AuthRequest, examId: string): AuthRequest {
  const attemptId = String(req.params.attemptId || req.params.sessionId || "");
  const proxiedReq = Object.create(req) as AuthRequest;
  proxiedReq.params = {
    ...req.params,
    id: examId,
    examId,
    attemptId,
  };
  return proxiedReq;
}

studentExamRoutes.post("/exams/:examId/sessions/start", requireAuth, examSessionStartLimit, async (req, res) => {
  await startExam(withLegacyExamId(req, String(req.params.examId || "")), res);
});

studentExamRoutes.get("/exams/:examId/sessions/:sessionId/questions", requireAuth, async (req, res) => {
  await getExamAttemptState(withLegacyExamId(req, String(req.params.examId || "")), res);
});

studentExamRoutes.post("/exams/:examId/sessions/:sessionId/answers", requireAuth, examAutoSaveLimit, async (req, res) => {
  await saveExamAttemptAnswer(withLegacyExamId(req, String(req.params.examId || "")), res);
});

studentExamRoutes.post("/exams/:examId/sessions/:sessionId/submit", requireAuth, examSubmitLimit, async (req, res) => {
  await submitExamAttempt(withLegacyExamId(req, String(req.params.examId || "")), res);
});

studentExamRoutes.get("/exams/:examId/sessions/:sessionId/result", requireAuth, async (req, res) => {
  await getExamAttemptResult(withLegacyExamId(req, String(req.params.examId || "")), res);
});

studentExamRoutes.get("/exams/:examId/sessions/:sessionId/solutions", requireAuth, async (req, res) => {
  await getExamAttemptSolutions(withLegacyExamId(req, String(req.params.examId || "")), res);
});

studentExamRoutes.get("/exams/:examId/pdf/questions", generateQuestionsPdf);
studentExamRoutes.get("/exams/:examId/pdf/solutions", generateSolutionsPdf);
studentExamRoutes.get("/exams/:examId/sessions/:sessionId/pdf/answers", requireAuth, generateAnswersPdf);
