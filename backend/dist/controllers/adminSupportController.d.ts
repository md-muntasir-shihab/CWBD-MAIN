import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare function adminGetNotices(req: AuthRequest, res: Response): Promise<void>;
export declare function adminCreateNotice(req: AuthRequest, res: Response): Promise<void>;
export declare function adminToggleNotice(req: AuthRequest, res: Response): Promise<void>;
export declare function studentGetNotices(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=adminSupportController.d.ts.map