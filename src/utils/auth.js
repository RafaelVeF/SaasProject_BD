const crypto = require('crypto');

function hashPassword(password) {
    const raw = password || 'password123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(raw, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || !password) return false;
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    try {
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
    } catch {
        return false;
    }
}

module.exports = { hashPassword, verifyPassword };
