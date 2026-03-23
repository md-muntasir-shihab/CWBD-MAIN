"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniversities = getUniversities;
exports.getUniversityCategories = getUniversityCategories;
exports.getUniversityBySlug = getUniversityBySlug;
exports.adminGetAllUniversities = adminGetAllUniversities;
exports.adminGetUniversityCategories = adminGetUniversityCategories;
exports.adminGetUniversityById = adminGetUniversityById;
exports.adminCreateUniversity = adminCreateUniversity;
exports.adminUpdateUniversity = adminUpdateUniversity;
exports.adminDeleteUniversity = adminDeleteUniversity;
exports.adminBulkDeleteUniversities = adminBulkDeleteUniversities;
exports.adminBulkUpdateUniversities = adminBulkUpdateUniversities;
exports.adminToggleUniversityStatus = adminToggleUniversityStatus;
exports.adminReorderFeaturedUniversities = adminReorderFeaturedUniversities;
exports.adminExportUniversities = adminExportUniversities;
const exceljs_1 = __importDefault(require("exceljs"));
const slugify_1 = __importDefault(require("slugify"));
const HomeSettings_1 = __importDefault(require("../models/HomeSettings"));
const University_1 = __importDefault(require("../models/University"));
const UniversityCategory_1 = __importDefault(require("../models/UniversityCategory"));
const UniversityCluster_1 = __importDefault(require("../models/UniversityCluster"));
const UniversitySettings_1 = require("../models/UniversitySettings");
const studentDashboardStream_1 = require("../realtime/studentDashboardStream");
const homeStream_1 = require("../realtime/homeStream");
const universitySyncService_1 = require("../services/universitySyncService");
const universityCategories_1 = require("../utils/universityCategories");
const SORT_WHITELIST = {
    name: 'name',
    shortForm: 'shortForm',
    category: 'category',
    applicationStartDate: 'applicationStartDate',
    applicationEndDate: 'applicationEndDate',
    examDateScience: 'scienceExamDate',
    examDateArts: 'artsExamDate',
    examDateBusiness: 'businessExamDate',
    establishedYear: 'established',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
};
const PUBLIC_UNIVERSITY_LIST_PROJECTION = [
    'name',
    'shortForm',
    'category',
    'clusterGroup',
    'established',
    'establishedYear',
    'address',
    'contactNumber',
    'email',
    'website',
    'websiteUrl',
    'admissionWebsite',
    'admissionUrl',
    'totalSeats',
    'scienceSeats',
    'seatsScienceEng',
    'artsSeats',
    'seatsArtsHum',
    'businessSeats',
    'seatsBusiness',
    'logoUrl',
    'applicationStartDate',
    'applicationEndDate',
    'scienceExamDate',
    'examDateScience',
    'artsExamDate',
    'examDateArts',
    'businessExamDate',
    'examDateBusiness',
    'isActive',
    'featured',
    'featuredOrder',
    'examCenters',
    'clusterId',
    'clusterName',
    'clusterCount',
    'categorySyncLocked',
    'clusterSyncLocked',
    'slug',
].join(' ');
function asStatusFilter(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'active' || raw === 'inactive' || raw === 'archived' || raw === 'all')
        return raw;
    return 'all';
}
function toBool(value, fallback = false) {
    if (value === undefined || value === null || value === '')
        return fallback;
    if (typeof value === 'boolean')
        return value;
    const lowered = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(lowered))
        return true;
    if (['0', 'false', 'no', 'off'].includes(lowered))
        return false;
    return fallback;
}
function normalizeSort(sortBy, sortOrder, legacySort) {
    const sortParam = String(sortBy || legacySort || '').trim().toLowerCase();
    if (sortParam === 'deadline' || sortParam === 'nearest_application_deadline')
        return { applicationEndDate: 1, name: 1 };
    if (sortParam === 'alphabetical')
        return { name: 1 };
    if (sortParam === 'name_asc')
        return { name: 1 };
    if (sortParam === 'name_desc')
        return { name: -1 };
    if (sortParam === 'closing_soon' || sortParam === 'nearest_deadline')
        return { applicationEndDate: 1, name: 1 };
    if (sortParam === 'exam_soon')
        return { scienceExamDate: 1, artsExamDate: 1, businessExamDate: 1, name: 1 };
    const legacy = String(legacySort || '').trim();
    if (legacy.startsWith('-') && SORT_WHITELIST[legacy.slice(1)])
        return { [SORT_WHITELIST[legacy.slice(1)]]: -1 };
    if (SORT_WHITELIST[legacy])
        return { [SORT_WHITELIST[legacy]]: 1 };
    const key = SORT_WHITELIST[String(sortBy || '').trim()] || 'createdAt';
    const order = String(sortOrder || '').trim().toLowerCase() === 'asc' ? 1 : -1;
    return { [key]: order };
}
function normalizeSlug(name, existingSlug) {
    const fallback = (0, slugify_1.default)(name || existingSlug || '', { lower: true, strict: true });
    return fallback || `university-${Date.now()}`;
}
function csvEscape(value) {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n'))
        return `"${text.replace(/"/g, '""')}"`;
    return text;
}
function toDateString(value) {
    if (!value)
        return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime()))
        return String(value);
    return date.toISOString().slice(0, 10);
}
function asStringIdList(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item)).filter(Boolean);
    const raw = String(value || '').trim();
    if (!raw)
        return [];
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
}
function normalizeClusterGroupValue(data) {
    const rawGroup = String(data.clusterGroup || '').trim();
    data.clusterGroup = rawGroup || String(data.clusterName || '').trim() || '';
}
function hasAnyDefined(source, keys) {
    return keys.some((key) => source[key] !== undefined);
}
function buildUniversityMutationPayload(input, opts) {
    const partial = Boolean(opts?.partial);
    const output = partial
        ? Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
        : { ...input };
    const website = String(input.website || input.websiteUrl || '').trim();
    const admissionWebsite = String(input.admissionWebsite || input.admissionUrl || '').trim();
    const established = Number(input.establishedYear ?? input.established ?? 0);
    const applicationStartDate = input.applicationStartDate || input.applicationStart || null;
    const applicationEndDate = input.applicationEndDate || input.applicationEnd || null;
    const examDateScience = String(input.examDateScience || input.scienceExamDate || '').trim();
    const examDateArts = String(input.examDateArts || input.artsExamDate || '').trim();
    const examDateBusiness = String(input.examDateBusiness || input.businessExamDate || '').trim();
    const seatsScienceEng = String(input.seatsScienceEng || input.scienceSeats || '').trim();
    const seatsArtsHum = String(input.seatsArtsHum || input.artsSeats || '').trim();
    const seatsBusiness = String(input.seatsBusiness || input.businessSeats || '').trim();
    const clusterGroup = String(input.clusterGroup || input.clusterName || '').trim();
    if (!partial || hasAnyDefined(input, ['category', 'categoryId'])) {
        output.category = (0, universityCategories_1.normalizeUniversityCategory)(input.category || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
    }
    if (!partial || hasAnyDefined(input, ['website', 'websiteUrl'])) {
        output.website = website;
        output.websiteUrl = website;
    }
    if (!partial || hasAnyDefined(input, ['admissionWebsite', 'admissionUrl'])) {
        output.admissionWebsite = admissionWebsite;
        output.admissionUrl = admissionWebsite;
    }
    if (!partial || hasAnyDefined(input, ['established', 'establishedYear'])) {
        output.established = Number.isFinite(established) && established > 0 ? established : undefined;
        output.establishedYear = Number.isFinite(established) && established > 0 ? established : undefined;
    }
    if (!partial || hasAnyDefined(input, ['applicationStartDate', 'applicationStart'])) {
        output.applicationStartDate = applicationStartDate || null;
        output.applicationStart = applicationStartDate || null;
    }
    if (!partial || hasAnyDefined(input, ['applicationEndDate', 'applicationEnd'])) {
        output.applicationEndDate = applicationEndDate || null;
        output.applicationEnd = applicationEndDate || null;
    }
    if (!partial || hasAnyDefined(input, ['scienceExamDate', 'examDateScience'])) {
        output.scienceExamDate = examDateScience;
        output.examDateScience = examDateScience;
    }
    if (!partial || hasAnyDefined(input, ['artsExamDate', 'examDateArts'])) {
        output.artsExamDate = examDateArts;
        output.examDateArts = examDateArts;
    }
    if (!partial || hasAnyDefined(input, ['businessExamDate', 'examDateBusiness'])) {
        output.businessExamDate = examDateBusiness;
        output.examDateBusiness = examDateBusiness;
    }
    if (!partial || hasAnyDefined(input, ['scienceSeats', 'seatsScienceEng'])) {
        output.scienceSeats = seatsScienceEng;
        output.seatsScienceEng = seatsScienceEng;
    }
    if (!partial || hasAnyDefined(input, ['artsSeats', 'seatsArtsHum'])) {
        output.artsSeats = seatsArtsHum;
        output.seatsArtsHum = seatsArtsHum;
    }
    if (!partial || hasAnyDefined(input, ['businessSeats', 'seatsBusiness'])) {
        output.businessSeats = seatsBusiness;
        output.seatsBusiness = seatsBusiness;
    }
    if (!partial || hasAnyDefined(input, ['totalSeats'])) {
        output.totalSeats = String(input.totalSeats || '').trim() || 'N/A';
    }
    if (!partial || hasAnyDefined(input, ['clusterGroup', 'clusterName'])) {
        output.clusterGroup = clusterGroup;
        output.clusterName = String(input.clusterName || clusterGroup).trim();
    }
    if (!partial || input.isActive !== undefined) {
        output.isActive = toBool(input.isActive, true);
    }
    if (!partial || input.featured !== undefined) {
        output.featured = toBool(input.featured, false);
    }
    if (!partial || input.categorySyncLocked !== undefined) {
        output.categorySyncLocked = toBool(input.categorySyncLocked, false);
    }
    if (!partial || input.clusterSyncLocked !== undefined) {
        output.clusterSyncLocked = toBool(input.clusterSyncLocked, false);
    }
    if (!partial || input.examCenters !== undefined) {
        output.examCenters = (0, universitySyncService_1.normalizeExamCenters)(input.examCenters);
    }
    return output;
}
function toCanonicalUniversityRecord(input) {
    const website = String(input.website || input.websiteUrl || '').trim();
    const admissionWebsite = String(input.admissionWebsite || input.admissionUrl || '').trim();
    const established = Number(input.establishedYear ?? input.established ?? 0);
    const applicationStartDate = input.applicationStartDate || input.applicationStart || null;
    const applicationEndDate = input.applicationEndDate || input.applicationEnd || null;
    const examDateScience = String(input.examDateScience || input.scienceExamDate || '').trim();
    const examDateArts = String(input.examDateArts || input.artsExamDate || '').trim();
    const examDateBusiness = String(input.examDateBusiness || input.businessExamDate || '').trim();
    const seatsScienceEng = String(input.seatsScienceEng || input.scienceSeats || '').trim();
    const seatsArtsHum = String(input.seatsArtsHum || input.artsSeats || '').trim();
    const seatsBusiness = String(input.seatsBusiness || input.businessSeats || '').trim();
    const clusterGroup = String(input.clusterGroup || input.clusterName || '').trim();
    return {
        ...input,
        category: (0, universityCategories_1.normalizeUniversityCategory)(input.category || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY),
        website,
        websiteUrl: website,
        admissionWebsite,
        admissionUrl: admissionWebsite,
        established: Number.isFinite(established) && established > 0 ? established : undefined,
        establishedYear: Number.isFinite(established) && established > 0 ? established : undefined,
        applicationStartDate: applicationStartDate || null,
        applicationStart: applicationStartDate || null,
        applicationEndDate: applicationEndDate || null,
        applicationEnd: applicationEndDate || null,
        scienceExamDate: examDateScience,
        artsExamDate: examDateArts,
        businessExamDate: examDateBusiness,
        examDateScience,
        examDateArts,
        examDateBusiness,
        scienceSeats: seatsScienceEng,
        artsSeats: seatsArtsHum,
        businessSeats: seatsBusiness,
        seatsScienceEng,
        seatsArtsHum,
        seatsBusiness,
        totalSeats: String(input.totalSeats || '').trim() || 'N/A',
        clusterGroup,
        clusterName: String(input.clusterName || clusterGroup).trim(),
        isActive: toBool(input.isActive, true),
        featured: toBool(input.featured, false),
        categorySyncLocked: toBool(input.categorySyncLocked, false),
        clusterSyncLocked: toBool(input.clusterSyncLocked, false),
        examCenters: (0, universitySyncService_1.normalizeExamCenters)(input.examCenters),
    };
}
async function resolveCategoryFields(source) {
    const categoryIdRaw = String(source.categoryId || '').trim();
    if (categoryIdRaw) {
        const byId = await UniversityCategory_1.default.findById(categoryIdRaw).select('_id name').lean();
        if (byId)
            return { category: (0, universityCategories_1.normalizeUniversityCategory)(byId.name), categoryId: String(byId._id) };
    }
    const categoryName = (0, universityCategories_1.normalizeUniversityCategory)(source.category || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
    const byName = await (0, universitySyncService_1.ensureUniversityCategoryByName)(categoryName);
    return { category: categoryName, categoryId: byName ? String(byName._id) : null };
}
async function resolveClusterFields(source) {
    const clusterIdRaw = String(source.clusterId || '').trim();
    if (clusterIdRaw) {
        const byId = await UniversityCluster_1.default.findById(clusterIdRaw).select('_id name').lean();
        if (byId) {
            return {
                clusterId: String(byId._id),
                clusterName: String(byId.name || '').trim(),
                clusterGroup: String(byId.name || '').trim(),
            };
        }
    }
    const clusterName = String(source.clusterGroup || source.clusterName || '').trim();
    if (!clusterName)
        return { clusterId: null, clusterName: '', clusterGroup: '' };
    const cluster = await (0, universitySyncService_1.ensureUniversityClusterByName)(clusterName);
    return {
        clusterId: String(cluster._id),
        clusterName: cluster.name,
        clusterGroup: cluster.name,
    };
}
async function getUniversityDashboardConfig() {
    const settings = await HomeSettings_1.default.findOne().select('universityDashboard').lean();
    const showAllCategories = Boolean(settings?.universityDashboard?.showAllCategories);
    const rawDefault = String(settings?.universityDashboard?.defaultCategory || '').trim();
    const normalizedDefault = (0, universityCategories_1.isAllUniversityCategoryToken)(rawDefault)
        ? universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY
        : (0, universityCategories_1.normalizeUniversityCategory)(rawDefault || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
    return {
        defaultCategory: normalizedDefault,
        showAllCategories,
    };
}
function buildUniversityFilter(query, opts) {
    const includeArchivedDefault = Boolean(opts?.includeArchivedDefault);
    const requireCategory = Boolean(opts?.requireCategory);
    const allowAllCategories = Boolean(opts?.allowAllCategories);
    const { q, search, category, status, clusterId, clusterGroup, activeOnly } = query;
    const filter = {};
    const statusFilter = asStatusFilter(status);
    if (statusFilter === 'archived')
        filter.isArchived = true;
    else if (statusFilter === 'active') {
        filter.isArchived = { $ne: true };
        filter.isActive = true;
    }
    else if (statusFilter === 'inactive') {
        filter.isArchived = { $ne: true };
        filter.isActive = false;
    }
    else if (!includeArchivedDefault)
        filter.isArchived = { $ne: true };
    if (activeOnly !== undefined)
        filter.isActive = toBool(activeOnly, true);
    let categoryMissing = false;
    const categoryRaw = String(category || '').trim();
    if (categoryRaw && !(0, universityCategories_1.isAllUniversityCategoryToken)(categoryRaw)) {
        filter.category = (0, universityCategories_1.normalizeUniversityCategory)(categoryRaw);
    }
    else if (categoryRaw && (0, universityCategories_1.isAllUniversityCategoryToken)(categoryRaw) && requireCategory && !allowAllCategories) {
        categoryMissing = true;
    }
    else if (!categoryRaw && requireCategory && !allowAllCategories) {
        categoryMissing = true;
    }
    if (clusterId)
        filter.clusterId = clusterId;
    if (clusterGroup && String(clusterGroup).trim())
        filter.clusterGroup = String(clusterGroup).trim();
    const searchTerm = String(search || q || '').trim();
    if (searchTerm) {
        filter.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { shortForm: { $regex: searchTerm, $options: 'i' } },
            { address: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { shortDescription: { $regex: searchTerm, $options: 'i' } },
        ];
    }
    return { filter, categoryMissing };
}
async function resolveBulkTargetFilter(req) {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => String(id)).filter(Boolean) : [];
    if (ids.length > 0) {
        return { _id: { $in: ids } };
    }
    const applyToFiltered = Boolean(req.body?.applyToFiltered);
    const filterPayload = (req.body?.filter && typeof req.body.filter === 'object')
        ? req.body.filter
        : {};
    if (!applyToFiltered)
        return {};
    const { filter } = buildUniversityFilter(filterPayload, { includeArchivedDefault: false });
    return filter;
}
/* ------------------------------- PUBLIC ------------------------------- */
async function getUniversities(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const { page = '1', limit = '24', featured, sort = 'alphabetical', sortBy, sortOrder } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 24));
        const dashboardConfig = await getUniversityDashboardConfig();
        const { filter, categoryMissing } = buildUniversityFilter(req.query, { requireCategory: true, allowAllCategories: dashboardConfig.showAllCategories });
        const featuredRaw = String(req.query.featured || '').trim().toLowerCase();
        const featuredMode = ['true', '1', 'yes', 'on'].includes(featuredRaw);
        if (categoryMissing && !featuredMode) {
            res.status(400).json({
                message: 'Category is required for this endpoint.',
                code: 'CATEGORY_REQUIRED',
                defaultCategory: dashboardConfig.defaultCategory,
            });
            return;
        }
        filter.isActive = true;
        if (featuredMode)
            filter.featured = true;
        const sortOption = featuredMode
            ? { featuredOrder: 1, name: 1 }
            : normalizeSort(sortBy, sortOrder, sort);
        const total = await University_1.default.countDocuments(filter);
        const rows = await University_1.default.find(filter)
            .select(PUBLIC_UNIVERSITY_LIST_PROJECTION)
            .sort(sortOption)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        res.json({
            items: rows.map((item) => toCanonicalUniversityRecord(item)),
            page: pageNum,
            limit: limitNum,
            total,
        });
    }
    catch (error) {
        console.error('Get universities error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getUniversityCategories(_req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const rows = await University_1.default.aggregate([
            { $match: { isActive: true, isArchived: { $ne: true } } },
            { $group: { _id: '$category', count: { $sum: 1 }, clusterGroups: { $addToSet: '$clusterGroup' } } },
        ]);
        const map = new Map();
        rows.forEach((row) => {
            const name = (0, universityCategories_1.normalizeUniversityCategory)(row._id || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
            const existing = map.get(name) || { count: 0, clusterGroups: new Set() };
            existing.count += Number(row.count || 0);
            if (Array.isArray(row.clusterGroups)) {
                row.clusterGroups
                    .map((value) => String(value || '').trim())
                    .filter(Boolean)
                    .forEach((group) => existing.clusterGroups.add(group));
            }
            map.set(name, existing);
        });
        const extra = Array.from(map.keys()).filter((name) => !universityCategories_1.UNIVERSITY_CATEGORY_ORDER.includes(name));
        const ordered = [...universityCategories_1.UNIVERSITY_CATEGORY_ORDER, ...extra.sort((a, b) => a.localeCompare(b))];
        const categories = ordered.map((categoryName, index) => ({
            categoryName,
            order: index + 1,
            count: map.get(categoryName)?.count || 0,
            clusterGroups: Array.from(map.get(categoryName)?.clusterGroups || []).sort(),
        }));
        res.json(categories);
    }
    catch (error) {
        console.error('Get university categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getUniversityBySlug(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const row = await University_1.default.findOne({ slug: req.params.slug, isActive: true, isArchived: { $ne: true } }).lean();
        if (!row) {
            res.status(404).json({ message: 'University not found' });
            return;
        }
        res.json(toCanonicalUniversityRecord(row));
    }
    catch (error) {
        console.error('Get university error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
/* -------------------------------- ADMIN -------------------------------- */
async function adminGetAllUniversities(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const { page = '1', limit = '25', sort, sortBy, sortOrder, fields } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 25));
        const { filter } = buildUniversityFilter(req.query, { includeArchivedDefault: false });
        const selectedIds = asStringIdList(req.query.selectedIds);
        if (selectedIds.length > 0)
            filter._id = { $in: selectedIds };
        const sortOption = normalizeSort(sortBy, sortOrder, sort);
        let projection = '';
        if (fields)
            projection = String(fields).split(',').map((item) => item.trim()).filter(Boolean).join(' ');
        const total = await University_1.default.countDocuments(filter);
        const query = University_1.default.find(filter).sort(sortOption).skip((pageNum - 1) * limitNum).limit(limitNum);
        if (projection)
            query.select(projection);
        const rows = await query.lean();
        res.json({
            universities: rows.map((item) => toCanonicalUniversityRecord(item)),
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    }
    catch (err) {
        console.error('adminGetAllUniversities error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetUniversityCategories(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const statusFilter = asStatusFilter(req.query.status);
        const baseFilter = {};
        if (statusFilter === 'archived')
            baseFilter.isArchived = true;
        else if (statusFilter === 'active') {
            baseFilter.isArchived = { $ne: true };
            baseFilter.isActive = true;
        }
        else if (statusFilter === 'inactive') {
            baseFilter.isArchived = { $ne: true };
            baseFilter.isActive = false;
        }
        else
            baseFilter.isArchived = { $ne: true };
        const counts = await University_1.default.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$category', count: { $sum: 1 }, clusterGroups: { $addToSet: '$clusterGroup' } } },
        ]);
        const normalizedMap = new Map();
        counts.forEach((row) => {
            const name = (0, universityCategories_1.normalizeUniversityCategory)(row._id || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
            const existing = normalizedMap.get(name) || { count: 0, clusterGroups: new Set() };
            existing.count += Number(row.count || 0);
            if (Array.isArray(row.clusterGroups)) {
                row.clusterGroups
                    .map((v) => String(v || '').trim())
                    .filter(Boolean)
                    .forEach((group) => existing.clusterGroups.add(group));
            }
            normalizedMap.set(name, existing);
        });
        const categories = Array.from(normalizedMap.entries())
            .map(([name, meta]) => ({
            name,
            count: meta.count,
            clusterGroups: Array.from(meta.clusterGroups).sort(),
        }))
            .sort((a, b) => {
            const ai = (0, universityCategories_1.getUniversityCategoryOrderIndex)(a.name);
            const bi = (0, universityCategories_1.getUniversityCategoryOrderIndex)(b.name);
            if (ai !== bi)
                return ai - bi;
            return a.name.localeCompare(b.name);
        });
        res.json({ categories });
    }
    catch (err) {
        console.error('adminGetUniversityCategories error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetUniversityById(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const row = await University_1.default.findById(req.params.id).lean();
        if (!row) {
            res.status(404).json({ message: 'University not found' });
            return;
        }
        res.json({ university: toCanonicalUniversityRecord(row) });
    }
    catch (err) {
        console.error('adminGetUniversityById error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminCreateUniversity(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const payload = buildUniversityMutationPayload((req.body || {}));
        if (!payload.name || !String(payload.name).trim()) {
            res.status(400).json({ message: 'University name is required' });
            return;
        }
        // Category validation against allowed list
        const catName = String(payload.category || '').trim();
        if (catName) {
            const settings = await (0, UniversitySettings_1.ensureUniversitySettings)();
            const isAllowed = UniversitySettings_1.ALLOWED_CATEGORIES.some((c) => c.toLowerCase() === catName.toLowerCase());
            if (!isAllowed && !settings.allowCustomCategories) {
                res.status(400).json({ message: `Category "${catName}" is not in the allowed list.`, code: 'INVALID_CATEGORY', allowedCategories: [...UniversitySettings_1.ALLOWED_CATEGORIES] });
                return;
            }
        }
        if (!payload.slug)
            payload.slug = normalizeSlug(String(payload.name || ''));
        const existing = await University_1.default.findOne({ slug: payload.slug });
        if (existing)
            payload.slug = `${payload.slug}-${Date.now()}`;
        const categoryFields = await resolveCategoryFields(payload);
        payload.category = categoryFields.category;
        payload.categoryId = categoryFields.categoryId;
        const clusterFields = await resolveClusterFields(payload);
        payload.clusterId = clusterFields.clusterId;
        payload.clusterName = clusterFields.clusterName;
        payload.clusterGroup = clusterFields.clusterGroup;
        normalizeClusterGroupValue(payload);
        payload.isArchived = false;
        payload.archivedAt = null;
        payload.archivedBy = null;
        const created = await University_1.default.create(payload);
        await (0, universitySyncService_1.syncManualClusterMembership)([created._id], payload.clusterId ? String(payload.clusterId) : null);
        await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'create', universityId: String(created._id) } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'create', universityId: String(created._id) } });
        res.status(201).json({ university: toCanonicalUniversityRecord(created.toObject()), message: 'University created successfully' });
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(400).json({ message: 'A university with this name or slug already exists' });
            return;
        }
        console.error('adminCreateUniversity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminUpdateUniversity(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const payload = buildUniversityMutationPayload((req.body || {}), { partial: true });
        const existing = await University_1.default.findById(req.params.id).select('_id clusterId').lean();
        if (!existing) {
            res.status(404).json({ message: 'University not found' });
            return;
        }
        // Category validation against allowed list
        const catName = String(payload.category || '').trim();
        if (catName) {
            const settings = await (0, UniversitySettings_1.ensureUniversitySettings)();
            const isAllowed = UniversitySettings_1.ALLOWED_CATEGORIES.some((c) => c.toLowerCase() === catName.toLowerCase());
            if (!isAllowed && !settings.allowCustomCategories) {
                res.status(400).json({ message: `Category "${catName}" is not in the allowed list.`, code: 'INVALID_CATEGORY', allowedCategories: [...UniversitySettings_1.ALLOWED_CATEGORIES] });
                return;
            }
        }
        if (payload.name && !payload.slug)
            payload.slug = normalizeSlug(String(payload.name || ''));
        if (payload.category !== undefined || payload.categoryId !== undefined) {
            const categoryFields = await resolveCategoryFields(payload);
            payload.category = categoryFields.category;
            payload.categoryId = categoryFields.categoryId;
        }
        if (payload.clusterGroup !== undefined || payload.clusterName !== undefined || payload.clusterId !== undefined) {
            const clusterFields = await resolveClusterFields(payload);
            payload.clusterId = clusterFields.clusterId;
            payload.clusterName = clusterFields.clusterName;
            payload.clusterGroup = clusterFields.clusterGroup;
            normalizeClusterGroupValue(payload);
        }
        const updated = await University_1.default.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ message: 'University not found' });
            return;
        }
        if (payload.clusterGroup !== undefined || payload.clusterName !== undefined || payload.clusterId !== undefined) {
            await (0, universitySyncService_1.syncManualClusterMembership)([existing._id], updated.clusterId ? String(updated.clusterId) : null);
        }
        await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'update', universityId: String(updated._id) } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'update', universityId: String(updated._id) } });
        res.json({ university: toCanonicalUniversityRecord(updated.toObject()), message: 'University updated successfully' });
    }
    catch (err) {
        if (err.code === 11000) {
            res.status(400).json({ message: 'Slug or name already taken by another university' });
            return;
        }
        console.error('adminUpdateUniversity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminDeleteUniversity(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const mode = String(req.query.mode || 'hard').toLowerCase() === 'soft' ? 'soft' : 'hard';
        const actorId = req.user?._id || null;
        if (mode === 'soft') {
            const updated = await University_1.default.findByIdAndUpdate(req.params.id, { $set: { isArchived: true, isActive: false, archivedAt: new Date(), archivedBy: actorId } }, { new: true });
            if (!updated) {
                res.status(404).json({ message: 'University not found' });
                return;
            }
        }
        else {
            const removed = await University_1.default.findByIdAndDelete(req.params.id);
            if (!removed) {
                res.status(404).json({ message: 'University not found' });
                return;
            }
        }
        await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(actorId || null);
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'delete', universityId: req.params.id, mode } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'delete', universityId: req.params.id, mode } });
        res.json({ message: mode === 'soft' ? 'University archived successfully' : 'University deleted successfully' });
    }
    catch (err) {
        console.error('adminDeleteUniversity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminBulkDeleteUniversities(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const targetFilter = await resolveBulkTargetFilter(req);
        const mode = String(req.body?.mode || 'soft').toLowerCase() === 'hard' ? 'hard' : 'soft';
        if (Object.keys(targetFilter).length === 0) {
            res.status(400).json({ message: 'Invalid or empty target selection provided.' });
            return;
        }
        const actorId = req.user?._id || null;
        let affected = 0;
        if (mode === 'hard') {
            const result = await University_1.default.deleteMany(targetFilter);
            affected = Number(result.deletedCount || 0);
        }
        else {
            const result = await University_1.default.updateMany(targetFilter, { $set: { isArchived: true, archivedAt: new Date(), archivedBy: actorId, isActive: false } });
            affected = Number(result.modifiedCount || 0);
        }
        await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(actorId || null);
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'bulk_delete', mode, affected } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'bulk_delete', mode, affected } });
        res.json({ message: mode === 'hard' ? `${affected} universities permanently deleted.` : `${affected} universities archived.`, affected, mode, skipped: [], errors: [] });
    }
    catch (err) {
        console.error('adminBulkDeleteUniversities error:', err);
        res.status(500).json({ message: 'Server error during bulk deletion.' });
    }
}
async function adminBulkUpdateUniversities(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const targetFilter = await resolveBulkTargetFilter(req);
        if (Object.keys(targetFilter).length === 0) {
            res.status(400).json({ message: 'No university targets provided.' });
            return;
        }
        const updates = buildUniversityMutationPayload((req.body?.updates || {}), { partial: true });
        if (updates.category !== undefined || updates.categoryId !== undefined) {
            const categoryFields = await resolveCategoryFields(updates);
            updates.category = categoryFields.category;
            updates.categoryId = categoryFields.categoryId;
        }
        const targetIds = await University_1.default.find({ ...targetFilter, isArchived: { $ne: true } }).select('_id').lean();
        if (updates.clusterGroup !== undefined || updates.clusterName !== undefined || updates.clusterId !== undefined) {
            const clusterFields = await resolveClusterFields(updates);
            updates.clusterId = clusterFields.clusterId;
            updates.clusterName = clusterFields.clusterName;
            updates.clusterGroup = clusterFields.clusterGroup;
            normalizeClusterGroupValue(updates);
            await (0, universitySyncService_1.syncManualClusterMembership)(targetIds.map((item) => item._id), updates.clusterId ? String(updates.clusterId) : null);
        }
        const result = await University_1.default.updateMany({ ...targetFilter, isArchived: { $ne: true } }, { $set: updates });
        const affected = Number(result.modifiedCount || 0);
        await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'bulk_update', affected } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'bulk_update', affected } });
        res.json({ message: `${affected} universities updated.`, affected });
    }
    catch (err) {
        console.error('adminBulkUpdateUniversities error:', err);
        res.status(500).json({ message: 'Server error during bulk update.' });
    }
}
async function adminToggleUniversityStatus(req, res) {
    try {
        const university = await University_1.default.findById(req.params.id);
        if (!university) {
            res.status(404).json({ message: 'University not found' });
            return;
        }
        if (university.isArchived) {
            res.status(400).json({ message: 'Archived university cannot be activated. Restore it first.' });
            return;
        }
        university.isActive = !university.isActive;
        await university.save();
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'toggle', universityId: String(university._id), isActive: university.isActive } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'toggle', universityId: String(university._id), isActive: university.isActive } });
        res.json({ university: toCanonicalUniversityRecord(university.toObject()), message: `University ${university.isActive ? 'activated' : 'deactivated'}` });
    }
    catch (err) {
        console.error('adminToggleUniversityStatus error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminReorderFeaturedUniversities(req, res) {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            res.status(400).json({ message: 'Invalid order format' });
            return;
        }
        if (order.length > 0)
            await University_1.default.bulkWrite(order.map((item) => ({ updateOne: { filter: { _id: item.id, isArchived: { $ne: true } }, update: { $set: { featuredOrder: item.featuredOrder } } } })));
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'featured_university_updated', meta: { action: 'reorder' } });
        (0, homeStream_1.broadcastHomeStreamEvent)({ type: 'home-updated', meta: { source: 'university', action: 'reorder' } });
        res.json({ message: 'Featured order updated successfully' });
    }
    catch (err) {
        console.error('adminReorderFeaturedUniversities error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminExportUniversities(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const format = String(req.query.format || req.query.type || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
        const { filter } = buildUniversityFilter(req.query, { includeArchivedDefault: false });
        const selectedIds = asStringIdList(req.query.selectedIds);
        if (selectedIds.length > 0)
            filter._id = { $in: selectedIds };
        const rows = await University_1.default.find(filter).sort(normalizeSort(req.query.sortBy, req.query.sortOrder, req.query.sort || 'name')).lean();
        const mapped = rows.map((row) => {
            const u = toCanonicalUniversityRecord(row);
            return {
                category: String(u.category || ''),
                clusterGroup: String(u.clusterGroup || ''),
                name: String(u.name || ''),
                shortForm: String(u.shortForm || ''),
                shortDescription: String(u.shortDescription || ''),
                description: String(u.description || ''),
                establishedYear: String(u.establishedYear || ''),
                address: String(u.address || ''),
                contactNumber: String(u.contactNumber || ''),
                email: String(u.email || ''),
                websiteUrl: String(u.websiteUrl || ''),
                admissionUrl: String(u.admissionUrl || ''),
                totalSeats: String(u.totalSeats || ''),
                seatsScienceEng: String(u.seatsScienceEng || ''),
                seatsArtsHum: String(u.seatsArtsHum || ''),
                seatsBusiness: String(u.seatsBusiness || ''),
                applicationStartDate: toDateString(u.applicationStartDate),
                applicationEndDate: toDateString(u.applicationEndDate),
                examDateScience: String(u.examDateScience || ''),
                examDateArts: String(u.examDateArts || ''),
                examDateBusiness: String(u.examDateBusiness || ''),
                examCenters: (0, universitySyncService_1.serializeExamCenters)(u.examCenters),
                logoUrl: String(u.logoUrl || ''),
                isActive: String(Boolean(u.isActive)),
                featured: String(Boolean(u.featured)),
                featuredOrder: String(u.featuredOrder || ''),
                categorySyncLocked: String(Boolean(u.categorySyncLocked)),
                clusterSyncLocked: String(Boolean(u.clusterSyncLocked)),
                verificationStatus: String(u.verificationStatus || ''),
                remarks: String(u.remarks || ''),
                slug: String(u.slug || ''),
            };
        });
        const headers = Object.keys(mapped[0] || {
            category: '', clusterGroup: '', name: '', shortForm: '', shortDescription: '', description: '', establishedYear: '', address: '', contactNumber: '', email: '',
            websiteUrl: '', admissionUrl: '', totalSeats: '', seatsScienceEng: '', seatsArtsHum: '', seatsBusiness: '',
            applicationStartDate: '', applicationEndDate: '', examDateScience: '', examDateArts: '', examDateBusiness: '',
            examCenters: '', logoUrl: '', isActive: '', featured: '', featuredOrder: '', categorySyncLocked: '', clusterSyncLocked: '', verificationStatus: '', remarks: '', slug: '',
        });
        if (format === 'xlsx') {
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet('Universities');
            sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(14, header.length + 4) }));
            mapped.forEach((row) => sheet.addRow(row));
            res.setHeader('Content-Disposition', 'attachment; filename=universities_export.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        const csvLines = mapped.map((row) => headers.map((header) => csvEscape(row[header])).join(','));
        const csv = `${headers.join(',')}\n${csvLines.join('\n')}`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=universities_export.csv');
        res.send(csv);
    }
    catch (err) {
        console.error('adminExportUniversities error:', err);
        res.status(500).json({ message: 'Failed to export universities.' });
    }
}
//# sourceMappingURL=universityController.js.map