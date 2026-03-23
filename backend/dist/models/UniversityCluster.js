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
    city: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
}, { _id: false });
const UniversityClusterDateConfigSchema = new mongoose_1.Schema({
    applicationStartDate: { type: Date, default: null },
    applicationEndDate: { type: Date, default: null },
    scienceExamDate: { type: String, default: '' },
    commerceExamDate: { type: String, default: '' },
    artsExamDate: { type: String, default: '' },
    examCenters: { type: [ExamCenterSchema], default: [] },
}, { _id: false });
const UniversityClusterSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    memberUniversityIds: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'University' }], default: [] },
    categoryRules: { type: [String], default: [] },
    categoryRuleIds: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'UniversityCategory' }], default: [] },
    dates: { type: UniversityClusterDateConfigSchema, default: () => ({}) },
    syncPolicy: { type: String, enum: ['inherit_with_override'], default: 'inherit_with_override' },
    homeVisible: { type: Boolean, default: false },
    homeOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
UniversityClusterSchema.index({ isActive: 1, homeVisible: 1, homeOrder: 1 });
UniversityClusterSchema.index({ categoryRuleIds: 1 });
exports.default = mongoose_1.default.model('UniversityCluster', UniversityClusterSchema);
//# sourceMappingURL=UniversityCluster.js.map