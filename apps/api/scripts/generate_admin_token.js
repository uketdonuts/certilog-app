const { generateAccessToken } = require('../src/utils/jwt');

// Admin id from DB
const adminId = '930f6f9c-f740-4dd4-acdf-6eba1aa090ac';
const token = generateAccessToken({ userId: adminId, role: 'ADMIN' });
console.log(token);
