# Despliegue en Vercel - LISFA

## ⚠️ IMPORTANTE: Arquitectura de Despliegue

Este proyecto tiene **Frontend (React)** y **Backend (FastAPI/Python)**.

- **Vercel** → Solo para el **Frontend**
- **Render.com** → Para el **Backend** (Vercel no soporta bien Python)

---

## Paso 1: Subir a GitHub

### Opción A: Desde Emergent (Recomendado)
1. En el chat de Emergent, busca el botón **"Save to Github"**
2. Conecta tu cuenta de GitHub si no lo has hecho
3. El proyecto se subirá automáticamente

### Opción B: Manual
```bash
# Descargar el ZIP
# Extraer en tu computadora
cd proyecto_LISFA_completo

# Inicializar git
git init
git add .
git commit -m "Initial commit - LISFA Attendance System"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/lisfa-attendance.git
git push -u origin main
```

---

## Paso 2: Desplegar Backend en Render.com

1. Ir a [render.com](https://render.com) → "New Web Service"
2. Conectar tu repositorio de GitHub
3. Configurar:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`

4. Variables de entorno en Render:
   ```
   MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/lisfa
   DB_NAME=lisfa_attendance
   JWT_SECRET=clave-secreta-segura-aqui
   CORS_ORIGINS=https://tu-app.vercel.app
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=mcdn2024@gmail.com
   SMTP_PASSWORD=vcquvhokc wlduftt
   ```

5. Click "Create Web Service"
6. **Guardar la URL** (ej: `https://lisfa-backend.onrender.com`)

---

## Paso 3: Desplegar Frontend en Vercel

1. Ir a [vercel.com](https://vercel.com) → "New Project"
2. Importar desde GitHub → Seleccionar tu repositorio
3. Configurar:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
   - **Build Command:** `yarn build`
   - **Output Directory:** `build`

4. Variables de entorno en Vercel:
   ```
   REACT_APP_BACKEND_URL=https://tu-backend.onrender.com
   ```
   (Usa la URL de Render del paso anterior)

5. Click "Deploy"

---

## Paso 4: Configurar MongoDB Atlas (Base de Datos)

1. Ir a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crear cuenta gratuita
3. Crear cluster M0 (gratis)
4. Database Access → Crear usuario
5. Network Access → Add IP: `0.0.0.0/0`
6. Connect → Copiar connection string
7. Actualizar `MONGO_URL` en Render

---

## Paso 5: Actualizar CORS

Una vez desplegado el frontend, actualiza en Render:
```
CORS_ORIGINS=https://tu-app.vercel.app
```

---

## Verificación Final

1. Abrir tu app en Vercel
2. Login con: `admin@lisfa.com` / `admin123`
3. Probar descarga de carnet
4. Probar registro de asistencia

---

## Archivos de Configuración Incluidos

### Frontend
- `vercel.json` - Configuración de Vercel
- `package.json` - Dependencias y scripts

### Backend  
- `requirements.txt` - Dependencias Python
- `.env.example` - Plantilla de variables

---

## Troubleshooting

### Error CORS
- Verificar que `CORS_ORIGINS` en Render tenga la URL exacta de Vercel

### Error de conexión a MongoDB
- Verificar IP whitelist en Atlas
- Verificar formato del connection string

### Build falla en Vercel
- Verificar que el Root Directory sea `frontend`
- Revisar logs de build
