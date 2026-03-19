import { Router } from "express";
import { Parser as CsvParser } from "json2csv";
import XLSX from "xlsx";
import { NewsItemModel } from "../models/newsItem.model";
import { NewsSettingsModel } from "../models/newsSettings.model";
import { RssSourceModel } from "../models/rssSource.model";
import { AuditLogModel } from "../models/auditLog.model";
import { approveAndPublishNow, rejectNews, scheduleNews } from "../services/newsWorkflowService";
import { runRssIngestion } from "../services/rssIngestionService";

export const adminNewsRoutes = Router();

adminNewsRoutes.get("/news", async (req, res) => {
  const { status, sourceId, q, page = 1, limit = 20 } = req.query as Record<string, string>;
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (sourceId) filters.sourceId = sourceId;
  if (q) filters.title = { $regex: q, $options: "i" };

  const rows = await NewsItemModel.find(filters)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));
  res.json(rows);
});

adminNewsRoutes.put("/news/:id", async (req, res) => {
  const updated = await NewsItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

adminNewsRoutes.post("/news/:id/approve-publish", async (req, res) => {
  const item = await approveAndPublishNow(req.params.id, req.headers["x-admin-id"] as string | undefined);
  res.json(item);
});

adminNewsRoutes.post("/news/:id/schedule", async (req, res) => {
  const item = await scheduleNews(
    req.params.id,
    new Date(req.body.scheduledAt),
    req.headers["x-admin-id"] as string | undefined
  );
  res.json(item);
});

adminNewsRoutes.post("/news/:id/reject", async (req, res) => {
  const item = await rejectNews(req.params.id, req.headers["x-admin-id"] as string | undefined);
  res.json(item);
});

adminNewsRoutes.post("/news/:id/move-to-draft", async (req, res) => {
  const item = await NewsItemModel.findByIdAndUpdate(req.params.id, { status: "draft" }, { new: true });
  res.json(item);
});

adminNewsRoutes.delete("/news/:id", async (req, res) => {
  await NewsItemModel.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

adminNewsRoutes.get("/news/:id", async (req, res) => {
  const item = await NewsItemModel.findById(req.params.id);
  res.json(item);
});

adminNewsRoutes.get("/news/export", async (req, res) => {
  const { status, sourceId, dateRange } = req.query as Record<string, string>;
  const format = String(req.query.format || req.query.type || 'csv').trim().toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (sourceId) filters.sourceId = sourceId;
  if (dateRange) {
    const [fromRaw, toRaw] = String(dateRange).split(',').map((part) => part.trim());
    const createdAt: Record<string, Date> = {};
    if (fromRaw) createdAt.$gte = new Date(fromRaw);
    if (toRaw) createdAt.$lte = new Date(`${toRaw}T23:59:59.999Z`);
    if (Object.keys(createdAt).length > 0) filters.createdAt = createdAt;
  }
  const rows = await NewsItemModel.find(filters).lean();
  if (format === 'xlsx') {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'News');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="news_export.xlsx"');
    res.send(buffer);
    return;
  }

  const csv = new CsvParser().parse(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="news_export.csv"');
  res.send(csv);
});

adminNewsRoutes.get("/audit-logs", async (_req, res) => {
  const rows = await AuditLogModel.find({ targetType: "news" }).sort({ createdAt: -1 }).limit(500);
  res.json(rows);
});

adminNewsRoutes.get("/rss-sources", async (_req, res) => res.json(await RssSourceModel.find().sort({ priority: 1 })));
adminNewsRoutes.post("/rss-sources", async (req, res) => res.json(await RssSourceModel.create(req.body)));
adminNewsRoutes.put("/rss-sources/:id", async (req, res) =>
  res.json(await RssSourceModel.findByIdAndUpdate(req.params.id, req.body, { new: true }))
);
adminNewsRoutes.delete("/rss-sources/:id", async (req, res) => {
  await RssSourceModel.findByIdAndDelete(req.params.id);
  res.status(204).send();
});
adminNewsRoutes.post("/rss-sources/:id/test", async (req, res) => {
  const source = await RssSourceModel.findById(req.params.id);
  res.json({ source, preview: source ? [{ title: `Preview for ${source.name}` }] : [] });
});

adminNewsRoutes.post("/rss/fetch-now", async (_req, res) => {
  await runRssIngestion();
  res.json({ ok: true });
});

adminNewsRoutes.put("/news-settings", async (req, res) => {
  const settings = await NewsSettingsModel.findOneAndUpdate({}, req.body, { upsert: true, new: true });
  res.json(settings);
});
