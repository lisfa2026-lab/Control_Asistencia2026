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
            version=2,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
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
    def optimize_image(image_path: str, max_size: int = 120) -> BytesIO:
        """Optimiza imagen para el carnet"""
        try:
            img = Image.open(image_path)
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Error optimizing image: {e}")
            return None
    
    @staticmethod
    def generate_carnet(user_data: dict) -> BytesIO:
        """
        Genera carnet con foto y QR GRANDE para lector Steren COM-5970
        El QR contiene el USER ID para registro de asistencia
        """
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
        
        # === FONDO BLANCO ===
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=True, stroke=False)
        
        # === HEADER AZUL ===
        header_height = 11 * mm
        c.setFillColorRGB(*COLOR_AZUL_HEADER)
        c.rect(0, CARD_HEIGHT - header_height, CARD_WIDTH, header_height, fill=True, stroke=False)
        
        # === LOGO EN HEADER ===
        logo_path = ROOT_DIR / "static" / "logos" / "logo.jpeg"
        logo_size = 8 * mm
        logo_x = 2 * mm
        logo_y = CARD_HEIGHT - header_height + 1.5 * mm
        
        if logo_path.exists():
            try:
                logo_buffer = CarnetGenerator.optimize_image(str(logo_path), 60)
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
        c.drawString(inst_x, CARD_HEIGHT - 4*mm, "LICEO SAN FRANCISCO")
        c.drawString(inst_x, CARD_HEIGHT - 7*mm, "DE ASÍS - LISFA")
        
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 5*mm, "2026")
        
        # === FOTO DEL USUARIO ===
        content_top = CARD_HEIGHT - header_height - 2*mm
        
        photo_width = 18 * mm
        photo_height = 22 * mm
        photo_x = (CARD_WIDTH - photo_width) / 2
        photo_y = content_top - photo_height - 1*mm
        
        # Marco de la foto
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(0.5)
        c.rect(photo_x - 0.5*mm, photo_y - 0.5*mm, photo_width + 1*mm, photo_height + 1*mm, fill=False, stroke=True)
        
        # Dibujar foto si existe
        photo_loaded = False
        if user_data.get('photo_url'):
            photo_path = ROOT_DIR / user_data['photo_url'].lstrip('/')
            if photo_path.exists():
                try:
                    photo_buffer = CarnetGenerator.optimize_image(str(photo_path), 150)
                    if photo_buffer:
                        c.drawImage(
                            ImageReader(photo_buffer),
                            photo_x, photo_y,
                            width=photo_width, height=photo_height,
                            preserveAspectRatio=True
                        )
                        photo_loaded = True
                except Exception as e:
                    print(f"Error loading photo: {e}")
        
        # Placeholder si no hay foto
        if not photo_loaded:
            c.setFillColorRGB(0.95, 0.95, 0.95)
            c.rect(photo_x, photo_y, photo_width, photo_height, fill=True, stroke=False)
            c.setFillColorRGB(0.6, 0.6, 0.6)
            c.setFont("Helvetica", 6)
            c.drawCentredString(photo_x + photo_width/2, photo_y + photo_height/2, "FOTO")
        
        # === NOMBRE DEL USUARIO ===
        name_y = photo_y - 4*mm
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 7)
        full_name = user_data.get('full_name', 'NOMBRE').upper()
        
        # Acortar nombre si es muy largo
        if len(full_name) > 22:
            words = full_name.split()
            if len(words) >= 2:
                full_name = f"{words[0]} {words[-1]}"
        
        c.drawCentredString(CARD_WIDTH/2, name_y, full_name[:24])
        
        # === BADGE DE ROL ===
        role = user_data.get('role', 'student')
        role_text = {
            'student': 'ESTUDIANTE',
            'teacher': 'DOCENTE', 
            'admin': 'ADMIN',
            'staff': 'PERSONAL'
        }.get(role, 'USUARIO')
        
        badge_y = name_y - 5*mm
        badge_width = 18*mm
        badge_height = 3.5*mm
        badge_x = (CARD_WIDTH - badge_width) / 2
        
        c.setFillColorRGB(0.15, 0.2, 0.35)
        c.roundRect(badge_x, badge_y, badge_width, badge_height, 1*mm, fill=True, stroke=False)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(CARD_WIDTH/2, badge_y + 0.8*mm, role_text)
        
        # === CATEGORÍA ===
        category = user_data.get('category', user_data.get('grade', ''))
        if category:
            c.setFillColorRGB(*COLOR_TEXTO_GRIS)
            c.setFont("Helvetica", 5)
            c.drawCentredString(CARD_WIDTH/2, badge_y - 3.5*mm, category[:20])
        
        # === CÓDIGO QR GRANDE ===
        # El QR debe contener el USER ID exacto para que el escáner funcione
        user_id = user_data.get('id', '')
        
        if not user_id:
            raise ValueError("User ID is required for QR generation")
        
        qr_y = badge_y - 8*mm if category else badge_y - 5*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(CARD_WIDTH/2, qr_y, "ESCANEAR PARA ASISTENCIA")
        
        # Generar QR con el USER ID
        qr_buffer = CarnetGenerator.generate_qr_image(user_id, size=200)
        
        # QR de 25mm para mejor lectura
        qr_size = 25 * mm
        qr_x = (CARD_WIDTH - qr_size) / 2
        qr_draw_y = qr_y - qr_size - 2*mm
        
        c.drawImage(
            ImageReader(qr_buffer),
            qr_x, qr_draw_y,
            width=qr_size, height=qr_size
        )
        
        # ID corto debajo del QR
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 4)
        c.drawCentredString(CARD_WIDTH/2, qr_draw_y - 2*mm, f"ID: {user_id[:12]}...")
        
        # === FOOTER ===
        footer_y = 3*mm
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 3.5)
        c.drawCentredString(CARD_WIDTH/2, footer_y + 2*mm, "+502 30624815")
        c.setFillColorRGB(*COLOR_VERDE)
        c.setFont("Helvetica-Bold", 3.5)
        c.drawCentredString(CARD_WIDTH/2, footer_y, "Válido 2026")
        
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
