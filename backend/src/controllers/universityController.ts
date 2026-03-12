import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import slugify from 'slugify';
import HomeSettings from '../models/HomeSettings';
import University from '../models/University';
import UniversityCategory from '../models/UniversityCategory';
import { ALLOWED_CATEGORIES, ensureUniversitySettings } from '../models/UniversitySettings';
import { broadcastStudentDashboardEvent } from '../realtime/studentDashboardStream';
import { broadcastHomeStreamEvent } from '../realtime/homeStream';
import {
    DEFAULT_UNIVERSITY_CATEGORY,
    UNIVERSITY_CATEGORY_ORDER,
    getUniversityCategoryOrderIndex,
    isAllUniversityCategoryToken,
    normalizeUniversityCategoryStrict,
} from '../utils/universityCategories';

type UniversityStatusFilter = 'active' | 'inactive' | 'archived' | 'all';

const SORT_WHITELIST: Record<string, string> = {
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
    'slug',
].join(' ');

function asStatusFilter(value: unknown): UniversityStatusFilter {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'active' || raw === 'inactive' || raw === 'archived' || raw === 'all') return raw;
    return 'all';
}

function toBool(value: unknown, fallback = false): boolean {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const lowered = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'off'].includes(lowered)) return false;
    return fallback;
}

function normalizeSort(sortBy: unknown, sortOrder: unknown, legacySort: unknown): Record<string, 1 | -1> {
    const sortParam = String(sortBy || legacySort || '').trim().toLowerCase();
    if (sortParam === 'deadline' || sortParam === 'nearest_application_deadline') return { applicationEndDate: 1, name: 1 };
    if (sortParam === 'alphabetical') return { name: 1 };
    if (sortParam === 'name_asc') return { name: 1 };
    if (sortParam === 'name_desc') return { name: -1 };
    if (sortParam === 'closing_soon' || sortParam === 'nearest_deadline') return { applicationEndDate: 1, name: 1 };
    if (sortParam === 'exam_soon') return { scienceExamDate: 1, artsExamDate: 1, businessExamDate: 1, name: 1 };

    const legacy = String(legacySort || '').trim();
    if (legacy.startsWith('-') && SORT_WHITELIST[legacy.slice(1)]) return { [SORT_WHITELIST[legacy.slice(1)]]: -1 };
    if (SORT_WHITELIST[legacy]) return { [SORT_WHITELIST[legacy]]: 1 };

    const key = SORT_WHITELIST[String(sortBy || '').trim()] || 'createdAt';
    const order = String(sortOrder || '').trim().toLowerCase() === 'asc' ? 1 : -1;
    return { [key]: order };
}

function normalizeSlug(name: string, existingSlug?: string): string {
    const fallback = slugify(name || existingSlug || '', { lower: true, strict: true });
    return fallback || `university-${Date.now()}`;
}

function csvEscape(value: unknown): string {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n')) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function toDateString(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().slice(0, 10);
}

function asStringIdList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
    const raw = String(value || '').trim();
    if (!raw) return [];
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeClusterGroupValue(data: Record<string, unknown>): void {
    const rawGroup = String(data.clusterGroup || '').trim();
    data.clusterGroup = rawGroup || String(data.clusterName || '').trim() || '';
}

function toCanonicalUniversityRecord(input: Record<string, unknown>): Record<string, unknown> {
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

    return {
        ...input,
        category: normalizeUniversityCategoryStrict(input.category || DEFAULT_UNIVERSITY_CATEGORY),
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
        clusterGroup: String(input.clusterGroup || '').trim(),
        isActive: toBool(input.isActive, true),
    };
}

async function resolveCategoryFields(source: Record<string, unknown>): Promise<{ category: string; categoryId: string | null }> {
    const categoryIdRaw = String(source.categoryId || '').trim();
    if (categoryIdRaw) {
        const byId = await UniversityCategory.findById(categoryIdRaw).select('_id name').lean();
        if (byId) return { category: normalizeUniversityCategoryStrict(byId.name), categoryId: String(byId._id) };
    }
    const categoryName = normalizeUniversityCategoryStrict(source.category || DEFAULT_UNIVERSITY_CATEGORY);
    const byName = await UniversityCategory.findOne({ name: categoryName }).select('_id').lean();
    return { category: categoryName, categoryId: byName ? String(byName._id) : null };
}

async function getUniversityDashboardConfig(): Promise<{ defaultCategory: string; showAllCategories: boolean }> {
    const settings = await HomeSettings.findOne().select('universityDashboard').lean();
    const showAllCategories = Boolean(settings?.universityDashboard?.showAllCategories);
    const rawDefault = String(settings?.universityDashboard?.defaultCategory || '').trim();
    const normalizedDefault = isAllUniversityCategoryToken(rawDefault)
        ? DEFAULT_UNIVERSITY_CATEGORY
        : normalizeUniversityCategoryStrict(rawDefault || DEFAULT_UNIVERSITY_CATEGORY);

    return {
        defaultCategory: normalizedDefault,
        showAllCategories,
    };
}

function buildUniversityFilter(
    query: Request['query'],
    opts?: { includeArchivedDefault?: boolean; requireCategory?: boolean; allowAllCategories?: boolean },
): { filter: Record<string, unknown>; categoryMissing: boolean } {
    const includeArchivedDefault = Boolean(opts?.includeArchivedDefault);
    const requireCategory = Boolean(opts?.requireCategory);
    const allowAllCategories = Boolean(opts?.allowAllCategories);
    const { q, search, category, status, clusterId, clusterGroup, activeOnly } = query;

    const filter: Record<string, unknown> = {};
    const statusFilter = asStatusFilter(status);

    if (statusFilter === 'archived') filter.isArchived = true;
    else if (statusFilter === 'active') { filter.isArchived = { $ne: true }; filter.isActive = true; }
    else if (statusFilter === 'inactive') { filter.isArchived = { $ne: true }; filter.isActive = false; }
    else if (!includeArchivedDefault) filter.isArchived = { $ne: true };

    if (activeOnly !== undefined) filter.isActive = toBool(activeOnly, true);

    let categoryMissing = false;
    const categoryRaw = String(category || '').trim();
    if (categoryRaw && !isAllUniversityCategoryToken(categoryRaw)) {
        filter.category = normalizeUniversityCategoryStrict(categoryRaw);
    } else if (categoryRaw && isAllUniversityCategoryToken(categoryRaw) && requireCategory && !allowAllCategories) {
        categoryMissing = true;
    } else if (!categoryRaw && requireCategory && !allowAllCategories) {
        categoryMissing = true;
    }

    if (clusterId) filter.clusterId = clusterId;
    if (clusterGroup && String(clusterGroup).trim()) filter.clusterGroup = String(clusterGroup).trim();

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

/* ------------------------------- PUBLIC ------------------------------- */

export async function getUniversities(req: Request, res: Response): Promise<void> {
    try {
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
        if (featuredMode) filter.featured = true;

        const sortOption = featuredMode
            ? ({ featuredOrder: 1, name: 1 } as Record<string, 1 | -1>)
            : normalizeSort(sortBy, sortOrder, sort);
        const total = await University.countDocuments(filter);
        const rows = await University.find(filter)
            .select(PUBLIC_UNIVERSITY_LIST_PROJECTION)
            .sort(sortOption)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        res.json({
            items: rows.map((item) => toCanonicalUniversityRecord(item as unknown as Record<string, unknown>)),
            page: pageNum,
            limit: limitNum,
            total,
        });
    } catch (error) {
        console.error('Get universities error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getUniversityCategories(_req: Request, res: Response): Promise<void> {
    try {
        const rows = await University.aggregate([
            { $match: { isActive: true, isArchived: { $ne: true } } },
            { $group: { _id: '$category', count: { $sum: 1 }, clusterGroups: { $addToSet: '$clusterGroup' } } },
        ]);

        const map = new Map<string, { count: number; clusterGroups: Set<string> }>();
        rows.forEach((row) => {
            const name = normalizeUniversityCategoryStrict(row._id || DEFAULT_UNIVERSITY_CATEGORY);
            const existing = map.get(name) || { count: 0, clusterGroups: new Set<string>() };
            existing.count += Number(row.count || 0);
            if (Array.isArray(row.clusterGroups)) {
                row.clusterGroups
                    .map((value: unknown) => String(value || '').trim())
                    .filter(Boolean)
                    .forEach((group: string) => existing.clusterGroups.add(group));
            }
            map.set(name, existing);
        });

        const extra = Array.from(map.keys()).filter((name) => !UNIVERSITY_CATEGORY_ORDER.includes(name as (typeof UNIVERSITY_CATEGORY_ORDER)[number]));
        const ordered = [...UNIVERSITY_CATEGORY_ORDER, ...extra.sort((a, b) => a.localeCompare(b))];
        const categories = ordered.map((categoryName, index) => ({
            categoryName,
            order: index + 1,
            count: map.get(categoryName)?.count || 0,
            clusterGroups: Array.from(map.get(categoryName)?.clusterGroups || []).sort(),
        }));
        res.json(categories);
    } catch (error) {
        console.error('Get university categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getUniversityBySlug(req: Request, res: Response): Promise<void> {
    try {
        const row = await University.findOne({ slug: req.params.slug, isActive: true, isArchived: { $ne: true } }).lean();
        if (!row) { res.status(404).json({ message: 'University not found' }); return; }
        res.json(toCanonicalUniversityRecord(row as unknown as Record<string, unknown>));
    } catch (error) {
        console.error('Get university error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/* -------------------------------- ADMIN -------------------------------- */

export async function adminGetAllUniversities(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '25', sort, sortBy, sortOrder, fields } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 25));
        const { filter } = buildUniversityFilter(req.query, { includeArchivedDefault: false });
        const selectedIds = asStringIdList(req.query.selectedIds);
        if (selectedIds.length > 0) filter._id = { $in: selectedIds };
        const sortOption = normalizeSort(sortBy, sortOrder, sort);

        let projection = '';
        if (fields) projection = String(fields).split(',').map((item) => item.trim()).filter(Boolean).join(' ');

        const total = await University.countDocuments(filter);
        const query = University.find(filter).sort(sortOption).skip((pageNum - 1) * limitNum).limit(limitNum);
        if (projection) query.select(projection);
        const rows = await query.lean();

        res.json({
            universities: rows.map((item) => toCanonicalUniversityRecord(item as unknown as Record<string, unknown>)),
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        console.error('adminGetAllUniversities error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetUniversityCategories(req: Request, res: Response): Promise<void> {
    try {
        const statusFilter = asStatusFilter(req.query.status);
        const baseFilter: Record<string, unknown> = {};
        if (statusFilter === 'archived') baseFilter.isArchived = true;
        else if (statusFilter === 'active') { baseFilter.isArchived = { $ne: true }; baseFilter.isActive = true; }
        else if (statusFilter === 'inactive') { baseFilter.isArchived = { $ne: true }; baseFilter.isActive = false; }
        else baseFilter.isArchived = { $ne: true };

        const counts = await University.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$category', count: { $sum: 1 }, clusterGroups: { $addToSet: '$clusterGroup' } } },
        ]);

        const normalizedMap = new Map<string, { count: number; clusterGroups: Set<string> }>();

        counts.forEach((row) => {
            const name = normalizeUniversityCategoryStrict(row._id || DEFAULT_UNIVERSITY_CATEGORY);
            const existing = normalizedMap.get(name) || { count: 0, clusterGroups: new Set<string>() };
            existing.count += Number(row.count || 0);
            if (Array.isArray(row.clusterGroups)) {
                row.clusterGroups
                    .map((v: unknown) => String(v || '').trim())
                    .filter(Boolean)
                    .forEach((group: string) => existing.clusterGroups.add(group));
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
                const ai = getUniversityCategoryOrderIndex(a.name);
                const bi = getUniversityCategoryOrderIndex(b.name);
                if (ai !== bi) return ai - bi;
                return a.name.localeCompare(b.name);
            });

        res.json({ categories });
    } catch (err) {
        console.error('adminGetUniversityCategories error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetUniversityById(req: Request, res: Response): Promise<void> {
    try {
        const row = await University.findById(req.params.id).lean();
        if (!row) { res.status(404).json({ message: 'University not found' }); return; }
        res.json({ university: toCanonicalUniversityRecord(row as unknown as Record<string, unknown>) });
    } catch (err) {
        console.error('adminGetUniversityById error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminCreateUniversity(req: Request, res: Response): Promise<void> {
    try {
        const payload = toCanonicalUniversityRecord((req.body || {}) as Record<string, unknown>);
        if (!payload.name || !String(payload.name).trim()) { res.status(400).json({ message: 'University name is required' }); return; }

        // Category validation against allowed list
        const catName = String(payload.category || '').trim();
        if (catName) {
            const settings = await ensureUniversitySettings();
            const isAllowed = (ALLOWED_CATEGORIES as readonly string[]).some((c) => c.toLowerCase() === catName.toLowerCase());
            if (!isAllowed && !settings.allowCustomCategories) {
                res.status(400).json({ message: `Category "${catName}" is not in the allowed list.`, code: 'INVALID_CATEGORY', allowedCategories: [...ALLOWED_CATEGORIES] });
                return;
            }
        }

        if (!payload.slug) payload.slug = normalizeSlug(String(payload.name || ''));
        const existing = await University.findOne({ slug: payload.slug });
        if (existing) payload.slug = `${payload.slug}-${Date.now()}`;
        const categoryFields = await resolveCategoryFields(payload);
        payload.category = categoryFields.category;
        payload.categoryId = categoryFields.categoryId;
        normalizeClusterGroupValue(payload);
        payload.isArchived = false;
        payload.archivedAt = null;
        payload.archivedBy = null;
        const created = await University.create(payload);
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'create', universityId: String(created._id) } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'create', universityId: String(created._id) } });
        res.status(201).json({ university: toCanonicalUniversityRecord(created.toObject() as unknown as Record<string, unknown>), message: 'University created successfully' });
    } catch (err: unknown) {
        if ((err as { code?: number }).code === 11000) { res.status(400).json({ message: 'A university with this name or slug already exists' }); return; }
        console.error('adminCreateUniversity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminUpdateUniversity(req: Request, res: Response): Promise<void> {
    try {
        const payload = toCanonicalUniversityRecord((req.body || {}) as Record<string, unknown>);

        // Category validation against allowed list
        const catName = String(payload.category || '').trim();
        if (catName) {
            const settings = await ensureUniversitySettings();
            const isAllowed = (ALLOWED_CATEGORIES as readonly string[]).some((c) => c.toLowerCase() === catName.toLowerCase());
            if (!isAllowed && !settings.allowCustomCategories) {
                res.status(400).json({ message: `Category "${catName}" is not in the allowed list.`, code: 'INVALID_CATEGORY', allowedCategories: [...ALLOWED_CATEGORIES] });
                return;
            }
        }

        if (payload.name && !payload.slug) payload.slug = normalizeSlug(String(payload.name || ''));
        if (payload.category !== undefined || payload.categoryId !== undefined) {
            const categoryFields = await resolveCategoryFields(payload);
            payload.category = categoryFields.category;
            payload.categoryId = categoryFields.categoryId;
        }
        if (payload.clusterGroup !== undefined || payload.clusterName !== undefined) normalizeClusterGroupValue(payload);
        const updated = await University.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        if (!updated) { res.status(404).json({ message: 'University not found' }); return; }
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'update', universityId: String(updated._id) } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'update', universityId: String(updated._id) } });
        res.json({ university: toCanonicalUniversityRecord(updated.toObject() as unknown as Record<string, unknown>), message: 'University updated successfully' });
    } catch (err: unknown) {
        if ((err as { code?: number }).code === 11000) { res.status(400).json({ message: 'Slug or name already taken by another university' }); return; }
        console.error('adminUpdateUniversity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminDeleteUniversity(req: Request, res: Response): Promise<void> {
    try {
        const mode = String(req.query.mode || 'hard').toLowerCase() === 'soft' ? 'soft' : 'hard';
        if (mode === 'soft') {
            const actorId = (req as Request & { user?: { _id?: string } }).user?._id || null;
            const updated = await University.findByIdAndUpdate(req.params.id, { $set: { isArchived: true, isActive: false, archivedAt: new Date(), archivedBy: actorId } }, { new: true });
            if (!updated) { res.status(404).json({ message: 'University not found' }); return; }
        } else {
            const removed = await University.findByIdAndDelete(req.params.id);
            if (!removed) { res.status(404).json({ message: 'University not found' }); return; }
        }
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'delete', universityId: req.params.id, mode } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'delete', universityId: req.params.id, mode } });
        res.json({ message: mode === 'soft' ? 'University archived successfully' : 'University deleted successfully' });
    } catch (err) {
        console.error('adminDeleteUniversity error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminBulkDeleteUniversities(req: Request, res: Response): Promise<void> {
    try {
        const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map((id: unknown) => String(id)) : [];
        const mode = String(req.body?.mode || 'soft').toLowerCase() === 'hard' ? 'hard' : 'soft';
        if (ids.length === 0) { res.status(400).json({ message: 'Invalid or empty array of IDs provided.' }); return; }
        const actorId = (req as Request & { user?: { _id?: string } }).user?._id || null;
        let affected = 0;
        if (mode === 'hard') {
            const result = await University.deleteMany({ _id: { $in: ids } });
            affected = Number(result.deletedCount || 0);
        } else {
            const result = await University.updateMany(
                { _id: { $in: ids } },
                { $set: { isArchived: true, archivedAt: new Date(), archivedBy: actorId, isActive: false } },
            );
            affected = Number(result.modifiedCount || 0);
        }
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'bulk_delete', mode, affected } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'bulk_delete', mode, affected } });
        res.json({ message: mode === 'hard' ? `${affected} universities permanently deleted.` : `${affected} universities archived.`, affected, mode, skipped: [], errors: [] });
    } catch (err) {
        console.error('adminBulkDeleteUniversities error:', err);
        res.status(500).json({ message: 'Server error during bulk deletion.' });
    }
}

export async function adminBulkUpdateUniversities(req: Request, res: Response): Promise<void> {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: unknown) => String(id)) : [];
        if (ids.length === 0) { res.status(400).json({ message: 'No university IDs provided.' }); return; }
        const updates = toCanonicalUniversityRecord((req.body?.updates || {}) as Record<string, unknown>);
        if (updates.category !== undefined || updates.categoryId !== undefined) {
            const categoryFields = await resolveCategoryFields(updates);
            updates.category = categoryFields.category;
            updates.categoryId = categoryFields.categoryId;
        }
        if (updates.clusterGroup !== undefined || updates.clusterName !== undefined) normalizeClusterGroupValue(updates);
        const result = await University.updateMany({ _id: { $in: ids }, isArchived: { $ne: true } }, { $set: updates });
        const affected = Number(result.modifiedCount || 0);
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'bulk_update', affected } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'bulk_update', affected } });
        res.json({ message: `${affected} universities updated.`, affected });
    } catch (err) {
        console.error('adminBulkUpdateUniversities error:', err);
        res.status(500).json({ message: 'Server error during bulk update.' });
    }
}

export async function adminToggleUniversityStatus(req: Request, res: Response): Promise<void> {
    try {
        const university = await University.findById(req.params.id);
        if (!university) { res.status(404).json({ message: 'University not found' }); return; }
        if (university.isArchived) { res.status(400).json({ message: 'Archived university cannot be activated. Restore it first.' }); return; }
        university.isActive = !university.isActive;
        await university.save();
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'toggle', universityId: String(university._id), isActive: university.isActive } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'toggle', universityId: String(university._id), isActive: university.isActive } });
        res.json({ university: toCanonicalUniversityRecord(university.toObject() as unknown as Record<string, unknown>), message: `University ${university.isActive ? 'activated' : 'deactivated'}` });
    } catch (err) {
        console.error('adminToggleUniversityStatus error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminReorderFeaturedUniversities(req: Request, res: Response): Promise<void> {
    try {
        const { order } = req.body as { order: { id: string; featuredOrder: number }[] };
        if (!Array.isArray(order)) { res.status(400).json({ message: 'Invalid order format' }); return; }
        if (order.length > 0) await University.bulkWrite(order.map((item) => ({ updateOne: { filter: { _id: item.id, isArchived: { $ne: true } }, update: { $set: { featuredOrder: item.featuredOrder } } } })));
        broadcastStudentDashboardEvent({ type: 'featured_university_updated', meta: { action: 'reorder' } });
        broadcastHomeStreamEvent({ type: 'home-updated', meta: { source: 'university', action: 'reorder' } });
        res.json({ message: 'Featured order updated successfully' });
    } catch (err) {
        console.error('adminReorderFeaturedUniversities error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminExportUniversities(req: Request, res: Response): Promise<void> {
    try {
        const format = String(req.query.format || req.query.type || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
        const { filter } = buildUniversityFilter(req.query, { includeArchivedDefault: false });
        const selectedIds = asStringIdList(req.query.selectedIds);
        if (selectedIds.length > 0) filter._id = { $in: selectedIds };
        const rows = await University.find(filter).sort(normalizeSort(req.query.sortBy, req.query.sortOrder, req.query.sort || 'name')).lean();
        const mapped = rows.map((row) => {
            const u = toCanonicalUniversityRecord(row as unknown as Record<string, unknown>);
            return {
                category: String(u.category || ''),
                clusterGroup: String(u.clusterGroup || ''),
                name: String(u.name || ''),
                shortForm: String(u.shortForm || ''),
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
                examCenters: Array.isArray(u.examCenters)
                    ? u.examCenters.map((center) => [String((center as Record<string, unknown>)?.city || ''), String((center as Record<string, unknown>)?.address || '')].filter(Boolean).join(' - ')).filter(Boolean).join(' | ')
                    : '',
                logoUrl: String(u.logoUrl || ''),
                isActive: String(Boolean(u.isActive)),
                slug: String(u.slug || ''),
            };
        });

        const headers = Object.keys(mapped[0] || {
            category: '', clusterGroup: '', name: '', shortForm: '', establishedYear: '', address: '', contactNumber: '', email: '',
            websiteUrl: '', admissionUrl: '', totalSeats: '', seatsScienceEng: '', seatsArtsHum: '', seatsBusiness: '',
            applicationStartDate: '', applicationEndDate: '', examDateScience: '', examDateArts: '', examDateBusiness: '',
            examCenters: '', logoUrl: '', isActive: '', slug: '',
        });

        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Universities');
            sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(14, header.length + 4) }));
            mapped.forEach((row) => sheet.addRow(row));
            res.setHeader('Content-Disposition', 'attachment; filename=universities_export.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            await workbook.xlsx.write(res);
            res.end();
            return;
        }

        const csvLines = mapped.map((row) => headers.map((header) => csvEscape((row as Record<string, unknown>)[header])).join(','));
        const csv = `${headers.join(',')}\n${csvLines.join('\n')}`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=universities_export.csv');
        res.send(csv);
    } catch (err) {
        console.error('adminExportUniversities error:', err);
        res.status(500).json({ message: 'Failed to export universities.' });
    }
}
