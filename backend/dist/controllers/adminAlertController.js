"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGetActionableAlerts = adminGetActionableAlerts;
exports.adminMarkActionableAlertsRead = adminMarkActionableAlertsRead;
exports.adminGetActionableAlertsUnreadCount = adminGetActionableAlertsUnreadCount;
exports.adminMarkSingleActionableAlertRead = adminMarkSingleActionableAlertRead;
exports.adminMarkAllActionableAlertsRead = adminMarkAllActionableAlertsRead;
const adminAlertService_1 = require("../services/adminAlertService");
function ensureAlertAdmin(req, res) {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return null;
    }
    if (!['superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'].includes(req.user.role)) {
        res.status(403).json({ message: 'Admin access required' });
        return null;
    }
    return req.user.role;
}
async function adminGetActionableAlerts(req, res) {
    try {
        const role = ensureAlertAdmin(req, res);
        if (!role || !req.user)
            return;
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
        const result = await (0, adminAlertService_1.queryAdminAlerts)({
            userId: req.user._id,
            role,
            page,
            limit,
            unread: String(req.query.filter || '').trim().toLowerCase() === 'unread',
            type: String(req.query.type || '').trim(),
        });
        res.json(result);
    }
    catch (error) {
        console.error('adminGetActionableAlerts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminMarkActionableAlertsRead(req, res) {
    try {
        const role = ensureAlertAdmin(req, res);
        if (!role || !req.user)
            return;
        const idsRaw = Array.isArray(req.body.ids)
            ? req.body.ids
            : [];
        const ids = idsRaw.map((id) => String(id || '').trim()).filter(Boolean);
        const result = await (0, adminAlertService_1.markAdminAlertsRead)(req.user._id, ids, role);
        res.json(result);
    }
    catch (error) {
        console.error('adminMarkActionableAlertsRead error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminGetActionableAlertsUnreadCount(req, res) {
    try {
        const role = ensureAlertAdmin(req, res);
        if (!role || !req.user)
            return;
        const result = await (0, adminAlertService_1.countAdminUnreadAlerts)(req.user._id, role, String(req.query.type || '').trim());
        res.json(result);
    }
    catch (error) {
        console.error('adminGetActionableAlertsUnreadCount error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminMarkSingleActionableAlertRead(req, res) {
    try {
        const role = ensureAlertAdmin(req, res);
        if (!role || !req.user)
            return;
        const result = await (0, adminAlertService_1.markAdminAlertsRead)(req.user._id, [String(req.params.id || '').trim()], role);
        res.json(result);
    }
    catch (error) {
        console.error('adminMarkSingleActionableAlertRead error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
async function adminMarkAllActionableAlertsRead(req, res) {
    try {
        const role = ensureAlertAdmin(req, res);
        if (!role || !req.user)
            return;
        const result = await (0, adminAlertService_1.markAdminAlertsRead)(req.user._id, [], role);
        res.json(result);
    }
    catch (error) {
        console.error('adminMarkAllActionableAlertsRead error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
//# sourceMappingURL=adminAlertController.js.map