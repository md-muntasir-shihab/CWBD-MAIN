"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultTeamRoles = ensureDefaultTeamRoles;
exports.teamGetMembers = teamGetMembers;
exports.teamCreateMember = teamCreateMember;
exports.teamGetMemberById = teamGetMemberById;
exports.teamUpdateMember = teamUpdateMember;
exports.teamSuspendMember = teamSuspendMember;
exports.teamActivateMember = teamActivateMember;
exports.teamResetPassword = teamResetPassword;
exports.teamRevokeSessions = teamRevokeSessions;
exports.teamResendInvite = teamResendInvite;
exports.teamGetRoles = teamGetRoles;
exports.teamCreateRole = teamCreateRole;
exports.teamGetRoleById = teamGetRoleById;
exports.teamUpdateRole = teamUpdateRole;
exports.teamDuplicateRole = teamDuplicateRole;
exports.teamDeleteRole = teamDeleteRole;
exports.teamGetPermissions = teamGetPermissions;
exports.teamUpdateRolePermissions = teamUpdateRolePermissions;
exports.teamUpdateMemberOverride = teamUpdateMemberOverride;
exports.teamGetApprovalRules = teamGetApprovalRules;
exports.teamCreateApprovalRule = teamCreateApprovalRule;
exports.teamUpdateApprovalRule = teamUpdateApprovalRule;
exports.teamDeleteApprovalRule = teamDeleteApprovalRule;
exports.teamGetActivity = teamGetActivity;
exports.teamGetActivityById = teamGetActivityById;
exports.teamGetSecurityOverview = teamGetSecurityOverview;
exports.teamGetInvites = teamGetInvites;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const TeamRole_1 = __importDefault(require("../models/TeamRole"));
const RolePermissionSet_1 = __importDefault(require("../models/RolePermissionSet"));
const MemberPermissionOverride_1 = __importDefault(require("../models/MemberPermissionOverride"));
const TeamApprovalRule_1 = __importDefault(require("../models/TeamApprovalRule"));
const TeamAuditLog_1 = __importDefault(require("../models/TeamAuditLog"));
const TeamInvite_1 = __importDefault(require("../models/TeamInvite"));
const ActiveSession_1 = __importDefault(require("../models/ActiveSession"));
const defaults_1 = require("../teamAccess/defaults");
const securityTokenService_1 = require("../services/securityTokenService");
const mailer_1 = require("../utils/mailer");
const TEAM_USER_ROLES = ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'];
const APP_DOMAIN = process.env.APP_DOMAIN || process.env.FRONTEND_URL || 'http://localhost:5173';
function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}
function asObjectId(id) {
    return new mongoose_1.default.Types.ObjectId(Array.isArray(id) ? id[0] : id);
}
function randomPassword() {
    return crypto_1.default.randomBytes(8).toString('hex');
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseRequiredApprovals(value, fallback = 1) {
    if (value === undefined || value === null || String(value).trim() === '')
        return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1)
        return null;
    return parsed;
}
async function resolveApproverRoleIds(body) {
    const rawValues = [
        ...(Array.isArray(body.approverRoleIds) ? body.approverRoleIds : []),
        ...(Array.isArray(body.approverRoles) ? body.approverRoles : []),
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const uniqueValues = Array.from(new Set(rawValues));
    if (uniqueValues.length === 0) {
        return { ids: [], invalid: [] };
    }
    const resolvedIds = new Map();
    const unresolved = [];
    uniqueValues.forEach((value) => {
        if (mongoose_1.default.Types.ObjectId.isValid(value)) {
            resolvedIds.set(value, asObjectId(value));
            return;
        }
        unresolved.push(value);
    });
    if (unresolved.length === 0) {
        return { ids: Array.from(resolvedIds.values()), invalid: [] };
    }
    const roleMatches = await TeamRole_1.default.find({
        $or: [
            { slug: { $in: unresolved.map((value) => value.toLowerCase()) } },
            { name: { $in: unresolved } },
        ],
    })
        .select('_id slug name')
        .lean();
    const matchedKeys = new Set();
    roleMatches.forEach((role) => {
        resolvedIds.set(String(role._id), asObjectId(String(role._id)));
        matchedKeys.add(String(role.slug || '').trim().toLowerCase());
        matchedKeys.add(String(role.name || '').trim());
    });
    return {
        ids: Array.from(resolvedIds.values()),
        invalid: unresolved.filter((value) => !matchedKeys.has(value) && !matchedKeys.has(value.toLowerCase())),
    };
}
async function issueMemberSetPasswordInvite(user, createdBy) {
    const email = normalizeEmail(user.email);
    if (!email)
        return false;
    const { rawToken } = await (0, securityTokenService_1.issueSecurityToken)({
        userId: user._id,
        purpose: 'set_password',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        channel: 'email',
        replaceExisting: true,
        createdBy: createdBy && mongoose_1.default.Types.ObjectId.isValid(createdBy)
            ? new mongoose_1.default.Types.ObjectId(createdBy)
            : null,
        meta: { email, teamMember: true },
    });
    const setPasswordUrl = `${APP_DOMAIN}/student/reset-password?token=${rawToken}`;
    return (0, mailer_1.sendCampusMail)({
        to: email,
        subject: 'CampusWay: Set your team account password',
        text: `Set your CampusWay password: ${setPasswordUrl}`,
        html: `<p>Hello ${user.full_name || user.username},</p><p>Your CampusWay team account is ready.</p><p><a href="${setPasswordUrl}">Set your password</a></p><p>This link expires in 24 hours and can be used once.</p>`,
    });
}
function pickModulePermissions(input) {
    const source = (typeof input === 'object' && input) ? input : {};
    const payload = {};
    defaults_1.TEAM_MODULES.forEach((moduleName) => {
        const row = source[moduleName];
        const rowObj = (typeof row === 'object' && row) ? row : {};
        payload[moduleName] = {};
        defaults_1.TEAM_ACTIONS.forEach((action) => {
            payload[moduleName][action] = Boolean(rowObj[action]);
        });
    });
    return payload;
}
function applyOverride(base, allow, deny) {
    const next = JSON.parse(JSON.stringify(base));
    Object.entries(allow || {}).forEach(([moduleName, actions]) => {
        if (!next[moduleName])
            next[moduleName] = {};
        Object.entries(actions || {}).forEach(([action, value]) => {
            if (value)
                next[moduleName][action] = true;
        });
    });
    Object.entries(deny || {}).forEach(([moduleName, actions]) => {
        if (!next[moduleName])
            next[moduleName] = {};
        Object.entries(actions || {}).forEach(([action, value]) => {
            if (value)
                next[moduleName][action] = false;
        });
    });
    return next;
}
async function writeAudit(req, action, targetType, targetId, oldValueSummary, newValueSummary, status = 'success') {
    const authReq = req;
    const tid = Array.isArray(targetId) ? targetId[0] : targetId;
    await TeamAuditLog_1.default.create({
        actorId: authReq.user?._id ? asObjectId(String(authReq.user._id)) : undefined,
        module: 'team_access_control',
        action,
        targetType,
        targetId: tid,
        oldValueSummary,
        newValueSummary,
        status,
        ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
        device: String(req.headers['user-agent'] || ''),
    });
}
async function ensureDefaultTeamRoles() {
    for (const role of defaults_1.DEFAULT_TEAM_ROLES) {
        const existing = await TeamRole_1.default.findOne({ slug: role.slug });
        let roleDoc = existing;
        if (!roleDoc) {
            roleDoc = await TeamRole_1.default.create({
                name: role.name,
                slug: role.slug,
                description: role.description,
                isSystemRole: role.isSystemRole,
                isActive: role.isActive,
                basePlatformRole: role.basePlatformRole,
            });
        }
        const permissionSet = await RolePermissionSet_1.default.findOne({ roleId: roleDoc._id });
        if (!permissionSet) {
            await RolePermissionSet_1.default.create({ roleId: roleDoc._id, modulePermissions: role.modulePermissions });
        }
    }
}
async function teamGetMembers(req, res) {
    try {
        await ensureDefaultTeamRoles();
        const search = String(req.query.search || '').trim();
        const roleId = String(req.query.roleId || '').trim();
        const status = String(req.query.status || '').trim();
        const filter = {
            role: { $in: TEAM_USER_ROLES },
        };
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { full_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
            ];
        }
        if (roleId && mongoose_1.default.Types.ObjectId.isValid(roleId)) {
            filter.teamRoleId = asObjectId(roleId);
        }
        const members = await User_1.default.find(filter)
            .select('_id full_name email phone_number username role teamRoleId status lastLoginAtUTC twoFactorEnabled forcePasswordResetRequired')
            .populate('teamRoleId', 'name slug')
            .sort({ updatedAt: -1 })
            .lean();
        res.json({ items: members });
    }
    catch (error) {
        console.error('teamGetMembers error:', error);
        res.status(500).json({ message: 'Failed to load team members' });
    }
}
async function teamCreateMember(req, res) {
    try {
        await ensureDefaultTeamRoles();
        const body = req.body;
        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const username = String(body.username || email.split('@')[0] || '').trim().toLowerCase();
        const phone = String(body.phone || '').trim();
        const roleId = String(body.roleId || '').trim();
        const mode = String(body.mode || 'invite').trim();
        const status = String(body.status || 'active').trim();
        const notes = String(body.notes || '').trim();
        const requirePasswordReset = Boolean(body.forcePasswordResetRequired ?? true);
        if (!fullName || !email || !username || !mongoose_1.default.Types.ObjectId.isValid(roleId)) {
            res.status(400).json({ message: 'fullName, email, username and roleId are required' });
            return;
        }
        const existing = await User_1.default.findOne({ $or: [{ email }, { username }] }).lean();
        if (existing) {
            res.status(409).json({ message: 'Email or username already exists' });
            return;
        }
        const role = await TeamRole_1.default.findById(roleId).lean();
        if (!role) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(randomPassword(), 10);
        const user = await User_1.default.create({
            full_name: fullName,
            email,
            username,
            phone_number: phone || undefined,
            password: passwordHash,
            role: role.basePlatformRole,
            teamRoleId: role._id,
            status,
            forcePasswordResetRequired: requirePasswordReset,
            notes,
        });
        const authReq = req;
        const shouldSendInvite = mode !== 'draft' && mode !== 'without_send';
        const inviteSent = shouldSendInvite
            ? await issueMemberSetPasswordInvite(user, authReq.user?._id)
            : false;
        const inviteStatus = mode === 'draft' ? 'draft' : inviteSent ? 'sent' : 'pending';
        await TeamInvite_1.default.create({
            memberId: user._id,
            fullName,
            email,
            phone,
            roleId: role._id,
            status: inviteStatus,
            invitedBy: authReq.user?._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes,
        });
        await writeAudit(req, 'member_created', 'team_member', String(user._id), undefined, {
            roleId,
            role: role.slug,
            status,
            inviteMode: mode,
            inviteSent,
        });
        res.status(201).json({
            message: inviteSent ? 'Team member created and invite sent' : 'Team member created',
            item: {
                _id: user._id,
                fullName: user.full_name,
                email: user.email,
                roleId,
                inviteSent,
            },
        });
    }
    catch (error) {
        console.error('teamCreateMember error:', error);
        res.status(500).json({ message: 'Failed to create team member' });
    }
}
async function teamGetMemberById(req, res) {
    try {
        await ensureDefaultTeamRoles();
        const member = await User_1.default.findById(req.params.id)
            .select('_id full_name email phone_number username role teamRoleId status lastLoginAtUTC loginAttempts twoFactorEnabled forcePasswordResetRequired notes createdAt updatedAt')
            .populate('teamRoleId', 'name slug description basePlatformRole')
            .lean();
        if (!member) {
            res.status(404).json({ message: 'Member not found' });
            return;
        }
        const [override, logs] = await Promise.all([
            MemberPermissionOverride_1.default.findOne({ memberId: asObjectId(req.params.id) }).lean(),
            TeamAuditLog_1.default.find({ targetId: req.params.id }).sort({ createdAt: -1 }).limit(50).lean(),
        ]);
        res.json({ item: member, override, logs });
    }
    catch (error) {
        console.error('teamGetMemberById error:', error);
        res.status(500).json({ message: 'Failed to load member details' });
    }
}
async function teamUpdateMember(req, res) {
    try {
        const body = req.body;
        const member = await User_1.default.findById(req.params.id);
        if (!member) {
            res.status(404).json({ message: 'Member not found' });
            return;
        }
        const oldValue = {
            teamRoleId: member.teamRoleId,
            role: member.role,
            status: member.status,
            forcePasswordResetRequired: member.forcePasswordResetRequired,
            email: member.email,
        };
        if (body.fullName)
            member.full_name = String(body.fullName).trim();
        if (body.email !== undefined) {
            const nextEmail = normalizeEmail(body.email);
            if (!nextEmail) {
                res.status(400).json({ message: 'email is required' });
                return;
            }
            if (nextEmail !== member.email) {
                const existing = await User_1.default.findOne({
                    email: nextEmail,
                    _id: { $ne: member._id },
                }).select('_id').lean();
                if (existing) {
                    res.status(409).json({ message: 'Email already exists' });
                    return;
                }
                member.email = nextEmail;
            }
        }
        const phoneInput = body.phone ?? body.phone_number;
        if (phoneInput !== undefined)
            member.phone_number = String(phoneInput || '').trim();
        if (body.status)
            member.status = String(body.status);
        if (body.notes !== undefined)
            member.notes = String(body.notes || '').trim();
        if (body.forcePasswordResetRequired !== undefined) {
            member.forcePasswordResetRequired = Boolean(body.forcePasswordResetRequired);
        }
        const roleId = String(body.roleId || body.teamRoleId || '').trim();
        if (roleId && mongoose_1.default.Types.ObjectId.isValid(roleId)) {
            const role = await TeamRole_1.default.findById(roleId).lean();
            if (!role) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }
            member.teamRoleId = role._id;
            member.role = role.basePlatformRole;
        }
        await member.save();
        await writeAudit(req, 'member_updated', 'team_member', req.params.id, oldValue, {
            teamRoleId: member.teamRoleId,
            role: member.role,
            status: member.status,
            forcePasswordResetRequired: member.forcePasswordResetRequired,
            email: member.email,
        });
        res.json({ message: 'Member updated', item: member });
    }
    catch (error) {
        console.error('teamUpdateMember error:', error);
        res.status(500).json({ message: 'Failed to update member' });
    }
}
async function teamSuspendMember(req, res) {
    await teamUpdateStatus(req, res, 'suspended', 'member_suspended');
}
async function teamActivateMember(req, res) {
    await teamUpdateStatus(req, res, 'active', 'member_activated');
}
async function teamUpdateStatus(req, res, status, action) {
    try {
        const member = await User_1.default.findById(req.params.id);
        if (!member) {
            res.status(404).json({ message: 'Member not found' });
            return;
        }
        const oldStatus = member.status;
        member.status = status;
        await member.save();
        await writeAudit(req, action, 'team_member', req.params.id, { status: oldStatus }, { status });
        res.json({ message: `Member ${status}` });
    }
    catch (error) {
        console.error('teamUpdateStatus error:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
}
async function teamResetPassword(req, res) {
    try {
        const member = await User_1.default.findById(req.params.id).select('+password');
        if (!member) {
            res.status(404).json({ message: 'Member not found' });
            return;
        }
        member.password = await bcryptjs_1.default.hash(randomPassword(), 10);
        member.forcePasswordResetRequired = true;
        member.mustChangePassword = true;
        await member.save();
        const authReq = req;
        const inviteSent = await issueMemberSetPasswordInvite(member, authReq.user?._id);
        await writeAudit(req, 'member_password_reset', 'team_member', req.params.id, undefined, {
            forcePasswordResetRequired: true,
            inviteSent,
        });
        res.json({
            message: inviteSent ? 'Password reset link sent' : 'Password reset prepared',
            inviteSent,
        });
    }
    catch (error) {
        console.error('teamResetPassword error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
}
async function teamRevokeSessions(req, res) {
    try {
        const result = await ActiveSession_1.default.updateMany({ user_id: asObjectId(req.params.id), status: 'active' }, { $set: { status: 'terminated', terminated_reason: 'admin_revoke', terminated_at: new Date() } });
        await writeAudit(req, 'member_sessions_revoked', 'team_member', req.params.id, undefined, {
            modifiedCount: result.modifiedCount,
        });
        res.json({ message: 'Sessions revoked', modifiedCount: result.modifiedCount });
    }
    catch (error) {
        console.error('teamRevokeSessions error:', error);
        res.status(500).json({ message: 'Failed to revoke sessions' });
    }
}
async function teamResendInvite(req, res) {
    try {
        const invite = await TeamInvite_1.default.findOne({ memberId: asObjectId(req.params.id) }).sort({ createdAt: -1 });
        if (!invite) {
            res.status(404).json({ message: 'Invite not found' });
            return;
        }
        invite.status = 'sent';
        invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await invite.save();
        await writeAudit(req, 'member_invite_resent', 'team_invite', String(invite._id), { status: 'old' }, { status: 'sent' });
        res.json({ message: 'Invite re-sent', item: invite });
    }
    catch (error) {
        console.error('teamResendInvite error:', error);
        res.status(500).json({ message: 'Failed to resend invite' });
    }
}
async function teamGetRoles(_req, res) {
    try {
        await ensureDefaultTeamRoles();
        const [roles, users] = await Promise.all([
            TeamRole_1.default.find({}).sort({ isSystemRole: -1, name: 1 }).lean(),
            User_1.default.aggregate([
                { $match: { role: { $in: TEAM_USER_ROLES } } },
                { $group: { _id: '$teamRoleId', totalUsers: { $sum: 1 } } },
            ]),
        ]);
        const countMap = new Map(users.map((item) => [String(item._id || ''), Number(item.totalUsers || 0)]));
        const roleIds = roles.map((r) => r._id);
        const permissionSets = await RolePermissionSet_1.default.find({ roleId: { $in: roleIds } }).lean();
        const permissionMap = new Map(permissionSets.map((item) => [String(item.roleId), item.modulePermissions]));
        res.json({
            items: roles.map((role) => ({
                ...role,
                totalUsers: countMap.get(String(role._id)) || 0,
                modulePermissions: permissionMap.get(String(role._id)) || {},
            })),
        });
    }
    catch (error) {
        console.error('teamGetRoles error:', error);
        res.status(500).json({ message: 'Failed to load roles' });
    }
}
async function teamCreateRole(req, res) {
    try {
        await ensureDefaultTeamRoles();
        const body = req.body;
        const name = String(body.name || '').trim();
        const description = String(body.description || '').trim();
        const slug = String(body.slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const cloneFromRoleId = String(body.cloneFromRoleId || '').trim();
        const basePlatformRole = String(body.basePlatformRole || 'viewer').trim();
        if (!name || !slug) {
            res.status(400).json({ message: 'name is required' });
            return;
        }
        const existing = await TeamRole_1.default.findOne({ slug }).lean();
        if (existing) {
            res.status(409).json({ message: 'Role slug already exists' });
            return;
        }
        const role = await TeamRole_1.default.create({
            name,
            slug,
            description,
            isSystemRole: false,
            isActive: body.isActive !== false,
            basePlatformRole,
        });
        let modulePermissions = pickModulePermissions(body.modulePermissions);
        if (cloneFromRoleId && mongoose_1.default.Types.ObjectId.isValid(cloneFromRoleId)) {
            const source = await RolePermissionSet_1.default.findOne({ roleId: asObjectId(cloneFromRoleId) }).lean();
            if (source?.modulePermissions) {
                modulePermissions = source.modulePermissions;
            }
        }
        await RolePermissionSet_1.default.create({ roleId: role._id, modulePermissions });
        await writeAudit(req, 'role_created', 'team_role', String(role._id), undefined, { slug, name });
        res.status(201).json({ message: 'Role created', item: role });
    }
    catch (error) {
        console.error('teamCreateRole error:', error);
        res.status(500).json({ message: 'Failed to create role' });
    }
}
async function teamGetRoleById(req, res) {
    try {
        const role = await TeamRole_1.default.findById(req.params.id).lean();
        if (!role) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        const permissions = await RolePermissionSet_1.default.findOne({ roleId: asObjectId(req.params.id) }).lean();
        const users = await User_1.default.find({ teamRoleId: asObjectId(req.params.id) })
            .select('_id full_name email role status')
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean();
        res.json({ item: role, permissions: permissions?.modulePermissions || {}, users });
    }
    catch (error) {
        console.error('teamGetRoleById error:', error);
        res.status(500).json({ message: 'Failed to load role details' });
    }
}
async function teamUpdateRole(req, res) {
    try {
        const body = req.body;
        const role = await TeamRole_1.default.findById(req.params.id);
        if (!role) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        if (body.name)
            role.name = String(body.name).trim();
        if (body.description !== undefined)
            role.description = String(body.description || '').trim();
        if (body.isActive !== undefined)
            role.isActive = Boolean(body.isActive);
        if (!role.isSystemRole && body.basePlatformRole) {
            role.basePlatformRole = String(body.basePlatformRole);
        }
        await role.save();
        if (body.modulePermissions) {
            const modulePermissions = pickModulePermissions(body.modulePermissions);
            await RolePermissionSet_1.default.updateOne({ roleId: role._id }, { $set: { modulePermissions } }, { upsert: true });
        }
        await writeAudit(req, 'role_updated', 'team_role', req.params.id, undefined, {
            name: role.name,
            isActive: role.isActive,
            basePlatformRole: role.basePlatformRole,
        });
        res.json({ message: 'Role updated', item: role });
    }
    catch (error) {
        console.error('teamUpdateRole error:', error);
        res.status(500).json({ message: 'Failed to update role' });
    }
}
async function teamDuplicateRole(req, res) {
    try {
        const source = await TeamRole_1.default.findById(req.params.id).lean();
        if (!source) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        const sourcePermissions = await RolePermissionSet_1.default.findOne({ roleId: asObjectId(req.params.id) }).lean();
        const suffix = Date.now().toString().slice(-6);
        const role = await TeamRole_1.default.create({
            name: `${source.name} Copy`,
            slug: `${source.slug}-copy-${suffix}`,
            description: source.description,
            isSystemRole: false,
            isActive: source.isActive,
            basePlatformRole: source.basePlatformRole,
        });
        await RolePermissionSet_1.default.create({
            roleId: role._id,
            modulePermissions: sourcePermissions?.modulePermissions || {},
        });
        await writeAudit(req, 'role_duplicated', 'team_role', String(role._id), { sourceRoleId: source._id }, { roleId: role._id });
        res.status(201).json({ message: 'Role duplicated', item: role });
    }
    catch (error) {
        console.error('teamDuplicateRole error:', error);
        res.status(500).json({ message: 'Failed to duplicate role' });
    }
}
async function teamDeleteRole(req, res) {
    try {
        const role = await TeamRole_1.default.findById(req.params.id);
        if (!role) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }
        if (role.isSystemRole) {
            res.status(400).json({ message: 'System roles cannot be archived/deleted' });
            return;
        }
        const usersUsingRole = await User_1.default.countDocuments({ teamRoleId: role._id });
        if (usersUsingRole > 0) {
            role.isActive = false;
            await role.save();
            await writeAudit(req, 'role_archived', 'team_role', req.params.id, undefined, { usersUsingRole });
            res.json({ message: 'Role archived because it is assigned to members' });
            return;
        }
        await Promise.all([
            RolePermissionSet_1.default.deleteOne({ roleId: role._id }),
            TeamRole_1.default.deleteOne({ _id: role._id }),
        ]);
        await writeAudit(req, 'role_deleted', 'team_role', req.params.id);
        res.json({ message: 'Role deleted' });
    }
    catch (error) {
        console.error('teamDeleteRole error:', error);
        res.status(500).json({ message: 'Failed to delete role' });
    }
}
async function teamGetPermissions(req, res) {
    try {
        await ensureDefaultTeamRoles();
        const roles = await TeamRole_1.default.find({ isActive: true }).sort({ name: 1 }).lean();
        const roleIds = roles.map((r) => r._id);
        const sets = await RolePermissionSet_1.default.find({ roleId: { $in: roleIds } }).lean();
        const setMap = new Map(sets.map((set) => [String(set.roleId), set.modulePermissions]));
        res.json({
            modules: defaults_1.TEAM_MODULES,
            actions: defaults_1.TEAM_ACTIONS,
            roles: roles.map((role) => ({
                _id: role._id,
                name: role.name,
                slug: role.slug,
                permissions: setMap.get(String(role._id)) || {},
            })),
        });
    }
    catch (error) {
        console.error('teamGetPermissions error:', error);
        res.status(500).json({ message: 'Failed to load permissions matrix' });
    }
}
async function teamUpdateRolePermissions(req, res) {
    try {
        const roleId = String(req.params.id);
        if (!mongoose_1.default.Types.ObjectId.isValid(roleId)) {
            res.status(400).json({ message: 'Invalid role id' });
            return;
        }
        const modulePermissions = pickModulePermissions(req.body.modulePermissions);
        await RolePermissionSet_1.default.updateOne({ roleId: new mongoose_1.default.Types.ObjectId(roleId) }, { $set: { modulePermissions } }, { upsert: true });
        await writeAudit(req, 'role_permissions_updated', 'team_role', roleId, undefined, { updated: true });
        res.json({ message: 'Role permissions updated' });
    }
    catch (error) {
        console.error('teamUpdateRolePermissions error:', error);
        res.status(500).json({ message: 'Failed to update permissions' });
    }
}
async function teamUpdateMemberOverride(req, res) {
    try {
        const memberId = String(req.params.id);
        if (!mongoose_1.default.Types.ObjectId.isValid(memberId)) {
            res.status(400).json({ message: 'Invalid member id' });
            return;
        }
        const body = req.body;
        if (body.allow === undefined && body.deny === undefined) {
            res.status(400).json({ message: 'allow or deny permission matrix is required' });
            return;
        }
        if (body.allow !== undefined && !isRecord(body.allow)) {
            res.status(400).json({ message: 'allow must be a permission matrix object' });
            return;
        }
        if (body.deny !== undefined && !isRecord(body.deny)) {
            res.status(400).json({ message: 'deny must be a permission matrix object' });
            return;
        }
        const member = await User_1.default.findById(memberId).select('teamRoleId').lean();
        if (!member) {
            res.status(404).json({ message: 'Member not found' });
            return;
        }
        const allow = pickModulePermissions(body.allow);
        const deny = pickModulePermissions(body.deny);
        await MemberPermissionOverride_1.default.updateOne({ memberId: asObjectId(memberId) }, { $set: { allow, deny } }, { upsert: true });
        if (member?.teamRoleId) {
            const base = await RolePermissionSet_1.default.findOne({ roleId: member.teamRoleId }).lean();
            const merged = applyOverride((base?.modulePermissions || {}), allow, deny);
            await User_1.default.updateOne({ _id: asObjectId(memberId) }, { $set: { permissionsV2: merged } });
        }
        await writeAudit(req, 'member_override_updated', 'team_member', memberId, undefined, { allow, deny });
        res.json({ message: 'Member override updated' });
    }
    catch (error) {
        console.error('teamUpdateMemberOverride error:', error);
        res.status(500).json({ message: 'Failed to update member override' });
    }
}
async function teamGetApprovalRules(_req, res) {
    try {
        const items = await TeamApprovalRule_1.default.find({}).populate('approverRoleIds', 'name slug').sort({ module: 1, action: 1 }).lean();
        res.json({ items });
    }
    catch (error) {
        console.error('teamGetApprovalRules error:', error);
        res.status(500).json({ message: 'Failed to load approval rules' });
    }
}
async function teamCreateApprovalRule(req, res) {
    try {
        const body = req.body;
        const module = String(body.module || '').trim().toLowerCase();
        const action = String(body.action || '').trim().toLowerCase();
        const requiresApproval = body.requiresApproval !== false;
        const requiredApprovals = parseRequiredApprovals(body.requiredApprovals, 1);
        const description = String(body.description || '').trim();
        const { ids: approverRoleIds, invalid } = await resolveApproverRoleIds(body);
        if (!module || !action) {
            res.status(400).json({ message: 'module and action are required' });
            return;
        }
        if (requiredApprovals === null) {
            res.status(400).json({ message: 'requiredApprovals must be an integer greater than 0' });
            return;
        }
        if (invalid.length > 0) {
            res.status(400).json({ message: `Unknown approver roles: ${invalid.join(', ')}` });
            return;
        }
        const item = await TeamApprovalRule_1.default.create({
            module,
            action,
            requiresApproval,
            requiredApprovals,
            description,
            approverRoleIds,
        });
        const populatedItem = await TeamApprovalRule_1.default.findById(item._id).populate('approverRoleIds', 'name slug').lean();
        await writeAudit(req, 'approval_rule_created', 'approval_rule', String(item._id), undefined, {
            module,
            action,
            requiresApproval,
            requiredApprovals,
            description,
            approverRoleIds: approverRoleIds.map((id) => String(id)),
        });
        res.status(201).json({ item: populatedItem || item, message: 'Approval rule created' });
    }
    catch (error) {
        console.error('teamCreateApprovalRule error:', error);
        res.status(500).json({ message: 'Failed to create approval rule' });
    }
}
async function teamUpdateApprovalRule(req, res) {
    try {
        const body = req.body;
        const item = await TeamApprovalRule_1.default.findById(req.params.id);
        if (!item) {
            res.status(404).json({ message: 'Approval rule not found' });
            return;
        }
        const requiredApprovals = parseRequiredApprovals(body.requiredApprovals, item.requiredApprovals || 1);
        const { ids: approverRoleIds, invalid } = await resolveApproverRoleIds(body);
        if (requiredApprovals === null) {
            res.status(400).json({ message: 'requiredApprovals must be an integer greater than 0' });
            return;
        }
        if (invalid.length > 0) {
            res.status(400).json({ message: `Unknown approver roles: ${invalid.join(', ')}` });
            return;
        }
        if (body.module)
            item.module = String(body.module).trim().toLowerCase();
        if (body.action)
            item.action = String(body.action).trim().toLowerCase();
        if (body.requiresApproval !== undefined)
            item.requiresApproval = Boolean(body.requiresApproval);
        if (body.requiredApprovals !== undefined)
            item.requiredApprovals = requiredApprovals;
        if (body.description !== undefined)
            item.description = String(body.description || '').trim();
        if (Array.isArray(body.approverRoleIds) || Array.isArray(body.approverRoles)) {
            item.approverRoleIds = approverRoleIds;
        }
        await item.save();
        const populatedItem = await TeamApprovalRule_1.default.findById(item._id).populate('approverRoleIds', 'name slug').lean();
        await writeAudit(req, 'approval_rule_updated', 'approval_rule', req.params.id, undefined, {
            module: item.module,
            action: item.action,
            requiresApproval: item.requiresApproval,
            requiredApprovals: item.requiredApprovals,
            description: item.description,
        });
        res.json({ message: 'Approval rule updated', item: populatedItem || item });
    }
    catch (error) {
        console.error('teamUpdateApprovalRule error:', error);
        res.status(500).json({ message: 'Failed to update approval rule' });
    }
}
async function teamDeleteApprovalRule(req, res) {
    try {
        await TeamApprovalRule_1.default.deleteOne({ _id: asObjectId(req.params.id) });
        await writeAudit(req, 'approval_rule_deleted', 'approval_rule', req.params.id);
        res.json({ message: 'Approval rule deleted' });
    }
    catch (error) {
        console.error('teamDeleteApprovalRule error:', error);
        res.status(500).json({ message: 'Failed to delete approval rule' });
    }
}
async function teamGetActivity(req, res) {
    try {
        const actorId = String(req.query.actorId || '').trim();
        const module = String(req.query.module || '').trim();
        const action = String(req.query.action || '').trim();
        const filter = {};
        if (actorId && mongoose_1.default.Types.ObjectId.isValid(actorId))
            filter.actorId = asObjectId(actorId);
        if (module)
            filter.module = module;
        if (action)
            filter.action = action;
        const items = await TeamAuditLog_1.default.find(filter)
            .populate('actorId', 'full_name username email role')
            .sort({ createdAt: -1 })
            .limit(300)
            .lean();
        res.json({ items });
    }
    catch (error) {
        console.error('teamGetActivity error:', error);
        res.status(500).json({ message: 'Failed to load activity logs' });
    }
}
async function teamGetActivityById(req, res) {
    try {
        const item = await TeamAuditLog_1.default.findById(req.params.id).populate('actorId', 'full_name username email role').lean();
        if (!item) {
            res.status(404).json({ message: 'Activity log not found' });
            return;
        }
        res.json({ item });
    }
    catch (error) {
        console.error('teamGetActivityById error:', error);
        res.status(500).json({ message: 'Failed to load activity log' });
    }
}
async function teamGetSecurityOverview(_req, res) {
    try {
        const members = await User_1.default.find({ role: { $in: TEAM_USER_ROLES } })
            .select('_id full_name email status forcePasswordResetRequired twoFactorEnabled loginAttempts lastLoginAtUTC')
            .sort({ updatedAt: -1 })
            .lean();
        res.json({
            items: members,
            summary: {
                total: members.length,
                suspended: members.filter((m) => m.status === 'suspended').length,
                resetRequired: members.filter((m) => m.forcePasswordResetRequired).length,
                twoFactorEnabled: members.filter((m) => m.twoFactorEnabled).length,
            },
        });
    }
    catch (error) {
        console.error('teamGetSecurityOverview error:', error);
        res.status(500).json({ message: 'Failed to load security overview' });
    }
}
async function teamGetInvites(_req, res) {
    try {
        const items = await TeamInvite_1.default.find({})
            .populate('roleId', 'name slug')
            .populate('invitedBy', 'full_name username')
            .sort({ createdAt: -1 })
            .limit(300)
            .lean();
        res.json({ items });
    }
    catch (error) {
        console.error('teamGetInvites error:', error);
        res.status(500).json({ message: 'Failed to load invites' });
    }
}
//# sourceMappingURL=teamAccessController.js.map