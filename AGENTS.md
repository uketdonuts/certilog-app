# CertiLog - AI Agent Guide

> **Document Language**: Spanish/Español (el proyecto utiliza español en documentación, código y UI)
> 
> **Last Updated**: 2026-02-01

## Project Overview

**CertiLog** es un sistema completo de gestión de entregas (delivery management system) diseñado para mensajeros/couriers. Consta de tres componentes principales:

1. **API Backend** (`apps/api`) - Servidor Node.js + Express + Socket.IO
2. **Dashboard Web** (`apps/dashboard`) - Panel de administración Next.js
3. **App Móvil** (`apps/mobile`) - Aplicación Expo/React Native para mensajeros

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE TUNNEL                                │
│         certilog.starkmind.dev → localhost                          │
│         /api/* → localhost:3001 (API)                               │
│         /*     → localhost:3000 (Dashboard)                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   DASHBOARD     │      │   API (Express) │      │   PostgreSQL    │
│   (Next.js)     │◄────►│   + Socket.IO   │◄────►│   + Prisma      │
│   Port 3000     │      │   Port 3001     │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │   APP MÓVIL     │
                          │   (Expo SDK 51) │
                          │   Android/iOS   │
                          └─────────────────┘
```

## Technology Stack

### Monorepo Structure
- **Package Manager**: npm with workspaces
- **Build System**: Turborepo (`turbo.json`)
- **Node Version**: >= 18

### Backend (`apps/api`)
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.IO
- **MQTT**: EMQX para tracking (opcional)
- **Auth**: JWT + bcryptjs
- **Storage**: Cloudinary (para fotos)
- **Push Notifications**: Firebase Admin SDK
- **Dev Tool**: tsx (TypeScript execution)

### Dashboard (`apps/dashboard`)
- **Framework**: Next.js 14.2 (App Router)
- **UI**: React 18 + Tailwind CSS
- **Icons**: Heroicons
- **Maps**: Leaflet + Mapbox (para mapas)
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Dates**: date-fns

### Mobile App (`apps/mobile`)
- **Framework**: Expo SDK 51 + React Native 0.74.5
- **Navigation**: Expo Router (file-based)
- **State**: React Context (AuthContext)
- **Storage**: AsyncStorage + SecureStore
- **Camera**: expo-camera + expo-image-manipulator
- **Location**: expo-location + expo-task-manager
- **Signature**: react-native-signature-canvas
- **Network**: Axios + Socket.IO
- **Maps**: expo-location con GPS nativo

### Shared Package (`packages/shared`)
- Contiene tipos TypeScript compartidos entre apps
- Constantes y configuraciones comunes
- Sin dependencias externas

## Project Structure

```
certilog-app/
├── apps/
│   ├── api/                    # Backend Node.js
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── routes/         # Express routes
│   │   │   ├── controllers/    # Business logic
│   │   │   ├── middleware/     # Auth, upload, etc.
│   │   │   ├── sockets/        # Socket.IO handlers
│   │   │   ├── mqtt/           # MQTT ingest
│   │   │   └── config/         # DB, storage configs
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── package.json
│   ├── dashboard/              # Next.js web app
│   │   ├── app/                # App Router (Next.js 14)
│   │   │   ├── dashboard/      # Protected routes
│   │   │   │   ├── page.tsx    # Dashboard home
│   │   │   │   ├── deliveries/
│   │   │   │   ├── customers/
│   │   │   │   ├── users/
│   │   │   │   ├── map/
│   │   │   │   └── ...
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        # Login redirect
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities, API clients
│   │   └── package.json
│   └── mobile/                 # Expo React Native app
│       ├── app/                # File-based routing
│       │   ├── (auth)/         # Auth group
│       │   │   └── login.tsx
│       │   ├── (tabs)/         # Main courier tabs
│       │   ├── (dispatcher-tabs)/  # Dispatcher tabs
│       │   ├── delivery/       # Delivery detail screens
│       │   ├── _layout.tsx
│       │   └── index.tsx       # Entry/redirect
│       ├── lib/
│       │   ├── api/            # API clients
│       │   ├── services/       # Location, socket, etc.
│       │   ├── context/        # AuthContext
│       │   └── utils/
│       ├── assets/
│       └── package.json
├── packages/
│   └── shared/                 # Shared code
│       ├── src/
│       │   ├── types/index.ts  # Shared TypeScript types
│       │   └── constants/      # Config constants
│       └── package.json
├── scripts/                    # Deployment & utility scripts
│   ├── deploy.sh               # Main deployment script
│   ├── start-services.sh
│   └── start-tunnel.sh
├── .cloudflared/               # Cloudflare Tunnel config
│   └── config.yml
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
└── tsconfig.json               # TypeScript config
```

## Build and Development Commands

### Root Level Commands
```bash
# Install all dependencies
npm install

# Start all apps in dev mode
npm run dev

# Start specific apps
npm run dev:api          # API only (port 3001)
npm run dev:dashboard    # Dashboard only (port 3000)
npm run dev:mobile       # Mobile Expo (port 19000)

# Build all apps
npm run build

# Lint all apps
npm run lint

# Database commands
npm run db:push          # Push schema changes
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
```

### Mobile Specific Commands
```bash
# Start with tunnel (for physical devices)
npm run mobile:start
cd apps/mobile && npx expo start --tunnel

# Start web version
npm run mobile:web

# Build APK
npx eas build --platform android --profile preview
```

### Deployment Commands (Production)
```bash
# Full deployment (compiles and restarts services)
sudo /root/proyectos/certilog-app/scripts/deploy.sh

# Check service status
sudo systemctl status certilog-api certilog-dashboard certilog-tunnel

# View logs
sudo journalctl -u certilog-api -f
sudo journalctl -u certilog-dashboard -f
sudo journalctl -u certilog-tunnel -f
```

## Environment Configuration

### API (`apps/api/.env`)
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/certilog?schema=public"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=""
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=""

# CORS
CORS_ORIGIN="http://localhost:3000,exp://localhost:19000"
```

### Dashboard (`apps/dashboard/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### Mobile (`apps/mobile/.env`)
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:2120
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.100:2120
EXPO_PUBLIC_MQTT_URL=ws://192.168.1.100:8083/mqtt
EXPO_PUBLIC_MQTT_TOPIC_PREFIX=couriers
```

### Production URLs (Cloudflare Tunnel)
- **Dashboard**: https://certilog.starkmind.dev
- **API**: https://certilog.starkmind.dev/api
- **Socket**: wss://certilog.starkmind.dev

## Database Schema (Prisma)

### Main Models
- **User**: Usuarios del sistema (ADMIN, DISPATCHER, COURIER, HELPER)
- **Customer**: Clientes con dirección y coordenadas GPS
- **Delivery**: Entregas con estados (PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED)
- **DeliveryPhoto**: Fotos de entrega (múltiples por entrega)
- **DeliveryRoutePoint**: Puntos de ruta GPS durante entrega
- **CourierLocation**: Ubicación en tiempo real de mensajeros
- **Vehicle**: Vehículos de la flota
- **AttendanceRecord**: Registros de asistencia
- **FleetMaintenanceReport**: Reportes de mantenimiento
- **GasReport**: Reportes de combustible
- **TireSemaphore**: Inspección de llantas

### Enums
```typescript
enum Role { ADMIN, DISPATCHER, COURIER, HELPER }
enum DeliveryStatus { PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED }
enum Priority { LOW, NORMAL, HIGH, URGENT }
```

## Code Style Guidelines

### TypeScript
- **Strict mode**: Habilitado en todos los proyectos
- **Imports**: Usar extensiones `.js` para imports relativos (ESM)
- **Types**: Preferir interfaces sobre types para objetos

### API Conventions
- Rutas bajo `/api` prefix
- Controllers organizados por dominio
- Middleware para auth y upload
- Zod para validación (implícito en tipos)

### Naming Conventions
- **Files**: camelCase para utilidades, PascalCase para componentes
- **Variables**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Database**: snake_case en tablas, camelCase en campos

### React/Next.js
- **Components**: Functional components con hooks
- **State**: useState para local, Context para global (auth)
- **Effects**: useEffect para side effects, cleanup importante
- **Styling**: Tailwind CSS con clases utilitarias

### Mobile (Expo)
- **File-based routing**: `app/` directory
- **Groups**: `(auth)`, `(tabs)` para organización
- **API**: Centralizado en `lib/api/`
- **Services**: `lib/services/` para funcionalidad nativa

## Testing Instructions

### Manual Testing

#### API Testing
```bash
# Health check
curl https://certilog.starkmind.dev/api/

# Auth test (con credenciales de prueba)
curl -X POST https://certilog.starkmind.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@certilog.com","password":"admin123"}'
```

#### Dashboard Testing
1. Acceder a https://certilog.starkmind.dev
2. Login con credenciales de prueba
3. Verificar carga de datos y mapa

#### Mobile Testing
1. Instalar APK en dispositivo Android
2. Configurar URL de API en eas.json
3. Verificar:
   - Login con PIN
   - Lista de entregas
   - Cámara y captura de fotos
   - GPS y tracking
   - Firma digital
   - Botón WhatsApp

### Test Credentials

| Rol | Usuario | Contraseña/PIN |
|-----|---------|----------------|
| Admin | admin@certilog.com | admin123 |
| Despachador | dispatch@certilog.com | dispatch123 |
| Mensajero | pedro | PIN: 1234 o courier123 |
| Mensajero | maria | PIN: 5678 o courier123 |
| Mensajero | carlos | PIN: 9012 o courier123 |

## Deployment Process

### Production Setup (Systemd Services)

1. **API Service** (`/etc/systemd/system/certilog-api.service`)
   - Ejecuta `node dist/index.js` en port 3001
   - Working directory: `/root/proyectos/certilog-app/apps/api`

2. **Dashboard Service** (`/etc/systemd/system/certilog-dashboard.service`)
   - Ejecuta `next start -H 0.0.0.0 -p 3000`
   - Working directory: `/root/proyectos/certilog-app/apps/dashboard`

3. **Tunnel Service** (`/etc/systemd/system/certilog-tunnel.service`)
   - Ejecuta `cloudflared tunnel run certilog`
   - Config: `.cloudflared/config.yml`

### Deployment Steps
```bash
# 1. Run deployment script
sudo /root/proyectos/certilog-app/scripts/deploy.sh

# 2. Script performs:
#    - Compiles API (tsc)
#    - Sets environment variables
#    - Restarts systemd services
#    - Verifies ports are listening
```

### Cloudflare Tunnel Config
```yaml
tunnel: 1cda938f-882c-4c94-9613-ac2df8d88ac4
credentials-file: /root/.cloudflared/1cda938f-882c-4c94-9613-ac2df8d88ac4.json

ingress:
  # API - rutas /api/*
  - hostname: certilog.starkmind.dev
    path: ^/api(/.*)?$
    service: http://localhost:3001
  
  # Dashboard - todo lo demás
  - hostname: certilog.starkmind.dev
    service: http://localhost:3000
  
  - service: http_status:404
```

## Security Considerations

### Authentication
- JWT tokens con expiración corta (15 min)
- Refresh tokens (7 días)
- PIN login para mensajeros (4 dígitos)
- Password hashing con bcryptjs

### CORS
- Configurable via `CORS_ORIGIN` env var
- Soporta múltiples orígenes separados por coma
- Credentials habilitado para orígenes específicos

### File Uploads
- Multer para manejo de archivos
- Cloudinary para almacenamiento seguro
- Validación de tipo y tamaño

### Environment Variables
- Nunca commitar archivos `.env`
- Usar `.env.example` como template
- Variables sensibles solo en servidor

### Mobile Security
- SecureStore para tokens
- Biometric auth (opcional)
- Certificate pinning (considerar)

## Common Issues & Solutions

### Mixed Content Error
**Problem**: Dashboard HTTPS hace requests HTTP
**Solution**: Recompilar dashboard con URLs HTTPS correctas

### SSL Certificate Error
**Problem**: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
**Solution**: Usar path-based routing en Cloudflare Tunnel (un solo dominio)

### Database Connection
**Problem**: Prisma can't connect to PostgreSQL
**Solution**: Verificar `DATABASE_URL` y que PostgreSQL esté corriendo

### Mobile API Not Found
**Problem**: App no encuentra API
**Solution**: Verificar `EXPO_PUBLIC_API_URL` usa IP accesible (no localhost)

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/api/src/index.ts` | API entry point |
| `apps/api/prisma/schema.prisma` | Database schema |
| `apps/dashboard/app/dashboard/layout.tsx` | Dashboard layout with nav |
| `apps/mobile/app/_layout.tsx` | Mobile root layout |
| `apps/mobile/lib/context/AuthContext.tsx` | Auth state management |
| `packages/shared/src/types/index.ts` | Shared TypeScript types |
| `turbo.json` | Turborepo task configuration |
| `.cloudflared/config.yml` | Cloudflare tunnel routing |
| `scripts/deploy.sh` | Production deployment script |

## Development Workflow

1. **Start development**: `npm run dev`
2. **Make changes**: Edit files en `apps/*` o `packages/*`
3. **Test**: Verificar en localhost y/o dispositivo físico
4. **Database changes**: `npm run db:push` para actualizar schema
5. **Commit**: Git commit siguiendo convenciones existentes
6. **Deploy**: Ejecutar `sudo scripts/deploy.sh` en servidor

---

## Contact & Resources

- **Documentación**: `README.md`, `NOTES.md`, `ERRORS.md`
- **Deployment Logs**: `/root/proyectos/certilog-app/logs/`
- **Systemd Logs**: `journalctl -u certilog-*`
