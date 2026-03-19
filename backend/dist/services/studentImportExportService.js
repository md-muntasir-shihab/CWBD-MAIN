"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileBuffer = parseFileBuffer;
exports.generatePreview = generatePreview;
exports.commitImport = commitImport;
exports.exportStudents = exportStudents;
exports.generateTemplateXlsx = generateTemplateXlsx;
const exceljs_1 = __importDefault(require("exceljs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const UserSubscription_1 = __importDefault(require("../models/UserSubscription"));
const GroupMembership_1 = __importDefault(require("../models/GroupMembership"));
const StudentDueLedger_1 = __importDefault(require("../models/StudentDueLedger"));
// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const STUDENT_COLUMNS = [
    { key: 'userId', label: 'User ID' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'guardian_phone', label: 'Guardian Phone' },
    { key: 'department', label: 'Department' },
    { key: 'ssc_batch', label: 'SSC Batch' },
    { key: 'hsc_batch', label: 'HSC Batch' },
    { key: 'college_name', label: 'College Name' },
    { key: 'college_address', label: 'College Address' },
    { key: 'present_address', label: 'Present Address' },
    { key: 'district', label: 'District' },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'status', label: 'Status' },
    { key: 'profile_completion_percentage', label: 'Profile Score' },
];
// ---------------------------------------------------------------------------
// Smart-mapping aliases
// ---------------------------------------------------------------------------
const COLUMN_ALIASES = {
    'full name': 'full_name',
    fullname: 'full_name',
    name: 'full_name',
    'student name': 'full_name',
    username: 'username',
    'user name': 'username',
    email: 'email',
    'email address': 'email',
    phone: 'phone_number',
    mobile: 'phone_number',
    'phone number': 'phone_number',
    'mobile number': 'phone_number',
    'guardian phone': 'guardian_phone',
    'guardian mobile': 'guardian_phone',
    department: 'department',
    dept: 'department',
    'ssc batch': 'ssc_batch',
    sscbatch: 'ssc_batch',
    'hsc batch': 'hsc_batch',
    hscbatch: 'hsc_batch',
    college: 'college_name',
    'college name': 'college_name',
    'college address': 'college_address',
    address: 'present_address',
    'present address': 'present_address',
    district: 'district',
    gender: 'gender',
    dob: 'dob',
    'date of birth': 'dob',
    birthday: 'dob',
    status: 'status',
    'profile score': 'profile_completion_percentage',
    'profile completion': 'profile_completion_percentage',
    score: 'profile_completion_percentage',
    'user id': 'userId',
    userid: 'userId',
    id: 'userId',
};
function normalise(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}
function suggestMapping(detectedColumns) {
    const result = {};
    for (const col of detectedColumns) {
        const norm = normalise(col);
        if (COLUMN_ALIASES[norm]) {
            result[col] = COLUMN_ALIASES[norm];
        }
        else {
            const directMatch = STUDENT_COLUMNS.find((c) => normalise(c.key) === norm || normalise(c.label) === norm);
            if (directMatch)
                result[col] = directMatch.key;
        }
    }
    return result;
}
// ---------------------------------------------------------------------------
// parseFileBuffer
// ---------------------------------------------------------------------------
async function parseFileBuffer(buffer, mimetype) {
    const isXlsx = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel' ||
        mimetype === 'application/octet-stream';
    return isXlsx ? parseXlsxBuffer(buffer) : parseCsvBuffer(buffer);
}
async function parseXlsxBuffer(buffer) {
    const workbook = new exceljs_1.default.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet)
        return { rows: [], columns: [] };
    const headers = [];
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
        headers.push(String(cell.value ?? '').trim());
    });
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1)
            return;
        const obj = {};
        headers.forEach((header, idx) => {
            const cell = row.getCell(idx + 1);
            let val = '';
            if (cell.value !== null && cell.value !== undefined) {
                if (cell.value instanceof Date) {
                    val = cell.value.toISOString().split('T')[0];
                }
                else if (typeof cell.value === 'object') {
                    const cv = cell.value;
                    val = String(cv['text'] ?? cv['result'] ?? '');
                }
                else {
                    val = String(cell.value);
                }
            }
            obj[header] = val.trim();
        });
        rows.push(obj);
    });
    return { rows, columns: headers };
}
async function parseCsvBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let columns = [];
        stream_1.Readable.from(buffer)
            .pipe((0, csv_parser_1.default)())
            .on('headers', (hdrs) => { columns = hdrs.map((h) => h.trim()); })
            .on('data', (row) => { rows.push(row); })
            .on('end', () => resolve({ rows, columns }))
            .on('error', reject);
    });
}
// ---------------------------------------------------------------------------
// generatePreview
// ---------------------------------------------------------------------------
async function generatePreview(rows, detectedColumns) {
    const suggestedMapping = suggestMapping(detectedColumns);
    const previewRows = rows.slice(0, 10);
    const validationErrors = [];
    rows.forEach((row, idx) => {
        const mapped = {};
        for (const [col, sysKey] of Object.entries(suggestedMapping)) {
            mapped[sysKey] = row[col] ?? '';
        }
        if (!mapped['full_name']?.trim()) {
            validationErrors.push({ row: idx + 2, field: 'full_name', message: 'Full Name is required' });
        }
    });
    return {
        totalRows: rows.length,
        previewRows,
        detectedColumns,
        suggestedMapping,
        validationErrors: validationErrors.slice(0, 50),
    };
}
// ---------------------------------------------------------------------------
// commitImport
// ---------------------------------------------------------------------------
const DEFAULT_PASSWORD = 'CampusWay@2024';
async function commitImport(opts, _adminId) {
    const result = { created: 0, updated: 0, skipped: 0, errors: [] };
    const hashedDefault = await bcryptjs_1.default.hash(DEFAULT_PASSWORD, 12);
    for (let i = 0; i < opts.rows.length; i++) {
        const rawRow = opts.rows[i];
        const rowNum = i + 2;
        const mapped = {};
        for (const [uploadedCol, sysKey] of Object.entries(opts.mapping)) {
            mapped[sysKey] = (rawRow[uploadedCol] ?? '').trim();
        }
        if (!mapped['full_name']) {
            result.errors.push({ row: rowNum, message: 'full_name is required' });
            continue;
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let existingUser = null;
            if (opts.dedupeField === 'email' && mapped['email']) {
                existingUser = await User_1.default.findOne({ email: mapped['email'].toLowerCase() }).lean();
            }
            else if (opts.dedupeField === 'phone' && mapped['phone_number']) {
                existingUser = await User_1.default.findOne({ phone_number: mapped['phone_number'] }).lean();
            }
            else if (opts.dedupeField === 'userId' && mapped['userId']) {
                if (mongoose_1.default.Types.ObjectId.isValid(mapped['userId'])) {
                    existingUser = await User_1.default.findById(mapped['userId']).lean();
                }
            }
            if (existingUser && opts.mode === 'create_only') {
                result.skipped++;
                continue;
            }
            if (existingUser) {
                const userUpdate = {};
                if (mapped['full_name'])
                    userUpdate['full_name'] = mapped['full_name'];
                if (mapped['email'])
                    userUpdate['email'] = mapped['email'].toLowerCase();
                if (mapped['phone_number'])
                    userUpdate['phone_number'] = mapped['phone_number'];
                if (mapped['status'] && ['active', 'suspended', 'blocked', 'pending'].includes(mapped['status'])) {
                    userUpdate['status'] = mapped['status'];
                }
                await User_1.default.findByIdAndUpdate(existingUser._id, { $set: userUpdate });
                const profileUpdate = {};
                if (mapped['full_name'])
                    profileUpdate['full_name'] = mapped['full_name'];
                if (mapped['phone_number'])
                    profileUpdate['phone_number'] = mapped['phone_number'];
                if (mapped['guardian_phone'])
                    profileUpdate['guardian_phone'] = mapped['guardian_phone'];
                if (mapped['department'])
                    profileUpdate['department'] = mapped['department'];
                if (mapped['ssc_batch'])
                    profileUpdate['ssc_batch'] = mapped['ssc_batch'];
                if (mapped['hsc_batch'])
                    profileUpdate['hsc_batch'] = mapped['hsc_batch'];
                if (mapped['college_name'])
                    profileUpdate['college_name'] = mapped['college_name'];
                if (mapped['college_address'])
                    profileUpdate['college_address'] = mapped['college_address'];
                if (mapped['present_address'])
                    profileUpdate['present_address'] = mapped['present_address'];
                if (mapped['district'])
                    profileUpdate['district'] = mapped['district'];
                if (mapped['gender'] && ['male', 'female', 'other'].includes(mapped['gender'])) {
                    profileUpdate['gender'] = mapped['gender'];
                }
                if (mapped['dob']) {
                    const d = new Date(mapped['dob']);
                    if (!isNaN(d.getTime()))
                        profileUpdate['dob'] = d;
                }
                await StudentProfile_1.default.findOneAndUpdate({ user_id: existingUser._id }, { $set: profileUpdate }, { upsert: true });
                result.updated++;
            }
            else {
                const email = mapped['email'] ? mapped['email'].toLowerCase() : '';
                const username = mapped['username'] ? mapped['username'].toLowerCase()
                    : (email ? email.split('@')[0] + '_' + Date.now() : 'user_' + Date.now());
                const newUser = await User_1.default.create({
                    full_name: mapped['full_name'],
                    username,
                    email: email || `${username}@import.local`,
                    password: hashedDefault,
                    role: 'student',
                    status: ['active', 'suspended', 'blocked', 'pending'].includes(mapped['status'] ?? '')
                        ? mapped['status'] : 'active',
                    phone_number: mapped['phone_number'] || undefined,
                    mustChangePassword: true,
                });
                const profileData = {
                    user_id: newUser._id,
                    full_name: mapped['full_name'],
                    username,
                    email: newUser.email,
                };
                if (mapped['phone_number'])
                    profileData['phone_number'] = mapped['phone_number'];
                if (mapped['guardian_phone'])
                    profileData['guardian_phone'] = mapped['guardian_phone'];
                if (mapped['department'])
                    profileData['department'] = mapped['department'];
                if (mapped['ssc_batch'])
                    profileData['ssc_batch'] = mapped['ssc_batch'];
                if (mapped['hsc_batch'])
                    profileData['hsc_batch'] = mapped['hsc_batch'];
                if (mapped['college_name'])
                    profileData['college_name'] = mapped['college_name'];
                if (mapped['college_address'])
                    profileData['college_address'] = mapped['college_address'];
                if (mapped['present_address'])
                    profileData['present_address'] = mapped['present_address'];
                if (mapped['district'])
                    profileData['district'] = mapped['district'];
                if (mapped['gender'] && ['male', 'female', 'other'].includes(mapped['gender'])) {
                    profileData['gender'] = mapped['gender'];
                }
                if (mapped['dob']) {
                    const d = new Date(mapped['dob']);
                    if (!isNaN(d.getTime()))
                        profileData['dob'] = d;
                }
                await StudentProfile_1.default.create(profileData);
                result.created++;
            }
        }
        catch (err) {
            result.errors.push({
                row: rowNum,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    return result;
}
// ---------------------------------------------------------------------------
// exportStudents
// ---------------------------------------------------------------------------
async function exportStudents(filters, format) {
    const userQuery = { role: 'student' };
    if (filters['status'])
        userQuery['status'] = filters['status'];
    if (filters['q']) {
        const re = new RegExp(String(filters['q']), 'i');
        userQuery['$or'] = [{ full_name: re }, { email: re }, { phone_number: re }, { username: re }];
    }
    const mergeIdFilter = (candidateIds) => {
        const existingId = userQuery['_id'];
        userQuery['_id'] = existingId
            ? { $in: existingId.$in.filter((id) => candidateIds.some((candidate) => String(candidate) === String(id))) }
            : { $in: candidateIds };
    };
    if (filters['group'] && mongoose_1.default.Types.ObjectId.isValid(String(filters['group']))) {
        const memberships = await GroupMembership_1.default.find({
            groupId: new mongoose_1.default.Types.ObjectId(String(filters['group'])),
            membershipStatus: 'active',
        }).select('studentId').lean();
        mergeIdFilter(memberships.map((item) => item.studentId));
    }
    if (filters['subscriptionStatus'] || filters['expiringDays']) {
        const subQuery = {};
        if (filters['subscriptionStatus'])
            subQuery['status'] = filters['subscriptionStatus'];
        if (filters['expiringDays']) {
            const days = Number(filters['expiringDays']);
            if (Number.isFinite(days) && days >= 0) {
                subQuery['status'] = 'active';
                subQuery['expiresAtUTC'] = { $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000) };
            }
        }
        const subs = await UserSubscription_1.default.find(subQuery).select('userId').lean();
        mergeIdFilter(subs.map((item) => item.userId));
    }
    if (filters['department'] || filters['sscBatch'] || filters['hscBatch'] || filters['guardianStatus']) {
        const profileQuery = {};
        if (filters['department'])
            profileQuery['department'] = filters['department'];
        if (filters['sscBatch'])
            profileQuery['ssc_batch'] = filters['sscBatch'];
        if (filters['hscBatch'])
            profileQuery['hsc_batch'] = filters['hscBatch'];
        if (filters['guardianStatus'] === 'verified')
            profileQuery['guardianPhoneVerificationStatus'] = 'verified';
        if (filters['guardianStatus'] === 'unverified')
            profileQuery['guardianPhoneVerificationStatus'] = { $ne: 'verified' };
        if (filters['guardianStatus'] === 'has_guardian')
            profileQuery['guardian_phone'] = { $exists: true, $ne: '' };
        if (filters['guardianStatus'] === 'no_guardian')
            profileQuery['guardian_phone'] = { $in: [null, '', undefined] };
        const profiles = await StudentProfile_1.default.find(profileQuery).select('user_id').lean();
        mergeIdFilter(profiles.map((item) => item.user_id));
    }
    if (filters['hasPaymentDue'] === true || filters['hasPaymentDue'] === 'true') {
        const dueRows = await StudentDueLedger_1.default.find({ netDue: { $gt: 0 } }).select('studentId').lean();
        mergeIdFilter(dueRows.map((item) => item.studentId));
    }
    const sortBy = String(filters['sortBy'] || '').trim().toLowerCase();
    const sortOrder = String(filters['sortOrder'] || '').trim().toLowerCase() === 'asc' ? 1 : -1;
    const sortField = sortBy === 'name' ? 'full_name'
        : sortBy === 'status' ? 'status'
            : sortBy === 'lastlogin' ? 'lastLoginAtUTC'
                : 'createdAt';
    const users = await User_1.default.find(userQuery)
        .select('_id full_name username email phone_number status createdAt subscription')
        .sort({ [sortField]: sortOrder })
        .lean()
        .limit(10000);
    const userIds = users.map((u) => u._id);
    const profiles = await StudentProfile_1.default.find({ user_id: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [String(p.user_id), p]));
    const rows = users.map((u) => {
        const pr = (profileMap.get(String(u._id)) ?? {});
        return {
            userId: String(u._id),
            full_name: u.full_name ?? '',
            username: u.username ?? '',
            email: u.email ?? '',
            phone_number: String(u.phone_number ?? pr['phone_number'] ?? ''),
            guardian_phone: String(pr['guardian_phone'] ?? ''),
            department: String(pr['department'] ?? ''),
            ssc_batch: String(pr['ssc_batch'] ?? ''),
            hsc_batch: String(pr['hsc_batch'] ?? ''),
            college_name: String(pr['college_name'] ?? ''),
            college_address: String(pr['college_address'] ?? ''),
            present_address: String(pr['present_address'] ?? ''),
            district: String(pr['district'] ?? ''),
            gender: String(pr['gender'] ?? ''),
            dob: pr['dob'] ? new Date(pr['dob']).toISOString().split('T')[0] : '',
            status: u.status ?? '',
            profile_completion_percentage: String(pr['profile_completion_percentage'] ?? '0'),
        };
    }).filter((row) => {
        const minScore = Number(filters['profileScoreMin']);
        if (!Number.isFinite(minScore))
            return true;
        return Number(row.profile_completion_percentage || 0) >= minScore;
    });
    if (format === 'csv') {
        const headers = STUDENT_COLUMNS.map((c) => c.label).join(',');
        const lines = rows.map((row) => STUDENT_COLUMNS.map((c) => {
            const val = String(row[c.key] ?? '').replace(/"/g, '""');
            return `"${val}"`;
        }).join(','));
        return Buffer.from([headers, ...lines].join('\n'), 'utf-8');
    }
    const workbook = new exceljs_1.default.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.columns = STUDENT_COLUMNS.map((c) => ({ header: c.label, key: c.key, width: 20 }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    for (const row of rows)
        sheet.addRow(row);
    return Buffer.from(await workbook.xlsx.writeBuffer());
}
// ---------------------------------------------------------------------------
// generateTemplateXlsx
// ---------------------------------------------------------------------------
async function generateTemplateXlsx() {
    const workbook = new exceljs_1.default.Workbook();
    const sheet = workbook.addWorksheet('Students Template');
    sheet.columns = STUDENT_COLUMNS.map((c) => ({ header: c.label, key: c.key, width: 22 }));
    const headerRow = sheet.getRow(1);
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.addRow({
        userId: '(leave blank for new)',
        full_name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        phone_number: '01700000000',
        guardian_phone: '01800000000',
        department: 'science',
        ssc_batch: '2020',
        hsc_batch: '2022',
        college_name: 'Dhaka College',
        college_address: 'Dhaka',
        present_address: 'Mirpur, Dhaka',
        district: 'Dhaka',
        gender: 'male',
        dob: '2004-01-15',
        status: 'active',
        profile_completion_percentage: '0',
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
}
//# sourceMappingURL=studentImportExportService.js.map