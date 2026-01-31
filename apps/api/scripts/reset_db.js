const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    console.log('Resetting database...');

    // Delete all data in correct order (respecting foreign keys)
    await p.deliveryPhoto.deleteMany();
    await p.deliveryRoutePoint.deleteMany();
    await p.delivery.deleteMany();
    await p.customer.deleteMany();
    await p.courierLocation.deleteMany();
    await p.refreshToken.deleteMany();
    await p.appLog.deleteMany();
    await p.gasReport.deleteMany();
    await p.absenceTardiness.deleteMany();
    await p.fleetMaintenanceReport.deleteMany();
    await p.preventiveMaintenance.deleteMany();
    await p.repair.deleteMany();
    await p.tireSemaphore.deleteMany();
    await p.vehicle.deleteMany();
    await p.user.deleteMany();

    console.log('All data deleted.');

    // Create admin user
    const adminPassword = 'AdminPass123!';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const admin = await p.user.create({
      data: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'admin@certilog.com',
        username: 'admin',
        passwordHash: adminHash,
        fullName: 'Administrador',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('Admin created: username=admin password=' + adminPassword);

    // Create dispatcher user
    const dispatcherPassword = 'Dispatch123!';
    const dispatcherHash = await bcrypt.hash(dispatcherPassword, 10);
    const dispatcher = await p.user.create({
      data: {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        email: 'dispatcher@certilog.com',
        username: 'dispatcher',
        passwordHash: dispatcherHash,
        fullName: 'Despachador',
        role: 'DISPATCHER',
        isActive: true,
      },
    });
    console.log('Dispatcher created: username=dispatcher password=' + dispatcherPassword);

    console.log('\nDatabase reset complete!');
  } catch (e) {
    console.error('Error resetting database:', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
