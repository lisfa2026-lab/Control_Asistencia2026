# Sistema de Control de Asistencia - LISFA
## Liceo San Francisco de Asís

### Problema Original
Desarrollar un sistema completo de control de asistencia escolar con:
- Registro de asistencia mediante escaneo de código QR
- Generación de carnets de identificación personalizados
- Notificaciones por email a padres en tiempo real
- Dashboard administrativo para gestión de usuarios
- Compatibilidad con PC y móvil

### Estado Actual: MVP COMPLETO ✅

## Funcionalidades Implementadas

### ✅ Autenticación y Usuarios
- Login/Registro con JWT
- Roles: Admin, Docente, Estudiante, Padre
- Gestión completa de usuarios (CRUD)

### ✅ Carnets de Identificación
- **Diseño VERTICAL** (8.5cm x 5.5cm) según especificación
- Header azul con logo LISFA
- Foto del usuario
- Código QR único
- Código de barras
- Información: Año lectivo, contacto, validez
- **Tamaño optimizado: ~10KB**

### ✅ Control de Asistencia
- Escaneo de QR para registro entrada/salida
- Marcado automático de tardanzas (después de 8am)
- Historial de asistencia por usuario
- Estadísticas de asistencia

### ✅ Dashboard Administrativo
- Vista de estadísticas generales
- Lista de estudiantes con acciones
- Descarga de carnets
- Gestión de categorías

### ✅ Sistema de Notificaciones (Configurado)
- SMTP Gmail configurado: mcdn2024@gmail.com
- Vinculación padres-estudiantes
- Notificaciones automáticas entrada/salida

### ✅ Categorías Personalizadas
- Estudiantes: Párvulos a 5to Bachillerato
- Personal: Administrativo, Docente, Servicio, etc.

## Arquitectura Técnica

```
/app/
├── backend/
│   ├── server.py           # API FastAPI
│   ├── carnet_generator.py # Generador de carnets PDF
│   ├── notification_service.py
│   ├── static/
│   │   ├── logos/
│   │   ├── uploads/
│   │   └── proyecto_LISFA.zip
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── AdminDashboard.js
│   │   │   ├── StudentManagement.js
│   │   │   ├── AttendanceScanner.js
│   │   │   ├── AttendanceHistory.js
│   │   │   └── ParentLink.js
│   │   └── components/
│   └── package.json
└── *.md (documentación)
```

## Endpoints API Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/register | Registrar usuario |
| GET | /api/users | Listar usuarios |
| GET | /api/cards/generate/{id} | Descargar carnet PDF |
| POST | /api/attendance | Registrar asistencia |
| GET | /api/attendance | Historial asistencia |
| POST | /api/parents/link | Vincular padre-estudiante |
| GET | /api/categories | Obtener categorías |

## Credenciales de Prueba

- **Admin:** admin@lisfa.com / admin123
- **Estudiante:** estudiante1@lisfa.com / student123

## Pendientes (Backlog)

### P1 - Próximas mejoras
- [ ] Exportar reportes a PDF/Excel
- [ ] Login mediante escaneo de QR
- [ ] Prueba completa con lector USB Steren

### P2 - Futuro
- [ ] Despliegue en Render.com
- [ ] Opción de escaneo de respaldo

---
**Última actualización:** Enero 2025
