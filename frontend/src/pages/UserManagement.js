import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2, Download, Users, GraduationCap, Briefcase, UserCog, Camera, Printer } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_CONFIG = {
  student: { label: "Estudiantes", icon: GraduationCap, color: "bg-blue-500" },
  teacher: { label: "Docentes", icon: Briefcase, color: "bg-green-500" },
  admin: { label: "Administración", icon: UserCog, color: "bg-purple-500" },
  staff: { label: "Personal", icon: Users, color: "bg-orange-500" },
};

export default function UserManagement({ user, onLogout }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState({ student: [], staff: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("student");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    category: ""
  });

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      const filteredUsers = response.data.filter(u => u.role !== 'parent');
      setUsers(filteredUsers);
    } catch (error) {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories");
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La foto no debe superar 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Actualizar usuario existente
        const updateData = {
          full_name: formData.full_name,
          category: formData.category
        };
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        
        // Si hay foto nueva, subirla
        if (photoFile) {
          const photoData = new FormData();
          photoData.append('file', photoFile);
          await axios.post(`${API}/users/${editingUser.id}/photo`, photoData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        toast.success("Usuario actualizado");
      } else {
        // Crear nuevo usuario
        const response = await axios.post(`${API}/auth/register`, formData);
        const newUserId = response.data.id;
        
        // Subir foto si existe
        if (photoFile && newUserId) {
          const photoData = new FormData();
          photoData.append('file', photoFile);
          await axios.post(`${API}/users/${newUserId}/photo`, photoData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        toast.success("Usuario registrado");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success("Usuario eliminado");
      fetchUsers();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const downloadCarnet = (userId, userName) => {
    const link = document.createElement("a");
    link.href = `${API}/cards/generate/${userId}`;
    link.download = `carnet_${userName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Descargando carnet de ${userName}`);
  };

  const printCarnet = (userId) => {
    // Abrir en nueva ventana para imprimir
    const printWindow = window.open(`${API}/cards/generate/${userId}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    }
  };

  const resetForm = () => {
    setFormData({ email: "", password: "", full_name: "", role: "student", category: "" });
    setEditingUser(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openEditDialog = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      password: "",
      full_name: userToEdit.full_name,
      role: userToEdit.role,
      category: userToEdit.category || ""
    });
    setPhotoPreview(userToEdit.photo_url ? `${process.env.REACT_APP_BACKEND_URL}${userToEdit.photo_url}` : null);
    setPhotoFile(null);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === "staff") {
      return u.role === "staff" || u.role === "admin";
    }
    return u.role === activeTab;
  });

  const getCategoryOptions = () => {
    if (formData.role === "student") return categories.student || [];
    return categories.staff || [];
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
              <h1 className="text-xl font-bold text-gray-800">Gestión de Usuarios y Carnets</h1>
              <p className="text-sm text-gray-500">Administrar personal, docentes y estudiantes con fotos</p>
            </div>
          </div>
          <Button onClick={openNewDialog} className="bg-red-700 hover:bg-red-800">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Estudiantes
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Docentes
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Personal
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Admin
            </TabsTrigger>
          </TabsList>

          {["student", "teacher", "staff", "admin"].map(role => (
            <TabsContent key={role} value={role}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {ROLE_CONFIG[role]?.label} ({filteredUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-8 text-gray-500">Cargando...</p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No hay usuarios registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Foto del usuario */}
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
                              {u.photo_url ? (
                                <img 
                                  src={`${process.env.REACT_APP_BACKEND_URL}${u.photo_url}`} 
                                  alt={u.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-full h-full ${ROLE_CONFIG[u.role]?.color || 'bg-gray-400'} flex items-center justify-center text-white font-bold text-lg`}
                                style={{ display: u.photo_url ? 'none' : 'flex' }}
                              >
                                {u.full_name?.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{u.full_name}</p>
                              <p className="text-sm text-gray-500">{u.category || u.email}</p>
                              <p className="text-xs text-blue-600">ID: {u.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadCarnet(u.id, u.full_name)}
                              title="Descargar Carnet"
                            >
                              <Download className="h-4 w-4 mr-1" /> Carnet
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => printCarnet(u.id)}
                              title="Imprimir Carnet"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(u)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Dialog para agregar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <Label htmlFor="photo-upload" className="cursor-pointer text-sm text-blue-600 hover:underline">
                {photoPreview ? "Cambiar foto" : "Subir foto"}
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>

            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Correo Electrónico *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contraseña"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value, category: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Estudiante</SelectItem>
                      <SelectItem value="teacher">Docente</SelectItem>
                      <SelectItem value="staff">Personal</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Categoría / Grado</Label>
              <Select
                value={formData.category || "none"}
                onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {getCategoryOptions().map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-700 hover:bg-red-800">
                {editingUser ? "Guardar Cambios" : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
