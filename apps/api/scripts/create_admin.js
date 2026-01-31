const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const password = 'AdminPass123!';
    const hash = await bcrypt.hash(password, 10);
    const user = await p.user.upsert({
      where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      update: { passwordHash: hash, role: 'ADMIN', isActive: true, fullName: 'Admin User' },
      create: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: hash,
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('Admin user upserted. username=admin password=' + password);
  } catch (e) {
    console.error('Error creating admin:', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
