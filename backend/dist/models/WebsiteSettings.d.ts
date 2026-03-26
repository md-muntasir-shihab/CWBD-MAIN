import mongoose, { Document } from 'mongoose';
export type StaticPageTone = 'neutral' | 'info' | 'success' | 'warning' | 'accent';
export interface StaticPageSectionConfig {
    title: string;
    body: string;
    bullets: string[];
    iconKey: string;
    tone: StaticPageTone;
    enabled: boolean;
    order: number;
}
export interface StaticFeatureCardConfig {
    title: string;
    description: string;
    iconKey: string;
    enabled: boolean;
    order: number;
}
export interface FounderContactLinkConfig {
    label: string;
    url: string;
}
export interface FounderProfileConfig {
    name: string;
    title: string;
    photoUrl: string;
    shortBio: string;
    contactLinks: FounderContactLinkConfig[];
    enabled: boolean;
    order: number;
}
export interface StaticPageConfig {
    eyebrow: string;
    title: string;
    subtitle: string;
    lastUpdatedLabel: string;
    sections: StaticPageSectionConfig[];
    backLinkLabel: string;
    backLinkUrl: string;
}
export interface AboutStaticPageConfig extends StaticPageConfig {
    featureCards: StaticFeatureCardConfig[];
    founderProfiles: FounderProfileConfig[];
}
export interface WebsiteStaticPagesConfig {
    about: AboutStaticPageConfig;
    terms: StaticPageConfig;
    privacy: StaticPageConfig;
}
export declare function createWebsiteStaticPagesDefaults(): WebsiteStaticPagesConfig;
export declare function normalizeWebsiteStaticPages(value: unknown, current?: Partial<WebsiteStaticPagesConfig> | null): WebsiteStaticPagesConfig;
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
    staticPages: WebsiteStaticPagesConfig;
}
declare const _default: mongoose.Model<IWebsiteSettings, {}, {}, {}, mongoose.Document<unknown, {}, IWebsiteSettings, {}, {}> & IWebsiteSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=WebsiteSettings.d.ts.map