# 🎓 Sistema de Control de Asistencia - LISFA

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat&logo=mongodb)](https://www.mongodb.com/)

Sistema completo de control de asistencia para el **Liceo San Francisco de Asís** con lectura de códigos QR, generación automática de carnets y notificaciones en tiempo real.

![LISFA Logo](./backend/static/logos/logo.jpeg)

## ✨ Características Principales

### 📱 Control de Asistencia
- ✅ Escaneo de códigos QR en tiempo real
- ✅ Registro automático de entrada y salida
- ✅ Detección inteligente de tardanzas
- ✅ Compatible con dispositivos móviles y PC

### 🎫 Generación de Carnets
- ✅ Carnets en PDF con logo institucional
- ✅ Códigos QR únicos por persona
- ✅ Descarga individual e impresión
- ✅ Incluye foto, nombre, ID y grado

### 👥 Gestión Multi-Rol
- ✅ **Administradores**: Control total del sistema
- ✅ **Maestros**: Registro de asistencia y consultas
- ✅ **Estudiantes**: Consulta personal
- ✅ **Padres**: Seguimiento de sus hijos

### 📊 Reportes y Estadísticas
- ✅ Dashboard en tiempo real
- ✅ Estadísticas de asistencia
- ✅ Filtros por fecha y rol
- ✅ Exportación de reportes

### 📧 Notificaciones Automáticas
- ✅ Alertas por email a padres de familia
- ✅ Notificaciones al registrar asistencia
- ✅ Sistema configurable

## 🚀 Tecnologías

### Backend
- **FastAPI** - Framework web moderno y rápido
- **MongoDB** - Base de datos NoSQL
- **Motor** - Driver asíncrono de MongoDB
- **JWT** - Autenticación segura
- **QRCode** - Generación de códigos QR
- **ReportLab** - Generación de PDFs
- **Pillow** - Procesamiento de imágenes

### Frontend
- **React 19** - Framework de UI
- **React Router** - Navegación SPA
- **Shadcn/UI** - Componentes modernos
- **Tailwind CSS** - Estilos utility-first
- **Axios** - Cliente HTTP
- **html5-qrcode** - Escaneo de QR
- **Sonner** - Notificaciones

## 📦 Instalación Local

### Prerequisitos
```bash
- Node.js 16+
- Python 3.11+
- MongoDB
```

### 1. Clonar Repositorio
```bash
git clone https://github.com/lisfa2026-lab/CONTROL-DE-ASISTENCIA.git
cd CONTROL-DE-ASISTENCIA
```

### 2. Configurar Backend
```bash
cd backend
pip install -r requirements.txt

# Crear archivo .env
echo "MONGO_URL=mongodb://localhost:27017" > .env
echo "DB_NAME=lisfa_attendance" >> .env
echo "JWT_SECRET=your-secret-key" >> .env
echo "CORS_ORIGINS=*" >> .env

# Ejecutar servidor
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### 3. Configurar Frontend
```bash
cd ../frontend
yarn install

# Crear archivo .env
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Ejecutar aplicación
yarn start
```

### 4. Acceder
Abre tu navegador en: `http://localhost:3000`

## 🌐 Despliegue en Vercel

Sigue las instrucciones detalladas en [DEPLOY_INSTRUCTIONS.md](./DEPLOY_INSTRUCTIONS.md)

### Resumen Rápido

1. **Backend en Vercel:**
   - Root Directory: `backend`
   - Framework: Other
   - Configurar variables de entorno

2. **Frontend en Vercel:**
   - Root Directory: `frontend`
   - Framework: Create React App
   - Build Command: `yarn build`

3. **MongoDB Atlas:**
   - Crear cluster gratuito
   - Configurar acceso y obtener connection string

## 🔐 Credenciales de Demo

```
Administrador:
Email: admin@lisfa.com
Password: admin123

Estudiante:
Email: estudiante1@lisfa.com
Password: student123
```

## 📱 Estructura del Proyecto

```
CONTROL-DE-ASISTENCIA/
├── backend/
│   ├── server.py              # Aplicación FastAPI
│   ├── requirements.txt       # Dependencias Python
│   ├── vercel.json           # Configuración Vercel
│   ├── .env                  # Variables de entorno
│   └── static/
│       ├── logos/            # Logo institucional
│       └── uploads/          # Fotos de usuarios
├── frontend/
│   ├── src/
│   │   ├── App.js           # Componente principal
│   │   ├── pages/           # Páginas de la aplicación
│   │   └── components/      # Componentes reutilizables
│   ├── package.json         # Dependencias Node
│   └── .env                 # Variables de entorno
├── DEPLOY_INSTRUCTIONS.md   # Guía de despliegue
└── README.md               # Este archivo
```

## 🎨 Capturas de Pantalla

### Dashboard de Administración
Panel principal con estadísticas en tiempo real y acceso rápido a funciones.

### Gestión de Estudiantes
Sistema completo de gestión con códigos QR y generación de carnets.

### Escáner de Asistencia
Interfaz de escaneo en tiempo real compatible con dispositivos móviles.

## 🔧 Configuración de Variables de Entorno

### Backend (.env)
```env
MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/
DB_NAME=lisfa_attendance
JWT_SECRET=change-this-secret-key-in-production
CORS_ORIGINS=https://tu-frontend.vercel.app
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://tu-backend.vercel.app
```

## 📚 API Documentation

Una vez desplegado, accede a la documentación interactiva:
- Swagger UI: `https://tu-backend.vercel.app/docs`
- ReDoc: `https://tu-backend.vercel.app/redoc`

### Endpoints Principales

#### Autenticación
```
POST /api/auth/register - Registro de usuarios
POST /api/auth/login    - Inicio de sesión
```

#### Usuarios
```
GET    /api/users           - Listar usuarios
GET    /api/users/{id}      - Obtener usuario
PUT    /api/users/{id}      - Actualizar usuario
DELETE /api/users/{id}      - Eliminar usuario
POST   /api/users/{id}/upload-photo - Subir foto
```

#### Asistencia
```
POST /api/attendance          - Registrar asistencia
GET  /api/attendance          - Consultar registros
GET  /api/attendance/stats/{id} - Estadísticas
```

#### Carnets
```
GET /api/cards/generate/{id} - Generar carnet PDF
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto fue desarrollado para el Liceo San Francisco de Asís.

## 👥 Equipo

Desarrollado con ❤️ por el equipo de LISFA

## 🐛 Reporte de Problemas

Si encuentras algún problema, por favor abre un [issue](https://github.com/lisfa2026-lab/CONTROL-DE-ASISTENCIA/issues).

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo del Liceo San Francisco de Asís.

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025
