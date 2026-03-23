import mongoose from 'mongoose';
import FinanceTransaction from '../models/FinanceTransaction';
export declare function nextTxnCode(): Promise<string>;
export declare function nextInvoiceNo(): Promise<string>;
export declare function createIncomeFromPayment(opts: {
    paymentId: string;
    studentId: string;
    amount: number;
    method: string;
    sourceType: 'subscription_payment' | 'exam_payment' | 'service_sale' | 'manual_income';
    accountCode: string;
    categoryLabel: string;
    description: string;
    adminId: string;
    planId?: string;
    examId?: string;
    serviceId?: string;
    paidAtUTC?: Date;
}): Promise<typeof FinanceTransaction.prototype>;
export declare function getFinanceSummary(month?: string): Promise<{
    month: string;
    incomeTotal: any;
    expenseTotal: any;
    netProfit: number;
    subscriptionRevenue: number;
    examRevenue: number;
    manualRevenue: number;
    manualServiceRevenue: number;
    refundTotal: number;
    prevMonthIncome: any;
    prevMonthExpense: any;
    monthOverMonthChange: {
        incomeChange: number;
        expenseChange: number;
    };
    receivablesTotal: any;
    receivablesCount: any;
    payablesTotal: any;
    payablesCount: any;
    activeBudgetUsagePercent: number;
    topIncomeSources: {
        category: any;
        total: any;
    }[];
    topExpenseCategories: {
        category: any;
        total: any;
    }[];
    incomeBySource: {
        source: any;
        total: any;
    }[];
    expenseByCategory: {
        category: any;
        total: any;
    }[];
    dailyCashflowTrend: {
        net: number;
        income: number;
        expense: number;
        date: string;
    }[];
    budgetStatus: {
        _id: mongoose.Types.ObjectId;
        month: string;
        accountCode: string;
        categoryLabel: string;
        direction: "income" | "expense";
        amountLimit: number;
        spent: any;
        percentUsed: number;
        alertThresholdPercent: number;
        exceeded: boolean;
    }[];
    recentActivity: {
        _id: string;
        type: string;
        description: any;
        amount: any;
        timestamp: any;
    }[];
}>;
export declare function executeRecurringRule(ruleId: string, adminId: string): Promise<mongoose.Document<unknown, {}, import("../models/FinanceTransaction").IFinanceTransaction, {}, {}> & import("../models/FinanceTransaction").IFinanceTransaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function processDueRecurringRules(): Promise<number>;
export declare function logFinanceAudit(opts: {
    actorId: string;
    action: string;
    targetType: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ip?: string;
    beforeSnapshot?: Record<string, unknown>;
    afterSnapshot?: Record<string, unknown>;
}): Promise<void>;
export declare function seedDefaultChartOfAccounts(): Promise<void>;
export declare function getOrCreateFinanceSettings(): Promise<mongoose.Document<unknown, {}, import("../models/FinanceSettings").IFinanceSettings, {}, {}> & import("../models/FinanceSettings").IFinanceSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
export declare function nextRefundCode(): Promise<string>;
export declare function generatePLReportPDF(month: string): Promise<Buffer>;
//# sourceMappingURL=financeCenterService.d.ts.map