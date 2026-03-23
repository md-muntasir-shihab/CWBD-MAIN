import mongoose, { Document } from 'mongoose';
export interface IUniversityImportRowError {
    rowNumber: number;
    reason: string;
    payload?: Record<string, unknown>;
}
export interface IUniversityImportValidationSummary {
    totalRows: number;
    validRows: number;
    invalidRows: number;
}
export interface IUniversityImportCommitSummary {
    inserted: number;
    updated: number;
    failed: number;
    createdCategories?: number;
    createdClusters?: number;
    failedRowCount?: number;
}
export interface IUniversityImportJob extends Document {
    status: 'initialized' | 'validated' | 'committed' | 'failed';
    sourceFileName: string;
    mimeType: string;
    createdBy?: mongoose.Types.ObjectId | null;
    headers: string[];
    sampleRows: unknown[];
    rawRows: unknown[];
    normalizedRows: unknown[];
    mapping: Record<string, string>;
    defaults: Record<string, unknown>;
    validationSummary?: IUniversityImportValidationSummary;
    commitSummary?: IUniversityImportCommitSummary;
    failedRows: IUniversityImportRowError[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUniversityImportJob, {}, {}, {}, mongoose.Document<unknown, {}, IUniversityImportJob, {}, {}> & IUniversityImportJob & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=UniversityImportJob.d.ts.map