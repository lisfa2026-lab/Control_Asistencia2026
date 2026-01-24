import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertCircle, QrCode, Usb, Keyboard, Volume2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const USBQRScanner = ({ user }) => {
  const [recentScans, setRecentScans] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [scannerStatus, setScannerStatus] = useState("waiting"); // waiting, scanning, success, error
  const [lastScanTime, setLastScanTime] = useState(null);
  const inputRef = useRef(null);
  const scanBuffer = useRef("");
  const scanTimeout = useRef(null);
  const lastKeyTime = useRef(0);

  // Mantener foco en el input
  const focusInput = useCallback(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  // Focus inicial y periódico
  useEffect(() => {
    focusInput();
    const interval = setInterval(focusInput, 300);
    return () => clearInterval(interval);
  }, [focusInput]);

  // Listener global de teclado para capturar escaneos
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isActive) return;
      
      // Ignorar si está escribiendo en el input manual
      if (document.activeElement?.id === "manual-input") return;

      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Los lectores USB envían caracteres muy rápido (< 50ms entre caracteres)
      // Un humano tarda más de 100ms entre teclas
      if (timeDiff > 500) {
        // Reset buffer si pasó mucho tiempo
        scanBuffer.current = "";
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (scanBuffer.current.trim().length > 3) {
          processAttendance(scanBuffer.current.trim());
        }
        scanBuffer.current = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanBuffer.current += e.key;
        setScannerStatus("scanning");

        // Limpiar buffer después de 2 segundos de inactividad
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        scanTimeout.current = setTimeout(() => {
          scanBuffer.current = "";
          setScannerStatus("waiting");
        }, 2000);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isActive]);

  const processAttendance = async (qrData) => {
    if (!qrData || qrData.length < 3) {
      toast.error("Código inválido");
      return;
    }

    setScannerStatus("scanning");
    
    try {
      const response = await axios.post(`${API}/attendance`, {
        qr_data: qrData.trim(),
        recorded_by: user?.id || "system"
      });

      const attendance = response.data;
      
      setScannerStatus("success");
      setLastScanTime(new Date());
      
      // Toast de éxito
      toast.success(
        <div>
          <strong>✅ {attendance.user_name}</strong>
          <br />
          {attendance.check_out_time ? "🚪 Salida registrada" : "🏫 Entrada registrada"}
          <br />
          <small>{new Date().toLocaleTimeString("es-ES")}</small>
        </div>,
        { duration: 3000 }
      );

      // Agregar a escaneos recientes
      setRecentScans((prev) => [attendance, ...prev.slice(0, 19)]);

      // Sonido de éxito
      playSound("success");

      // Resetear status después de 2 segundos
      setTimeout(() => setScannerStatus("waiting"), 2000);
      
    } catch (error) {
      setScannerStatus("error");
      const message = error.response?.data?.detail || "Error al registrar asistencia";
      toast.error(message, { duration: 4000 });
      playSound("error");
      setTimeout(() => setScannerStatus("waiting"), 2000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processAttendance(manualCode.trim());
      setManualCode("");
    }
  };

  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === "success") {
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      } else {
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // Audio no disponible
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getStatusStyles = () => {
    switch (scannerStatus) {
      case "scanning":
        return { borderColor: "#f4c430", backgroundColor: "#fffef0" };
      case "success":
        return { borderColor: "#22c55e", backgroundColor: "#f0fdf4" };
      case "error":
        return { borderColor: "#ef4444", backgroundColor: "#fef2f2" };
      default:
        return { borderColor: "#7cb342", backgroundColor: "#f0f9f0" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Input invisible para capturar lector USB */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute -z-10 w-0 h-0"
        autoFocus
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Panel Principal del Scanner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Usb className="w-5 h-5" />
              Lector QR USB 2D
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isActive ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsActive(!isActive)}
                data-testid="toggle-scanner"
              >
                {isActive ? "⏸️ Pausar" : "▶️ Activar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Área de escaneo */}
            <div
              className="text-center p-8 border-4 border-dashed rounded-xl transition-all duration-300"
              style={getStatusStyles()}
              onClick={focusInput}
            >
              <div className="mb-4">
                {scannerStatus === "success" ? (
                  <CheckCircle className="w-20 h-20 mx-auto text-green-500 animate-bounce" />
                ) : scannerStatus === "error" ? (
                  <AlertCircle className="w-20 h-20 mx-auto text-red-500" />
                ) : scannerStatus === "scanning" ? (
                  <QrCode className="w-20 h-20 mx-auto text-yellow-500 animate-pulse" />
                ) : (
                  <Usb className="w-20 h-20 mx-auto" style={{ color: "#1e3a5f" }} />
                )}
              </div>

              <h3 className="text-2xl font-bold mb-2">
                {scannerStatus === "success"
                  ? "✅ ¡Registrado!"
                  : scannerStatus === "error"
                  ? "❌ Error"
                  : scannerStatus === "scanning"
                  ? "📡 Leyendo..."
                  : isActive
                  ? "🟢 Listo para Escanear"
                  : "⏸️ Pausado"}
              </h3>

              <p className="text-gray-600 text-lg">
                {isActive
                  ? "Acerque el carnet al lector QR USB"
                  : "Presione Activar para continuar"}
              </p>

              {isActive && scannerStatus === "waiting" && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <div className="animate-pulse w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Esperando escaneo...</span>
                </div>
              )}

              {lastScanTime && (
                <p className="mt-4 text-sm text-gray-500">
                  Último escaneo: {lastScanTime.toLocaleTimeString("es-ES")}
                </p>
              )}
            </div>

            {/* Entrada Manual como Respaldo */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Entrada Manual (Respaldo)
              </h4>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  id="manual-input"
                  type="text"
                  placeholder="Escriba o pegue el código del carnet"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1"
                  data-testid="manual-code-input"
                />
                <Button type="submit" disabled={!manualCode.trim()} data-testid="manual-submit">
                  Registrar
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Use este campo si el lector USB no funciona o para pruebas
              </p>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Instrucciones del Lector USB Steren:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ El lector funciona como un teclado USB</li>
                <li>✓ Simplemente acerque el carnet al lector</li>
                <li>✓ El registro es automático (no presione nada)</li>
                <li>✓ Escuchará un sonido de confirmación</li>
                <li>✓ Si no funciona, use la entrada manual arriba</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registros Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📋 Registros Recientes</span>
            <span className="text-sm font-normal text-gray-500">
              {recentScans.length} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay registros recientes</p>
              <p className="text-sm">Los escaneos aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentScans.map((scan, index) => (
                <div
                  key={`${scan.id}-${index}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-all"
                  data-testid={`recent-scan-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        scan.check_out_time ? "bg-orange-500" : "bg-green-500"
                      }`}
                    >
                      {scan.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{scan.user_name}</p>
                      <p className="text-xs text-gray-600 capitalize">{scan.user_role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        scan.check_out_time ? "text-orange-600" : "text-green-600"
                      }`}
                    >
                      {scan.check_out_time ? "🚪 Salida" : "🏫 Entrada"}
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
