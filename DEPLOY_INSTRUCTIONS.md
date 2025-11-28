# Guía de Despliegue: GitHub + Vercel

## 📋 Prerequisitos

- Cuenta de GitHub conectada
- Cuenta de Vercel conectada a GitHub
- Plan de pago en Emergent (para "Save to GitHub")

## 🔗 Paso 1: Subir Código a GitHub

### Opción A: Desde Emergent (Requiere Plan de Pago)

1. **Conectar GitHub:**
   - Clic en tu perfil → "Connect GitHub"
   - Autoriza permisos

2. **Guardar código:**
   - Botón "Save to GitHub"
   - Repositorio: `https://github.com/lisfa2026-lab/CONTROL-DE-ASISTENCIA`
   - Branch: `main` o `develop`
   - Push code

### Opción B: Manual (Si no tienes plan de pago)

1. **Clonar repositorio localmente:**
   ```bash
   git clone https://github.com/lisfa2026-lab/CONTROL-DE-ASISTENCIA.git
   cd CONTROL-DE-ASISTENCIA
   ```

2. **Copiar archivos del proyecto:**
   - Descarga todos los archivos de `/app/backend` y `/app/frontend`
   - Copia al repositorio local

3. **Commit y push:**
   ```bash
   git add .
   git commit -m "feat: Sistema de Control de Asistencia LISFA completo"
   git push origin main
   ```

## 🚀 Paso 2: Desplegar Backend en Vercel

### 2.1 Configurar Backend (FastAPI)

1. **Crear archivo `vercel.json` en `/backend`:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.py"
    },
    {
      "src": "/static/(.*)",
      "dest": "static/$1"
    }
  ]
}
```

2. **Actualizar `requirements.txt`:**
Asegúrate que incluya todas las dependencias.

3. **En Vercel:**
   - Ve a: `https://vercel.com/new?teamSlug=lisfas-projects-0ab613ab`
   - Import repository: `lisfa2026-lab/CONTROL-DE-ASISTENCIA`
   - Framework Preset: **Other**
   - Root Directory: `backend`
   - Build Command: (dejar vacío)
   - Output Directory: (dejar vacío)

4. **Configurar Variables de Entorno:**
   ```
   MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/
   DB_NAME=lisfa_attendance
   JWT_SECRET=lisfa-secret-key-change-in-production
   CORS_ORIGINS=https://tu-frontend.vercel.app
   ```

5. **Deploy Backend** → Obtendrás URL como: `https://lisfa-backend.vercel.app`

## 🎨 Paso 3: Desplegar Frontend en Vercel

### 3.1 Configurar Frontend (React)

1. **Actualizar `.env` en `/frontend`:**
   ```
   REACT_APP_BACKEND_URL=https://lisfa-backend.vercel.app
   ```

2. **En Vercel (nuevo proyecto):**
   - Import same repository
   - Framework Preset: **Create React App**
   - Root Directory: `frontend`
   - Build Command: `yarn build`
   - Output Directory: `build`
   - Install Command: `yarn install`

3. **Configurar Variables de Entorno:**
   ```
   REACT_APP_BACKEND_URL=https://lisfa-backend.vercel.app
   ```

4. **Deploy Frontend** → Obtendrás URL como: `https://lisfa-frontend.vercel.app`

### 3.2 Actualizar CORS en Backend

Regresa a la configuración del backend en Vercel y actualiza:
```
CORS_ORIGINS=https://lisfa-frontend.vercel.app
```

Redeploy el backend.

## 🗄️ Paso 4: Configurar MongoDB (Producción)

### Opción 1: MongoDB Atlas (Recomendado)

1. **Crear cuenta:** https://www.mongodb.com/cloud/atlas
2. **Crear cluster gratuito**
3. **Configurar:**
   - Database Access: Crear usuario y contraseña
   - Network Access: Agregar IP 0.0.0.0/0 (permitir desde cualquier IP)
4. **Obtener Connection String:**
   ```
   mongodb+srv://usuario:password@cluster.mongodb.net/lisfa_attendance
   ```
5. **Actualizar en Vercel:** Variable `MONGO_URL`

### Opción 2: Usar MongoDB existente
Si ya tienes un servidor MongoDB, usa su URL en la variable `MONGO_URL`.

## ✅ Paso 5: Verificar Despliegue

1. **Probar Backend:**
   ```bash
   curl https://lisfa-backend.vercel.app/api/
   # Debe devolver: {"message": "Hello World"}
   ```

2. **Probar Frontend:**
   - Abre: `https://lisfa-frontend.vercel.app`
   - Deberías ver la página de login

3. **Probar Login:**
   - Email: admin@lisfa.com
   - Password: admin123

## 🔧 Troubleshooting

### Problema: CORS Error
**Solución:** Verifica que `CORS_ORIGINS` en backend incluya la URL del frontend.

### Problema: MongoDB Connection Error
**Solución:** 
- Verifica que la URL de MongoDB es correcta
- Verifica que las IPs están permitidas en MongoDB Atlas
- Verifica usuario y contraseña

### Problema: Build Failed en Frontend
**Solución:**
- Verifica que todas las dependencias estén en `package.json`
- Verifica que no haya errores de sintaxis

### Problema: 404 en rutas de API
**Solución:** Verifica que el `vercel.json` esté correctamente configurado.

## 📱 Paso 6: Configurar Dominio Personalizado (Opcional)

1. **En Vercel:**
   - Project Settings → Domains
   - Add domain: `lisfa.tudominio.com`
   - Configurar DNS según instrucciones

2. **Actualizar variables:**
   - Frontend: `REACT_APP_BACKEND_URL=https://api.lisfa.tudominio.com`
   - Backend: `CORS_ORIGINS=https://lisfa.tudominio.com`

## 🔐 Consideraciones de Seguridad

1. **Cambiar JWT_SECRET:** Usa un valor secreto único y seguro
2. **CORS:** En producción, especifica solo las URLs permitidas
3. **MongoDB:** Restringe acceso por IP si es posible
4. **Variables de Entorno:** Nunca las subas a GitHub

## 📊 Monitoreo

- **Vercel Dashboard:** Monitorea despliegues y logs
- **MongoDB Atlas:** Monitorea uso de base de datos
- **Logs de errores:** Vercel → Project → Deployments → View Logs

## 🆘 Soporte

Si tienes problemas:
1. Revisa logs en Vercel Dashboard
2. Verifica variables de entorno
3. Prueba endpoints individualmente
4. Revisa la consola del navegador para errores frontend

---

**Nota:** El proceso completo puede tomar 30-60 minutos la primera vez.
