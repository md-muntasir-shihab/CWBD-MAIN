import { Response as ExpressResponse } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getStudentProfile: (req: AuthRequest, res: ExpressResponse) => Promise<ExpressResponse<any, Record<string, any>> | undefined>;
export declare const getStudentProfileUpdateRequestStatus: (req: AuthRequest, res: ExpressResponse) => Promise<ExpressResponse<any, Record<string, any>> | undefined>;
export declare const updateStudentProfile: (req: AuthRequest, res: ExpressResponse) => Promise<ExpressResponse<any, Record<string, any>> | undefined>;
export declare const getStudentApplications: (req: AuthRequest, res: ExpressResponse) => Promise<ExpressResponse<any, Record<string, any>> | undefined>;
export declare const createStudentApplication: (req: AuthRequest, res: ExpressResponse) => Promise<ExpressResponse<any, Record<string, any>> | undefined>;
export declare const uploadStudentDocument: (req: AuthRequest, res: ExpressResponse) => Promise<ExpressResponse<any, Record<string, any>> | undefined>;
//# sourceMappingURL=studentController.d.ts.map