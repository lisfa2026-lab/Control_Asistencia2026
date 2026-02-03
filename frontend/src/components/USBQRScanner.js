import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, QrCode, Usb, Keyboard, Camera, Volume2, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const USBQRScanner = ({ user }) => {
  const [recentScans, setRecentScans] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [scannerStatus, setScannerStatus] = useState("waiting");
  const [lastScanTime, setLastScanTime] = useState(null);
  const [scanMode, setScanMode] = useState("usb"); // usb, camera, manual
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);
  const streamRef = useRef(null);

  // Mantener foco en el input para lector USB
  const focusInput = useCallback(() => {
    if (isActive && scanMode === "usb" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, scanMode]);

  useEffect(() => {
    if (scanMode === "usb") {
      focusInput();
      const interval = setInterval(focusInput, 500);
      return () => clearInterval(interval);
    }
  }, [focusInput, scanMode]);

  // Listener global de teclado para lector USB
  useEffect(() => {
    if (scanMode !== "usb" || !isActive) return;

    const handleGlobalKeyDown = (e) => {
      if (document.activeElement?.id === "manual-input") return;

      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (timeDiff > 500) {
        scanBuffer.current = "";
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const code = scanBuffer.current.trim();
        if (code.length > 5) {
          processAttendance(code);
        }
        scanBuffer.current = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanBuffer.current += e.key;
        setScannerStatus("scanning");
        setErrorMessage("");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isActive, scanMode]);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        
        // Iniciar escaneo con html5-qrcode
        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode("qr-reader");
        
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            html5QrCode.stop();
            stopCamera();
            processAttendance(decodedText);
          },
          (errorMessage) => {
            // Ignorar errores de escaneo continuo
          }
        );
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("No se pudo acceder a la cámara");
      setErrorMessage("Error al acceder a la cámara. Verifique los permisos.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Procesar asistencia
  const processAttendance = async (qrData) => {
    if (!qrData || qrData.length < 5) {
      setErrorMessage("Código QR inválido o muy corto");
      toast.error("Código QR inválido");
      return;
    }

    setScannerStatus("scanning");
    setErrorMessage("");
    
    try {
      console.log("Sending QR data:", qrData);
      
      const response = await axios.post(`${API}/attendance`, {
        qr_data: qrData.trim(),
        recorded_by: user?.id || "system"
      });

      const attendance = response.data;
      
      setScannerStatus("success");
      setLastScanTime(new Date());
      
      const isCheckOut = attendance.check_out_time;
      
      toast.success(
        <div className="flex flex-col">
          <strong className="text-lg">{isCheckOut ? "🚪 SALIDA" : "🏫 ENTRADA"}</strong>
          <span>{attendance.user_name}</span>
          <span className="text-sm opacity-80">{new Date().toLocaleTimeString("es-GT")}</span>
        </div>,
        { duration: 4000 }
      );

      setRecentScans(prev => [attendance, ...prev.slice(0, 29)]);
      playSound("success");
      
      setTimeout(() => {
        setScannerStatus("waiting");
        if (scanMode === "usb") focusInput();
      }, 2000);
      
    } catch (error) {
      setScannerStatus("error");
      const errorMsg = error.response?.data?.detail || "Error al registrar asistencia";
      setErrorMessage(errorMsg);
      toast.error(errorMsg, { duration: 5000 });
      playSound("error");
      
      console.error("Attendance error:", error.response?.data);
      
      setTimeout(() => {
        setScannerStatus("waiting");
        setErrorMessage("");
      }, 3000);
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
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      } else {
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {}
  };

  const getStatusStyles = () => {
    switch (scannerStatus) {
      case "scanning": return "border-yellow-400 bg-yellow-50";
      case "success": return "border-green-500 bg-green-50";
      case "error": return "border-red-500 bg-red-50";
      default: return "border-blue-400 bg-blue-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Input invisible para lector USB */}
      {scanMode === "usb" && (
        <input
          ref={inputRef}
          type="text"
          className="opacity-0 absolute -z-10 w-0 h-0"
          autoFocus
          tabIndex={-1}
        />
      )}

      {/* Selector de Modo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Registro de Asistencia
            </span>
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => {
                setIsActive(!isActive);
                if (cameraActive) stopCamera();
              }}
            >
              {isActive ? "⏸️ Pausar" : "▶️ Activar"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={scanMode} onValueChange={(v) => {
            if (cameraActive) stopCamera();
            setScanMode(v);
            setErrorMessage("");
          }}>
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="usb" className="flex items-center gap-2">
                <Usb className="w-4 h-4" /> Lector USB
              </TabsTrigger>
              <TabsTrigger value="camera" className="flex items-center gap-2">
                <Camera className="w-4 h-4" /> Cámara
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" /> Manual
              </TabsTrigger>
            </TabsList>

            {/* MODO USB */}
            <TabsContent value="usb">
              <div
                className={`text-center p-8 border-4 border-dashed rounded-xl transition-all ${getStatusStyles()}`}
                onClick={focusInput}
              >
                {scannerStatus === "success" ? (
                  <CheckCircle className="w-24 h-24 mx-auto text-green-500 animate-bounce" />
                ) : scannerStatus === "error" ? (
                  <AlertCircle className="w-24 h-24 mx-auto text-red-500 animate-pulse" />
                ) : scannerStatus === "scanning" ? (
                  <QrCode className="w-24 h-24 mx-auto text-yellow-500 animate-pulse" />
                ) : (
                  <Usb className="w-24 h-24 mx-auto text-blue-600" />
                )}

                <h3 className="text-2xl font-bold mt-4 mb-2">
                  {scannerStatus === "success" ? "✅ ¡REGISTRADO!" :
                   scannerStatus === "error" ? "❌ ERROR" :
                   scannerStatus === "scanning" ? "📡 LEYENDO..." :
                   isActive ? "🟢 LISTO PARA ESCANEAR" : "⏸️ PAUSADO"}
                </h3>

                <p className="text-gray-600 text-lg">
                  {isActive ? "Acerque el carnet al lector Steren COM-5970" : "Presione Activar"}
                </p>

                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                    <strong>Error:</strong> {errorMessage}
                  </div>
                )}

                {isActive && scannerStatus === "waiting" && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                    <div className="animate-pulse w-4 h-4 bg-green-500 rounded-full"></div>
                    <span>Esperando escaneo...</span>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Instrucciones Lector USB Steren:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Conecte el lector al puerto USB</li>
                  <li>✓ Acerque el carnet con el código QR hacia el lector</li>
                  <li>✓ Espere el pitido y la confirmación en pantalla</li>
                  <li>✓ El carnet debe tener el QR generado por este sistema</li>
                </ul>
              </div>
            </TabsContent>

            {/* MODO CÁMARA */}
            <TabsContent value="camera">
              <div className="text-center">
                {!cameraActive ? (
                  <div className="p-8 border-4 border-dashed border-gray-300 rounded-xl">
                    <Camera className="w-24 h-24 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Use la cámara del celular para escanear</p>
                    <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
                      <Camera className="w-4 h-4 mr-2" /> Iniciar Cámara
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={stopCamera}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                    {errorMessage}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* MODO MANUAL */}
            <TabsContent value="manual">
              <div className="p-6 border rounded-xl">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Keyboard className="w-5 h-5" /> Ingreso Manual de Código
                </h4>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <Input
                      id="manual-input"
                      type="text"
                      placeholder="Pegue o escriba el código del carnet (ID de usuario)"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="text-lg p-4"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El código está debajo del QR en el carnet (ej: 21b495dd-ff0c-48b8...)
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!manualCode.trim()}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Registrar Asistencia
                  </Button>
                </form>

                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                    {errorMessage}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Registros Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>📋 Registros de Hoy</span>
            <span className="text-sm font-normal text-gray-500">{recentScans.length} registros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay registros aún</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentScans.map((scan, index) => (
                <div
                  key={`${scan.id}-${index}`}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    scan.check_out_time ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      scan.check_out_time ? "bg-orange-500" : "bg-green-500"
                    }`}>
                      {scan.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{scan.user_name}</p>
                      <p className="text-xs text-gray-500">{scan.user_role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${scan.check_out_time ? "text-orange-600" : "text-green-600"}`}>
                      {scan.check_out_time ? "🚪 Salida" : "🏫 Entrada"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(scan.check_out_time || scan.check_in_time).toLocaleTimeString("es-GT")}
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
