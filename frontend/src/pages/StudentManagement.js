import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Edit, Trash2, Download, Upload, QrCode as QrCodeIcon } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentManagement = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    grade: "",
    section: ""
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/users?role=student`);
      setStudents(response.data);
    } catch (error) {
      toast.error("Error al cargar estudiantes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, {
        ...formData,
        role: "student"
      });
      toast.success("Estudiante agregado exitosamente");
      setIsDialogOpen(false);
      setFormData({ email: "", password: "", full_name: "", grade: "", section: "" });
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al agregar estudiante");
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/users/${editingStudent.id}`, {
        full_name: formData.full_name,
        grade: formData.grade,
        section: formData.section
      });
      toast.success("Estudiante actualizado exitosamente");
      setIsDialogOpen(false);
      setEditingStudent(null);
      setFormData({ email: "", password: "", full_name: "", grade: "", section: "" });
      fetchStudents();
    } catch (error) {
      toast.error("Error al actualizar estudiante");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm("¿Está seguro de eliminar este estudiante?")) {
      try {
        await axios.delete(`${API}/users/${studentId}`);
        toast.success("Estudiante eliminado exitosamente");
        fetchStudents();
      } catch (error) {
        toast.error("Error al eliminar estudiante");
      }
    }
  };

  const handleUploadPhoto = async (studentId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/users/${studentId}/upload-photo`, formData);
      toast.success("Foto subida exitosamente");
      fetchStudents();
    } catch (error) {
      toast.error("Error al subir foto");
    }
  };

  const handleDownloadCard = async (studentId) => {
    try {
      toast.loading("Generando carnet...");
      
      const response = await axios.get(`${API}/cards/generate/${studentId}`, {
        responseType: 'blob'
      });
      
      toast.dismiss();
      
      // Crear URL del blob
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      
      // OPCIÓN 1: Abrir en nueva pestaña para ver el carnet
      window.open(url, '_blank');
      
      // OPCIÓN 2: También ofrecer descarga directa
      const link = document.createElement('a');
      link.href = url;
      const student = students.find(s => s.id === studentId);
      const fileName = `carnet_${student ? student.full_name.replace(/\s+/g, '_') : studentId}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Limpiar URL después de un tiempo
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      toast.success("¡Carnet generado! Se abrió en nueva pestaña y se descargó.");
    } catch (error) {
      toast.dismiss();
      console.error("Error al descargar carnet:", error);
      toast.error("Error al generar el carnet: " + (error.response?.data?.detail || error.message));
    }
  };

  const openAddDialog = () => {
    setEditingStudent(null);
    setFormData({ email: "", password: "", full_name: "", grade: "", section: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (student) => {
    setEditingStudent(student);
    setFormData({
      email: student.email,
      password: "",
      full_name: student.full_name,
      grade: student.grade || "",
      section: student.section || ""
    });
    setIsDialogOpen(true);
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
              <h1 className="text-2xl font-bold" style={{ color: '#c41e3a', fontFamily: 'Manrope, sans-serif' }}>
                Gestión de Estudiantes
              </h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={openAddDialog}
                  data-testid="add-student-button"
                  style={{ background: 'linear-gradient(135deg, #c41e3a 0%, #8b1529 100%)' }}
                  className="text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Estudiante
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Editar Estudiante" : "Nuevo Estudiante"}</DialogTitle>
                  <DialogDescription>
                    {editingStudent ? "Actualizar información del estudiante" : "Completar el formulario para agregar un nuevo estudiante"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      data-testid="student-name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  {!editingStudent && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          data-testid="student-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                          id="password"
                          data-testid="student-password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grado</Label>
                      <Input
                        id="grade"
                        data-testid="student-grade"
                        value={formData.grade}
                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        placeholder="1ro, 2do, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section">Sección</Label>
                      <Input
                        id="section"
                        data-testid="student-section"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        placeholder="A, B, C"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" data-testid="save-student-button">
                    {editingStudent ? "Actualizar" : "Agregar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No hay estudiantes registrados
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <Card key={student.id} className="card-hover" data-testid={`student-card-${student.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {student.photo_url ? (
                        <img 
                          src={`${BACKEND_URL}${student.photo_url}`} 
                          alt={student.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-400">
                            {student.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{student.full_name}</CardTitle>
                        <p className="text-xs text-gray-600">{student.student_id}</p>
                        <p className="text-xs text-gray-500">{student.grade} - {student.section}</p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(student)}
                        data-testid={`edit-student-${student.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStudent(student.id)}
                        data-testid={`delete-student-${student.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`photo-${student.id}`} className="cursor-pointer">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir Foto
                        </span>
                      </Button>
                    </label>
                    <input
                      id={`photo-${student.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadPhoto(student.id, e.target.files[0])}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownloadCard(student.id)}
                    data-testid={`download-card-${student.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Carnet
                  </Button>
                  {student.qr_code && (
                    <div className="mt-2 p-2 bg-white rounded-lg border">
                      <img src={student.qr_code} alt="QR Code" className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;