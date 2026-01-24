const API = 'http://localhost:2120';

async function main() {
  // Login
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;

  if (!token) {
    console.log('No token');
    return;
  }

  // Get locations
  const locRes = await fetch(`${API}/api/locations/couriers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const locData = await locRes.json();
  const couriers = locData.data || [];

  const pedro = couriers.find(c => c.fullName === 'Pedro Mensajero');
  if (pedro?.location) {
    const { lat, lng, recordedAt } = pedro.location;
    console.log(`Lat: ${lat}`);
    console.log(`Lng: ${lng}`);
    console.log(`Recorded: ${recordedAt}`);
    console.log(`\nGoogle Maps: https://www.google.com/maps?q=${lat},${lng}`);
  } else {
    console.log('Pedro no tiene ubicación registrada');
  }
}

main().catch(console.error);
