const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const admin = await p.user.findFirst({ where: { username: 'admin' } });
  console.log('found admin:', admin ? { id: admin.id, username: admin.username, email: admin.email, role: admin.role } : null);
  await p.$disconnect();
})();
