import { Schema } from "mongoose";
export declare const NewsSettingsModel: import("mongoose").Model<{
    defaultBannerUrl: string;
    newsPageTitle: string;
    newsPageSubtitle: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: "both" | "rss_content" | "readability_scrape";
    workflow?: {
        defaultIncomingStatus: string;
        allowScheduling: boolean;
        autoExpireDays?: number | null | undefined;
    } | null | undefined;
    aiSettings?: {
        maxLength: number;
        enabled: boolean;
        language: "bn" | "en" | "mixed";
        apiKey: string;
        stylePreset: "standard" | "short" | "detailed";
        strictNoHallucination: boolean;
        duplicateSensitivity: "strict" | "medium" | "loose";
        customPrompt: string;
        apiProviderUrl: string;
    } | null | undefined;
    appearance?: {
        animationLevel: string;
        layoutMode: string;
        density: string;
        paginationMode: string;
        showWidgets?: {
            latest: boolean;
            trending: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        } | null | undefined;
    } | null | undefined;
    shareTemplates?: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    defaultBannerUrl: string;
    newsPageTitle: string;
    newsPageSubtitle: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: "both" | "rss_content" | "readability_scrape";
    workflow?: {
        defaultIncomingStatus: string;
        allowScheduling: boolean;
        autoExpireDays?: number | null | undefined;
    } | null | undefined;
    aiSettings?: {
        maxLength: number;
        enabled: boolean;
        language: "bn" | "en" | "mixed";
        apiKey: string;
        stylePreset: "standard" | "short" | "detailed";
        strictNoHallucination: boolean;
        duplicateSensitivity: "strict" | "medium" | "loose";
        customPrompt: string;
        apiProviderUrl: string;
    } | null | undefined;
    appearance?: {
        animationLevel: string;
        layoutMode: string;
        density: string;
        paginationMode: string;
        showWidgets?: {
            latest: boolean;
            trending: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        } | null | undefined;
    } | null | undefined;
    shareTemplates?: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    defaultBannerUrl: string;
    newsPageTitle: string;
    newsPageSubtitle: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: "both" | "rss_content" | "readability_scrape";
    workflow?: {
        defaultIncomingStatus: string;
        allowScheduling: boolean;
        autoExpireDays?: number | null | undefined;
    } | null | undefined;
    aiSettings?: {
        maxLength: number;
        enabled: boolean;
        language: "bn" | "en" | "mixed";
        apiKey: string;
        stylePreset: "standard" | "short" | "detailed";
        strictNoHallucination: boolean;
        duplicateSensitivity: "strict" | "medium" | "loose";
        customPrompt: string;
        apiProviderUrl: string;
    } | null | undefined;
    appearance?: {
        animationLevel: string;
        layoutMode: string;
        density: string;
        paginationMode: string;
        showWidgets?: {
            latest: boolean;
            trending: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        } | null | undefined;
    } | null | undefined;
    shareTemplates?: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    defaultBannerUrl: string;
    newsPageTitle: string;
    newsPageSubtitle: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: "both" | "rss_content" | "readability_scrape";
    workflow?: {
        defaultIncomingStatus: string;
        allowScheduling: boolean;
        autoExpireDays?: number | null | undefined;
    } | null | undefined;
    aiSettings?: {
        maxLength: number;
        enabled: boolean;
        language: "bn" | "en" | "mixed";
        apiKey: string;
        stylePreset: "standard" | "short" | "detailed";
        strictNoHallucination: boolean;
        duplicateSensitivity: "strict" | "medium" | "loose";
        customPrompt: string;
        apiProviderUrl: string;
    } | null | undefined;
    appearance?: {
        animationLevel: string;
        layoutMode: string;
        density: string;
        paginationMode: string;
        showWidgets?: {
            latest: boolean;
            trending: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        } | null | undefined;
    } | null | undefined;
    shareTemplates?: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    defaultBannerUrl: string;
    newsPageTitle: string;
    newsPageSubtitle: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: "both" | "rss_content" | "readability_scrape";
    workflow?: {
        defaultIncomingStatus: string;
        allowScheduling: boolean;
        autoExpireDays?: number | null | undefined;
    } | null | undefined;
    aiSettings?: {
        maxLength: number;
        enabled: boolean;
        language: "bn" | "en" | "mixed";
        apiKey: string;
        stylePreset: "standard" | "short" | "detailed";
        strictNoHallucination: boolean;
        duplicateSensitivity: "strict" | "medium" | "loose";
        customPrompt: string;
        apiProviderUrl: string;
    } | null | undefined;
    appearance?: {
        animationLevel: string;
        layoutMode: string;
        density: string;
        paginationMode: string;
        showWidgets?: {
            latest: boolean;
            trending: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        } | null | undefined;
    } | null | undefined;
    shareTemplates?: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
}>> & import("mongoose").FlatRecord<{
    defaultBannerUrl: string;
    newsPageTitle: string;
    newsPageSubtitle: string;
    defaultThumbUrl: string;
    defaultSourceIconUrl: string;
    fetchFullArticleEnabled: boolean;
    fullArticleFetchMode: "both" | "rss_content" | "readability_scrape";
    workflow?: {
        defaultIncomingStatus: string;
        allowScheduling: boolean;
        autoExpireDays?: number | null | undefined;
    } | null | undefined;
    aiSettings?: {
        maxLength: number;
        enabled: boolean;
        language: "bn" | "en" | "mixed";
        apiKey: string;
        stylePreset: "standard" | "short" | "detailed";
        strictNoHallucination: boolean;
        duplicateSensitivity: "strict" | "medium" | "loose";
        customPrompt: string;
        apiProviderUrl: string;
    } | null | undefined;
    appearance?: {
        animationLevel: string;
        layoutMode: string;
        density: string;
        paginationMode: string;
        showWidgets?: {
            latest: boolean;
            trending: boolean;
            sourceSidebar: boolean;
            tagChips: boolean;
            previewPanel: boolean;
            breakingTicker: boolean;
        } | null | undefined;
    } | null | undefined;
    shareTemplates?: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=newsSettings.model.d.ts.map