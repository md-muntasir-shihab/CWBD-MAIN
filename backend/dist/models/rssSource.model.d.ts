import { Schema, InferSchemaType } from "mongoose";
declare const rssSourceSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
}>> & import("mongoose").FlatRecord<{
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export type RssSource = InferSchemaType<typeof rssSourceSchema>;
export declare const RssSourceModel: import("mongoose").Model<{
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
}>> & import("mongoose").FlatRecord<{
    name: string;
    priority: number;
    enabled: boolean;
    rssUrl: string;
    siteUrl: string;
    iconType: "url" | "upload";
    fetchIntervalMinutes: number;
    categoryTags: string[];
    iconUrl?: string | null | undefined;
    lastFetchedAt?: NativeDate | null | undefined;
    lastError?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
export {};
//# sourceMappingURL=rssSource.model.d.ts.map