import mongoose, { Document } from 'mongoose';
import type { IExamCenter } from './University';
export interface IUniversityCategorySharedConfig {
    applicationStartDate?: Date | null;
    applicationEndDate?: Date | null;
    scienceExamDate?: string;
    artsExamDate?: string;
    businessExamDate?: string;
    examCenters: IExamCenter[];
}
export interface IUniversityCategorySyncMeta {
    lastSyncedAt?: Date | null;
    lastSyncedBy?: mongoose.Types.ObjectId | null;
    lastSyncedCount?: number;
    skippedCount?: number;
}
export interface IUniversityCategory extends Document {
    name: string;
    slug: string;
    labelBn?: string;
    labelEn?: string;
    colorToken?: string;
    icon?: string;
    isActive: boolean;
    homeHighlight: boolean;
    homeOrder: number;
    sharedConfig: IUniversityCategorySharedConfig;
    syncMeta: IUniversityCategorySyncMeta;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUniversityCategory, {}, {}, {}, mongoose.Document<unknown, {}, IUniversityCategory, {}, {}> & IUniversityCategory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=UniversityCategory.d.ts.map