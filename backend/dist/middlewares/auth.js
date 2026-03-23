"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.authorize = authorize;
exports.forbidden = forbidden;
exports.requireRole = requireRole;
exports.requireAnyRole = requireAnyRole;
exports.requireAuthStudent = requireAuthStudent;
exports.requireActiveSubscription = requireActiveSubscription;
exports.authorizePermission = authorizePermission;
exports.requirePermission = requirePermission;
exports.checkOwnership = checkOwnership;
exports.auditMiddleware = auditMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const ActiveSession_1 = __importDefault(require("../models/ActiveSession"));
const User_1 = __importDefault(require("../models/User"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const securityConfigService_1 = require("../services/securityConfigService");
const permissionsMatrix_1 = require("../security/permissionsMatrix");
function decodeAndAttach(req, token) {
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = { ...decoded, id: decoded._id };
}
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    // EventSource cannot set custom Authorization headers.
    const accepts = String(req.headers.accept || '');
    const isSseRequest = accepts.includes('text/event-stream');
    if (isSseRequest) {
        const queryToken = req.query.token;
        if (typeof queryToken === 'string' && queryToken.trim()) {
            return queryToken.trim();
        }
    }
    return null;
}
// Debounce last_activity updates (max once per 60s per session)
const lastActivityUpdateMap = new Map();
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function authenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    try {
        decodeAndAttach(req, token);
        const sessionId = req.user?.sessionId;
        if (sessionId) {
            Promise.all([
                ActiveSession_1.default.findOne({ session_id: sessionId, status: 'active' }).lean(),
                (0, securityConfigService_1.getSecurityConfig)(true).catch(() => null),
            ])
                .then(([session, security]) => {
                if (!session) {
                    res.status(401).json({
                        message: 'Session invalidated. You have been logged out.',
                        code: 'SESSION_INVALIDATED',
                    });
                    return;
                }
                if (security?.session?.idleTimeoutMinutes) {
                    const lastActivity = new Date(String(session.last_activity || session.updatedAt || new Date()));
                    const idleMs = Date.now() - lastActivity.getTime();
                    const maxIdleMs = Math.max(5, Number(security.session.idleTimeoutMinutes)) * 60 * 1000;
                    if (idleMs > maxIdleMs) {
                        ActiveSession_1.default.updateOne({ session_id: sessionId, status: 'active' }, {
                            $set: {
                                status: 'terminated',
                                terminated_reason: 'session_idle_timeout',
                                terminated_at: new Date(),
                                termination_meta: { trigger: 'idle_timeout' },
                            },
                        }).catch(() => { });
                        res.status(401).json({
                            message: 'Session expired due to inactivity. Please login again.',
                            code: 'SESSION_IDLE_TIMEOUT',
                        });
                        return;
                    }
                }
                if (security?.strictTokenHashValidation) {
                    const tokenHash = hashToken(token);
                    if (!session.jwt_token_hash || session.jwt_token_hash !== tokenHash) {
                        res.status(401).json({
                            message: 'Session invalidated. Please login again.',
                            code: 'SESSION_INVALIDATED',
                        });
                        return;
                    }
                }
                const now = Date.now();
                const lastUpdate = lastActivityUpdateMap.get(sessionId) || 0;
                if (now - lastUpdate > 60000) {
                    lastActivityUpdateMap.set(sessionId, now);
                    ActiveSession_1.default.updateOne({ session_id: sessionId }, { $set: { last_activity: new Date() } }).catch(() => { });
                }
                next();
            })
                .catch(() => {
                // Graceful degradation if session store is unavailable.
                next();
            });
            return;
        }
        // Legacy tokens without sessionId are temporarily allowed via security toggle.
        (0, securityConfigService_1.getSecurityConfig)(true)
            .then((security) => {
            const mustRejectLegacy = (security.singleBrowserLogin &&
                security.forceLogoutOnNewLogin &&
                !security.allowLegacyTokens);
            if (mustRejectLegacy) {
                res.status(401).json({
                    message: 'Legacy token is no longer allowed. Please login again.',
                    code: 'LEGACY_TOKEN_NOT_ALLOWED',
                });
                return;
            }
            next();
        })
            .catch(() => {
            // Graceful degradation on settings lookup failure.
            next();
        });
    }
    catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
}
exports.requireAuth = authenticate;
function optionalAuthenticate(req, _res, next) {
    const token = extractToken(req);
    if (!token) {
        next();
        return;
    }
    try {
        decodeAndAttach(req, token);
    }
    catch {
        // Silent fallback for optional auth: invalid tokens should not block public routes.
    }
    next();
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            forbidden(res, {
                message: 'Insufficient permissions',
            });
            return;
        }
        next();
    };
}
function forbidden(res, payload = {}) {
    res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: payload.message || 'You do not have permission to perform this action.',
        ...(payload.module ? { module: payload.module } : {}),
        ...(payload.action ? { action: payload.action } : {}),
    });
}
function requireRole(...roles) {
    return authorize(...roles);
}
function requireAnyRole(...roles) {
    return authorize(...roles);
}
function requireAuthStudent(req, res, next) {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'student') {
        forbidden(res, { message: 'Student access only' });
        return;
    }
    next();
}
function evaluateSubscriptionState(user) {
    if (String(user.role || '') !== 'student') {
        return { allowed: false, reason: 'not_student', expiryDate: null };
    }
    const subscription = user.subscription || {};
    const hasPlanIdentity = Boolean(subscription.plan || subscription.planCode || subscription.planName);
    if (!hasPlanIdentity) {
        return { allowed: false, reason: 'missing', expiryDate: null };
    }
    const isActive = subscription.isActive === true;
    const expiryDate = subscription.expiryDate ? new Date(subscription.expiryDate) : null;
    if (!isActive) {
        return { allowed: false, reason: 'inactive', expiryDate };
    }
    if (!expiryDate || Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() < Date.now()) {
        return { allowed: false, reason: 'expired', expiryDate };
    }
    return { allowed: true, reason: 'inactive', expiryDate };
}
async function requireActiveSubscription(req, res, next) {
    try {
        if (!req.user?._id) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const [user, activeSubscription, latestSubscription] = await Promise.all([
            User_1.default.findById(req.user._id).select('role subscription').lean(),
            UserSubscription_1.default.findOne({
                userId: req.user._id,
                status: 'active',
                expiresAtUTC: { $gt: new Date() },
            })
                .select('expiresAtUTC')
                .lean(),
            UserSubscription_1.default.findOne({ userId: req.user._id })
                .sort({ expiresAtUTC: -1, updatedAt: -1, createdAt: -1 })
                .select('status expiresAtUTC')
                .lean(),
        ]);
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (activeSubscription) {
            next();
            return;
        }
        const gate = evaluateSubscriptionState(user);
        const canonicalExpiryDate = latestSubscription?.expiresAtUTC ? new Date(latestSubscription.expiresAtUTC) : null;
        const canonicalReason = latestSubscription
            ? (String(latestSubscription.status || '') === 'active' ? 'expired' : 'inactive')
            : gate.reason;
        const finalReason = gate.reason === 'missing' && latestSubscription ? canonicalReason : gate.reason;
        const finalExpiryDate = gate.expiryDate || canonicalExpiryDate;
        if (!gate.allowed) {
            const expiryLabel = finalExpiryDate ? finalExpiryDate.toISOString() : null;
            res.status(403).json({
                subscriptionRequired: true,
                reason: finalReason,
                expiryDate: expiryLabel,
                message: finalReason === 'expired'
                    ? `Your subscription has expired${expiryLabel ? ` on ${expiryLabel}` : ''}.`
                    : 'Active subscription required to access exams.',
            });
            return;
        }
        next();
    }
    catch {
        res.status(500).json({ message: 'Unable to validate subscription state' });
    }
}
function authorizePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (req.user.role === 'superadmin') {
            next();
            return;
        }
        if (!req.user.permissions?.[permission]) {
            forbidden(res, { message: `Permission denied: ${permission}` });
            return;
        }
        next();
    };
}
function requirePermission(moduleName, action) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const role = req.user.role;
        if (role === 'superadmin') {
            next();
            return;
        }
        const permissionsV2Override = (0, permissionsMatrix_1.hasPermissionsV2Override)(req.user.permissionsV2, moduleName, action);
        if (permissionsV2Override === true) {
            next();
            return;
        }
        if (permissionsV2Override === false) {
            forbidden(res, {
                message: `You are not allowed to ${action} ${moduleName}.`,
                module: moduleName,
                action,
            });
            return;
        }
        if ((0, permissionsMatrix_1.hasRolePermission)(role, moduleName, action)) {
            next();
            return;
        }
        const legacyBridge = (0, permissionsMatrix_1.hasLegacyPermissionBridge)(req.user.permissions, moduleName, action);
        if (legacyBridge === true) {
            next();
            return;
        }
        forbidden(res, {
            message: `You are not allowed to ${action} ${moduleName}.`,
            module: moduleName,
            action,
        });
    };
}
function checkOwnership(req, res, next) {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (['superadmin', 'admin', 'moderator'].includes(req.user.role)) {
        next();
        return;
    }
    if (req.params.id && req.params.id !== req.user._id.toString()) {
        forbidden(res, { message: 'You can only modify your own data.' });
        return;
    }
    next();
}
function auditMiddleware(actionName) {
    return async (req, res, next) => {
        if (req.user && ['superadmin', 'admin', 'moderator', 'editor'].includes(req.user.role)) {
            AuditLog_1.default.create({
                actor_id: req.user._id,
                actor_role: req.user.role,
                action: actionName,
                target_id: req.params.id || req.body.id || undefined,
                target_type: req.baseUrl.split('/').pop() || 'system',
                ip_address: req.ip,
                details: {
                    method: req.method,
                    path: req.originalUrl,
                },
            }).catch((err) => console.error('AuditLog Error:', err));
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map