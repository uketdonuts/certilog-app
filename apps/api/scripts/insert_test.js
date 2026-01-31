const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const user = await p.user.upsert({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      update: {},
      create: { id: '11111111-1111-1111-1111-111111111111', fullName: 'Test Courier' },
    });

    const customer = await p.customer.upsert({
      where: { id: '22222222-2222-2222-2222-222222222222' },
      update: {},
      create: { id: '22222222-2222-2222-2222-222222222222', name: 'Test Customer', phone: '60000000', address: 'Calle 1, Panama City' },
    });

    const delivery = await p.delivery.upsert({
      where: { id: '33333333-3333-3333-3333-333333333333' },
      update: {},
      create: {
        id: '33333333-3333-3333-3333-333333333333',
        trackingCode: 'TRACK-TEST',
        publicTrackingToken: 'test-token-123',
        customerId: customer.id,
        courierId: user.id,
        status: 'IN_TRANSIT',
        priority: 'NORMAL',
      },
    });

    await p.deliveryRoutePoint.upsert({
      where: { id: '44444444-4444-4444-4444-444444444444' },
      update: {},
      create: {
        id: '44444444-4444-4444-4444-444444444444',
        deliveryId: delivery.id,
        courierId: user.id,
        latitude: 9.0,
        longitude: -79.5,
      },
    });

    await p.deliveryRoutePoint.upsert({
      where: { id: '55555555-5555-5555-5555-555555555555' },
      update: {},
      create: {
        id: '55555555-5555-5555-5555-555555555555',
        deliveryId: delivery.id,
        courierId: user.id,
        latitude: 9.0005,
        longitude: -79.4995,
      },
    });

    console.log('Test data inserted/updated. Delivery id:', delivery.id);
  } catch (e) {
    console.error('Error inserting test data:', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
