"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextTxnCode = nextTxnCode;
exports.nextInvoiceNo = nextInvoiceNo;
exports.createIncomeFromPayment = createIncomeFromPayment;
exports.getFinanceSummary = getFinanceSummary;
exports.executeRecurringRule = executeRecurringRule;
exports.processDueRecurringRules = processDueRecurringRules;
exports.logFinanceAudit = logFinanceAudit;
exports.seedDefaultChartOfAccounts = seedDefaultChartOfAccounts;
exports.getOrCreateFinanceSettings = getOrCreateFinanceSettings;
exports.nextRefundCode = nextRefundCode;
exports.generatePLReportPDF = generatePLReportPDF;
const mongoose_1 = __importDefault(require("mongoose"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const FinanceTransaction_1 = __importDefault(require("../models/FinanceTransaction"));
const FinanceInvoice_1 = __importDefault(require("../models/FinanceInvoice"));
const FinanceBudget_1 = __importDefault(require("../models/FinanceBudget"));
const FinanceRecurringRule_1 = __importDefault(require("../models/FinanceRecurringRule"));
const FinanceSettings_1 = __importDefault(require("../models/FinanceSettings"));
const ChartOfAccounts_1 = __importDefault(require("../models/ChartOfAccounts"));
const FinanceRefund_1 = __importDefault(require("../models/FinanceRefund"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
// ── Counter for txnCode ─────────────────────────────────
let _txnCounter = null;
async function nextTxnCode() {
    if (_txnCounter === null) {
        const last = await FinanceTransaction_1.default.findOne({}, { txnCode: 1 })
            .sort({ createdAt: -1 })
            .lean();
        const match = last?.txnCode?.match(/CW-FIN-(\d+)/);
        _txnCounter = match ? parseInt(match[1], 10) : 0;
    }
    _txnCounter++;
    return `CW-FIN-${String(_txnCounter).padStart(6, '0')}`;
}
let _invCounter = null;
async function nextInvoiceNo() {
    if (_invCounter === null) {
        const last = await FinanceInvoice_1.default.findOne({}, { invoiceNo: 1 })
            .sort({ createdAt: -1 })
            .lean();
        const match = last?.invoiceNo?.match(/CW-INV-(\d+)/);
        _invCounter = match ? parseInt(match[1], 10) : 0;
    }
    _invCounter++;
    return `CW-INV-${String(_invCounter).padStart(6, '0')}`;
}
// ── Auto-link: payment → income transaction ─────────────
async function createIncomeFromPayment(opts) {
    const existing = await FinanceTransaction_1.default.findOne({
        sourceType: opts.sourceType,
        sourceId: opts.paymentId,
        isDeleted: false,
    }).lean();
    if (existing)
        return existing;
    const txnCode = await nextTxnCode();
    const txn = await FinanceTransaction_1.default.create({
        txnCode,
        direction: 'income',
        amount: opts.amount,
        currency: 'BDT',
        dateUTC: opts.paidAtUTC || new Date(),
        accountCode: opts.accountCode,
        categoryLabel: opts.categoryLabel,
        description: opts.description,
        status: 'paid',
        method: opts.method || 'manual',
        sourceType: opts.sourceType,
        sourceId: opts.paymentId,
        studentId: opts.studentId ? new mongoose_1.default.Types.ObjectId(opts.studentId) : undefined,
        planId: opts.planId ? new mongoose_1.default.Types.ObjectId(opts.planId) : undefined,
        examId: opts.examId ? new mongoose_1.default.Types.ObjectId(opts.examId) : undefined,
        serviceId: opts.serviceId ? new mongoose_1.default.Types.ObjectId(opts.serviceId) : undefined,
        paidAtUTC: opts.paidAtUTC || new Date(),
        createdByAdminId: new mongoose_1.default.Types.ObjectId(opts.adminId),
    });
    // If there is an unpaid invoice for this resource, mark it paid
    const invoiceFilter = {
        status: { $in: ['unpaid', 'partial'] },
        isDeleted: false,
    };
    if (opts.studentId)
        invoiceFilter.studentId = new mongoose_1.default.Types.ObjectId(opts.studentId);
    if (opts.planId)
        invoiceFilter.planId = new mongoose_1.default.Types.ObjectId(opts.planId);
    if (opts.examId)
        invoiceFilter.examId = new mongoose_1.default.Types.ObjectId(opts.examId);
    const invoice = await FinanceInvoice_1.default.findOne(invoiceFilter);
    if (invoice) {
        invoice.paidAmountBDT = (invoice.paidAmountBDT || 0) + opts.amount;
        if (invoice.paidAmountBDT >= invoice.amountBDT) {
            invoice.status = 'paid';
            invoice.paidAtUTC = new Date();
        }
        else {
            invoice.status = 'partial';
        }
        invoice.linkedTxnIds.push(txn._id);
        await invoice.save();
    }
    return txn;
}
// ── Finance Dashboard Summary ───────────────────────────
async function getFinanceSummary(month) {
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mon] = targetMonth.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));
    const dateFilter = { dateUTC: { $gte: startDate, $lte: endDate }, isDeleted: false };
    // Previous month for comparison
    const prevStart = new Date(Date.UTC(year, mon - 2, 1));
    const prevEnd = new Date(Date.UTC(year, mon - 1, 0, 23, 59, 59, 999));
    const prevDateFilter = { dateUTC: { $gte: prevStart, $lte: prevEnd }, isDeleted: false };
    const [incomeTxns, expenseTxns, receivables, payables, topIncome, topExpense, dailyCashflow, budgets, incomeBySourceAgg, expenseByCatAgg, prevIncome, prevExpense, recentActivity,] = await Promise.all([
        // Total income
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, direction: 'income', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        // Total expense
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, direction: 'expense', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        // Receivables (unpaid invoices)
        FinanceInvoice_1.default.aggregate([
            { $match: { status: { $in: ['unpaid', 'partial', 'overdue'] }, isDeleted: false } },
            { $group: { _id: null, total: { $sum: { $subtract: ['$amountBDT', '$paidAmountBDT'] } }, count: { $sum: 1 } } },
        ]),
        // Payables (pending expenses)
        FinanceTransaction_1.default.aggregate([
            { $match: { direction: 'expense', status: 'pending', isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        // Top income sources
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, direction: 'income', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: '$categoryLabel', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
        ]),
        // Top expense categories
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, direction: 'expense', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: '$categoryLabel', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
        ]),
        // Daily cashflow trend
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, status: { $in: ['paid', 'approved'] } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$dateUTC' } },
                        direction: '$direction',
                    },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.date': 1 } },
        ]),
        // Budget status
        FinanceBudget_1.default.find({ month: targetMonth }).lean(),
        // Income by sourceType
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, direction: 'income', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: '$sourceType', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
        ]),
        // Expense by category
        FinanceTransaction_1.default.aggregate([
            { $match: { ...dateFilter, direction: 'expense', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: '$categoryLabel', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
        ]),
        // Previous month income
        FinanceTransaction_1.default.aggregate([
            { $match: { ...prevDateFilter, direction: 'income', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Previous month expense
        FinanceTransaction_1.default.aggregate([
            { $match: { ...prevDateFilter, direction: 'expense', status: { $in: ['paid', 'approved'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Recent activity (last 10 transactions)
        FinanceTransaction_1.default.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('_id direction sourceType categoryLabel amount dateUTC description')
            .lean(),
    ]);
    const incomeTotal = incomeTxns[0]?.total || 0;
    const expenseTotal = expenseTxns[0]?.total || 0;
    const prevMonthIncome = prevIncome[0]?.total || 0;
    const prevMonthExpense = prevExpense[0]?.total || 0;
    // Revenue breakdowns by source type
    const sourceMap = {};
    for (const row of incomeBySourceAgg) {
        sourceMap[row._id || 'other'] = row.total;
    }
    // Compute budget status with actual spend
    const budgetStatus = await Promise.all(budgets.map(async (b) => {
        const actual = await FinanceTransaction_1.default.aggregate([
            {
                $match: {
                    ...dateFilter,
                    direction: b.direction,
                    accountCode: b.accountCode,
                    status: { $in: ['paid', 'approved'] },
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const spent = actual[0]?.total || 0;
        const pct = b.amountLimit > 0 ? Math.round((spent / b.amountLimit) * 100) : 0;
        return {
            _id: b._id,
            month: b.month,
            accountCode: b.accountCode,
            categoryLabel: b.categoryLabel,
            direction: b.direction,
            amountLimit: b.amountLimit,
            spent,
            percentUsed: pct,
            alertThresholdPercent: b.alertThresholdPercent,
            exceeded: pct >= b.alertThresholdPercent,
        };
    }));
    // Build daily cashflow map
    const dailyMap = {};
    for (const row of dailyCashflow) {
        const d = row._id.date;
        if (!dailyMap[d])
            dailyMap[d] = { income: 0, expense: 0 };
        dailyMap[d][row._id.direction] = row.total;
    }
    const dailyCashflowTrend = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, ...vals, net: vals.income - vals.expense }));
    // Compute month-over-month change percentages
    const incomeChange = prevMonthIncome > 0
        ? ((incomeTotal - prevMonthIncome) / prevMonthIncome) * 100
        : (incomeTotal > 0 ? 100 : 0);
    const expenseChange = prevMonthExpense > 0
        ? ((expenseTotal - prevMonthExpense) / prevMonthExpense) * 100
        : (expenseTotal > 0 ? 100 : 0);
    const manualServiceRevenue = sourceMap['manual_income'] || 0;
    return {
        month: targetMonth,
        incomeTotal,
        expenseTotal,
        netProfit: incomeTotal - expenseTotal,
        subscriptionRevenue: sourceMap['subscription_payment'] || 0,
        examRevenue: sourceMap['exam_payment'] || 0,
        manualRevenue: manualServiceRevenue,
        manualServiceRevenue,
        refundTotal: sourceMap['refund'] || 0,
        prevMonthIncome,
        prevMonthExpense,
        monthOverMonthChange: {
            incomeChange: Number.isFinite(incomeChange) ? incomeChange : 0,
            expenseChange: Number.isFinite(expenseChange) ? expenseChange : 0,
        },
        receivablesTotal: receivables[0]?.total || 0,
        receivablesCount: receivables[0]?.count || 0,
        payablesTotal: payables[0]?.total || 0,
        payablesCount: payables[0]?.count || 0,
        activeBudgetUsagePercent: budgetStatus.length > 0
            ? Math.round(budgetStatus.reduce((s, b) => s + b.percentUsed, 0) / budgetStatus.length)
            : 0,
        topIncomeSources: topIncome.map((r) => ({ category: r._id, total: r.total })),
        topExpenseCategories: topExpense.map((r) => ({ category: r._id, total: r.total })),
        incomeBySource: incomeBySourceAgg.map((r) => ({ source: r._id || 'Other', total: r.total })),
        expenseByCategory: expenseByCatAgg.map((r) => ({ category: r._id || 'Other', total: r.total })),
        dailyCashflowTrend,
        budgetStatus,
        recentActivity: recentActivity.map((t) => ({
            _id: String(t._id),
            type: t.direction,
            description: t.description || t.categoryLabel || '',
            amount: t.amount,
            timestamp: t.dateUTC || t.createdAt,
        })),
    };
}
// ── Recurring Rule Execution ────────────────────────────
async function executeRecurringRule(ruleId, adminId) {
    const rule = await FinanceRecurringRule_1.default.findById(ruleId);
    if (!rule || !rule.isActive)
        throw new Error('Rule not found or inactive');
    const txnCode = await nextTxnCode();
    const txn = await FinanceTransaction_1.default.create({
        txnCode,
        direction: rule.direction,
        amount: rule.amount,
        currency: rule.currency,
        dateUTC: new Date(),
        accountCode: rule.accountCode,
        categoryLabel: rule.categoryLabel,
        description: rule.description || `Recurring: ${rule.name}`,
        status: 'paid',
        method: rule.method || 'manual',
        tags: rule.tags || [],
        costCenterId: rule.costCenterId,
        vendorId: rule.vendorId,
        sourceType: rule.direction === 'expense' ? 'expense' : 'manual_income',
        sourceId: String(rule._id),
        createdByAdminId: new mongoose_1.default.Types.ObjectId(adminId),
        paidAtUTC: new Date(),
    });
    // Update next run
    const nextRun = computeNextRun(rule.frequency, rule.dayOfMonth, rule.intervalDays);
    rule.lastRunAtUTC = new Date();
    rule.lastCreatedTxnId = txn._id;
    rule.nextRunAtUTC = nextRun;
    if (rule.endAtUTC && nextRun > rule.endAtUTC) {
        rule.isActive = false;
    }
    await rule.save();
    return txn;
}
function computeNextRun(frequency, dayOfMonth, intervalDays) {
    const now = new Date();
    switch (frequency) {
        case 'weekly':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'yearly':
            return new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()));
        case 'custom':
            return new Date(now.getTime() + (intervalDays || 30) * 24 * 60 * 60 * 1000);
        case 'monthly':
        default: {
            const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth || 1));
            return nextMonth;
        }
    }
}
// ── Process Due Recurring Rules ─────────────────────────
async function processDueRecurringRules() {
    const dueRules = await FinanceRecurringRule_1.default.find({
        isActive: true,
        nextRunAtUTC: { $lte: new Date() },
        $or: [{ endAtUTC: null }, { endAtUTC: { $gte: new Date() } }],
    }).lean();
    let processed = 0;
    for (const rule of dueRules) {
        try {
            await executeRecurringRule(String(rule._id), String(rule.createdByAdminId));
            processed++;
        }
        catch (err) {
            console.error(`[finance-recurring] Failed to process rule ${rule._id}:`, err);
        }
    }
    return processed;
}
// ── Audit Logger ────────────────────────────────────────
async function logFinanceAudit(opts) {
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(opts.actorId),
        action: opts.action,
        target_type: opts.targetType,
        target_id: opts.targetId ? new mongoose_1.default.Types.ObjectId(opts.targetId) : undefined,
        details: {
            ...(opts.details || {}),
            ...(opts.beforeSnapshot ? { beforeSnapshot: opts.beforeSnapshot } : {}),
            ...(opts.afterSnapshot ? { afterSnapshot: opts.afterSnapshot } : {}),
        },
        ip_address: opts.ip,
        timestamp: new Date(),
    });
}
// ── Seed default COA if empty ───────────────────────────
async function seedDefaultChartOfAccounts() {
    const count = await ChartOfAccounts_1.default.countDocuments();
    if (count > 0)
        return;
    const defaults = [
        { code: 'REV_SUBSCRIPTION', name: 'Subscription Revenue', type: 'income', isSystem: true },
        { code: 'REV_EXAM', name: 'Exam Fee Revenue', type: 'income', isSystem: true },
        { code: 'REV_SERVICE', name: 'Service Revenue', type: 'income', isSystem: true },
        { code: 'REV_OTHER', name: 'Other Income', type: 'income', isSystem: true },
        { code: 'EXP_MARKETING', name: 'Marketing & Ads', type: 'expense', isSystem: true },
        { code: 'EXP_HOSTING', name: 'Hosting & Infrastructure', type: 'expense', isSystem: true },
        { code: 'EXP_SMS', name: 'SMS Costs', type: 'expense', isSystem: true },
        { code: 'EXP_EMAIL', name: 'Email Costs', type: 'expense', isSystem: true },
        { code: 'EXP_PAYROLL', name: 'Payroll & Staff', type: 'expense', isSystem: true },
        { code: 'EXP_TOOLS', name: 'Tools & Software', type: 'expense', isSystem: true },
        { code: 'EXP_OPERATIONS', name: 'Operations', type: 'expense', isSystem: true },
        { code: 'EXP_MISC', name: 'Miscellaneous', type: 'expense', isSystem: true },
    ];
    await ChartOfAccounts_1.default.insertMany(defaults.map((d) => ({ ...d, isActive: true })));
    console.log('[finance] Seeded default Chart of Accounts');
}
// ── Ensure single finance settings doc ──────────────────
async function getOrCreateFinanceSettings() {
    let settings = await FinanceSettings_1.default.findOne({ key: 'default' });
    if (!settings) {
        settings = await FinanceSettings_1.default.create({ key: 'default' });
    }
    return settings;
}
// ── Refund Code Counter ─────────────────────────────────
let _refundCounter = null;
async function nextRefundCode() {
    if (_refundCounter === null) {
        const last = await FinanceRefund_1.default.findOne({}, { refundCode: 1 })
            .sort({ createdAt: -1 })
            .lean();
        const match = last?.refundCode?.match(/CW-REF-(\d+)/);
        _refundCounter = match ? parseInt(match[1], 10) : 0;
    }
    _refundCounter++;
    return `CW-REF-${String(_refundCounter).padStart(6, '0')}`;
}
// ── P&L PDF Report ──────────────────────────────────────
async function generatePLReportPDF(month) {
    const summary = await getFinanceSummary(month);
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // Header
        doc.fontSize(20).text('CampusWay — Profit & Loss Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).text(`Month: ${summary.month}`, { align: 'center' });
        doc.moveDown(1);
        // Summary
        doc.fontSize(14).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Total Income:       ৳${summary.incomeTotal.toLocaleString()}`);
        doc.text(`Total Expense:      ৳${summary.expenseTotal.toLocaleString()}`);
        doc.text(`Net Profit/Loss:    ৳${summary.netProfit.toLocaleString()}`);
        doc.text(`Receivables:        ৳${summary.receivablesTotal.toLocaleString()} (${summary.receivablesCount} invoices)`);
        doc.text(`Payables:           ৳${summary.payablesTotal.toLocaleString()} (${summary.payablesCount} pending)`);
        doc.moveDown(1);
        // Top Income Sources
        doc.fontSize(14).text('Top Income Sources', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        if (summary.topIncomeSources.length === 0) {
            doc.text('No income recorded this month.');
        }
        else {
            for (const src of summary.topIncomeSources) {
                doc.text(`  • ${src.category || 'Uncategorized'}: ৳${src.total.toLocaleString()}`);
            }
        }
        doc.moveDown(1);
        // Top Expense Categories
        doc.fontSize(14).text('Top Expense Categories', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        if (summary.topExpenseCategories.length === 0) {
            doc.text('No expenses recorded this month.');
        }
        else {
            for (const cat of summary.topExpenseCategories) {
                doc.text(`  • ${cat.category || 'Uncategorized'}: ৳${cat.total.toLocaleString()}`);
            }
        }
        doc.moveDown(1);
        // Budget Status
        if (summary.budgetStatus.length > 0) {
            doc.fontSize(14).text('Budget Status', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11);
            for (const b of summary.budgetStatus) {
                const flag = b.exceeded ? ' ⚠️ OVER' : '';
                doc.text(`  • ${b.categoryLabel} (${b.accountCode}): ৳${b.spent.toLocaleString()} / ৳${b.amountLimit.toLocaleString()} (${b.percentUsed}%)${flag}`);
            }
            doc.moveDown(1);
        }
        // Footer
        doc.moveDown(2);
        doc.fontSize(9).fillColor('#888').text(`Generated on ${new Date().toISOString().slice(0, 16)} UTC — CampusWay Finance Center`, { align: 'center' });
        doc.end();
    });
}
//# sourceMappingURL=financeCenterService.js.map