const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'certilog-dev-secret-key-change-in-production';
const adminId = '930f6f9c-f740-4dd4-acdf-6eba1aa090ac';
const payload = { userId: adminId, role: 'ADMIN' };
const token = jwt.sign(payload, secret, { expiresIn: '7d' });
console.log(token);
