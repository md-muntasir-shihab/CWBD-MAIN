import mongoose, { Document } from 'mongoose';
export type ContactMessageStatus = 'new' | 'opened' | 'replied' | 'resolved' | 'archived';
export type ContactMessageSourceType = 'public' | 'user' | 'student' | 'subscriber';
export type ContactMessageMatchedBy = 'email' | 'phone' | 'userId' | 'none';
export interface IContactMessage extends Document {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    status: ContactMessageStatus;
    unreadByAdmin: boolean;
    adminOpenedAt?: Date | null;
    sourceType: ContactMessageSourceType;
    linkedUserId?: mongoose.Types.ObjectId | null;
    linkedStudentId?: mongoose.Types.ObjectId | null;
    matchedBy: ContactMessageMatchedBy;
    normalizedEmail?: string;
    normalizedPhone?: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    isReplied: boolean;
    ip?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IContactMessage, {}, {}, {}, mongoose.Document<unknown, {}, IContactMessage, {}, {}> & IContactMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ContactMessage.d.ts.map