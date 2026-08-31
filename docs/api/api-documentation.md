# 📚 Documentación de la API REST

## Base URL

```
Desarrollo:  http://localhost:5000/api/v1
Producción:  https://botica-backend.onrender.com/api/v1
```

## Autenticación

Todos los endpoints (excepto `/auth/login`) requieren autenticación JWT.

### Header
```
Authorization: Bearer <token>
```

---

## 🔐 Autenticación

### POST /auth/login
Iniciar sesión y obtener token JWT.

**Request:**
```json
{
  "email": "admin@botica.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@botica.com",
      "nombre": "Juan Pérez",
      "rol": "ADMINISTRATIVO"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### POST /auth/logout
Cerrar sesión.

### GET /auth/me
Obtener información del usuario autenticado.

---

## 🏥 Productos

### GET /productos
Listar todos los productos activos.

**Query Params:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 20)
- `search` (opcional): Búsqueda por nombre
- `categoria` (opcional): Filtrar por ID de categoría

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id_producto": 1,
      "nombre_comercial": "Paracetamol 500mg",
      "principio_activo": "Paracetamol",
      "precio_venta": 5.50,
      "stock_total": 100,
      "categoria": "Analgésicos",
      "forma_farmaceutica": "Tableta"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### GET /productos/:id
Obtener un producto por ID.

### POST /productos
Crear nuevo producto.

**Permisos:** ADMINISTRATIVO, ALMACENERO

**Request:**
```json
{
  "nombre_comercial": "Ibuprofeno 400mg",
  "principio_activo": "Ibuprofeno",
  "concentracion": "400mg",
  "precio_venta": 8.00,
  "precio_compra": 5.00,
  "id_categoria": 1,
  "id_forma_farmaceutica": 2,
  "id_via_administracion": 1,
  "id_condicion_venta": 2,
  "id_proveedor": 1
}
```

### PUT /productos/:id
Actualizar producto.

### DELETE /productos/:id
Eliminar producto (eliminación lógica).

---

## 🛒 Ventas

### GET /ventas
Listar ventas.

**Query Params:**
- `fecha_inicio`: YYYY-MM-DD
- `fecha_fin`: YYYY-MM-DD
- `tipo_comprobante`: BOLETA | FACTURA
- `id_usuario`: Filtrar por vendedor

### GET /ventas/:id
Obtener detalle de una venta.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_venta": 1,
    "tipo_comprobante": "BOLETA",
    "serie": "B001",
    "numero": "00001234",
    "fecha_emision": "2025-01-15T10:30:00Z",
    "subtotal": 45.00,
    "descuento": 0.00,
    "igv": 0.00,
    "total_pagar": 45.00,
    "estado_pago": "PAGADO",
    "cliente": {
      "nombre": "María García",
      "tipo_documento": "DNI",
      "numero_documento": "12345678"
    },
    "usuario": {
      "nombre": "Juan Pérez"
    },
    "detalles": [
      {
        "producto": "Paracetamol 500mg",
        "cantidad": 2,
        "precio_unitario": 5.50,
        "subtotal": 11.00
      }
    ]
  }
}
```

### POST /ventas
Registrar nueva venta.

**Request:**
```json
{
  "id_cliente": 1,
  "tipo_comprobante": "BOLETA",
  "id_metodo_pago": 1,
  "subtotal": 45.00,
  "descuento": 0.00,
  "igv": 0.00,
  "total_pagar": 45.00,
  "detalles": [
    {
      "id_producto": 1,
      "cantidad": 2,
      "precio_unitario": 5.50,
      "subtotal": 11.00,
      "lotes": [
        {
          "id_lote": 1,
          "cantidad": 2
        }
      ]
    }
  ]
}
```

---

## 👥 Clientes

### GET /clientes
Listar clientes.

### GET /clientes/:id
Obtener cliente por ID.

### POST /clientes
Crear cliente.

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "tipo_documento": "DNI",
  "numero_documento": "12345678",
  "telefono": "987654321",
  "email": "juan@email.com",
  "direccion": "Av. Principal 123"
}
```

### PUT /clientes/:id
Actualizar cliente.

---

## 📦 Inventario

### GET /inventario
Ver stock actual de todos los productos.

### GET /inventario/alertas
Productos con stock bajo o próximos a vencer.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stock_bajo": [
      {
        "producto": "Paracetamol 500mg",
        "stock_actual": 5,
        "stock_minimo": 10
      }
    ],
    "proximos_vencer": [
      {
        "producto": "Ibuprofeno 400mg",
        "lote": "L001",
        "fecha_vencimiento": "2025-02-28",
        "dias_restantes": 45
      }
    ]
  }
}
```

### GET /inventario/lotes/:id_producto
Ver lotes de un producto.

### POST /inventario/lote
Registrar nuevo lote.

**Request:**
```json
{
  "id_producto": 1,
  "numero_lote": "L001",
  "fecha_vencimiento": "2026-12-31",
  "cantidad": 100,
  "precio_compra": 4.50,
  "id_proveedor": 1
}
```

---

## 📊 Reportes

### GET /reportes/ventas
Reporte de ventas por período.

**Query Params:**
- `fecha_inicio`: YYYY-MM-DD
- `fecha_fin`: YYYY-MM-DD
- `agrupar_por`: dia | mes | producto | categoria

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "total_ventas": 1500.00,
      "cantidad_transacciones": 45,
      "ticket_promedio": 33.33
    },
    "detalles": [
      {
        "fecha": "2025-01-15",
        "ventas": 450.00,
        "transacciones": 12
      }
    ]
  }
}
```

### GET /reportes/inventario
Reporte de inventario actual.

### GET /reportes/productos-mas-vendidos
Top 10 productos más vendidos.

---

## 🚨 Códigos de Respuesta

| Código | Descripción |
|--------|-------------|
| 200 | OK - Request exitoso |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: duplicado) |
| 422 | Unprocessable Entity - Validación fallida |
| 500 | Internal Server Error - Error del servidor |

## 📝 Formato de Respuestas

### Éxito
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [
      {
        "field": "email",
        "message": "Email inválido"
      }
    ]
  }
}
```
