import mongoose, { Schema, Document } from 'mongoose';

const DEFAULT_CANONICAL_LOGO = '/uploads/logo-1773555868748-118876447.webp';
const DEFAULT_CANONICAL_FAVICON = '/uploads/favicon-1773555868749-501330119.webp';

export interface IWebsiteSettings extends Document {
    websiteName: string;
    logo: string;
    favicon: string;
    motto: string;
    metaTitle: string;
    metaDescription: string;
    contactEmail: string;
    contactPhone: string;
    socialLinks: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
        twitter: string;
        youtube: string;
        instagram: string;
    };
    theme: {
        modeDefault: 'light' | 'dark' | 'system';
        allowSystemMode: boolean;
        switchVariant: 'default' | 'pro';
        animationLevel: 'none' | 'subtle' | 'rich';
        brandGradients: string[];
    };
    socialUi: {
        clusterEnabled: boolean;
        buttonVariant: 'default' | 'squircle';
        showLabels: boolean;
        platformOrder: Array<'facebook' | 'whatsapp' | 'messenger' | 'telegram' | 'twitter' | 'youtube' | 'instagram'>;
    };
    pricingUi: {
        currencyCode: string;
        currencySymbol: string;
        currencyLocale: string;
        displayMode: 'symbol' | 'code';
        thousandSeparator: boolean;
    };
    subscriptionPageTitle: string;
    subscriptionPageSubtitle: string;
    subscriptionDefaultBannerUrl: string;
    subscriptionLoggedOutCtaMode: 'login' | 'contact';
}

const WebsiteSettingsSchema = new Schema<IWebsiteSettings>({
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

export default mongoose.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsSchema);

