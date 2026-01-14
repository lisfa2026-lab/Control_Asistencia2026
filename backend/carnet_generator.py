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
from barcode import Code128
from barcode.writer import ImageWriter

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
    def generate_qr_image(data: str, size: int = 150) -> BytesIO:
        """Genera imagen QR en memoria optimizada"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=1,
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
    def generate_barcode_image(data: str, width_mm: int = 45) -> BytesIO:
        """Genera código de barras Code128"""
        try:
            # Configurar el writer con opciones personalizadas
            writer = ImageWriter()
            writer.set_options({
                'module_width': 0.25,
                'module_height': 8.0,
                'quiet_zone': 2,
                'font_size': 0,
                'text_distance': 1,
                'write_text': False
            })
            
            barcode = Code128(data, writer=writer)
            buffer = BytesIO()
            barcode.write(buffer)
            buffer.seek(0)
            return buffer
        except Exception:
            return None
    
    @staticmethod
    def create_photo_placeholder(width: int, height: int) -> BytesIO:
        """Crea un placeholder para la foto"""
        img = Image.new('RGB', (width, height), (240, 240, 240))
        draw = ImageDraw.Draw(img)
        
        # Dibujar borde
        draw.rectangle([0, 0, width-1, height-1], outline=(200, 200, 200), width=2)
        
        # Dibujar icono de persona simple
        center_x = width // 2
        head_y = height // 3
        head_radius = min(width, height) // 8
        
        # Cabeza
        draw.ellipse([
            center_x - head_radius, head_y - head_radius,
            center_x + head_radius, head_y + head_radius
        ], outline=(180, 180, 180), width=2)
        
        # Cuerpo
        body_top = head_y + head_radius + 5
        body_width = head_radius * 2
        draw.arc([
            center_x - body_width, body_top,
            center_x + body_width, body_top + body_width
        ], 0, 180, fill=(180, 180, 180), width=2)
        
        # Texto "FOTO"
        text = "FOTO"
        text_y = height - height // 4
        # Centrar texto aproximadamente
        draw.text((center_x - 15, text_y), text, fill=(150, 150, 150))
        
        buffer = BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        return buffer
    
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
        logo_path = ROOT_DIR / "static" / "logos" / "logo_optimized.jpeg"
        if not logo_path.exists():
            logo_path = ROOT_DIR / "static" / "logos" / "logo.jpeg"
        
        logo_size = 9 * mm
        logo_x = 2 * mm
        logo_y = CARD_HEIGHT - header_height + 1.5 * mm
        
        if logo_path.exists():
            try:
                c.drawImage(
                    str(logo_path),
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
        c.setFont("Helvetica-Bold", 6)
        
        # Nombre de la institución (centrado)
        inst_name = "LICEO SAN FRANCISCO DE ASÍS"
        inst_x = logo_x + logo_size + 2*mm
        c.drawString(inst_x, CARD_HEIGHT - 5*mm, inst_name)
        
        c.setFont("Helvetica", 5)
        c.drawString(inst_x + 8*mm, CARD_HEIGHT - 8.5*mm, "LISFA")
        
        # Año e ID (derecha)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 5*mm, "2026")
        c.setFont("Helvetica", 5)
        c.drawRightString(CARD_WIDTH - 2*mm, CARD_HEIGHT - 8.5*mm, "ID")
        
        # === SECCIÓN DE FOTO Y DATOS ===
        content_top = CARD_HEIGHT - header_height - 3*mm
        
        # Foto (rectángulo a la izquierda)
        photo_width = 15 * mm
        photo_height = 18 * mm
        photo_x = 4 * mm
        photo_y = content_top - photo_height
        
        # Dibujar marco de la foto
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setLineWidth(0.5)
        c.rect(photo_x, photo_y, photo_width, photo_height, fill=False, stroke=True)
        
        # Si hay foto, dibujarla
        if user_data.get('photo_url'):
            photo_path = ROOT_DIR / user_data['photo_url'].lstrip('/')
            if photo_path.exists():
                try:
                    c.drawImage(
                        str(photo_path),
                        photo_x + 0.5*mm,
                        photo_y + 0.5*mm,
                        width=photo_width - 1*mm,
                        height=photo_height - 1*mm,
                        preserveAspectRatio=True,
                        mask='auto'
                    )
                except Exception:
                    # Placeholder
                    c.setFillColorRGB(0.95, 0.95, 0.95)
                    c.rect(photo_x + 0.5*mm, photo_y + 0.5*mm, photo_width - 1*mm, photo_height - 1*mm, fill=True, stroke=False)
                    c.setFillColorRGB(0.6, 0.6, 0.6)
                    c.setFont("Helvetica", 5)
                    c.drawCentredString(photo_x + photo_width/2, photo_y + photo_height/2, "FOTO")
            else:
                # Placeholder
                c.setFillColorRGB(0.95, 0.95, 0.95)
                c.rect(photo_x + 0.5*mm, photo_y + 0.5*mm, photo_width - 1*mm, photo_height - 1*mm, fill=True, stroke=False)
                c.setFillColorRGB(0.6, 0.6, 0.6)
                c.setFont("Helvetica", 5)
                c.drawCentredString(photo_x + photo_width/2, photo_y + photo_height/2, "FOTO")
        else:
            # Placeholder
            c.setFillColorRGB(0.95, 0.95, 0.95)
            c.rect(photo_x + 0.5*mm, photo_y + 0.5*mm, photo_width - 1*mm, photo_height - 1*mm, fill=True, stroke=False)
            c.setFillColorRGB(0.6, 0.6, 0.6)
            c.setFont("Helvetica", 5)
            c.drawCentredString(photo_x + photo_width/2, photo_y + photo_height/2, "FOTO")
        
        # === INFORMACIÓN DEL USUARIO (derecha de la foto) ===
        info_x = photo_x + photo_width + 3*mm
        info_y = content_top - 4*mm
        
        # Nombre completo
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 7)
        full_name = user_data.get('full_name', 'NOMBRE USUARIO')
        # Dividir nombre si es muy largo
        if len(full_name) > 18:
            words = full_name.split()
            line1 = ' '.join(words[:2])
            line2 = ' '.join(words[2:])
            c.drawString(info_x, info_y, line1[:20])
            info_y -= 3*mm
            c.drawString(info_x, info_y, line2[:20])
        else:
            c.drawString(info_x, info_y, full_name)
        
        info_y -= 4*mm
        
        # Badge de categoría (ESTUDIANTE / DOCENTE / etc)
        role = user_data.get('role', 'student')
        role_text = "ESTUDIANTE" if role == 'student' else "PERSONAL"
        
        # Fondo oscuro para el badge
        badge_width = 18*mm
        badge_height = 3.5*mm
        c.setFillColorRGB(0.15, 0.2, 0.3)
        c.roundRect(info_x, info_y - 1*mm, badge_width, badge_height, 1*mm, fill=True, stroke=False)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(info_x + badge_width/2, info_y, role_text)
        
        info_y -= 5*mm
        
        # Grado/Categoría
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica", 6)
        category = user_data.get('category', user_data.get('grade', 'N/A'))
        c.drawString(info_x, info_y, category[:18] if category else 'N/A')
        
        info_y -= 3.5*mm
        
        # Código de estudiante
        c.setFillColorRGB(0.2, 0.4, 0.7)
        c.setFont("Helvetica-Bold", 5)
        student_code = user_data.get('student_id', user_data.get('id', 'EST001'))
        if len(student_code) > 8:
            student_code = student_code[:8]
        c.drawString(info_x, info_y, student_code.upper())
        
        # === CÓDIGO QR ===
        qr_section_y = photo_y - 5*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(CARD_WIDTH/2, qr_section_y, "CÓDIGO QR")
        
        # Generar datos QR únicos
        qr_data = f"LISFA2026{student_code.upper()}"
        qr_buffer = CarnetGenerator.generate_qr_image(qr_data, size=150)
        
        qr_size = 16 * mm
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
        c.setFont("Helvetica", 4)
        c.drawCentredString(CARD_WIDTH/2, qr_y - 2*mm, qr_data)
        
        # === CÓDIGO DE BARRAS ===
        barcode_section_y = qr_y - 6*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(CARD_WIDTH/2, barcode_section_y, "CÓDIGO DE BARRAS")
        
        # Dibujar código de barras simulado (rectángulos)
        barcode_y = barcode_section_y - 8*mm
        barcode_width = 40*mm
        barcode_height = 6*mm
        barcode_x = (CARD_WIDTH - barcode_width) / 2
        
        # Marco del código de barras
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setLineWidth(0.3)
        c.rect(barcode_x - 1*mm, barcode_y, barcode_width + 2*mm, barcode_height, fill=False, stroke=True)
        
        # Simular barras
        c.setFillColorRGB(0, 0, 0)
        import random
        random.seed(hash(qr_data))  # Consistente para el mismo código
        x = barcode_x
        while x < barcode_x + barcode_width:
            bar_width = random.choice([0.3, 0.5, 0.8, 1.0]) * mm
            if random.random() > 0.3:
                c.rect(x, barcode_y + 0.5*mm, bar_width, barcode_height - 1*mm, fill=True, stroke=False)
            x += bar_width + 0.2*mm
        
        # Texto bajo código de barras
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 4)
        c.drawCentredString(CARD_WIDTH/2, barcode_y - 2*mm, qr_data)
        
        # === INFORMACIÓN INFERIOR ===
        info_section_y = barcode_y - 6*mm
        
        # Año Lectivo
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 5)
        c.drawString(4*mm, info_section_y, "Año Lectivo:")
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.drawRightString(CARD_WIDTH - 4*mm, info_section_y, "2026")
        
        info_section_y -= 3*mm
        
        # Contacto
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(4*mm, info_section_y, "Contacto:")
        c.setFillColorRGB(*COLOR_TEXTO_OSCURO)
        c.drawRightString(CARD_WIDTH - 4*mm, info_section_y, "+503 7001-0003")
        
        info_section_y -= 3*mm
        
        # Válido hasta
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.drawString(4*mm, info_section_y, "Válido hasta:")
        c.setFillColorRGB(*COLOR_VERDE)
        c.setFont("Helvetica-Bold", 5)
        c.drawRightString(CARD_WIDTH - 4*mm, info_section_y, "Dic 2026")
        
        # === FOOTER ===
        footer_y = 4*mm
        
        c.setFillColorRGB(*COLOR_TEXTO_GRIS)
        c.setFont("Helvetica", 4)
        c.drawCentredString(CARD_WIDTH/2, footer_y + 2*mm, "Este carnet es propiedad del Liceo San Francisco de Asís")
        
        c.setFillColorRGB(0.2, 0.4, 0.7)
        c.setFont("Helvetica-Bold", 4)
        c.drawCentredString(CARD_WIDTH/2, footer_y - 1*mm, "LISFA - Educación de Calidad")
        
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
