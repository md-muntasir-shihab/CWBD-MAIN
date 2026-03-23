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
const HelpArticleSchema = new mongoose_1.Schema({
    title: { type: String, required: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, maxlength: 250 },
    categoryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'HelpCategory', required: true },
    shortDescription: { type: String, required: true, maxlength: 500 },
    fullContent: { type: String, required: true, maxlength: 50000 },
    tags: [{ type: String, maxlength: 50 }],
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    relatedArticleIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'HelpArticle' }],
    viewsCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    createdByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    lastEditedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
}, { timestamps: true, collection: 'help_articles' });
HelpArticleSchema.index({ categoryId: 1, isPublished: 1 });
HelpArticleSchema.index({ isPublished: 1, isFeatured: -1, createdAt: -1 });
HelpArticleSchema.index({ tags: 1 });
exports.default = mongoose_1.default.model('HelpArticle', HelpArticleSchema);
//# sourceMappingURL=HelpArticle.js.map