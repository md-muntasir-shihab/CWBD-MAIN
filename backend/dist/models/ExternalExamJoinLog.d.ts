import mongoose, { Document } from 'mongoose';
export interface IExternalExamJoinLog extends Document {
    examId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    joinedAt: Date;
    attemptNo: number;
    attemptRef: string;
    status: 'awaiting_result' | 'imported';
    sourcePanel: string;
    registration_id_snapshot?: string;
    user_unique_id_snapshot?: string;
    username_snapshot?: string;
    email_snapshot?: string;
    phone_number_snapshot?: string;
    full_name_snapshot?: string;
    groupIds_snapshot: string[];
    externalExamUrl?: string;
    importedResultId?: mongoose.Types.ObjectId | null;
    importedAt?: Date | null;
    matchedBy?: string;
    ip: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IExternalExamJoinLog, {}, {}, {}, mongoose.Document<unknown, {}, IExternalExamJoinLog, {}, {}> & IExternalExamJoinLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ExternalExamJoinLog.d.ts.map