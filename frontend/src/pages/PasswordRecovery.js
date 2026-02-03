import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Key, Shield, AlertTriangle, CheckCircle, History } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PasswordRecovery({ user, onLogout }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    adminEmail: user?.email || "",
    adminPassword: "",
    targetUserEmail: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error("Acceso denegado - Solo administradores");
      navigate("/admin");
      return;
    }
    fetchUsers();
    fetchAuditLogs();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      // Filtrar para no mostrar al admin actual
      setUsers(res.data.filter(u => u.email !== user?.email));
    } catch (error) {
      console.error("Error loading users");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API}/admin/audit-logs?action=PASSWORD_RESET_SUCCESS&limit=20`);
      setAuditLogs(res.data);
    } catch (error) {
      console.error("Error loading audit logs");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/reset-password`, {
        admin_email: formData.adminEmail,
        admin_password: formData.adminPassword,
        target_user_email: formData.targetUserEmail,
        new_password: formData.newPassword
      });
      
      toast.success(
        <div>
          <CheckCircle className="inline w-4 h-4 mr-2" />
          {res.data.message}
        </div>
      );
      
      // Limpiar formulario
      setFormData({
        ...formData,
        adminPassword: "",
        targetUserEmail: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      // Actualizar logs
      fetchAuditLogs();
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Error al resetear contraseña";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Recuperación de Contraseñas
            </h1>
            <p className="text-sm text-gray-500">Solo administradores autorizados</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Advertencia */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Función Restringida</h3>
            <p className="text-sm text-yellow-700">
              Esta acción requiere su contraseña de administrador y quedará registrada en el log de auditoría.
              Use esta función solo cuando sea necesario recuperar acceso para un usuario.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Resetear Contraseña de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Autenticación del Admin */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                <h4 className="font-semibold text-blue-900">1. Autenticación del Administrador</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Su Email (Admin)</Label>
                    <Input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                      required
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Su Contraseña (Admin)</Label>
                    <Input
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                      placeholder="Ingrese su contraseña"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Usuario Objetivo */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <h4 className="font-semibold text-gray-900">2. Usuario a Modificar</h4>
                <div className="space-y-2">
                  <Label>Seleccionar Usuario</Label>
                  <Select 
                    value={formData.targetUserEmail}
                    onValueChange={(v) => setFormData({...formData, targetUserEmail: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.email}>
                          {u.full_name} ({u.email}) - {u.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div className="p-4 bg-green-50 rounded-lg space-y-4">
                <h4 className="font-semibold text-green-900">3. Nueva Contraseña</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <Input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Contraseña</Label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="Repita la contraseña"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !formData.targetUserEmail}
                className="w-full bg-red-700 hover:bg-red-800"
              >
                {loading ? "Procesando..." : "Resetear Contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Log de Auditoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Cambios de Contraseña
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay registros de cambios</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLogs.map((log, i) => (
                  <div key={log.id || i} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{log.details?.admin_name} → {log.details?.target_name}</p>
                      <p className="text-gray-500 text-xs">{log.details?.target_user}</p>
                    </div>
                    <div className="text-right text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleString("es-GT")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
