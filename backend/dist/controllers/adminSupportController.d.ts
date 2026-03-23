import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare function adminGetNotices(req: AuthRequest, res: Response): Promise<void>;
export declare function adminCreateNotice(req: AuthRequest, res: Response): Promise<void>;
export declare function adminToggleNotice(req: AuthRequest, res: Response): Promise<void>;
export declare function studentGetNotices(req: AuthRequest, res: Response): Promise<void>;
export declare function studentCreateSupportTicket(req: AuthRequest, res: Response): Promise<void>;
export declare function studentGetSupportTickets(req: AuthRequest, res: Response): Promise<void>;
export declare function studentGetSupportTicketById(req: AuthRequest, res: Response): Promise<void>;
export declare function studentReplySupportTicket(req: AuthRequest, res: Response): Promise<void>;
export declare function adminGetSupportTickets(req: AuthRequest, res: Response): Promise<void>;
export declare function adminUpdateSupportTicketStatus(req: AuthRequest, res: Response): Promise<void>;
export declare function adminReplySupportTicket(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=adminSupportController.d.ts.map