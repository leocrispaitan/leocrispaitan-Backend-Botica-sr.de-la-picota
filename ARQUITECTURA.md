# 🏗️ Arquitectura del Backend

## Patrón MVC (Model-View-Controller)

El backend sigue el patrón arquitectónico MVC adaptado a APIs REST.

```
┌────────────────────────────────────────────────────────┐
│                   CLIENTE (Frontend)                   │
└────────────────────┬───────────────────────────────────┘
                     │ HTTP Request
                     ▼
┌────────────────────────────────────────────────────────┐
│                     ROUTES                             │
│   Define endpoints y mapea a controladores            │
│   /api/productos, /api/ventas, /api/usuarios          │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│                  MIDDLEWARES                           │
│   • Autenticación (JWT)                                │
│   • Validación de datos                                │
│   • Manejo de errores                                  │
│   • Logging                                            │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│                 CONTROLLERS                            │
│   Lógica de negocio y orquestación                    │
│   • ProductoController                                 │
│   • VentaController                                    │
│   • UsuarioController                                  │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│                   SERVICES                             │
│   Lógica de negocio compleja                          │
│   • Cálculos de inventario                            │
│   • Validaciones de negocio                           │
│   • Procesamiento de ventas                           │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│                    MODELS                              │
│   Interacción con base de datos                       │
│   • Producto.model.ts                                  │
│   • Venta.model.ts                                     │
│   • Usuario.model.ts                                   │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL)                │
└────────────────────────────────────────────────────────┘
```

## Responsabilidades por Capa

### 1. Routes (Rutas)
- Definir endpoints HTTP
- Mapear rutas a controladores
- Aplicar middlewares específicos

### 2. Middlewares
- Autenticación y autorización
- Validación de datos de entrada
- Manejo de errores
- Logging de requests
- Rate limiting

### 3. Controllers (Controladores)
- Recibir requests HTTP
- Validar datos básicos
- Llamar a servicios
- Devolver respuestas HTTP

### 4. Services (Servicios)
- Lógica de negocio compleja
- Orquestar múltiples operaciones
- Cálculos y transformaciones
- Validaciones de negocio

### 5. Models (Modelos)
- Interactuar con la base de datos
- Queries SQL/ORM
- CRUD operations
- Mapeo de datos

## Flujo de una Request

```
1. Cliente hace request: POST /api/v1/productos
2. Express Router recibe la request
3. Middleware de autenticación verifica JWT
4. Middleware de validación verifica datos
5. ProductoController.create() es invocado
6. Controller llama a ProductoService.createProduct()
7. Service valida lógica de negocio
8. Service llama a ProductoModel.create()
9. Model ejecuta INSERT en PostgreSQL
10. Resultado sube por las capas
11. Controller formatea respuesta HTTP
12. Response enviada al cliente
```

## Principios de Diseño

### SOLID
- **S**ingle Responsibility: Cada clase tiene una responsabilidad
- **O**pen/Closed: Abierto a extensión, cerrado a modificación
- **L**iskov Substitution: Las subclases deben ser intercambiables
- **I**nterface Segregation: Interfaces específicas mejor que generales
- **D**ependency Inversion: Depender de abstracciones, no de concreciones

### DRY (Don't Repeat Yourself)
- Reutilización de código
- Utilidades comunes en /utils
- Validaciones compartidas en /schemas

### Separation of Concerns
- Cada capa tiene su responsabilidad
- Bajo acoplamiento entre capas
- Alta cohesión dentro de cada capa

## Seguridad

### Autenticación
- JWT (JSON Web Tokens)
- Bcrypt para hashing de contraseñas
- Refresh tokens para sesiones largas

### Validación
- Zod para validación de schemas
- Express-validator como alternativa
- Sanitización de inputs

### Headers de Seguridad
- Helmet.js para headers HTTP
- CORS configurado correctamente
- Rate limiting anti-abuso

## Escalabilidad

### Horizontal Scaling
- Stateless API (sin sesiones en memoria)
- JWT permite múltiples instancias
- Load balancer distribuye tráfico

### Caching
- Redis para cache de datos frecuentes
- Cache de queries complejas
- Cache de sesiones JWT

### Database Optimization
- Índices en columnas frecuentes
- Query optimization
- Connection pooling
