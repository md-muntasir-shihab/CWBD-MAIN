import mongoose, { Document } from 'mongoose';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketThreadState = 'pending' | 'replied' | 'idle' | 'resolved' | 'closed';
export type SupportTicketMessageSenderType = 'student' | 'admin' | 'system';
export interface ISupportTicketTimelineItem {
    actorId: mongoose.Types.ObjectId;
    actorRole: string;
    message: string;
    createdAt: Date;
}
export interface ISupportTicket extends Document {
    ticketNo: string;
    studentId: mongoose.Types.ObjectId;
    subject: string;
    message: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
    assignedTo?: mongoose.Types.ObjectId | null;
    subscriptionSnapshot?: Record<string, unknown>;
    messageCount: number;
    latestMessagePreview: string;
    lastMessageAt?: Date | null;
    lastMessageSenderType?: SupportTicketMessageSenderType | null;
    unreadCountForAdmin: number;
    unreadCountForUser: number;
    threadState: SupportTicketThreadState;
    timeline: ISupportTicketTimelineItem[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ISupportTicket, {}, {}, {}, mongoose.Document<unknown, {}, ISupportTicket, {}, {}> & ISupportTicket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SupportTicket.d.ts.map