import { z } from 'zod';
export declare const createTransactionSchema: z.ZodObject<{
    direction: z.ZodEnum<{
        income: "income";
        expense: "expense";
    }>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    dateUTC: z.ZodOptional<z.ZodString>;
    accountCode: z.ZodString;
    categoryLabel: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        approved: "approved";
        paid: "paid";
        refunded: "refunded";
        cancelled: "cancelled";
    }>>;
    method: z.ZodOptional<z.ZodEnum<{
        manual: "manual";
        bkash: "bkash";
        nagad: "nagad";
        rocket: "rocket";
        upay: "upay";
        cash: "cash";
        bank: "bank";
        card: "card";
        gateway: "gateway";
    }>>;
    sourceType: z.ZodOptional<z.ZodEnum<{
        other: "other";
        expense: "expense";
        subscription_payment: "subscription_payment";
        exam_payment: "exam_payment";
        service_sale: "service_sale";
        manual_income: "manual_income";
        refund: "refund";
        sms_cost: "sms_cost";
        email_cost: "email_cost";
        hosting_cost: "hosting_cost";
        staff_payout: "staff_payout";
    }>>;
    sourceId: z.ZodOptional<z.ZodString>;
    studentId: z.ZodOptional<z.ZodString>;
    planId: z.ZodOptional<z.ZodString>;
    examId: z.ZodOptional<z.ZodString>;
    serviceId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    costCenterId: z.ZodOptional<z.ZodString>;
    vendorId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateTransactionSchema: z.ZodObject<{
    direction: z.ZodOptional<z.ZodEnum<{
        income: "income";
        expense: "expense";
    }>>;
    amount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    dateUTC: z.ZodOptional<z.ZodString>;
    accountCode: z.ZodOptional<z.ZodString>;
    categoryLabel: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        approved: "approved";
        paid: "paid";
        refunded: "refunded";
        cancelled: "cancelled";
    }>>;
    method: z.ZodOptional<z.ZodEnum<{
        manual: "manual";
        bkash: "bkash";
        nagad: "nagad";
        rocket: "rocket";
        upay: "upay";
        cash: "cash";
        bank: "bank";
        card: "card";
        gateway: "gateway";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    costCenterId: z.ZodOptional<z.ZodString>;
    vendorId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const bulkIdsSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const createInvoiceSchema: z.ZodObject<{
    studentId: z.ZodOptional<z.ZodString>;
    purpose: z.ZodEnum<{
        subscription: "subscription";
        exam: "exam";
        service: "service";
        custom: "custom";
    }>;
    planId: z.ZodOptional<z.ZodString>;
    examId: z.ZodOptional<z.ZodString>;
    serviceId: z.ZodOptional<z.ZodString>;
    amountBDT: z.ZodNumber;
    dueDateUTC: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateInvoiceSchema: z.ZodObject<{
    amountBDT: z.ZodOptional<z.ZodNumber>;
    paidAmountBDT: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        partial: "partial";
        paid: "paid";
        unpaid: "unpaid";
        cancelled: "cancelled";
        overdue: "overdue";
    }>>;
    dueDateUTC: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const markInvoicePaidSchema: z.ZodObject<{
    paidAmount: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createBudgetSchema: z.ZodObject<{
    month: z.ZodString;
    accountCode: z.ZodString;
    categoryLabel: z.ZodString;
    amountLimit: z.ZodNumber;
    alertThresholdPercent: z.ZodDefault<z.ZodNumber>;
    direction: z.ZodEnum<{
        income: "income";
        expense: "expense";
    }>;
    costCenterId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateBudgetSchema: z.ZodObject<{
    accountCode: z.ZodOptional<z.ZodString>;
    categoryLabel: z.ZodOptional<z.ZodString>;
    amountLimit: z.ZodOptional<z.ZodNumber>;
    alertThresholdPercent: z.ZodOptional<z.ZodNumber>;
    direction: z.ZodOptional<z.ZodEnum<{
        income: "income";
        expense: "expense";
    }>>;
    costCenterId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createRecurringRuleSchema: z.ZodObject<{
    name: z.ZodString;
    direction: z.ZodEnum<{
        income: "income";
        expense: "expense";
    }>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    accountCode: z.ZodString;
    categoryLabel: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<{
        manual: "manual";
        bkash: "bkash";
        nagad: "nagad";
        rocket: "rocket";
        upay: "upay";
        cash: "cash";
        bank: "bank";
        card: "card";
        gateway: "gateway";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    costCenterId: z.ZodOptional<z.ZodString>;
    vendorId: z.ZodOptional<z.ZodString>;
    frequency: z.ZodEnum<{
        weekly: "weekly";
        monthly: "monthly";
        custom: "custom";
        yearly: "yearly";
    }>;
    dayOfMonth: z.ZodOptional<z.ZodNumber>;
    intervalDays: z.ZodOptional<z.ZodNumber>;
    nextRunAtUTC: z.ZodOptional<z.ZodString>;
    endAtUTC: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const updateRecurringRuleSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    direction: z.ZodOptional<z.ZodEnum<{
        income: "income";
        expense: "expense";
    }>>;
    amount: z.ZodOptional<z.ZodNumber>;
    accountCode: z.ZodOptional<z.ZodString>;
    categoryLabel: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<{
        manual: "manual";
        bkash: "bkash";
        nagad: "nagad";
        rocket: "rocket";
        upay: "upay";
        cash: "cash";
        bank: "bank";
        card: "card";
        gateway: "gateway";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    costCenterId: z.ZodOptional<z.ZodString>;
    vendorId: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodEnum<{
        weekly: "weekly";
        monthly: "monthly";
        custom: "custom";
        yearly: "yearly";
    }>>;
    dayOfMonth: z.ZodOptional<z.ZodNumber>;
    intervalDays: z.ZodOptional<z.ZodNumber>;
    nextRunAtUTC: z.ZodOptional<z.ZodString>;
    endAtUTC: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const createAccountSchema: z.ZodObject<{
    code: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    name: z.ZodString;
    type: z.ZodEnum<{
        income: "income";
        expense: "expense";
        asset: "asset";
        liability: "liability";
    }>;
    parentCode: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createVendorSchema: z.ZodObject<{
    name: z.ZodString;
    contact: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateSettingsSchema: z.ZodObject<{
    defaultCurrency: z.ZodOptional<z.ZodString>;
    requireApprovalForExpense: z.ZodOptional<z.ZodBoolean>;
    requireApprovalForIncome: z.ZodOptional<z.ZodBoolean>;
    enableBudgets: z.ZodOptional<z.ZodBoolean>;
    enableRecurringEngine: z.ZodOptional<z.ZodBoolean>;
    receiptRequiredAboveAmount: z.ZodOptional<z.ZodNumber>;
    exportFooterNote: z.ZodOptional<z.ZodString>;
    smsCostPerMessageBDT: z.ZodOptional<z.ZodNumber>;
    emailCostPerMessageBDT: z.ZodOptional<z.ZodNumber>;
    costCenters: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const createRefundSchema: z.ZodObject<{
    originalPaymentId: z.ZodOptional<z.ZodString>;
    financeTxnId: z.ZodOptional<z.ZodString>;
    studentId: z.ZodOptional<z.ZodString>;
    amountBDT: z.ZodNumber;
    reason: z.ZodString;
}, z.core.$strip>;
export declare const processRefundSchema: z.ZodObject<{
    action: z.ZodEnum<{
        approve: "approve";
        reject: "reject";
    }>;
    rejectionNote: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const importCommitSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            income: "income";
            expense: "expense";
        }>>;
        amount: z.ZodNumber;
        accountCode: z.ZodString;
        categoryLabel: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        method: z.ZodOptional<z.ZodEnum<{
            manual: "manual";
            bkash: "bkash";
            nagad: "nagad";
            rocket: "rocket";
            upay: "upay";
            cash: "cash";
            bank: "bank";
            card: "card";
            gateway: "gateway";
        }>>;
        dateUTC: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=financeSchemas.d.ts.map