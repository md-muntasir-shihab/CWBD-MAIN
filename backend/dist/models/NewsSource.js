"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const NewsSourceSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    rssUrl: { type: String, default: '', trim: true },
    feedUrl: { type: String, required: true, trim: true },
    siteUrl: { type: String, default: '', trim: true },
    iconType: { type: String, enum: ['upload', 'url'], default: 'url' },
    iconUrl: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    fetchIntervalMinutes: { type: Number, default: 30, min: 5, max: 1440 },
    fetchIntervalMin: { type: Number, default: 30, min: 5, max: 1440 },
    categoryTags: [{ type: String }],
    lastFetchedAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastFetchStatus: { type: String, enum: ['idle', 'success', 'failed'], default: 'idle' },
    consecutiveFailureCount: { type: Number, default: 0, min: 0 },
    lastHttpStatus: { type: Number, default: null },
    lastParseError: { type: String, default: '' },
    lastDuplicateRate: { type: Number, default: 0, min: 0 },
    lastCreatedCount: { type: Number, default: 0, min: 0 },
    lastExtractionMode: { type: String, enum: ['rss_content', 'readability_scrape', 'both'], default: 'both' },
    lastError: { type: String, default: '' },
    language: { type: String, default: 'en' },
    tagsDefault: [{ type: String }],
    categoryDefault: { type: String, default: '' },
    maxItemsPerFetch: { type: Number, default: 20, min: 1, max: 100 },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
    collection: 'news_sources',
});
NewsSourceSchema.index({ isActive: 1, order: 1 });
NewsSourceSchema.index({ enabled: 1, priority: 1, order: 1 });
NewsSourceSchema.index({ feedUrl: 1 }, { unique: true });
NewsSourceSchema.index({ lastFetchStatus: 1, consecutiveFailureCount: -1, updatedAt: -1 });
NewsSourceSchema.pre('validate', function syncCompatFields(next) {
    const doc = this;
    const canonicalUrl = String(doc.rssUrl || doc.feedUrl || '').trim();
    if (canonicalUrl) {
        doc.rssUrl = canonicalUrl;
        doc.feedUrl = canonicalUrl;
    }
    doc.enabled = doc.enabled !== undefined ? Boolean(doc.enabled) : Boolean(doc.isActive);
    doc.isActive = Boolean(doc.enabled);
    const interval = Number(doc.fetchIntervalMinutes || doc.fetchIntervalMin || 30);
    doc.fetchIntervalMinutes = interval;
    doc.fetchIntervalMin = interval;
    doc.priority = Number.isFinite(Number(doc.priority)) ? Number(doc.priority) : Number(doc.order || 0);
    doc.order = Number.isFinite(Number(doc.order)) ? Number(doc.order) : Number(doc.priority || 0);
    if (!Array.isArray(doc.categoryTags)) {
        doc.categoryTags = [];
    }
    doc.lastFetchStatus = doc.lastFetchStatus === 'success' || doc.lastFetchStatus === 'failed' ? doc.lastFetchStatus : 'idle';
    doc.consecutiveFailureCount = Math.max(0, Number(doc.consecutiveFailureCount || 0));
    next();
});
exports.default = mongoose_1.default.model('NewsSource', NewsSourceSchema);
//# sourceMappingURL=NewsSource.js.map