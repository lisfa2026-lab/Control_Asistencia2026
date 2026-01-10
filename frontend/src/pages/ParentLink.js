import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Link as LinkIcon, Users, Mail } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ParentLink = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [linkData, setLinkData] = useState({
    parent_user_id: "",
    student_id: "",
    notification_email: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [parentsRes, studentsRes] = await Promise.all([
        axios.get(`${API}/users?role=parent`),
        axios.get(`${API}/users?role=student`)
      ]);
      setParents(parentsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    
    if (!linkData.parent_user_id || !linkData.student_id || !linkData.notification_email) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/parents/link`, null, {
        params: linkData
      });
      
      toast.success(
        <div>
          <strong>✅ Vinculación exitosa!</strong>
          <br />
          <small>{response.data.message}</small>
          <br />
          <small>Email: {linkData.notification_email}</small>
        </div>,
        { duration: 5000 }
      );
      
      // Limpiar formulario
      setLinkData({
        parent_user_id: "",
        student_id: "",
        notification_email: ""
      });
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al vincular");
    }
  };

  const handleParentChange = (parentId) => {
    setLinkData({ ...linkData, parent_user_id: parentId });
    // Auto-llenar email del padre
    const parent = parents.find(p => p.id === parentId);
    if (parent && !linkData.notification_email) {
      setLinkData(prev => ({ ...prev, notification_email: parent.email }));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-6 h-6" style={{ color: '#7cb342' }} />
                <h1 className="text-2xl font-bold" style={{ color: '#7cb342', fontFamily: 'Manrope, sans-serif' }}>
                  Vincular Padres con Estudiantes
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurar Notificaciones a Padres</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Vincula un padre de familia con un estudiante para que reciba notificaciones por email
              cuando el estudiante registre su asistencia.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="spinner"></div>
              </div>
            ) : (
              <form onSubmit={handleLink} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="parent">Padre de Familia</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
                    <Select
                      value={linkData.parent_user_id}
                      onValueChange={handleParentChange}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Seleccionar padre" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.full_name} ({parent.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {parents.length === 0 && (
                    <p className="text-sm text-orange-600">
                      ⚠️ No hay padres registrados. Por favor registra al menos un usuario con rol "Padre de Familia".
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student">Estudiante</Label>
                  <Select
                    value={linkData.student_id}
                    onValueChange={(value) => setLinkData({ ...linkData, student_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estudiante" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} - {student.student_id} ({student.category || student.grade || 'Sin grado'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email para Notificaciones</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="padre@example.com"
                      className="pl-10"
                      value={linkData.notification_email}
                      onChange={(e) => setLinkData({ ...linkData, notification_email: e.target.value })}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    El padre recibirá notificaciones en este correo cuando el estudiante registre asistencia.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📧 Formato de Notificaciones</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Entrada:</strong> "[Nombre Estudiante] ingresó a las [09:15:23]"</p>
                    <p><strong>Salida:</strong> "[Nombre Estudiante] se retiró a las [15:30:45]"</p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ background: 'linear-gradient(135deg, #7cb342 0%, #5a9032 100%)' }}
                  disabled={parents.length === 0 || students.length === 0}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Vincular y Activar Notificaciones
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">⚙️ Configuración SMTP Requerida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                Para que las notificaciones se envíen, el administrador del sistema debe configurar:
              </p>
              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                SMTP_SERVER=smtp.gmail.com<br />
                SMTP_PORT=587<br />
                SMTP_USER=tu-email@gmail.com<br />
                SMTP_PASSWORD=contraseña-aplicación<br />
                FROM_EMAIL=noreply@lisfa.edu
              </div>
              <p className="text-gray-600">
                Ver archivo <code className="bg-gray-100 px-2 py-1 rounded">/app/CONFIGURACION_NOTIFICACIONES.md</code> para instrucciones completas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentLink;
