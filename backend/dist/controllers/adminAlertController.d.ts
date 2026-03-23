import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare function adminGetActionableAlerts(req: AuthRequest, res: Response): Promise<void>;
export declare function adminMarkActionableAlertsRead(req: AuthRequest, res: Response): Promise<void>;
export declare function adminGetActionableAlertsUnreadCount(req: AuthRequest, res: Response): Promise<void>;
export declare function adminMarkSingleActionableAlertRead(req: AuthRequest, res: Response): Promise<void>;
export declare function adminMarkAllActionableAlertsRead(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=adminAlertController.d.ts.map