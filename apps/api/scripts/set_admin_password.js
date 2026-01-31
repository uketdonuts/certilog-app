const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const password = 'AdminPass123!';
    const hash = await bcrypt.hash(password, 10);
    const user = await p.user.updateMany({
      where: { username: 'admin' },
      data: { passwordHash: hash },
    });
    console.log('Password updated for admin. Use username=admin password=' + password);
  } catch (e) {
    console.error('Error setting admin password:', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
