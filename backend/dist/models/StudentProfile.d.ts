import mongoose, { Document } from 'mongoose';
export interface IStudentProfile extends Document {
    user_id: mongoose.Types.ObjectId;
    user_unique_id: string;
    full_name: string;
    guardian_name?: string;
    username?: string;
    email?: string;
    profile_photo_url?: string;
    phone?: string;
    phone_number?: string;
    guardian_phone?: string;
    guardian_email?: string;
    guardianOtpHash?: string;
    guardianOtpExpiresAt?: Date;
    guardianPhoneVerifiedAt?: Date;
    guardianPhoneVerificationStatus?: 'unverified' | 'pending' | 'verified';
    roll_number?: string;
    registration_id?: string;
    institution_name?: string;
    dob?: Date;
    gender?: 'male' | 'female' | 'other';
    department?: 'science' | 'arts' | 'commerce';
    ssc_batch?: string;
    hsc_batch?: string;
    admittedAt?: Date | null;
    groupIds?: mongoose.Types.ObjectId[];
    college_name?: string;
    college_address?: string;
    present_address?: string;
    permanent_address?: string;
    district?: string;
    country?: string;
    profile_completion_percentage: number;
    points: number;
    rank?: number;
    examIdentity?: Record<string, unknown>;
    examHistory?: Array<Record<string, unknown>>;
    latestExamResultSummary?: string;
    examDataLastSyncAt?: Date | null;
    examDataLastSyncSource?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IStudentProfile, {}, {}, {}, mongoose.Document<unknown, {}, IStudentProfile, {}, {}> & IStudentProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StudentProfile.d.ts.map