"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetUniversityCategoryMaster = adminGetUniversityCategoryMaster;
exports.adminCreateUniversityCategory = adminCreateUniversityCategory;
exports.adminUpdateUniversityCategory = adminUpdateUniversityCategory;
exports.adminToggleUniversityCategory = adminToggleUniversityCategory;
exports.adminDeleteUniversityCategory = adminDeleteUniversityCategory;
exports.adminSyncUniversityCategoryConfig = adminSyncUniversityCategoryConfig;
const mongoose_1 = __importDefault(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const University_1 = __importDefault(require("../models/University"));
const UniversityCategory_1 = __importDefault(require("../models/UniversityCategory"));
const homeStream_1 = require("../realtime/homeStream");
const universitySyncService_1 = require("../services/universitySyncService");
function normalizeSlug(name, requestedSlug) {
    const source = requestedSlug || name;
    const slug = (0, slugify_1.default)(source || '', { lower: true, strict: true });
    return slug || `category-${Date.now()}`;
}
function asObjectId(value) {
    const id = String(value || '').trim();
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id))
        return null;
    return new mongoose_1.default.Types.ObjectId(id);
}
function parseOptionalDate(value) {
    if (value === undefined || value === null || value === '')
        return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeSharedConfig(payload) {
    const source = (payload.sharedConfig && typeof payload.sharedConfig === 'object')
        ? payload.sharedConfig
        : payload;
    return {
        applicationStartDate: parseOptionalDate(source.applicationStartDate),
        applicationEndDate: parseOptionalDate(source.applicationEndDate),
        scienceExamDate: String(source.scienceExamDate || '').trim(),
        artsExamDate: String(source.artsExamDate || '').trim(),
        businessExamDate: String(source.businessExamDate || '').trim(),
        examCenters: (0, universitySyncService_1.normalizeExamCenters)(source.examCenters),
    };
}
async function adminGetUniversityCategoryMaster(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const status = String(req.query.status || 'all').toLowerCase();
        const q = String(req.query.q || '').trim();
        const filter = {};
        if (status === 'active')
            filter.isActive = true;
        if (status === 'inactive')
            filter.isActive = false;
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { labelBn: { $regex: q, $options: 'i' } },
                { labelEn: { $regex: q, $options: 'i' } },
                { slug: { $regex: q, $options: 'i' } },
            ];
        }
        const categories = await UniversityCategory_1.default.find(filter)
            .sort({ homeOrder: 1, name: 1 })
            .lean();
        const counts = await University_1.default.aggregate([
            { $match: { isArchived: { $ne: true } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);
        const countMap = new Map();
        counts.forEach((item) => {
            const name = String(item._id || '').trim();
            if (name)
                countMap.set(name, Number(item.count || 0));
        });
        res.json({
            categories: categories.map((item) => ({
                ...item,
                count: countMap.get(String(item.name || '').trim()) || 0,
            })),
        });
    }
    catch (err) {
        console.error('adminGetUniversityCategoryMaster error:', err);
        res.status(500).json({ message: 'Failed to fetch university categories.' });
    }
}
async function adminCreateUniversityCategory(req, res) {
    try {
        const payload = req.body || {};
        const name = String(payload.name || '').trim();
        if (!name) {
            res.status(400).json({ message: 'Category name is required.' });
            return;
        }
        let slug = normalizeSlug(name, String(payload.slug || ''));
        const exists = await UniversityCategory_1.default.findOne({ $or: [{ name }, { slug }] }).lean();
        if (exists) {
            slug = `${slug}-${Date.now()}`;
        }
        const category = await UniversityCategory_1.default.create({
            name,
            slug,
            labelBn: String(payload.labelBn || ''),
            labelEn: String(payload.labelEn || ''),
            colorToken: String(payload.colorToken || ''),
            icon: String(payload.icon || ''),
            isActive: payload.isActive !== false,
            homeHighlight: Boolean(payload.homeHighlight),
            homeOrder: Number(payload.homeOrder || 0),
            sharedConfig: normalizeSharedConfig(payload),
            createdBy: asObjectId(req.user?._id),
            updatedBy: asObjectId(req.user?._id),
        });
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'category-updated',
            meta: { action: 'create', categoryId: String(category._id) },
        });
        res.status(201).json({ category, message: 'University category created.' });
    }
    catch (err) {
        console.error('adminCreateUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to create university category.' });
    }
}
async function adminUpdateUniversityCategory(req, res) {
    try {
        const payload = req.body || {};
        const category = await UniversityCategory_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        const previousName = String(category.name || '').trim();
        if (payload.name !== undefined) {
            const nextName = String(payload.name || '').trim();
            if (!nextName) {
                res.status(400).json({ message: 'Category name cannot be empty.' });
                return;
            }
            category.name = nextName;
        }
        if (payload.slug !== undefined) {
            category.slug = normalizeSlug(category.name, String(payload.slug || ''));
        }
        if (payload.labelBn !== undefined)
            category.labelBn = String(payload.labelBn || '');
        if (payload.labelEn !== undefined)
            category.labelEn = String(payload.labelEn || '');
        if (payload.colorToken !== undefined)
            category.colorToken = String(payload.colorToken || '');
        if (payload.icon !== undefined)
            category.icon = String(payload.icon || '');
        if (payload.isActive !== undefined)
            category.isActive = Boolean(payload.isActive);
        if (payload.homeHighlight !== undefined)
            category.homeHighlight = Boolean(payload.homeHighlight);
        if (payload.homeOrder !== undefined)
            category.homeOrder = Number(payload.homeOrder || 0);
        if (payload.sharedConfig !== undefined || payload.applicationStartDate !== undefined || payload.examCenters !== undefined) {
            category.sharedConfig = normalizeSharedConfig(payload);
        }
        category.updatedBy = asObjectId(req.user?._id);
        await category.save();
        await (0, universitySyncService_1.renameUniversityCategoryReferences)(String(category._id), previousName, String(category.name || '').trim());
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'category-updated',
            meta: { action: 'update', categoryId: String(category._id) },
        });
        res.json({ category, message: 'University category updated.' });
    }
    catch (err) {
        console.error('adminUpdateUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to update university category.' });
    }
}
async function adminToggleUniversityCategory(req, res) {
    try {
        const category = await UniversityCategory_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        category.isActive = !category.isActive;
        category.updatedBy = asObjectId(req.user?._id);
        await category.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'category-updated',
            meta: { action: 'toggle', categoryId: String(category._id), isActive: category.isActive },
        });
        res.json({ category, message: `Category ${category.isActive ? 'activated' : 'deactivated'}.` });
    }
    catch (err) {
        console.error('adminToggleUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to toggle category status.' });
    }
}
async function adminDeleteUniversityCategory(req, res) {
    try {
        const category = await UniversityCategory_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        category.isActive = false;
        category.updatedBy = asObjectId(req.user?._id);
        await category.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'category-updated',
            meta: { action: 'delete', categoryId: String(category._id) },
        });
        res.json({ message: 'Category archived (soft delete).' });
    }
    catch (err) {
        console.error('adminDeleteUniversityCategory error:', err);
        res.status(500).json({ message: 'Failed to archive category.' });
    }
}
async function adminSyncUniversityCategoryConfig(req, res) {
    try {
        const category = await UniversityCategory_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        if (req.body && (req.body.sharedConfig !== undefined || req.body.examCenters !== undefined || req.body.applicationStartDate !== undefined)) {
            category.sharedConfig = normalizeSharedConfig(req.body || {});
            category.updatedBy = asObjectId(req.user?._id);
            await category.save();
        }
        const syncResult = await (0, universitySyncService_1.syncUniversityCategorySharedConfig)(String(category._id), req.user?._id || null);
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'category-updated',
            meta: { action: 'sync', categoryId: String(category._id), ...syncResult },
        });
        res.json({
            category,
            syncResult,
            message: 'Category configuration synced to universities.',
        });
    }
    catch (err) {
        console.error('adminSyncUniversityCategoryConfig error:', err);
        res.status(500).json({ message: 'Failed to sync category configuration.' });
    }
}
//# sourceMappingURL=universityCategoryController.js.map