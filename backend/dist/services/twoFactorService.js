"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpCode = generateOtpCode;
exports.hashOtpCode = hashOtpCode;
exports.maskEmail = maskEmail;
exports.normalizeTwoFactorMethod = normalizeTwoFactorMethod;
exports.generateTotpSecret = generateTotpSecret;
exports.buildTotpOtpAuthUrl = buildTotpOtpAuthUrl;
exports.verifyTotpCode = verifyTotpCode;
exports.generateBackupCodes = generateBackupCodes;
exports.consumeBackupCode = consumeBackupCode;
exports.sendOtpChallenge = sendOtpChallenge;
const crypto_1 = __importDefault(require("crypto"));
const mailer_1 = require("../utils/mailer");
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
function generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
function hashOtpCode(code) {
    return crypto_1.default.createHash('sha256').update(code).digest('hex');
}
function maskEmail(email) {
    return String(email || '').replace(/(.{2})(.*)(@.*)/, '$1***$3');
}
function normalizeTwoFactorMethod(value, fallback = 'email') {
    const method = String(value || '').trim().toLowerCase();
    if (method === 'email' || method === 'sms' || method === 'authenticator') {
        return method;
    }
    return fallback;
}
async function sendEmailOtp(user, otpCode, expiryMinutes) {
    const displayName = user.full_name || user.username;
    await (0, mailer_1.sendCampusMail)({
        to: user.email,
        subject: 'CampusWay: Your Login Verification Code',
        text: `Your verification code is: ${otpCode}. It expires in ${expiryMinutes} minutes.`,
        html: `<div style="font-family:sans-serif;padding:20px"><h2>Login Verification</h2><p>Hello ${displayName},</p><p>Your verification code is:</p><h1 style="letter-spacing:8px;font-size:36px;color:#4f46e5">${otpCode}</h1><p>This code expires in ${expiryMinutes} minutes.</p><p style="color:#666">If you did not request this, please ignore this email.</p></div>`,
    });
}
function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}
function base32Decode(input) {
    const sanitized = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of sanitized) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1)
            continue;
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}
function hotp(secret, counter) {
    const secretBuffer = base32Decode(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);
    const hmac = crypto_1.default.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);
    return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}
function generateTotpSecret(length = 20) {
    return base32Encode(crypto_1.default.randomBytes(Math.max(10, length))).replace(/=+$/g, '');
}
function buildTotpOtpAuthUrl(params) {
    const issuer = encodeURIComponent(params.issuer || 'CampusWay');
    const account = encodeURIComponent(params.accountName);
    const secret = encodeURIComponent(params.secret);
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}
function verifyTotpCode(secret, code, window = 1) {
    const normalized = String(code || '').replace(/\D/g, '');
    if (!secret || normalized.length !== TOTP_DIGITS)
        return false;
    const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
    for (let offset = -Math.max(0, window); offset <= Math.max(0, window); offset += 1) {
        if (hotp(secret, counter + offset) === normalized) {
            return true;
        }
    }
    return false;
}
function generateBackupCodes(count = 8) {
    const plainCodes = Array.from({ length: Math.max(4, count) }, () => crypto_1.default.randomBytes(5).toString('hex').toUpperCase());
    return {
        plainCodes,
        hashedCodes: plainCodes.map((code) => ({ codeHash: hashOtpCode(code), usedAt: null })),
    };
}
function consumeBackupCode(codes, candidate) {
    if (!Array.isArray(codes) || !candidate) {
        return { ok: false, nextCodes: Array.isArray(codes) ? codes : [] };
    }
    const normalized = String(candidate || '').trim().toUpperCase();
    const candidateHash = hashOtpCode(normalized);
    let matched = false;
    const nextCodes = codes.map((item) => {
        if (matched || item.usedAt || item.codeHash !== candidateHash)
            return item;
        matched = true;
        return { ...item, usedAt: new Date() };
    });
    return { ok: matched, nextCodes };
}
async function sendOtpChallenge(params) {
    const { user, method, otpCode, expiryMinutes } = params;
    if (method === 'email') {
        await sendEmailOtp(user, otpCode, expiryMinutes);
        return 'email';
    }
    if (method === 'authenticator') {
        return 'authenticator';
    }
    // Modular placeholders: fallback to email until SMS/TOTP providers are integrated.
    console.warn('[2fa] provider not configured, falling back to email', {
        userId: String(user._id),
        requestedMethod: method,
    });
    await sendEmailOtp(user, otpCode, expiryMinutes);
    return 'email';
}
//# sourceMappingURL=twoFactorService.js.map