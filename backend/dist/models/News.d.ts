import mongoose, { Document } from 'mongoose';
export interface INews extends Document {
    title: string;
    slug: string;
    displayType?: 'news' | 'update';
    shortSummary?: string;
    shortDescription: string;
    fullContent?: string;
    content: string;
    coverImageUrl?: string;
    coverImageSource?: 'rss' | 'admin' | 'default';
    featuredImage?: string;
    coverImage?: string;
    category: string;
    tags: string[];
    isPublished: boolean;
    status: 'published' | 'draft' | 'archived' | 'pending_review' | 'duplicate_review' | 'approved' | 'rejected' | 'scheduled' | 'fetch_failed';
    sourceType?: 'manual' | 'rss' | 'ai_assisted';
    sourceId?: mongoose.Types.ObjectId;
    sourceName?: string;
    sourceIconUrl?: string;
    sourceUrl?: string;
    originalArticleUrl?: string;
    originalLink?: string;
    rssGuid?: string;
    rssPublishedAt?: Date;
    rssRawTitle?: string;
    rssRawDescription?: string;
    rssRawContent?: string;
    fetchedFullText?: boolean;
    fetchedFullTextAt?: Date;
    thumbnailImage?: string;
    fallbackBanner?: string;
    aiUsed?: boolean;
    aiSelected?: boolean;
    aiModel?: string;
    aiPromptVersion?: string;
    aiLanguage?: string;
    aiGeneratedAt?: Date;
    aiNotes?: string;
    aiMeta?: {
        provider?: string;
        model?: string;
        promptVersion?: string;
        confidence?: number;
        citations?: string[];
        noHallucinationPassed?: boolean;
        warning?: string;
    };
    aiEnrichment?: {
        shortSummary?: string;
        detailedExplanation?: string;
        studentFriendlyExplanation?: string;
        keyPoints?: string[];
        suggestedCategory?: string;
        suggestedTags?: string[];
        importanceHint?: 'low' | 'normal' | 'high' | 'urgent';
        suggestedAudience?: string;
        smsText?: string;
        emailSubject?: string;
        emailBody?: string;
        importantDates?: string[];
        confidence?: number;
        citations?: string[];
        provider?: string;
        model?: string;
        warning?: string;
    };
    reviewMeta?: {
        reviewerId?: mongoose.Types.ObjectId;
        reviewedAt?: Date;
        rejectReason?: string;
    };
    classification?: {
        primaryCategory?: string;
        tags?: string[];
        universityIds?: mongoose.Types.ObjectId[];
        clusterIds?: mongoose.Types.ObjectId[];
        groupIds?: mongoose.Types.ObjectId[];
    };
    priority?: 'normal' | 'priority' | 'breaking';
    isManual?: boolean;
    scheduledAt?: Date;
    scheduleAt?: Date;
    publishedAt?: Date;
    dedupe?: {
        hash?: string;
        duplicateScore?: number;
        duplicateOfNewsId?: mongoose.Types.ObjectId;
        duplicateFlag?: boolean;
    };
    duplicateKeyHash?: string;
    duplicateOfNewsId?: mongoose.Types.ObjectId;
    duplicateReasons?: string[];
    createdByAdminId?: mongoose.Types.ObjectId;
    approvedByAdminId?: mongoose.Types.ObjectId;
    shareMeta?: {
        canonicalUrl?: string;
        shortUrl?: string;
        templateId?: string;
    };
    publishOutcome?: {
        type?: 'news' | 'notice' | 'update';
        targetId?: string;
        publishedAt?: Date;
        publishedBy?: mongoose.Types.ObjectId;
    };
    deliveryMeta?: {
        lastJobId?: mongoose.Types.ObjectId;
        lastChannel?: 'sms' | 'email' | 'both';
        lastAudienceSummary?: string;
        lastSentAt?: Date;
    };
    appearanceOverrides?: {
        layoutMode?: 'rss_reader' | 'grid' | 'list';
        showSourceIcons?: boolean;
        showShareButtons?: boolean;
        animationLevel?: 'none' | 'subtle' | 'rich';
        cardDensity?: 'compact' | 'comfortable';
    };
    auditVersion?: number;
    isFeatured: boolean;
    publishDate: Date;
    createdBy?: mongoose.Types.ObjectId;
    seoTitle?: string;
    seoDescription?: string;
    views: number;
    shareCount?: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INews, {}, {}, {}, mongoose.Document<unknown, {}, INews, {}, {}> & INews & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=News.d.ts.map