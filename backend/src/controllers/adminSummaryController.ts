import { Request, Response } from 'express';
import mongoose from 'mongoose';
import University from '../models/University';
import HomeSettings from '../models/HomeSettings';
import News from '../models/News';
import Exam from '../models/Exam';
import Question from '../models/Question';
import User from '../models/User';
import ManualPayment from '../models/ManualPayment';
import SupportTicket from '../models/SupportTicket';

export const adminGetDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const [
            totalUniversities,
            activeUniversities,
            featuredUniversities,
            homeSettings,
            pendingNews,
            publishedToday,
            liveExams,
            upcomingExams,
            totalQuestions,
            totalActiveStudents,
            suspendedStudents,
            pendingPaymentStudents,
            paidToday,
            unreadSupportTickets,
        ] = await Promise.all([
            University.countDocuments({}),
            University.countDocuments({ isActive: true, isArchived: { $ne: true } }),
            University.countDocuments({ featured: true }),
            HomeSettings.findOne().lean(),
            News.countDocuments({ status: { $in: ['pending_review', 'draft'] } }),
            News.countDocuments({ isPublished: true, publishDate: { $gte: startOfToday, $lt: endOfToday } }),
            Exam.countDocuments({ isPublished: true, status: 'live' }),
            Exam.countDocuments({ isPublished: true, status: 'scheduled' }),
            Question.countDocuments({}),
            User.countDocuments({ role: 'student', status: 'active' }),
            User.countDocuments({ role: 'student', status: 'suspended' }),
            User.countDocuments({ role: 'student', status: 'pending' }),
            ManualPayment.countDocuments({ date: { $gte: startOfToday, $lt: endOfToday } }),
            SupportTicket.countDocuments({
                $or: [
                    { unreadCountForAdmin: { $gt: 0 } },
                    {
                        unreadCountForAdmin: { $exists: false },
                        status: { $in: ['open', 'in_progress'] },
                    },
                ],
            }),
        ]);

        const highlightedCategories = Array.isArray(homeSettings?.highlightedCategories)
            ? homeSettings.highlightedCategories.filter((item: any) => item?.enabled !== false).length
            : 0;
        const featuredHomeUniversities = Array.isArray(homeSettings?.featuredUniversities)
            ? homeSettings.featuredUniversities.filter((item: any) => item?.enabled !== false).length
            : 0;
        const enabledSections = homeSettings?.sectionVisibility
            ? Object.values(homeSettings.sectionVisibility).filter(Boolean).length
            : 0;

        const dbStateMap: Record<number, 'down' | 'connected'> = {
            0: 'down',
            1: 'connected',
            2: 'down',
            3: 'down',
            99: 'down',
        };
        const db = dbStateMap[mongoose.connection.readyState] || 'down';

        res.json({
            universities: {
                total: totalUniversities,
                active: activeUniversities,
                featured: featuredUniversities,
            },
            home: {
                highlightedCategories,
                featuredUniversities: featuredHomeUniversities,
                enabledSections,
            },
            news: {
                pendingReview: pendingNews,
                publishedToday,
            },
            exams: {
                upcoming: upcomingExams,
                live: liveExams,
            },
            questionBank: {
                totalQuestions,
            },
            students: {
                totalActive: totalActiveStudents,
                pendingPayment: pendingPaymentStudents,
                suspended: suspendedStudents,
            },
            payments: {
                pendingApprovals: 0,
                paidToday,
            },
            supportCenter: {
                unreadMessages: unreadSupportTickets,
            },
            systemStatus: {
                db,
                timeUTC: now.toISOString(),
            },
        });
    } catch (error) {
        console.error('adminGetDashboardSummary error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

