# 🔗 Conectar Frontend (Vercel) con Backend (Render)

Esta guía te muestra cómo conectar tu frontend desplegado en Vercel con tu backend desplegado en Render.

---

## 📋 Requisitos Previos

- ✅ Backend desplegado en Render: `https://tu-backend.onrender.com`
- ✅ Frontend desplegado en Vercel: `https://tu-app.vercel.app`
- ✅ Supabase configurado

---

## 🎯 Paso 1: Configurar Variables de Entorno en Vercel

### 1.1 Acceder a Vercel Dashboard

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto frontend
3. Click en **"Settings"**
4. Click en **"Environment Variables"**

### 1.2 Agregar Variable de API

Dependiendo de tu framework:

#### Para Vite (React + Vite)
```bash
Variable Name: VITE_API_URL
Value: https://tu-backend.onrender.com/api/v1
```

#### Para Create React App
```bash
Variable Name: REACT_APP_API_URL
Value: https://tu-backend.onrender.com/api/v1
```

#### Para Next.js
```bash
Variable Name: NEXT_PUBLIC_API_URL
Value: https://tu-backend.onrender.com/api/v1
```

### 1.3 Variables Adicionales (si aplica)

```bash
# Si usas Supabase directamente en el frontend
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 1.4 Aplicar para Todos los Entornos

Selecciona:
- ✅ Production
- ✅ Preview
- ✅ Development

Click en **"Save"**

---

## 🔄 Paso 2: Actualizar Código del Frontend

### 2.1 Crear Archivo de Configuración

Crea `src/config/api.ts` (o `src/config/api.js`):

```typescript
// src/config/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default API_URL;
```

### 2.2 Crear Cliente API

Crea `src/services/api.ts`:

```typescript
// src/services/api.ts
import axios from 'axios';
import { apiConfig } from '../config/api';

const api = axios.create(apiConfig);

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2.3 Crear Servicio de Autenticación

Crea `src/services/auth.service.ts`:

```typescript
// src/services/auth.service.ts
import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    usuario: {
      id_usuario: number;
      nombre: string;
      email: string;
      rol: {
        id_rol: number;
        nombre: string;
        permisos: string[];
      };
    };
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  };
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    
    if (response.data.success) {
      // Guardar tokens
      localStorage.setItem('access_token', response.data.data.tokens.access_token);
      localStorage.setItem('refresh_token', response.data.data.tokens.refresh_token);
      
      // Guardar usuario
      localStorage.setItem('user', JSON.stringify(response.data.data.usuario));
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export default new AuthService();
```

### 2.4 Ejemplo de Uso en Componente

```tsx
// src/components/Login.tsx
import { useState } from 'react';
import authService from '../services/auth.service';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });
      
      if (response.success) {
        // Redirigir al dashboard
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Cargando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

---

## 🔐 Paso 3: Configurar CORS en el Backend

### 3.1 Actualizar CORS_ORIGIN en Render

1. Ve a tu servicio en Render Dashboard
2. Click en **"Environment"**
3. Edita la variable `CORS_ORIGIN`
4. Agrega tu URL de Vercel:

```bash
CORS_ORIGIN=https://tu-app.vercel.app,https://tu-app-preview.vercel.app
```

5. Click en **"Save Changes"**
6. Render re-desplegará automáticamente

### 3.2 Verificar Configuración CORS

El backend ya está configurado correctamente en `src/app.ts`:

```typescript
import cors from 'cors';

const allowedOrigins = config.cors.origin; // Lee de CORS_ORIGIN

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## 🚀 Paso 4: Re-desplegar Frontend en Vercel

### Opción A: Desde Dashboard

1. Ve a tu proyecto en Vercel
2. Click en **"Deployments"**
3. En el último deployment, click en el menú (...)
4. Click en **"Redeploy"**
5. Click en **"Redeploy"** nuevamente para confirmar

### Opción B: Desde Git

```bash
# En tu repositorio local del frontend
git add .
git commit -m "Update API URL for production"
git push origin main

# Vercel automáticamente detectará el cambio y re-desplegará
```

---

## ✅ Paso 5: Verificar la Conexión

### 5.1 Probar desde Browser DevTools

1. Abre tu frontend en Vercel: `https://tu-app.vercel.app`
2. Abre DevTools (F12)
3. Ve a la pestaña **Network**
4. Intenta hacer login
5. Verifica que las peticiones vayan a: `https://tu-backend.onrender.com`

### 5.2 Verificaciones Importantes

✅ **Status Code**: Las peticiones deben retornar 200 OK (o el código apropiado)

✅ **CORS**: No debe haber errores de CORS en la consola

✅ **Response**: Las respuestas deben tener el formato esperado

✅ **Headers**: Debe incluir `Authorization: Bearer token` después del login

---

## 🐛 Troubleshooting

### Problema 1: CORS Error

```
Access to fetch at 'https://backend.onrender.com' from origin 'https://frontend.vercel.app' 
has been blocked by CORS policy
```

**Solución:**
1. Verifica que `CORS_ORIGIN` en Render incluya tu URL exacta de Vercel
2. No uses trailing slash: ❌ `https://app.vercel.app/` ✅ `https://app.vercel.app`
3. Verifica que uses `https://` (no `http://`)

### Problema 2: 404 Not Found

```
GET https://backend.onrender.com/auth/login 404
```

**Solución:**
1. Verifica que la URL incluya `/api/v1`:
   - ❌ `https://backend.onrender.com/auth/login`
   - ✅ `https://backend.onrender.com/api/v1/auth/login`

### Problema 3: Variables de Entorno No Se Actualizan

**Solución:**
1. Después de cambiar variables en Vercel, debes re-desplegar
2. Las variables solo se aplican en build time
3. Verifica el nombre correcto según tu framework:
   - Vite: `VITE_*`
   - CRA: `REACT_APP_*`
   - Next.js: `NEXT_PUBLIC_*`

### Problema 4: Backend Tarda Mucho en Responder (Plan Free)

```
Primera petición tarda 30-60 segundos
```

**Causa:** El servicio gratuito de Render se "duerme" después de 15 minutos de inactividad

**Soluciones:**
1. **Warming**: Implementar un loading mientras se "despierta"
2. **Upgrade**: Plan Starter ($7/mes) mantiene el servicio activo 24/7
3. **Cron Job**: Hacer ping cada 10 minutos (desde otro servicio)

### Problema 5: Token No Se Envía en Peticiones

**Solución:**
```typescript
// Verificar que el interceptor esté configurado
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 📊 Flujo Completo de Autenticación

```
1. Usuario abre: https://tu-app.vercel.app/login

2. Usuario ingresa credenciales

3. Frontend envía:
   POST https://tu-backend.onrender.com/api/v1/auth/login
   Body: { email, password }

4. Backend valida con Supabase

5. Backend responde:
   {
     success: true,
     data: {
       usuario: { ... },
       tokens: { access_token, refresh_token }
     }
   }

6. Frontend guarda tokens en localStorage

7. Usuario navega a /dashboard

8. Frontend envía:
   GET https://tu-backend.onrender.com/api/v1/auth/profile
   Header: Authorization: Bearer <token>

9. Backend valida token

10. Backend responde con datos del usuario

11. Frontend muestra dashboard
```

---

## 🎯 Checklist Final

- [ ] Variable `VITE_API_URL` configurada en Vercel
- [ ] Variable `CORS_ORIGIN` actualizada en Render
- [ ] Frontend re-desplegado en Vercel
- [ ] Backend usa la URL correcta con `/api/v1`
- [ ] Login funciona desde frontend en Vercel
- [ ] Token se guarda en localStorage
- [ ] Peticiones protegidas incluyen token
- [ ] No hay errores de CORS en consola
- [ ] Respuestas del backend son correctas

---

## 📱 Ejemplo de Testing

### Test 1: Health Check desde Frontend

```typescript
import api from './services/api';

async function testConnection() {
  try {
    const response = await api.get('/health');
    console.log('✅ Backend conectado:', response.data);
  } catch (error) {
    console.error('❌ Error conectando:', error);
  }
}

testConnection();
```

### Test 2: Login Completo

```typescript
import authService from './services/auth.service';

async function testLogin() {
  try {
    const response = await authService.login({
      email: 'admin@botica.com',
      password: 'admin123'
    });
    
    console.log('✅ Login exitoso:', response);
    console.log('Token:', localStorage.getItem('access_token'));
  } catch (error) {
    console.error('❌ Login falló:', error);
  }
}

testLogin();
```

---

## 🚀 Optimizaciones Adicionales

### 1. Manejo de Errores Mejorado

```typescript
// src/utils/errorHandler.ts
export function handleApiError(error: any) {
  if (error.response) {
    // Error de respuesta del servidor
    const message = error.response.data?.message || 'Error del servidor';
    const status = error.response.status;
    
    console.error(`Error ${status}: ${message}`);
    return message;
  } else if (error.request) {
    // Petición enviada pero sin respuesta
    console.error('Sin respuesta del servidor');
    return 'No se pudo conectar con el servidor';
  } else {
    // Error en configuración de la petición
    console.error('Error:', error.message);
    return 'Error al procesar la petición';
  }
}
```

### 2. Loading State Global

```typescript
// src/context/LoadingContext.tsx
import { createContext, useState, useContext } from 'react';

const LoadingContext = createContext({
  loading: false,
  setLoading: (loading: boolean) => {}
});

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {loading && <div className="global-loading">Cargando...</div>}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
```

### 3. Retry Logic

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Retry en caso de timeout (útil cuando el backend se "despierta")
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Si es timeout y no se ha reintentado
    if (error.code === 'ECONNABORTED' && !config._retry) {
      config._retry = true;
      config.timeout = 60000; // 60 segundos para el retry
      return api(config);
    }
    
    return Promise.reject(error);
  }
);
```

---

## 📈 Monitoreo

### Métricas a Observar

1. **Response Time**: Debe ser < 500ms (después del warming)
2. **Error Rate**: Debe ser < 1%
3. **CORS Errors**: Debe ser 0
4. **401 Errors**: Revisar si hay problema con tokens

### Tools Recomendadas

- **Vercel Analytics**: Monitoreo de performance del frontend
- **Render Metrics**: CPU, Memory, Response Time
- **Browser DevTools**: Network tab para debugging
- **Sentry**: Error tracking (opcional)

---

## ✨ ¡Listo!

Tu frontend en Vercel ahora está completamente conectado con tu backend en Render y tu base de datos en Supabase.

**Stack Completo en Producción:**
```
Frontend (Vercel) ←→ Backend (Render) ←→ Database (Supabase)
      ↓                    ↓                     ↓
   React/Vite         Express/TS            PostgreSQL
```

🎉 **¡Tu aplicación está 100% desplegada y funcionando!**
