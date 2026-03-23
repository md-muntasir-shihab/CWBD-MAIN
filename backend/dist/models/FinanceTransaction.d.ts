import mongoose, { Document } from 'mongoose';
export type TxnDirection = 'income' | 'expense';
export type TxnStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'refunded';
export type TxnMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'card' | 'manual' | 'gateway' | 'upay' | 'rocket' | 'auto';
export type TxnSourceType = 'subscription_payment' | 'exam_payment' | 'service_sale' | 'manual_income' | 'expense' | 'refund' | 'sms_cost' | 'email_cost' | 'sms_campaign_cost' | 'email_campaign_cost' | 'onboarding_message_cost' | 'result_notification_cost' | 'guardian_notification_cost' | 'auto_notification_cost' | 'hosting_cost' | 'staff_payout' | 'sms_test_send_cost' | 'email_test_send_cost' | 'other';
export interface IAttachment {
    url: string;
    type: 'image' | 'pdf' | 'other';
    filename?: string;
    sizeBytes?: number;
    uploadedAtUTC: Date;
}
export interface IFinanceTransaction extends Document {
    txnCode: string;
    direction: TxnDirection;
    amount: number;
    currency: string;
    dateUTC: Date;
    accountCode: string;
    categoryLabel: string;
    description: string;
    status: TxnStatus;
    method: TxnMethod;
    tags: string[];
    costCenterId?: string;
    vendorId?: mongoose.Types.ObjectId;
    sourceType: TxnSourceType;
    sourceId?: string;
    studentId?: mongoose.Types.ObjectId;
    planId?: mongoose.Types.ObjectId;
    examId?: mongoose.Types.ObjectId;
    serviceId?: mongoose.Types.ObjectId;
    txnRefId?: string;
    invoiceNo?: string;
    note?: string;
    createdByAdminId: mongoose.Types.ObjectId;
    approvedByAdminId?: mongoose.Types.ObjectId;
    approvedAtUTC?: Date;
    paidAtUTC?: Date;
    attachments: IAttachment[];
    isDeleted: boolean;
    deletedAt?: Date;
    deletedByAdminId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IFinanceTransaction, {}, {}, {}, mongoose.Document<unknown, {}, IFinanceTransaction, {}, {}> & IFinanceTransaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FinanceTransaction.d.ts.map