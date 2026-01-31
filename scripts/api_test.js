(async () => {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@certilog.com', password: 'admin123' }),
    });

    const login = await loginRes.json();
    console.log('LOGIN:', JSON.stringify(login));

    const token = login?.data?.token;
    if (!token) {
      console.error('No token received');
      process.exit(1);
    }

    const usersRes = await fetch('http://localhost:3001/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = await usersRes.json();
    console.log('USERS:', JSON.stringify(users));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
