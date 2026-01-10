# 📧 Configuración de Notificaciones en Tiempo Real

## Estado Actual: ❌ NO CONFIGURADO

Las notificaciones NO se están enviando porque falta:

### 1. Configuración SMTP (CRÍTICO)

Agregar al archivo `/app/backend/.env`:

```env
# Gmail (Recomendado)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
FROM_EMAIL=noreply@lisfa.edu
```

**Cómo obtener password de Gmail:**
1. Ir a: https://myaccount.google.com/security
2. Activar verificación en 2 pasos
3. Ir a "Contraseñas de aplicaciones"
4. Generar contraseña para "Correo"
5. Copiar la contraseña generada (16 caracteres)

### 2. Vincular Padres con Estudiantes

**Opción A: Crear endpoint para vincular padres**

```python
# Endpoint necesario en server.py
@api_router.post("/parents/link")
async def link_parent_to_student(
    parent_email: str,
    student_id: str,
    notification_email: str
):
    # Verificar que el padre exista
    parent = await db.users.find_one({"email": parent_email, "role": "parent"})
    if not parent:
        raise HTTPException(404, "Padre no encontrado")
    
    # Crear o actualizar vinculación
    await db.parents.update_one(
        {"user_id": parent["id"]},
        {
            "$addToSet": {"student_ids": student_id},
            "$set": {"notification_email": notification_email}
        },
        upsert=True
    )
    return {"message": "Vinculación exitosa"}
```

**Opción B: Vincular manualmente en la DB**

```javascript
// En MongoDB
db.parents.insertOne({
    id: "uuid-generado",
    user_id: "id-del-padre",
    student_ids: ["id-estudiante-1", "id-estudiante-2"],
    notification_email: "padre@email.com",
    phone: "+502-xxxx-xxxx"
})
```

### 3. Probar Notificaciones

Una vez configurado SMTP y vinculado un padre:

```bash
# Registrar asistencia de un estudiante
curl -X POST "tu-url/api/attendance" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "id-del-estudiante",
    "recorded_by": "id-admin"
  }'

# El sistema automáticamente:
# 1. Registra la asistencia
# 2. Busca padres vinculados
# 3. Envía email con formato:
#    "[NOMBRE] ingresó a las [HH:MM:SS]"
```

### 4. Alternativas Gratuitas a Gmail

**SendGrid** (100 emails/día gratis)
```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=tu-api-key-sendgrid
```

**Mailgun** (5,000 emails/mes gratis primer mes)
```env
SMTP_SERVER=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=tu-usuario@mg.tudominio.com
SMTP_PASSWORD=tu-password-mailgun
```

## Verificación

```python
# Test de envío
python3 << 'EOF'
from backend.notification_service import NotificationService
from datetime import datetime, timezone

# Probar envío
result = NotificationService.send_entry_notification(
    student_name="María García",
    entry_time=datetime.now(timezone.utc),
    parent_email="padre@test.com"
)
print("Email enviado:", result)
EOF
```

## Resultado Esperado

Una vez configurado correctamente:

1. ✅ Estudiante escanea QR
2. ✅ Sistema registra asistencia
3. ✅ **Email enviado INMEDIATAMENTE** (< 5 segundos)
4. ✅ Padre recibe: "[María García] ingresó a las [09:15:23]"
5. ✅ Registro guardado en DB

## Tiempo de Implementación

- Configurar SMTP: **5 minutos**
- Vincular padres: **2 minutos por padre**
- Probar: **1 minuto**

**Total: ~10 minutos para tener notificaciones funcionando**
