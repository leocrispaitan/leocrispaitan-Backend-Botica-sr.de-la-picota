# 📦 Guía de Instalación - Backend Botica

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

### Software Requerido

| Software | Versión Mínima | Verificar |
|----------|----------------|-----------|
| **Node.js** | 18.0.0 o superior | `node --version` |
| **npm** | 8.0.0 o superior | `npm --version` |
| **Git** | 2.30.0 o superior | `git --version` |

### Cuentas Necesarias

- ✅ Cuenta de [Supabase](https://supabase.com) (base de datos PostgreSQL)
- ✅ Cuenta de [GitHub](https://github.com) (control de versiones)
- ✅ Cuenta de [Render](https://render.com) (despliegue - opcional)

---

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
# Clonar desde GitHub
git clone https://github.com/tu-usuario/botica-backend.git

# Ingresar al directorio
cd botica-backend
```

### 2. Instalar Dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install
```

**Dependencias principales que se instalarán:**
- Express (framework web)
- TypeScript (tipado estático)
- @supabase/supabase-js (cliente de base de datos)
- jsonwebtoken (autenticación)
- bcrypt (hashing de contraseñas)
- zod (validación de datos)
- winston (logging)
- Y más...

### 3. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

**Editar `.env` con tus credenciales:**

```env
# Servidor
NODE_ENV=development
PORT=5000

# Base de Datos Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_KEY=tu_service_key_aqui
DATABASE_URL=postgresql://postgres:tu_password@db.tu-proyecto.supabase.co:5432/postgres

# JWT
JWT_SECRET=genera_una_clave_secreta_segura_aqui
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Obtener Credenciales de Supabase

1. Ir a [https://supabase.com](https://supabase.com)
2. Crear un nuevo proyecto
3. Ir a **Settings → API**
4. Copiar:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY`
5. Ir a **Settings → Database**
6. Copiar `Connection string` → `DATABASE_URL`

### 5. Configurar Base de Datos

Ejecutar el script SQL en Supabase:

1. Ir a **SQL Editor** en Supabase
2. Copiar el contenido de `script-base-de-datos-supabase.md` del frontend
3. Ejecutar el script completo
4. Verificar que se crearon todas las tablas

### 6. Generar JWT Secret

```bash
# En Linux/Mac
openssl rand -base64 64

# En Windows PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
```

Copiar el resultado en `JWT_SECRET` del archivo `.env`

### 7. Iniciar Servidor de Desarrollo

```bash
# Iniciar en modo desarrollo (con hot-reload)
npm run dev
```

Deberías ver:
```
🚀 Server running on http://localhost:5000
✅ Connected to database
```

### 8. Verificar Instalación

Abre tu navegador o Postman y prueba:

```
GET http://localhost:5000/health
```

Deberías recibir:
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 120,
  "environment": "development"
}
```

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar TypeScript
npm run build

# Iniciar en producción
npm start

# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Linter
npm run lint
npm run lint:fix

# Formatear código
npm run format
```

---

## 📦 Instalación de Dependencias (Manual)

Si prefieres instalar dependencias por categoría:

### Core
```bash
npm install express @supabase/supabase-js pg pg-promise dotenv
```

### Autenticación y Seguridad
```bash
npm install jsonwebtoken bcrypt helmet cors express-rate-limit
npm install -D @types/jsonwebtoken @types/bcrypt @types/cors
```

### Validación y Utilidades
```bash
npm install zod express-validator winston morgan dayjs
npm install -D @types/morgan
```

### TypeScript y Desarrollo
```bash
npm install -D typescript @types/node @types/express ts-node ts-node-dev
```

### Testing
```bash
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

### Linting y Formato
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'express'"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: "Unable to connect to database"
- Verificar que `DATABASE_URL` en `.env` sea correcto
- Verificar conexión a internet
- Verificar que el proyecto de Supabase esté activo

### Error: "Port 5000 already in use"
```bash
# Cambiar el puerto en .env
PORT=5001

# O matar el proceso en el puerto 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Error: "TypeScript errors"
```bash
# Limpiar cache y recompilar
npm run build
```

---

## 🌍 Configuración para Producción

### Render

1. Crear cuenta en [Render](https://render.com)
2. Conectar repositorio de GitHub
3. Configurar:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Agregar variables de entorno desde `.env`
5. Deploy automático al hacer push a `main`

### Variables de Entorno en Producción

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=clave_super_segura_produccion
CORS_ORIGIN=https://tu-frontend.vercel.app
```

---

## ✅ Checklist de Instalación

- [ ] Node.js 18+ instalado
- [ ] Repositorio clonado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` creado y configurado
- [ ] Credenciales de Supabase obtenidas
- [ ] Base de datos configurada con script SQL
- [ ] JWT secret generado
- [ ] Servidor inicia correctamente (`npm run dev`)
- [ ] Endpoint `/health` responde
- [ ] Tests pasan (`npm test`)

---

## 📞 Soporte

Si tienes problemas durante la instalación:

1. Revisa esta guía completa
2. Verifica los logs en la consola
3. Consulta la documentación en `README.md`
4. Revisa la arquitectura en `ARQUITECTURA.md`

---

**¡Instalación Exitosa! 🎉**

Ahora puedes comenzar a desarrollar el backend de la Botica.
