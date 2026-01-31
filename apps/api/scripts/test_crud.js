const API = process.env.API_URL || 'http://localhost:3001/api';
const token = process.env.ADMIN_TOKEN || '';

if (!token) {
  console.error('ADMIN_TOKEN env required');
  process.exit(1);
}

async function req(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw { status: res.status, data };
  return data;
}

(async () => {
  try {
    console.log('Creating vehicle...');
    const plate = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const v = await req('/vehicles', { method: 'POST', body: JSON.stringify({ licensePlate: plate, make: 'TestMake', model: 'T1', year: 2020 }) });
    console.log('Vehicle created:', v.data);

    console.log('Creating gas report...');
    const g = await req('/gas', { method: 'POST', body: JSON.stringify({ vehicleId: v.data.id, liters: 12.5 }) });
    console.log('Gas created:', g.data);

    console.log('Cleanup: deleting vehicle...');
    try {
      await req(`/vehicles/${v.data.id}`, { method: 'DELETE' });
      console.log('Vehicle deleted');
    } catch (e) {
      console.log('Vehicle delete failed (may be unimplemented):', e.data || e);
    }

  } catch (e) {
    console.error('Error in tests:', e);
  }
})();
