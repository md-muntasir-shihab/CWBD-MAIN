import { Schema } from "mongoose";
export declare const UserModel: import("mongoose").Model<{
    username: string;
    role: "admin" | "moderator" | "editor" | "student" | "chairman";
    userId: string;
    passwordHash: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileScore: number;
    email?: string | null | undefined;
    department?: string | null | undefined;
    phone?: string | null | undefined;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    guardianPhone?: string | null | undefined;
    address?: string | null | undefined;
    sscBatch?: string | null | undefined;
    hscBatch?: string | null | undefined;
    collegeName?: string | null | undefined;
    collegeAddress?: string | null | undefined;
    dateOfBirth?: NativeDate | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {}, {}, import("mongoose").Document<unknown, {}, {
    username: string;
    role: "admin" | "moderator" | "editor" | "student" | "chairman";
    userId: string;
    passwordHash: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileScore: number;
    email?: string | null | undefined;
    department?: string | null | undefined;
    phone?: string | null | undefined;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    guardianPhone?: string | null | undefined;
    address?: string | null | undefined;
    sscBatch?: string | null | undefined;
    hscBatch?: string | null | undefined;
    collegeName?: string | null | undefined;
    collegeAddress?: string | null | undefined;
    dateOfBirth?: NativeDate | null | undefined;
} & import("mongoose").DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    username: string;
    role: "admin" | "moderator" | "editor" | "student" | "chairman";
    userId: string;
    passwordHash: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileScore: number;
    email?: string | null | undefined;
    department?: string | null | undefined;
    phone?: string | null | undefined;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    guardianPhone?: string | null | undefined;
    address?: string | null | undefined;
    sscBatch?: string | null | undefined;
    hscBatch?: string | null | undefined;
    collegeName?: string | null | undefined;
    collegeAddress?: string | null | undefined;
    dateOfBirth?: NativeDate | null | undefined;
} & import("mongoose").DefaultTimestampProps & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    username: string;
    role: "admin" | "moderator" | "editor" | "student" | "chairman";
    userId: string;
    passwordHash: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileScore: number;
    email?: string | null | undefined;
    department?: string | null | undefined;
    phone?: string | null | undefined;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    guardianPhone?: string | null | undefined;
    address?: string | null | undefined;
    sscBatch?: string | null | undefined;
    hscBatch?: string | null | undefined;
    collegeName?: string | null | undefined;
    collegeAddress?: string | null | undefined;
    dateOfBirth?: NativeDate | null | undefined;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    username: string;
    role: "admin" | "moderator" | "editor" | "student" | "chairman";
    userId: string;
    passwordHash: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileScore: number;
    email?: string | null | undefined;
    department?: string | null | undefined;
    phone?: string | null | undefined;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    guardianPhone?: string | null | undefined;
    address?: string | null | undefined;
    sscBatch?: string | null | undefined;
    hscBatch?: string | null | undefined;
    collegeName?: string | null | undefined;
    collegeAddress?: string | null | undefined;
    dateOfBirth?: NativeDate | null | undefined;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
}>> & import("mongoose").FlatRecord<{
    username: string;
    role: "admin" | "moderator" | "editor" | "student" | "chairman";
    userId: string;
    passwordHash: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    profileScore: number;
    email?: string | null | undefined;
    department?: string | null | undefined;
    phone?: string | null | undefined;
    fullName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    guardianPhone?: string | null | undefined;
    address?: string | null | undefined;
    sscBatch?: string | null | undefined;
    hscBatch?: string | null | undefined;
    collegeName?: string | null | undefined;
    collegeAddress?: string | null | undefined;
    dateOfBirth?: NativeDate | null | undefined;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=user.model.d.ts.map