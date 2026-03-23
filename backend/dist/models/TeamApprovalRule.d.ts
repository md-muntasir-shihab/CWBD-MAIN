import mongoose, { Document } from 'mongoose';
export interface ITeamApprovalRule extends Document {
    module: string;
    action: string;
    requiresApproval: boolean;
    requiredApprovals: number;
    description: string;
    approverRoleIds: mongoose.Types.ObjectId[];
}
declare const _default: mongoose.Model<ITeamApprovalRule, {}, {}, {}, mongoose.Document<unknown, {}, ITeamApprovalRule, {}, {}> & ITeamApprovalRule & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=TeamApprovalRule.d.ts.map