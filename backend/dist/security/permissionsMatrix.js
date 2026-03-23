"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_PERMISSION_BRIDGE = exports.ROLE_PERMISSION_MATRIX = exports.PERMISSION_ACTIONS = exports.PERMISSION_MODULES = void 0;
exports.hasRolePermission = hasRolePermission;
exports.hasLegacyPermissionBridge = hasLegacyPermissionBridge;
exports.hasPermissionsV2Override = hasPermissionsV2Override;
exports.permissionMatrixToMarkdown = permissionMatrixToMarkdown;
exports.PERMISSION_MODULES = [
    'site_settings',
    'home_control',
    'banner_manager',
    'universities',
    'news',
    'exams',
    'question_bank',
    'students_groups',
    'subscription_plans',
    'payments',
    'finance_center',
    'resources',
    'support_center',
    'notifications',
    'reports_analytics',
    'security_logs',
    'team_access_control',
];
exports.PERMISSION_ACTIONS = [
    'view',
    'create',
    'edit',
    'delete',
    'publish',
    'approve',
    'export',
    'bulk',
];
function emptyModuleMap() {
    return exports.PERMISSION_MODULES.reduce((acc, moduleName) => {
        acc[moduleName] = [];
        return acc;
    }, {});
}
function allow(base, moduleName, actions) {
    base[moduleName] = [...new Set([...(base[moduleName] || []), ...actions])];
    return base;
}
function allowMany(base, modules, actions) {
    modules.forEach((moduleName) => {
        allow(base, moduleName, actions);
    });
    return base;
}
const ALL_ACTIONS = [...exports.PERMISSION_ACTIONS];
const CONTENT_MODULES = [
    'home_control',
    'banner_manager',
    'universities',
    'news',
    'exams',
    'question_bank',
    'resources',
];
const ADMIN_MODULES = [
    ...CONTENT_MODULES,
    'site_settings',
    'students_groups',
    'subscription_plans',
    'payments',
    'finance_center',
    'support_center',
    'notifications',
    'reports_analytics',
    'security_logs',
    'team_access_control',
];
const roleMatrixBase = {
    superadmin: allowMany(emptyModuleMap(), ADMIN_MODULES, ALL_ACTIONS),
    admin: (() => {
        const map = emptyModuleMap();
        allowMany(map, ADMIN_MODULES, ['view', 'create', 'edit', 'publish', 'approve', 'export', 'bulk']);
        allowMany(map, ['universities', 'news', 'exams', 'question_bank', 'students_groups', 'resources'], ['delete']);
        return map;
    })(),
    moderator: (() => {
        const map = emptyModuleMap();
        allowMany(map, CONTENT_MODULES, ['view', 'create', 'edit', 'publish', 'export']);
        allowMany(map, ['news', 'question_bank', 'exams'], ['approve', 'bulk']);
        allow(map, 'students_groups', ['view', 'edit', 'bulk']);
        allow(map, 'support_center', ['view', 'edit']);
        allow(map, 'notifications', ['view', 'create', 'edit', 'publish', 'export']);
        allow(map, 'reports_analytics', ['view', 'export']);
        return map;
    })(),
    editor: (() => {
        const map = emptyModuleMap();
        allowMany(map, ['news', 'resources', 'question_bank'], ['view', 'create', 'edit', 'export']);
        allow(map, 'home_control', ['view', 'edit']);
        allow(map, 'universities', ['view']);
        allow(map, 'exams', ['view']);
        allow(map, 'notifications', ['view', 'create', 'edit']);
        return map;
    })(),
    viewer: (() => {
        const map = emptyModuleMap();
        allowMany(map, ADMIN_MODULES, ['view']);
        return map;
    })(),
    support_agent: (() => {
        const map = emptyModuleMap();
        allow(map, 'support_center', ['view', 'create', 'edit', 'approve', 'export']);
        allow(map, 'reports_analytics', ['view']);
        return map;
    })(),
    finance_agent: (() => {
        const map = emptyModuleMap();
        allow(map, 'payments', ['view', 'create', 'edit', 'approve', 'export', 'bulk']);
        allow(map, 'finance_center', ['view', 'create', 'edit', 'approve', 'export', 'bulk']);
        allow(map, 'reports_analytics', ['view', 'export']);
        return map;
    })(),
    chairman: (() => {
        const map = emptyModuleMap();
        allow(map, 'reports_analytics', ['view', 'export']);
        allow(map, 'security_logs', ['view']);
        return map;
    })(),
    student: emptyModuleMap(),
};
exports.ROLE_PERMISSION_MATRIX = roleMatrixBase;
exports.LEGACY_PERMISSION_BRIDGE = {
    exams: {
        view: 'canEditExams',
        create: 'canEditExams',
        edit: 'canEditExams',
        publish: 'canEditExams',
        approve: 'canEditExams',
        bulk: 'canEditExams',
        delete: 'canDeleteData',
    },
    question_bank: {
        view: 'canEditExams',
        create: 'canEditExams',
        edit: 'canEditExams',
        approve: 'canEditExams',
        bulk: 'canEditExams',
        export: 'canEditExams',
        delete: 'canDeleteData',
    },
    students_groups: {
        view: 'canManageStudents',
        create: 'canManageStudents',
        edit: 'canManageStudents',
        delete: 'canManageStudents',
        bulk: 'canManageStudents',
        export: 'canManageStudents',
        approve: 'canManageStudents',
    },
    payments: {
        view: 'canManageFinance',
        create: 'canManageFinance',
        edit: 'canManageFinance',
        delete: 'canManageFinance',
        approve: 'canManageFinance',
        export: 'canManageFinance',
        bulk: 'canManageFinance',
    },
    finance_center: {
        view: 'canManageFinance',
        create: 'canManageFinance',
        edit: 'canManageFinance',
        delete: 'canManageFinance',
        approve: 'canManageFinance',
        export: 'canManageFinance',
        bulk: 'canManageFinance',
    },
    subscription_plans: {
        view: 'canManagePlans',
        create: 'canManagePlans',
        edit: 'canManagePlans',
        delete: 'canManagePlans',
        approve: 'canManagePlans',
        export: 'canManagePlans',
        bulk: 'canManagePlans',
    },
    support_center: {
        view: 'canManageTickets',
        create: 'canManageTickets',
        edit: 'canManageTickets',
        approve: 'canManageTickets',
        export: 'canManageTickets',
        bulk: 'canManageTickets',
        delete: 'canManageTickets',
    },
    reports_analytics: {
        view: 'canViewReports',
        export: 'canViewReports',
    },
    security_logs: {
        view: 'canViewReports',
    },
    site_settings: {
        delete: 'canDeleteData',
    },
    home_control: {
        delete: 'canDeleteData',
    },
    banner_manager: {
        delete: 'canDeleteData',
    },
    universities: {
        delete: 'canDeleteData',
    },
    news: {
        delete: 'canDeleteData',
    },
    resources: {
        delete: 'canDeleteData',
    },
};
function hasRolePermission(role, moduleName, action) {
    const moduleMap = exports.ROLE_PERMISSION_MATRIX[role];
    if (!moduleMap)
        return false;
    return moduleMap[moduleName].includes(action);
}
function hasLegacyPermissionBridge(permissions, moduleName, action) {
    const moduleBridge = exports.LEGACY_PERMISSION_BRIDGE[moduleName];
    if (!moduleBridge)
        return null;
    const bridgeKey = moduleBridge[action];
    if (!bridgeKey)
        return null;
    return Boolean(permissions?.[bridgeKey]);
}
function hasPermissionsV2Override(permissionsV2, moduleName, action) {
    if (!permissionsV2 || typeof permissionsV2 !== 'object')
        return null;
    const moduleEntry = permissionsV2[moduleName];
    if (!moduleEntry || typeof moduleEntry !== 'object')
        return null;
    const value = moduleEntry[action];
    if (typeof value !== 'boolean')
        return null;
    return value;
}
function actionAllowed(actions, action) {
    if (actions.includes(action))
        return 'Y';
    return '-';
}
const ACTION_LABELS = {
    view: 'V',
    create: 'C',
    edit: 'E',
    delete: 'D',
    publish: 'P',
    approve: 'A',
    export: 'X',
    bulk: 'B',
};
function permissionMatrixToMarkdown() {
    const headers = ['Role', ...exports.PERMISSION_MODULES.map((moduleName) => moduleName)];
    const rows = Object.entries(exports.ROLE_PERMISSION_MATRIX).map(([role, moduleMap]) => {
        const cells = exports.PERMISSION_MODULES.map((moduleName) => {
            const actions = moduleMap[moduleName];
            const compact = exports.PERMISSION_ACTIONS
                .map((action) => `${ACTION_LABELS[action]}:${actionAllowed(actions, action)}`)
                .join(' ');
            return `\`${compact}\``;
        });
        return [`\`${role}\``, ...cells];
    });
    const headerLine = `| ${headers.join(' | ')} |`;
    const divider = `| ${headers.map(() => '---').join(' | ')} |`;
    const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
    return `${headerLine}\n${divider}\n${body}`;
}
//# sourceMappingURL=permissionsMatrix.js.map