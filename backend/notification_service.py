import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Configuración SMTP (usar variables de entorno en producción)
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@lisfa.edu')

class NotificationService:
    
    @staticmethod
    def format_time(dt):
        """Formato de hora exacto HH:MM:SS"""
        return dt.strftime('%H:%M:%S')
    
    @staticmethod
    def send_entry_notification(student_name: str, entry_time: datetime, parent_email: str) -> bool:
        """
        Envía notificación de INGRESO al padre de familia
        Formato: "[NOMBRE DEL ESTUDIANTE] ingresó a las [HH:MM:SS]"
        """
        try:
            time_str = NotificationService.format_time(entry_time)
            
            subject = f"Notificación de Ingreso - {student_name}"
            body = f"{student_name} ingresó a las {time_str}"
            
            return NotificationService._send_email(
                to_email=parent_email,
                subject=subject,
                body=body,
                student_name=student_name
            )
        except Exception as e:
            logger.error(f"Error al enviar notificación de ingreso: {str(e)}")
            return False
    
    @staticmethod
    def send_exit_notification(student_name: str, exit_time: datetime, parent_email: str) -> bool:
        """
        Envía notificación de SALIDA al padre de familia
        Formato: "[NOMBRE DEL ESTUDIANTE] se retiró a las [HH:MM:SS]"
        """
        try:
            time_str = NotificationService.format_time(exit_time)
            
            subject = f"Notificación de Salida - {student_name}"
            body = f"{student_name} se retiró a las {time_str}"
            
            return NotificationService._send_email(
                to_email=parent_email,
                subject=subject,
                body=body,
                student_name=student_name
            )
        except Exception as e:
            logger.error(f"Error al enviar notificación de salida: {str(e)}")
            return False
    
    @staticmethod
    def _send_email(to_email: str, subject: str, body: str, student_name: str) -> bool:
        """
        Envía email usando SMTP
        """
        # Si no hay configuración SMTP, solo loguear
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.info(f"[SIMULADO] Email a {to_email}: {subject} - {body}")
            return True
        
        try:
            # Crear mensaje
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = FROM_EMAIL
            msg['To'] = to_email
            
            # Texto plano
            text_part = MIMEText(body, 'plain')
            
            # HTML con logo institucional
            html_body = f"""
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 2px solid #c41e3a; border-radius: 10px; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #c41e3a; margin: 0;">Liceo San Francisco de Asís</h2>
                    <p style="color: #1e3a5f; font-size: 14px;">Sistema de Control de Asistencia</p>
                  </div>
                  
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="font-size: 18px; color: #333; margin: 0; text-align: center;">
                      <strong>{body}</strong>
                    </p>
                  </div>
                  
                  <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                    <p>Este es un mensaje automático del sistema de control de asistencia.</p>
                    <p>© 2025 Liceo San Francisco de Asís - Todos los derechos reservados</p>
                  </div>
                </div>
              </body>
            </html>
            """
            html_part = MIMEText(html_body, 'html')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Enviar email
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email enviado exitosamente a {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Error al enviar email a {to_email}: {str(e)}")
            # En caso de error, al menos loguear
            logger.info(f"[FALLBACK LOG] {to_email}: {subject} - {body}")
            return False
    
    @staticmethod
    async def send_realtime_notification(user_name: str, event_type: str, event_time: datetime, parent_emails: list) -> dict:
        """
        Envía notificaciones en tiempo real a múltiples emails
        
        Args:
            user_name: Nombre del estudiante
            event_type: 'entry' o 'exit'
            event_time: Datetime del evento
            parent_emails: Lista de emails de padres
        
        Returns:
            dict con resultados del envío
        """
        results = {
            'success': [],
            'failed': [],
            'total': len(parent_emails)
        }
        
        for email in parent_emails:
            try:
                if event_type == 'entry':
                    success = NotificationService.send_entry_notification(
                        student_name=user_name,
                        entry_time=event_time,
                        parent_email=email
                    )
                elif event_type == 'exit':
                    success = NotificationService.send_exit_notification(
                        student_name=user_name,
                        exit_time=event_time,
                        parent_email=email
                    )
                else:
                    success = False
                
                if success:
                    results['success'].append(email)
                else:
                    results['failed'].append(email)
                    
            except Exception as e:
                logger.error(f"Error procesando notificación para {email}: {str(e)}")
                results['failed'].append(email)
        
        return results