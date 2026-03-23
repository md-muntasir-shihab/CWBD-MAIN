"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("../config/db");
const HomeSettings_1 = __importDefault(require("../models/HomeSettings"));
const University_1 = __importDefault(require("../models/University"));
const UniversityCluster_1 = __importDefault(require("../models/UniversityCluster"));
async function run() {
    try {
        await (0, db_1.connectDB)();
        const [totalUniversities, activeUniversities, featuredUniversities, missingShortForm, missingDeadline, missingExamDates, missingExamCenters] = await Promise.all([
            University_1.default.countDocuments({}),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true } }),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true }, featured: true }),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true }, $or: [{ shortForm: { $exists: false } }, { shortForm: '' }] }),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true }, $or: [{ applicationEndDate: null }, { applicationEndDate: { $exists: false } }] }),
            University_1.default.countDocuments({
                isActive: true,
                isArchived: { $ne: true },
                $and: [
                    { $or: [{ scienceExamDate: '' }, { scienceExamDate: { $exists: false } }] },
                    { $or: [{ artsExamDate: '' }, { artsExamDate: { $exists: false } }] },
                    { $or: [{ businessExamDate: '' }, { businessExamDate: { $exists: false } }] },
                ],
            }),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true }, $or: [{ examCenters: { $exists: false } }, { examCenters: { $size: 0 } }] }),
        ]);
        const [homeVisibleClusters, emptyClusters, duplicateSlugs, missingCategoryRefs, missingClusterRefs, sampleUniversities, homeSettings] = await Promise.all([
            UniversityCluster_1.default.countDocuments({ isActive: true, homeVisible: true }),
            UniversityCluster_1.default.countDocuments({ isActive: true, memberUniversityIds: { $size: 0 } }),
            University_1.default.aggregate([
                { $group: { _id: '$slug', count: { $sum: 1 } } },
                { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
            ]),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true }, categoryId: null }),
            University_1.default.countDocuments({ isActive: true, isArchived: { $ne: true }, clusterGroup: { $ne: '' }, clusterId: null }),
            University_1.default.find({ isActive: true, isArchived: { $ne: true } })
                .sort({ featured: -1, featuredOrder: 1, name: 1 })
                .limit(12)
                .select('name slug category clusterGroup applicationEndDate scienceExamDate examCenters featured logoUrl shortForm')
                .lean(),
            HomeSettings_1.default.findOne({}).lean(),
        ]);
        const output = {
            ok: true,
            databaseName: mongoose_1.default.connection.db?.databaseName || '',
            universities: {
                total: totalUniversities,
                active: activeUniversities,
                featured: featuredUniversities,
                missingShortForm,
                missingDeadline,
                missingExamDates,
                missingExamCenters,
                missingCategoryRefs,
                missingClusterRefs,
            },
            clusters: {
                homeVisible: homeVisibleClusters,
                empty: emptyClusters,
            },
            duplicateSlugs,
            homeSettings: homeSettings ? {
                defaultCategory: homeSettings.universityPreview?.defaultActiveCategory || homeSettings.universityDashboard?.defaultCategory || '',
                showAllCategories: Boolean(homeSettings.universityDashboard?.showAllCategories),
                enableClusterFilter: Boolean(homeSettings.universityPreview?.enableClusterFilter),
                featuredMode: String(homeSettings.universityPreview?.featuredMode || ''),
                highlightedCategories: Array.isArray(homeSettings.highlightedCategories)
                    ? homeSettings.highlightedCategories.map((item) => String(item.category || ''))
                    : [],
            } : null,
            sampleUniversities,
        };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_open_universities_db_evidence] failed', error);
        process.exitCode = 1;
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
void run();
//# sourceMappingURL=e2e_open_universities_db_evidence.js.map