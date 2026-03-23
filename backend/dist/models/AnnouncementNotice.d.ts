import mongoose, { Document } from 'mongoose';
export type AnnouncementTarget = 'all' | 'groups' | 'students';
export interface IAnnouncementNotice extends Document {
    title: string;
    message: string;
    target: AnnouncementTarget;
    targetIds: string[];
    sourceNewsId?: mongoose.Types.ObjectId | null;
    priority?: 'normal' | 'priority' | 'breaking';
    classification?: {
        primaryCategory?: string;
        tags?: string[];
        universityIds?: mongoose.Types.ObjectId[];
        clusterIds?: mongoose.Types.ObjectId[];
        groupIds?: mongoose.Types.ObjectId[];
    };
    deliveryMeta?: {
        lastJobId?: mongoose.Types.ObjectId | null;
        lastChannel?: 'sms' | 'email' | 'both';
        lastAudienceSummary?: string;
        lastSentAt?: Date | null;
    };
    templateRef?: string;
    triggerRef?: string;
    startAt: Date;
    endAt?: Date | null;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAnnouncementNotice, {}, {}, {}, mongoose.Document<unknown, {}, IAnnouncementNotice, {}, {}> & IAnnouncementNotice & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AnnouncementNotice.d.ts.map