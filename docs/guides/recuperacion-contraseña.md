# Recuperación de Contraseña

Esta guía explica la implementación del flujo de recuperación de contraseña con Supabase Auth.

## 📋 Características

- ✅ Solicitud de restablecimiento por correo electrónico
- ✅ Validación estricta de contraseñas con requisitos de seguridad
- ✅ Feedback visual en tiempo real de los requisitos
- ✅ Integración completa con Supabase Auth
- ✅ Flujo seguro con tokens de un solo uso

## 🔒 Requisitos de Contraseña

Las contraseñas deben cumplir con los siguientes requisitos:

1. ✓ Mínimo 8 caracteres
2. ✓ Al menos una letra minúscula (a-z)
3. ✓ Al menos una letra mayúscula (A-Z)
4. ✓ Al menos un dígito (0-9)
5. ✓ Al menos un carácter especial (!@#$%^&*()_+-=[]{};':"\\|,.<>\/?`~)

**Ejemplos válidos:**
- `Password123!`
- `MyPass2024@`
- `Admin#2025`

**Ejemplos inválidos:**
- `password123` ❌ (falta mayúscula y carácter especial)
- `Password` ❌ (falta dígito y carácter especial)
- `Pass123` ❌ (menos de 8 caracteres)

## 🎯 Flujo de Usuario

### 1. Solicitar Restablecimiento

1. Usuario hace clic en "¿Olvidaste tu contraseña?" en el login
2. Ingresa su correo electrónico
3. Sistema envía email con enlace de recuperación
4. Usuario recibe confirmación (aunque el email no exista por seguridad)

### 2. Restablecer Contraseña

1. Usuario hace clic en el enlace del email
2. Es redirigido a `/reset-password` con token en el hash
3. Ingresa nueva contraseña con validación en tiempo real
4. Confirma la contraseña
5. Sistema actualiza la contraseña
6. Usuario es redirigido al login

## 🛠️ Implementación Técnica

### Backend

#### Endpoints

**POST /api/auth/forgot-password**
```json
// Request
{
  "email": "usuario@ejemplo.com"
}

// Response (siempre exitosa por seguridad)
{
  "success": true,
  "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
}
```

**POST /api/auth/reset-password**
```json
// Request
{
  "access_token": "token_del_email",
  "new_password": "NuevaPassword123"
}

// Response
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

#### Validación Backend

```typescript
// Regex para validar contraseña (incluye carácter especial requerido por Supabase)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;
```

### Frontend

#### Componentes

1. **ForgotPassword.tsx**: Pantalla de solicitud de restablecimiento
2. **ResetPassword.tsx**: Pantalla de ingreso de nueva contraseña
3. **Login.tsx**: Actualizado con enlace a recuperación

#### Validación en Tiempo Real

```typescript
const [validations, setValidations] = useState({
  minLength: false,
  hasLowercase: false,
  hasUppercase: false,
  hasDigit: false,
  hasSpecialChar: false,
});

useEffect(() => {
  setValidations({
    minLength: newPassword.length >= 8,
    hasLowercase: /[a-z]/.test(newPassword),
    hasUppercase: /[A-Z]/.test(newPassword),
    hasDigit: /\d/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword),
  });
}, [newPassword]);
```

## ⚙️ Configuración

### Variables de Entorno (Backend)

Agregar en `.env`:

```env
# URL del frontend para redirección en emails
FRONTEND_URL=http://localhost:5173
```

### Supabase Configuration

1. Ve a tu proyecto en Supabase Dashboard
2. Settings > Authentication > Email Templates
3. Personaliza el template "Reset Password" (opcional)
4. Verifica que el SMTP esté configurado correctamente

### Rutas (Frontend)

El App.tsx está configurado con React Router:

```typescript
<Route path="/reset-password" element={<ResetPassword />} />
```

## 🧪 Pruebas

### Escenario 1: Solicitud Exitosa

1. Ir al login
2. Clic en "¿Olvidaste tu contraseña?"
3. Ingresar email registrado
4. Verificar recepción del email
5. Email debe contener enlace con token

### Escenario 2: Validación de Contraseña

1. Hacer clic en el enlace del email
2. Ingresar contraseña débil (ej: "abc123")
3. Verificar que se muestren los requisitos no cumplidos en rojo
4. Ingresar contraseña válida (ej: "Password123!")
5. Verificar que todos los requisitos estén en verde

### Escenario 3: Contraseñas No Coinciden

1. Ingresar nueva contraseña válida
2. Ingresar confirmación diferente
3. Intentar enviar
4. Verificar mensaje de error: "Las contraseñas no coinciden"

### Escenario 4: Token Expirado

1. Esperar más de 1 hora después de solicitar el enlace
2. Intentar usar el enlace
3. Verificar mensaje: "Token inválido o expirado"

## 🔐 Seguridad

### Consideraciones Implementadas

1. **No revelar información**: Siempre se responde con éxito aunque el email no exista
2. **Tokens de un solo uso**: Los tokens expiran después de usarse
3. **Validación estricta**: Requisitos de contraseña fuertes
4. **HTTPS requerido**: En producción solo funciona con HTTPS
5. **Rate limiting**: Protección contra ataques de fuerza bruta

### Mejores Prácticas

- ✅ Usar HTTPS en producción
- ✅ Configurar CORS correctamente
- ✅ Mantener FRONTEND_URL actualizada
- ✅ Monitorear intentos de restablecimiento
- ✅ Configurar límites de tasa en Supabase

## 📧 Configuración de Email (Supabase)

### Email Predeterminado (Desarrollo)

Supabase proporciona un servicio de email por defecto para desarrollo.

### Email Personalizado (Producción)

Para producción, se recomienda configurar un proveedor SMTP:

1. Settings > Authentication > Email Auth
2. Configure SMTP Settings:
   - Host
   - Port
   - Username
   - Password
   - Sender email

Proveedores recomendados:
- SendGrid
- AWS SES
- Mailgun
- Postmark

## 🐛 Troubleshooting

### El email no llega

1. Verificar que el email exista en la base de datos
2. Revisar spam/correo no deseado
3. Verificar configuración SMTP en Supabase
4. Revisar logs de Supabase Dashboard > Logs > Auth

### Token inválido

1. Verificar que no haya expirado (válido por 1 hora)
2. Confirmar que la URL esté completa con el hash
3. Verificar que FRONTEND_URL esté correcta en `.env`

### Error al actualizar contraseña

1. Verificar requisitos de contraseña
2. Revisar logs del backend
3. Confirmar que supabaseAdmin tenga permisos

## 📚 Recursos Adicionales

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Password Reset Flow](https://supabase.com/docs/guides/auth/auth-password-reset)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
