import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare function getRuntimeSettings(_req: AuthRequest, res: Response): Promise<void>;
export declare function updateRuntimeSettingsController(req: AuthRequest, res: Response): Promise<void>;
export declare function getAdminUiLayoutSettings(_req: AuthRequest, res: Response): Promise<void>;
export declare function updateAdminUiLayoutSettings(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=runtimeSettingsController.d.ts.map