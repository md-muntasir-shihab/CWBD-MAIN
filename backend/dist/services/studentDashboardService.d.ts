export type ExamCardStatus = 'upcoming' | 'live' | 'completed' | 'closed';
export interface DashboardExamCard {
    _id: string;
    title: string;
    universityNameBn: string;
    subject: string;
    subjectBn: string;
    examDateTime: string;
    startDate: string;
    endDate: string;
    duration: number;
    daysRemaining: number;
    examType: 'mcq_only' | 'written_optional';
    maxAttemptsAllowed: number;
    attemptsUsed: number;
    attemptsLeft: number;
    negativeMarking: boolean;
    negativeMarkValue: number;
    bannerImageUrl: string;
    logoUrl: string;
    groupName: string;
    shareUrl: string;
    totalParticipants: number;
    attemptedUsers: number;
    remainingUsers: number;
    activeUsers: number;
    statusBadge: 'upcoming' | 'live' | 'completed' | 'draft';
    subscriptionRequired?: boolean;
    subscriptionActive?: boolean;
    accessDeniedReason?: string;
    status: ExamCardStatus;
    canTakeExam: boolean;
    externalExamUrl: string;
}
export type StudentLiveAlertType = 'exam_soon' | 'application_closing' | 'payment_pending' | 'result_published';
export interface StudentLiveAlertItem {
    id: string;
    type: StudentLiveAlertType;
    title: string;
    message: string;
    dateIso: string;
    severity: 'info' | 'warning' | 'danger' | 'success';
    ctaLabel: string;
    ctaUrl: string;
}
export declare function getOverallRankForStudent(studentId: string): Promise<number | null>;
export declare function getStudentDashboardHeader(studentId: string): Promise<{
    userId: string;
    userUniqueId: string;
    name: string;
    email: string;
    profilePicture: {};
    profileCompletionPercentage: number;
    profileCompletionThreshold: number;
    isProfileEligible: boolean;
    overallRank: number | null;
    groupRank: number | null;
    welcomeMessage: string;
    subscription: {
        isActive: boolean;
        planId: string;
        planSlug: string;
        planCode: string;
        planName: string;
        expiryDate: string | null;
        daysLeft: number | null;
        ctaLabel: string;
        ctaUrl: string;
        ctaMode: string;
    };
    guardian_phone_verification_status: "pending" | "unverified" | "verified";
    guardian_phone_verified_at: string | Date | null;
    profile: {
        phone: string;
        guardian_phone: string;
        ssc_batch: string;
        hsc_batch: string;
        department: string;
        college_name: string;
        college_address: string;
        dob: string | Date | null;
    };
    missingFields: string[];
    config: {
        enableRealtime: boolean;
        enableDeviceLock: boolean;
        enableCheatFlags: boolean;
        enableBadges: boolean;
        enableProgressCharts: boolean;
        featuredOrderingMode: "manual" | "adaptive";
    };
    lastUpdatedAt: string;
}>;
export declare function getUpcomingExamCards(studentId: string): Promise<DashboardExamCard[]>;
export declare function getFeaturedUniversities(): Promise<{
    items: {
        _id: string;
        name: string;
        shortDescription: string;
        logoUrl: string;
        slug: string;
        featuredOrder: number;
        link: string;
    }[];
    lastUpdatedAt: string;
}>;
export declare function getStudentNotifications(studentId: string): Promise<{
    items: {
        _id: string;
        title: string;
        message: string;
        category: import("../models/Notification").NotificationCategory;
        publishAt: Date;
        expireAt: Date | null;
        linkUrl: string;
        attachmentUrl: string;
    }[];
    lastUpdatedAt: string;
}>;
export declare function getExamHistoryAndProgress(studentId: string): Promise<{
    history: {
        resultId: string;
        examId: string;
        examTitle: string;
        subject: string;
        obtainedMarks: number;
        totalMarks: number;
        percentage: number;
        rank: number | null;
        submittedAt: Date;
        attemptNo: number;
        status: {};
        writtenUploads: unknown[];
    }[];
    progress: {
        totalExams: number;
        avgScore: number;
        bestScore: number;
        weaknesses: {
            subject: string;
            avg: number;
        }[];
        chart: {
            x: number;
            label: string;
            percentage: number;
            submittedAt: Date;
        }[];
    };
    badges: {
        _id: string;
        code: string;
        title: string;
        description: string;
        iconUrl: string;
        awardedAt: Date;
        source: "auto" | "manual";
    }[];
    lastUpdatedAt: string;
}>;
export declare function getStudentDashboardAggregate(studentId: string): Promise<{
    header: {
        userId: string;
        userUniqueId: string;
        name: string;
        email: string;
        profilePicture: {};
        profileCompletionPercentage: number;
        profileCompletionThreshold: number;
        isProfileEligible: boolean;
        overallRank: number | null;
        groupRank: number | null;
        welcomeMessage: string;
        subscription: {
            isActive: boolean;
            planId: string;
            planSlug: string;
            planCode: string;
            planName: string;
            expiryDate: string | null;
            daysLeft: number | null;
            ctaLabel: string;
            ctaUrl: string;
            ctaMode: string;
        };
        guardian_phone_verification_status: "pending" | "unverified" | "verified";
        guardian_phone_verified_at: string | Date | null;
        profile: {
            phone: string;
            guardian_phone: string;
            ssc_batch: string;
            hsc_batch: string;
            department: string;
            college_name: string;
            college_address: string;
            dob: string | Date | null;
        };
        missingFields: string[];
        config: {
            enableRealtime: boolean;
            enableDeviceLock: boolean;
            enableCheatFlags: boolean;
            enableBadges: boolean;
            enableProgressCharts: boolean;
            featuredOrderingMode: "manual" | "adaptive";
        };
        lastUpdatedAt: string;
    };
    upcomingExams: DashboardExamCard[];
    featuredUniversities: {
        _id: string;
        name: string;
        shortDescription: string;
        logoUrl: string;
        slug: string;
        featuredOrder: number;
        link: string;
    }[];
    notifications: {
        _id: string;
        title: string;
        message: string;
        category: import("../models/Notification").NotificationCategory;
        publishAt: Date;
        expireAt: Date | null;
        linkUrl: string;
        attachmentUrl: string;
    }[];
    examHistory: {
        resultId: string;
        examId: string;
        examTitle: string;
        subject: string;
        obtainedMarks: number;
        totalMarks: number;
        percentage: number;
        rank: number | null;
        submittedAt: Date;
        attemptNo: number;
        status: {};
        writtenUploads: unknown[];
    }[];
    progress: {
        totalExams: number;
        avgScore: number;
        bestScore: number;
        weaknesses: {
            subject: string;
            avg: number;
        }[];
        chart: {
            x: number;
            label: string;
            percentage: number;
            submittedAt: Date;
        }[];
    };
    badges: {
        _id: string;
        code: string;
        title: string;
        description: string;
        iconUrl: string;
        awardedAt: Date;
        source: "auto" | "manual";
    }[];
    lastUpdatedAt: string;
}>;
export declare function getStudentLiveAlerts(studentId: string): Promise<{
    items: StudentLiveAlertItem[];
    lastUpdatedAt: string;
}>;
//# sourceMappingURL=studentDashboardService.d.ts.map