"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Settings_1 = __importDefault(require("../models/Settings"));
const User_1 = __importDefault(require("../models/User"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const ExpenseEntry_1 = __importDefault(require("../models/ExpenseEntry"));
const StaffPayout_1 = __importDefault(require("../models/StaffPayout"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const AnnouncementNotice_1 = __importDefault(require("../models/AnnouncementNotice"));
const CredentialVault_1 = __importDefault(require("../models/CredentialVault"));
const BackupJob_1 = __importDefault(require("../models/BackupJob"));
dotenv_1.default.config();
async function runMigration() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }
    await mongoose_1.default.connect(uri);
    console.log('[migrate:finance-v1] connected');
    await Promise.all([
        ManualPayment_1.default.createCollection().catch(() => null),
        ExpenseEntry_1.default.createCollection().catch(() => null),
        StaffPayout_1.default.createCollection().catch(() => null),
        StudentDueLedger_1.default.createCollection().catch(() => null),
        SupportTicket_1.default.createCollection().catch(() => null),
        AnnouncementNotice_1.default.createCollection().catch(() => null),
        CredentialVault_1.default.createCollection().catch(() => null),
        BackupJob_1.default.createCollection().catch(() => null),
    ]);
    const users = await User_1.default.find().select('_id role permissions');
    for (const user of users) {
        const p = user.permissions || {};
        let changed = false;
        if (p.canManageFinance === undefined) {
            p.canManageFinance = user.role === 'superadmin' || user.role === 'admin';
            changed = true;
        }
        if (p.canManagePlans === undefined) {
            p.canManagePlans = user.role === 'superadmin' || user.role === 'admin';
            changed = true;
        }
        if (p.canManageTickets === undefined) {
            p.canManageTickets = ['superadmin', 'admin', 'moderator'].includes(user.role);
            changed = true;
        }
        if (p.canManageBackups === undefined) {
            p.canManageBackups = user.role === 'superadmin' || user.role === 'admin';
            changed = true;
        }
        if (p.canRevealPasswords === undefined) {
            p.canRevealPasswords = user.role === 'superadmin';
            changed = true;
        }
        if (changed) {
            user.permissions = p;
            await user.save();
        }
    }
    await Settings_1.default.findOneAndUpdate({}, {
        $setOnInsert: {
            featureFlags: {
                studentRegistrationEnabled: false,
                financeDashboardV1: false,
                smsReminderEnabled: false,
                emailReminderEnabled: true,
                backupS3MirrorEnabled: false,
                nextAdminEnabled: false,
                nextStudentEnabled: false,
            },
        },
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log('[migrate:finance-v1] completed');
    await mongoose_1.default.disconnect();
}
runMigration().catch(async (error) => {
    console.error('[migrate:finance-v1] failed:', error);
    await mongoose_1.default.disconnect();
    process.exit(1);
});
//# sourceMappingURL=migrate-finance-dashboard-v1.js.map