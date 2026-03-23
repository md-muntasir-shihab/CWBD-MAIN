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
const ExamCenterSchema = new mongoose_1.Schema({
    city: { type: String, required: true },
    address: { type: String, required: true },
}, { _id: false });
const UnitSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    seats: { type: Number, default: 0 },
    examDates: [Date],
    applicationStart: Date,
    applicationEnd: Date,
    examCenters: [ExamCenterSchema],
    notes: String,
}, { _id: true });
const ClusterDateOverridesSchema = new mongoose_1.Schema({
    applicationStartDate: { type: Date, default: null },
    applicationEndDate: { type: Date, default: null },
    scienceExamDate: { type: String, default: '' },
    artsExamDate: { type: String, default: '' },
    businessExamDate: { type: String, default: '' },
}, { _id: false });
const UniversitySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    shortForm: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    categoryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'UniversityCategory', default: null },
    established: { type: Number },
    establishedYear: { type: Number },
    address: { type: String },
    contactNumber: { type: String },
    email: { type: String },
    website: { type: String },
    websiteUrl: { type: String },
    admissionWebsite: { type: String },
    admissionUrl: { type: String },
    totalSeats: { type: String, default: 'N/A' },
    scienceSeats: { type: String, default: 'N/A' },
    seatsScienceEng: { type: String, default: 'N/A' },
    artsSeats: { type: String, default: 'N/A' },
    seatsArtsHum: { type: String, default: 'N/A' },
    businessSeats: { type: String, default: 'N/A' },
    seatsBusiness: { type: String, default: 'N/A' },
    shortDescription: { type: String },
    description: { type: String, default: '' },
    logoUrl: String,
    clusterId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'UniversityCluster', default: null },
    clusterGroup: { type: String, default: '' },
    clusterName: String,
    clusterCount: Number,
    clusterDateOverrides: { type: ClusterDateOverridesSchema, default: () => ({}) },
    clusterSyncLocked: { type: Boolean, default: false },
    categorySyncLocked: { type: Boolean, default: false },
    applicationStartDate: Date,
    applicationEndDate: Date,
    scienceExamDate: { type: String, default: 'N/A' },
    examDateScience: { type: String, default: 'N/A' },
    artsExamDate: { type: String, default: 'N/A' },
    examDateArts: { type: String, default: 'N/A' },
    businessExamDate: { type: String, default: 'N/A' },
    examDateBusiness: { type: String, default: 'N/A' },
    units: [UnitSchema],
    examCenters: [ExamCenterSchema],
    socialLinks: [{ platform: String, url: String, icon: String }],
    unitLayout: { type: String, enum: ['compact', 'stacked', 'carousel'], default: 'compact' },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },
    verificationStatus: { type: String, default: 'Pending' },
    remarks: { type: String, default: '' },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    slug: { type: String, required: true, unique: true },
}, { timestamps: true });
UniversitySchema.index({ category: 1 });
UniversitySchema.index({ categoryId: 1, isActive: 1, isArchived: 1 });
UniversitySchema.index({ category: 1, isActive: 1, isArchived: 1 });
UniversitySchema.index({ clusterId: 1 });
UniversitySchema.index({ clusterGroup: 1 });
UniversitySchema.index({ shortForm: 1 });
UniversitySchema.index({ applicationEndDate: 1 });
UniversitySchema.index({ category: 1, clusterGroup: 1, isActive: 1, isArchived: 1 });
UniversitySchema.index({ name: 'text', shortForm: 'text' });
UniversitySchema.index({ name: 1, shortForm: 1 });
exports.default = mongoose_1.default.model('University', UniversitySchema);
//# sourceMappingURL=University.js.map