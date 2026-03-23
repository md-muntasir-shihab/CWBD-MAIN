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
const AttachmentSchema = new mongoose_1.Schema({
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ['image', 'pdf', 'other'], default: 'other' },
    filename: { type: String, trim: true },
    sizeBytes: { type: Number },
    uploadedAtUTC: { type: Date, default: Date.now },
}, { _id: false });
const FinanceTransactionSchema = new mongoose_1.Schema({
    txnCode: { type: String, required: true, unique: true, trim: true, index: true },
    direction: { type: String, enum: ['income', 'expense'], required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT', trim: true },
    dateUTC: { type: Date, required: true, index: true },
    accountCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    categoryLabel: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'cancelled', 'refunded'],
        default: 'paid',
        index: true,
    },
    method: {
        type: String,
        enum: ['cash', 'bkash', 'nagad', 'bank', 'card', 'manual', 'gateway', 'upay', 'rocket', 'auto'],
        default: 'manual',
    },
    tags: [{ type: String, trim: true }],
    costCenterId: { type: String, trim: true },
    vendorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'FinanceVendor', default: null },
    // source linking
    sourceType: {
        type: String,
        enum: [
            'subscription_payment', 'exam_payment', 'service_sale', 'manual_income',
            'expense', 'refund', 'sms_cost', 'email_cost',
            'sms_campaign_cost', 'email_campaign_cost', 'onboarding_message_cost',
            'result_notification_cost', 'guardian_notification_cost', 'auto_notification_cost',
            'hosting_cost', 'staff_payout', 'sms_test_send_cost', 'email_test_send_cost', 'other',
        ],
        required: true,
        index: true,
    },
    sourceId: { type: String, trim: true, index: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    examId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exam', default: null },
    serviceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Service', default: null },
    // reference
    txnRefId: { type: String, trim: true },
    invoiceNo: { type: String, trim: true },
    note: { type: String, trim: true, default: '' },
    // workflow
    createdByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAtUTC: { type: Date, default: null },
    paidAtUTC: { type: Date, default: null },
    // attachments
    attachments: { type: [AttachmentSchema], default: [] },
    // soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'finance_transactions' });
FinanceTransactionSchema.index({ direction: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ direction: 1, status: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ sourceType: 1, sourceId: 1 });
FinanceTransactionSchema.index({ studentId: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ costCenterId: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ accountCode: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ isDeleted: 1, direction: 1, dateUTC: -1 });
exports.default = mongoose_1.default.model('FinanceTransaction', FinanceTransactionSchema);
//# sourceMappingURL=FinanceTransaction.js.map