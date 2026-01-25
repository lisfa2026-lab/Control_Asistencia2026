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

# Dimensiones del carnet según especificación: 8.5 cm alto x 5.5 cm ancho (VERTICAL)
CARD_WIDTH = 55 * mm   # 5.5 cm
CARD_HEIGHT = 85 * mm  # 8.5 cm

# Colores institucionales
COLOR_AZUL_HEADER = (0.22, 0.40, 0.72)  # Azul del header #3866B8
COLOR_VERDE = (0.18, 0.55, 0.34)  # Verde para validez
COLOR_TEXTO_OSCURO = (0.2, 0.2, 0.2)
COLOR_TEXTO_GRIS = (0.4, 0.4, 0.4)
COLOR_BLANCO = (1, 1, 1)

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
    def generate_qr_image(data: str, size: int = 120) -> BytesIO:
        """Genera imagen QR optimizada"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=6,
            border=1,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG', optimize=True, compress_level=9)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_barcode_pattern(data: str, width: int, height: int) -> BytesIO:
        """Genera un patrón de código de barras simple"""
        import hashlib
        
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        # Generar patrón basado en hash del dato
        hash_bytes = hashlib.md5(data.encode()).digest()
        
        x = 2
        bar_unit = max(1, width // 60)
        
        for byte in hash_bytes:
            for bit in range(8):
                if x >= width - 2:
                    break
                bar_width = bar_unit + (byte >> bit & 1)
                if (byte >> bit) & 1:
                    draw.rectangle([x, 2, x + bar_width, height - 2], fill='black')
                x += bar_width + 1
        
        buffer = BytesIO()
        img.save(buffer, format='PNG', optimize=True, compress_level=9)
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
        Genera carnet con diseño VERTICAL según ejemplo proporcionado
        Dimensiones: 8.5 cm (alto) x 5.5 cm (ancho)
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
        
        # === LOGO EN HEADER (izquierda) ===
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
                        logo_x,
                        logo_y,
                        width=logo_size,
                        height=logo_size,
                        preserveAspectRatio=True,
                        mask='auto'
                    )
            except Exception:
                pass
        
        # === TEXTO DEL HEADER ===
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 5)
        
        # Nombre de la institución
        inst_x = logo_x + logo_size + 1*mm
        c.drawString(inst_x, CARD_HEIGHT - 4.5*mm, "LICEO SAN FRANCISCO")
        c.drawString(inst_x, CARD_HEIGHT - 7.5*mm, "DE ASÍS - LISFA")
        
        # Año e ID (derecha)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 5*mm, "2026")
        c.setFont("Helvetica", 5)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 8.5*mm, "ID")
        
        # === SECCIÓN DE FOTO Y DATOS ===
        content_top = CARD_HEIGHT - header_height - 3*mm
        
        # Foto (rectángulo a la izquierda)
        photo_width = 14 * mm
        photo_height = 17 * mm
        photo_x = 3 * mm
        photo_y = content_top - photo_height
        
        # Marco de la foto
        c.setStrokeColorRGB(0.85, 0.85, 0.85)
        c.setLineWidth(0.5)
        c.rect(photo_x, photo_y, photo_width, photo_height, fill=False, stroke=True)
        
        # Placeholder o foto
        photo_loaded = False
        if user_data.get('photo_url'):
            photo_path = ROOT_DIR / user_data['photo_url'].lstrip('/')
            if photo_path.exists():
                try:
                    # Optimizar foto
                    img = Image.open(str(photo_path))
                    img.thumbnail((100, 120), Image.Resampling.LANCZOS)
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    photo_buffer = BytesIO()
                    img.save(photo_buffer, format='JPEG', quality=60, optimize=True)
                    photo_buffer.seek(0)
                    
                    c.drawImage(
                        ImageReader(photo_buffer),
                        photo_x + 0.3*mm,
                        photo_y + 0.3*mm,
                        width=photo_width - 0.6*mm,
                        height=photo_height - 0.6*mm,
                        preserveAspectRatio=True
                    )
                    photo_loaded = True
                except Exception:
                    pass
        
        if not photo_loaded:
            c.setFillColorRGB(0.95, 0.95, 0.95)
            c.rect(photo_x + 0.3*mm, photo_y + 0.3*mm, photo_width - 0.6*mm, photo_height - 0.6*mm, fill=True, stroke=False)
            c.setFillColorRGB(0.6, 0.6, 0.6)
            c.setFont("Helvetica", 5)
            c.drawCentredString(photo_x + photo_width/2, photo_y + photo_height/2, "FOTO")
        
        # === INFORMACIÓN DEL USUARIO ===
        info_x = photo_x + photo_width + 2*mm
        info_y = content_top - 3*mm
        max_info_width = CARD_WIDTH - info_x - 2*mm
        
        # Nombre completo
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 6)
        full_name = user_data.get('full_name', 'NOMBRE')
        
        # Dividir nombre en líneas
        words = full_name.upper().split()
        lines = []
        current_line = ""
        for word in words:
            test_line = current_line + " " + word if current_line else word
            if c.stringWidth(test_line, "Helvetica-Bold", 6) < max_info_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        
        for line in lines[:2]:
            c.drawString(info_x, info_y, line)
            info_y -= 3*mm
        
        info_y -= 1*mm
        
        # Badge de rol
        role = user_data.get('role', 'student')
        role_text = "ESTUDIANTE" if role == 'student' else "PERSONAL"
        
        badge_width = 17*mm
        badge_height = 3.2*mm
        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.roundRect(info_x, info_y - 0.5*mm, badge_width, badge_height, 1*mm, fill=True, stroke=False)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 4.5)
        c.drawCentredString(info_x + badge_width/2, info_y + 0.3*mm, role_text)
        
        info_y -= 4.5*mm
        
        # Categoría
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica", 5)
        category = user_data.get('category', user_data.get('grade', 'N/A'))
        c.drawString(info_x, info_y, (category or 'N/A')[:16])
        
        info_y -= 3*mm
        
        # Código
        c.setFillColorRGB(0.2, 0.4, 0.7)
        c.setFont("Helvetica-Bold", 5)
        student_code = user_data.get('student_id', user_data.get('id', 'EST001'))[:10]
        c.drawString(info_x, info_y, student_code.upper())
        
        # === CÓDIGO QR ===
        qr_section_y = photo_y - 4*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(CARD_WIDTH/2, qr_section_y, "CÓDIGO QR")
        
        # IMPORTANTE: El QR debe contener el USER ID para que el escáner lo reconozca
        qr_data = user_data.get('id', user_data.get('qr_data', ''))
        qr_buffer = CarnetGenerator.generate_qr_image(qr_data, size=100)
        
        qr_size = 14 * mm
        qr_x = (CARD_WIDTH - qr_size) / 2
        qr_y = qr_section_y - qr_size - 2*mm
        
        c.drawImage(
            ImageReader(qr_buffer),
            qr_x,
            qr_y,
            width=qr_size,
            height=qr_size
        )
        
        # Texto bajo QR
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 3.5)
        c.drawCentredString(CARD_WIDTH/2, qr_y - 2*mm, qr_data)
        
        # === CÓDIGO DE BARRAS ===
        barcode_section_y = qr_y - 5*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(CARD_WIDTH/2, barcode_section_y, "CÓDIGO DE BARRAS")
        
        # Generar código de barras
        barcode_width = int(38 * mm / 0.35)  # pixels
        barcode_height = 20
        barcode_buffer = CarnetGenerator.generate_barcode_pattern(qr_data, barcode_width, barcode_height)
        
        barcode_y = barcode_section_y - 7*mm
        barcode_draw_width = 38*mm
        barcode_draw_height = 5*mm
        barcode_x = (CARD_WIDTH - barcode_draw_width) / 2
        
        c.drawImage(
            ImageReader(barcode_buffer),
            barcode_x,
            barcode_y,
            width=barcode_draw_width,
            height=barcode_draw_height
        )
        
        # Texto bajo código de barras
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 3.5)
        c.drawCentredString(CARD_WIDTH/2, barcode_y - 2*mm, qr_data)
        
        # === INFORMACIÓN INFERIOR ===
        info_section_y = barcode_y - 5*mm
        
        c.setFont("Helvetica", 4.5)
        
        # Año Lectivo
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(3*mm, info_section_y, "Año Lectivo:")
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.drawRightString(CARD_WIDTH - 3*mm, info_section_y, "2026")
        
        info_section_y -= 3*mm
        
        # Contacto
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(3*mm, info_section_y, "Contacto:")
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.drawRightString(CARD_WIDTH - 3*mm, info_section_y, "+502 30624815")
        
        info_section_y -= 3*mm
        
        # Válido hasta
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(3*mm, info_section_y, "Válido hasta:")
        c.setFillColorRGB(*COLOR_VERDE)
        c.setFont("Helvetica-Bold", 4.5)
        c.drawRightString(CARD_WIDTH - 3*mm, info_section_y, "Dic 2026")
        
        # === FOOTER ===
        footer_y = 3.5*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 3.5)
        c.drawCentredString(CARD_WIDTH/2, footer_y + 2*mm, "Este carnet es propiedad del")
        c.drawCentredString(CARD_WIDTH/2, footer_y, "Liceo San Francisco de Asís")
        
        c.setFillColorRGB(0.2, 0.4, 0.7)
        c.setFont("Helvetica-Bold", 3.5)
        c.drawCentredString(CARD_WIDTH/2, footer_y - 2.5*mm, "LISFA - Educación de Calidad")
        
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
