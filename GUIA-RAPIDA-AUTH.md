# 🚀 Guía Rápida: Backend con Supabase Auth

## 📋 Requisitos Previos

1. ✅ Script SQL ejecutado en Supabase (ya lo ejecutaste según mencionaste)
2. ✅ Node.js >= 18.0.0 instalado
3. ✅ Proyecto Supabase creado

---

## 🔧 Paso 1: Configurar Variables de Entorno

### Obtener credenciales de Supabase:

1. Ve a tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Ve a **Settings → API**
3. Copia los siguientes valores:

```bash
Project URL          → SUPABASE_URL
anon public key      → SUPABASE_ANON_KEY
service_role key     → SUPABASE_SERVICE_KEY (⚠️ Mantener secreta)
```

4. Edita el archivo `.env` y reemplaza los valores:

```env
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_real_aqui
SUPABASE_SERVICE_KEY=tu_service_key_real_aqui
```

---

## 📦 Paso 2: Instalar Dependencias

```bash
npm install
```

---

## 👥 Paso 3: Crear los 3 Usuarios Iniciales

Ejecuta el script para crear los usuarios en Supabase:

```bash
npm run create-users
```

Esto creará automáticamente:

### 1. **ADMINISTRADOR**
- Email: `admin@botica.com`
- Password: `admin123`
- DNI: `12345678`
- Rol: ADMINISTRATIVO (id_rol: 1)

### 2. **VENDEDOR**
- Email: `vendedor@botica.com`
- Password: `vendedor123`
- DNI: `87654321`
- Rol: VENDEDOR (id_rol: 2)

### 3. **ALMACENERO**
- Email: `almacenero@botica.com`
- Password: `almacenero123`
- DNI: `11223344`
- Rol: ALMACENERO (id_rol: 3)

**⚠️ IMPORTANTE:** El script creará los usuarios en Supabase Auth y el trigger automáticamente creará las filas correspondientes en la tabla `usuario`.

---

## 🚀 Paso 4: Iniciar el Servidor

```bash
npm run dev
```

Deberías ver algo como:

```
═══════════════════════════════════════════════════════
🚀 Servidor iniciado correctamente
═══════════════════════════════════════════════════════
📍 Entorno: development
🌐 URL: http://localhost:5000
📡 API: http://localhost:5000/api/v1
❤️  Health Check: http://localhost:5000/api/v1/health
═══════════════════════════════════════════════════════
```

---

## 🧪 Paso 5: Probar la API

### 1. Health Check

```bash
curl http://localhost:5000/api/v1/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2026-08-12T15:30:00.000Z"
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@botica.com",
    "password": "admin123"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id_usuario": 1,
      "email": "admin@botica.com",
      "dni": "12345678",
      "nombre_usuario": "admin.jperez",
      "nombre_completo": "Juan Pérez Gómez",
      "foto_perfil_url": "https://ui-avatars.com/api/?name=Juan+Pérez+Gómez...",
      "telefono": "987654321",
      "rol": {
        "id_rol": 1,
        "nombre_rol": "ADMINISTRATIVO",
        "descripcion": "Acceso total: gestión de usuarios, reportes y configuración",
        "estado_logico": true,
        "fecha_registro": "2026-08-12T..."
      }
    },
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "v1.MR5m...",
      "expires_at": 1723478400
    }
  }
}
```

### 3. Obtener Perfil (requiere autenticación)

```bash
curl http://localhost:5000/api/v1/auth/profile \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI"
```

### 4. Registrar Nuevo Usuario (solo Admin)

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_DE_ADMIN" \
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

## 📚 Endpoints Disponibles

### Autenticación (Public)
- `POST /api/v1/auth/login` - Login de usuario
- `POST /api/v1/auth/refresh` - Refrescar token

### Autenticación (Private)
- `GET /api/v1/auth/profile` - Obtener perfil del usuario autenticado
- `POST /api/v1/auth/logout` - Cerrar sesión

### Autenticación (Admin Only)
- `POST /api/v1/auth/register` - Registrar nuevo usuario

### Utilidades
- `GET /api/v1/health` - Verificar estado de la API

---

## 🔐 Roles y Permisos

### 1. ADMINISTRATIVO (id_rol: 1)
- ✅ Acceso total al sistema
- ✅ Crear, editar y eliminar usuarios
- ✅ Ver todos los reportes
- ✅ Configuración del sistema

### 2. VENDEDOR (id_rol: 2)
- ✅ Registrar ventas
- ✅ Ver productos
- ✅ Buscar clientes
- ❌ No puede gestionar inventario directamente

### 3. ALMACENERO (id_rol: 3)
- ✅ Gestionar inventario
- ✅ Registrar lotes
- ✅ Movimientos de stock
- ❌ No puede registrar ventas

---

## 🛠️ Uso en Middlewares

### Proteger rutas (requiere autenticación)

```typescript
import { authenticate } from './middlewares/auth.middleware';

router.get('/productos', authenticate, obtenerProductos);
```

### Proteger por rol específico

```typescript
import { authenticate, isAdmin, isVendedorOrAdmin } from './middlewares/auth.middleware';

// Solo administradores
router.post('/usuarios', authenticate, isAdmin, crearUsuario);

// Vendedores o administradores
router.post('/ventas', authenticate, isVendedorOrAdmin, registrarVenta);
```

### Proteger con roles personalizados

```typescript
import { authenticate, authorize, RolEnum } from './middlewares/auth.middleware';

// Solo almaceneros o admins
router.post('/inventario', 
  authenticate, 
  authorize([RolEnum.ADMINISTRATIVO, RolEnum.ALMACENERO]), 
  agregarInventario
);
```

---

## 🔍 Verificar Usuarios Creados

### En Supabase Dashboard:

1. **Ver en Auth:**
   - Ve a **Authentication → Users**
   - Deberías ver los 3 usuarios creados

2. **Ver en Base de Datos:**
   - Ve a **Table Editor → usuario**
   - Deberías ver las 3 filas con sus datos completos

### Ejecutar Query SQL:

```sql
SELECT 
  u.id_usuario,
  u.email,
  u.dni,
  u.nombre_usuario,
  u.nombre_completo,
  r.nombre_rol
FROM usuario u
JOIN rol r ON r.id_rol = u.id_rol
WHERE u.estado_logico = true
ORDER BY u.id_rol;
```

---

## ⚠️ Troubleshooting

### Error: "SUPABASE_URL no está definida"
- Verifica que hayas editado el archivo `.env`
- Asegúrate de que no haya espacios extras
- Reinicia el servidor después de editar `.env`

### Error: "Usuario no encontrado en la tabla usuario"
- Verifica que el trigger `trg_crear_perfil_usuario` exista:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'trg_crear_perfil_usuario';
  ```
- Si no existe, ejecuta nuevamente la parte del trigger del script SQL

### Error al crear usuarios duplicados
- El script detecta automáticamente usuarios existentes
- Si quieres recrearlos, elimínalos primero desde Supabase Dashboard

### CORS Error desde el frontend
- Agrega la URL de tu frontend al `.env`:
  ```env
  CORS_ORIGIN=http://localhost:5173,http://localhost:3000
  ```

---

## 📖 Próximos Pasos

1. ✅ Usuarios creados y backend funcionando
2. ⏭️ Conectar el frontend con el backend
3. ⏭️ Crear endpoints para productos, ventas, etc.
4. ⏭️ Implementar protección por roles en cada módulo

---

## 📞 Soporte

Si tienes problemas, verifica:
- ✅ Variables de entorno correctas en `.env`
- ✅ Script SQL ejecutado completamente en Supabase
- ✅ Trigger creado correctamente
- ✅ Usuarios creados en Auth y en tabla usuario

**¡Listo! Tu backend con Supabase Auth está configurado y funcionando! 🎉**
