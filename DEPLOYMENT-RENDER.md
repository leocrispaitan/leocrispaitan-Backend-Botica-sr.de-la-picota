# 🚀 Guía Completa de Deployment - Backend en Render

## 📋 Tabla de Contenidos
1. [Preparación del Backend](#1-preparación-del-backend)
2. [Configuración de Supabase](#2-configuración-de-supabase)
3. [Deployment en Render](#3-deployment-en-render)
4. [Conectar Frontend (Vercel) con Backend (Render)](#4-conectar-frontend-vercel-con-backend-render)
5. [Verificación y Testing](#5-verificación-y-testing)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. 📦 Preparación del Backend

### Paso 1.1: Verificar package.json
Asegúrate de que tu `package.json` tenga configurado correctamente:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

✅ **Ya está configurado correctamente en tu proyecto**

### Paso 1.2: Crear archivo render.yaml (opcional pero recomendado)
Este archivo facilita el deployment:

```yaml
services:
  - type: web
    name: botica-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### Paso 1.3: Verificar que el archivo .gitignore incluya
```
node_modules/
dist/
.env
*.log
```

✅ **Ya configurado**

### Paso 1.4: Crear archivo .npmrc (opcional)
Para optimizar la instalación en Render:

```
engine-strict=true
```

---

## 2. 🗄️ Configuración de Supabase

### Paso 2.1: Acceder a tu Proyecto Supabase
1. Ve a https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto o crea uno nuevo

### Paso 2.2: Obtener las Credenciales
1. En el dashboard, ve a **Settings** (⚙️) → **API**
2. Copia las siguientes credenciales:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **IMPORTANTE**: Guarda estas credenciales en un lugar seguro, las necesitarás más adelante.

### Paso 2.3: Configurar las Políticas de Seguridad (RLS)
1. Ve a **Authentication** → **Policies**
2. Verifica que tus tablas tengan las políticas RLS configuradas
3. Si usas autenticación, verifica que las políticas permitan acceso según roles

### Paso 2.4: Configurar CORS en Supabase (si es necesario)
1. Ve a **Settings** → **API** → **CORS**
2. Agrega tus dominios permitidos:
   - `https://tu-frontend.vercel.app`
   - `https://tu-backend.onrender.com`

### Paso 2.5: Verificar la Conexión de Base de Datos
1. Ve a **Settings** → **Database**
2. Copia la **Connection String**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

---

## 3. 🌐 Deployment en Render

### Paso 3.1: Crear Cuenta en Render
1. Ve a https://render.com/
2. Regístrate con tu cuenta de GitHub (recomendado)
3. Verifica tu email

### Paso 3.2: Conectar tu Repositorio de GitHub
1. En el dashboard de Render, haz clic en **"New +"**
2. Selecciona **"Web Service"**
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Busca y selecciona el repositorio: `leocrispaitan-Backend-Botica-sr.de-la-picota`
5. Haz clic en **"Connect"**

### Paso 3.3: Configurar el Web Service

#### Configuración Básica:
- **Name**: `botica-backend` (o el nombre que prefieras)
- **Region**: `Oregon (US West)` o el más cercano a tus usuarios
- **Branch**: `main`
- **Root Directory**: (dejar vacío si el backend está en la raíz, o poner `botica-bakend` si está en subdirectorio)
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

#### Plan:
- Selecciona **"Free"** para empezar (puedes actualizar después)
- ⚠️ **Nota**: El plan gratuito tiene límites y el servicio se duerme después de 15 minutos de inactividad

### Paso 3.4: Configurar Variables de Entorno en Render

Haz clic en **"Advanced"** y agrega las siguientes **Environment Variables**:

```bash
# Configuración del Servidor
NODE_ENV=production
PORT=10000
API_VERSION=v1

# Supabase (REEMPLAZA CON TUS CREDENCIALES REALES)
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# CORS (IMPORTANTE: Agrega tu URL de Vercel)
CORS_ORIGIN=https://tu-frontend.vercel.app,https://botica-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

⚠️ **IMPORTANTE**: 
- Reemplaza `https://tu-frontend.vercel.app` con la URL real de tu frontend en Vercel
- Usa las credenciales reales de Supabase del Paso 2.2

### Paso 3.5: Desplegar el Servicio
1. Haz clic en **"Create Web Service"**
2. Render comenzará automáticamente a:
   - Clonar tu repositorio
   - Instalar dependencias
   - Compilar TypeScript
   - Iniciar el servidor

3. Espera a que el build termine (puede tomar 3-5 minutos)
4. Verás un mensaje: **"Your service is live 🎉"**
5. Tu backend estará disponible en: `https://botica-backend.onrender.com`

### Paso 3.6: Verificar el Deployment
1. Copia la URL de tu servicio (ej: `https://botica-backend.onrender.com`)
2. Prueba el endpoint de health check:
   ```
   GET https://botica-backend.onrender.com/api/v1/health
   ```
3. Deberías recibir una respuesta como:
   ```json
   {
     "status": "OK",
     "message": "Botica API is running",
     "timestamp": "2024-01-20T10:30:00Z"
   }
   ```

---

## 4. 🔗 Conectar Frontend (Vercel) con Backend (Render)

### Paso 4.1: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto frontend
3. Ve a **Settings** → **Environment Variables**
4. Agrega o actualiza la variable:

```bash
VITE_API_URL=https://botica-backend.onrender.com/api/v1
```

O si usas React sin Vite:
```bash
REACT_APP_API_URL=https://botica-backend.onrender.com/api/v1
```

### Paso 4.2: Re-desplegar el Frontend
1. En Vercel, ve a **Deployments**
2. Haz clic en **"Redeploy"** en el último deployment
3. Vercel reconstruirá tu frontend con la nueva variable de entorno

### Paso 4.3: Actualizar CORS en el Backend
Ya lo configuraste en el Paso 3.4, pero verifica que incluya tu URL de Vercel:

En Render → Environment Variables:
```bash
CORS_ORIGIN=https://tu-app.vercel.app,https://tu-app-staging.vercel.app
```

Si necesitas actualizar:
1. Ve a tu servicio en Render
2. **Environment** → Edita `CORS_ORIGIN`
3. Guarda y Render automáticamente re-desplegará

---

## 5. ✅ Verificación y Testing

### Paso 5.1: Probar la Conexión Frontend → Backend

1. Abre tu frontend en Vercel
2. Abre las DevTools del navegador (F12)
3. Ve a la pestaña **Network**
4. Intenta hacer login o cualquier acción que llame al backend
5. Verifica que las peticiones vayan a: `https://botica-backend.onrender.com`

### Paso 5.2: Probar Endpoints con Postman

Importa la colección: `Botica-API.postman_collection.json`

Configura las variables:
- `base_url`: `https://botica-backend.onrender.com/api/v1`

Prueba los endpoints:
1. **POST** `/auth/register` - Registrar usuario
2. **POST** `/auth/login` - Login
3. **GET** `/auth/profile` - Obtener perfil (con token)

### Paso 5.3: Verificar Logs en Render

1. Ve a tu servicio en Render
2. Haz clic en **"Logs"** en el menú izquierdo
3. Verifica que no haya errores
4. Deberías ver mensajes como:
   ```
   ✅ Configuración validada correctamente
   🚀 Servidor corriendo en puerto 10000
   ```

### Paso 5.4: Monitorear el Servicio

Render proporciona métricas básicas:
- **CPU Usage**
- **Memory Usage**
- **Response Time**

Revisa estas métricas regularmente para detectar problemas.

---

## 6. 🔧 Troubleshooting

### Problema 1: Build Falla en Render

**Error**: `Module not found` o `Cannot find module`

**Solución**:
1. Verifica que todas las dependencias estén en `package.json`
2. Asegúrate de que `typescript` esté en `dependencies` o `devDependencies`
3. Verifica el comando de build: `npm run build`

### Problema 2: Servidor No Inicia

**Error**: `Application failed to start`

**Solución**:
1. Verifica que `dist/server.js` exista después del build
2. Comprueba el Start Command: `npm start`
3. Revisa los logs en Render para ver el error específico

### Problema 3: Error de CORS

**Error**: `Access to fetch has been blocked by CORS policy`

**Solución**:
1. Verifica la variable `CORS_ORIGIN` en Render
2. Asegúrate de incluir tu URL de Vercel exacta (con https://)
3. No uses trailing slash: ❌ `https://app.vercel.app/` ✅ `https://app.vercel.app`

### Problema 4: No Puede Conectar con Supabase

**Error**: `Could not connect to Supabase`

**Solución**:
1. Verifica que `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén correctos
2. Verifica que no haya espacios al inicio o final de las variables
3. Prueba las credenciales localmente primero
4. Verifica las políticas RLS en Supabase

### Problema 5: El Servicio se "Duerme" (Plan Gratuito)

**Síntoma**: Primera petición tarda 30-60 segundos

**Solución (opciones)**:
1. **Upgrade al plan Starter** ($7/mes) - Servicio siempre activo
2. **Usar un cron job** para hacer ping cada 10 minutos
3. **Implementar un warming endpoint** en el frontend

### Problema 6: Variables de Entorno No se Actualizan

**Solución**:
1. Después de cambiar variables en Render, haz **Manual Deploy**
2. O espera al próximo commit para que se re-despliegue automáticamente
3. Verifica en los logs que las variables se lean correctamente

---

## 📝 Checklist Final

Antes de considerar el deployment completo, verifica:

- [ ] Backend desplegado en Render sin errores
- [ ] Todas las variables de entorno configuradas
- [ ] Endpoint de health check responde correctamente
- [ ] CORS configurado con URL de Vercel
- [ ] Frontend puede hacer peticiones al backend
- [ ] Autenticación funciona correctamente
- [ ] Supabase conectado y funcionando
- [ ] Logs sin errores críticos
- [ ] Documentación actualizada con URLs de producción

---

## 🎯 URLs Importantes de Referencia

- **Backend en Render**: `https://botica-backend.onrender.com`
- **Frontend en Vercel**: `https://tu-app.vercel.app`
- **Supabase Dashboard**: `https://supabase.com/dashboard`
- **Repositorio GitHub**: `https://github.com/leocrispaitan/leocrispaitan-Backend-Botica-sr.de-la-picota`

---

## 📚 Próximos Pasos Recomendados

1. **Configurar CI/CD**: Auto-deployment en cada push a `main`
2. **Implementar Logging Avanzado**: Usar servicios como Logtail o Papertrail
3. **Configurar Alertas**: Notificaciones cuando el servicio falla
4. **Implementar Rate Limiting**: Proteger tu API de abuso
5. **Configurar SSL/HTTPS**: Ya incluido en Render
6. **Backup de Base de Datos**: Configurar backups automáticos en Supabase
7. **Monitoreo**: Implementar herramientas como Sentry o New Relic

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Consulta la documentación de Render: https://render.com/docs
4. Consulta la documentación de Supabase: https://supabase.com/docs

---

**¡Felicidades! 🎉 Tu backend está ahora en producción.**
