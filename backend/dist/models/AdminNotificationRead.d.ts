import mongoose, { Document } from 'mongoose';
export interface IAdminNotificationRead extends Document {
    adminUserId: mongoose.Types.ObjectId;
    notificationId: mongoose.Types.ObjectId;
    readAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAdminNotificationRead, {}, {}, {}, mongoose.Document<unknown, {}, IAdminNotificationRead, {}, {}> & IAdminNotificationRead & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AdminNotificationRead.d.ts.map