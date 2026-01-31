const API = process.env.API_URL || 'http://localhost:3001/api';
const token = process.env.ADMIN_TOKEN || '';

if (!token) {
  console.error('ADMIN_TOKEN env required');
  process.exit(1);
}

function decodeTokenUserId(t) {
  try {
    const parts = t.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.userId || payload.userID || payload.user || null;
  } catch (e) { return null; }
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
    const adminId = decodeTokenUserId(token);
    console.log('adminId from token:', adminId);

    console.log('\n-- Vehicles --');
    const plate = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const v = await req('/vehicles', { method: 'POST', body: JSON.stringify({ licensePlate: plate, make: 'TestMake', model: 'T1', year: 2020 }) });
    console.log('Vehicle created:', v.data.id);

    // update vehicle
    const upd = await req(`/vehicles/${v.data.id}`, { method: 'PUT', body: JSON.stringify({ color: 'Blue' }) });
    console.log('Vehicle updated color:', upd.data.color);

    console.log('\n-- Gas --');
    const g = await req('/gas', { method: 'POST', body: JSON.stringify({ vehicleId: v.data.id, liters: 12.5 }) });
    console.log('Gas created:', g.data.id);

    // delete gas
    const delGas = await req(`/gas/${g.data.id}`, { method: 'DELETE' });
    console.log('Gas deleted');

    console.log('\n-- Absence/Tardy --');
    const userId = adminId || null;
    const a = await req('/absences', { method: 'POST', body: JSON.stringify({ userId, date: new Date().toISOString(), type: 'ABSENCE', reason: 'Test' }) });
    console.log('Absence created:', a.data.id);
    const aUpd = await req(`/absences/${a.data.id}`, { method: 'PUT', body: JSON.stringify({ status: 'APPROVED' }) });
    console.log('Absence updated status:', aUpd.data.status || 'n/a');

    console.log('\n-- Fleet Maintenance --');
    const fm = await req('/fleet-maintenance', { method: 'POST', body: JSON.stringify({ vehicleId: v.data.id, description: 'Test issue', severity: 'LOW' }) });
    console.log('Fleet maintenance created:', fm.data.id);
    const fmUpd = await req(`/fleet-maintenance/${fm.data.id}`, { method: 'PUT', body: JSON.stringify({ status: 'IN_PROGRESS' }) });
    console.log('Fleet maintenance updated status:', fmUpd.data.status);

    console.log('\n-- Preventive --');
    const pv = await req('/preventive', { method: 'POST', body: JSON.stringify({ vehicleId: v.data.id, scheduledAt: new Date().toISOString(), type: 'OIL_CHANGE' }) });
    console.log('Preventive created:', pv.data.id);
    const pvUpd = await req(`/preventive/${pv.data.id}`, { method: 'PUT', body: JSON.stringify({ performedAt: new Date().toISOString() }) });
    console.log('Preventive updated performedAt:', pvUpd.data.performedAt ? 'ok' : 'n/a');

    console.log('\n-- Repair --');
    const rp = await req('/repairs', { method: 'POST', body: JSON.stringify({ vehicleId: v.data.id, description: 'Fixed tire', cost: 50 }) });
    console.log('Repair created:', rp.data.id);

    console.log('\n-- Tire Semaphore --');
    const tr = await req('/tire-semaphore', { method: 'POST', body: JSON.stringify({ vehicleId: v.data.id, frontLeft: 'GOOD', frontRight: 'GOOD', rearLeft: 'GOOD', rearRight: 'GOOD' }) });
    console.log('Tire semaphore created:', tr.data.id);

    console.log('\n-- Cleanup: delete vehicle (should remove dependents) --');
    try {
      await req(`/vehicles/${v.data.id}`, { method: 'DELETE' });
      console.log('Vehicle deleted');
    } catch (e) {
      console.error('Vehicle delete failed:', e);
    }

    console.log('\nAll tests completed');
  } catch (e) {
    console.error('Error in tests:', e);
  }
})();
