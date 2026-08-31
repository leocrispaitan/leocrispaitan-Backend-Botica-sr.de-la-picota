# 📋 Resumen de Configuración - Backend Botica Control

## ✅ Archivos Creados

### 📁 Configuración Base
- ✅ `.env` - Variables de entorno (debes configurar con tus credenciales de Supabase)
- ✅ `package.json` - Dependencias actualizadas con script `create-users`

### 📁 src/config/
- ✅ `supabase.ts` - Clientes de Supabase (público y admin)
- ✅ `env.ts` - Configuración centralizada y validación de variables de entorno

### 📁 src/types/
- ✅ `index.ts` - Interfaces TypeScript (Usuario, Rol, AuthUser, ApiResponse, etc.)

### 📁 src/middlewares/
- ✅ `auth.middleware.ts` - Autenticación y autorización (authenticate, authorize, isAdmin, isVendedorOrAdmin, isAlmaceneroOrAdmin)
- ✅ `error.middleware.ts` - Manejo de errores (errorHandler, notFound)
- ✅ `validation.middleware.ts` - Validación de requests (validate, validateRequest)

### 📁 src/controllers/
- ✅ `auth.controller.ts` - Controladores de autenticación (login, logout, getProfile, register, refreshToken)

### 📁 src/schemas/
- ✅ `auth.schema.ts` - Validaciones con express-validator (loginValidation, registerValidation, refreshTokenValidation)

### 📁 src/routes/
- ✅ `auth.routes.ts` - Rutas de autenticación
- ✅ `index.ts` - Router principal con health check

### 📁 src/
- ✅ `app.ts` - Configuración de Express (middlewares, CORS, helmet, morgan)
- ✅ `server.ts` - Inicialización del servidor

### 📁 scripts/
- ✅ `create-users.ts` - Script para crear los 3 usuarios iniciales

### 📁 Documentación
- ✅ `GUIA-RAPIDA-AUTH.md` - Guía completa paso a paso
- ✅ `INTEGRACION-FRONTEND.md` - Ejemplos de integración con React
- ✅ `RESUMEN-CONFIGURACION.md` - Este archivo

---

## 🚀 Pasos para Empezar

### 1. Configurar Variables de Entorno

Edita el archivo `.env` y agrega tus credenciales de Supabase:

```env
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_KEY=tu_service_key_aqui
```

**Dónde obtener las credenciales:**
- Ve a https://supabase.com/dashboard
- Selecciona tu proyecto
- Ve a Settings → API
- Copia: Project URL, anon public key, service_role key

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Crear los 3 Usuarios Iniciales

```bash
npm run create-users
```

Esto creará:
- **Admin:** admin@botica.com / admin123
- **Vendedor:** vendedor@botica.com / vendedor123
- **Almacenero:** almacenero@botica.com / almacenero123

### 4. Iniciar el Servidor

```bash
npm run dev
```

El servidor estará disponible en:
- 🌐 http://localhost:5000
- 📡 API: http://localhost:5000/api/v1
- ❤️  Health: http://localhost:5000/api/v1/health

---

## 📚 Endpoints Disponibles

### Public (sin autenticación)
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refrescar token
- `GET /api/v1/health` - Health check

### Private (requiere token)
- `GET /api/v1/auth/profile` - Obtener perfil
- `POST /api/v1/auth/logout` - Logout

### Admin Only
- `POST /api/v1/auth/register` - Registrar nuevo usuario

---

## 🔐 Sistema de Autenticación

### Flujo de Login

1. **Cliente envía credenciales** → `POST /api/v1/auth/login`
2. **Backend autentica con Supabase Auth** → Valida email/password
3. **Backend obtiene datos de tabla usuario** → Con rol incluido
4. **Backend actualiza último_acceso** → Función `fn_actualizar_ultimo_acceso`
5. **Backend devuelve:** 
   - Datos del usuario
   - Access token (JWT)
   - Refresh token

### Flujo de Protección de Rutas

1. **Cliente envía request** → Header: `Authorization: Bearer <token>`
2. **Middleware `authenticate`** → Valida token con Supabase
3. **Middleware obtiene usuario** → De tabla `usuario` con rol
4. **Middleware `authorize`** → Verifica rol si es necesario
5. **Controller ejecuta** → Si todo está OK

### Roles del Sistema

```typescript
enum RolEnum {
  ADMINISTRATIVO = 1,  // Acceso total
  VENDEDOR = 2,        // Ventas y clientes
  ALMACENERO = 3,      // Inventario y stock
}
```

---

## 🛡️ Middlewares de Autorización

### authenticate
Verifica que el usuario esté autenticado.

```typescript
router.get('/productos', authenticate, obtenerProductos);
```

### isAdmin
Solo administradores.

```typescript
router.post('/usuarios', authenticate, isAdmin, crearUsuario);
```

### isVendedorOrAdmin
Vendedores o administradores.

```typescript
router.post('/ventas', authenticate, isVendedorOrAdmin, registrarVenta);
```

### isAlmaceneroOrAdmin
Almaceneros o administradores.

```typescript
router.post('/inventario', authenticate, isAlmaceneroOrAdmin, agregarStock);
```

### authorize (personalizado)
Roles específicos.

```typescript
router.put('/productos', 
  authenticate, 
  authorize([RolEnum.ADMINISTRATIVO, RolEnum.ALMACENERO]), 
  editarProducto
);
```

---

## 🧪 Probar la API

### 1. Health Check

```bash
curl http://localhost:5000/api/v1/health
```

### 2. Login como Admin

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@botica.com",
    "password": "admin123"
  }'
```

**Guarda el `access_token` que devuelve.**

### 3. Obtener Perfil

```bash
curl http://localhost:5000/api/v1/auth/profile \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN>"
```

### 4. Registrar Nuevo Usuario (como Admin)

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN_DE_ADMIN>" \
  -d '{
    "email": "cajero@botica.com",
    "password": "Cajero2024!",
    "dni": "55667788",
    "nombre_usuario": "caj.pgarcia",
    "nombre_completo": "Pedro García Torres",
    "id_rol": 2,
    "telefono": "955443322"
  }'
```

---

## 📦 Dependencias Instaladas

### Producción
- `@supabase/supabase-js` - Cliente de Supabase
- `express` - Framework web
- `cors` - CORS middleware
- `dotenv` - Variables de entorno
- `helmet` - Seguridad HTTP headers
- `morgan` - HTTP logger
- `express-validator` - Validación de requests
- `typescript` - TypeScript
- `ts-node-dev` - Development server

### Desarrollo
- `@types/*` - Type definitions
- `eslint` - Linter
- `prettier` - Formatter
- `jest` - Testing
- `ts-jest` - Jest con TypeScript

---

## 🗂️ Estructura del Proyecto

```
botica-bakend/
├── scripts/
│   └── create-users.ts          # Script para crear usuarios
├── src/
│   ├── config/
│   │   ├── supabase.ts          # Cliente Supabase
│   │   └── env.ts               # Configuración entorno
│   ├── controllers/
│   │   └── auth.controller.ts   # Controladores auth
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # Auth & autorización
│   │   ├── error.middleware.ts  # Manejo de errores
│   │   └── validation.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts       # Rutas de auth
│   │   └── index.ts             # Router principal
│   ├── schemas/
│   │   └── auth.schema.ts       # Validaciones
│   ├── types/
│   │   └── index.ts             # Interfaces TypeScript
│   ├── app.ts                   # Configuración Express
│   └── server.ts                # Servidor principal
├── .env                         # Variables de entorno
├── package.json
├── tsconfig.json
├── GUIA-RAPIDA-AUTH.md
├── INTEGRACION-FRONTEND.md
└── RESUMEN-CONFIGURACION.md
```

---

## 🔄 Scripts NPM Disponibles

```bash
npm run dev           # Iniciar servidor en modo desarrollo
npm run build         # Compilar TypeScript a JavaScript
npm start             # Iniciar servidor en producción
npm run create-users  # Crear usuarios iniciales
npm test              # Ejecutar tests
npm run lint          # Ejecutar linter
npm run format        # Formatear código
```

---

## ⚠️ Importante para Producción

### Variables de Entorno
- ✅ Usa variables de entorno reales (no las de ejemplo)
- ✅ Nunca compartas tu `SUPABASE_SERVICE_KEY`
- ✅ Cambia las contraseñas de los usuarios de prueba

### Seguridad
- ✅ Habilita HTTPS en producción
- ✅ Configura CORS correctamente
- ✅ Implementa rate limiting
- ✅ Valida todas las entradas

### Base de Datos
- ✅ Verifica que el trigger `trg_crear_perfil_usuario` esté activo
- ✅ Configura RLS (Row Level Security) en Supabase
- ✅ Haz backups regulares

---

## 🎯 Próximos Pasos

1. ✅ Backend configurado y usuarios creados
2. ⏭️ Conectar frontend (ver `INTEGRACION-FRONTEND.md`)
3. ⏭️ Crear endpoints para:
   - Productos
   - Categorías
   - Proveedores
   - Ventas
   - Inventario
   - Clientes
4. ⏭️ Implementar búsqueda y filtros
5. ⏭️ Agregar reportes y estadísticas

---

## 📞 Verificación Rápida

### ✅ Checklist de Configuración Completa

- [ ] Variables de entorno configuradas en `.env`
- [ ] Dependencias instaladas (`npm install`)
- [ ] Script SQL ejecutado en Supabase
- [ ] Trigger `trg_crear_perfil_usuario` creado
- [ ] 3 usuarios creados (`npm run create-users`)
- [ ] Servidor iniciado sin errores (`npm run dev`)
- [ ] Health check responde OK (http://localhost:5000/api/v1/health)
- [ ] Login funciona con admin@botica.com

Si todos los items están marcados, **¡estás listo para continuar! 🎉**

---

**Documentación creada:** 12 de agosto de 2026  
**Versión:** 1.0.0  
**Backend:** Node.js + Express + TypeScript + Supabase
