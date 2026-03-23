import mongoose, { Document } from 'mongoose';
export interface ISubscriptionSettingsFaqItem {
    question: string;
    answer: string;
}
export interface ISubscriptionSettingsComparisonRow {
    key: string;
    label: string;
}
export interface ISubscriptionSettings extends Document {
    pageTitle: string;
    pageSubtitle: string;
    heroEyebrow: string;
    heroNote: string;
    headerBannerUrl: string | null;
    defaultPlanBannerUrl: string | null;
    currencyLabel: string;
    showFeaturedFirst: boolean;
    allowFreePlans: boolean;
    comparisonEnabled: boolean;
    comparisonTitle: string;
    comparisonSubtitle: string;
    comparisonRows: ISubscriptionSettingsComparisonRow[];
    pageFaqEnabled: boolean;
    pageFaqTitle: string;
    pageFaqItems: ISubscriptionSettingsFaqItem[];
    sectionToggles: {
        detailsDrawer: boolean;
        comparisonTable: boolean;
        faqBlock: boolean;
        homePreview: boolean;
    };
    defaultCtaMode: 'contact' | 'request_payment' | 'internal' | 'external';
    lastEditedByAdminId: mongoose.Types.ObjectId | null;
    updatedAt: Date;
    createdAt: Date;
}
declare const _default: mongoose.Model<ISubscriptionSettings, {}, {}, {}, mongoose.Document<unknown, {}, ISubscriptionSettings, {}, {}> & ISubscriptionSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SubscriptionSettings.d.ts.map