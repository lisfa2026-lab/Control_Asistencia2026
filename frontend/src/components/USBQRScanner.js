import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, QrCode, Usb } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const USBQRScanner = ({ user }) => {
  const [recentScans, setRecentScans] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [scannerMode, setScannerMode] = useState('usb'); // 'usb' o 'camera'
  const inputRef = useRef(null);
  const scanBuffer = useRef('');
  const scanTimeout = useRef(null);

  // Mantener el foco en el input invisible para capturar el lector USB
  useEffect(() => {
    if (isActive && scannerMode === 'usb' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, scannerMode, recentScans]);

  // Refocus periódicamente para asegurar captura
  useEffect(() => {
    if (scannerMode === 'usb') {
      const intervalId = setInterval(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
      return () => clearInterval(intervalId);
    }
  }, [scannerMode]);

  const processAttendance = async (qrData) => {
    try {
      const response = await axios.post(`${API}/attendance`, {
        qr_data: qrData.trim(),
        recorded_by: user.id
      });
      
      const attendance = response.data;
      
      // Toast de éxito
      toast.success(
        <div>
          <strong>{attendance.user_name}</strong>
          <br />
          {attendance.check_out_time ? 'Salida registrada' : 'Entrada registrada'}
          <br />
          <small>{new Date(attendance.check_in_time).toLocaleTimeString('es-ES')}</small>
        </div>,
        { duration: 3000 }
      );
      
      // Agregar a escaneos recientes
      setRecentScans(prev => [attendance, ...prev.slice(0, 9)]);
      
      // Play sound
      playSuccessSound();
      
    } catch (error) {
      const message = error.response?.data?.detail || "Error al registrar asistencia";
      toast.error(message, { duration: 4000 });
      playErrorSound();
    }
  };

  const playSuccessSound = () => {
    const audio = new Audio('data:audio/wav;base64,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');
    audio.play().catch(() => {});
  };

  const playErrorSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
    audio.play().catch(() => {});
  };

  const handleKeyDown = (e) => {
    // El lector USB envía caracteres uno por uno
    if (e.key === 'Enter') {
      // El lector envía Enter al final
      if (scanBuffer.current.trim()) {
        processAttendance(scanBuffer.current);
        scanBuffer.current = '';
      }
    } else if (e.key.length === 1) {
      // Acumular caracteres
      scanBuffer.current += e.key;
      
      // Timeout para limpiar buffer si no llega Enter
      if (scanTimeout.current) {
        clearTimeout(scanTimeout.current);
      }
      scanTimeout.current = setTimeout(() => {
        scanBuffer.current = '';
      }, 1000);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#7cb342';
      case 'late': return '#f4c430';
      default: return '#6b7280';
    }
  };

  return (
    <div className="space-y-6">
      {/* Modo de Escaneo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {scannerMode === 'usb' ? (
                <><Usb className="w-5 h-5" /> Modo: Lector USB</>  
              ) : (
                <><QrCode className="w-5 h-5" /> Modo: Cámara</>  
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScannerMode(scannerMode === 'usb' ? 'camera' : 'usb')}
              data-testid="toggle-scanner-mode"
            >
              Cambiar a {scannerMode === 'usb' ? 'Cámara' : 'USB'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scannerMode === 'usb' ? (
            <div className="space-y-4">
              {/* Input invisible para capturar el lector USB */}
              <input
                ref={inputRef}
                type="text"
                onKeyDown={handleKeyDown}
                className="sr-only"
                autoFocus
                aria-label="Scanner input"
              />
              
              <div className="text-center p-12 border-2 border-dashed rounded-lg" style={{
                borderColor: isActive ? '#7cb342' : '#ccc',
                backgroundColor: isActive ? '#f0f9f0' : '#f5f5f5'
              }}>
                <Usb className="w-16 h-16 mx-auto mb-4" style={{ color: '#1e3a5f' }} />
                <h3 className="text-xl font-semibold mb-2">
                  {isActive ? 'Lector USB Activo' : 'Lector USB Inactivo'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {isActive 
                    ? 'Acerque el carnet al lector QR USB. El registro será automático e inmediato.'
                    : 'El lector está pausado. Active para continuar.'}
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setIsActive(!isActive)}
                    variant={isActive ? 'destructive' : 'default'}
                    data-testid="toggle-scanner"
                  >
                    {isActive ? 'Pausar' : 'Activar'} Lector
                  </Button>
                </div>
                
                {isActive && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                    <div className="animate-pulse w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-sm font-medium">Esperando escaneo...</span>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Instrucciones del Lector USB:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• El lector QR USB 2D Steren funciona como un teclado</li>
                  <li>• Acerque el carnet al lector - NO necesita presionar nada</li>
                  <li>• El registro es automático e instantáneo</li>
                  <li>• Después de cada escaneo, está listo para el siguiente</li>
                  <li>• Si no funciona, verifique que el lector esté conectado</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <QrCode className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e3a5f' }} />
              <p className="text-gray-600">Modo cámara disponible como respaldo</p>
              <p className="text-sm text-gray-500 mt-2">
                Use este modo si el lector USB no está disponible
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registros Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay registros recientes
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
                  data-testid={`recent-scan-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold">{scan.user_name}</p>
                      <p className="text-xs text-gray-600 capitalize">{scan.user_role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p 
                      className="text-sm font-semibold"
                      style={{ color: getStatusColor(scan.status) }}
                    >
                      {scan.check_out_time ? 'Salida' : 'Entrada'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(scan.check_out_time || scan.check_in_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default USBQRScanner;