# 📝 Lista de Tareas Pendientes - Backend

## ✅ Fase 1: Estructura Base (COMPLETADO)

- [x] Crear estructura de carpetas MVC
- [x] Configurar TypeScript
- [x] Configurar ESLint y Prettier
- [x] Crear archivos de configuración (.env.example, .gitignore)
- [x] Documentación inicial (README, ARQUITECTURA, API_DOCUMENTATION)

---

## 🔄 Fase 2: Configuración Inicial (PENDIENTE)

### Config
- [ ] `src/config/database.ts` - Conexión a Supabase
- [ ] `src/config/jwt.ts` - Configuración JWT
- [ ] `src/config/environment.ts` - Variables de entorno

### Utils
- [ ] `src/utils/response.util.ts` - Formateadores de respuesta
- [ ] `src/utils/logger.util.ts` - Configuración Winston
- [ ] `src/utils/encryption.util.ts` - Bcrypt helpers
- [ ] `src/utils/date.util.ts` - Helpers de fechas

### Types
- [ ] `src/types/models.types.ts` - Interfaces de modelos
- [ ] `src/types/api.types.ts` - Tipos de request/response
- [ ] `src/types/database.types.ts` - Tipos generados de Supabase

### Middlewares Base
- [ ] `src/middlewares/error.middleware.ts` - Manejo global de errores
- [ ] `src/middlewares/logger.middleware.ts` - Logging HTTP
- [ ] `src/middlewares/auth.middleware.ts` - Verificación JWT
- [ ] `src/middlewares/validate.middleware.ts` - Validación genérica

### App y Server
- [ ] `src/app.ts` - Configuración de Express
- [ ] `src/server.ts` - Entry point del servidor

---

## 📦 Fase 3: Módulo de Autenticación (PENDIENTE)

### Models
- [ ] `src/models/Usuario.model.ts`
- [ ] `src/models/Rol.model.ts`

### Controllers
- [ ] `src/controllers/auth.controller.ts`
  - [ ] login()
  - [ ] logout()
  - [ ] me()
  - [ ] refreshToken()

### Routes
- [ ] `src/routes/auth.routes.ts`
  - [ ] POST /auth/login
  - [ ] POST /auth/logout
  - [ ] GET /auth/me
  - [ ] POST /auth/refresh

### Schemas
- [ ] `src/schemas/auth.schema.ts`
  - [ ] loginSchema
  - [ ] refreshTokenSchema

---

## 🏥 Fase 4: Módulo de Productos (PENDIENTE)

### Models
- [ ] `src/models/Producto.model.ts`
- [ ] `src/models/Categoria.model.ts`
- [ ] `src/models/FormaFarmaceutica.model.ts`
- [ ] `src/models/ViaAdministracion.model.ts`
- [ ] `src/models/CondicionVenta.model.ts`
- [ ] `src/models/ClasificacionATC.model.ts`
- [ ] `src/models/Laboratorio.model.ts`
- [ ] `src/models/RegistroSanitario.model.ts`

### Controllers
- [ ] `src/controllers/producto.controller.ts`
  - [ ] getAll()
  - [ ] getById()
  - [ ] create()
  - [ ] update()
  - [ ] softDelete()
  - [ ] search()

### Services
- [ ] `src/services/producto.service.ts`
  - [ ] validateProduct()
  - [ ] checkDuplicates()

### Routes
- [ ] `src/routes/producto.routes.ts`
  - [ ] GET /productos
  - [ ] GET /productos/:id
  - [ ] POST /productos
  - [ ] PUT /productos/:id
  - [ ] DELETE /productos/:id

### Schemas
- [ ] `src/schemas/producto.schema.ts`
  - [ ] createProductoSchema
  - [ ] updateProductoSchema

---

## 📦 Fase 5: Módulo de Inventario (PENDIENTE)

### Models
- [ ] `src/models/Inventario.model.ts`
- [ ] `src/models/InventarioLote.model.ts`
- [ ] `src/models/Movimiento.model.ts`
- [ ] `src/models/DetalleMovimiento.model.ts`

### Controllers
- [ ] `src/controllers/inventario.controller.ts`
  - [ ] getStock()
  - [ ] getAlertas()
  - [ ] registrarLote()
  - [ ] registrarMovimiento()

### Services
- [ ] `src/services/inventario.service.ts`
  - [ ] calcularStockTotal()
  - [ ] detectarStockBajo()
  - [ ] detectarProximosVencer()

### Routes
- [ ] `src/routes/inventario.routes.ts`
  - [ ] GET /inventario
  - [ ] GET /inventario/alertas
  - [ ] GET /inventario/lotes/:id_producto
  - [ ] POST /inventario/lote

### Schemas
- [ ] `src/schemas/inventario.schema.ts`

---

## 🛒 Fase 6: Módulo de Ventas (PENDIENTE)

### Models
- [ ] `src/models/Venta.model.ts`
- [ ] `src/models/DetalleVenta.model.ts`
- [ ] `src/models/DetalleVentaLote.model.ts`
- [ ] `src/models/MetodoPago.model.ts`

### Controllers
- [ ] `src/controllers/venta.controller.ts`
  - [ ] getAll()
  - [ ] getById()
  - [ ] create()
  - [ ] anular()

### Services
- [ ] `src/services/venta.service.ts`
  - [ ] procesarVenta()
  - [ ] validarStock()
  - [ ] descontarInventario()
  - [ ] generarComprobante()

### Routes
- [ ] `src/routes/venta.routes.ts`
  - [ ] GET /ventas
  - [ ] GET /ventas/:id
  - [ ] POST /ventas
  - [ ] PUT /ventas/:id/anular

### Schemas
- [ ] `src/schemas/venta.schema.ts`

---

## 👥 Fase 7: Módulo de Clientes (PENDIENTE)

### Models
- [ ] `src/models/Cliente.model.ts`

### Controllers
- [ ] `src/controllers/cliente.controller.ts`
  - [ ] getAll()
  - [ ] getById()
  - [ ] create()
  - [ ] update()
  - [ ] softDelete()

### Routes
- [ ] `src/routes/cliente.routes.ts`

### Schemas
- [ ] `src/schemas/cliente.schema.ts`

---

## 🏢 Fase 8: Módulo de Proveedores (PENDIENTE)

### Models
- [ ] `src/models/Proveedor.model.ts`

### Controllers
- [ ] `src/controllers/proveedor.controller.ts`

### Routes
- [ ] `src/routes/proveedor.routes.ts`

### Schemas
- [ ] `src/schemas/proveedor.schema.ts`

---

## 📊 Fase 9: Módulo de Reportes (PENDIENTE)

### Controllers
- [ ] `src/controllers/reporte.controller.ts`
  - [ ] reporteVentas()
  - [ ] reporteInventario()
  - [ ] reporteProductosMasVendidos()
  - [ ] reporteVentasPorPeriodo()

### Services
- [ ] `src/services/reporte.service.ts`
  - [ ] generarPDF()
  - [ ] generarExcel()

### Routes
- [ ] `src/routes/reporte.routes.ts`

---

## 🧪 Fase 10: Testing (PENDIENTE)

### Unit Tests
- [ ] `tests/unit/models/*.test.ts`
- [ ] `tests/unit/services/*.test.ts`
- [ ] `tests/unit/utils/*.test.ts`

### Integration Tests
- [ ] `tests/integration/auth.test.ts`
- [ ] `tests/integration/productos.test.ts`
- [ ] `tests/integration/ventas.test.ts`
- [ ] `tests/integration/inventario.test.ts`

### E2E Tests
- [ ] `tests/e2e/flujo-venta.test.ts`
- [ ] `tests/e2e/flujo-inventario.test.ts`

---

## 🔐 Fase 11: Seguridad y Optimización (PENDIENTE)

- [ ] Implementar rate limiting por endpoint
- [ ] Configurar helmet con headers de seguridad
- [ ] Implementar validación exhaustiva de inputs
- [ ] Agregar logging de auditoría
- [ ] Implementar cache con Redis (opcional)
- [ ] Optimizar queries con índices
- [ ] Implementar paginación en todos los listados

---

## 📚 Fase 12: Documentación (PENDIENTE)

- [ ] Documentar todos los endpoints con Swagger/OpenAPI
- [ ] Crear ejemplos de requests/responses
- [ ] Documentar variables de entorno
- [ ] Crear guía de contribución
- [ ] Documentar arquitectura de decisiones (ADR)

---

## 🚀 Fase 13: Despliegue (PENDIENTE)

- [ ] Configurar CI/CD con GitHub Actions
- [ ] Configurar despliegue en Render
- [ ] Configurar variables de entorno de producción
- [ ] Configurar health checks
- [ ] Configurar monitoring con logs
- [ ] Documentar proceso de despliegue

---

## 📝 Notas

- Seguir principios SOLID en todo el código
- Mantener alta cobertura de tests (>80%)
- Documentar funciones complejas
- Usar TypeScript strict mode
- Validar todos los inputs con Zod
- Manejar errores de forma consistente
- Logging estructurado con Winston

---

**Última actualización:** 2026-08-12
