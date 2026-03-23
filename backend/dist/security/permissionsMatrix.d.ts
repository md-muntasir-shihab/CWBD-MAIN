import { IUserPermissions, IUserPermissionsV2, UserRole } from '../models/User';
export declare const PERMISSION_MODULES: readonly ["site_settings", "home_control", "banner_manager", "universities", "news", "exams", "question_bank", "students_groups", "subscription_plans", "payments", "finance_center", "resources", "support_center", "notifications", "reports_analytics", "security_logs", "team_access_control"];
export declare const PERMISSION_ACTIONS: readonly ["view", "create", "edit", "delete", "publish", "approve", "export", "bulk"];
export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type ModulePermissionMap = Record<PermissionModule, PermissionAction[]>;
export type RolePermissionMatrix = Record<UserRole, ModulePermissionMap>;
export declare const ROLE_PERMISSION_MATRIX: RolePermissionMatrix;
export declare const LEGACY_PERMISSION_BRIDGE: Partial<Record<PermissionModule, Partial<Record<PermissionAction, keyof IUserPermissions>>>>;
export declare function hasRolePermission(role: UserRole, moduleName: PermissionModule, action: PermissionAction): boolean;
export declare function hasLegacyPermissionBridge(permissions: Partial<IUserPermissions> | undefined, moduleName: PermissionModule, action: PermissionAction): boolean | null;
export declare function hasPermissionsV2Override(permissionsV2: IUserPermissionsV2 | undefined, moduleName: PermissionModule, action: PermissionAction): boolean | null;
export declare function permissionMatrixToMarkdown(): string;
//# sourceMappingURL=permissionsMatrix.d.ts.map