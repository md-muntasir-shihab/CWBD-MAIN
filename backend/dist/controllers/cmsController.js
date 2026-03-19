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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetNewsCategories = adminGetNewsCategories;
exports.adminCreateNewsCategory = adminCreateNewsCategory;
exports.adminUpdateNewsCategory = adminUpdateNewsCategory;
exports.adminDeleteNewsCategory = adminDeleteNewsCategory;
exports.adminToggleNewsCategory = adminToggleNewsCategory;
exports.adminGetNews = adminGetNews;
exports.adminCreateNews = adminCreateNews;
exports.adminUpdateNews = adminUpdateNews;
exports.adminDeleteNews = adminDeleteNews;
exports.adminToggleNewsPublish = adminToggleNewsPublish;
exports.getPublicNews = getPublicNews;
exports.getPublicFeaturedNews = getPublicFeaturedNews;
exports.getPublicNewsBySlug = getPublicNewsBySlug;
exports.getTrendingNews = getTrendingNews;
exports.getPublicNewsCategories = getPublicNewsCategories;
exports.adminGetServiceConfig = adminGetServiceConfig;
exports.adminUpdateServiceConfig = adminUpdateServiceConfig;
exports.getPublicServiceConfig = getPublicServiceConfig;
exports.adminGetServices = adminGetServices;
exports.adminCreateService = adminCreateService;
exports.adminUpdateService = adminUpdateService;
exports.adminDeleteService = adminDeleteService;
exports.adminToggleServiceStatus = adminToggleServiceStatus;
exports.adminBulkImportServices = adminBulkImportServices;
exports.adminGetResources = adminGetResources;
exports.adminCreateResource = adminCreateResource;
exports.adminUpdateResource = adminUpdateResource;
exports.adminDeleteResource = adminDeleteResource;
exports.adminToggleResourcePublish = adminToggleResourcePublish;
exports.adminToggleResourceFeatured = adminToggleResourceFeatured;
exports.adminGetResourceSettings = adminGetResourceSettings;
exports.adminUpdateResourceSettings = adminUpdateResourceSettings;
exports.adminGetContactMessages = adminGetContactMessages;
exports.adminDeleteContactMessage = adminDeleteContactMessage;
exports.adminUpdateContactMessage = adminUpdateContactMessage;
exports.getSiteSettings = getSiteSettings;
exports.updateSiteSettings = updateSiteSettings;
exports.adminUpdateUserRole = adminUpdateUserRole;
exports.adminCreateUser = adminCreateUser;
exports.adminResetUserPassword = adminResetUserPassword;
exports.adminExportNews = adminExportNews;
exports.adminExportSubscriptionPlans = adminExportSubscriptionPlans;
exports.adminExportUniversities = adminExportUniversities;
exports.adminExportStudents = adminExportStudents;
const News_1 = __importDefault(require("../models/News"));
const Service_1 = __importDefault(require("../models/Service"));
const ServicePageConfig_1 = __importDefault(require("../models/ServicePageConfig"));
const Resource_1 = __importDefault(require("../models/Resource"));
const ResourceSettings_1 = __importDefault(require("../models/ResourceSettings"));
const ContactMessage_1 = __importDefault(require("../models/ContactMessage"));
const Settings_1 = __importDefault(require("../models/Settings"));
const slugify_1 = __importDefault(require("slugify"));
const homeStream_1 = require("../realtime/homeStream");
const NewsCategory_1 = __importDefault(require("../models/NewsCategory"));
/* ═══════════════════════════════
   NEWS CATEGORY CRUD
═══════════════════════════════ */
async function adminGetNewsCategories(_req, res) {
    try {
        const categories = await NewsCategory_1.default.find().sort({ createdAt: -1 }).lean();
        res.json({ categories });
    }
    catch (err) {
        console.error('adminGetNewsCategories error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateNewsCategory(req, res) {
    try {
        const { name, description } = req.body;
        if (!name) {
            res.status(400).json({ message: 'Category name is required' });
            return;
        }
        let slug = (0, slugify_1.default)(name, { lower: true, strict: true });
        const existing = await NewsCategory_1.default.findOne({ slug });
        if (existing)
            slug = `${slug}-${Date.now()}`;
        const category = await NewsCategory_1.default.create({ name, slug, description });
        res.status(201).json({ category, message: 'Category created' });
    }
    catch (err) {
        console.error('adminCreateNewsCategory error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateNewsCategory(req, res) {
    try {
        const category = await NewsCategory_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json({ category, message: 'Category updated' });
    }
    catch (err) {
        console.error('adminUpdateNewsCategory error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteNewsCategory(req, res) {
    try {
        const category = await NewsCategory_1.default.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json({ message: 'Category deleted' });
    }
    catch (err) {
        console.error('adminDeleteNewsCategory error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleNewsCategory(req, res) {
    try {
        const category = await NewsCategory_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        category.isActive = !category.isActive;
        await category.save();
        res.json({ category, message: `Category ${category.isActive ? 'activated' : 'deactivated'}` });
    }
    catch (err) {
        console.error('adminToggleNewsCategory error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   NEWS CRUD
═══════════════════════════════ */
async function adminGetNews(req, res) {
    try {
        const { page = '1', limit = '20', q, category, status } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = {};
        if (category)
            filter.category = category;
        if (status)
            filter.status = status;
        if (q)
            filter.$or = [
                { title: { $regex: q, $options: 'i' } },
                { shortDescription: { $regex: q, $options: 'i' } },
            ];
        const total = await News_1.default.countDocuments(filter);
        const news = await News_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('createdBy', 'fullName email')
            .lean();
        res.json({ news, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
    }
    catch (err) {
        console.error('adminGetNews error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateNews(req, res) {
    try {
        const data = req.body;
        if (!data.title) {
            res.status(400).json({ message: 'Title is required' });
            return;
        }
        if (!data.slug)
            data.slug = (0, slugify_1.default)(data.title, { lower: true, strict: true });
        const existing = await News_1.default.findOne({ slug: data.slug });
        if (existing)
            data.slug = `${data.slug}-${Date.now()}`;
        if (!data.shortDescription)
            data.shortDescription = data.content?.replace(/<[^>]*>/g, '').slice(0, 200) || '';
        data.createdBy = req.user?._id;
        const news = await News_1.default.create(data);
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'news-updated', meta: { action: 'create', newsId: String(news._id) } });
        res.status(201).json({ news, message: 'News article created' });
    }
    catch (err) {
        console.error('adminCreateNews error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateNews(req, res) {
    try {
        const news = await News_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'news-updated', meta: { action: 'update', newsId: String(news._id) } });
        res.json({ news, message: 'News updated' });
    }
    catch (err) {
        console.error('adminUpdateNews error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteNews(req, res) {
    try {
        const news = await News_1.default.findByIdAndDelete(req.params.id);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'news-updated', meta: { action: 'delete', newsId: String(news._id) } });
        res.json({ message: 'News deleted' });
    }
    catch (err) {
        console.error('adminDeleteNews error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleNewsPublish(req, res) {
    try {
        const news = await News_1.default.findById(req.params.id);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        news.isPublished = !news.isPublished;
        news.status = news.isPublished ? 'published' : 'draft';
        if (news.isPublished && (!news.publishDate || news.publishDate > new Date())) {
            news.publishDate = new Date();
        }
        await news.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'news-updated',
            meta: { action: news.isPublished ? 'publish' : 'unpublish', newsId: String(news._id) },
        });
        res.json({ news, message: `News ${news.isPublished ? 'published' : 'unpublished'}` });
    }
    catch (err) {
        console.error('adminToggleNewsPublish error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   NEWS PUBLIC API
═══════════════════════════════ */
async function getPublicNews(req, res) {
    try {
        const { page = '1', limit = '10', category, search } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = { status: 'published', isPublished: true };
        if (category && category !== 'All')
            filter.category = category;
        if (search)
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { shortDescription: { $regex: search, $options: 'i' } },
            ];
        const total = await News_1.default.countDocuments(filter);
        const news = await News_1.default.find(filter)
            .sort({ publishDate: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .select('-content') // exclude content in list route for performance
            .lean();
        res.json({ success: true, total, currentPage: pageNum, totalPages: Math.ceil(total / limitNum), data: news });
    }
    catch (err) {
        console.error('getPublicNews error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function getPublicFeaturedNews(req, res) {
    try {
        const { limit = '3' } = req.query;
        const limitNum = parseInt(limit, 10);
        let news = await News_1.default.find({ status: 'published', isPublished: true, isFeatured: true })
            .sort({ publishDate: -1 })
            .limit(limitNum)
            .select('-content')
            .lean();
        // If no featured news found, fallback to latest published news
        if (news.length === 0) {
            news = await News_1.default.find({ status: 'published', isPublished: true })
                .sort({ publishDate: -1 })
                .limit(limitNum)
                .select('-content')
                .lean();
        }
        res.json({ success: true, data: news });
    }
    catch (err) {
        console.error('getPublicFeaturedNews error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function getPublicNewsBySlug(req, res) {
    try {
        const news = await News_1.default.findOneAndUpdate({ slug: req.params.slug, status: 'published', isPublished: true }, { $inc: { views: 1 } }, { new: true }).populate('createdBy', 'fullName').lean();
        if (!news) {
            res.status(404).json({ success: false, message: 'News article not found' });
            return;
        }
        res.json({ success: true, data: news });
    }
    catch (err) {
        console.error('getPublicNewsBySlug error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function getTrendingNews(req, res) {
    try {
        const { limit = '5' } = req.query;
        const limitNum = parseInt(limit, 10);
        const news = await News_1.default.find({ status: 'published', isPublished: true })
            .sort({ views: -1, publishDate: -1 })
            .limit(limitNum)
            .select('title slug featuredImage thumbnail publishDate views category')
            .lean();
        res.json({ success: true, data: news });
    }
    catch (err) {
        console.error('getTrendingNews error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
async function getPublicNewsCategories(_req, res) {
    try {
        const categories = await NewsCategory_1.default.find({ isActive: true }).sort({ name: 1 }).lean();
        res.json({ success: true, data: categories });
    }
    catch (err) {
        console.error('getPublicNewsCategories error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
/* ═══════════════════════════════
   SERVICES PAGE CONFIG
═══════════════════════════════ */
async function adminGetServiceConfig(req, res) {
    try {
        let config = await ServicePageConfig_1.default.findOne();
        if (!config)
            config = await ServicePageConfig_1.default.create({});
        res.json({ config });
    }
    catch (err) {
        console.error('adminGetServiceConfig error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateServiceConfig(req, res) {
    try {
        let config = await ServicePageConfig_1.default.findOne();
        if (!config)
            config = new ServicePageConfig_1.default();
        Object.assign(config, req.body);
        await config.save();
        res.json({ config, message: 'Service page configuration updated' });
    }
    catch (err) {
        console.error('adminUpdateServiceConfig error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getPublicServiceConfig(_req, res) {
    try {
        let config = await ServicePageConfig_1.default.findOne();
        if (!config) {
            config = await ServicePageConfig_1.default.create({});
        }
        res.json({ config });
    }
    catch (err) {
        console.error('getPublicServiceConfig error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   SERVICES CRUD
═══════════════════════════════ */
async function adminGetServices(req, res) {
    try {
        const services = await Service_1.default.find().sort({ display_order: 1, createdAt: -1 }).lean();
        res.json({ services });
    }
    catch (err) {
        console.error('adminGetServices error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateService(req, res) {
    try {
        const ObjectData = req.body;
        if (!ObjectData.service_title) {
            res.status(400).json({ message: 'Service title is required' });
            return;
        }
        if (!ObjectData.service_slug) {
            ObjectData.service_slug = (0, slugify_1.default)(ObjectData.service_title, { lower: true, strict: true });
        }
        let slugExists = await Service_1.default.findOne({ service_slug: ObjectData.service_slug });
        if (slugExists) {
            ObjectData.service_slug = `${ObjectData.service_slug}-${Date.now()}`;
        }
        const service = await Service_1.default.create(ObjectData);
        res.status(201).json({ service, message: 'Service created' });
    }
    catch (err) {
        console.error('adminCreateService error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateService(req, res) {
    try {
        const ObjectData = req.body;
        if (ObjectData.service_title && !ObjectData.service_slug) {
            ObjectData.service_slug = (0, slugify_1.default)(ObjectData.service_title, { lower: true, strict: true });
            let slugExists = await Service_1.default.findOne({ service_slug: ObjectData.service_slug, _id: { $ne: req.params.id } });
            if (slugExists)
                ObjectData.service_slug = `${ObjectData.service_slug}-${Date.now()}`;
        }
        const service = await Service_1.default.findByIdAndUpdate(req.params.id, ObjectData, { new: true, runValidators: true });
        if (!service) {
            res.status(404).json({ message: 'Service not found' });
            return;
        }
        res.json({ service, message: 'Service updated' });
    }
    catch (err) {
        console.error('adminUpdateService error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteService(req, res) {
    try {
        const service = await Service_1.default.findByIdAndDelete(req.params.id);
        if (!service) {
            res.status(404).json({ message: 'Service not found' });
            return;
        }
        res.json({ message: 'Service deleted' });
    }
    catch (err) {
        console.error('adminDeleteService error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleServiceStatus(req, res) {
    try {
        const service = await Service_1.default.findById(req.params.id);
        if (!service) {
            res.status(404).json({ message: 'Service not found' });
            return;
        }
        service.is_active = !service.is_active;
        await service.save();
        res.json({ service, message: `Service marked as ${service.is_active ? 'active' : 'inactive'}` });
    }
    catch (err) {
        console.error('adminToggleServiceStatus error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminBulkImportServices(req, res) {
    try {
        const servicesData = req.body;
        if (!Array.isArray(servicesData) || servicesData.length === 0) {
            res.status(400).json({ message: 'Invalid or empty array' });
            return;
        }
        // We process sequentially or bulkWrite. bulkWrite is perfectly efficient.
        const bulkOps = servicesData.map((s) => {
            if (!s.service_title) {
                s.service_title = 'Untilted Service';
            }
            if (!s.service_slug) {
                s.service_slug = (0, slugify_1.default)(s.service_title, { lower: true, strict: true }) + '-' + Math.floor(Math.random() * 10000);
            }
            if (!s.category)
                s.category = 'General';
            if (!s.short_description)
                s.short_description = 'No description provided';
            return {
                updateOne: {
                    filter: { service_title: s.service_title },
                    update: { $set: s },
                    upsert: true
                }
            };
        });
        const result = await Service_1.default.bulkWrite(bulkOps);
        res.json({ message: `Successfully imported ${bulkOps.length} services (Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount})` });
    }
    catch (err) {
        console.error('adminBulkImportServices error:', err);
        res.status(500).json({ message: 'Server error during bulk import' });
    }
}
/* ═══════════════════════════════
   RESOURCES CRUD
═══════════════════════════════ */
async function adminGetResources(req, res) {
    try {
        const { page = '1', limit = '20', type, category } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = {};
        if (type)
            filter.type = type;
        if (category)
            filter.category = category;
        const total = await Resource_1.default.countDocuments(filter);
        const resources = await Resource_1.default.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        res.json({ resources, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
    }
    catch (err) {
        console.error('adminGetResources error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateResource(req, res) {
    try {
        const data = req.body;
        if (!data.title || !data.type) {
            res.status(400).json({ message: 'Title and type are required' });
            return;
        }
        // Auto-generate slug from title
        let slug = (0, slugify_1.default)(String(data.title), { lower: true, strict: true });
        const existing = await Resource_1.default.findOne({ slug });
        if (existing)
            slug = `${slug}-${Date.now()}`;
        data.slug = slug;
        const resource = await Resource_1.default.create(data);
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'resources', action: 'create', resourceId: String(resource._id) } });
        res.status(201).json({ resource, message: 'Resource created' });
    }
    catch (err) {
        console.error('adminCreateResource error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateResource(req, res) {
    try {
        const resource = await Resource_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!resource) {
            res.status(404).json({ message: 'Resource not found' });
            return;
        }
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'resources', action: 'update', resourceId: String(resource._id) } });
        res.json({ resource, message: 'Resource updated' });
    }
    catch (err) {
        console.error('adminUpdateResource error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteResource(req, res) {
    try {
        const resource = await Resource_1.default.findByIdAndDelete(req.params.id);
        if (!resource) {
            res.status(404).json({ message: 'Resource not found' });
            return;
        }
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'resources', action: 'delete', resourceId: String(resource._id) } });
        res.json({ message: 'Resource deleted' });
    }
    catch (err) {
        console.error('adminDeleteResource error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleResourcePublish(req, res) {
    try {
        const resource = await Resource_1.default.findById(req.params.id);
        if (!resource) {
            res.status(404).json({ message: 'Resource not found' });
            return;
        }
        resource.isPublic = !resource.isPublic;
        await resource.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'resources', action: 'toggle-publish', resourceId: String(resource._id) } });
        res.json({ resource, message: `Resource marked as ${resource.isPublic ? 'public' : 'private'}` });
    }
    catch (err) {
        console.error('adminToggleResourcePublish error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminToggleResourceFeatured(req, res) {
    try {
        const resource = await Resource_1.default.findById(req.params.id);
        if (!resource) {
            res.status(404).json({ message: 'Resource not found' });
            return;
        }
        resource.isFeatured = !resource.isFeatured;
        await resource.save();
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { section: 'resources', action: 'toggle-featured', resourceId: String(resource._id) } });
        res.json({ resource, message: `Resource ${resource.isFeatured ? 'featured' : 'unfeatured'}` });
    }
    catch (err) {
        console.error('adminToggleResourceFeatured error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetResourceSettings(_req, res) {
    try {
        const existing = await ResourceSettings_1.default.findOne();
        if (!existing) {
            const created = await ResourceSettings_1.default.create({});
            res.json({ settings: created.toObject() });
            return;
        }
        res.json({ settings: existing.toObject() });
    }
    catch (err) {
        console.error('adminGetResourceSettings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateResourceSettings(req, res) {
    try {
        const input = (req.body || {});
        const allowedKeys = new Set(['pageTitle', 'pageSubtitle', 'defaultThumbnailUrl', 'showFeatured', 'trackingEnabled']);
        const safeUpdate = {};
        for (const [k, v] of Object.entries(input)) {
            if (allowedKeys.has(k))
                safeUpdate[k] = v;
        }
        const settings = await ResourceSettings_1.default.findOneAndUpdate({}, { $set: safeUpdate }, { new: true, upsert: true, runValidators: true });
        res.json({ settings, message: 'Resource settings updated' });
    }
    catch (err) {
        console.error('adminUpdateResourceSettings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   CONTACT MESSAGES
═══════════════════════════════ */
async function adminGetContactMessages(req, res) {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const total = await ContactMessage_1.default.countDocuments();
        const messages = await ContactMessage_1.default.find()
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        res.json({ messages, pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
    }
    catch (err) {
        console.error('adminGetContactMessages error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteContactMessage(req, res) {
    try {
        const msg = await ContactMessage_1.default.findByIdAndDelete(req.params.id);
        if (!msg) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ message: 'Message deleted' });
    }
    catch (err) {
        console.error('adminDeleteContactMessage error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateContactMessage(req, res) {
    try {
        const update = {};
        if (req.body.isRead !== undefined) {
            update.isRead = Boolean(req.body.isRead);
        }
        if (req.body.isReplied !== undefined) {
            update.isReplied = Boolean(req.body.isReplied);
        }
        const msg = await ContactMessage_1.default.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
        if (!msg) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        res.json({ item: msg, message: 'Contact message updated' });
    }
    catch (err) {
        console.error('adminUpdateContactMessage error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   SITE SETTINGS
═══════════════════════════════ */
async function getSiteSettings(_req, res) {
    try {
        const existing = await Settings_1.default.findOne();
        if (!existing) {
            const created = await Settings_1.default.create({});
            res.json({ settings: created.toObject() });
            return;
        }
        res.json({ settings: existing.toObject() });
    }
    catch (err) {
        console.error('getSiteSettings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function updateSiteSettings(req, res) {
    try {
        const input = (req.body || {});
        const allowedKeys = new Set([
            'siteName',
            'tagline',
            'metaTitle',
            'metaDescription',
            'logoUrl',
            'faviconUrl',
            'footerText',
            'contactEmail',
            'contactPhone',
            'contactAddress',
            'socialLinks',
            'maintenanceMode',
        ]);
        const unknownKeys = Object.keys(input).filter((key) => !allowedKeys.has(key));
        if (unknownKeys.length) {
            res.status(400).json({ message: `Unknown settings keys: ${unknownKeys.join(', ')}` });
            return;
        }
        if (input.socialLinks !== undefined && !Array.isArray(input.socialLinks)) {
            res.status(400).json({ message: 'socialLinks must be an array' });
            return;
        }
        const updatePayload = { updatedBy: req.user?._id };
        for (const key of allowedKeys) {
            if (input[key] !== undefined) {
                updatePayload[key] = input[key];
            }
        }
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create(updatePayload);
        }
        else {
            Object.assign(settings, updatePayload);
            await settings.save();
        }
        res.json({ settings, message: 'Settings updated successfully' });
    }
    catch (err) {
        console.error('updateSiteSettings error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   ROLE MANAGEMENT
═══════════════════════════════ */
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function adminUpdateUserRole(req, res) {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const validRoles = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'student', 'chairman'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
            return;
        }
        // Only superadmin can set superadmin role
        if (role === 'superadmin' && req.user?.role !== 'superadmin') {
            res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
            return;
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { role }, { new: true });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ user, message: `User role updated to ${role}` });
    }
    catch (err) {
        console.error('adminUpdateUserRole error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateUser(req, res) {
    try {
        const { username, email, password, fullName, role } = req.body;
        if (!username || !email || !password || !fullName) {
            res.status(400).json({ message: 'username, email, password, fullName are required' });
            return;
        }
        const existing = await User_1.default.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            res.status(400).json({ message: 'User with this email or username already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await User_1.default.create({
            username, email, password: hashedPassword, full_name: fullName,
            role: role || 'student',
        });
        res.status(201).json({
            user: { _id: user._id, username: user.username, email: user.email, role: user.role, fullName: user.full_name },
            message: 'User created successfully',
        });
    }
    catch (err) {
        console.error('adminCreateUser error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminResetUserPassword(req, res) {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters' });
            return;
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 12);
        user.mustChangePassword = true;
        await user.save();
        res.json({ message: 'Password reset successfully. User must change password on next login.' });
    }
    catch (err) {
        console.error('adminResetUserPassword error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
/* ═══════════════════════════════
   DATA EXPORT
═══════════════════════════════ */
async function adminExportNews(_req, res) {
    try {
        const news = await News_1.default.find().lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=news_export.json');
        res.json(news);
    }
    catch (err) {
        console.error('adminExportNews error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportSubscriptionPlans(_req, res) {
    try {
        const services = await Service_1.default.find().lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=subscription_plans_export.json');
        res.json(services);
    }
    catch (err) {
        console.error('adminExportSubscriptionPlans error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportUniversities(_req, res) {
    try {
        const { default: University } = await Promise.resolve().then(() => __importStar(require('../models/University')));
        const universities = await University.find().lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=universities_export.json');
        res.json(universities);
    }
    catch (err) {
        console.error('adminExportUniversities error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportStudents(_req, res) {
    try {
        const students = await User_1.default.find({ role: 'student' }).select('-password -twoFactorSecret').lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=students_export.json');
        res.json(students);
    }
    catch (err) {
        console.error('adminExportStudents error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=cmsController.js.map