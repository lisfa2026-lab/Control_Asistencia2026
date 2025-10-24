import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AttendanceScanner = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [scanner, setScanner] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    initScanner();
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, []);

  const initScanner = () => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    setScanner(html5QrcodeScanner);
    setScanning(true);
  };

  const onScanSuccess = async (decodedText) => {
    try {
      const response = await axios.post(`${API}/attendance`, {
        qr_data: decodedText,
        recorded_by: user.id
      });
      
      const attendance = response.data;
      toast.success(`Asistencia registrada: ${attendance.user_name}`);
      
      // Add to recent scans
      setRecentScans([attendance, ...recentScans.slice(0, 4)]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al registrar asistencia");
    }
  };

  const onScanFailure = (error) => {
    // Silent fail for continuous scanning
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate(-1)} data-testid="back-button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <QrCode className="w-6 h-6" style={{ color: '#1e3a5f' }} />
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f', fontFamily: 'Manrope, sans-serif' }}>
                  Escanear Asistencia
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner */}
          <Card>
            <CardHeader>
              <CardTitle>Escanear Código QR</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="qr-reader" className="w-full" data-testid="qr-scanner"></div>
              <p className="mt-4 text-sm text-gray-600 text-center">
                Coloque el código QR del carnet frente a la cámara
              </p>
            </CardContent>
          </Card>

          {/* Recent Scans */}
          <Card>
            <CardHeader>
              <CardTitle>Registros Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentScans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay registros recientes
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border"
                      data-testid={`recent-scan-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-semibold">{scan.user_name}</p>
                          <p className="text-sm text-gray-600">{scan.user_role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{
                          color: scan.status === 'present' ? '#7cb342' : '#f4c430'
                        }}>
                          {scan.status === 'present' ? 'A tiempo' : 'Tardío'}
                        </p>
                        <p className="text-xs text-gray-500">{formatTime(scan.check_in_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScanner;