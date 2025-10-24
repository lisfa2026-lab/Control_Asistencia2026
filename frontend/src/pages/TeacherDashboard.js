import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, FileText, LogOut, UserCheck } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error("Error al cargar estadísticas");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={`${BACKEND_URL}/static/logos/logo.jpeg`} 
                alt="LISFA" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f', fontFamily: 'Manrope, sans-serif' }}>
                  Panel de Maestro
                </h1>
                <p className="text-sm text-gray-600">{user.full_name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Estudiantes</CardTitle>
              <UserCheck className="w-5 h-5" style={{ color: '#1e3a5f' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_students || 0}</div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Presentes Hoy</CardTitle>
              <UserCheck className="w-5 h-5" style={{ color: '#7cb342' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.today_present || 0}</div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tasa de Asistencia</CardTitle>
              <UserCheck className="w-5 h-5" style={{ color: '#f4c430' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.attendance_rate || 0}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-hover cursor-pointer" onClick={() => navigate('/scanner')}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #142740 100%)' }}>
                  <QrCode className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Escanear Asistencia</h3>
                  <p className="text-sm text-gray-600">Registrar entrada/salida con QR</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover cursor-pointer" onClick={() => navigate('/attendance')}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #7cb342 0%, #5a9032 100%)' }}>
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ver Asistencia</h3>
                  <p className="text-sm text-gray-600">Revisar historial y reportes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;