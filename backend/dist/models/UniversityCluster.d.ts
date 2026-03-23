import mongoose, { Document } from 'mongoose';
import type { IExamCenter } from './University';
export interface IUniversityClusterDateConfig {
    applicationStartDate?: Date | null;
    applicationEndDate?: Date | null;
    scienceExamDate?: string;
    commerceExamDate?: string;
    artsExamDate?: string;
    examCenters: IExamCenter[];
}
export interface IUniversityCluster extends Document {
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    memberUniversityIds: mongoose.Types.ObjectId[];
    categoryRules: string[];
    categoryRuleIds: mongoose.Types.ObjectId[];
    dates: IUniversityClusterDateConfig;
    syncPolicy: 'inherit_with_override';
    homeVisible: boolean;
    homeOrder: number;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUniversityCluster, {}, {}, {}, mongoose.Document<unknown, {}, IUniversityCluster, {}, {}> & IUniversityCluster & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=UniversityCluster.d.ts.map