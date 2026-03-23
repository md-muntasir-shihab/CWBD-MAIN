"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExamCenters = normalizeExamCenters;
exports.serializeExamCenters = serializeExamCenters;
exports.ensureUniversityCategoryByName = ensureUniversityCategoryByName;
exports.ensureUniversityClusterByName = ensureUniversityClusterByName;
exports.syncUniversityCategorySharedConfig = syncUniversityCategorySharedConfig;
exports.syncUniversityClusterSharedConfig = syncUniversityClusterSharedConfig;
exports.syncManualClusterMembership = syncManualClusterMembership;
exports.reconcileUniversityClusterAssignments = reconcileUniversityClusterAssignments;
exports.backfillUniversityTaxonomyIfNeeded = backfillUniversityTaxonomyIfNeeded;
exports.normalizeUniversityImportRow = normalizeUniversityImportRow;
const mongoose_1 = __importDefault(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const University_1 = __importDefault(require("../models/University"));
const UniversityCategory_1 = __importDefault(require("../models/UniversityCategory"));
const UniversityCluster_1 = __importDefault(require("../models/UniversityCluster"));
const universityCategories_1 = require("../utils/universityCategories");
const BACKFILL_TTL_MS = 5 * 60 * 1000;
let lastBackfillAt = 0;
let backfillPromise = null;
function pickString(value, fallback = '') {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
}
function asNullableObjectId(value) {
    const raw = pickString(value);
    if (!raw || !mongoose_1.default.Types.ObjectId.isValid(raw))
        return null;
    return new mongoose_1.default.Types.ObjectId(raw);
}
function normalizeClusterName(name) {
    return pickString(name);
}
function normalizeSlug(source, fallbackPrefix) {
    const raw = (0, slugify_1.default)(source || '', { lower: true, strict: true });
    return raw || `${fallbackPrefix}-${Date.now()}`;
}
function parseDateValue(value) {
    if (value === undefined || value === null || value === '')
        return null;
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    const raw = pickString(value);
    if (!raw)
        return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeExamDateValue(value) {
    const raw = pickString(value);
    if (!raw)
        return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return raw;
    return parsed.toISOString();
}
function normalizeBoolean(value, fallback = true) {
    if (value === undefined || value === null || value === '')
        return fallback;
    if (typeof value === 'boolean')
        return value;
    const normalized = pickString(value).toLowerCase();
    if (['true', '1', 'yes', 'y', 'active', 'on'].includes(normalized))
        return true;
    if (['false', '0', 'no', 'n', 'inactive', 'off'].includes(normalized))
        return false;
    return fallback;
}
function splitDelimitedValues(raw) {
    return raw
        .split(/\r?\n|\|/g)
        .map((item) => item.trim())
        .filter(Boolean);
}
function normalizeExamCenters(value) {
    const seen = new Set();
    const output = [];
    const push = (city, address) => {
        const normalizedCity = pickString(city);
        const normalizedAddress = pickString(address);
        if (!normalizedCity)
            return;
        const key = `${normalizedCity.toLowerCase()}::${normalizedAddress.toLowerCase()}`;
        if (seen.has(key))
            return;
        seen.add(key);
        output.push({ city: normalizedCity, address: normalizedAddress });
    };
    if (Array.isArray(value)) {
        value.forEach((item) => {
            if (typeof item === 'string') {
                splitDelimitedValues(item).forEach((part) => {
                    const pieces = part.split(/\s+-\s+|\s+:\s+/);
                    push(pieces[0], pieces.slice(1).join(' - '));
                });
                return;
            }
            if (item && typeof item === 'object') {
                push(item.city ?? item.name, item.address);
            }
        });
        return output;
    }
    const raw = pickString(value);
    if (!raw)
        return output;
    splitDelimitedValues(raw).forEach((part) => {
        const pieces = part.split(/\s+-\s+|\s+:\s+/);
        push(pieces[0], pieces.slice(1).join(' - '));
    });
    return output;
}
function serializeExamCenters(value) {
    return normalizeExamCenters(value)
        .map((center) => [center.city, center.address].filter(Boolean).join(' - '))
        .join(' | ');
}
function normalizeObjectIdList(values) {
    if (!Array.isArray(values))
        return [];
    const seen = new Set();
    const output = [];
    values.forEach((item) => {
        const raw = pickString(item);
        if (!raw || !mongoose_1.default.Types.ObjectId.isValid(raw) || seen.has(raw))
            return;
        seen.add(raw);
        output.push(new mongoose_1.default.Types.ObjectId(raw));
    });
    return output;
}
function categorySharedConfigToUpdate(config) {
    const scienceExamDate = normalizeExamDateValue(config.scienceExamDate);
    const artsExamDate = normalizeExamDateValue(config.artsExamDate);
    const businessExamDate = normalizeExamDateValue(config.businessExamDate ?? config.commerceExamDate);
    return {
        applicationStartDate: parseDateValue(config.applicationStartDate),
        applicationEndDate: parseDateValue(config.applicationEndDate),
        scienceExamDate,
        examDateScience: scienceExamDate,
        artsExamDate,
        examDateArts: artsExamDate,
        businessExamDate,
        examDateBusiness: businessExamDate,
        examCenters: normalizeExamCenters(config.examCenters || []),
    };
}
function clusterSharedConfigToUpdate(config, overrides) {
    const source = overrides || {};
    const hasOverride = (key) => source[key] !== undefined && source[key] !== null && source[key] !== '';
    const scienceExamDate = hasOverride('scienceExamDate')
        ? normalizeExamDateValue(source.scienceExamDate)
        : normalizeExamDateValue(config.scienceExamDate);
    const artsExamDate = hasOverride('artsExamDate')
        ? normalizeExamDateValue(source.artsExamDate)
        : normalizeExamDateValue(config.artsExamDate);
    const businessExamDate = hasOverride('businessExamDate')
        ? normalizeExamDateValue(source.businessExamDate)
        : normalizeExamDateValue(config.businessExamDate ?? config.commerceExamDate);
    const hasAdmissionOverride = hasOverride('admissionWebsite') || hasOverride('admissionUrl');
    const admissionWebsite = hasAdmissionOverride
        ? pickString(source.admissionWebsite || source.admissionUrl)
        : pickString(config.admissionWebsite);
    const update = {
        applicationStartDate: hasOverride('applicationStartDate')
            ? parseDateValue(source.applicationStartDate)
            : parseDateValue(config.applicationStartDate),
        applicationEndDate: hasOverride('applicationEndDate')
            ? parseDateValue(source.applicationEndDate)
            : parseDateValue(config.applicationEndDate),
        scienceExamDate,
        examDateScience: scienceExamDate,
        artsExamDate,
        examDateArts: artsExamDate,
        businessExamDate,
        examDateBusiness: businessExamDate,
        examCenters: normalizeExamCenters(config.examCenters || []),
    };
    if (admissionWebsite) {
        update.admissionWebsite = admissionWebsite;
        update.admissionUrl = admissionWebsite;
    }
    return update;
}
async function ensureUniversityCategoryByName(name) {
    const normalizedName = (0, universityCategories_1.normalizeUniversityCategory)(name || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
    const existing = await UniversityCategory_1.default.findOne({ name: normalizedName }).select('_id name').lean();
    if (existing)
        return { _id: existing._id, name: normalizedName };
    let slug = normalizeSlug(normalizedName, 'category');
    const slugExists = await UniversityCategory_1.default.findOne({ slug }).select('_id').lean();
    if (slugExists)
        slug = `${slug}-${Date.now()}`;
    try {
        const created = await UniversityCategory_1.default.create({
            name: normalizedName,
            slug,
            isActive: true,
            homeHighlight: false,
            homeOrder: 0,
        });
        return { _id: created._id, name: created.name };
    }
    catch (error) {
        const fallback = await UniversityCategory_1.default.findOne({ name: normalizedName }).select('_id name').lean();
        if (fallback)
            return { _id: fallback._id, name: normalizedName };
        throw error;
    }
}
async function ensureUniversityClusterByName(name) {
    const normalizedName = normalizeClusterName(name);
    if (!normalizedName) {
        throw new Error('Cluster name is required.');
    }
    const existing = await UniversityCluster_1.default.findOne({ name: normalizedName }).select('_id name').lean();
    if (existing)
        return { _id: existing._id, name: normalizedName };
    let slug = normalizeSlug(normalizedName, 'cluster');
    const slugExists = await UniversityCluster_1.default.findOne({ slug }).select('_id').lean();
    if (slugExists)
        slug = `${slug}-${Date.now()}`;
    try {
        const created = await UniversityCluster_1.default.create({
            name: normalizedName,
            slug,
            description: '',
            isActive: true,
            memberUniversityIds: [],
            categoryRules: [],
            categoryRuleIds: [],
            dates: {},
            syncPolicy: 'inherit_with_override',
            homeVisible: false,
            homeOrder: 0,
        });
        return { _id: created._id, name: created.name };
    }
    catch (error) {
        const fallback = await UniversityCluster_1.default.findOne({ name: normalizedName }).select('_id name').lean();
        if (fallback)
            return { _id: fallback._id, name: normalizedName };
        throw error;
    }
}
async function getClusterCategoryNames(cluster) {
    const legacyNames = Array.isArray(cluster.categoryRules)
        ? cluster.categoryRules.map((item) => pickString(item)).filter(Boolean)
        : [];
    const ruleIds = normalizeObjectIdList(cluster.categoryRuleIds);
    if (ruleIds.length === 0) {
        return Array.from(new Set(legacyNames));
    }
    const categories = await UniversityCategory_1.default.find({ _id: { $in: ruleIds }, isActive: true })
        .select('name')
        .lean();
    return Array.from(new Set([
        ...legacyNames,
        ...categories.map((item) => pickString(item.name)).filter(Boolean),
    ]));
}
async function syncUniversityCategorySharedConfig(categoryId, actorId) {
    const category = await UniversityCategory_1.default.findById(categoryId);
    if (!category)
        throw new Error('Category not found.');
    const filter = {
        isArchived: { $ne: true },
        $and: [
            { $or: [{ categoryId: category._id }, { category: category.name }] },
            { $or: [{ clusterId: null }, { clusterId: { $exists: false } }] },
        ],
    };
    const members = await University_1.default.find(filter).select('_id categorySyncLocked').lean();
    const targetIds = members
        .filter((item) => !Boolean(item.categorySyncLocked))
        .map((item) => item._id);
    const skipped = members.length - targetIds.length;
    if (targetIds.length > 0) {
        await University_1.default.updateMany({ _id: { $in: targetIds } }, { $set: categorySharedConfigToUpdate(category.sharedConfig) });
    }
    category.syncMeta = {
        lastSyncedAt: new Date(),
        lastSyncedBy: asNullableObjectId(actorId ?? null),
        lastSyncedCount: targetIds.length,
        skippedCount: skipped,
    };
    await category.save();
    return {
        synced: targetIds.length,
        skipped,
    };
}
async function syncUniversityClusterSharedConfig(clusterId, actorId) {
    const cluster = await UniversityCluster_1.default.findById(clusterId);
    if (!cluster)
        throw new Error('Cluster not found.');
    const members = await University_1.default.find({ clusterId: cluster._id, isArchived: { $ne: true } })
        .select('_id clusterSyncLocked clusterDateOverrides')
        .lean();
    const ops = members
        .filter((item) => !Boolean(item.clusterSyncLocked))
        .map((item) => ({
        updateOne: {
            filter: { _id: item._id },
            update: {
                $set: clusterSharedConfigToUpdate(cluster.dates, item.clusterDateOverrides || {}),
            },
        },
    }));
    const skipped = members.length - ops.length;
    if (ops.length > 0) {
        await University_1.default.bulkWrite(ops);
    }
    cluster.updatedBy = asNullableObjectId(actorId ?? null);
    await cluster.save();
    return {
        synced: ops.length,
        skipped,
    };
}
async function syncManualClusterMembership(universityIds, clusterId) {
    const normalizedUniversityIds = normalizeObjectIdList(universityIds);
    if (normalizedUniversityIds.length === 0)
        return;
    const nextClusterId = asNullableObjectId(clusterId ?? null);
    await UniversityCluster_1.default.updateMany({
        memberUniversityIds: { $in: normalizedUniversityIds },
        ...(nextClusterId ? { _id: { $ne: nextClusterId } } : {}),
    }, {
        $pull: {
            memberUniversityIds: { $in: normalizedUniversityIds },
        },
    });
    if (nextClusterId) {
        await UniversityCluster_1.default.updateOne({ _id: nextClusterId }, {
            $addToSet: {
                memberUniversityIds: { $each: normalizedUniversityIds },
            },
        });
    }
}
async function reconcileUniversityClusterAssignments(actorId) {
    const clusters = await UniversityCluster_1.default.find({ isActive: true })
        .sort({ homeOrder: 1, createdAt: 1, _id: 1 })
        .lean();
    const clusterIds = clusters.map((cluster) => cluster._id);
    const universities = await University_1.default.find({ isArchived: { $ne: true } })
        .select('_id name shortForm category clusterId clusterName clusterGroup')
        .lean();
    const universityById = new Map(universities.map((item) => [String(item._id), item]));
    const universitiesByCategory = new Map();
    universities.forEach((item) => {
        const category = pickString(item.category);
        const universityId = String(item._id);
        if (!universitiesByCategory.has(category))
            universitiesByCategory.set(category, []);
        universitiesByCategory.get(category).push(universityId);
    });
    const candidateMap = new Map();
    for (let index = 0; index < clusters.length; index += 1) {
        const cluster = clusters[index];
        const clusterId = String(cluster._id);
        const clusterName = cluster.name;
        const categoryNames = await getClusterCategoryNames(cluster);
        const categoryMembers = categoryNames.flatMap((name) => universitiesByCategory.get(name) || []);
        const manualMembers = normalizeObjectIdList(cluster.memberUniversityIds).map((item) => String(item));
        const seenForCluster = new Set();
        manualMembers.forEach((universityId) => {
            if (!universityById.has(universityId) || seenForCluster.has(universityId))
                return;
            seenForCluster.add(universityId);
            const next = candidateMap.get(universityId) || [];
            next.push({ clusterId, clusterName, orderIndex: index, manual: true });
            candidateMap.set(universityId, next);
        });
        categoryMembers.forEach((universityId) => {
            if (!universityById.has(universityId) || seenForCluster.has(universityId))
                return;
            seenForCluster.add(universityId);
            const next = candidateMap.get(universityId) || [];
            next.push({ clusterId, clusterName, orderIndex: index, manual: false });
            candidateMap.set(universityId, next);
        });
    }
    const assignments = new Map();
    const warnings = [];
    candidateMap.forEach((candidates, universityId) => {
        const ordered = [...candidates].sort((left, right) => {
            if (left.manual !== right.manual)
                return left.manual ? -1 : 1;
            return left.orderIndex - right.orderIndex;
        });
        const winner = ordered[0];
        assignments.set(universityId, winner);
        const distinctClusters = Array.from(new Set(ordered.map((item) => item.clusterId)));
        if (distinctClusters.length > 1) {
            const university = universityById.get(universityId);
            warnings.push({
                universityId,
                universityName: pickString(university?.name, pickString(university?.shortForm, 'University')),
                clusterIds: distinctClusters,
                clusterNames: Array.from(new Set(ordered.map((item) => item.clusterName))),
                winnerClusterId: winner.clusterId,
                winnerClusterName: winner.clusterName,
                reason: ordered.filter((item) => item.manual).length > 1 ? 'multiple_manual_clusters' : 'multiple_clusters',
            });
        }
    });
    const clusterMemberCounts = {};
    const assignmentEntries = Array.from(assignments.entries());
    assignmentEntries.forEach(([, candidate]) => {
        clusterMemberCounts[candidate.clusterId] = (clusterMemberCounts[candidate.clusterId] || 0) + 1;
    });
    const assignedIds = assignmentEntries.map(([universityId]) => new mongoose_1.default.Types.ObjectId(universityId));
    const detachFilter = {
        isArchived: { $ne: true },
        $or: [
            { clusterId: { $in: clusterIds } },
            { clusterId: { $ne: null } },
            { clusterGroup: { $ne: '' } },
            { clusterName: { $ne: '' } },
        ],
    };
    if (assignedIds.length > 0) {
        detachFilter._id = { $nin: assignedIds };
    }
    const detachResult = await University_1.default.updateMany(detachFilter, { $set: { clusterId: null, clusterName: '', clusterGroup: '', clusterCount: 0 } });
    if (assignmentEntries.length > 0) {
        await University_1.default.bulkWrite(assignmentEntries.map(([universityId, candidate]) => ({
            updateOne: {
                filter: { _id: new mongoose_1.default.Types.ObjectId(universityId) },
                update: {
                    $set: {
                        clusterId: new mongoose_1.default.Types.ObjectId(candidate.clusterId),
                        clusterName: candidate.clusterName,
                        clusterGroup: candidate.clusterName,
                        clusterCount: clusterMemberCounts[candidate.clusterId] || 0,
                    },
                },
            },
        })));
    }
    if (clusters.length > 0) {
        const liveUniversityIds = new Set(universities.map((item) => String(item._id)));
        await UniversityCluster_1.default.bulkWrite(clusters.map((cluster) => ({
            updateOne: {
                filter: { _id: cluster._id },
                update: {
                    $set: {
                        memberUniversityIds: normalizeObjectIdList(cluster.memberUniversityIds).filter((item) => liveUniversityIds.has(String(item))),
                        updatedBy: asNullableObjectId(actorId ?? null),
                    },
                },
            },
        })));
    }
    return {
        resolvedCount: assignmentEntries.length,
        detachedCount: Number(detachResult.modifiedCount || 0),
        warnings,
        clusterMemberCounts,
    };
}
async function backfillUniversityTaxonomyInternal() {
    const universities = await University_1.default.find({})
        .select('_id category categoryId clusterGroup clusterId clusterName')
        .lean();
    const categoryNames = Array.from(new Set(universities
        .map((item) => (0, universityCategories_1.normalizeUniversityCategory)(item.category || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY))
        .filter(Boolean)));
    const clusterNames = Array.from(new Set(universities
        .map((item) => normalizeClusterName(item.clusterGroup))
        .filter(Boolean)));
    for (const categoryName of categoryNames) {
        await ensureUniversityCategoryByName(categoryName);
    }
    for (const clusterName of clusterNames) {
        await ensureUniversityClusterByName(clusterName);
    }
    const [categories, clusters] = await Promise.all([
        UniversityCategory_1.default.find({}).select('_id name').lean(),
        UniversityCluster_1.default.find({}).select('_id name memberUniversityIds').lean(),
    ]);
    const categoryMap = new Map(categories.map((item) => [item.name, item]));
    const clusterMap = new Map(clusters.map((item) => [item.name, item]));
    const universityOps = universities.flatMap((item) => {
        const update = {};
        const normalizedCategory = (0, universityCategories_1.normalizeUniversityCategory)(item.category || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
        const categoryDoc = categoryMap.get(normalizedCategory);
        const currentCategoryId = pickString(item.categoryId);
        if (normalizedCategory !== pickString(item.category)) {
            update.category = normalizedCategory;
        }
        if (categoryDoc && String(categoryDoc._id) !== currentCategoryId) {
            update.categoryId = categoryDoc._id;
        }
        const clusterName = normalizeClusterName(item.clusterGroup);
        const clusterDoc = clusterName ? clusterMap.get(clusterName) : null;
        const currentClusterId = pickString(item.clusterId);
        if (clusterDoc) {
            if (String(clusterDoc._id) !== currentClusterId)
                update.clusterId = clusterDoc._id;
            if (pickString(item.clusterName) !== clusterDoc.name)
                update.clusterName = clusterDoc.name;
            if (clusterName !== clusterDoc.name)
                update.clusterGroup = clusterDoc.name;
        }
        else if (clusterName) {
            update.clusterId = null;
            update.clusterName = '';
            update.clusterGroup = '';
            update.clusterCount = 0;
        }
        if (Object.keys(update).length === 0)
            return [];
        return [{
                updateOne: {
                    filter: { _id: item._id },
                    update: { $set: update },
                },
            }];
    });
    if (universityOps.length > 0) {
        await University_1.default.bulkWrite(universityOps);
    }
    const clusterMemberOps = clusterNames.flatMap((clusterName) => {
        const cluster = clusterMap.get(clusterName);
        if (!cluster)
            return [];
        const memberIds = universities
            .filter((item) => normalizeClusterName(item.clusterGroup) === clusterName)
            .map((item) => item._id);
        const merged = normalizeObjectIdList([
            ...(Array.isArray(cluster.memberUniversityIds) ? cluster.memberUniversityIds : []),
            ...memberIds,
        ]);
        return [{
                updateOne: {
                    filter: { _id: cluster._id },
                    update: { $set: { memberUniversityIds: merged } },
                },
            }];
    });
    if (clusterMemberOps.length > 0) {
        await UniversityCluster_1.default.bulkWrite(clusterMemberOps);
    }
    await reconcileUniversityClusterAssignments();
}
async function backfillUniversityTaxonomyIfNeeded(force = false) {
    const now = Date.now();
    if (!force && now - lastBackfillAt < BACKFILL_TTL_MS)
        return;
    if (backfillPromise) {
        await backfillPromise;
        return;
    }
    backfillPromise = backfillUniversityTaxonomyInternal()
        .then(() => {
        lastBackfillAt = Date.now();
    })
        .finally(() => {
        backfillPromise = null;
    });
    await backfillPromise;
}
function normalizeUniversityImportRow(input) {
    const category = (0, universityCategories_1.normalizeUniversityCategory)(input.category || universityCategories_1.DEFAULT_UNIVERSITY_CATEGORY);
    const clusterGroup = normalizeClusterName(input.clusterGroup);
    return {
        ...input,
        category,
        clusterGroup,
        applicationStartDate: parseDateValue(input.applicationStartDate),
        applicationEndDate: parseDateValue(input.applicationEndDate),
        examDateScience: normalizeExamDateValue(input.examDateScience),
        examDateArts: normalizeExamDateValue(input.examDateArts),
        examDateBusiness: normalizeExamDateValue(input.examDateBusiness),
        isActive: normalizeBoolean(input.isActive, true),
        featured: normalizeBoolean(input.featured, false),
        categorySyncLocked: normalizeBoolean(input.categorySyncLocked, false),
        clusterSyncLocked: normalizeBoolean(input.clusterSyncLocked, false),
        examCenters: normalizeExamCenters(input.examCenters),
    };
}
//# sourceMappingURL=universitySyncService.js.map