from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
from jose import JWTError, jwt
import qrcode
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from PIL import Image
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import csv
import traceback
from notification_service import NotificationService
from carnet_generator import CarnetGenerator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("lisfa")

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'lisfa_attendance')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Audit log collection
async def log_audit(action: str, user_id: str, details: dict, ip: str = None):
    """Log audit events to database"""
    try:
        audit_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "user_id": user_id,
            "details": details,
            "ip_address": ip
        }
        await db.audit_logs.insert_one(audit_entry)
        logger.info(f"AUDIT: {action} - User: {user_id} - {details}")
    except Exception as e:
        logger.error(f"Failed to log audit: {e}")

# Password hashing using hashlib (compatible with all environments)
def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwd_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash - supports legacy bcrypt and new SHA256"""
    try:
        # Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
        if hashed_password.startswith('$2'):
            try:
                import bcrypt
                return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
            except Exception as e:
                logger.warning(f"bcrypt verification failed: {e}")
                return False
        
        # New SHA256 hash format: salt$hash
        if '$' in hashed_password and not hashed_password.startswith('$'):
            salt, pwd_hash = hashed_password.split('$', 1)
            check_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
            return check_hash == pwd_hash
        
        return False
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

# Create the main app
app = FastAPI(title="LISFA - Sistema de Control de Asistencia")
api_router = APIRouter(prefix="/api")

# Health check endpoint for Kubernetes
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes"""
    return JSONResponse(content={"status": "healthy", "service": "lisfa-backend"})

@app.get("/api/health")
async def api_health_check():
    """API Health check endpoint"""
    return JSONResponse(content={"status": "healthy", "service": "lisfa-backend"})

# Mount static files
app.mount("/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str  # 'admin', 'teacher', 'student', 'parent', 'staff'
    photo_url: Optional[str] = None
    student_id: Optional[str] = None  # For students
    category: Optional[str] = None  # Categoría específica (ej: "1ro. Primaria", "Secretaria")
    grade: Optional[str] = None  # Deprecated - usar category
    section: Optional[str] = None  # Deprecated - usar category
    qr_code: Optional[str] = None  # QR code data for students/teachers
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    grade: Optional[str] = None
    section: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Parent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    student_ids: List[str]
    phone: Optional[str] = None
    notification_email: Optional[str] = None

class ParentCreate(BaseModel):
    user_id: str
    student_ids: List[str]
    phone: Optional[str] = None
    notification_email: Optional[str] = None

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    date: str  # YYYY-MM-DD format
    status: str = "present"  # present, late, absent
    recorded_by: str  # user_id of person who recorded it

class AttendanceCreate(BaseModel):
    qr_data: str
    recorded_by: str

class AttendanceStats(BaseModel):
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    attendance_rate: float

# Helper functions - Using the functions defined at the top of the file
def get_password_hash(password):
    return hash_password(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

async def send_email_notification(to_email: str, subject: str, body: str):
    """Send email notification (mock implementation)"""
    # In production, implement with actual SMTP server
    logger.info(f"Email notification sent to {to_email}: {subject}")
    return True

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        grade=user_data.grade,
        section=user_data.section
    )
    
    # Generate student ID for students
    if user_data.role == "student":
        # Count existing students to generate ID
        count = await db.users.count_documents({"role": "student"})
        user.student_id = f"LISFA-{str(count + 1).zfill(4)}"
        # Generate QR code
        user.qr_code = generate_qr_code(user.id)
    elif user_data.role == "teacher":
        user.qr_code = generate_qr_code(user.id)
    
    # Store user with hashed password
    user_dict = user.model_dump()
    user_dict['timestamp'] = user_dict['created_at'].isoformat()
    del user_dict['created_at']
    user_dict['password'] = get_password_hash(user_data.password)
    
    await db.users.insert_one(user_dict)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token(data={"sub": user_doc['email'], "user_id": user_doc['id']})
    
    # Remove password from response
    del user_doc['password']
    if 'timestamp' in user_doc:
        user_doc['created_at'] = user_doc['timestamp']
        del user_doc['timestamp']
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_doc
    }

# User Management Routes
@api_router.get("/users", response_model=List[User])
async def get_users(role: Optional[str] = None):
    query = {"role": role} if role else {}
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if 'timestamp' in user:
            user['created_at'] = user['timestamp']
            del user['timestamp']
    return users

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if 'timestamp' in user:
        user['created_at'] = user['timestamp']
        del user['timestamp']
    return user

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, updates: dict):
    # Remove fields that shouldn't be updated
    updates.pop('id', None)
    updates.pop('password', None)
    updates.pop('created_at', None)
    
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return await get_user(user_id)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@api_router.post("/users/{user_id}/upload-photo")
async def upload_photo(user_id: str, file: UploadFile = File(...)):
    # Save file
    file_ext = file.filename.split('.')[-1]
    filename = f"{user_id}.{file_ext}"
    file_path = ROOT_DIR / "static" / "uploads" / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    photo_url = f"/static/uploads/{filename}"
    await db.users.update_one({"id": user_id}, {"$set": {"photo_url": photo_url}})
    
    return {"photo_url": photo_url}

# Parent Routes
@api_router.post("/parents", response_model=Parent)
async def create_parent(parent_data: ParentCreate):
    parent = Parent(**parent_data.model_dump())
    parent_dict = parent.model_dump()
    await db.parents.insert_one(parent_dict)
    return parent

@api_router.post("/parents/link")
async def link_parent_to_student(
    parent_user_id: str,
    student_id: str,
    notification_email: str
):
    """Vincular un padre con un estudiante"""
    # Verificar que el padre exista
    parent_user = await db.users.find_one({"id": parent_user_id, "role": "parent"}, {"_id": 0})
    if not parent_user:
        raise HTTPException(status_code=404, detail="Padre no encontrado")
    
    # Verificar que el estudiante exista
    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Crear o actualizar vinculación
    result = await db.parents.update_one(
        {"user_id": parent_user_id},
        {
            "$addToSet": {"student_ids": student_id},
            "$set": {
                "notification_email": notification_email
            }
        },
        upsert=True
    )
    
    if result.upserted_id or result.modified_count > 0:
        return {
            "message": "Vinculación exitosa",
            "parent": parent_user['full_name'],
            "student": student['full_name'],
            "notification_email": notification_email
        }
    else:
        raise HTTPException(status_code=500, detail="Error al vincular")

@api_router.get("/parents/{user_id}", response_model=Parent)
async def get_parent(user_id: str):
    parent = await db.parents.find_one({"user_id": user_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent

@api_router.get("/parents/{user_id}/students", response_model=List[User])
async def get_parent_students(user_id: str):
    parent = await db.parents.find_one({"user_id": user_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    students = await db.users.find(
        {"id": {"$in": parent['student_ids']}},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    for student in students:
        if 'timestamp' in student:
            student['created_at'] = student['timestamp']
            del student['timestamp']
    
    return students

@api_router.get("/parents/by-student/{student_id}")
async def get_parents_by_student(student_id: str):
    """Obtener todos los padres vinculados a un estudiante"""
    parents = await db.parents.find({"student_ids": student_id}, {"_id": 0}).to_list(100)
    
    # Obtener información completa de cada padre
    parent_info = []
    for parent in parents:
        parent_user = await db.users.find_one({"id": parent['user_id']}, {"_id": 0, "password": 0})
        if parent_user:
            parent_info.append({
                "parent_id": parent['user_id'],
                "parent_name": parent_user['full_name'],
                "parent_email": parent_user['email'],
                "notification_email": parent.get('notification_email', parent_user['email']),
                "phone": parent.get('phone')
            })
    
    return parent_info

# Attendance Routes
@api_router.post("/attendance")
async def record_attendance(attendance_data: AttendanceCreate):
    """
    Registrar asistencia - Compatible con lector Steren COM-5970
    Acepta el user_id directamente desde el QR del carnet
    """
    try:
        qr_data = attendance_data.qr_data.strip()
        logger.info(f"=== SCAN RECEIVED === QR Data: '{qr_data}' (length: {len(qr_data)})")
        
        # Validar que el QR tiene datos
        if not qr_data or len(qr_data) < 5:
            logger.error(f"QR data too short or empty: '{qr_data}'")
            await log_audit("SCAN_ERROR", "system", {"error": "QR data too short", "qr_data": qr_data})
            raise HTTPException(status_code=400, detail=f"Código QR inválido o muy corto. Recibido: '{qr_data}'")
        
        # El QR contiene el user_id directamente
        user_id = qr_data
        
        # Buscar usuario por ID
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        if not user:
            # Intentar buscar por student_id como fallback
            user = await db.users.find_one({"student_id": user_id}, {"_id": 0})
            if user:
                user_id = user['id']
                logger.info(f"User found by student_id: {user['full_name']}")
        
        if not user:
            logger.error(f"User NOT FOUND for QR: '{qr_data}'")
            await log_audit("SCAN_ERROR", "system", {"error": "User not found", "qr_data": qr_data})
            raise HTTPException(
                status_code=404, 
                detail=f"Usuario no encontrado. El código '{qr_data[:20]}...' no corresponde a ningún usuario registrado."
            )
        
        logger.info(f"User FOUND: {user['full_name']} (ID: {user_id})")
        
        # Verificar si ya registró asistencia hoy
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        existing = await db.attendance.find_one({
            "user_id": user_id,
            "date": today
        }, {"_id": 0})
        
        if existing:
            # Ya tiene entrada - registrar salida
            if not existing.get('check_out_time'):
                checkout_time = datetime.now(timezone.utc).isoformat()
                await db.attendance.update_one(
                    {"id": existing['id']},
                    {"$set": {"check_out_time": checkout_time}}
                )
                logger.info(f"CHECK-OUT registered for {user['full_name']}")
                await log_audit("CHECK_OUT", user_id, {"user_name": user['full_name'], "time": checkout_time})
                
                result = await db.attendance.find_one({"id": existing['id']}, {"_id": 0})
                return result
            else:
                logger.warning(f"User {user['full_name']} already checked out today")
                raise HTTPException(
                    status_code=400, 
                    detail=f"{user['full_name']} ya registró entrada y salida hoy. No se puede registrar nuevamente."
                )
        
        # Crear nuevo registro de entrada
        current_time = datetime.now(timezone.utc)
        local_hour = (current_time.hour - 6) % 24  # Ajuste para Guatemala (UTC-6)
        status = "present" if local_hour < 8 else "late"
        
        attendance = Attendance(
            user_id=user_id,
            user_name=user['full_name'],
            user_role=user['role'],
            check_in_time=current_time,
            date=today,
            status=status,
            recorded_by=attendance_data.recorded_by or "system"
        )
        
        attendance_dict = attendance.model_dump()
        attendance_dict['check_in_time'] = attendance_dict['check_in_time'].isoformat()
        
        await db.attendance.insert_one(attendance_dict)
        logger.info(f"CHECK-IN registered for {user['full_name']} - Status: {status}")
        await log_audit("CHECK_IN", user_id, {"user_name": user['full_name'], "status": status})
        
        # Enviar notificación a padres si es estudiante
        if user['role'] == 'student':
            try:
                parents = await db.parents.find({"student_ids": user_id}, {"_id": 0}).to_list(100)
                if parents:
                    parent_emails = []
                    for parent in parents:
                        if parent.get('notification_email'):
                            parent_emails.append(parent['notification_email'])
                    
                    if parent_emails:
                        await NotificationService.send_realtime_notification(
                            user_name=user['full_name'],
                            event_type='entry',
                            event_time=current_time,
                            parent_emails=parent_emails
                        )
                        logger.info(f"Notifications sent to: {parent_emails}")
            except Exception as notif_error:
                logger.error(f"Notification error (non-blocking): {notif_error}")
        
        # Remover _id de MongoDB del resultado
        del attendance_dict['_id'] if '_id' in attendance_dict else None
        return attendance_dict
        
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"CRITICAL ERROR in attendance: {e}\n{error_trace}")
        await log_audit("SCAN_CRITICAL_ERROR", "system", {"error": str(e), "trace": error_trace[:500]})
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(
    user_id: Optional[str] = None,
    date: Optional[str] = None,
    role: Optional[str] = None
):
    query = {}
    if user_id:
        query['user_id'] = user_id
    if date:
        query['date'] = date
    if role:
        query['user_role'] = role
    
    records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    for record in records:
        if 'check_in_time' in record and isinstance(record['check_in_time'], str):
            record['check_in_time'] = datetime.fromisoformat(record['check_in_time'])
        if 'check_out_time' in record and isinstance(record['check_out_time'], str) and record['check_out_time']:
            record['check_out_time'] = datetime.fromisoformat(record['check_out_time'])
    
    return records

@api_router.get("/attendance/stats/{user_id}", response_model=AttendanceStats)
async def get_attendance_stats(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {"user_id": user_id}
    
    if start_date and end_date:
        query['date'] = {"$gte": start_date, "$lte": end_date}
    
    records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    
    total_days = len(records)
    present_days = len([r for r in records if r['status'] in ['present', 'late']])
    late_days = len([r for r in records if r['status'] == 'late'])
    absent_days = total_days - present_days
    
    attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
    
    return AttendanceStats(
        total_days=total_days,
        present_days=present_days,
        absent_days=absent_days,
        late_days=late_days,
        attendance_rate=round(attendance_rate, 2)
    )

# ID Card Generation
@api_router.get("/cards/generate/{user_id}")
async def generate_id_card(user_id: str):
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            logger.error(f"User not found: {user_id}")
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Los padres NO tienen carnet
        if user.get('role') == 'parent':
            raise HTTPException(status_code=400, detail="Los padres no requieren carnet de identificación")
        
        logger.info(f"Generating card for user: {user.get('full_name', 'Unknown')}")
        
        # Generar código de identificación según el rol
        role = user.get('role', 'student')
        if role == 'student':
            user_code = user.get('student_id', f"EST{user['id'][:6].upper()}")
        elif role == 'teacher':
            user_code = user.get('teacher_id', f"DOC{user['id'][:6].upper()}")
        elif role == 'admin':
            user_code = user.get('admin_id', f"ADM{user['id'][:6].upper()}")
        else:
            user_code = f"PER{user['id'][:6].upper()}"
        
        # Preparar datos del usuario para el carnet
        user_data = {
            'id': user['id'],
            'full_name': user.get('full_name', 'Sin Nombre'),
            'student_id': user_code,
            'category': user.get('category') or user.get('grade', 'N/A'),
            'role': role,
            'photo_url': user.get('photo_url'),
            'qr_data': user['id']
        }
        
        logger.info(f"User data prepared: {user_data}")
        
        # Generar carnet usando el nuevo generador
        pdf_buffer = CarnetGenerator.generate_carnet(user_data)
        
        if not pdf_buffer or pdf_buffer.getbuffer().nbytes == 0:
            logger.error("Generated PDF is empty")
            raise HTTPException(status_code=500, detail="Error generating PDF")
        
        logger.info(f"PDF generated successfully: {pdf_buffer.getbuffer().nbytes} bytes")
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={user.get('full_name', 'carnet').replace(' ', '_')}_carnet.pdf",
                "Cache-Control": "no-cache",
                "X-Content-Type-Options": "nosniff"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating card: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating card: {str(e)}")

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count users by role
    students_count = await db.users.count_documents({"role": "student"})
    teachers_count = await db.users.count_documents({"role": "teacher"})
    
    # Today's attendance
    today_attendance = await db.attendance.count_documents({"date": today})
    today_present = await db.attendance.count_documents({"date": today, "status": {"$in": ["present", "late"]}})
    
    return {
        "total_students": students_count,
        "total_teachers": teachers_count,
        "today_attendance": today_attendance,
        "today_present": today_present,
        "attendance_rate": round((today_present / students_count * 100) if students_count > 0 else 0, 2)
    }

# Categories
@api_router.get("/categories")
async def get_categories():
    """Obtener categorías disponibles por rol"""
    from carnet_generator import CATEGORIAS_ESTUDIANTES, CATEGORIAS_PERSONAL
    return {
        "student": CATEGORIAS_ESTUDIANTES,
        "staff": CATEGORIAS_PERSONAL,
        "teacher": CATEGORIAS_PERSONAL,
        "admin": CATEGORIAS_PERSONAL
    }

# Endpoint para descargar ZIP del proyecto
@api_router.get("/download/proyecto")
async def download_proyecto():
    """Descarga el archivo ZIP del proyecto completo"""
    zip_path = ROOT_DIR / "static" / "proyecto_LISFA_completo.zip"
    if not zip_path.exists():
        zip_path = ROOT_DIR / "static" / "proyecto_LISFA.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(
        path=str(zip_path),
        filename="proyecto_LISFA_completo.zip",
        media_type="application/zip"
    )

# ============================================
# RECUPERACIÓN DE CONTRASEÑAS (Solo Admin)
# ============================================

class PasswordResetRequest(BaseModel):
    admin_email: str
    admin_password: str
    target_user_email: str
    new_password: str

@api_router.post("/admin/reset-password")
async def admin_reset_password(request: PasswordResetRequest):
    """
    Recuperación de contraseña - SOLO ADMINISTRADORES
    Requiere autenticación del admin para ejecutar
    """
    try:
        # Verificar que el solicitante es admin
        admin = await db.users.find_one({"email": request.admin_email}, {"_id": 0})
        if not admin:
            await log_audit("PASSWORD_RESET_FAILED", "unknown", {"reason": "Admin not found", "target": request.target_user_email})
            raise HTTPException(status_code=401, detail="Credenciales de administrador inválidas")
        
        if admin.get('role') != 'admin':
            await log_audit("PASSWORD_RESET_DENIED", admin.get('id', 'unknown'), {"reason": "Not admin", "target": request.target_user_email})
            raise HTTPException(status_code=403, detail="Solo los administradores pueden resetear contraseñas")
        
        # Verificar contraseña del admin
        if not verify_password(request.admin_password, admin.get('password', '')):
            await log_audit("PASSWORD_RESET_FAILED", admin['id'], {"reason": "Wrong admin password", "target": request.target_user_email})
            raise HTTPException(status_code=401, detail="Contraseña de administrador incorrecta")
        
        # Buscar usuario objetivo
        target_user = await db.users.find_one({"email": request.target_user_email}, {"_id": 0})
        if not target_user:
            await log_audit("PASSWORD_RESET_FAILED", admin['id'], {"reason": "Target user not found", "target": request.target_user_email})
            raise HTTPException(status_code=404, detail=f"Usuario {request.target_user_email} no encontrado")
        
        # Generar nuevo hash de contraseña
        new_hash = hash_password(request.new_password)
        
        # Actualizar contraseña
        await db.users.update_one(
            {"email": request.target_user_email},
            {"$set": {"password": new_hash, "password_changed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Registrar en audit log
        await log_audit("PASSWORD_RESET_SUCCESS", admin['id'], {
            "admin_name": admin['full_name'],
            "target_user": request.target_user_email,
            "target_name": target_user['full_name']
        })
        
        logger.info(f"Password reset: Admin {admin['full_name']} reset password for {target_user['full_name']}")
        
        return {
            "success": True,
            "message": f"Contraseña actualizada para {target_user['full_name']}",
            "target_email": request.target_user_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    limit: int = Query(100, le=500),
    action: Optional[str] = None
):
    """Obtener logs de auditoría - Solo Admin"""
    try:
        query = {}
        if action:
            query["action"] = action
        
        logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        return []

# ============================================
# REPORTES EN TIEMPO REAL
# ============================================

@api_router.get("/reports/attendance")
async def get_attendance_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    grade: Optional[str] = None,
    section: Optional[str] = None,
    user_id: Optional[str] = None,
    role: Optional[str] = None
):
    """
    Generar reporte de asistencia con filtros
    Filtros: fecha, grado, sección, usuario individual, rol
    """
    try:
        query = {}
        
        # Filtro por rango de fechas
        if date_from:
            query["date"] = {"$gte": date_from}
        if date_to:
            if "date" in query:
                query["date"]["$lte"] = date_to
            else:
                query["date"] = {"$lte": date_to}
        
        # Filtro por usuario específico
        if user_id:
            query["user_id"] = user_id
        
        # Filtro por rol
        if role:
            query["user_role"] = role
        
        # Obtener registros de asistencia
        attendance_records = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
        
        # Si hay filtro por grado o sección, filtrar por usuarios
        if grade or section:
            user_query = {}
            if grade:
                user_query["$or"] = [{"category": grade}, {"grade": grade}]
            if section:
                user_query["section"] = section
            
            matching_users = await db.users.find(user_query, {"id": 1, "_id": 0}).to_list(1000)
            matching_ids = [u['id'] for u in matching_users]
            
            attendance_records = [r for r in attendance_records if r.get('user_id') in matching_ids]
        
        # Calcular estadísticas
        total = len(attendance_records)
        present = len([r for r in attendance_records if r.get('status') == 'present'])
        late = len([r for r in attendance_records if r.get('status') == 'late'])
        absent = len([r for r in attendance_records if r.get('status') == 'absent'])
        
        return {
            "records": attendance_records,
            "stats": {
                "total": total,
                "present": present,
                "late": late,
                "absent": absent,
                "attendance_rate": round((present + late) / total * 100, 2) if total > 0 else 0
            },
            "filters_applied": {
                "date_from": date_from,
                "date_to": date_to,
                "grade": grade,
                "section": section,
                "user_id": user_id,
                "role": role
            }
        }
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando reporte: {str(e)}")

@api_router.get("/reports/export/pdf")
async def export_attendance_pdf(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    grade: Optional[str] = None,
    title: str = "Reporte de Asistencia"
):
    """Exportar reporte de asistencia a PDF"""
    try:
        # Obtener datos del reporte
        report_data = await get_attendance_report(date_from=date_from, date_to=date_to, grade=grade)
        records = report_data["records"]
        stats = report_data["stats"]
        
        # Crear PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            alignment=1,
            spaceAfter=20
        )
        elements.append(Paragraph(f"LICEO SAN FRANCISCO DE ASÍS", title_style))
        elements.append(Paragraph(title, styles['Heading2']))
        elements.append(Spacer(1, 12))
        
        # Información del reporte
        info_text = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        if date_from:
            info_text += f" | Desde: {date_from}"
        if date_to:
            info_text += f" | Hasta: {date_to}"
        if grade:
            info_text += f" | Grado: {grade}"
        elements.append(Paragraph(info_text, styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Estadísticas
        stats_data = [
            ["Total Registros", "Presentes", "Tardanzas", "Ausentes", "% Asistencia"],
            [str(stats['total']), str(stats['present']), str(stats['late']), str(stats['absent']), f"{stats['attendance_rate']}%"]
        ]
        stats_table = Table(stats_data, colWidths=[100, 80, 80, 80, 80])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 20))
        
        # Tabla de registros
        if records:
            elements.append(Paragraph("Detalle de Registros", styles['Heading3']))
            elements.append(Spacer(1, 10))
            
            table_data = [["Fecha", "Nombre", "Rol", "Entrada", "Salida", "Estado"]]
            for r in records[:100]:  # Limitar a 100 registros
                table_data.append([
                    r.get('date', ''),
                    r.get('user_name', '')[:25],
                    r.get('user_role', ''),
                    r.get('check_in_time', '')[:19].replace('T', ' ') if r.get('check_in_time') else '',
                    r.get('check_out_time', '')[:19].replace('T', ' ') if r.get('check_out_time') else '-',
                    r.get('status', '')
                ])
            
            detail_table = Table(table_data, colWidths=[70, 120, 60, 85, 85, 60])
            detail_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c41e3a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
            ]))
            elements.append(detail_table)
        
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"reporte_asistencia_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        raise HTTPException(status_code=500, detail=f"Error exportando PDF: {str(e)}")

@api_router.get("/reports/export/csv")
async def export_attendance_csv(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    grade: Optional[str] = None
):
    """Exportar reporte de asistencia a CSV/Excel"""
    try:
        report_data = await get_attendance_report(date_from=date_from, date_to=date_to, grade=grade)
        records = report_data["records"]
        
        buffer = BytesIO()
        # Write BOM for Excel compatibility
        buffer.write(b'\xef\xbb\xbf')
        
        writer = csv.writer(buffer)
        writer.writerow(["Fecha", "Nombre", "Rol", "Entrada", "Salida", "Estado", "ID Usuario"])
        
        for r in records:
            writer.writerow([
                r.get('date', ''),
                r.get('user_name', ''),
                r.get('user_role', ''),
                r.get('check_in_time', ''),
                r.get('check_out_time', ''),
                r.get('status', ''),
                r.get('user_id', '')
            ])
        
        buffer.seek(0)
        content = buffer.getvalue().decode('utf-8')
        
        filename = f"reporte_asistencia_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
        return StreamingResponse(
            BytesIO(content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"CSV export error: {e}")
        raise HTTPException(status_code=500, detail=f"Error exportando CSV: {str(e)}")

@api_router.get("/reports/by-grade")
async def get_report_by_grade(date: Optional[str] = None):
    """Reporte agrupado por grado/categoría"""
    try:
        target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Obtener todos los usuarios estudiantes
        students = await db.users.find({"role": "student"}, {"_id": 0}).to_list(1000)
        
        # Obtener asistencia del día
        attendance = await db.attendance.find({"date": target_date}, {"_id": 0}).to_list(1000)
        attendance_by_user = {a['user_id']: a for a in attendance}
        
        # Agrupar por grado
        grades = {}
        for student in students:
            grade = student.get('category') or student.get('grade') or 'Sin Grado'
            if grade not in grades:
                grades[grade] = {"total": 0, "present": 0, "late": 0, "absent": 0, "students": []}
            
            grades[grade]["total"] += 1
            att = attendance_by_user.get(student['id'])
            
            student_info = {
                "id": student['id'],
                "name": student['full_name'],
                "status": "absent"
            }
            
            if att:
                student_info["status"] = att.get('status', 'present')
                student_info["check_in"] = att.get('check_in_time')
                student_info["check_out"] = att.get('check_out_time')
                
                if att.get('status') == 'present':
                    grades[grade]["present"] += 1
                elif att.get('status') == 'late':
                    grades[grade]["late"] += 1
                else:
                    grades[grade]["absent"] += 1
            else:
                grades[grade]["absent"] += 1
            
            grades[grade]["students"].append(student_info)
        
        return {
            "date": target_date,
            "grades": grades
        }
        
    except Exception as e:
        logger.error(f"Grade report error: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ============================================
# DEBUG ENDPOINT
# ============================================

@api_router.post("/debug/scan-test")
async def debug_scan_test(data: dict):
    """Endpoint de debug para probar escaneos"""
    try:
        qr_data = data.get('qr_data', '')
        logger.info(f"DEBUG SCAN TEST - Received: '{qr_data}' (length: {len(qr_data)}, repr: {repr(qr_data)})")
        
        # Buscar usuario
        user = await db.users.find_one({"id": qr_data}, {"_id": 0, "password": 0})
        
        if user:
            return {
                "status": "SUCCESS",
                "message": f"Usuario encontrado: {user['full_name']}",
                "user": user,
                "qr_received": qr_data
            }
        else:
            # Listar todos los IDs para debug
            all_users = await db.users.find({}, {"id": 1, "full_name": 1, "_id": 0}).to_list(10)
            return {
                "status": "NOT_FOUND",
                "message": f"No se encontró usuario con ID: {qr_data}",
                "qr_received": qr_data,
                "qr_length": len(qr_data),
                "available_users": all_users
            }
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()