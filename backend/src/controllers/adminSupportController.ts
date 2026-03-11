import { Response } from 'express';
import mongoose from 'mongoose';
import AnnouncementNotice from '../models/AnnouncementNotice';
import AuditLog from '../models/AuditLog';
import Notification from '../models/Notification';
import StudentProfile from '../models/StudentProfile';
import SupportTicket from '../models/SupportTicket';
import { AuthRequest } from '../middlewares/auth';
import { broadcastStudentDashboardEvent } from '../realtime/studentDashboardStream';
import { createAdminAlert, createStudentNotification } from '../services/adminAlertService';
import { getClientIp } from '../utils/requestMeta';

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function parsePage(query: Record<string, unknown>): { page: number; limit: number; skip: number } {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(200, Number(query.limit || 20)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

async function createAudit(req: AuthRequest, action: string, details?: Record<string, unknown>): Promise<void> {
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) return;
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'communication',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

function normalizePriority(raw: unknown): 'low' | 'medium' | 'high' | 'urgent' {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'low' || value === 'medium' || value === 'high' || value === 'urgent') return value;
    return 'medium';
}

function normalizeStatus(raw: unknown): 'open' | 'in_progress' | 'resolved' | 'closed' {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'open' || value === 'in_progress' || value === 'resolved' || value === 'closed') return value;
    return 'open';
}

function toObjectIdList(values: string[]): mongoose.Types.ObjectId[] {
    const unique = new Set<string>();
    const output: mongoose.Types.ObjectId[] = [];
    for (const value of values) {
        const cleaned = String(value || '').trim();
        if (!mongoose.Types.ObjectId.isValid(cleaned)) continue;
        if (unique.has(cleaned)) continue;
        unique.add(cleaned);
        output.push(new mongoose.Types.ObjectId(cleaned));
    }
    return output;
}

async function resolveNoticeTargetUserIds(
    target: 'all' | 'groups' | 'students',
    targetIds: string[],
): Promise<mongoose.Types.ObjectId[]> {
    if (target === 'all') return [];
    if (target === 'students') {
        return toObjectIdList(targetIds);
    }

    const groupIds = toObjectIdList(targetIds);
    if (groupIds.length === 0) return [];

    const profiles = await StudentProfile.find({ groupIds: { $in: groupIds } })
        .select('user_id')
        .lean();

    const userIds = profiles.map((profile) => String(profile.user_id || '')).filter(Boolean);
    return toObjectIdList(userIds);
}

async function generateTicketNo(): Promise<string> {
    const date = new Date();
    const ymd = `${date.getUTCFullYear()}${`${date.getUTCMonth() + 1}`.padStart(2, '0')}${`${date.getUTCDate()}`.padStart(2, '0')}`;
    const count = await SupportTicket.countDocuments({
        createdAt: {
            $gte: new Date(`${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, '0')}-${`${date.getUTCDate()}`.padStart(2, '0')}T00:00:00.000Z`),
        },
    });
    return `TKT-${ymd}-${String(count + 1).padStart(4, '0')}`;
}

async function notifyAdminsForTicket(ticket: { _id: unknown; ticketNo: string; subject: string }, action: 'created' | 'student_reply'): Promise<void> {
    const actionLabel = action === 'created' ? 'New support ticket' : 'New student reply';
    await createAdminAlert({
        title: actionLabel,
        message: `${ticket.ticketNo}: ${ticket.subject}`,
        linkUrl: `/__cw_admin__/support-center?ticketId=${String(ticket._id)}`,
        category: 'update',
        targetRole: 'admin',
    });
}

async function notifyStudentForTicket(
    studentId: unknown,
    ticket: { _id: unknown; ticketNo: string; subject: string },
    title: string,
    message: string,
): Promise<void> {
    const targetStudentId = asObjectId(studentId);
    if (!targetStudentId) return;

    await createStudentNotification({
        title,
        message: `${ticket.ticketNo}: ${message || ticket.subject}`,
        linkUrl: `/support/${String(ticket._id)}`,
        category: 'update',
        targetUserIds: [targetStudentId],
    });
}

export async function adminGetNotices(req: AuthRequest, res: Response): Promise<void> {
    try {
        const query = req.query as Record<string, unknown>;
        const { page, limit, skip } = parsePage(query);

        const filter: Record<string, unknown> = {};
        const target = String(query.target || '').trim();
        if (target) filter.target = target;

        const status = String(query.status || '').trim().toLowerCase();
        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;

        const [items, total] = await Promise.all([
            AnnouncementNotice.find(filter)
                .populate('createdBy', 'username full_name role')
                .sort({ startAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AnnouncementNotice.countDocuments(filter),
        ]);

        res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
        console.error('adminGetNotices error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminCreateNotice(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const body = req.body as Record<string, unknown>;
        const title = String(body.title || '').trim();
        const message = String(body.message || '').trim();
        if (!title || !message) {
            res.status(400).json({ message: 'title and message are required' });
            return;
        }

        const targetRaw = String(body.target || 'all').trim();
        const target = targetRaw === 'groups' || targetRaw === 'students' ? targetRaw : 'all';

        const createdBy = asObjectId(req.user._id);
        if (!createdBy) {
            res.status(400).json({ message: 'Invalid actor id' });
            return;
        }

        const notice = await AnnouncementNotice.create({
            title,
            message,
            target,
            targetIds: Array.isArray(body.targetIds) ? body.targetIds.map((item) => String(item).trim()).filter(Boolean) : [],
            startAt: body.startAt ? new Date(String(body.startAt)) : new Date(),
            endAt: body.endAt ? new Date(String(body.endAt)) : null,
            isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
            createdBy,
        });

        const reminderKey = `notice:${String(notice._id)}`;
        const targetUserIds = await resolveNoticeTargetUserIds(target, notice.targetIds || []);
        await Notification.updateOne(
            { reminderKey },
            {
                $set: {
                    title,
                    message,
                    category: 'general',
                    publishAt: notice.startAt,
                    expireAt: notice.endAt || null,
                    isActive: notice.isActive,
                    linkUrl: '/support',
                    attachmentUrl: '',
                    targetRole: 'student',
                    targetUserIds,
                    createdBy,
                    updatedBy: createdBy,
                },
                $setOnInsert: { reminderKey },
            },
            { upsert: true }
        );
        broadcastStudentDashboardEvent({
            type: 'notification_updated',
            meta: { action: 'create', source: 'notice', noticeId: String(notice._id) },
        });

        await createAudit(req, 'notice_created', {
            noticeId: String(notice._id),
            target,
            targetIdsCount: Array.isArray(notice.targetIds) ? notice.targetIds.length : 0,
        });

        res.status(201).json({ item: notice, message: 'Notice created successfully' });
    } catch (error) {
        console.error('adminCreateNotice error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminToggleNotice(req: AuthRequest, res: Response): Promise<void> {
    try {
        const notice = await AnnouncementNotice.findById(req.params.id);
        if (!notice) {
            res.status(404).json({ message: 'Notice not found' });
            return;
        }

        notice.isActive = !notice.isActive;
        await notice.save();

        const actorId = req.user ? asObjectId(req.user._id) : null;
        await Notification.updateOne(
            { reminderKey: `notice:${String(notice._id)}` },
            {
                $set: {
                    isActive: notice.isActive,
                    updatedBy: actorId || undefined,
                },
            }
        );
        broadcastStudentDashboardEvent({
            type: 'notification_updated',
            meta: { action: 'toggle', source: 'notice', noticeId: String(notice._id), isActive: notice.isActive },
        });

        await createAudit(req, 'notice_toggled', {
            noticeId: String(notice._id),
            isActive: notice.isActive,
        });

        res.json({ item: notice, message: notice.isActive ? 'Notice activated' : 'Notice deactivated' });
    } catch (error) {
        console.error('adminToggleNotice error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function studentGetNotices(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const now = new Date();
        const profile = await StudentProfile.findOne({ user_id: req.user._id }).select('groupIds').lean();
        const groupIds = Array.isArray(profile?.groupIds) ? profile.groupIds.map((id) => String(id)) : [];

        const items = await AnnouncementNotice.find({
            isActive: true,
            startAt: { $lte: now },
            $or: [
                { endAt: null },
                { endAt: { $gte: now } },
            ],
            $and: [
                {
                    $or: [
                        { target: 'all' },
                        { target: 'students', targetIds: String(req.user._id) },
                        ...(groupIds.length > 0 ? [{ target: 'groups', targetIds: { $in: groupIds } }] : []),
                    ],
                },
            ],
        })
            .sort({ startAt: -1, createdAt: -1 })
            .lean();

        res.json({ items });
    } catch (error) {
        console.error('studentGetNotices error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function studentCreateSupportTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (req.user.role !== 'student') {
            res.status(403).json({ message: 'Student access required' });
            return;
        }

        const body = req.body as Record<string, unknown>;
        const subject = String(body.subject || '').trim();
        const message = String(body.message || '').trim();
        if (!subject || !message) {
            res.status(400).json({ message: 'subject and message are required' });
            return;
        }

        const studentId = asObjectId(req.user._id);
        if (!studentId) {
            res.status(400).json({ message: 'Invalid student id' });
            return;
        }

        const ticketNo = await generateTicketNo();
        const ticket = await SupportTicket.create({
            ticketNo,
            studentId,
            subject,
            message,
            status: 'open',
            priority: normalizePriority(body.priority),
            timeline: [{
                actorId: studentId,
                actorRole: 'student',
                message,
                createdAt: new Date(),
            }],
        });

        await createAudit(req, 'support_ticket_created', {
            ticketId: String(ticket._id),
            ticketNo,
        });

        await notifyAdminsForTicket(ticket, 'created');

        res.status(201).json({ item: ticket, message: 'Support ticket created successfully' });
    } catch (error) {
        console.error('studentCreateSupportTicket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function studentGetSupportTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (req.user.role !== 'student') {
            res.status(403).json({ message: 'Student access required' });
            return;
        }

        const studentId = asObjectId(req.user._id);
        if (!studentId) {
            res.status(400).json({ message: 'Invalid student id' });
            return;
        }

        const items = await SupportTicket.find({ studentId })
            .sort({ updatedAt: -1 })
            .lean();

        res.json({ items });
    } catch (error) {
        console.error('studentGetSupportTickets error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function studentGetSupportTicketById(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (req.user.role !== 'student') {
            res.status(403).json({ message: 'Student access required' });
            return;
        }

        const studentId = asObjectId(req.user._id);
        const ticketId = asObjectId(req.params.id);
        if (!studentId || !ticketId) {
            res.status(400).json({ message: 'Invalid ticket id' });
            return;
        }

        const item = await SupportTicket.findOne({ _id: ticketId, studentId }).lean();
        if (!item) {
            res.status(404).json({ message: 'Support ticket not found' });
            return;
        }

        res.json({ item });
    } catch (error) {
        console.error('studentGetSupportTicketById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function studentReplySupportTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (req.user.role !== 'student') {
            res.status(403).json({ message: 'Student access required' });
            return;
        }

        const studentId = asObjectId(req.user._id);
        const ticketId = asObjectId(req.params.id);
        const message = String((req.body as Record<string, unknown>).message || '').trim();
        if (!studentId || !ticketId) {
            res.status(400).json({ message: 'Invalid ticket id' });
            return;
        }
        if (!message) {
            res.status(400).json({ message: 'message is required' });
            return;
        }

        const ticket = await SupportTicket.findOne({ _id: ticketId, studentId });
        if (!ticket) {
            res.status(404).json({ message: 'Support ticket not found' });
            return;
        }
        if (ticket.status === 'closed') {
            res.status(400).json({ message: 'Closed tickets cannot receive new replies' });
            return;
        }

        ticket.timeline.push({
            actorId: studentId,
            actorRole: 'student',
            message,
            createdAt: new Date(),
        });
        if (ticket.status === 'resolved') {
            ticket.status = 'in_progress';
        }
        await ticket.save();

        await createAudit(req, 'support_ticket_student_replied', {
            ticketId: String(ticket._id),
        });
        await notifyAdminsForTicket(ticket, 'student_reply');

        res.json({ item: ticket, message: 'Reply added successfully' });
    } catch (error) {
        console.error('studentReplySupportTicket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetSupportTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
        const query = req.query as Record<string, unknown>;
        const { page, limit, skip } = parsePage(query);

        const filter: Record<string, unknown> = {};
        const status = String(query.status || '').trim();
        if (status) filter.status = status;
        const priority = String(query.priority || '').trim();
        if (priority) filter.priority = priority;

        const search = String(query.search || '').trim();
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { ticketNo: regex },
                { subject: regex },
                { message: regex },
            ];
        }

        const [items, total] = await Promise.all([
            SupportTicket.find(filter)
                .populate('studentId', 'username email full_name')
                .populate('assignedTo', 'username full_name role')
                .sort({ updatedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SupportTicket.countDocuments(filter),
        ]);

        res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
        console.error('adminGetSupportTickets error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminUpdateSupportTicketStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const body = req.body as Record<string, unknown>;
        const update: Record<string, unknown> = {};

        if (body.status !== undefined) update.status = normalizeStatus(body.status);

        if (body.assignedTo !== undefined) {
            const assignedTo = asObjectId(body.assignedTo);
            update.assignedTo = assignedTo;
        }

        const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!ticket) {
            res.status(404).json({ message: 'Support ticket not found' });
            return;
        }

        await createAudit(req, 'support_ticket_status_updated', {
            ticketId: String(ticket._id),
            updatedFields: Object.keys(update),
        });

        if (update.status) {
            await notifyStudentForTicket(
                ticket.studentId,
                ticket,
                'Support ticket updated',
                `Status changed to ${String(ticket.status).replace('_', ' ')}`
            );
        }

        res.json({ item: ticket, message: 'Support ticket updated' });
    } catch (error) {
        console.error('adminUpdateSupportTicketStatus error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminReplySupportTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const message = String((req.body as Record<string, unknown>).message || '').trim();
        if (!message) {
            res.status(400).json({ message: 'message is required' });
            return;
        }

        const actorId = asObjectId(req.user._id);
        if (!actorId) {
            res.status(400).json({ message: 'Invalid actor id' });
            return;
        }

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Support ticket not found' });
            return;
        }

        ticket.timeline.push({
            actorId,
            actorRole: req.user.role,
            message,
            createdAt: new Date(),
        });
        if (ticket.status === 'open') {
            ticket.status = 'in_progress';
        }
        await ticket.save();

        await createAudit(req, 'support_ticket_replied', {
            ticketId: String(ticket._id),
        });

        await notifyStudentForTicket(
            ticket.studentId,
            ticket,
            'Support reply received',
            'An admin replied to your support ticket'
        );

        res.json({ item: ticket, message: 'Reply added successfully' });
    } catch (error) {
        console.error('adminReplySupportTicket error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
