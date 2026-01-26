from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from PIL import Image, ImageDraw
from io import BytesIO
import qrcode
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent

# Dimensiones del carnet: 8.5 cm alto x 5.5 cm ancho (VERTICAL)
CARD_WIDTH = 55 * mm
CARD_HEIGHT = 85 * mm

# Colores institucionales
COLOR_AZUL_HEADER = (0.22, 0.40, 0.72)
COLOR_VERDE = (0.18, 0.55, 0.34)
COLOR_TEXTO_OSCURO = (0.2, 0.2, 0.2)
COLOR_TEXTO_GRIS = (0.4, 0.4, 0.4)

# Categorías disponibles
CATEGORIAS_ESTUDIANTES = [
    "Párvulos", "Kinder", "Preparatoria",
    "1ro. Primaria", "2do. Primaria", "3ro. Primaria",
    "4to. Primaria", "5to. Primaria", "6to. Primaria",
    "1ro. Básico A", "1ro. Básico B",
    "2do. Básico A", "2do. Básico B",
    "3ro. Básico A", "3ro. Básico B",
    "4to. Bachillerato en Computación", "4to. Bachillerato en Diseño",
    "5to. Bachillerato en Computación", "5to. Bachillerato en Diseño"
]

CATEGORIAS_PERSONAL = [
    "Personal Administrativo", "Secretaria", "Personal de Biblioteca",
    "Personal de Servicio", "Personal de Librería", "Coordinación", "Docente"
]

class CarnetGenerator:
    
    @staticmethod
    def generate_qr_image(data: str, size: int = 200) -> BytesIO:
        """Genera imagen QR grande y clara para mejor lectura"""
        qr = qrcode.QRCode(
            version=2,  # Versión más alta para mejor definición
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # Máxima corrección de errores
            box_size=10,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def optimize_logo(logo_path: str, max_size: int = 80) -> BytesIO:
        """Optimiza el logo para reducir tamaño"""
        try:
            img = Image.open(logo_path)
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=70, optimize=True)
            buffer.seek(0)
            return buffer
        except Exception:
            return None
    
    @staticmethod
    def generate_carnet(user_data: dict) -> BytesIO:
        """
        Genera carnet con QR GRANDE para mejor lectura del escáner Steren COM-5970
        Sin código de barras - solo QR
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
        
        # === FONDO BLANCO ===
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=True, stroke=False)
        
        # === HEADER AZUL ===
        header_height = 12 * mm
        c.setFillColorRGB(*COLOR_AZUL_HEADER)
        c.rect(0, CARD_HEIGHT - header_height, CARD_WIDTH, header_height, fill=True, stroke=False)
        
        # === LOGO EN HEADER ===
        logo_path = ROOT_DIR / "static" / "logos" / "logo.jpeg"
        logo_size = 9 * mm
        logo_x = 2 * mm
        logo_y = CARD_HEIGHT - header_height + 1.5 * mm
        
        if logo_path.exists():
            try:
                logo_buffer = CarnetGenerator.optimize_logo(str(logo_path), 80)
                if logo_buffer:
                    c.drawImage(
                        ImageReader(logo_buffer),
                        logo_x, logo_y,
                        width=logo_size, height=logo_size,
                        preserveAspectRatio=True, mask='auto'
                    )
            except Exception:
                pass
        
        # === TEXTO DEL HEADER ===
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 5)
        inst_x = logo_x + logo_size + 1*mm
        c.drawString(inst_x, CARD_HEIGHT - 4.5*mm, "LICEO SAN FRANCISCO")
        c.drawString(inst_x, CARD_HEIGHT - 7.5*mm, "DE ASÍS - LISFA")
        
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 5*mm, "2026")
        c.setFont("Helvetica", 5)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 8.5*mm, "ID")
        
        # === INFORMACIÓN DEL USUARIO (parte superior) ===
        content_top = CARD_HEIGHT - header_height - 3*mm
        
        # Nombre completo centrado
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 8)
        full_name = user_data.get('full_name', 'NOMBRE').upper()
        
        # Dividir nombre si es muy largo
        if len(full_name) > 20:
            words = full_name.split()
            mid = len(words) // 2
            line1 = ' '.join(words[:mid])
            line2 = ' '.join(words[mid:])
            c.drawCentredString(CARD_WIDTH/2, content_top - 2*mm, line1)
            c.drawCentredString(CARD_WIDTH/2, content_top - 5.5*mm, line2)
            name_bottom = content_top - 8*mm
        else:
            c.drawCentredString(CARD_WIDTH/2, content_top - 3*mm, full_name)
            name_bottom = content_top - 6*mm
        
        # Badge de rol
        role = user_data.get('role', 'student')
        role_text = {
            'student': 'ESTUDIANTE',
            'teacher': 'DOCENTE', 
            'admin': 'ADMINISTRADOR',
            'staff': 'PERSONAL'
        }.get(role, 'USUARIO')
        
        badge_width = 22*mm
        badge_height = 4*mm
        badge_x = (CARD_WIDTH - badge_width) / 2
        badge_y = name_bottom - 5*mm
        
        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.roundRect(badge_x, badge_y, badge_width, badge_height, 1.5*mm, fill=True, stroke=False)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(CARD_WIDTH/2, badge_y + 1*mm, role_text)
        
        # Categoría/Grado
        category = user_data.get('category', user_data.get('grade', ''))
        if category:
            c.setFillColorRGB(*COLOR_TEXTO_GRIS)
            c.setFont("Helvetica", 6)
            c.drawCentredString(CARD_WIDTH/2, badge_y - 4*mm, category)
        
        # === CÓDIGO QR GRANDE ===
        qr_section_y = badge_y - 8*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(CARD_WIDTH/2, qr_section_y, "ESCANEAR PARA ASISTENCIA")
        
        # QR con el USER ID (lo que el sistema necesita)
        user_id = user_data.get('id', user_data.get('qr_data', ''))
        qr_buffer = CarnetGenerator.generate_qr_image(user_id, size=200)
        
        # QR más grande - 28mm (antes era 14mm)
        qr_size = 28 * mm
        qr_x = (CARD_WIDTH - qr_size) / 2
        qr_y = qr_section_y - qr_size - 3*mm
        
        # Borde alrededor del QR para mejor contraste
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setLineWidth(0.5)
        c.rect(qr_x - 1*mm, qr_y - 1*mm, qr_size + 2*mm, qr_size + 2*mm, fill=False, stroke=True)
        
        c.drawImage(
            ImageReader(qr_buffer),
            qr_x, qr_y,
            width=qr_size, height=qr_size
        )
        
        # Código corto debajo del QR
        student_code = user_data.get('student_id', user_id[:8] if user_id else 'N/A')
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 5)
        c.drawCentredString(CARD_WIDTH/2, qr_y - 3*mm, f"ID: {student_code}")
        
        # === INFORMACIÓN INFERIOR ===
        info_y = qr_y - 7*mm
        
        c.setFont("Helvetica", 5)
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(3*mm, info_y, "Contacto:")
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.drawRightString(CARD_WIDTH - 3*mm, info_y, "+502 30624815")
        
        info_y -= 3*mm
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(3*mm, info_y, "Válido:")
        c.setFillColorRGB(*COLOR_VERDE)
        c.setFont("Helvetica-Bold", 5)
        c.drawRightString(CARD_WIDTH - 3*mm, info_y, "Dic 2026")
        
        # === FOOTER ===
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 3.5)
        c.drawCentredString(CARD_WIDTH/2, 3*mm, "Liceo San Francisco de Asís - LISFA")
        
        c.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def get_categorias_by_role(role: str) -> list:
        if role == 'student':
            return CATEGORIAS_ESTUDIANTES
        elif role in ['teacher', 'admin', 'staff']:
            return CATEGORIAS_PERSONAL
        return []

def get_all_categories():
    return {
        'student': CATEGORIAS_ESTUDIANTES,
        'staff': CATEGORIAS_PERSONAL
    }
