import { Schema } from "mongoose";
export declare const AuditLogModel: import("mongoose").Model<{
    action: string;
    targetId: string;
    targetType: string;
    beforeAfterDiff: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
    actorId?: string | null | undefined;
    createdAt: NativeDate;
}, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    action: string;
    targetId: string;
    targetType: string;
    beforeAfterDiff: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
    actorId?: string | null | undefined;
    createdAt: NativeDate;
}, {}, {
    timestamps: {
        createdAt: true;
        updatedAt: false;
    };
}> & {
    action: string;
    targetId: string;
    targetType: string;
    beforeAfterDiff: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
    actorId?: string | null | undefined;
    createdAt: NativeDate;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: true;
        updatedAt: false;
    };
}, {
    action: string;
    targetId: string;
    targetType: string;
    beforeAfterDiff: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
    actorId?: string | null | undefined;
    createdAt: NativeDate;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    action: string;
    targetId: string;
    targetType: string;
    beforeAfterDiff: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
    actorId?: string | null | undefined;
    createdAt: NativeDate;
}>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: {
        createdAt: true;
        updatedAt: false;
    };
}>> & import("mongoose").FlatRecord<{
    action: string;
    targetId: string;
    targetType: string;
    beforeAfterDiff: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
    actorId?: string | null | undefined;
    createdAt: NativeDate;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=auditLog.model.d.ts.map