import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Link as LinkIcon, Users, Mail, Plus, X, UserPlus, Baby } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ParentChildLink({ user, onLogout }) {
  const navigate = useNavigate();
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [linkedData, setLinkedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Para vincular múltiples hijos a un padre
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [notificationEmail, setNotificationEmail] = useState("");

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
      
      // Cargar vinculaciones existentes
      await fetchLinkedData(parentsRes.data);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedData = async (parentsList) => {
    const linked = [];
    for (const parent of parentsList) {
      try {
        const res = await axios.get(`${API}/parents/${parent.id}`);
        if (res.data && res.data.student_ids?.length > 0) {
          linked.push({
            parent,
            studentIds: res.data.student_ids,
            email: res.data.notification_email
          });
        }
      } catch (error) {
        // Parent not linked yet
      }
    }
    setLinkedData(linked);
  };

  const openLinkDialog = (parent = null) => {
    if (parent) {
      setSelectedParent(parent);
      setNotificationEmail(parent.email);
      // Cargar hijos ya vinculados
      const existing = linkedData.find(l => l.parent.id === parent.id);
      setSelectedStudents(existing?.studentIds || []);
    } else {
      setSelectedParent(null);
      setSelectedStudents([]);
      setNotificationEmail("");
    }
    setIsDialogOpen(true);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleLinkMultiple = async () => {
    if (!selectedParent || selectedStudents.length === 0) {
      toast.error("Selecciona al menos un estudiante");
      return;
    }

    try {
      // Vincular cada estudiante
      for (const studentId of selectedStudents) {
        await axios.post(`${API}/parents/link`, null, {
          params: {
            parent_user_id: selectedParent.id,
            student_id: studentId,
            notification_email: notificationEmail || selectedParent.email
          }
        });
      }

      toast.success(
        <div>
          <strong>✅ Vinculación exitosa!</strong>
          <br />
          <small>{selectedStudents.length} hijo(s) vinculados a {selectedParent.full_name}</small>
        </div>
      );

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al vincular");
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.full_name || "Desconocido";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Vincular Padres con Hijos</h1>
              <p className="text-sm text-gray-500">Un padre puede tener múltiples hijos registrados</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            <Mail className="h-5 w-5" /> Sistema de Notificaciones
          </h3>
          <p className="text-sm text-blue-800 mt-1">
            Cuando un estudiante registra su asistencia (entrada o salida), se enviará automáticamente 
            un correo electrónico a todos los padres vinculados.
          </p>
        </div>

        {/* Lista de Padres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Padres de Familia
              </span>
              <span className="text-sm font-normal text-gray-500">
                {parents.length} registrados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-gray-500">Cargando...</p>
            ) : parents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay padres registrados</p>
                <p className="text-sm text-gray-400">
                  Registra usuarios con rol "Padre de Familia" desde la página de registro
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {parents.map((parent) => {
                  const linked = linkedData.find(l => l.parent.id === parent.id);
                  return (
                    <div
                      key={parent.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                          {parent.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{parent.full_name}</p>
                          <p className="text-sm text-gray-500">{parent.email}</p>
                          {linked && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {linked.studentIds.map(sid => (
                                <span 
                                  key={sid}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
                                >
                                  <Baby className="h-3 w-3 mr-1" />
                                  {getStudentName(sid)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => openLinkDialog(parent)}
                        variant={linked ? "outline" : "default"}
                        className={linked ? "" : "bg-green-600 hover:bg-green-700"}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {linked ? `${linked.studentIds.length} hijo(s)` : "Vincular Hijos"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de Vinculaciones */}
        {linkedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Resumen de Vinculaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {linkedData.map((link) => (
                  <div key={link.parent.id} className="p-4 border rounded-lg">
                    <p className="font-medium">{link.parent.full_name}</p>
                    <p className="text-sm text-gray-500 mb-2">📧 {link.email}</p>
                    <div className="space-y-1">
                      {link.studentIds.map(sid => (
                        <p key={sid} className="text-sm flex items-center gap-1">
                          <span className="text-green-600">✓</span>
                          {getStudentName(sid)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog para vincular hijos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Vincular Hijos a {selectedParent?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email para Notificaciones</Label>
              <Input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
              <p className="text-xs text-gray-500">
                Las notificaciones de asistencia se enviarán a este correo
              </p>
            </div>

            <div className="space-y-2">
              <Label>Seleccionar Hijos</Label>
              <p className="text-xs text-gray-500 mb-2">
                Haz clic en los estudiantes que son hijos de este padre
              </p>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                {students.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedStudents.includes(student.id)
                        ? "bg-green-100 border-green-500 border"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-gray-500">
                        {student.category || student.grade || "Sin grado"} - {student.student_id}
                      </p>
                    </div>
                    {selectedStudents.includes(student.id) && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </div>
                ))}
              </div>

              {selectedStudents.length > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  {selectedStudents.length} estudiante(s) seleccionado(s)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleLinkMultiple}
                className="bg-green-600 hover:bg-green-700"
                disabled={selectedStudents.length === 0}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Guardar Vinculaciones
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
