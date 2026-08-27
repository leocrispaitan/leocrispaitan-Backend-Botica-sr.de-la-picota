# ✅ Checklist Rápido de Deployment

## 🎯 Antes de Empezar

### Información que Necesitas Tener Lista:

1. **Credenciales de Supabase** (desde https://supabase.com/dashboard)
   ```
   SUPABASE_URL: https://________.supabase.co
   SUPABASE_ANON_KEY: eyJhbGci...
   SUPABASE_SERVICE_KEY: eyJhbGci...
   ```

2. **URL de tu Frontend en Vercel**
   ```
   https://________.vercel.app
   ```

3. **Cuenta de GitHub** con el repositorio:
   ```
   https://github.com/leocrispaitan/leocrispaitan-Backend-Botica-sr.de-la-picota
   ```

---

## 📋 Pasos de Deployment (30 minutos)

### FASE 1: Supabase (5 minutos)
- [ ] Acceder a Supabase Dashboard
- [ ] Ir a Settings → API
- [ ] Copiar Project URL
- [ ] Copiar anon public key
- [ ] Copiar service_role key
- [ ] Guardar credenciales en un archivo temporal

### FASE 2: Crear Servicio en Render (5 minutos)
- [ ] Ir a https://render.com/
- [ ] Crear cuenta / Iniciar sesión
- [ ] Conectar cuenta de GitHub
- [ ] Click en "New +" → "Web Service"
- [ ] Seleccionar repositorio: `leocrispaitan-Backend-Botica-sr.de-la-picota`
- [ ] Click en "Connect"

### FASE 3: Configurar Servicio (10 minutos)
- [ ] **Name**: `botica-backend`
- [ ] **Region**: Oregon (US West)
- [ ] **Branch**: `main`
- [ ] **Runtime**: Node
- [ ] **Build Command**: `npm install && npm run build`
- [ ] **Start Command**: `npm start`
- [ ] **Plan**: Free (para empezar)

### FASE 4: Variables de Entorno (5 minutos)
Click en "Advanced" y agregar estas variables:

```bash
NODE_ENV=production
PORT=10000
API_VERSION=v1
SUPABASE_URL=<pegar-tu-url>
SUPABASE_ANON_KEY=<pegar-tu-key>
SUPABASE_SERVICE_KEY=<pegar-tu-key>
CORS_ORIGIN=<tu-url-vercel>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

⚠️ Reemplazar los valores `<...>` con tus credenciales reales

### FASE 5: Deploy (3 minutos)
- [ ] Click en "Create Web Service"
- [ ] Esperar que el build termine (3-5 minutos)
- [ ] Ver mensaje: "Your service is live 🎉"
- [ ] Copiar la URL: `https://botica-backend.onrender.com`

### FASE 6: Conectar con Frontend (5 minutos)
- [ ] Ir a Vercel Dashboard
- [ ] Seleccionar proyecto frontend
- [ ] Settings → Environment Variables
- [ ] Agregar: `VITE_API_URL=https://botica-backend.onrender.com/api/v1`
- [ ] Redeploy el frontend

### FASE 7: Verificación (5 minutos)
- [ ] Probar: `https://botica-backend.onrender.com/api/v1/health`
- [ ] Debería responder: `{"status":"OK"}`
- [ ] Abrir frontend y probar login
- [ ] Verificar en Network tab que las peticiones lleguen al backend
- [ ] Revisar logs en Render (no debe haber errores)

---

## 🚨 Problemas Comunes y Soluciones Rápidas

### ❌ Build falla
```bash
# Solución: Verificar que package.json tenga:
"scripts": {
  "build": "tsc",
  "start": "node dist/server.js"
}
```

### ❌ CORS Error
```bash
# Solución: En Render, actualizar variable:
CORS_ORIGIN=https://tu-app.vercel.app
# Sin trailing slash y con https://
```

### ❌ No conecta con Supabase
```bash
# Solución: Verificar que las keys no tengan espacios
# Verificar en Supabase Dashboard que las keys sean correctas
```

### ❌ 404 en endpoints
```bash
# Solución: Verificar que la URL sea:
https://botica-backend.onrender.com/api/v1/tu-endpoint
# No olvides el /api/v1
```

---

## 🧪 Comandos de Testing

### Probar Health Check
```bash
curl https://botica-backend.onrender.com/api/v1/health
```

### Probar Login (con Postman o curl)
```bash
curl -X POST https://botica-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 📊 Métricas a Monitorear

### En Render Dashboard:
- **CPU Usage**: Debería estar < 50%
- **Memory Usage**: Debería estar < 256 MB (plan free)
- **Response Time**: Debería estar < 500ms

### En Browser DevTools:
- **Network Tab**: Verificar que peticiones sean 200 OK
- **Console**: No debe haber errores de CORS
- **Application**: Verificar que el token se guarde correctamente

---

## 🔄 Auto-Deployment

Render automáticamente re-despliega cuando haces push a `main`:

```bash
# En tu terminal local:
git add .
git commit -m "Update backend"
git push origin main

# Render detectará el cambio y re-desplegará automáticamente
```

---

## 💡 Tips Pro

1. **Plan Gratuito**: El servicio se "duerme" después de 15 minutos sin uso
   - Primera petición puede tardar 30-60 segundos
   - Considera upgrade a Starter ($7/mes) para servicio 24/7

2. **Logs en Tiempo Real**: 
   - En Render → Logs → Ver logs en tiempo real
   - Útil para debugging

3. **Variables de Entorno**:
   - Después de cambiar variables, Render re-despliega automáticamente
   - O puedes hacer "Manual Deploy"

4. **Rollback**:
   - En Render → Deployments → Puedes volver a un deployment anterior

5. **Custom Domain** (opcional):
   - Settings → Custom Domain → Agregar tu dominio
   - Configurar DNS en tu proveedor de dominio

---

## 📱 URLs de Acceso Rápido

- **Render Dashboard**: https://dashboard.render.com/
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/leocrispaitan/leocrispaitan-Backend-Botica-sr.de-la-picota

---

## ✅ Deployment Completado

Si todos los checkboxes están marcados:

```
✅ Backend desplegado en Render
✅ Variables de entorno configuradas
✅ CORS configurado
✅ Frontend conectado
✅ Supabase funcionando
✅ Tests pasando

🎉 ¡Tu aplicación está en producción!
```

---

## 📞 Necesitas Ayuda?

1. **Logs de Render**: Primera fuente de información
2. **Documentación**: Ver `DEPLOYMENT-RENDER.md` para más detalles
3. **Suport de Render**: https://render.com/docs
4. **Community**: Render Discord o Stack Overflow

---

**Tiempo estimado total: 30-40 minutos** ⏱️
