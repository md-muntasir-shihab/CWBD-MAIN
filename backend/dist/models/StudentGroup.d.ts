import mongoose, { Document } from 'mongoose';
export type GroupType = 'manual' | 'dynamic';
export type CardStyleVariant = 'solid' | 'gradient' | 'outline' | 'minimal';
export interface IStudentGroup extends Document {
    name: string;
    slug: string;
    shortCode?: string;
    batchTag?: string;
    description?: string;
    isActive: boolean;
    studentCount: number;
    memberCountCached: number;
    createdByAdminId?: mongoose.Types.ObjectId;
    type: GroupType;
    color?: string;
    icon?: string;
    cardStyleVariant?: CardStyleVariant;
    sortOrder: number;
    isFeatured: boolean;
    batch?: string;
    department?: string;
    visibilityNote?: string;
    defaultExamVisibility?: 'all_students' | 'group_only' | 'hidden';
    defaultCommunicationAudience?: boolean;
    /** @deprecated Use GroupMembership collection. Kept for migration compatibility. */
    manualStudents?: mongoose.Types.ObjectId[];
    rules?: {
        batches?: string[];
        sscBatches?: string[];
        departments?: string[];
        statuses?: string[];
        planCodes?: string[];
        planIds?: string[];
        groupIds?: string[];
        bucket?: string;
        hasPhone?: boolean;
        hasEmail?: boolean;
        hasGuardian?: boolean;
        paymentDue?: boolean;
        renewalThresholdDays?: number;
        profileScoreRange?: {
            min?: number;
            max?: number;
        };
    };
    meta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IStudentGroup, {}, {}, {}, mongoose.Document<unknown, {}, IStudentGroup, {}, {}> & IStudentGroup & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentGroup.d.ts.map