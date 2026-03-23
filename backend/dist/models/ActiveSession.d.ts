import mongoose, { Document } from 'mongoose';
export interface IActiveSession extends Document {
    user_id: mongoose.Types.ObjectId;
    session_id: string;
    jwt_token_hash: string;
    browser_fingerprint: string;
    ip_address: string;
    device_type: string;
    device_name?: string;
    platform?: string;
    browser?: string;
    location_summary?: string;
    risk_score?: number;
    risk_flags?: string[];
    stream_ticket_hash?: string;
    stream_ticket_expires_at?: Date;
    login_time: Date;
    last_activity: Date;
    status: 'active' | 'terminated';
    terminated_reason?: string;
    terminated_at?: Date;
    termination_meta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IActiveSession, {}, {}, {}, mongoose.Document<unknown, {}, IActiveSession, {}, {}> & IActiveSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ActiveSession.d.ts.map