from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from PIL import Image, ImageDraw
from io import BytesIO
import qrcode
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent

# Dimensiones estándar de tarjeta de crédito/carnet: 85.6 x 54 mm
CARD_WIDTH = 85.6 * mm
CARD_HEIGHT = 54 * mm

# Colores institucionales
COLOR_AZUL_OSCURO = (0.12, 0.23, 0.37)  # #1e3a5f
COLOR_ROJO = (0.77, 0.12, 0.23)  # #c41e3a
COLOR_BLANCO = (1, 1, 1)
COLOR_AMARILLO = (0.96, 0.77, 0.19)  # #f4c430

# Categorías disponibles
CATEGORIAS_ESTUDIANTES = [
    "Párvulos",
    "Kinder",
    "Preparatoria",
    "1ro. Primaria",
    "2do. Primaria",
    "3ro. Primaria",
    "4to. Primaria",
    "5to. Primaria",
    "6to. Primaria",
    "1ro. Básico A",
    "1ro. Básico B",
    "2do. Básico A",
    "2do. Básico B",
    "3ro. Básico A",
    "3ro. Básico B",
    "4to. Bachillerato en Computación",
    "4to. Bachillerato en Diseño",
    "5to. Bachillerato en Computación",
    "5to. Bachillerato en Diseño"
]

CATEGORIAS_PERSONAL = [
    "Personal Administrativo",
    "Secretaria",
    "Personal de Biblioteca",
    "Personal de Servicio",
    "Personal de Librería",
    "Coordinación",
    "Docente"
]

class CarnetGenerator:
    
    @staticmethod
    def generate_qr_image(data: str, size: int = 150) -> BytesIO:
        """Genera imagen QR en memoria optimizada"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,  # M en vez de H
            box_size=8,  # Reducido de 10
            border=1,  # Reducido de 2
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        buffer = BytesIO()
        # Optimizar PNG
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def create_circular_image(image_path: str, size: int = 150) -> BytesIO:
        """Crea una imagen circular a partir de una foto"""
        try:
            img = Image.open(image_path)
            # Redimensionar manteniendo proporción
            img.thumbnail((size, size), Image.Resampling.LANCZOS)
            
            # Crear máscara circular
            mask = Image.new('L', (size, size), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size, size), fill=255)
            
            # Crear imagen con fondo transparente
            output = Image.new('RGBA', (size, size), (255, 255, 255, 0))
            
            # Centrar la imagen original
            offset = ((size - img.width) // 2, (size - img.height) // 2)
            output.paste(img, offset)
            output.putalpha(mask)
            
            buffer = BytesIO()
            output.save(buffer, format='PNG', optimize=True)
            buffer.seek(0)
            return buffer
        except Exception:
            # Si falla, retornar None
            return None
    
    @staticmethod
    def generate_carnet(user_data: dict) -> BytesIO:
        """
        Genera carnet estilo moderno similar al ejemplo MASBRAND
        Dimensiones estándar: 85.6 x 54 mm (tarjeta de crédito)
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
        
        # === FONDO CON DEGRADADO AZUL ===
        # Fondo blanco base
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=True, stroke=False)
        
        # Degradado azul en la parte superior (simulado con múltiples rectángulos)
        blue_height = CARD_HEIGHT * 0.4
        steps = 30
        for i in range(steps):
            # De azul claro (#87CEEB) a azul más oscuro (#4682B4)
            r = 0.53 + (0.27 * (steps - i) / steps)
            g = 0.51 + (0.27 * (steps - i) / steps)
            b = 0.92 - (0.21 * i / steps)
            c.setFillColorRGB(r, g, b)
            rect_height = blue_height / steps
            y = CARD_HEIGHT - (i * rect_height) - rect_height
            c.rect(0, y, CARD_WIDTH, rect_height, fill=True, stroke=False)
        
        # === PATRÓN DE OLAS DECORATIVO ===
        c.setStrokeColorRGB(1, 1, 1)
        c.setLineWidth(0.5)
        c.setStrokeAlpha(0.3)
        # Olas superiores
        path = c.beginPath()
        wave_y = CARD_HEIGHT - 15*mm
        for x in range(0, int(CARD_WIDTH + 10*mm), 5):
            if x == 0:
                path.moveTo(x, wave_y)
            else:
                path.lineTo(x, wave_y + 2*mm)
                path.lineTo(x + 5, wave_y)
        c.drawPath(path, stroke=1, fill=0)
        
        # === LOGO INSTITUCIONAL ===
        logo_path = ROOT_DIR / "static" / "logos" / "logo_optimized.jpeg"
        if not logo_path.exists():
            logo_path = ROOT_DIR / "static" / "logos" / "logo.jpeg"
        
        if logo_path.exists():
            try:
                logo_size = 12*mm
                c.drawImage(
                    str(logo_path),
                    5*mm,
                    CARD_HEIGHT - logo_size - 3*mm,
                    width=logo_size,
                    height=logo_size,
                    preserveAspectRatio=True,
                    mask='auto'
                )
            except Exception:
                pass
        
        # === NOMBRE DEL LICEO ===
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(18*mm, CARD_HEIGHT - 6*mm, "LISFA")
        c.setFont("Helvetica", 6)
        c.drawString(18*mm, CARD_HEIGHT - 10*mm, "Liceo San Francisco de Asís")
        
        # === FOTO CIRCULAR DEL USUARIO ===
        photo_size = 22*mm
        photo_x = 8*mm
        photo_y = CARD_HEIGHT - 38*mm
        
        if user_data.get('photo_url'):
            photo_path = ROOT_DIR / user_data['photo_url'].lstrip('/')
            if photo_path.exists():
                circular_photo = CarnetGenerator.create_circular_image(str(photo_path), int(photo_size * 2.83))  # mm a px aprox
                if circular_photo:
                    try:
                        c.drawImage(
                            ImageReader(circular_photo),
                            photo_x,
                            photo_y,
                            width=photo_size,
                            height=photo_size,
                            mask='auto'
                        )
                    except Exception:
                        # Fallback: rectángulo gris
                        c.setFillColorRGB(0.85, 0.85, 0.85)
                        c.circle(photo_x + photo_size/2, photo_y + photo_size/2, photo_size/2, fill=1, stroke=0)
            else:
                # Placeholder circular
                c.setFillColorRGB(0.85, 0.85, 0.85)
                c.circle(photo_x + photo_size/2, photo_y + photo_size/2, photo_size/2, fill=1, stroke=0)
        else:
            # Placeholder circular
            c.setFillColorRGB(0.85, 0.85, 0.85)
            c.circle(photo_x + photo_size/2, photo_y + photo_size/2, photo_size/2, fill=1, stroke=0)
        
        # === INFORMACIÓN DEL USUARIO (A LA DERECHA DE LA FOTO) ===
        info_x = photo_x + photo_size + 4*mm
        info_y = photo_y + photo_size - 5*mm
        
        # Nombre
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica-Bold", 11)
        name = user_data['full_name'][:20]
        c.drawString(info_x, info_y, name)
        
        # Categoría/Cargo
        info_y -= 5*mm
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        category = user_data.get('category', user_data.get('grade', 'N/A'))
        if category:
            c.drawString(info_x, info_y, category[:25])
        else:
            c.drawString(info_x, info_y, 'N/A')
        
        # ID
        info_y -= 4*mm
        c.setFont("Helvetica", 7)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        student_id = user_data.get('student_id', user_data.get('id', 'N/A')[:8])
        c.drawString(info_x, info_y, f"ID: {student_id}")
        
        # === CÓDIGO QR (GRANDE, CENTRADO ABAJO) ===
        qr_data = user_data.get('qr_data', user_data.get('id', 'UNKNOWN'))
        qr_buffer = CarnetGenerator.generate_qr_image(qr_data, size=180)
        
        qr_size = 18*mm
        qr_x = (CARD_WIDTH - qr_size) / 2
        qr_y = 3*mm
        
        c.drawImage(
            ImageReader(qr_buffer),
            qr_x,
            qr_y,
            width=qr_size,
            height=qr_size
        )
        
        # === LÍNEA DECORATIVA INFERIOR ===
        c.setStrokeColorRGB(0.2, 0.4, 0.6)
        c.setLineWidth(1)
        c.line(5*mm, 1.5*mm, CARD_WIDTH - 5*mm, 1.5*mm)
        
        # === AÑO ===
        c.setFillColorRGB(0.3, 0.3, 0.3)
        c.setFont("Helvetica-Bold", 6)
        year = "2025"
        year_width = c.stringWidth(year, "Helvetica-Bold", 6)
        c.drawString((CARD_WIDTH - year_width) / 2, 0.5*mm, year)
        
        c.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def get_categorias_by_role(role: str) -> list:
        """Devuelve las categorías disponibles según el rol"""
        if role == 'student':
            return CATEGORIAS_ESTUDIANTES
        elif role in ['teacher', 'admin', 'staff']:
            return CATEGORIAS_PERSONAL
        return []

# Funciones auxiliares
def get_all_categories():
    """Devuelve todas las categorías disponibles"""
    return {
        'student': CATEGORIAS_ESTUDIANTES,
        'staff': CATEGORIAS_PERSONAL
    }