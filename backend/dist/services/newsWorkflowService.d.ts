export declare const approveAndPublishNow: (id: string, actorId?: string) => Promise<(import("mongoose").Document<unknown, {}, {
    status: "draft" | "published" | "pending_review" | "duplicate_review" | "rejected" | "scheduled";
    title: string;
    category: string;
    slug: string;
    tags: string[];
    shortSummary: string;
    fullContent: string;
    sourceName: string;
    sourceUrl: string;
    originalArticleUrl: string;
    rssRawTitle: string;
    rssRawDescription: string;
    rssRawContent: string;
    fetchedFullText: boolean;
    duplicateReasons: string[];
    coverSource: "admin" | "default" | "rss";
    isAiGenerated: boolean;
    isManuallyCreated: boolean;
    publishedAt?: NativeDate | null | undefined;
    sourceId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    coverImageUrl?: string | null | undefined;
    rssGuid?: string | null | undefined;
    rssPublishedAt?: NativeDate | null | undefined;
    fetchedFullTextAt?: NativeDate | null | undefined;
    aiNotes?: string | null | undefined;
    scheduledAt?: NativeDate | null | undefined;
    duplicateKeyHash?: string | null | undefined;
    duplicateOfNewsId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    createdByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    approvedByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    status: "draft" | "published" | "pending_review" | "duplicate_review" | "rejected" | "scheduled";
    title: string;
    category: string;
    slug: string;
    tags: string[];
    shortSummary: string;
    fullContent: string;
    sourceName: string;
    sourceUrl: string;
    originalArticleUrl: string;
    rssRawTitle: string;
    rssRawDescription: string;
    rssRawContent: string;
    fetchedFullText: boolean;
    duplicateReasons: string[];
    coverSource: "admin" | "default" | "rss";
    isAiGenerated: boolean;
    isManuallyCreated: boolean;
    publishedAt?: NativeDate | null | undefined;
    sourceId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    coverImageUrl?: string | null | undefined;
    rssGuid?: string | null | undefined;
    rssPublishedAt?: NativeDate | null | undefined;
    fetchedFullTextAt?: NativeDate | null | undefined;
    aiNotes?: string | null | undefined;
    scheduledAt?: NativeDate | null | undefined;
    duplicateKeyHash?: string | null | undefined;
    duplicateOfNewsId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    createdByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    approvedByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}) | null>;
export declare const scheduleNews: (id: string, when: Date, actorId?: string) => Promise<(import("mongoose").Document<unknown, {}, {
    status: "draft" | "published" | "pending_review" | "duplicate_review" | "rejected" | "scheduled";
    title: string;
    category: string;
    slug: string;
    tags: string[];
    shortSummary: string;
    fullContent: string;
    sourceName: string;
    sourceUrl: string;
    originalArticleUrl: string;
    rssRawTitle: string;
    rssRawDescription: string;
    rssRawContent: string;
    fetchedFullText: boolean;
    duplicateReasons: string[];
    coverSource: "admin" | "default" | "rss";
    isAiGenerated: boolean;
    isManuallyCreated: boolean;
    publishedAt?: NativeDate | null | undefined;
    sourceId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    coverImageUrl?: string | null | undefined;
    rssGuid?: string | null | undefined;
    rssPublishedAt?: NativeDate | null | undefined;
    fetchedFullTextAt?: NativeDate | null | undefined;
    aiNotes?: string | null | undefined;
    scheduledAt?: NativeDate | null | undefined;
    duplicateKeyHash?: string | null | undefined;
    duplicateOfNewsId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    createdByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    approvedByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    status: "draft" | "published" | "pending_review" | "duplicate_review" | "rejected" | "scheduled";
    title: string;
    category: string;
    slug: string;
    tags: string[];
    shortSummary: string;
    fullContent: string;
    sourceName: string;
    sourceUrl: string;
    originalArticleUrl: string;
    rssRawTitle: string;
    rssRawDescription: string;
    rssRawContent: string;
    fetchedFullText: boolean;
    duplicateReasons: string[];
    coverSource: "admin" | "default" | "rss";
    isAiGenerated: boolean;
    isManuallyCreated: boolean;
    publishedAt?: NativeDate | null | undefined;
    sourceId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    coverImageUrl?: string | null | undefined;
    rssGuid?: string | null | undefined;
    rssPublishedAt?: NativeDate | null | undefined;
    fetchedFullTextAt?: NativeDate | null | undefined;
    aiNotes?: string | null | undefined;
    scheduledAt?: NativeDate | null | undefined;
    duplicateKeyHash?: string | null | undefined;
    duplicateOfNewsId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    createdByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    approvedByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}) | null>;
export declare const rejectNews: (id: string, actorId?: string) => Promise<(import("mongoose").Document<unknown, {}, {
    status: "draft" | "published" | "pending_review" | "duplicate_review" | "rejected" | "scheduled";
    title: string;
    category: string;
    slug: string;
    tags: string[];
    shortSummary: string;
    fullContent: string;
    sourceName: string;
    sourceUrl: string;
    originalArticleUrl: string;
    rssRawTitle: string;
    rssRawDescription: string;
    rssRawContent: string;
    fetchedFullText: boolean;
    duplicateReasons: string[];
    coverSource: "admin" | "default" | "rss";
    isAiGenerated: boolean;
    isManuallyCreated: boolean;
    publishedAt?: NativeDate | null | undefined;
    sourceId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    coverImageUrl?: string | null | undefined;
    rssGuid?: string | null | undefined;
    rssPublishedAt?: NativeDate | null | undefined;
    fetchedFullTextAt?: NativeDate | null | undefined;
    aiNotes?: string | null | undefined;
    scheduledAt?: NativeDate | null | undefined;
    duplicateKeyHash?: string | null | undefined;
    duplicateOfNewsId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    createdByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    approvedByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    status: "draft" | "published" | "pending_review" | "duplicate_review" | "rejected" | "scheduled";
    title: string;
    category: string;
    slug: string;
    tags: string[];
    shortSummary: string;
    fullContent: string;
    sourceName: string;
    sourceUrl: string;
    originalArticleUrl: string;
    rssRawTitle: string;
    rssRawDescription: string;
    rssRawContent: string;
    fetchedFullText: boolean;
    duplicateReasons: string[];
    coverSource: "admin" | "default" | "rss";
    isAiGenerated: boolean;
    isManuallyCreated: boolean;
    publishedAt?: NativeDate | null | undefined;
    sourceId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    coverImageUrl?: string | null | undefined;
    rssGuid?: string | null | undefined;
    rssPublishedAt?: NativeDate | null | undefined;
    fetchedFullTextAt?: NativeDate | null | undefined;
    aiNotes?: string | null | undefined;
    scheduledAt?: NativeDate | null | undefined;
    duplicateKeyHash?: string | null | undefined;
    duplicateOfNewsId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    createdByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
    approvedByAdminId?: {
        prototype?: import("mongoose").Types.ObjectId | null | undefined;
        cacheHexString?: unknown;
        generate?: {} | null | undefined;
        createFromTime?: {} | null | undefined;
        createFromHexString?: {} | null | undefined;
        createFromBase64?: {} | null | undefined;
        isValid?: {} | null | undefined;
    } | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}) | null>;
//# sourceMappingURL=newsWorkflowService.d.ts.map