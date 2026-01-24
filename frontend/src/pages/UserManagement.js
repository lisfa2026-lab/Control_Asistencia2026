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
import { ArrowLeft, Plus, Edit, Trash2, Download, Users, GraduationCap, Briefcase, UserCog } from "lucide-react";
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
      // Filtrar padres - ellos no necesitan carnet
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API}/users/${editingUser.id}`, {
          full_name: formData.full_name,
          category: formData.category
        });
        toast.success("Usuario actualizado");
      } else {
        await axios.post(`${API}/auth/register`, formData);
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

  const resetForm = () => {
    setFormData({ email: "", password: "", full_name: "", role: "student", category: "" });
    setEditingUser(null);
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
              <p className="text-sm text-gray-500">Administrar personal, docentes y estudiantes</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-red-700 hover:bg-red-800">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs por tipo de usuario */}
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

          {/* Contenido de cada tab */}
          {Object.keys(ROLE_CONFIG).map(role => {
            const RoleIcon = ROLE_CONFIG[role]?.icon;
            return (
            <TabsContent key={role} value={role === "staff" ? "staff" : role}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {RoleIcon && <RoleIcon className="h-5 w-5" />}
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
                            <div className={`w-10 h-10 rounded-full ${ROLE_CONFIG[u.role]?.color || 'bg-gray-400'} flex items-center justify-center text-white font-bold`}>
                              {u.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{u.full_name}</p>
                              <p className="text-sm text-gray-500">{u.category || u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadCarnet(u.id, u.full_name)}
                              data-testid={`download-carnet-${u.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" /> Carnet
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(u)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u.id)}
                              className="text-red-600 hover:text-red-700"
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
            );
          })}
        </Tabs>
      </main>

      {/* Dialog para agregar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
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
                  <Label>Correo Electrónico</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Contraseña"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
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
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
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
