"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetUniversityClusters = adminGetUniversityClusters;
exports.adminCreateUniversityCluster = adminCreateUniversityCluster;
exports.adminGetUniversityClusterById = adminGetUniversityClusterById;
exports.adminUpdateUniversityCluster = adminUpdateUniversityCluster;
exports.adminResolveUniversityClusterMembers = adminResolveUniversityClusterMembers;
exports.adminSyncUniversityClusterDates = adminSyncUniversityClusterDates;
exports.adminDeleteUniversityCluster = adminDeleteUniversityCluster;
exports.getFeaturedUniversityClusters = getFeaturedUniversityClusters;
exports.getPublicUniversityClusterMembers = getPublicUniversityClusterMembers;
const mongoose_1 = __importDefault(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const University_1 = __importDefault(require("../models/University"));
const UniversityCluster_1 = __importDefault(require("../models/UniversityCluster"));
const UniversityCategory_1 = __importDefault(require("../models/UniversityCategory"));
const homeStream_1 = require("../realtime/homeStream");
const universitySyncService_1 = require("../services/universitySyncService");
function normalizeClusterSlug(name, fallbackSlug) {
    const slug = (0, slugify_1.default)(name || fallbackSlug || '', { lower: true, strict: true });
    return slug || `cluster-${Date.now()}`;
}
function uniqueObjectIds(values) {
    const seen = new Set();
    const normalized = [];
    values.forEach((item) => {
        const asString = String(item);
        if (!mongoose_1.default.Types.ObjectId.isValid(asString))
            return;
        if (seen.has(asString))
            return;
        seen.add(asString);
        normalized.push(new mongoose_1.default.Types.ObjectId(asString));
    });
    return normalized;
}
function normalizeCategories(values) {
    if (!Array.isArray(values))
        return [];
    return values.map((item) => String(item || '').trim()).filter(Boolean);
}
function normalizeCategoryIds(values) {
    if (!Array.isArray(values))
        return [];
    const seen = new Set();
    const normalized = [];
    values.forEach((item) => {
        const id = String(item || '').trim();
        if (!mongoose_1.default.Types.ObjectId.isValid(id))
            return;
        if (seen.has(id))
            return;
        seen.add(id);
        normalized.push(new mongoose_1.default.Types.ObjectId(id));
    });
    return normalized;
}
function toOptionalObjectId(value) {
    if (!value)
        return null;
    return mongoose_1.default.Types.ObjectId.isValid(value) ? new mongoose_1.default.Types.ObjectId(value) : null;
}
function parseOptionalDate(value) {
    if (value === undefined || value === null || value === '')
        return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeClusterDates(payload) {
    const source = (payload.dates && typeof payload.dates === 'object')
        ? payload.dates
        : payload;
    return {
        applicationStartDate: parseOptionalDate(source.applicationStartDate),
        applicationEndDate: parseOptionalDate(source.applicationEndDate),
        scienceExamDate: String(source.scienceExamDate || '').trim(),
        commerceExamDate: String(source.commerceExamDate || source.businessExamDate || '').trim(),
        artsExamDate: String(source.artsExamDate || '').trim(),
        admissionWebsite: String(source.admissionWebsite || source.admissionUrl || '').trim(),
        examCenters: (0, universitySyncService_1.normalizeExamCenters)(source.examCenters),
    };
}
function toIso(value) {
    if (!value)
        return '';
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}
function findNearestUpcomingDate(values, now) {
    return values
        .map((value) => (value ? new Date(String(value)) : null))
        .filter((item) => Boolean(item) && !Number.isNaN(item.getTime()) && item.getTime() >= now.getTime())
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString() || '';
}
async function adminGetUniversityClusters(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const status = String(req.query.status || 'all').toLowerCase();
        const filter = {};
        if (status === 'active')
            filter.isActive = true;
        if (status === 'inactive')
            filter.isActive = false;
        const clusters = await UniversityCluster_1.default.find(filter).sort({ homeOrder: 1, name: 1 }).lean();
        const counts = await University_1.default.aggregate([
            { $match: { clusterId: { $ne: null }, isArchived: { $ne: true } } },
            { $group: { _id: '$clusterId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map();
        counts.forEach((item) => countMap.set(String(item._id), Number(item.count || 0)));
        res.json({
            clusters: clusters.map((cluster) => ({
                ...cluster,
                memberCount: countMap.get(String(cluster._id)) || 0,
            })),
        });
    }
    catch (err) {
        console.error('adminGetUniversityClusters error:', err);
        res.status(500).json({ message: 'Failed to fetch clusters.' });
    }
}
async function adminCreateUniversityCluster(req, res) {
    try {
        const payload = req.body || {};
        const name = String(payload.name || '').trim();
        if (!name) {
            res.status(400).json({ message: 'Cluster name is required.' });
            return;
        }
        let slug = normalizeClusterSlug(name, String(payload.slug || ''));
        const existing = await UniversityCluster_1.default.findOne({ slug });
        if (existing)
            slug = `${slug}-${Date.now()}`;
        const cluster = await UniversityCluster_1.default.create({
            name,
            slug,
            description: String(payload.description || ''),
            isActive: payload.isActive !== false,
            memberUniversityIds: uniqueObjectIds(payload.memberUniversityIds || []),
            categoryRules: normalizeCategories(payload.categoryRules || []),
            categoryRuleIds: normalizeCategoryIds(payload.categoryRuleIds || []),
            dates: normalizeClusterDates(payload),
            syncPolicy: 'inherit_with_override',
            homeVisible: Boolean(payload.homeVisible),
            homeOrder: Number(payload.homeOrder || 0),
            createdBy: req.user?._id || null,
            updatedBy: req.user?._id || null,
        });
        const resolution = await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        const syncResult = await (0, universitySyncService_1.syncUniversityClusterSharedConfig)(String(cluster._id), req.user?._id || null);
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'cluster-updated',
            meta: { action: 'create', clusterId: String(cluster._id) },
        });
        res.status(201).json({
            cluster,
            memberCount: resolution.clusterMemberCounts[String(cluster._id)] || 0,
            dateSync: syncResult,
            resolution,
            message: 'Cluster created successfully.',
        });
    }
    catch (err) {
        console.error('adminCreateUniversityCluster error:', err);
        res.status(500).json({ message: 'Failed to create cluster.' });
    }
}
async function adminGetUniversityClusterById(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const cluster = await UniversityCluster_1.default.findById(req.params.id).lean();
        if (!cluster) {
            res.status(404).json({ message: 'Cluster not found.' });
            return;
        }
        const members = await University_1.default.find({ _id: { $in: cluster.memberUniversityIds || [] } })
            .select('_id name shortForm category')
            .lean();
        const effectiveMembers = await University_1.default.find({ clusterId: cluster._id, isArchived: { $ne: true } })
            .select('_id name shortForm category')
            .sort({ name: 1 })
            .lean();
        const categoryRuleIds = normalizeCategoryIds(cluster.categoryRuleIds || []);
        const ruleCategories = categoryRuleIds.length > 0
            ? await UniversityCategory_1.default.find({ _id: { $in: categoryRuleIds } }).select('_id name labelBn').lean()
            : [];
        res.json({ cluster, members, effectiveMembers, ruleCategories });
    }
    catch (err) {
        console.error('adminGetUniversityClusterById error:', err);
        res.status(500).json({ message: 'Failed to load cluster.' });
    }
}
async function adminUpdateUniversityCluster(req, res) {
    try {
        const clusterId = String(req.params.id || '');
        const payload = req.body || {};
        const cluster = await UniversityCluster_1.default.findById(clusterId);
        if (!cluster) {
            res.status(404).json({ message: 'Cluster not found.' });
            return;
        }
        if (payload.name) {
            cluster.name = String(payload.name).trim();
        }
        if (payload.slug) {
            cluster.slug = normalizeClusterSlug(cluster.name, String(payload.slug || ''));
        }
        if (payload.description !== undefined)
            cluster.description = String(payload.description || '');
        if (payload.isActive !== undefined)
            cluster.isActive = Boolean(payload.isActive);
        if (payload.memberUniversityIds) {
            cluster.memberUniversityIds = uniqueObjectIds(payload.memberUniversityIds);
        }
        if (payload.categoryRules) {
            cluster.categoryRules = normalizeCategories(payload.categoryRules);
        }
        if (payload.categoryRuleIds !== undefined) {
            cluster.categoryRuleIds = normalizeCategoryIds(payload.categoryRuleIds);
        }
        if (payload.dates || payload.examCenters)
            cluster.dates = normalizeClusterDates(payload);
        if (payload.homeVisible !== undefined)
            cluster.homeVisible = Boolean(payload.homeVisible);
        if (payload.homeOrder !== undefined)
            cluster.homeOrder = Number(payload.homeOrder || 0);
        cluster.updatedBy = toOptionalObjectId(req.user?._id);
        await cluster.save();
        const resolution = await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        const syncResult = await (0, universitySyncService_1.syncUniversityClusterSharedConfig)(String(cluster._id), req.user?._id || null);
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'cluster-updated',
            meta: { action: 'update', clusterId: String(cluster._id) },
        });
        res.json({
            cluster,
            memberCount: resolution.clusterMemberCounts[String(cluster._id)] || 0,
            dateSync: syncResult,
            resolution,
            message: 'Cluster updated successfully.',
        });
    }
    catch (err) {
        console.error('adminUpdateUniversityCluster error:', err);
        res.status(500).json({ message: 'Failed to update cluster.' });
    }
}
async function adminResolveUniversityClusterMembers(req, res) {
    try {
        const clusterId = String(req.params.id || '');
        const cluster = await UniversityCluster_1.default.findById(clusterId).lean();
        if (!cluster) {
            res.status(404).json({ message: 'Cluster not found.' });
            return;
        }
        const resolution = await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        const manualMemberIds = uniqueObjectIds(cluster.memberUniversityIds || []).map((item) => String(item));
        const effectiveMembers = await University_1.default.find({ clusterId: cluster._id, isArchived: { $ne: true } })
            .select('_id')
            .lean();
        const effectiveMemberIds = effectiveMembers.map((item) => String(item._id));
        const suggestedMemberIds = effectiveMemberIds.filter((id) => !manualMemberIds.includes(id));
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'cluster-updated',
            meta: { action: 'resolve', clusterId },
        });
        res.json({
            memberCount: effectiveMemberIds.length,
            manualMembers: manualMemberIds,
            suggestedMembers: suggestedMemberIds,
            effectiveMembers: effectiveMemberIds,
            manualMembersCount: manualMemberIds.length,
            suggestedMembersCount: suggestedMemberIds.length,
            effectiveMembersCount: effectiveMemberIds.length,
            warnings: resolution.warnings.filter((item) => item.clusterIds.includes(clusterId)),
            message: 'Cluster members resolved with manual-wins policy.',
        });
    }
    catch (err) {
        console.error('adminResolveUniversityClusterMembers error:', err);
        res.status(500).json({ message: 'Failed to resolve cluster members.' });
    }
}
async function adminSyncUniversityClusterDates(req, res) {
    try {
        const clusterId = String(req.params.id || '');
        const cluster = await UniversityCluster_1.default.findById(clusterId);
        if (!cluster) {
            res.status(404).json({ message: 'Cluster not found.' });
            return;
        }
        if (req.body?.dates) {
            cluster.dates = normalizeClusterDates(req.body);
            cluster.updatedBy = toOptionalObjectId(req.user?._id);
            await cluster.save();
        }
        const result = await (0, universitySyncService_1.syncUniversityClusterSharedConfig)(clusterId, req.user?._id || null);
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'cluster-updated',
            meta: { action: 'sync-dates', clusterId, ...result },
        });
        res.json({ ...result, message: 'Cluster dates synced.' });
    }
    catch (err) {
        console.error('adminSyncUniversityClusterDates error:', err);
        res.status(500).json({ message: 'Failed to sync cluster dates.' });
    }
}
async function adminDeleteUniversityCluster(req, res) {
    try {
        const clusterId = String(req.params.id || '');
        const cluster = await UniversityCluster_1.default.findById(clusterId);
        if (!cluster) {
            res.status(404).json({ message: 'Cluster not found.' });
            return;
        }
        cluster.isActive = false;
        cluster.updatedBy = toOptionalObjectId(req.user?._id);
        await cluster.save();
        const resolution = await (0, universitySyncService_1.reconcileUniversityClusterAssignments)(req.user?._id || null);
        (0, homeStream_1.broadcastHomeStreamEvent)({
            type: 'cluster-updated',
            meta: { action: 'deactivate', clusterId },
        });
        res.json({ message: 'Cluster deactivated successfully.', resolution });
    }
    catch (err) {
        console.error('adminDeleteUniversityCluster error:', err);
        res.status(500).json({ message: 'Failed to deactivate cluster.' });
    }
}
async function getFeaturedUniversityClusters(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const limit = Math.min(20, Math.max(1, Number(req.query.limit || 8)));
        const clusters = await UniversityCluster_1.default.find({ isActive: true, homeVisible: true })
            .select('name slug description homeOrder dates')
            .sort({ homeOrder: 1, name: 1 })
            .limit(limit)
            .lean();
        const clusterIds = clusters.map((cluster) => cluster._id);
        const counts = await University_1.default.aggregate([
            { $match: { clusterId: { $in: clusterIds }, isArchived: { $ne: true }, isActive: true } },
            { $group: { _id: '$clusterId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map();
        counts.forEach((item) => countMap.set(String(item._id), Number(item.count || 0)));
        res.json({
            clusters: clusters.map((cluster) => ({
                ...cluster,
                memberCount: countMap.get(String(cluster._id)) || 0,
            })),
        });
    }
    catch (err) {
        console.error('getFeaturedUniversityClusters error:', err);
        res.status(500).json({ message: 'Failed to fetch featured clusters.' });
    }
}
async function getPublicUniversityClusterMembers(req, res) {
    try {
        await (0, universitySyncService_1.backfillUniversityTaxonomyIfNeeded)();
        const slug = String(req.params.slug || '').trim();
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));
        const cluster = await UniversityCluster_1.default.findOne({ slug, isActive: true }).lean();
        if (!cluster) {
            res.status(404).json({ message: 'Cluster not found.' });
            return;
        }
        const filter = { clusterId: cluster._id, isArchived: { $ne: true }, isActive: true };
        const total = await University_1.default.countDocuments(filter);
        const allMembers = await University_1.default.find(filter)
            .select('category applicationStart applicationStartDate applicationEnd applicationEndDate scienceExamDate examDateScience artsExamDate examDateArts businessExamDate examDateBusiness admissionWebsite admissionUrl examCenters')
            .lean();
        const universities = await University_1.default.find(filter)
            .sort({ featured: -1, featuredOrder: 1, name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const categories = Array.from(new Set(allMembers.map((item) => String(item.category || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const now = new Date();
        const memberStartDates = allMembers.map((item) => (item.applicationStartDate
            || item.applicationStart));
        const memberEndDates = allMembers.map((item) => (item.applicationEndDate
            || item.applicationEnd));
        const memberScienceDates = allMembers.map((item) => (item.scienceExamDate
            || item.examDateScience));
        const memberArtsDates = allMembers.map((item) => (item.artsExamDate
            || item.examDateArts));
        const memberBusinessDates = allMembers.map((item) => (item.businessExamDate
            || item.examDateBusiness));
        const memberAdmissionWebsite = allMembers.find((item) => {
            const row = item;
            return row.admissionWebsite || row.admissionUrl;
        });
        const nearestDeadline = findNearestUpcomingDate(memberEndDates, now);
        const nearestExam = findNearestUpcomingDate([...memberScienceDates, ...memberArtsDates, ...memberBusinessDates], now);
        const clusterDates = cluster.dates || {};
        const examCentersPreview = Array.from(new Set(allMembers.flatMap((item) => Array.isArray(item.examCenters) ? item.examCenters.map((center) => String(center?.city || '').trim()) : [])
            .filter(Boolean))).slice(0, 6);
        res.json({
            cluster,
            summary: {
                memberCount: total,
                categories,
                nearestDeadline,
                nearestExam,
                applicationStartDate: toIso(clusterDates.applicationStartDate) || findNearestUpcomingDate(memberStartDates, new Date(0)),
                applicationEndDate: toIso(clusterDates.applicationEndDate) || findNearestUpcomingDate(memberEndDates, new Date(0)) || nearestDeadline,
                scienceExamDate: toIso(clusterDates.scienceExamDate) || findNearestUpcomingDate(memberScienceDates, now),
                artsExamDate: toIso(clusterDates.artsExamDate) || findNearestUpcomingDate(memberArtsDates, now),
                businessExamDate: toIso(clusterDates.commerceExamDate || clusterDates.businessExamDate) || findNearestUpcomingDate(memberBusinessDates, now),
                admissionWebsite: String(clusterDates.admissionWebsite || memberAdmissionWebsite?.admissionWebsite || memberAdmissionWebsite?.admissionUrl || '').trim(),
                examCentersPreview,
            },
            universities,
            pagination: {
                total,
                page,
                limit,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    }
    catch (err) {
        console.error('getPublicUniversityClusterMembers error:', err);
        res.status(500).json({ message: 'Failed to fetch cluster members.' });
    }
}
//# sourceMappingURL=universityClusterController.js.map