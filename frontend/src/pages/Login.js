import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCircle, Lock, Mail, Users } from "lucide-react";
import { CATEGORIAS_ESTUDIANTES, CATEGORIAS_PERSONAL } from "@/data/categories";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  
  // Register state
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    category: ""
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      onLogin(user);
      toast.success(`Bienvenido, ${user.full_name}!`);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/register`, registerData);
      toast.success("Registro exitoso. Por favor inicia sesión.");
      setRegisterData({
        email: "",
        password: "",
        full_name: "",
        role: "student",
        grade: "",
        section: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
    }}>
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center">
        {/* Left side - Branding */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="flex justify-center lg:justify-start">
            <img 
              src="/logo.jpeg" 
              alt="LISFA Logo" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-4" style={{
              color: '#c41e3a',
              fontFamily: 'Manrope, sans-serif'
            }}>
              LISFA
            </h1>
            <p className="text-xl lg:text-2xl" style={{ color: '#1e3a5f' }}>
              Liceo San Francisco de Asís
            </p>
            <p className="mt-4 text-base text-gray-600">
              Sistema de Control de Asistencia
            </p>
          </div>
        </div>

        {/* Right side - Login/Register Form */}
        <div className="flex-1 w-full">
          <Card className="shadow-2xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Acceso al Sistema</CardTitle>
              <CardDescription className="text-center">
                Ingresa tus credenciales para continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Registrarse</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="login-email"
                          data-testid="login-email"
                          type="email"
                          placeholder="tu@email.com"
                          className="pl-10"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="login-password"
                          data-testid="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="login-submit-button"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #c41e3a 0%, #8b1529 100%)'
                      }}
                    >
                      {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nombre Completo</Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-name"
                          data-testid="register-name"
                          type="text"
                          placeholder="Juan Pérez"
                          className="pl-10"
                          value={registerData.full_name}
                          onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-email"
                          data-testid="register-email"
                          type="email"
                          placeholder="tu@email.com"
                          className="pl-10"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-password"
                          data-testid="register-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-role">Rol</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
                        <Select
                          value={registerData.role}
                          onValueChange={(value) => setRegisterData({ ...registerData, role: value })}
                        >
                          <SelectTrigger data-testid="register-role" className="pl-10">
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Estudiante</SelectItem>
                            <SelectItem value="teacher">Maestro</SelectItem>
                            <SelectItem value="parent">Padre de Familia</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {registerData.role === "student" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-grade">Grado</Label>
                          <Input
                            id="register-grade"
                            data-testid="register-grade"
                            type="text"
                            placeholder="1ro, 2do, etc."
                            value={registerData.grade}
                            onChange={(e) => setRegisterData({ ...registerData, grade: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-section">Sección</Label>
                          <Input
                            id="register-section"
                            data-testid="register-section"
                            type="text"
                            placeholder="A, B, C"
                            value={registerData.section}
                            onChange={(e) => setRegisterData({ ...registerData, section: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full"
                      data-testid="register-submit-button"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #142740 100%)'
                      }}
                    >
                      {loading ? "Registrando..." : "Crear Cuenta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;