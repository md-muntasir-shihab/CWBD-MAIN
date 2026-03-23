"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadStudentDocument = exports.createStudentApplication = exports.getStudentApplications = exports.updateStudentProfile = exports.getStudentProfileUpdateRequestStatus = exports.getStudentProfile = void 0;
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const StudentApplication_1 = __importDefault(require("../models/StudentApplication"));
const ProfileUpdateRequest_1 = __importDefault(require("../models/ProfileUpdateRequest"));
const studentDashboardService_1 = require("../services/studentDashboardService");
const studentDashboardStream_1 = require("../realtime/studentDashboardStream");
const StudentDashboardConfig_1 = __importDefault(require("../models/StudentDashboardConfig"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const ExamProfileSyncLog_1 = __importDefault(require("../models/ExamProfileSyncLog"));
const adminAlertService_1 = require("../services/adminAlertService");
const studentProfileScoreService_1 = require("../services/studentProfileScoreService");
const secureUploadService_1 = require("../services/secureUploadService");
// Ensure the profile exists, if not create a default one
const ensureProfile = async (userId) => {
    let profile = await StudentProfile_1.default.findOne({ user_id: userId });
    if (!profile) {
        // We'll need a full_name from the user object if it was there, but it's removed now.
        // During registration we create the profile, so this is just a safety.
        const created = await StudentProfile_1.default.create({
            user_id: userId,
            full_name: 'Student',
            profile_completion_percentage: 0,
        });
        const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(created.toObject());
        created.profile_completion_percentage = scoreResult.score;
        await created.save();
        profile = created;
    }
    return profile;
};
const normalizeDepartment = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return undefined;
    if (['science', 'sci'].includes(normalized))
        return 'science';
    if (['arts', 'humanities', 'humanity'].includes(normalized))
        return 'arts';
    if (['commerce', 'business', 'business studies'].includes(normalized))
        return 'commerce';
    return undefined;
};
const DEFAULT_CELEBRATION_RULES = {
    enabled: true,
    windowDays: 7,
    minPercentage: 80,
    maxRank: 10,
    ruleMode: 'score_or_rank',
    messageTemplates: [
        'Excellent performance! Keep it up.',
        'Top result achieved. Great work!',
        'You are in the top performers this week.',
    ],
    showForSec: 10,
    dismissible: true,
    maxShowsPerDay: 2,
};
async function resolveCelebration(userId) {
    const config = await StudentDashboardConfig_1.default.findOne().select('celebrationRules').lean();
    const rulesRaw = config?.celebrationRules;
    const rules = {
        ...DEFAULT_CELEBRATION_RULES,
        ...(rulesRaw || {}),
    };
    const windowDays = Math.max(1, Number(rules.windowDays || DEFAULT_CELEBRATION_RULES.windowDays));
    const minPercentage = Math.max(0, Number(rules.minPercentage || DEFAULT_CELEBRATION_RULES.minPercentage));
    const maxRank = Math.max(1, Number(rules.maxRank || DEFAULT_CELEBRATION_RULES.maxRank));
    const ruleMode = String(rules.ruleMode || DEFAULT_CELEBRATION_RULES.ruleMode);
    const showForSec = Math.max(3, Number(rules.showForSec || DEFAULT_CELEBRATION_RULES.showForSec));
    const dismissible = rules.dismissible === undefined ? DEFAULT_CELEBRATION_RULES.dismissible : Boolean(rules.dismissible);
    const messageTemplates = Array.isArray(rules.messageTemplates)
        ? rules.messageTemplates.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    const base = {
        eligible: false,
        reasonCodes: [],
        topPercentage: 0,
        bestRank: null,
        message: '',
        showForSec,
        dismissible,
        windowDays,
        maxShowsPerDay: Math.max(1, Number(rules.maxShowsPerDay || DEFAULT_CELEBRATION_RULES.maxShowsPerDay)),
    };
    if (!Boolean(rules.enabled)) {
        return {
            ...base,
            reasonCodes: ['disabled'],
        };
    }
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - windowDays);
    const recentResults = await ExamResult_1.default.find({
        student: userId,
        submittedAt: { $gte: fromDate },
    })
        .select('percentage rank submittedAt')
        .sort({ submittedAt: -1 })
        .limit(50)
        .lean();
    if (!recentResults.length) {
        return {
            ...base,
            reasonCodes: ['no_recent_results'],
        };
    }
    const topPercentage = recentResults.reduce((best, item) => Math.max(best, Number(item.percentage || 0)), 0);
    const rankCandidates = recentResults
        .map((item) => Number(item.rank || 0))
        .filter((rank) => Number.isFinite(rank) && rank > 0);
    const bestRank = rankCandidates.length ? Math.min(...rankCandidates) : null;
    const scoreQualified = topPercentage >= minPercentage;
    const rankQualified = bestRank !== null && bestRank <= maxRank;
    const eligible = ruleMode === 'score_and_rank'
        ? (scoreQualified && rankQualified)
        : (scoreQualified || rankQualified);
    const reasonCodes = [];
    if (scoreQualified)
        reasonCodes.push('score_threshold');
    if (rankQualified)
        reasonCodes.push('rank_threshold');
    if (!reasonCodes.length)
        reasonCodes.push('below_threshold');
    const message = messageTemplates[0]
        || (scoreQualified
            ? `You scored ${Math.round(topPercentage)}% in recent exams.`
            : bestRank !== null
                ? `You reached rank ${bestRank} in recent exams.`
                : 'Great progress in your exam journey.');
    return {
        ...base,
        eligible,
        reasonCodes,
        topPercentage,
        bestRank,
        message,
    };
}
// @desc    Get current student profile
// @route   GET /api/student/profile
// @access  Private (Student)
const getStudentProfile = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Student access only' });
        const profile = await ensureProfile(req.user._id);
        const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile.toObject(), req.user);
        const dashboardHeader = await (0, studentDashboardService_1.getStudentDashboardHeader)(req.user._id);
        const celebration = await resolveCelebration(req.user._id);
        const pendingRequest = await ProfileUpdateRequest_1.default.exists({ student_id: req.user._id, status: 'pending' });
        const recentSyncLogs = await ExamProfileSyncLog_1.default.find({ studentId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate('examId', 'title deliveryMode')
            .lean();
        const examHistory = Array.isArray(profile.examHistory)
            ? profile.examHistory
            : [];
        res.json({
            ...profile.toObject(),
            date_of_birth: profile.dob,
            phone_number: profile.phone_number || profile.phone || '',
            profile_completion: profile.profile_completion_percentage,
            profileScore: scoreResult.score,
            profileScoreThreshold: scoreResult.threshold,
            profileEligibleForExam: scoreResult.eligible,
            profileScoreBreakdown: scoreResult.breakdown,
            missingProfileFields: scoreResult.missingFields,
            address: profile.present_address || '',
            preferred_stream: profile.department || '',
            guardian_phone_verification_status: profile.guardianPhoneVerificationStatus || 'unverified',
            guardian_phone_verified_at: profile.guardianPhoneVerifiedAt || null,
            welcome_message: dashboardHeader.welcomeMessage,
            overall_rank: dashboardHeader.overallRank,
            profile_completion_threshold: dashboardHeader.profileCompletionThreshold,
            profile_eligible_for_exam: dashboardHeader.isProfileEligible,
            pendingRequest: Boolean(pendingRequest),
            celebration,
            exam_data: {
                identity: profile.examIdentity || {},
                latestResultSummary: profile.latestExamResultSummary || '',
                lastSyncAt: profile.examDataLastSyncAt || null,
                lastSyncSource: profile.examDataLastSyncSource || '',
                history: examHistory.slice(0, 12),
                syncLogs: recentSyncLogs.map((item) => {
                    const examDoc = item.examId;
                    return {
                        _id: String(item._id),
                        examId: examDoc?._id ? String(examDoc._id) : String(item.examId || ''),
                        examTitle: String(examDoc?.title || ''),
                        source: item.source,
                        status: item.status,
                        syncMode: item.syncMode,
                        changedFields: item.changedFields || [],
                        createdAt: item.createdAt,
                    };
                }),
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to get profile', error: err.message });
    }
};
exports.getStudentProfile = getStudentProfile;
// @desc    Get latest student profile update request status
// @route   GET /api/student/profile-update-request
// @access  Private (Student)
const getStudentProfileUpdateRequestStatus = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Student access only' });
        const [pending, latestDecision] = await Promise.all([
            ProfileUpdateRequest_1.default.findOne({ student_id: req.user._id, status: 'pending' }).sort({ createdAt: -1 }).lean(),
            ProfileUpdateRequest_1.default.findOne({ student_id: req.user._id, status: { $in: ['approved', 'rejected'] } }).sort({ updatedAt: -1 }).lean(),
        ]);
        const normalize = (doc) => {
            if (!doc)
                return null;
            return {
                id: String(doc._id),
                status: String(doc.status || ''),
                requestedChanges: (doc.requested_changes || {}),
                submittedAt: doc.createdAt || null,
                reviewedAt: doc.reviewed_at || null,
                feedback: String(doc.admin_feedback || ''),
            };
        };
        res.json({
            pendingRequest: normalize(pending),
            latestDecision: normalize(latestDecision),
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to load profile update request status', error: err.message });
    }
};
exports.getStudentProfileUpdateRequestStatus = getStudentProfileUpdateRequestStatus;
// @desc    Update student profile
// @route   PUT /api/student/profile
// @access  Private (Student)
const updateStudentProfile = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Student access only' });
        // Fields that can be updated directly without approval
        const openFields = [
            'dob', 'gender', 'present_address', 'permanent_address', 'district', 'college_address', 'college_name'
        ];
        // Fields that require admin approval if they were already set
        const restrictedFields = [
            'full_name', 'phone_number', 'phone', 'guardian_name', 'guardian_phone',
            'ssc_batch', 'hsc_batch', 'department', 'roll_number', 'registration_id', 'institution_name'
        ];
        const aliasMap = {
            date_of_birth: 'dob',
            address: 'present_address',
            // REMOVED 'preferred_stream': 'department' to fix the clobbering bug
        };
        const profile = await ensureProfile(req.user._id);
        const profileObj = profile.toObject();
        const directUpdates = {};
        const requestedUpdates = {};
        // 1. Process Open Fields
        for (const field of openFields) {
            if (req.body[field] !== undefined) {
                directUpdates[field] = req.body[field];
            }
        }
        // 2. Process Aliases for Open Fields
        for (const [alias, target] of Object.entries(aliasMap)) {
            if (req.body[alias] !== undefined && openFields.includes(target)) {
                directUpdates[target] = req.body[alias];
            }
        }
        // 3. Process Restricted Fields
        for (const field of restrictedFields) {
            let val = req.body[field];
            if (val === undefined) {
                // Check aliases (though none currently map to restricted fields, for future safety)
                const aliasKey = Object.keys(aliasMap).find(a => aliasMap[a] === field);
                if (aliasKey && req.body[aliasKey] !== undefined) {
                    val = req.body[aliasKey];
                }
            }
            if (val !== undefined) {
                // Check if current value exists and is different
                const currentVal = profileObj[field];
                const isSet = currentVal != null && String(currentVal).trim() !== '';
                if (!isSet) {
                    // If not set yet, allow direct update
                    directUpdates[field] = val;
                }
                else if (String(currentVal) !== String(val)) {
                    // If already set and changing, require approval
                    requestedUpdates[field] = val;
                }
            }
        }
        // Apply direct updates
        if (Object.keys(directUpdates).length > 0) {
            for (const [key, value] of Object.entries(directUpdates)) {
                if (key === 'department') {
                    const mapped = normalizeDepartment(value);
                    if (mapped)
                        profile[key] = mapped;
                }
                else if (key === 'dob' && value === '') {
                    profile[key] = undefined;
                }
                else if (key === 'gender') {
                    const gender = typeof value === 'string' ? value.trim().toLowerCase() : '';
                    if (['male', 'female', 'other'].includes(gender))
                        profile[key] = gender;
                }
                else {
                    profile[key] = value;
                }
            }
            // Sync phone/phone_number
            if (directUpdates.phone_number && !directUpdates.phone)
                profile.phone = directUpdates.phone_number;
            if (directUpdates.phone && !directUpdates.phone_number)
                profile.phone_number = directUpdates.phone;
            // Compute completion
            const scoreResult = (0, studentProfileScoreService_1.computeStudentProfileScore)(profile.toObject(), req.user);
            profile.profile_completion_percentage = scoreResult.score;
            await profile.save();
        }
        // Handle requested updates
        let requestMsg = '';
        if (Object.keys(requestedUpdates).length > 0) {
            // Delete existing pending request if any
            await ProfileUpdateRequest_1.default.deleteMany({ student_id: req.user._id, status: 'pending' });
            const request = await ProfileUpdateRequest_1.default.create({
                student_id: req.user._id,
                requested_changes: requestedUpdates
            });
            await (0, adminAlertService_1.createAdminAlert)({
                title: 'Profile approval required',
                message: `A student submitted ${Object.keys(requestedUpdates).length} profile change${Object.keys(requestedUpdates).length > 1 ? 's' : ''} for review.`,
                type: 'profile_update_request',
                messagePreview: Object.keys(requestedUpdates).join(', '),
                linkUrl: `/__cw_admin__/student-management/profile-requests?requestId=${String(request._id)}`,
                category: 'update',
                sourceType: 'profile_update_request',
                sourceId: String(request._id),
                targetRoute: '/__cw_admin__/student-management/profile-requests',
                targetEntityId: String(request._id),
                priority: 'normal',
                actorUserId: req.user._id,
                actorNameSnapshot: String(req.user.fullName || req.user.username || req.user.email || 'Student').trim(),
                targetRole: 'admin',
                createdBy: req.user._id,
                dedupeKey: `profile_update_request:${String(request._id)}`,
            });
            requestMsg = ' Some changes require admin approval and have been sent for review.';
        }
        res.json({
            message: 'Profile update processed.' + requestMsg,
            profile: {
                ...profile.toObject(),
                date_of_birth: profile.dob,
                phone_number: profile.phone_number || profile.phone || '',
                profile_completion: profile.profile_completion_percentage,
                profileScore: profile.profile_completion_percentage,
                guardian_phone_verification_status: profile.guardianPhoneVerificationStatus || 'unverified',
                guardian_phone_verified_at: profile.guardianPhoneVerifiedAt || null,
            },
            pendingRequest: Object.keys(requestedUpdates).length > 0
        });
        (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId: req.user._id } });
    }
    catch (err) {
        console.error('updateStudentProfile Error:', err);
        res.status(500).json({ message: 'Failed to update profile', error: err.message });
    }
};
exports.updateStudentProfile = updateStudentProfile;
// @desc    Get student applications
// @route   GET /api/student/applications
// @access  Private (Student)
const getStudentApplications = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Student access only' });
        const apps = await StudentApplication_1.default.find({ student_id: req.user._id })
            .populate('university_id', 'name slug logo')
            .sort({ createdAt: -1 });
        res.json(apps);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to get profile', error: err.message });
    }
};
exports.getStudentApplications = getStudentApplications;
// @desc    Submit new application
// @route   POST /api/student/applications
// @access  Private (Student)
const createStudentApplication = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Student access only' });
        const { university_id, program } = req.body;
        if (!university_id || !program) {
            return res.status(400).json({ message: 'University and program are required' });
        }
        // Check profile completion first
        const profile = await ensureProfile(req.user._id);
        if (profile.profile_completion_percentage < 60) {
            return res.status(400).json({ message: 'Please complete at least 60% of your profile before applying.' });
        }
        // Prevent duplicate applications for the same program in draft/submitted
        const existing = await StudentApplication_1.default.findOne({
            student_id: req.user._id,
            university_id,
            program,
            status: { $in: ['draft', 'submitted', 'under_review'] }
        });
        if (existing) {
            return res.status(400).json({ message: 'You already have an active application for this program.' });
        }
        const application = await StudentApplication_1.default.create({
            student_id: req.user._id,
            university_id,
            program,
            status: 'draft',
            applied_at: new Date()
        });
        res.status(201).json({ message: 'Application draft created successfully', application });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create application', error: err.message });
    }
};
exports.createStudentApplication = createStudentApplication;
// @desc    Upload student document
const uploadStudentDocument = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role !== 'student')
            return res.status(403).json({ message: 'Student access only' });
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const document_type = req.body.document_type || req.body.type;
        if (!document_type)
            return res.status(400).json({ message: 'Document type is required' });
        const profile = await ensureProfile(req.user._id);
        const isProfilePhoto = String(document_type).trim().toLowerCase() === 'profile_photo';
        const secureUpload = await (0, secureUploadService_1.registerSecureUpload)({
            file: req.file,
            category: isProfilePhoto ? 'profile_photo' : 'student_document',
            visibility: isProfilePhoto ? 'public' : 'protected',
            ownerUserId: req.user._id,
            ownerRole: req.user.role,
            uploadedBy: req.user._id,
            accessRoles: isProfilePhoto
                ? ['student', 'superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent']
                : ['student', 'superadmin', 'admin', 'moderator', 'support_agent', 'finance_agent'],
        });
        const docUrl = (0, secureUploadService_1.buildSecureUploadUrl)(secureUpload.storedName);
        // Persist profile photo immediately so the student sees it without a second save action.
        if (isProfilePhoto) {
            profile.profile_photo_url = docUrl;
            await profile.save();
            (0, studentDashboardStream_1.broadcastStudentDashboardEvent)({ type: 'profile_updated', meta: { studentId: req.user._id } });
        }
        res.json({
            message: 'Document uploaded successfully',
            url: docUrl,
            document_type,
            visibility: secureUpload.visibility,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to upload document', error: err.message });
    }
};
exports.uploadStudentDocument = uploadStudentDocument;
//# sourceMappingURL=studentController.js.map