# 🏥 Botica Control - Backend API

Sistema de gestión integral para farmacias desarrollado con Node.js, Express, TypeScript y Supabase.

## 🚀 Inicio Rápido

### 1️⃣ Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales de Supabase
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
```

### 2️⃣ Instalar Dependencias

```bash
npm install
```

### 3️⃣ Crear Usuarios Iniciales

```bash
npm run create-users
```

Esto creará 3 usuarios de prueba:
- **Admin:** admin@botica.com / admin123
- **Vendedor:** vendedor@botica.com / vendedor123
- **Almacenero:** almacenero@botica.com / almacenero123

### 4️⃣ Iniciar Servidor

```bash
npm run dev
```

El servidor estará disponible en: **http://localhost:5000**

---

## 📚 Documentación

- **[📖 GUIA-RAPIDA-AUTH.md](./GUIA-RAPIDA-AUTH.md)** - Guía completa paso a paso
- **[🔗 INTEGRACION-FRONTEND.md](./INTEGRACION-FRONTEND.md)** - Cómo conectar con React
- **[📋 RESUMEN-CONFIGURACION.md](./RESUMEN-CONFIGURACION.md)** - Resumen técnico completo
- **[🧪 Botica-API.postman_collection.json](./Botica-API.postman_collection.json)** - Colección Postman

---

## 🛠️ Stack Tecnológico

- **Runtime:** Node.js >= 18.0.0
- **Framework:** Express.js
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL (Supabase)
- **Autenticación:** Supabase Auth
- **Validación:** express-validator
- **Seguridad:** Helmet, CORS

---

## 📡 Endpoints Principales

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/health` | Health check | No |
| POST | `/api/v1/auth/login` | Login de usuario | No |
| GET | `/api/v1/auth/profile` | Obtener perfil | Sí |
| POST | `/api/v1/auth/logout` | Cerrar sesión | Sí |
| POST | `/api/v1/auth/register` | Registrar usuario | Admin |
| POST | `/api/v1/auth/refresh` | Refrescar token | No |

---

## 🔐 Sistema de Roles

### 1. ADMINISTRATIVO (id_rol: 1)
- ✅ Acceso total al sistema
- ✅ Gestión de usuarios
- ✅ Reportes y configuración

### 2. VENDEDOR (id_rol: 2)
- ✅ Registrar ventas
- ✅ Gestionar clientes
- ✅ Ver productos

### 3. ALMACENERO (id_rol: 3)
- ✅ Gestionar inventario
- ✅ Registrar lotes
- ✅ Movimientos de stock

---

## 📁 Estructura del Proyecto

```
botica-bakend/
├── scripts/
│   └── create-users.ts          # Script creación usuarios
├── src/
│   ├── config/
│   │   ├── supabase.ts          # Cliente Supabase
│   │   └── env.ts               # Configuración
│   ├── controllers/
│   │   └── auth.controller.ts   # Lógica autenticación
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # Autenticación
│   │   ├── error.middleware.ts  # Errores
│   │   └── validation.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts       # Rutas auth
│   │   └── index.ts             # Router principal
│   ├── schemas/
│   │   └── auth.schema.ts       # Validaciones
│   ├── types/
│   │   └── index.ts             # Tipos TypeScript
│   ├── app.ts                   # App Express
│   └── server.ts                # Servidor
├── .env                         # Variables de entorno
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🧪 Probar con cURL

### Health Check
```bash
curl http://localhost:5000/api/v1/health
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@botica.com","password":"admin123"}'
```

### Obtener Perfil
```bash
curl http://localhost:5000/api/v1/auth/profile \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

## 📦 Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm start            # Producción
npm run create-users # Crear usuarios iniciales
npm test             # Ejecutar tests
npm run lint         # Linter
npm run format       # Formatear código
```

---

## 🔧 Variables de Entorno Requeridas

```env
# Servidor
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Supabase (⚠️ Obligatorias)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_KEY=tu_service_key_aqui

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Obtener credenciales:**
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Settings → API
4. Copia: Project URL, anon key, service_role key

---

## 🚨 Requisitos Previos

1. ✅ **Script SQL ejecutado en Supabase**
   - Tablas creadas
   - Trigger `trg_crear_perfil_usuario` activo
   - Función `fn_actualizar_ultimo_acceso` creada

2. ✅ **Node.js >= 18.0.0**

3. ✅ **Proyecto Supabase creado**

---

## 🛡️ Seguridad

- ✅ JWT tokens con Supabase Auth
- ✅ Helmet para headers HTTP seguros
- ✅ CORS configurado
- ✅ Validación de inputs con express-validator
- ✅ Rate limiting (configurable)
- ✅ Variables de entorno para secretos

---

## 🔄 Flujo de Autenticación

```
1. Cliente → POST /auth/login (email + password)
2. Backend → Valida con Supabase Auth
3. Supabase → Devuelve JWT tokens
4. Backend → Consulta tabla usuario + rol
5. Backend → Actualiza último_acceso
6. Backend → Devuelve: usuario + rol + tokens
7. Cliente → Guarda tokens en localStorage
8. Cliente → Envía token en header Authorization
9. Middleware → Valida token y rol
10. Controller → Ejecuta lógica
```

---

## 🌐 Deployment en Producción

### Deploy en Render (Recomendado)

```bash
# 1. Ver guía completa de deployment
# Archivo: DEPLOYMENT-RENDER.md

# 2. Checklist rápido (30 minutos)
# Archivo: QUICK-DEPLOYMENT-CHECKLIST.md

# 3. Verificar deployment
node scripts/verify-deployment.js https://tu-backend.onrender.com
```

**Archivos de Deployment:**
- 📖 **[DEPLOYMENT-RENDER.md](./DEPLOYMENT-RENDER.md)** - Guía completa paso a paso
- ✅ **[QUICK-DEPLOYMENT-CHECKLIST.md](./QUICK-DEPLOYMENT-CHECKLIST.md)** - Checklist de 30 minutos
- 📝 **[render.yaml](./render.yaml)** - Configuración de Render

**URLs en Producción:**
- Backend: `https://botica-backend.onrender.com`
- Frontend: `https://tu-app.vercel.app`
- Supabase: `https://supabase.com/dashboard`

---

## 📈 Próximos Pasos

- [x] Sistema de autenticación completo
- [x] Deploy backend en Render
- [x] Conectar con frontend en Vercel
- [ ] Crear módulos de:
  - [ ] Productos
  - [ ] Categorías
  - [ ] Proveedores
  - [ ] Ventas
  - [ ] Inventario
  - [ ] Clientes
- [ ] Implementar búsqueda y filtros
- [ ] Agregar reportes
- [ ] Tests unitarios e integración
- [ ] Documentación API con Swagger

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto es parte del sistema de gestión de Botica Control - Farmacia Picota.

---

## 👥 Autores

- Equipo Botica Picota

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisa la documentación en `/docs`
2. Verifica el archivo `GUIA-RAPIDA-AUTH.md`
3. Consulta los ejemplos en Postman

---

**Versión:** 1.0.0  
**Última actualización:** 12 de agosto de 2026

---

## ✨ Características

- ✅ Autenticación JWT con Supabase
- ✅ Sistema de roles (Admin, Vendedor, Almacenero)
- ✅ Protección de rutas por rol
- ✅ Validación de datos
- ✅ Manejo centralizado de errores
- ✅ Health check endpoint
- ✅ Refresh token automático
- ✅ CORS configurado
- ✅ TypeScript completo
- ✅ Documentación completa

**¡Backend listo para usar! 🚀**
