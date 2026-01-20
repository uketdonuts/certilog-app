import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: 'dispatch@certilog.com' } });
    if (!user) {
      console.log('NOT_FOUND');
    } else {
      console.log(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        hasPassword: !!user.passwordHash,
        hasPin: !!user.pin,
        role: user.role,
        isActive: user.isActive,
      }));
    }
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
