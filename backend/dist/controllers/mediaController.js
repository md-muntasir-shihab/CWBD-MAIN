"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
exports.uploadMedia = uploadMedia;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const secureUploadService_1 = require("../services/secureUploadService");
// Ensure the upload directory exists
const uploadDir = path_1.default.join(__dirname, '../../public/uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'video/mp4',
    'video/webm',
]);
const SECURE_CATEGORIES = new Set(['profile_photo', 'student_document', 'payment_proof', 'support_attachment', 'exam_upload', 'admin_upload']);
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        // Generate a unique filename: timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
// Create the upload middleware (limit 25MB)
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
            cb(new Error('Unsupported file type'));
            return;
        }
        cb(null, true);
    },
});
/* ─────── UPLOAD MEDIA ─────── */
/**
 * POST /api/admin/media/upload
 * Expects form-data with a 'file' field.
 */
async function uploadMedia(req, res) {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded.' });
            return;
        }
        if (!ALLOWED_MIME_TYPES.has(String(req.file.mimetype || '').toLowerCase())) {
            res.status(400).json({ message: 'Unsupported file type.' });
            return;
        }
        const origin = `${req.protocol}://${req.get('host')}`;
        const requestedVisibility = String(req.body?.visibility || req.query.visibility || '').trim().toLowerCase() === 'protected'
            ? 'protected'
            : 'public';
        const requestedCategoryRaw = String(req.body?.category || req.query.category || '').trim().toLowerCase();
        const requestedCategory = SECURE_CATEGORIES.has(requestedCategoryRaw) ? requestedCategoryRaw : 'admin_upload';
        const accessRoles = String(req.body?.accessRoles || req.query.accessRoles || '')
            .split(',')
            .map((role) => role.trim().toLowerCase())
            .filter(Boolean);
        const firebaseBucket = (0, firebaseAdmin_1.getFirebaseStorageBucket)();
        if (firebaseBucket && requestedVisibility !== 'protected') {
            const ext = path_1.default.extname(req.file.originalname || '').toLowerCase() || path_1.default.extname(req.file.filename || '');
            const safeExt = ext && ext.length <= 10 ? ext : '';
            const objectKey = `media/${Date.now()}-${crypto_1.default.randomBytes(8).toString('hex')}${safeExt}`;
            const fileRef = firebaseBucket.file(objectKey);
            await fileRef.save(fs_1.default.readFileSync(req.file.path), {
                metadata: {
                    contentType: req.file.mimetype,
                },
                resumable: false,
                public: true,
            });
            const publicUrl = `https://storage.googleapis.com/${firebaseBucket.name}/${objectKey}`;
            fs_1.default.unlink(req.file.path, () => { });
            res.status(201).json({
                message: 'File uploaded successfully.',
                url: publicUrl,
                absoluteUrl: publicUrl,
                filename: objectKey,
                mimetype: req.file.mimetype,
                size: req.file.size,
                provider: 'firebase',
            });
            return;
        }
        if (requestedVisibility === 'protected') {
            const secureUpload = await (0, secureUploadService_1.registerSecureUpload)({
                file: req.file,
                category: requestedCategory,
                visibility: 'protected',
                ownerUserId: req.user?._id || null,
                ownerRole: req.user?.role || null,
                uploadedBy: req.user?._id || null,
                accessRoles,
            });
            const url = (0, secureUploadService_1.buildSecureUploadUrl)(secureUpload.storedName);
            res.status(201).json({
                message: 'File uploaded successfully.',
                url,
                absoluteUrl: `${origin}${url}`,
                filename: secureUpload.storedName,
                mimetype: secureUpload.mimeType,
                size: secureUpload.sizeBytes,
                visibility: secureUpload.visibility,
            });
            return;
        }
        // Construct the public URL for the uploaded file
        // For development, it will be served from the local Node server e.g. /uploads/filename.ext
        const fileUrl = `/uploads/${req.file.filename}`;
        const absoluteUrl = `${origin}${fileUrl}`;
        res.status(201).json({
            message: 'File uploaded successfully.',
            url: fileUrl,
            absoluteUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            visibility: 'public',
        });
    }
    catch (err) {
        console.error('[uploadMedia]', err);
        res.status(500).json({ message: 'Server error during file upload.' });
    }
}
//# sourceMappingURL=mediaController.js.map