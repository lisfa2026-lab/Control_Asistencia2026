# 🚀 GUÍA RÁPIDA: Activar Notificaciones en Tiempo Real

## ✅ PASO 1: Configurar Gmail (5 minutos)

### A. Obtener Contraseña de Aplicación de Gmail

1. Ve a: https://myaccount.google.com/security
2. Busca "Verificación en 2 pasos" → **Activar**
3. Ve a: https://myaccount.google.com/apppasswords
4. Selecciona:
   - Aplicación: **Correo**
   - Dispositivo: **Otro (nombre personalizado)** → escribe "LISFA"
5. Click **Generar**
6. **COPIA** la contraseña de 16 caracteres (ej: `abcd efgh ijkl mnop`)

### B. Agregar Configuración al Backend

Edita el archivo `/app/backend/.env` y agrega:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
FROM_EMAIL=noreply@lisfa.edu
```

**⚠️ IMPORTANTE:** Usa tu email de Gmail real y la contraseña de aplicación generada.

### C. Reiniciar Backend

```bash
sudo supervisorctl restart backend
```

---

## ✅ PASO 2: Vincular Padres con Estudiantes (2 minutos)

### Opción A: Desde la Interfaz (Recomendado)

1. **Login como admin**: https://liceo-attendance.preview.emergentagent.com
   - Email: `admin@lisfa.com`
   - Password: `admin123`

2. **Ir a Dashboard** → Click en **"Vincular Padres"** (card amarillo)

3. **Registrar un Padre** (si no existe):
   - Ir a Registrarse
   - Rol: **Padre de Familia**
   - Email: El email real donde recibirán notificaciones
   - Completar registro

4. **Vincular Padre con Estudiante**:
   - Seleccionar Padre de la lista
   - Seleccionar Estudiante
   - Confirmar email de notificaciones
   - Click **"Vincular y Activar Notificaciones"**

### Opción B: Directamente en MongoDB

```javascript
db.parents.insertOne({
    id: "padre-uuid-123",
    user_id: "id-del-usuario-padre",
    student_ids: ["id-estudiante-1", "id-estudiante-2"],
    notification_email: "padre@gmail.com",
    phone: "+502-1234-5678"
})
```

---

## ✅ PASO 3: Probar Notificaciones (1 minuto)

### Test Rápido

1. **Registrar asistencia** de un estudiante que tenga padre vinculado:
   - Ir a "Registro de Asistencia"
   - Escanear QR del estudiante (o usar el ID manualmente)

2. **Verificar email**:
   - El padre debe recibir en **menos de 5 segundos**:
   ```
   Asunto: Notificación de Ingreso - [Nombre Estudiante]
   Cuerpo: "[Nombre Estudiante] ingresó a las [09:15:23]"
   ```

### Test Desde Terminal (Opcional)

```bash
curl -X POST "https://liceo-attendance.preview.emergentagent.com/api/attendance" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "21b495dd-ff0c-48b8-a0d5-2b1ef052df9b",
    "recorded_by": "22b14e55-5169-4a88-a74d-28945a236af6"
  }'
```

---

## 📧 Alternativas Gratuitas a Gmail

### SendGrid (100 emails/día gratis)

```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=tu-api-key-de-sendgrid
FROM_EMAIL=noreply@lisfa.edu
```

**Cómo obtener API Key:**
1. Registrarse en: https://signup.sendgrid.com/
2. Ir a Settings → API Keys
3. Crear API Key con permisos "Mail Send"
4. Copiar y usar como password

### Mailgun (5,000 emails/mes gratis)

```env
SMTP_SERVER=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@tu-dominio.mailgun.org
SMTP_PASSWORD=tu-password-mailgun
FROM_EMAIL=noreply@lisfa.edu
```

---

## 🔍 Verificación de Funcionamiento

### Revisar Logs del Backend

```bash
tail -f /var/log/supervisor/backend.err.log | grep -i "notification\|email"
```

Deberías ver mensajes como:
```
INFO: Email enviado exitosamente a padre@gmail.com: Notificación de Ingreso - María García
```

### Revisar en MongoDB

```javascript
// Ver vinculaciones existentes
db.parents.find().pretty()

// Ver registros de asistencia
db.attendance.find().sort({check_in_time: -1}).limit(5).pretty()
```

---

## ⚠️ Problemas Comunes

### "Email no llega"

**Solución:**
1. Verificar que SMTP_USER y SMTP_PASSWORD estén correctos
2. Verificar que la contraseña sea de "Contraseñas de aplicaciones", no la contraseña normal
3. Revisar carpeta SPAM del email
4. Verificar logs del backend

### "Error: Authentication failed"

**Solución:**
1. Regenerar contraseña de aplicación en Google
2. Verificar que la verificación en 2 pasos esté activa
3. Copiar contraseña SIN espacios

### "Padre no recibe notificación"

**Solución:**
1. Verificar que el padre esté vinculado:
   ```bash
   curl https://tu-url/api/parents/by-student/ID_ESTUDIANTE
   ```
2. Verificar que notification_email esté configurado
3. Verificar logs del backend

---

## 📊 Resultado Final

Una vez configurado correctamente:

✅ **Entrada del Estudiante:**
1. Escanea QR → Sistema registra
2. Email enviado en < 5 segundos
3. Padre recibe: "[María García] ingresó a las [09:15:23]"

✅ **Salida del Estudiante:**
1. Escanea QR nuevamente
2. Email enviado automáticamente
3. Padre recibe: "[María García] se retiró a las [15:30:45]"

---

## 🎯 Checklist Final

- [ ] SMTP configurado en .env
- [ ] Backend reiniciado
- [ ] Padre registrado en el sistema
- [ ] Padre vinculado con estudiante
- [ ] Email de notificación configurado
- [ ] Prueba realizada
- [ ] Email recibido

**Tiempo total: ~10 minutos**

---

## 📞 URLs Importantes

- **Sistema:** https://liceo-attendance.preview.emergentagent.com
- **Vincular Padres:** https://liceo-attendance.preview.emergentagent.com/parent-link
- **Contraseñas Gmail:** https://myaccount.google.com/apppasswords
- **SendGrid:** https://sendgrid.com
- **Mailgun:** https://mailgun.com

---

**¡Listo! El sistema ahora enviará notificaciones en tiempo real a los padres de familia.**
