# 🔗 Integración Frontend - Backend

Esta guía te muestra cómo conectar tu frontend React/Vite con el backend.

---

## 📦 Configuración en el Frontend

### 1. Instalar dependencias necesarias

```bash
npm install axios
```

### 2. Crear archivo de configuración API

Crea `src/api/config.ts`:

```typescript
import axios from 'axios';

// URL base del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Crear instancia de axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token automáticamente
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

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el token expiró, intentar refrescarlo
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data.data;

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Si falla el refresh, cerrar sesión
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 3. Crear archivo `.env.local` en el frontend

```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 🔐 Servicio de Autenticación

Crea `src/api/authService.ts`:

```typescript
import api from './config';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id_usuario: number;
  email: string;
  dni: string;
  nombre_usuario: string;
  nombre_completo: string;
  foto_perfil_url: string | null;
  telefono: string | null;
  rol: {
    id_rol: number;
    nombre_rol: string;
    descripcion: string;
  };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
  };
}

export const authService = {
  /**
   * Login de usuario
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    
    // Guardar tokens y usuario en localStorage
    if (response.data.success) {
      const { access_token, refresh_token } = response.data.data.session;
      const { user } = response.data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
    }

    return response.data;
  },

  /**
   * Logout de usuario
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Limpiar datos locales
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Obtener perfil del usuario autenticado
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; data: User }>('/auth/profile');
    return response.data.data;
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  /**
   * Obtener usuario del localStorage
   */
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole: (roleId: number): boolean => {
    const user = authService.getCurrentUser();
    return user?.rol.id_rol === roleId;
  },

  /**
   * Verificar si el usuario es administrador
   */
  isAdmin: (): boolean => {
    return authService.hasRole(1);
  },

  /**
   * Verificar si el usuario es vendedor
   */
  isVendedor: (): boolean => {
    return authService.hasRole(2);
  },

  /**
   * Verificar si el usuario es almacenero
   */
  isAlmacenero: (): boolean => {
    return authService.hasRole(3);
  },
};

export default authService;
```

---

## 🖥️ Componente de Login (React)

Crea `src/pages/Login.tsx`:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../api/authService';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });

      if (response.success) {
        // Redirigir según el rol
        const user = response.data.user;
        
        switch (user.rol.id_rol) {
          case 1: // Administrador
            navigate('/admin/dashboard');
            break;
          case 2: // Vendedor
            navigate('/ventas');
            break;
          case 3: // Almacenero
            navigate('/inventario');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>
        
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Ingresar'}
        </button>
      </form>

      {/* Credenciales de prueba */}
      <div className="test-credentials">
        <h3>Usuarios de prueba:</h3>
        <ul>
          <li>Admin: admin@botica.com / admin123</li>
          <li>Vendedor: vendedor@botica.com / vendedor123</li>
          <li>Almacenero: almacenero@botica.com / almacenero123</li>
        </ul>
      </div>
    </div>
  );
};
```

---

## 🛡️ Componente ProtectedRoute

Crea `src/components/ProtectedRoute.tsx`:

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../api/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: number[]; // IDs de roles permitidos
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar roles si se especificaron
  if (allowedRoles && user) {
    if (!allowedRoles.includes(user.rol.id_rol)) {
      return <Navigate to="/no-autorizado" replace />;
    }
  }

  return <>{children}</>;
};
```

---

## 🗺️ Configuración de Rutas (React Router)

Crea `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Ventas } from './pages/Ventas';
import { Inventario } from './pages/Inventario';
import { AdminPanel } from './pages/AdminPanel';
import { ProtectedRoute } from './components/ProtectedRoute';
import authService from './api/authService';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Solo vendedores o admins */}
        <Route
          path="/ventas"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <Ventas />
            </ProtectedRoute>
          }
        />

        {/* Solo almaceneros o admins */}
        <Route
          path="/inventario"
          element={
            <ProtectedRoute allowedRoles={[1, 3]}>
              <Inventario />
            </ProtectedRoute>
          }
        />

        {/* Solo administradores */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={[1]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route
          path="/"
          element={
            authService.isAuthenticated() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 📊 Ejemplo: Componente Dashboard

Crea `src/pages/Dashboard.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import authService from '../api/authService';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Actualizar perfil del servidor
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profile = await authService.getProfile();
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      } catch (error) {
        console.error('Error al obtener perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Bienvenido, {user?.nombre_completo}</h1>
      
      <div className="user-info">
        <img 
          src={user?.foto_perfil_url || '/default-avatar.png'} 
          alt="Avatar" 
          className="avatar"
        />
        <div>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>DNI:</strong> {user?.dni}</p>
          <p><strong>Usuario:</strong> {user?.nombre_usuario}</p>
          <p><strong>Rol:</strong> {user?.rol.nombre_rol}</p>
        </div>
      </div>

      <button onClick={handleLogout}>Cerrar Sesión</button>
    </div>
  );
};
```

---

## 🎯 Resumen

### Pasos para integrar:

1. ✅ Instalar axios en el frontend
2. ✅ Crear archivo de configuración API (`src/api/config.ts`)
3. ✅ Crear servicio de autenticación (`src/api/authService.ts`)
4. ✅ Crear componente de Login
5. ✅ Crear componente ProtectedRoute
6. ✅ Configurar rutas con React Router
7. ✅ Usar authService en tus componentes

### Variables de entorno frontend (.env.local):
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### Comandos para desarrollo:

**Terminal 1 - Backend:**
```bash
cd botica-bakend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd botica-frontend
npm run dev
```

**¡Listo! Tu frontend ya puede comunicarse con el backend autenticado! 🎉**
