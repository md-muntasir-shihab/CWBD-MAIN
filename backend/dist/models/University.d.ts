import mongoose, { Document } from 'mongoose';
export interface IExamCenter {
    city: string;
    address: string;
}
interface IUnit {
    name: string;
    seats: number;
    examDates: Date[];
    applicationStart: Date;
    applicationEnd: Date;
    examCenters: IExamCenter[];
    notes?: string;
}
export interface IUniversity extends Document {
    name: string;
    shortForm: string;
    category: string;
    categoryId?: mongoose.Types.ObjectId | null;
    established: number;
    establishedYear?: number;
    address: string;
    contactNumber: string;
    email: string;
    website: string;
    websiteUrl?: string;
    admissionWebsite: string;
    admissionUrl?: string;
    totalSeats: string;
    scienceSeats: string;
    seatsScienceEng?: string;
    artsSeats: string;
    seatsArtsHum?: string;
    businessSeats: string;
    seatsBusiness?: string;
    shortDescription: string;
    description?: string;
    logoUrl?: string;
    clusterId?: mongoose.Types.ObjectId | null;
    clusterGroup?: string;
    clusterName?: string;
    clusterCount?: number;
    clusterDateOverrides?: {
        applicationStartDate?: Date | null;
        applicationEndDate?: Date | null;
        scienceExamDate?: string;
        artsExamDate?: string;
        businessExamDate?: string;
    };
    clusterSyncLocked?: boolean;
    categorySyncLocked?: boolean;
    applicationStartDate?: Date;
    applicationEndDate?: Date;
    scienceExamDate?: string;
    examDateScience?: string;
    artsExamDate?: string;
    examDateArts?: string;
    businessExamDate?: string;
    examDateBusiness?: string;
    units: IUnit[];
    examCenters: IExamCenter[];
    socialLinks: {
        platform: string;
        url: string;
        icon?: string;
    }[];
    unitLayout: 'compact' | 'stacked' | 'carousel';
    isActive: boolean;
    featured?: boolean;
    featuredOrder?: number;
    verificationStatus?: string;
    remarks?: string;
    isArchived?: boolean;
    archivedAt?: Date | null;
    archivedBy?: mongoose.Types.ObjectId | null;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUniversity, {}, {}, {}, mongoose.Document<unknown, {}, IUniversity, {}, {}> & IUniversity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=University.d.ts.map