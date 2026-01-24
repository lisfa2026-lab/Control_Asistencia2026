# Instrucciones de Despliegue - LISFA

## Opción 1: Vercel + Render.com (Recomendado)

### Frontend en Vercel

1. **Preparar el proyecto:**
   ```bash
   cd frontend
   yarn build
   ```

2. **Subir a GitHub:**
   - Crear repositorio en GitHub
   - Subir carpeta `frontend`

3. **Conectar con Vercel:**
   - Ir a [vercel.com](https://vercel.com)
   - "New Project" → Importar desde GitHub
   - Seleccionar el repositorio

4. **Configurar variables de entorno en Vercel:**
   ```
   REACT_APP_BACKEND_URL=https://tu-backend.onrender.com
   ```

5. **Deploy:** Vercel desplegará automáticamente

---

### Backend en Render.com

1. **Subir a GitHub:**
   - Crear repositorio en GitHub
   - Subir carpeta `backend`

2. **Crear servicio en Render:**
   - Ir a [render.com](https://render.com)
   - "New" → "Web Service"
   - Conectar repositorio de GitHub

3. **Configuración del servicio:**
   - **Name:** lisfa-backend
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`

4. **Variables de entorno en Render:**
   ```
   MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/lisfa
   DB_NAME=lisfa_attendance
   JWT_SECRET=tu-clave-secreta-muy-segura
   CORS_ORIGINS=https://tu-frontend.vercel.app
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_correo@gmail.com
   SMTP_PASSWORD=tu_contraseña_app
   ```

5. **Base de datos MongoDB:**
   - Crear cluster en [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Obtener connection string
   - Agregar IP de Render a whitelist

---

## Opción 2: Railway

### Despliegue completo en Railway

1. **Ir a [railway.app](https://railway.app)**

2. **Crear nuevo proyecto:**
   - "New Project" → "Deploy from GitHub repo"

3. **Agregar servicios:**
   - Frontend (Node.js)
   - Backend (Python)
   - MongoDB (desde Railway)

4. **Variables de entorno:**
   - Railway genera automáticamente `MONGO_URL` para el servicio MongoDB
   - Configurar las demás variables manualmente

---

## Opción 3: Heroku

### Backend en Heroku

1. **Crear Procfile:**
   ```
   web: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```

2. **Crear runtime.txt:**
   ```
   python-3.11.0
   ```

3. **Desplegar:**
   ```bash
   heroku login
   heroku create lisfa-backend
   heroku addons:create mongolab:sandbox
   git push heroku main
   ```

---

## Opción 4: VPS (DigitalOcean, AWS, etc.)

### Instalación manual

1. **Actualizar servidor:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Instalar dependencias:**
   ```bash
   # Python
   sudo apt install python3 python3-pip python3-venv -y
   
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install nodejs -y
   
   # MongoDB
   sudo apt install mongodb -y
   sudo systemctl start mongodb
   ```

3. **Clonar proyecto:**
   ```bash
   git clone tu-repositorio
   cd lisfa-attendance
   ```

4. **Configurar backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   nano .env  # Editar configuración
   ```

5. **Configurar frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

6. **Configurar Nginx:**
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       
       location / {
           root /var/www/lisfa/frontend/build;
           try_files $uri /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:8001;
           proxy_set_header Host $host;
       }
   }
   ```

7. **Configurar systemd para backend:**
   ```ini
   [Unit]
   Description=LISFA Backend
   After=network.target
   
   [Service]
   User=www-data
   WorkingDirectory=/var/www/lisfa/backend
   ExecStart=/var/www/lisfa/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

---

## Base de Datos MongoDB Atlas (Gratis)

1. Ir a [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Crear cuenta gratuita
3. Crear cluster (M0 - Free)
4. Crear usuario de base de datos
5. Agregar IP a Network Access (0.0.0.0/0 para permitir todas)
6. Obtener connection string:
   ```
   mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/lisfa_attendance
   ```

---

## Verificación Post-Despliegue

1. **Verificar backend:**
   ```bash
   curl https://tu-backend.com/api/users
   ```

2. **Verificar frontend:**
   - Abrir https://tu-frontend.com
   - Login con admin@lisfa.com / admin123

3. **Verificar carnets:**
   - Ir a Estudiantes
   - Click en "Descargar Carnet"

4. **Verificar notificaciones:**
   - Vincular un padre a un estudiante
   - Registrar asistencia
   - Verificar email recibido
