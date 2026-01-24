import { execSync } from 'node:child_process';

const API_URL = process.env.API_URL ?? 'http://localhost:2120';
const COURIER_USERNAME = process.env.COURIER_USERNAME ?? 'pedro';
const COURIER_PASSWORD = process.env.COURIER_PASSWORD ?? 'courier123';
const DISPATCH_EMAIL = process.env.DISPATCH_EMAIL ?? 'dispatch@certilog.com';
const DISPATCH_PASSWORD = process.env.DISPATCH_PASSWORD ?? 'dispatch123';

async function postJson(path, body) {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${r.status}): ${text}`);
  }
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function getJson(path, token) {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${r.status}): ${text}`);
  }
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function tryConnectSocket(dispatchToken) {
  try {
    const mod = await import('socket.io-client');
    const io = mod.io;

    const socket = io(API_URL, {
      auth: { token: dispatchToken },
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 6000);
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('connect_error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });

    return socket;
  } catch (e) {
    console.warn('⚠️  Socket.IO check skipped:', e?.message ?? String(e));
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function publishMqttLocationFromApiContainer({ courierId, token }) {
  const js = [
    "const mqtt=require('mqtt');",
    "const courierId=process.env.COURIER_ID;",
    "const token=process.env.TOKEN;",
    "const client=mqtt.connect('mqtt://emqx:1883',{reconnectPeriod:0});",
    "client.on('connect',()=>{",
    "  const topic=`couriers/${courierId}/location`;",
    "  const payload=JSON.stringify({token,lat:18.4872,lng:-69.9321,accuracy:12,speed:2.1,battery:77,ts:Date.now()});",
    "  client.publish(topic,payload,{qos:1},(err)=>{",
    "    if(err){console.error('PUBLISH_ERR',err);process.exit(2);}",
    "    console.log('PUBLISHED',topic);",
    "    client.end(true,()=>process.exit(0));",
    "  });",
    "});",
    "client.on('error',(e)=>{console.error('MQTT_ERR',e);process.exit(1);});",
  ].join('');

  // Use docker exec so we don't need mqtt installed on the host.
  execSync(
    `docker exec -e COURIER_ID=${courierId} -e TOKEN=${token} certilog-api node -e "${js.replaceAll('"', '\\"')}"`,
    { stdio: 'inherit' }
  );
}

(async () => {
  const courierLogin = await postJson('/api/auth/login', {
    username: COURIER_USERNAME,
    password: COURIER_PASSWORD,
  });

  const courierId = courierLogin.data.user.id;
  const courierToken = courierLogin.data.token;

  console.log(`COURIER_ID=${courierId}`);

  const dispatchLogin = await postJson('/api/auth/login', {
    email: DISPATCH_EMAIL,
    password: DISPATCH_PASSWORD,
  });

  const dispatchToken = dispatchLogin.data.token;
  const socket = await tryConnectSocket(dispatchToken);

  const socketEventPromise = socket
    ? new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 4000);
        socket.on('courier:location', (evt) => {
          if (evt?.courierId === courierId) {
            clearTimeout(timer);
            resolve(true);
          }
        });
      })
    : Promise.resolve(null);

  publishMqttLocationFromApiContainer({ courierId, token: courierToken });

  const socketOk = await socketEventPromise;
  if (socketOk === true) {
    console.log('✅ Socket.IO event received (courier:location)');
  }

  if (socket) socket.disconnect();

  // Give the ingest a moment to persist.
  await sleep(1500);
  const locations = await getJson('/api/locations/couriers', dispatchToken);

  const entry = Array.isArray(locations.data)
    ? locations.data.find((x) => x?.courierId === courierId)
    : null;

  if (!entry?.location) {
    console.error('❌ Did not find persisted location for courier');
    console.error(JSON.stringify(entry ?? locations, null, 2));
    process.exit(3);
  }

  console.log('✅ Location persisted and queryable via /api/locations/couriers');
  console.log(JSON.stringify(entry, null, 2));

  if (socketOk === false) {
    console.warn('⚠️  Did not observe Socket.IO courier:location event within timeout (persistence OK).');
  }
})();
