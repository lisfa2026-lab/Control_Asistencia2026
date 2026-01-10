from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import qrcode
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
from notification_service import NotificationService
from carnet_generator import CarnetGenerator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Mount static files
app.mount("/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str  # 'admin', 'teacher', 'student', 'parent'
    photo_url: Optional[str] = None
    student_id: Optional[str] = None  # For students
    grade: Optional[str] = None  # For students
    section: Optional[str] = None  # For students
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

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

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

# Attendance Routes
@api_router.post("/attendance", response_model=Attendance)
async def record_attendance(attendance_data: AttendanceCreate):
    # Decode QR data to get user_id
    user_id = attendance_data.qr_data
    
    # Get user
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already checked in today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({
        "user_id": user_id,
        "date": today
    }, {"_id": 0})
    
    if existing:
        # Check out
        if not existing.get('check_out_time'):
            await db.attendance.update_one(
                {"id": existing['id']},
                {"$set": {"check_out_time": datetime.now(timezone.utc).isoformat()}}
            )
            return await db.attendance.find_one({"id": existing['id']}, {"_id": 0})
        else:
            raise HTTPException(status_code=400, detail="Already checked out today")
    
    # Create new attendance record
    current_time = datetime.now(timezone.utc)
    status = "present"
    # Mark as late if after 8 AM
    if current_time.hour >= 8:
        status = "late"
    
    attendance = Attendance(
        user_id=user_id,
        user_name=user['full_name'],
        user_role=user['role'],
        check_in_time=current_time,
        date=today,
        status=status,
        recorded_by=attendance_data.recorded_by
    )
    
    attendance_dict = attendance.model_dump()
    attendance_dict['check_in_time'] = attendance_dict['check_in_time'].isoformat()
    
    await db.attendance.insert_one(attendance_dict)
    
    # Send notification to parents if student
    if user['role'] == 'student':
        # Get all parents linked to this student
        parents = await db.parents.find({"student_ids": user_id}, {"_id": 0}).to_list(100)
        
        if parents:
            parent_emails = []
            for parent in parents:
                if parent.get('notification_email'):
                    parent_emails.append(parent['notification_email'])
                else:
                    # Try to get email from parent's user record
                    parent_user = await db.users.find_one({"id": parent['user_id']}, {"_id": 0})
                    if parent_user and parent_user.get('email'):
                        parent_emails.append(parent_user['email'])
            
            if parent_emails:
                # Send real-time notification
                event_type = 'exit' if existing and not existing.get('check_out_time') else 'entry'
                notification_results = await NotificationService.send_realtime_notification(
                    user_name=user['full_name'],
                    event_type=event_type,
                    event_time=current_time,
                    parent_emails=parent_emails
                )
                logger.info(f"Notifications sent: {notification_results}")
    
    return attendance

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
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create PDF
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(3.375*inch, 2.125*inch))  # Standard ID card size
    
    # Background
    c.setFillColorRGB(0.77, 0.12, 0.23)  # Red color from logo
    c.rect(0, 0, 3.375*inch, 0.5*inch, fill=True, stroke=False)
    
    # Logo
    logo_path = ROOT_DIR / "static" / "logos" / "logo.jpeg"
    if logo_path.exists():
        c.drawImage(str(logo_path), 0.2*inch, 1.5*inch, width=0.5*inch, height=0.5*inch, preserveAspectRatio=True)
    
    # Text
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.8*inch, 1.8*inch, "LISFA")
    c.setFont("Helvetica", 6)
    c.drawString(0.8*inch, 1.65*inch, "Liceo San Francisco de Asís")
    
    # User info
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.2*inch, 1.2*inch, user['full_name'])
    
    c.setFont("Helvetica", 8)
    c.drawString(0.2*inch, 1.0*inch, f"Rol: {user['role'].upper()}")
    if user.get('student_id'):
        c.drawString(0.2*inch, 0.85*inch, f"ID: {user['student_id']}")
    if user.get('grade'):
        c.drawString(0.2*inch, 0.7*inch, f"Grado: {user['grade']} - {user.get('section', '')}")
    
    # QR Code
    if user.get('qr_code'):
        # Decode base64 QR code
        qr_data = user['qr_code'].split(',')[1]
        qr_img_data = base64.b64decode(qr_data)
        qr_img = Image.open(BytesIO(qr_img_data))
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        c.drawImage(ImageReader(qr_buffer), 2.3*inch, 0.3*inch, width=0.9*inch, height=0.9*inch)
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename={user['full_name']}_carnet.pdf"
    })

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