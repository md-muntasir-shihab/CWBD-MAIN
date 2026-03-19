"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRunBackup = adminRunBackup;
exports.adminListBackups = adminListBackups;
exports.adminDownloadBackup = adminDownloadBackup;
exports.adminRestoreBackup = adminRestoreBackup;
const crypto_1 = require("crypto");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const BackupJob_1 = __importDefault(require("../models/BackupJob"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const AnnouncementNotice_1 = __importDefault(require("../models/AnnouncementNotice"));
const ExpenseEntry_1 = __importDefault(require("../models/ExpenseEntry"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const StaffPayout_1 = __importDefault(require("../models/StaffPayout"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const User_1 = __importDefault(require("../models/User"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const requestMeta_1 = require("../utils/requestMeta");
const DEFAULT_BACKUP_DIR = path_1.default.resolve(process.cwd(), 'backup-snapshots');
function asObjectId(value) {
    const raw = String(value || '').trim();
    if (!raw || !mongoose_1.default.Types.ObjectId.isValid(raw))
        return null;
    return new mongoose_1.default.Types.ObjectId(raw);
}
function getBackupDir() {
    return process.env.BACKUP_DIR ? path_1.default.resolve(process.env.BACKUP_DIR) : DEFAULT_BACKUP_DIR;
}
function safeBaseName(input) {
    return input.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}
function toCompactTimestamp(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime()))
        return String(Date.now());
    return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}
function buildBackupDownloadName(item, filePath) {
    const ext = path_1.default.extname(filePath) || '.json';
    const type = safeBaseName(String(item.type || 'full').toLowerCase());
    const timestamp = toCompactTimestamp(item.createdAt);
    return safeBaseName(`campusway-backup-${type}-${timestamp}${ext}`);
}
async function createAudit(req, action, details) {
    if (!req.user || !mongoose_1.default.Types.ObjectId.isValid(req.user._id))
        return;
    await AuditLog_1.default.create({
        actor_id: new mongoose_1.default.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'backup',
        ip_address: (0, requestMeta_1.getClientIp)(req),
        details: details || {},
    });
}
async function buildBackupSnapshot(type) {
    const now = new Date();
    const [users, profiles, plans, payments, expenses, payouts, dues, tickets, notices,] = await Promise.all([
        User_1.default.find().lean(),
        StudentProfile_1.default.find().lean(),
        SubscriptionPlan_1.default.find().lean(),
        ManualPayment_1.default.find().lean(),
        ExpenseEntry_1.default.find().lean(),
        StaffPayout_1.default.find().lean(),
        StudentDueLedger_1.default.find().lean(),
        SupportTicket_1.default.find().lean(),
        AnnouncementNotice_1.default.find().lean(),
    ]);
    return {
        metadata: {
            generatedAt: now.toISOString(),
            type,
            mongoDatabase: mongoose_1.default.connection.name,
            collectionCounts: {
                users: users.length,
                studentProfiles: profiles.length,
                subscriptionPlans: plans.length,
                manualPayments: payments.length,
                expenses: expenses.length,
                staffPayouts: payouts.length,
                dueLedgers: dues.length,
                supportTickets: tickets.length,
                notices: notices.length,
            },
        },
        data: {
            users,
            studentProfiles: profiles,
            subscriptionPlans: plans,
            manualPayments: payments,
            expenses,
            staffPayouts: payouts,
            dueLedgers: dues,
            supportTickets: tickets,
            notices,
        },
    };
}
function checksum(content) {
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}
async function adminRunBackup(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const requestedBy = asObjectId(req.user._id);
        if (!requestedBy) {
            res.status(400).json({ message: 'Invalid actor id' });
            return;
        }
        const body = req.body;
        const typeRaw = String(body.type || 'full').trim();
        const type = typeRaw === 'incremental' ? 'incremental' : 'full';
        const storageRaw = String(body.storage || 'local').trim();
        const storage = storageRaw === 's3' || storageRaw === 'both' ? storageRaw : 'local';
        const job = await BackupJob_1.default.create({
            type,
            storage,
            status: 'running',
            requestedBy,
        });
        try {
            const backupDir = getBackupDir();
            await promises_1.default.mkdir(backupDir, { recursive: true });
            const snapshot = await buildBackupSnapshot(type);
            const fileName = safeBaseName(`campusway-backup-${type}-${Date.now()}.json`);
            const filePath = path_1.default.join(backupDir, fileName);
            const serialized = JSON.stringify(snapshot);
            const digest = checksum(serialized);
            await promises_1.default.writeFile(filePath, serialized, 'utf8');
            job.status = 'completed';
            job.localPath = filePath;
            job.checksum = digest;
            job.restoreMeta = {
                generatedAt: snapshot.metadata.generatedAt,
                collectionCounts: snapshot.metadata.collectionCounts,
                warning: 'Restore is destructive and requires typed confirmation token.',
            };
            await job.save();
            await createAudit(req, 'backup_run_completed', {
                backupJobId: String(job._id),
                type,
                storage,
                localPath: filePath,
                checksum: digest,
            });
            res.status(201).json({
                message: 'Backup completed successfully',
                item: job,
            });
        }
        catch (error) {
            job.status = 'failed';
            job.error = error.message;
            await job.save();
            throw error;
        }
    }
    catch (error) {
        console.error('adminRunBackup error:', error);
        res.status(500).json({ message: 'Failed to run backup' });
    }
}
async function adminListBackups(req, res) {
    try {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.max(1, Math.min(200, Number(req.query.limit || 20)));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            BackupJob_1.default.find()
                .populate('requestedBy', 'username full_name role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BackupJob_1.default.countDocuments(),
        ]);
        res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    }
    catch (error) {
        console.error('adminListBackups error:', error);
        res.status(500).json({ message: 'Failed to load backup jobs' });
    }
}
async function adminDownloadBackup(req, res) {
    try {
        const item = await BackupJob_1.default.findById(req.params.id).lean();
        if (!item || !item.localPath) {
            res.status(404).json({ message: 'Backup file not found' });
            return;
        }
        const filePath = path_1.default.resolve(item.localPath);
        try {
            await promises_1.default.access(filePath);
        }
        catch {
            res.status(404).json({ message: 'Backup file is unavailable on disk' });
            return;
        }
        const downloadName = buildBackupDownloadName({ type: item.type, createdAt: item.createdAt }, filePath);
        res.download(filePath, downloadName);
    }
    catch (error) {
        console.error('adminDownloadBackup error:', error);
        res.status(500).json({ message: 'Failed to download backup file' });
    }
}
async function adminRestoreBackup(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const body = req.body;
        const confirmation = String(body.confirmation || '').trim();
        const expected = `RESTORE ${req.params.id}`;
        if (confirmation !== expected) {
            res.status(400).json({ message: `Invalid confirmation text. Use: ${expected}` });
            return;
        }
        const item = await BackupJob_1.default.findById(req.params.id);
        if (!item || !item.localPath) {
            res.status(404).json({ message: 'Backup job not found' });
            return;
        }
        const filePath = path_1.default.resolve(item.localPath);
        const content = await promises_1.default.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        const data = parsed.data || {};
        const requestedBy = asObjectId(req.user._id);
        if (!requestedBy) {
            res.status(400).json({ message: 'Invalid actor id' });
            return;
        }
        // pre-restore safety snapshot
        const preRestore = await BackupJob_1.default.create({
            type: 'full',
            storage: 'local',
            status: 'running',
            requestedBy,
            restoreMeta: {
                reason: 'auto_pre_restore_snapshot',
                sourceRestoreJobId: String(item._id),
            },
        });
        try {
            const backupDir = getBackupDir();
            await promises_1.default.mkdir(backupDir, { recursive: true });
            const snapshot = await buildBackupSnapshot('full');
            const preSerialized = JSON.stringify(snapshot);
            const prePath = path_1.default.join(backupDir, safeBaseName(`campusway-pre-restore-${Date.now()}.json`));
            await promises_1.default.writeFile(prePath, preSerialized, 'utf8');
            preRestore.status = 'completed';
            preRestore.localPath = prePath;
            preRestore.checksum = checksum(preSerialized);
            await preRestore.save();
        }
        catch (error) {
            preRestore.status = 'failed';
            preRestore.error = error.message;
            await preRestore.save();
            throw error;
        }
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            await Promise.all([
                User_1.default.deleteMany({}, { session }),
                StudentProfile_1.default.deleteMany({}, { session }),
                SubscriptionPlan_1.default.deleteMany({}, { session }),
                ManualPayment_1.default.deleteMany({}, { session }),
                ExpenseEntry_1.default.deleteMany({}, { session }),
                StaffPayout_1.default.deleteMany({}, { session }),
                StudentDueLedger_1.default.deleteMany({}, { session }),
                SupportTicket_1.default.deleteMany({}, { session }),
                AnnouncementNotice_1.default.deleteMany({}, { session }),
            ]);
            if (Array.isArray(data.users) && data.users.length > 0) {
                await User_1.default.insertMany(data.users, { session, ordered: false });
            }
            if (Array.isArray(data.studentProfiles) && data.studentProfiles.length > 0) {
                await StudentProfile_1.default.insertMany(data.studentProfiles, { session, ordered: false });
            }
            if (Array.isArray(data.subscriptionPlans) && data.subscriptionPlans.length > 0) {
                await SubscriptionPlan_1.default.insertMany(data.subscriptionPlans, { session, ordered: false });
            }
            if (Array.isArray(data.manualPayments) && data.manualPayments.length > 0) {
                await ManualPayment_1.default.insertMany(data.manualPayments, { session, ordered: false });
            }
            if (Array.isArray(data.expenses) && data.expenses.length > 0) {
                await ExpenseEntry_1.default.insertMany(data.expenses, { session, ordered: false });
            }
            if (Array.isArray(data.staffPayouts) && data.staffPayouts.length > 0) {
                await StaffPayout_1.default.insertMany(data.staffPayouts, { session, ordered: false });
            }
            if (Array.isArray(data.dueLedgers) && data.dueLedgers.length > 0) {
                await StudentDueLedger_1.default.insertMany(data.dueLedgers, { session, ordered: false });
            }
            if (Array.isArray(data.supportTickets) && data.supportTickets.length > 0) {
                await SupportTicket_1.default.insertMany(data.supportTickets, { session, ordered: false });
            }
            if (Array.isArray(data.notices) && data.notices.length > 0) {
                await AnnouncementNotice_1.default.insertMany(data.notices, { session, ordered: false });
            }
            await session.commitTransaction();
            session.endSession();
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
        await createAudit(req, 'backup_restore_completed', {
            restoreJobId: String(item._id),
            preRestoreSnapshotId: String(preRestore._id),
            metadata: parsed.metadata || {},
        });
        res.json({
            message: 'Restore completed successfully',
            restoredFrom: String(item._id),
            preRestoreSnapshotId: String(preRestore._id),
        });
    }
    catch (error) {
        console.error('adminRestoreBackup error:', error);
        res.status(500).json({ message: 'Failed to restore backup' });
    }
}
//# sourceMappingURL=backupController.js.map