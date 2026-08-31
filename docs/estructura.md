# 📂 Estructura del Proyecto Backend

## Árbol de Directorios Completo

```
botica-backend/
│
├── 📁 src/                                 # Código fuente
│   ├── 📁 config/                          # Configuraciones
│   │   ├── database.ts                     # Conexión Supabase/PostgreSQL
│   │   ├── jwt.ts                          # Config JWT
│   │   └── environment.ts                  # Variables de entorno
│   │
│   ├── 📁 models/                          # Capa de Datos (Model)
│   │   ├── Usuario.model.ts                # ✅ CRUD usuarios
│   │   ├── Rol.model.ts                    # ✅ CRUD roles
│   │   ├── Producto.model.ts               # ✅ CRUD productos
│   │   ├── Categoria.model.ts              # ✅ Catálogo categorías
│   │   ├── FormaFarmaceutica.model.ts      # ✅ Catálogo formas
│   │   ├── ViaAdministracion.model.ts      # ✅ Catálogo vías
│   │   ├── CondicionVenta.model.ts         # ✅ Catálogo condiciones
│   │   ├── ClasificacionATC.model.ts       # ✅ Catálogo ATC
│   │   ├── Laboratorio.model.ts            # ✅ CRUD laboratorios
│   │   ├── RegistroSanitario.model.ts      # ✅ Registros sanitarios
│   │   ├── Cliente.model.ts                # ✅ CRUD clientes
│   │   ├── Proveedor.model.ts              # ✅ CRUD proveedores
│   │   ├── Inventario.model.ts             # ✅ Control stock
│   │   ├── InventarioLote.model.ts         # ✅ Lotes de inventario
│   │   ├── Movimiento.model.ts             # ✅ Movimientos inventario
│   │   ├── DetalleMovimiento.model.ts      # ✅ Detalle movimientos
│   │   ├── Venta.model.ts                  # ✅ CRUD ventas
│   │   ├── DetalleVenta.model.ts           # ✅ Detalle ventas
│   │   ├── DetalleVentaLote.model.ts       # ✅ Trazabilidad lotes
│   │   ├── MetodoPago.model.ts             # ✅ Catálogo métodos pago
│   │   └── index.ts                        # ✅ Exportación modelos
│   │
│   ├── 📁 controllers/                     # Capa de Lógica (Controller)
│   │   ├── auth.controller.ts              # 🔐 Login, logout, me
│   │   ├── producto.controller.ts          # 💊 CRUD productos
│   │   ├── venta.controller.ts             # 🛒 Proceso de ventas
│   │   ├── cliente.controller.ts           # 👥 Gestión clientes
│   │   ├── proveedor.controller.ts         # 🏢 Gestión proveedores
│   │   ├── inventario.controller.ts        # 📦 Control stock
│   │   ├── reporte.controller.ts           # 📊 Reportes
│   │   └── usuario.controller.ts           # 👤 Gestión usuarios
│   │
│   ├── 📁 services/                        # Lógica de Negocio
│   │   ├── venta.service.ts                # 💰 Lógica compleja ventas
│   │   ├── inventario.service.ts           # 📊 Cálculos de stock
│   │   ├── reporte.service.ts              # 📄 Generación PDFs/Excel
│   │   └── email.service.ts                # 📧 Envío notificaciones
│   │
│   ├── 📁 routes/                          # Definición de Rutas
│   │   ├── auth.routes.ts                  # POST /api/auth/login
│   │   ├── producto.routes.ts              # /api/productos
│   │   ├── venta.routes.ts                 # /api/ventas
│   │   ├── cliente.routes.ts               # /api/clientes
│   │   ├── proveedor.routes.ts             # /api/proveedores
│   │   ├── inventario.routes.ts            # /api/inventario
│   │   ├── reporte.routes.ts               # /api/reportes
│   │   ├── usuario.routes.ts               # /api/usuarios
│   │   └── index.ts                        # 🔄 Registro todas las rutas
│   │
│   ├── 📁 middlewares/                     # Middlewares
│   │   ├── auth.middleware.ts              # 🔐 JWT verification
│   │   ├── role.middleware.ts              # 👮 Verificación roles
│   │   ├── validate.middleware.ts          # ✅ Validación datos
│   │   ├── error.middleware.ts             # ⚠️ Manejo errores global
│   │   └── logger.middleware.ts            # 📝 Logging requests
│   │
│   ├── 📁 schemas/                         # Validación (Zod)
│   │   ├── producto.schema.ts              # Schema productos
│   │   ├── venta.schema.ts                 # Schema ventas
│   │   ├── cliente.schema.ts               # Schema clientes
│   │   ├── auth.schema.ts                  # Schema auth
│   │   └── usuario.schema.ts               # Schema usuarios
│   │
│   ├── 📁 types/                           # Tipos TypeScript
│   │   ├── models.types.ts                 # 📋 Interfaces modelos
│   │   ├── api.types.ts                    # 🌐 Tipos request/response
│   │   └── database.types.ts               # 🗄️ Tipos Supabase
│   │
│   ├── 📁 utils/                           # Utilidades
│   │   ├── response.util.ts                # 📤 Formateadores respuesta
│   │   ├── logger.util.ts                  # 📝 Winston config
│   │   ├── encryption.util.ts              # 🔒 Bcrypt helpers
│   │   └── date.util.ts                    # 📅 Helpers fechas
│   │
│   ├── app.ts                              # ⚙️ Configuración Express
│   └── server.ts                           # 🚀 Entry point
│
├── 📁 tests/                               # Tests
│   ├── 📁 unit/                            # Tests unitarios
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── 📁 integration/                     # Tests integración
│   │   ├── auth.test.ts
│   │   ├── productos.test.ts
│   │   └── ventas.test.ts
│   └── 📁 e2e/                             # Tests end-to-end
│       ├── flujo-venta.test.ts
│       └── flujo-inventario.test.ts
│
├── 📄 .env.example                         # Plantilla variables entorno
├── 📄 .env                                 # Variables entorno (NO VERSIONAR)
├── 📄 .gitignore                           # Exclusiones Git
├── 📄 .eslintrc.json                       # Config ESLint
├── 📄 .prettierrc.json                     # Config Prettier
├── 📄 .editorconfig                        # Config Editor
├── 📄 tsconfig.json                        # Config TypeScript
├── 📄 jest.config.js                       # Config Jest
├── 📄 package.json                         # Dependencias y scripts
├── 📄 package-lock.json                    # Lock de dependencias
├── 📄 README.md                            # Documentación principal
├── 📄 ARQUITECTURA.md                      # Arquitectura MVC
├── 📄 API_DOCUMENTATION.md                 # Documentación API
├── 📄 INSTALACION.md                       # Guía instalación
├── 📄 ESTRUCTURA.md                        # Este archivo
└── 📄 TODO.md                              # Lista de tareas
```

---

## 🎯 Responsabilidades por Carpeta

### 📁 **src/config/**
Archivos de configuración centralizados:
- Conexión a base de datos
- Configuración JWT
- Variables de entorno

### 📁 **src/models/**
Interacción directa con la base de datos:
- CRUD operations
- Queries SQL/ORM
- Mapeo de datos
- **NO** contiene lógica de negocio

### 📁 **src/controllers/**
Orquestación de requests:
- Recibir request HTTP
- Validar datos básicos
- Llamar a services/models
- Devolver response HTTP
- **NO** contiene lógica compleja

### 📁 **src/services/**
Lógica de negocio compleja:
- Cálculos complejos
- Validaciones de negocio
- Orquestación de múltiples modelos
- Transformaciones de datos

### 📁 **src/routes/**
Definición de endpoints:
- Mapeo de rutas a controladores
- Aplicación de middlewares
- Agrupación lógica de endpoints

### 📁 **src/middlewares/**
Funciones intermedias:
- Autenticación JWT
- Autorización por roles
- Validación de datos
- Manejo de errores
- Logging

### 📁 **src/schemas/**
Validación de datos con Zod:
- Schemas de entrada
- Schemas de salida
- Validaciones customizadas

### 📁 **src/types/**
Definiciones TypeScript:
- Interfaces
- Types
- Enums
- Tipos generados

### 📁 **src/utils/**
Funciones utilitarias:
- Helpers genéricos
- Formatters
- Encriptación
- Logger

### 📁 **tests/**
Pruebas automatizadas:
- Unit: funciones aisladas
- Integration: módulos completos
- E2E: flujos completos

---

## 🔄 Flujo de una Request

```
1️⃣  Cliente → HTTP Request
              ↓
2️⃣  Express Router (routes/)
              ↓
3️⃣  Middleware Auth (middlewares/)
              ↓
4️⃣  Middleware Validate (middlewares/)
              ↓
5️⃣  Controller (controllers/)
              ↓
6️⃣  Service (services/) [opcional]
              ↓
7️⃣  Model (models/)
              ↓
8️⃣  PostgreSQL Database
              ↓
9️⃣  Response sube por las capas
              ↓
🔟 Cliente ← HTTP Response
```

---

## 📊 Convenciones de Nombres

### Archivos
- **Models:** `NombreEntidad.model.ts`
- **Controllers:** `nombreEntidad.controller.ts`
- **Services:** `nombreEntidad.service.ts`
- **Routes:** `nombreEntidad.routes.ts`
- **Middlewares:** `nombre.middleware.ts`
- **Schemas:** `nombreEntidad.schema.ts`
- **Utils:** `nombre.util.ts`
- **Types:** `nombre.types.ts`

### Funciones
- **Models:** `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- **Controllers:** `getAll()`, `getById()`, `create()`, `update()`, `remove()`
- **Services:** nombres descriptivos según lógica

### Variables
- **camelCase:** variables y funciones
- **PascalCase:** clases e interfaces
- **UPPER_SNAKE_CASE:** constantes

---

## 🛠️ Tecnologías por Capa

| Capa | Tecnología |
|------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.x |
| **Lenguaje** | TypeScript 5.x |
| **Base de Datos** | PostgreSQL 15.x (Supabase) |
| **Validación** | Zod 3.x |
| **Testing** | Jest + Supertest |
| **Logging** | Winston |
| **Autenticación** | JWT + Bcrypt |

---

**Estructura profesional lista para desarrollo MVC escalable** ✨
