"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminSecuritySettings = getAdminSecuritySettings;
exports.updateAdminSecuritySettings = updateAdminSecuritySettings;
exports.resetAdminSecuritySettings = resetAdminSecuritySettings;
exports.forceLogoutAllUsers = forceLogoutAllUsers;
exports.lockAdminPanel = lockAdminPanel;
exports.getPublicSecurityConfigController = getPublicSecurityConfigController;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const securityCenterService_1 = require("../services/securityCenterService");
const securityConfigService_1 = require("../services/securityConfigService");
const sessionSecurityService_1 = require("../services/sessionSecurityService");
const requestMeta_1 = require("../utils/requestMeta");
const ALLOWED_ROOT_KEYS = [
    'passwordPolicy',
    'loginProtection',
    'session',
    'adminAccess',
    'siteAccess',
    'examProtection',
    'logging',
    'twoPersonApproval',
    'retention',
    'panic',
    'rateLimit',
    'authentication',
    'passwordPolicies',
    'twoFactor',
    'sessions',
    'accessControl',
    'verificationRecovery',
    'uploadSecurity',
    'alerting',
    'exportSecurity',
    'backupRestore',
    'runtimeGuards',
];
function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function validateUpdatePayload(payload) {
    if (!isObject(payload))
        return 'Payload must be an object.';
    const unknownRoot = Object.keys(payload).filter((key) => !ALLOWED_ROOT_KEYS.includes(key));
    if (unknownRoot.length) {
        return `Unknown settings sections: ${unknownRoot.join(', ')}`;
    }
    const defaults = (0, securityCenterService_1.getDefaultSecuritySettings)();
    for (const [section, value] of Object.entries(payload)) {
        if (!isObject(value))
            return `${section} must be an object`;
        const sectionDefaults = defaults[section];
        const unknownFields = Object.keys(value).filter((key) => !(key in sectionDefaults));
        if (unknownFields.length) {
            return `Unknown fields for ${section}: ${unknownFields.join(', ')}`;
        }
    }
    return null;
}
async function logSecurityAudit(req, action, details) {
    if (!req.user?._id)
        return;
    await AuditLog_1.default.create({
        actor_id: req.user._id,
        actor_role: req.user.role,
        action,
        target_type: 'security_settings',
        ip_address: (0, requestMeta_1.getClientIp)(req),
        details,
    });
}
async function getAdminSecuritySettings(_req, res) {
    try {
        const settings = await (0, securityCenterService_1.getSecuritySettingsSnapshot)(true);
        res.json({ settings });
    }
    catch (error) {
        console.error('getAdminSecuritySettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function updateAdminSecuritySettings(req, res) {
    try {
        const payload = req.body;
        const validation = validateUpdatePayload(payload);
        if (validation) {
            res.status(400).json({ message: validation });
            return;
        }
        const before = await (0, securityCenterService_1.getSecuritySettingsSnapshot)(true);
        const updated = await (0, securityCenterService_1.updateSecuritySettingsSnapshot)(payload, req.user?._id);
        (0, securityConfigService_1.invalidateSecurityConfigCache)();
        await logSecurityAudit(req, 'security_settings_updated', {
            before,
            after: updated,
        });
        res.json({ message: 'Security settings updated', settings: updated });
    }
    catch (error) {
        console.error('updateAdminSecuritySettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function resetAdminSecuritySettings(req, res) {
    try {
        const before = await (0, securityCenterService_1.getSecuritySettingsSnapshot)(true);
        const settings = await (0, securityCenterService_1.resetSecuritySettingsToDefault)(req.user?._id);
        (0, securityConfigService_1.invalidateSecurityConfigCache)();
        await logSecurityAudit(req, 'security_settings_reset', {
            before,
            after: settings,
        });
        res.json({ message: 'Security settings reset to defaults', settings });
    }
    catch (error) {
        console.error('resetAdminSecuritySettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function forceLogoutAllUsers(req, res) {
    try {
        const reason = String(req.body?.reason || 'security_center_force_logout').trim() || 'security_center_force_logout';
        const terminated = await (0, sessionSecurityService_1.terminateSessions)({
            filter: {},
            reason,
            initiatedBy: req.user?._id,
            meta: { trigger: 'security_center_force_logout_all' },
        });
        await logSecurityAudit(req, 'security_force_logout_all', {
            reason,
            terminatedCount: terminated.terminatedCount,
            terminatedAt: terminated.terminatedAt,
        });
        res.json({
            message: 'Force logout executed for all active sessions',
            terminatedCount: terminated.terminatedCount,
            terminatedAt: terminated.terminatedAt,
        });
    }
    catch (error) {
        console.error('forceLogoutAllUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function lockAdminPanel(req, res) {
    try {
        if (typeof req.body?.adminPanelEnabled !== 'boolean') {
            res.status(400).json({ message: 'adminPanelEnabled must be boolean' });
            return;
        }
        const enabled = Boolean(req.body?.adminPanelEnabled);
        const settings = await (0, securityCenterService_1.updateSecuritySettingsSnapshot)({
            adminAccess: {
                adminPanelEnabled: enabled,
            },
        }, req.user?._id);
        (0, securityConfigService_1.invalidateSecurityConfigCache)();
        await logSecurityAudit(req, 'security_admin_panel_toggle', { adminPanelEnabled: enabled });
        res.json({
            message: enabled ? 'Admin panel unlocked' : 'Admin panel locked',
            settings,
        });
    }
    catch (error) {
        console.error('lockAdminPanel error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function getPublicSecurityConfigController(_req, res) {
    try {
        const config = await (0, securityCenterService_1.getPublicSecurityConfig)(true);
        res.json(config);
    }
    catch (error) {
        console.error('getPublicSecurityConfigController error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=securityCenterController.js.map