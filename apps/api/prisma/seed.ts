import { PrismaClient, Role, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@certilog.com' },
    update: {},
    create: {
      email: 'admin@certilog.com',
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'Administrador',
      phone: '8091234567',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create dispatcher user
  const dispatcherPassword = await bcrypt.hash('dispatch123', 10);
  const dispatcher = await prisma.user.upsert({
    where: { email: 'dispatch@certilog.com' },
    update: {},
    create: {
      email: 'dispatch@certilog.com',
      username: 'despachador',
      passwordHash: dispatcherPassword,
      fullName: 'Juan Despachador',
      phone: '8092345678',
      role: Role.DISPATCHER,
    },
  });
  console.log('✅ Dispatcher user created:', dispatcher.email);

  // Create courier users with PINs
  const couriers = [
    { fullName: 'Pedro Mensajero', phone: '8093456789', pin: '1234', username: 'pedro' },
    { fullName: 'María Courier', phone: '8094567890', pin: '5678', username: 'maria' },
    { fullName: 'Carlos Express', phone: '8095678901', pin: '9012', username: 'carlos' },
  ];

  for (const courier of couriers) {
    const pinHash = await bcrypt.hash(courier.pin, 10);
    const passwordHash = await bcrypt.hash('courier123', 10);

    const user = await prisma.user.upsert({
      where: { username: courier.username },
      update: {},
      create: {
        username: courier.username,
        pin: pinHash,
        passwordHash,
        fullName: courier.fullName,
        phone: courier.phone,
        role: Role.COURIER,
      },
    });
    console.log(`✅ Courier created: ${user.fullName} (PIN: ${courier.pin})`);
  }

  // Create sample customers
  const customers = [
    {
      name: 'Supermercado Nacional',
      phone: '8091111111',
      address: 'Av. Winston Churchill #100, Santo Domingo',
      latitude: 18.4861,
      longitude: -69.9312,
    },
    {
      name: 'Farmacia Carol',
      phone: '8092222222',
      address: 'Av. Abraham Lincoln #50, Santo Domingo',
      latitude: 18.4750,
      longitude: -69.9200,
    },
    {
      name: 'Restaurant El Mesón',
      phone: '8093333333',
      address: 'Calle El Conde #200, Zona Colonial',
      latitude: 18.4722,
      longitude: -69.8833,
    },
    {
      name: 'Oficina Legal Torres',
      phone: '8094444444',
      address: 'Torre Empresarial, Piantini',
      latitude: 18.4670,
      longitude: -69.9400,
    },
    {
      name: 'Clínica San Rafael',
      phone: '8095555555',
      address: 'Av. 27 de Febrero #300',
      latitude: 18.4800,
      longitude: -69.9100,
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: customer,
    });
    console.log(`✅ Customer created: ${customer.name}`);
  }

  // Get created customers and courier for deliveries
  const allCustomers = await prisma.customer.findMany();
  const pedroUser = await prisma.user.findUnique({ where: { username: 'pedro' } });

  // Create sample deliveries
  if (allCustomers.length > 0 && pedroUser) {
    const deliveries = [
      {
        customerId: allCustomers[0].id,
        courierId: pedroUser.id,
        description: 'Documentos importantes',
        priority: Priority.HIGH,
        scheduledDate: new Date(),
        status: 'ASSIGNED' as const,
      },
      {
        customerId: allCustomers[1].id,
        courierId: pedroUser.id,
        description: 'Paquete medicamentos',
        priority: Priority.URGENT,
        scheduledDate: new Date(),
        status: 'ASSIGNED' as const,
      },
      {
        customerId: allCustomers[2].id,
        description: 'Suministros restaurante',
        priority: Priority.NORMAL,
        status: 'PENDING' as const,
      },
    ];

    for (const delivery of deliveries) {
      await prisma.delivery.create({
        data: delivery,
      });
    }
    console.log('✅ Sample deliveries created');
  }

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test credentials:');
  console.log('  Admin: admin@certilog.com / admin123');
  console.log('  Dispatcher: dispatch@certilog.com / dispatch123');
  console.log('  Courier (Pedro): PIN 1234 or pedro / courier123');
  console.log('  Courier (María): PIN 5678 or maria / courier123');
  console.log('  Courier (Carlos): PIN 9012 or carlos / courier123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
