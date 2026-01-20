# CertiLog - Sistema de Gestión de Entregas

Sistema completo para gestión de entregas con app Android, dashboard web y API backend.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVIDOR                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Node.js    │  │  PostgreSQL │  │  Socket.IO  │  │ Cloudinary│  │
│  │  Express    │  │             │  │  (Realtime) │  │ (Storage) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   DASHBOARD     │      │   APP ANDROID   │      │   APP ANDROID   │
│   (Next.js)     │      │   (Expo)        │      │   (Expo)        │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Requisitos

- Node.js 18+
- Docker (para PostgreSQL)
- Cuenta de Cloudinary (para almacenar fotos)
- Cuenta de Mapbox (para mapas)

## Instalación

### 1. Clonar e instalar dependencias

```bash
cd certilog-app
npm install
```

### 2. Configurar variables de entorno

```bash
# API
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con tus credenciales

# Dashboard
cp apps/dashboard/.env.example apps/dashboard/.env.local

# Mobile
cp apps/mobile/.env.example apps/mobile/.env
```

### 3. Iniciar base de datos

```bash
docker-compose up -d
```

### 4. Ejecutar migraciones y seed

```bash
cd apps/api
npx prisma db push
npm run db:seed
```

### 5. Iniciar servicios de desarrollo

```bash
# En la raíz del proyecto (inicia todo)
npm run dev

# O individualmente:
npm run dev:api      # API en http://localhost:2120
npm run dev:dashboard # Dashboard en http://localhost:3000
npm run dev:mobile   # Expo en http://localhost:19000
```

## Credenciales de prueba

| Rol | Usuario | Contraseña/PIN |
|-----|---------|----------------|
| Admin | admin@certilog.com | admin123 |
| Despachador | dispatch@certilog.com | dispatch123 |
| Mensajero | pedro | PIN: 1234 o courier123 |
| Mensajero | maria | PIN: 5678 o courier123 |
| Mensajero | carlos | PIN: 9012 o courier123 |

## Estructura del Proyecto

```
certilog-app/
├── apps/
│   ├── api/           # Backend Node.js + Express
│   ├── dashboard/     # Dashboard Next.js
│   └── mobile/        # App Android/iOS Expo
├── packages/
│   └── shared/        # Tipos y constantes compartidas
├── docker-compose.yml
└── package.json
```

## Funcionalidades

### App Android (Mensajeros)
- Login con PIN o usuario/contraseña
- Lista de entregas asignadas
- Detalle de entrega con navegación GPS
- Captura de foto optimizada (~200KB)
- Captura de firma digital
- Botón de WhatsApp directo al cliente
- Funcionamiento offline

### Dashboard Web (Admin/Despachador)
- Gestión de entregas (crear, asignar, ver estado)
- Gestión de clientes
- Mapa en tiempo real con ubicación de mensajeros
- Estadísticas de entregas

### API Backend
- Autenticación JWT + PIN
- CRUD completo de usuarios, clientes y entregas
- Upload de fotos a Cloudinary
- Socket.IO para tiempo real
- Push notifications con FCM

## Generar APK

```bash
cd apps/mobile
npx eas build --platform android --profile preview
```

## Variables de Entorno

### API (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Dashboard (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:2120
NEXT_PUBLIC_MAPBOX_TOKEN=...
```

### Mobile (.env)
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:2120
```

## Licencia

MIT
