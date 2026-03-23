import { Schema } from "mongoose";
export declare const SubscriptionModel: import("mongoose").Model<{
    status: "active" | "suspended" | "pending" | "expired";
    planId: string;
    userId: string;
    notes?: string | null | undefined;
    expiresAtUTC?: NativeDate | null | undefined;
    startAtUTC?: NativeDate | null | undefined;
    paymentId?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    status: "active" | "suspended" | "pending" | "expired";
    planId: string;
    userId: string;
    notes?: string | null | undefined;
    expiresAtUTC?: NativeDate | null | undefined;
    startAtUTC?: NativeDate | null | undefined;
    paymentId?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    status: "active" | "suspended" | "pending" | "expired";
    planId: string;
    userId: string;
    notes?: string | null | undefined;
    expiresAtUTC?: NativeDate | null | undefined;
    startAtUTC?: NativeDate | null | undefined;
    paymentId?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    status: "active" | "suspended" | "pending" | "expired";
    planId: string;
    userId: string;
    notes?: string | null | undefined;
    expiresAtUTC?: NativeDate | null | undefined;
    startAtUTC?: NativeDate | null | undefined;
    paymentId?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    status: "active" | "suspended" | "pending" | "expired";
    planId: string;
    userId: string;
    notes?: string | null | undefined;
    expiresAtUTC?: NativeDate | null | undefined;
    startAtUTC?: NativeDate | null | undefined;
    paymentId?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
}>> & import("mongoose").FlatRecord<{
    status: "active" | "suspended" | "pending" | "expired";
    planId: string;
    userId: string;
    notes?: string | null | undefined;
    expiresAtUTC?: NativeDate | null | undefined;
    startAtUTC?: NativeDate | null | undefined;
    paymentId?: string | null | undefined;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=subscription.model.d.ts.map