from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
from io import BytesIO
import qrcode
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent

# Dimensiones del carnet: 5.5cm x 8.5cm
CARD_WIDTH = 5.5 * cm
CARD_HEIGHT = 8.5 * cm

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
        """Genera imagen QR en memoria"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_carnet(user_data: dict) -> BytesIO:
        """
        Genera carnet en PDF con las especificaciones exactas
        
        user_data debe contener:
        - full_name: str
        - student_id: str (ID único)
        - category: str (categoría/grado)
        - role: str (student/teacher/staff)
        - photo_url: str (opcional)
        - qr_data: str (ID para QR)
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
        
        # Fondo azul oscuro
        c.setFillColorRGB(*COLOR_AZUL_OSCURO)
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=True, stroke=False)
        
        # Franja superior amarilla decorativa
        c.setFillColorRGB(*COLOR_AMARILLO)
        c.rect(0, CARD_HEIGHT - 0.3*cm, CARD_WIDTH, 0.3*cm, fill=True, stroke=False)
        
        # Franja inferior amarilla decorativa
        c.rect(0, 0, CARD_WIDTH, 0.3*cm, fill=True, stroke=False)
        
        # Logo LISFA
        logo_path = ROOT_DIR / "static" / "logos" / "logo_optimized.jpeg"
        if not logo_path.exists():
            logo_path = ROOT_DIR / "static" / "logos" / "logo.jpeg"
        
        if logo_path.exists():
            try:
                c.drawImage(
                    str(logo_path),
                    0.3*cm,  # x
                    CARD_HEIGHT - 1.2*cm,  # y
                    width=0.8*cm,
                    height=0.8*cm,
                    preserveAspectRatio=True
                )
            except:
                pass
        
        # Nombre del Liceo
        c.setFillColorRGB(*COLOR_BLANCO)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(1.3*cm, CARD_HEIGHT - 0.8*cm, "LISFA")
        c.setFont("Helvetica", 5)
        c.drawString(1.3*cm, CARD_HEIGHT - 1.1*cm, "Liceo San Francisco de Asís")
        
        # Foto del usuario (si existe)
        y_position = CARD_HEIGHT - 3.2*cm
        if user_data.get('photo_url'):
            photo_path = ROOT_DIR / user_data['photo_url'].lstrip('/')
            if photo_path.exists():
                try:
                    # Foto centrada, tamaño 2cm x 2.5cm
                    c.drawImage(
                        str(photo_path),
                        (CARD_WIDTH - 2*cm) / 2,  # centrado
                        y_position,
                        width=2*cm,
                        height=2.5*cm,
                        preserveAspectRatio=True,
                        mask='auto'
                    )
                except:
                    # Si falla, dibujar placeholder
                    c.setFillColorRGB(0.8, 0.8, 0.8)
                    c.rect(
                        (CARD_WIDTH - 2*cm) / 2,
                        y_position,
                        2*cm,
                        2.5*cm,
                        fill=True,
                        stroke=True
                    )
        else:
            # Placeholder si no hay foto
            c.setFillColorRGB(0.8, 0.8, 0.8)
            c.rect(
                (CARD_WIDTH - 2*cm) / 2,
                y_position,
                2*cm,
                2.5*cm,
                fill=True,
                stroke=True
            )
        
        # Información del usuario
        y_position -= 0.8*cm
        
        # Nombre completo
        c.setFillColorRGB(*COLOR_BLANCO)
        c.setFont("Helvetica-Bold", 7)
        name = user_data['full_name'][:25]  # Limitar longitud
        name_width = c.stringWidth(name, "Helvetica-Bold", 7)
        c.drawString((CARD_WIDTH - name_width) / 2, y_position, name)
        
        # ID
        y_position -= 0.4*cm
        c.setFont("Helvetica", 6)
        student_id = user_data.get('student_id', 'N/A')
        id_text = f"ID: {student_id}"
        id_width = c.stringWidth(id_text, "Helvetica", 6)
        c.drawString((CARD_WIDTH - id_width) / 2, y_position, id_text)
        
        # Categoría/Grado
        y_position -= 0.4*cm
        category = user_data.get('category', user_data.get('grade', 'N/A'))
        c.setFont("Helvetica-Bold", 6)
        cat_width = c.stringWidth(category, "Helvetica-Bold", 6)
        c.drawString((CARD_WIDTH - cat_width) / 2, y_position, category)
        
        # Código QR
        qr_data = user_data.get('qr_data', user_data.get('id', 'UNKNOWN'))
        qr_buffer = CarnetGenerator.generate_qr_image(qr_data, size=120)
        
        qr_size = 1.8*cm
        qr_x = (CARD_WIDTH - qr_size) / 2
        qr_y = 0.6*cm
        
        c.drawImage(
            ImageReader(qr_buffer),
            qr_x,
            qr_y,
            width=qr_size,
            height=qr_size
        )
        
        # Año
        c.setFillColorRGB(*COLOR_AMARILLO)
        c.setFont("Helvetica-Bold", 5)
        year_text = "2025"
        year_width = c.stringWidth(year_text, "Helvetica-Bold", 5)
        c.drawString((CARD_WIDTH - year_width) / 2, 0.4*cm, year_text)
        
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