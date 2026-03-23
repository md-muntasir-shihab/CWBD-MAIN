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
const faqItemSchema = new mongoose_1.Schema({
    question: { type: String, trim: true, default: '' },
    answer: { type: String, trim: true, default: '' },
}, { _id: false });
const comparisonRowSchema = new mongoose_1.Schema({
    key: { type: String, trim: true, default: '' },
    label: { type: String, trim: true, default: '' },
}, { _id: false });
const SubscriptionSettingsSchema = new mongoose_1.Schema({
    pageTitle: { type: String, default: 'Subscription Plans' },
    pageSubtitle: { type: String, default: 'Choose the right plan for your CampusWay journey.' },
    heroEyebrow: { type: String, default: 'CampusWay Memberships' },
    heroNote: { type: String, default: 'Premium access, clear comparisons, and one-click plan details.' },
    headerBannerUrl: { type: String, default: null },
    defaultPlanBannerUrl: { type: String, default: null },
    currencyLabel: { type: String, default: 'BDT' },
    showFeaturedFirst: { type: Boolean, default: true },
    allowFreePlans: { type: Boolean, default: true },
    comparisonEnabled: { type: Boolean, default: true },
    comparisonTitle: { type: String, default: 'Compare Plans' },
    comparisonSubtitle: { type: String, default: 'See what changes as you upgrade.' },
    comparisonRows: {
        type: [comparisonRowSchema],
        default: () => ([
            { key: 'allowsExams', label: 'Exam Access' },
            { key: 'allowsPremiumResources', label: 'Premium Resources' },
            { key: 'allowsSMSUpdates', label: 'SMS Updates' },
            { key: 'allowsEmailUpdates', label: 'Email Updates' },
            { key: 'allowsGuardianAlerts', label: 'Guardian Alerts' },
            { key: 'supportLevel', label: 'Support Level' },
        ]),
    },
    pageFaqEnabled: { type: Boolean, default: true },
    pageFaqTitle: { type: String, default: 'Frequently Asked Questions' },
    pageFaqItems: {
        type: [faqItemSchema],
        default: () => ([
            {
                question: 'How do I activate a paid plan?',
                answer: 'Choose your plan, continue to the subscription action screen, and follow the provided payment or contact flow.',
            },
            {
                question: 'When does plan validity begin?',
                answer: 'Validity begins when the plan is activated by CampusWay and continues for the configured duration.',
            },
        ]),
    },
    sectionToggles: {
        detailsDrawer: { type: Boolean, default: true },
        comparisonTable: { type: Boolean, default: true },
        faqBlock: { type: Boolean, default: true },
        homePreview: { type: Boolean, default: true },
    },
    defaultCtaMode: { type: String, enum: ['contact', 'request_payment', 'internal', 'external'], default: 'contact' },
    lastEditedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
SubscriptionSettingsSchema.index({ updatedAt: -1 });
exports.default = mongoose_1.default.model('SubscriptionSettings', SubscriptionSettingsSchema);
//# sourceMappingURL=SubscriptionSettings.js.map