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
const DEFAULT_CANONICAL_LOGO = '/uploads/logo-1773555868748-118876447.webp';
const DEFAULT_CANONICAL_FAVICON = '/uploads/favicon-1773555868749-501330119.webp';
const WebsiteSettingsSchema = new mongoose_1.Schema({
    websiteName: { type: String, default: 'CampusWay' },
    logo: { type: String, default: DEFAULT_CANONICAL_LOGO },
    favicon: { type: String, default: DEFAULT_CANONICAL_FAVICON },
    motto: { type: String, default: 'Your Admission Gateway' },
    metaTitle: { type: String, default: 'CampusWay - Admission Gateway' },
    metaDescription: { type: String, default: 'Prepare for university admissions with CampusWay.' },
    contactEmail: { type: String, default: 'support@campusway.com' },
    contactPhone: { type: String, default: '+8801234567890' },
    socialLinks: {
        facebook: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        messenger: { type: String, default: '' },
        telegram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
        instagram: { type: String, default: '' },
    },
    theme: {
        modeDefault: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        allowSystemMode: { type: Boolean, default: true },
        switchVariant: { type: String, enum: ['default', 'pro'], default: 'pro' },
        animationLevel: { type: String, enum: ['none', 'subtle', 'rich'], default: 'subtle' },
        brandGradients: {
            type: [String],
            default: [
                'linear-gradient(135deg,#0D5FDB 0%,#0EA5E9 55%,#22D3EE 100%)',
                'linear-gradient(135deg,#0891B2 0%,#2563EB 100%)',
            ],
        },
    },
    socialUi: {
        clusterEnabled: { type: Boolean, default: true },
        buttonVariant: { type: String, enum: ['default', 'squircle'], default: 'squircle' },
        showLabels: { type: Boolean, default: false },
        platformOrder: {
            type: [String],
            default: ['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'],
        },
    },
    pricingUi: {
        currencyCode: { type: String, default: 'BDT' },
        currencySymbol: { type: String, default: '\\u09F3' },
        currencyLocale: { type: String, default: 'bn-BD' },
        displayMode: { type: String, enum: ['symbol', 'code'], default: 'symbol' },
        thousandSeparator: { type: Boolean, default: true },
    },
    subscriptionPageTitle: { type: String, default: 'Subscription Plans' },
    subscriptionPageSubtitle: { type: String, default: 'Choose free or paid plans to unlock premium exam access.' },
    subscriptionDefaultBannerUrl: { type: String, default: '' },
    subscriptionLoggedOutCtaMode: { type: String, enum: ['login', 'contact'], default: 'contact' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('WebsiteSettings', WebsiteSettingsSchema);
//# sourceMappingURL=WebsiteSettings.js.map