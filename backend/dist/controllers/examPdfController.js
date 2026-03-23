"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestionsPdf = generateQuestionsPdf;
exports.generateSolutionsPdf = generateSolutionsPdf;
exports.generateAnswersPdf = generateAnswersPdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
const Exam_1 = __importDefault(require("../models/Exam"));
const Question_1 = __importDefault(require("../models/Question"));
const ExamSession_1 = __importDefault(require("../models/ExamSession"));
const exam_model_1 = require("../models/exam.model");
const examQuestion_model_1 = require("../models/examQuestion.model");
const answer_model_1 = require("../models/answer.model");
function safeText(value) {
    return typeof value === "string" ? value.trim() : "";
}
function createPdf() {
    return new pdfkit_1.default({ size: "A4", margin: 40, bufferPages: true });
}
function addHeader(doc, title) {
    doc.fontSize(18).text(title, { align: "center" });
    doc.moveDown(0.5);
    doc
        .fontSize(10)
        .fillColor("#666")
        .text(`Generated ${new Date().toISOString().slice(0, 16)}`, { align: "center" });
    doc.moveDown(1);
    doc.fillColor("#000");
}
function addQuestionBlock(doc, question, index, opts) {
    if (doc.y > 680)
        doc.addPage();
    doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`Q${index + 1}. ${safeText(question.questionText) || "Question"}`);
    doc.font("Helvetica");
    if (question.questionImageUrl) {
        doc.fontSize(8).fillColor("#888").text(`[Image: ${question.questionImageUrl}]`);
        doc.fillColor("#000");
    }
    doc.moveDown(0.3);
    for (const option of question.options) {
        let suffix = "";
        if (opts?.showCorrect && option.key === question.correctKey)
            suffix += " (correct)";
        if (opts?.showSelected !== undefined && option.key === opts.showSelected)
            suffix += " (selected)";
        doc.fontSize(10).text(`  ${option.key}) ${safeText(option.text)}${suffix}`);
    }
    if (opts?.showExplanation && question.explanationText) {
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor("#555").text(`Explanation: ${question.explanationText}`);
        doc.fillColor("#000");
    }
    if (opts?.showExplanation && question.explanationImageUrl) {
        doc
            .fontSize(8)
            .fillColor("#888")
            .text(`[Explanation Image: ${question.explanationImageUrl}]`);
        doc.fillColor("#000");
    }
    doc.moveDown(0.6);
}
function toDate(value) {
    const raw = value instanceof Date ? value : new Date(String(value || ""));
    return Number.isNaN(raw.getTime()) ? null : raw;
}
function sanitizeFilename(value) {
    return value.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "exam";
}
async function resolveExamContext(examId) {
    const modernExam = await exam_model_1.ExamModel.findById(examId).lean();
    if (modernExam) {
        return {
            kind: "modern",
            examId,
            title: safeText(modernExam.title) || "Exam",
            subject: safeText(modernExam.subject) || "N/A",
            category: safeText(modernExam.examCategory) || "N/A",
            durationMinutes: Number(modernExam.durationMinutes || 0),
            isPublished: Boolean(modernExam.isPublished),
            solutionReleaseRule: safeText(modernExam.solutionReleaseRule) || "after_result_publish",
            solutionsEnabled: Boolean(modernExam.solutionsEnabled),
            examWindowEndUTC: toDate(modernExam.examWindowEndUTC),
            resultPublishAtUTC: toDate(modernExam.resultPublishAtUTC),
        };
    }
    const legacyExam = await Exam_1.default.findById(examId).lean();
    if (!legacyExam)
        return null;
    return {
        kind: "legacy",
        examId,
        title: safeText(legacyExam.title) || "Exam",
        subject: safeText(legacyExam.subject) || "N/A",
        category: safeText(legacyExam.examCategory) || "N/A",
        durationMinutes: Number(legacyExam.duration || 0),
        isPublished: Boolean(legacyExam.isPublished),
        solutionReleaseRule: safeText(legacyExam.solutionReleaseRule) || "after_result_publish",
        solutionsEnabled: Boolean(legacyExam.solutionsEnabled),
        examWindowEndUTC: toDate(legacyExam.endDate),
        resultPublishAtUTC: toDate(legacyExam.resultPublishDate),
    };
}
function mapLegacyQuestion(question, fallbackOrder = 0) {
    const options = [
        { key: "A", text: safeText(question.optionA) },
        { key: "B", text: safeText(question.optionB) },
        { key: "C", text: safeText(question.optionC) },
        { key: "D", text: safeText(question.optionD) },
    ].filter((option) => option.text || safeText(question.correctAnswer) === option.key);
    return {
        id: String(question._id || ""),
        orderIndex: Number(question.order ?? fallbackOrder ?? 0),
        questionText: safeText(question.question_bn) || safeText(question.question_en) || safeText(question.question),
        questionImageUrl: safeText(question.questionImageUrl) || safeText(question.questionImage),
        options,
        correctKey: safeText(question.correctAnswer).toUpperCase(),
        explanationText: safeText(question.explanation_bn) ||
            safeText(question.explanation_en) ||
            safeText(question.explanation) ||
            safeText(question.solution),
        explanationImageUrl: safeText(question.explanationImageUrl) ||
            safeText(question.explanation_image_url) ||
            safeText(question.solutionImage),
    };
}
function mapModernQuestion(question, fallbackOrder = 0) {
    const options = Array.isArray(question.options)
        ? question.options.map((option) => ({
            key: safeText(option.key).toUpperCase(),
            text: safeText(option.text_bn) ||
                safeText(option.text_en) ||
                safeText(option.text),
        }))
        : [];
    return {
        id: String(question._id || ""),
        orderIndex: Number(question.orderIndex ?? fallbackOrder ?? 0),
        questionText: safeText(question.question_bn) || safeText(question.question_en),
        questionImageUrl: safeText(question.questionImageUrl),
        options,
        correctKey: safeText(question.correctKey).toUpperCase(),
        explanationText: safeText(question.explanation_bn) || safeText(question.explanation_en),
        explanationImageUrl: safeText(question.explanationImageUrl),
    };
}
async function loadQuestionsForPdf(context, preferredQuestionIds) {
    if (Array.isArray(preferredQuestionIds) && preferredQuestionIds.length > 0) {
        const orderedIds = preferredQuestionIds.map((id) => String(id || "")).filter(Boolean);
        const legacyQuestions = await Question_1.default.find({ _id: { $in: orderedIds } }).lean();
        const legacyMap = new Map(legacyQuestions.map((question) => [String(question._id), question]));
        const missingIds = orderedIds.filter((id) => !legacyMap.has(id));
        const bankQuestions = missingIds.length
            ? await examQuestion_model_1.ExamQuestionModel.find({ _id: { $in: missingIds } }).lean()
            : [];
        const bankMap = new Map(bankQuestions.map((question) => [String(question._id), question]));
        return orderedIds
            .map((id, index) => {
            if (legacyMap.has(id))
                return mapLegacyQuestion(legacyMap.get(id), index);
            if (bankMap.has(id))
                return mapModernQuestion(bankMap.get(id), index);
            return null;
        })
            .filter(Boolean);
    }
    if (context.kind === "modern") {
        const questions = await examQuestion_model_1.ExamQuestionModel.find({ examId: context.examId })
            .sort({ orderIndex: 1 })
            .lean();
        return questions.map((question, index) => mapModernQuestion(question, index));
    }
    const legacyQuestions = await Question_1.default.find({
        exam: context.examId,
        active: { $ne: false },
    })
        .sort({ section: 1, order: 1 })
        .lean();
    const bankQuestions = await examQuestion_model_1.ExamQuestionModel.find({ examId: context.examId })
        .sort({ orderIndex: 1 })
        .lean();
    const rows = [
        ...legacyQuestions.map((question, index) => mapLegacyQuestion(question, index)),
        ...bankQuestions.map((question, index) => mapModernQuestion(question, legacyQuestions.length + index)),
    ];
    const seen = new Set();
    return rows.filter((row) => {
        if (!row.id || seen.has(row.id))
            return false;
        seen.add(row.id);
        return true;
    });
}
function solutionsLocked(context, now = new Date()) {
    if (context.solutionReleaseRule === "after_exam_end") {
        return Boolean(context.examWindowEndUTC && now < context.examWindowEndUTC);
    }
    if (context.solutionReleaseRule === "after_result_publish") {
        return Boolean(context.resultPublishAtUTC && now < context.resultPublishAtUTC);
    }
    if (context.solutionReleaseRule === "manual") {
        return !context.solutionsEnabled;
    }
    return false;
}
async function generateQuestionsPdf(req, res) {
    try {
        const context = await resolveExamContext(String(req.params.examId || ""));
        if (!context) {
            res.status(404).json({ message: "Exam not found" });
            return;
        }
        if (!context.isPublished) {
            res.status(403).json({ message: "Exam not published" });
            return;
        }
        const questions = await loadQuestionsForPdf(context);
        const doc = createPdf();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${sanitizeFilename(context.title)}_questions.pdf"`);
        doc.pipe(res);
        addHeader(doc, context.title || "Exam Questions");
        doc
            .fontSize(10)
            .text(`Subject: ${context.subject || "N/A"}  |  Category: ${context.category || "N/A"}  |  Duration: ${context.durationMinutes} min`);
        doc.moveDown(0.8);
        questions.forEach((question, index) => addQuestionBlock(doc, question, index));
        doc.end();
    }
    catch (err) {
        console.error("[PDF] Questions error:", err);
        if (!res.headersSent)
            res.status(500).json({ message: "PDF generation failed" });
    }
}
async function generateSolutionsPdf(req, res) {
    try {
        const context = await resolveExamContext(String(req.params.examId || ""));
        if (!context) {
            res.status(404).json({ message: "Exam not found" });
            return;
        }
        if (!context.isPublished) {
            res.status(403).json({ message: "Exam not published" });
            return;
        }
        if (solutionsLocked(context)) {
            res.status(403).json({ message: "Solutions not released yet" });
            return;
        }
        const questions = await loadQuestionsForPdf(context);
        const doc = createPdf();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${sanitizeFilename(context.title)}_solutions.pdf"`);
        doc.pipe(res);
        addHeader(doc, `${context.title} - Solutions`);
        questions.forEach((question, index) => addQuestionBlock(doc, question, index, { showCorrect: true, showExplanation: true }));
        doc.end();
    }
    catch (err) {
        console.error("[PDF] Solutions error:", err);
        if (!res.headersSent)
            res.status(500).json({ message: "PDF generation failed" });
    }
}
async function generateAnswersPdf(req, res) {
    try {
        const context = await resolveExamContext(String(req.params.examId || ""));
        if (!context) {
            res.status(404).json({ message: "Exam not found" });
            return;
        }
        const authReq = req;
        const userId = String(authReq.user?._id || authReq.user?.id || "").trim();
        const role = String(authReq.user?.role || "").trim().toLowerCase();
        const isAdmin = ["superadmin", "admin", "moderator", "chairman"].includes(role);
        if (!userId && !isAdmin) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        let questions = [];
        let selectedByQuestion = new Map();
        if (context.kind === "modern") {
            const answers = await answer_model_1.AnswerModel.find({ sessionId: String(req.params.sessionId || "") }).lean();
            if (answers.length === 0) {
                res.status(404).json({ message: "No answers found" });
                return;
            }
            if (!isAdmin && String(answers[0].userId || "") !== userId) {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            questions = await loadQuestionsForPdf(context);
            selectedByQuestion = new Map(answers.map((answer) => [
                String(answer.questionId || ""),
                safeText(answer.selectedKey).toUpperCase() || null,
            ]));
        }
        else {
            const sessionQuery = {
                _id: String(req.params.sessionId || ""),
                exam: String(req.params.examId || ""),
            };
            if (!isAdmin)
                sessionQuery.student = userId;
            const session = await ExamSession_1.default.findOne(sessionQuery).lean();
            if (!session) {
                res.status(404).json({ message: "No answers found" });
                return;
            }
            const orderedQuestionIds = Array.isArray(session.answers)
                ? session.answers
                    .map((answer) => String(answer.questionId || ""))
                    .filter(Boolean)
                : [];
            questions = await loadQuestionsForPdf(context, orderedQuestionIds);
            selectedByQuestion = new Map((Array.isArray(session.answers) ? session.answers : []).map((answer) => [
                String(answer.questionId || ""),
                safeText(answer.selectedAnswer).toUpperCase() || null,
            ]));
        }
        if (questions.length === 0) {
            res.status(404).json({ message: "No answers found" });
            return;
        }
        const doc = createPdf();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${sanitizeFilename(context.title)}_answers.pdf"`);
        doc.pipe(res);
        addHeader(doc, `${context.title} - My Answers`);
        questions.forEach((question, index) => {
            const selected = selectedByQuestion.get(question.id) || null;
            addQuestionBlock(doc, question, index, {
                showSelected: selected,
                showCorrect: true,
                showExplanation: true,
            });
        });
        doc.end();
    }
    catch (err) {
        console.error("[PDF] Answers error:", err);
        if (!res.headersSent)
            res.status(500).json({ message: "PDF generation failed" });
    }
}
//# sourceMappingURL=examPdfController.js.map