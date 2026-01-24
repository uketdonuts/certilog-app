const API = 'http://localhost:2120';

async function main() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { data: { token } } = await loginRes.json();

  // Get Pedro's ID first
  const locRes = await fetch(`${API}/api/locations/couriers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data: couriers } = await locRes.json();
  const pedro = couriers.find(c => c.fullName === 'Pedro Mensajero');

  if (!pedro) {
    console.log('Pedro no encontrado');
    return;
  }

  console.log('Courier ID:', pedro.courierId);

  // Get history with date range
  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago
  const toDate = new Date().toISOString();

  const histRes = await fetch(
    `${API}/api/locations/courier/${pedro.courierId}/history?limit=100&fromDate=${fromDate}&toDate=${toDate}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const hist = await histRes.json();

  const points = hist.data?.data || [];
  console.log('Total puntos de historial:', points.length);

  if (points.length > 0) {
    console.log('\nÚltimos 10 puntos:');
    points.slice(0, 10).forEach((p, i) => {
      const time = new Date(p.recordedAt).toLocaleString();
      console.log(`${i+1}. ${p.lat}, ${p.lng} - ${time}`);
    });
  }
}

main().catch(console.error);
