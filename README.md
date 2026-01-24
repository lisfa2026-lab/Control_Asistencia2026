# Sistema de Control de Asistencia - LISFA
## Liceo San Francisco de Asís

Sistema completo de control de asistencia escolar con generación de carnets, escaneo QR y notificaciones a padres.

---

## 🚀 Características

- ✅ **Autenticación JWT** - Login seguro con roles (Admin, Docente, Estudiante, Padre)
- ✅ **Generación de Carnets PDF** - Diseño personalizado con QR y código de barras
- ✅ **Escaneo QR** - Registro de entrada/salida automático
- ✅ **Notificaciones Email** - Alertas a padres en tiempo real
- ✅ **Dashboard Administrativo** - Estadísticas y gestión de usuarios
- ✅ **Historial de Asistencia** - Reportes por fecha y usuario

---

## 📁 Estructura del Proyecto

```
lisfa-attendance/
├── backend/
│   ├── server.py              # API FastAPI principal
│   ├── carnet_generator.py    # Generador de carnets PDF
│   ├── notification_service.py # Servicio de emails
│   ├── requirements.txt       # Dependencias Python
│   ├── .env.example          # Variables de entorno ejemplo
│   ├── static/
│   │   ├── logos/            # Logo institucional
│   │   └── uploads/          # Fotos de usuarios
│   └── tests/
│       └── test_api.py       # Tests unitarios
├── frontend/
│   ├── src/
│   │   ├── pages/            # Páginas de la aplicación
│   │   ├── components/       # Componentes reutilizables
│   │   └── App.js            # Componente principal
│   ├── public/
│   ├── package.json          # Dependencias Node.js
│   └── yarn.lock             # Lock de versiones
├── .gitignore
├── README.md
├── PROJECT_STRUCTURE.md
└── DEPLOY_INSTRUCTIONS.md
```

---

## 🛠️ Instalación Local

### Requisitos
- Python 3.9+
- Node.js 18+
- MongoDB 5+

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar servidor
uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend

# Instalar dependencias
yarn install
# o: npm install

# Configurar API URL
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Ejecutar desarrollo
yarn start
# o: npm start
```

---

## 🔑 Variables de Entorno

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=lisfa_attendance
JWT_SECRET=tu-clave-secreta-segura
CORS_ORIGINS=http://localhost:3000

# Para notificaciones email (opcional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASSWORD=tu_contraseña_de_app
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📱 Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/register | Registrar usuario |
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/users | Listar usuarios |
| GET | /api/users/{id} | Obtener usuario |
| PUT | /api/users/{id} | Actualizar usuario |
| DELETE | /api/users/{id} | Eliminar usuario |
| GET | /api/cards/generate/{id} | Generar carnet PDF |
| POST | /api/attendance | Registrar asistencia |
| GET | /api/attendance | Historial asistencia |
| GET | /api/dashboard/stats | Estadísticas |
| GET | /api/categories | Categorías disponibles |
| POST | /api/parents/link | Vincular padre-estudiante |

---

## 👥 Credenciales de Prueba

- **Admin:** admin@lisfa.com / admin123
- **Estudiante:** estudiante1@lisfa.com / student123

---

## 🚀 Despliegue

### Vercel (Frontend)
1. Conectar repositorio a Vercel
2. Configurar `REACT_APP_BACKEND_URL` en variables de entorno
3. Deploy automático

### Render.com (Backend)
1. Crear nuevo Web Service
2. Conectar repositorio
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Configurar variables de entorno

### Railway / Heroku
Ver `DEPLOY_INSTRUCTIONS.md` para más detalles.

---

## 📄 Licencia

Proyecto desarrollado para Liceo San Francisco de Asís (LISFA).

---

## 📞 Contacto

- **Institución:** Liceo San Francisco de Asís
- **Teléfono:** +502 30624815
