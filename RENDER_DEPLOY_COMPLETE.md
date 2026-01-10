# 🚀 Guía Completa: Despliegue en Render.com

## Sistema de Control de Asistencia LISFA

Esta guía te ayudará a desplegar el sistema en **Render.com** (plataforma gratuita).

---

## 📋 Prerequisitos

1. ✅ Cuenta en Render.com (gratuita)
2. ✅ Cuenta en GitHub  
3. ✅ Cuenta en MongoDB Atlas (gratuita)
4. ✅ Código subido a: `https://github.com/lisfa2026-lab/CONTROL-DE-ASISTENCIA`

---

## 🗄️ Paso 1: Configurar MongoDB Atlas (GRATUITO)

### 1.1 Crear Cuenta y Cluster

1. **Ve a:** https://www.mongodb.com/cloud/atlas
2. **Crear cuenta gratuita**
3. **Crear Cluster:**
   - Cluster Tier: **M0 Sandbox** (FREE)
   - Cloud Provider: **AWS**
   - Region: Selecciona la más cercana

### 1.2 Configurar Acceso

1. **Database Access** (menú izquierdo):
   - Add New Database User
   - Username: `lisfa_user`
   - Password: (genera uno seguro y guárdalo)
   - Database User Privileges: **Read and write to any database**
   - Add User

2. **Network Access**:
   - Add IP Address
   - Selecciona: **ALLOW ACCESS FROM ANYWHERE** (0.0.0.0/0)
   - Confirm

### 1.3 Obtener Connection String

1. Click en **Connect** (en tu cluster)
2. **Connect your application**
3. Copiar el connection string:
   ```
   mongodb+srv://lisfa_user:<password>@cluster0.xxxxx.mongodb.net/
   ```
4. **Importante:** Reemplaza `<password>` con tu contraseña real

---

## 🚀 Paso 2: Desplegar Backend en Render.com

### 2.1 Crear Cuenta

1. Ve a: https://render.com
2. Crear cuenta (puedes usar GitHub)

### 2.2 Nuevo Web Service

1. **Dashboard** → **New +** → **Web Service**

2. **Conectar Repositorio:**
   - Connect GitHub account
   - Busca: `lisfa2026-lab/CONTROL-DE-ASISTENCIA`
   - Click **Connect**

3. **Configuración del Servicio:**
   ```
   Name: lisfa-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```

4. **Plan:**
   - Selecciona: **Free** (gratis)

5. **Variables de Entorno** (Environment Variables):
   Click en "Advanced" → "Add Environment Variable"
   
   ```
   MONGO_URL=mongodb+srv://lisfa_user:TU_PASSWORD@cluster0.xxxxx.mongodb.net/
   DB_NAME=lisfa_attendance
   JWT_SECRET=lisfa-secret-key-2024-change-in-production
   CORS_ORIGINS=*
   ```
   
   **Opcional (para notificaciones email):**
   ```
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASSWORD=tu-password-app
   FROM_EMAIL=noreply@lisfa.edu
   ```

6. **Create Web Service**

7. **Esperar Deployment** (5-10 minutos)
   - Verás logs en tiempo real
   - Cuando termine, aparecerá: "Your service is live 🎉"

8. **Obtener URL:**
   - Tu backend estará en: `https://lisfa-backend.onrender.com`
   - Copia esta URL

---

## 🎨 Paso 3: Desplegar Frontend en Vercel

### 3.1 Configurar Variables

Antes de desplegar, actualiza el frontend para apuntar al backend de Render:

**En tu repositorio de GitHub**, edita `/frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://lisfa-backend.onrender.com
```

### 3.2 Desplegar en Vercel

1. **Ve a:** https://vercel.com/new?teamSlug=lisfas-projects-0ab613ab

2. **Import Repository:**
   - Conecta GitHub
   - Selecciona: `lisfa2026-lab/CONTROL-DE-ASISTENCIA`

3. **Configurar Proyecto:**
   ```
   Project Name: lisfa-frontend
   Framework Preset: Create React App
   Root Directory: frontend
   Build Command: yarn build
   Output Directory: build
   Install Command: yarn install
   ```

4. **Environment Variables:**
   ```
   REACT_APP_BACKEND_URL=https://lisfa-backend.onrender.com
   ```

5. **Deploy**

6. **Tu frontend estará en:** `https://lisfa-frontend.vercel.app`

---

## 🔄 Paso 4: Actualizar CORS

Ahora que tienes el frontend desplegado, actualiza el backend:

1. **Render Dashboard** → Tu servicio backend → **Environment**
2. Actualizar variable:
   ```
   CORS_ORIGINS=https://lisfa-frontend.vercel.app
   ```
3. **Manual Deploy** → **Deploy latest commit**

---

## ✅ Paso 5: Verificación

### 5.1 Probar Backend

```bash
curl https://lisfa-backend.onrender.com/api/
# Debe devolver: {"message":"Hello World"}
```

### 5.2 Probar Frontend

1. Abre: `https://lisfa-frontend.vercel.app`
2. Deberías ver la página de login
3. Intentar login con:
   - Email: `admin@lisfa.com`
   - Password: `admin123`

### 5.3 Verificar Integración

Si el login funciona, ¡todo está conectado correctamente! 🎉

---

## 🎯 Características del Plan Gratuito

### Render.com (Backend)
- ✅ 750 horas gratis al mes
- ✅ 512 MB RAM
- ✅ Sleep después de 15 minutos de inactividad
- ⚠️ Primera carga puede tardar 30-60 segundos
- ✅ Auto-deploy en cada push a GitHub

### Vercel (Frontend)
- ✅ 100 GB bandwidth/mes
- ✅ Despliegues ilimitados
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Auto-deploy en cada push

### MongoDB Atlas (Database)
- ✅ 512 MB almacenamiento
- ✅ Suficiente para ~5,000 estudiantes
- ✅ Backups automáticos

---

## 🔧 Troubleshooting

### Problema: Backend tarda en responder

**Causa:** Render pone el servicio a dormir después de 15 min de inactividad.

**Solución:** 
- Primera carga tarda 30-60 segundos (normal)
- Considera mantener el servicio activo con un ping cada 10 minutos
- O actualizar a plan paid ($7/mes) para mantenerlo siempre activo

### Problema: CORS Error en Frontend

**Solución:**
```bash
# Verificar que CORS_ORIGINS en Render tenga la URL correcta
CORS_ORIGINS=https://lisfa-frontend.vercel.app
```

### Problema: MongoDB Connection Failed

**Solución:**
1. Verificar que la IP 0.0.0.0/0 esté permitida en MongoDB Atlas
2. Verificar que el password en MONGO_URL sea correcto
3. Verificar que el connection string sea el correcto

### Problema: Build Failed en Frontend

**Solución:**
- Verificar que todas las dependencias estén en package.json
- Ver logs de Vercel para identificar el error específico

---

## 📧 Configurar Notificaciones Email (Opcional)

Para enviar notificaciones a padres de familia:

### Usando Gmail

1. **Crear App Password:**
   - Ve a: https://myaccount.google.com/security
   - 2-Step Verification → App passwords
   - Genera password para "Mail"

2. **Configurar en Render:**
   ```
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx (app password)
   FROM_EMAIL=noreply@lisfa.edu
   ```

### Alternativas Gratuitas
- SendGrid: 100 emails/día gratis
- Mailgun: 5,000 emails/mes gratis (primer mes)
- AWS SES: 62,000 emails/mes gratis (primer año)

---

## 🎓 Resultado Final

✅ Backend en Render: `https://lisfa-backend.onrender.com`
✅ Frontend en Vercel: `https://lisfa-frontend.vercel.app`
✅ Database en MongoDB Atlas (cluster gratuito)
✅ Sistema 100% funcional y gratuito

---

## 🔐 Seguridad en Producción

Antes de usar en producción, considera:

1. **Cambiar JWT_SECRET** a un valor único y seguro
2. **Restringir CORS** solo a tu dominio
3. **MongoDB:** Restringir IPs solo a Render
4. **Contraseñas:** Cambiar todas las de demo
5. **HTTPS:** Vercel y Render ya lo incluyen

---

## 📱 Dominio Personalizado (Opcional)

Si tienes un dominio propio:

### En Vercel (Frontend):
1. Settings → Domains
2. Add: `lisfa.tudominio.com`
3. Configurar DNS según instrucciones

### En Render (Backend):
1. Settings → Custom Domain
2. Add: `api.tudominio.com`
3. Configurar DNS según instrucciones

---

## 💰 Costos y Límites

| Servicio | Plan Gratuito | Límites | Costo Upgrade |
|----------|---------------|---------|---------------|
| Render | FREE | 750 hrs/mes, Sleep after 15min | $7/mes (always on) |
| Vercel | FREE | 100 GB bandwidth | $20/mes (Pro) |
| MongoDB Atlas | FREE | 512 MB storage | $0.08/hr (M10) |
| **TOTAL** | **$0/mes** | Adecuado para 500+ usuarios | ~$27/mes |

---

## 📞 Soporte

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com/

---

**¡Listo!** Tu sistema LISFA está desplegado y funcionando. 🎉
