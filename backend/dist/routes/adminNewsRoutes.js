"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminNewsRoutes = void 0;
const express_1 = require("express");
const json2csv_1 = require("json2csv");
const xlsx_1 = __importDefault(require("xlsx"));
const newsItem_model_1 = require("../models/newsItem.model");
const newsSettings_model_1 = require("../models/newsSettings.model");
const rssSource_model_1 = require("../models/rssSource.model");
const auditLog_model_1 = require("../models/auditLog.model");
const newsWorkflowService_1 = require("../services/newsWorkflowService");
const rssIngestionService_1 = require("../services/rssIngestionService");
exports.adminNewsRoutes = (0, express_1.Router)();
exports.adminNewsRoutes.get("/news", async (req, res) => {
    const { status, sourceId, q, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (status)
        filters.status = status;
    if (sourceId)
        filters.sourceId = sourceId;
    if (q)
        filters.title = { $regex: q, $options: "i" };
    const rows = await newsItem_model_1.NewsItemModel.find(filters)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
    res.json(rows);
});
exports.adminNewsRoutes.put("/news/:id", async (req, res) => {
    const updated = await newsItem_model_1.NewsItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});
exports.adminNewsRoutes.post("/news/:id/approve-publish", async (req, res) => {
    const item = await (0, newsWorkflowService_1.approveAndPublishNow)(req.params.id, req.headers["x-admin-id"]);
    res.json(item);
});
exports.adminNewsRoutes.post("/news/:id/schedule", async (req, res) => {
    const item = await (0, newsWorkflowService_1.scheduleNews)(req.params.id, new Date(req.body.scheduledAt), req.headers["x-admin-id"]);
    res.json(item);
});
exports.adminNewsRoutes.post("/news/:id/reject", async (req, res) => {
    const item = await (0, newsWorkflowService_1.rejectNews)(req.params.id, req.headers["x-admin-id"]);
    res.json(item);
});
exports.adminNewsRoutes.post("/news/:id/move-to-draft", async (req, res) => {
    const item = await newsItem_model_1.NewsItemModel.findByIdAndUpdate(req.params.id, { status: "draft" }, { new: true });
    res.json(item);
});
exports.adminNewsRoutes.delete("/news/:id", async (req, res) => {
    await newsItem_model_1.NewsItemModel.findByIdAndDelete(req.params.id);
    res.status(204).send();
});
exports.adminNewsRoutes.get("/news/:id", async (req, res) => {
    const item = await newsItem_model_1.NewsItemModel.findById(req.params.id);
    res.json(item);
});
exports.adminNewsRoutes.get("/news/export", async (req, res) => {
    const { status, sourceId, dateRange } = req.query;
    const format = String(req.query.format || req.query.type || 'csv').trim().toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
    const filters = {};
    if (status)
        filters.status = status;
    if (sourceId)
        filters.sourceId = sourceId;
    if (dateRange) {
        const [fromRaw, toRaw] = String(dateRange).split(',').map((part) => part.trim());
        const createdAt = {};
        if (fromRaw)
            createdAt.$gte = new Date(fromRaw);
        if (toRaw)
            createdAt.$lte = new Date(`${toRaw}T23:59:59.999Z`);
        if (Object.keys(createdAt).length > 0)
            filters.createdAt = createdAt;
    }
    const rows = await newsItem_model_1.NewsItemModel.find(filters).lean();
    if (format === 'xlsx') {
        const workbook = xlsx_1.default.utils.book_new();
        const sheet = xlsx_1.default.utils.json_to_sheet(rows);
        xlsx_1.default.utils.book_append_sheet(workbook, sheet, 'News');
        const buffer = xlsx_1.default.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="news_export.xlsx"');
        res.send(buffer);
        return;
    }
    const csv = new json2csv_1.Parser().parse(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="news_export.csv"');
    res.send(csv);
});
exports.adminNewsRoutes.get("/audit-logs", async (_req, res) => {
    const rows = await auditLog_model_1.AuditLogModel.find({ targetType: "news" }).sort({ createdAt: -1 }).limit(500);
    res.json(rows);
});
exports.adminNewsRoutes.get("/rss-sources", async (_req, res) => res.json(await rssSource_model_1.RssSourceModel.find().sort({ priority: 1 })));
exports.adminNewsRoutes.post("/rss-sources", async (req, res) => res.json(await rssSource_model_1.RssSourceModel.create(req.body)));
exports.adminNewsRoutes.put("/rss-sources/:id", async (req, res) => res.json(await rssSource_model_1.RssSourceModel.findByIdAndUpdate(req.params.id, req.body, { new: true })));
exports.adminNewsRoutes.delete("/rss-sources/:id", async (req, res) => {
    await rssSource_model_1.RssSourceModel.findByIdAndDelete(req.params.id);
    res.status(204).send();
});
exports.adminNewsRoutes.post("/rss-sources/:id/test", async (req, res) => {
    const source = await rssSource_model_1.RssSourceModel.findById(req.params.id);
    res.json({ source, preview: source ? [{ title: `Preview for ${source.name}` }] : [] });
});
exports.adminNewsRoutes.post("/rss/fetch-now", async (_req, res) => {
    await (0, rssIngestionService_1.runRssIngestion)();
    res.json({ ok: true });
});
exports.adminNewsRoutes.put("/news-settings", async (req, res) => {
    const settings = await newsSettings_model_1.NewsSettingsModel.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    res.json(settings);
});
//# sourceMappingURL=adminNewsRoutes.js.map