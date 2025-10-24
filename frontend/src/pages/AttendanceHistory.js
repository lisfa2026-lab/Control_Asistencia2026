import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Download, Filter } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AttendanceHistory = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    role: ""
  });

  useEffect(() => {
    fetchAttendance();
  }, [filters]);

  const fetchAttendance = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.role) params.append('role', filters.role);
      if (user.role === 'parent') {
        // For parents, fetch their children's attendance
        const studentsResponse = await axios.get(`${API}/parents/${user.id}/students`);
        const studentIds = studentsResponse.data.map(s => s.id);
        const allAttendance = [];
        for (const studentId of studentIds) {
          const response = await axios.get(`${API}/attendance?user_id=${studentId}`);
          allAttendance.push(...response.data);
        }
        setAttendance(allAttendance);
      } else {
        const response = await axios.get(`${API}/attendance?${params.toString()}`);
        setAttendance(response.data);
      }
    } catch (error) {
      toast.error("Error al cargar asistencia");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return '#7cb342';
      case 'late':
        return '#f4c430';
      case 'absent':
        return '#c41e3a';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'late':
        return 'Tardío';
      case 'absent':
        return 'Ausente';
      default:
        return status;
    }
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
              <div className="flex items-center space-x-2">
                <Calendar className="w-6 h-6" style={{ color: '#7cb342' }} />
                <h1 className="text-2xl font-bold" style={{ color: '#7cb342', fontFamily: 'Manrope, sans-serif' }}>
                  Historial de Asistencia
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        {user.role !== 'parent' && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <CardTitle>Filtros</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-date">Fecha</Label>
                  <Input
                    id="filter-date"
                    data-testid="filter-date"
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-role">Rol</Label>
                  <Select
                    value={filters.role}
                    onValueChange={(value) => setFilters({ ...filters, role: value })}
                  >
                    <SelectTrigger data-testid="filter-role">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="student">Estudiantes</SelectItem>
                      <SelectItem value="teacher">Maestros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance List */}
        <Card>
          <CardHeader>
            <CardTitle>Registros</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay registros para mostrar
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Nombre</th>
                      <th className="text-left py-3 px-4">Rol</th>
                      <th className="text-left py-3 px-4">Fecha</th>
                      <th className="text-left py-3 px-4">Entrada</th>
                      <th className="text-left py-3 px-4">Salida</th>
                      <th className="text-left py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50" data-testid={`attendance-row-${index}`}>
                        <td className="py-3 px-4 font-medium">{record.user_name}</td>
                        <td className="py-3 px-4 capitalize">{record.user_role}</td>
                        <td className="py-3 px-4">{record.date}</td>
                        <td className="py-3 px-4">{formatTime(record.check_in_time)}</td>
                        <td className="py-3 px-4">{formatTime(record.check_out_time)}</td>
                        <td className="py-3 px-4">
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: getStatusColor(record.status) }}
                          >
                            {getStatusLabel(record.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceHistory;