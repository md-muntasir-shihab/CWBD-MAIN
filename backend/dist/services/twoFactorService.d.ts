import { IUser } from '../models/User';
import { TwoFactorMethod } from './securityConfigService';
export declare function generateOtpCode(): string;
export declare function hashOtpCode(code: string): string;
export declare function maskEmail(email: string): string;
export declare function normalizeTwoFactorMethod(value: unknown, fallback?: TwoFactorMethod): TwoFactorMethod;
export declare function generateTotpSecret(length?: number): string;
export declare function buildTotpOtpAuthUrl(params: {
    issuer?: string;
    accountName: string;
    secret: string;
}): string;
export declare function verifyTotpCode(secret: string, code: string, window?: number): boolean;
export declare function generateBackupCodes(count?: number): {
    plainCodes: string[];
    hashedCodes: Array<{
        codeHash: string;
        usedAt: null;
    }>;
};
export declare function consumeBackupCode(codes: Array<{
    codeHash: string;
    usedAt?: Date | null;
}> | undefined, candidate: string): {
    ok: boolean;
    nextCodes: Array<{
        codeHash: string;
        usedAt?: Date | null;
    }>;
};
export declare function sendOtpChallenge(params: {
    user: IUser;
    method: TwoFactorMethod;
    otpCode: string;
    expiryMinutes: number;
}): Promise<TwoFactorMethod>;
//# sourceMappingURL=twoFactorService.d.ts.map