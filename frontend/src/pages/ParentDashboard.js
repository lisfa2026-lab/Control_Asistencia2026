import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, UserCheck, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ParentDashboard = ({ user, onLogout }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/parents/${user.id}/students`);
      setStudents(response.data);
      
      // Fetch attendance for each student
      const studentsWithAttendance = await Promise.all(
        response.data.map(async (student) => {
          try {
            const statsResponse = await axios.get(`${API}/attendance/stats/${student.id}`);
            return { ...student, stats: statsResponse.data };
          } catch (error) {
            return { ...student, stats: null };
          }
        })
      );
      setStudents(studentsWithAttendance);
    } catch (error) {
      toast.error("Error al cargar estudiantes");
    } finally {
      setLoading(false);
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
                <h1 className="text-2xl font-bold" style={{ color: '#7cb342', fontFamily: 'Manrope, sans-serif' }}>
                  Panel de Padre de Familia
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
        <h2 className="text-2xl font-bold mb-6">Mis Hijos</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No hay estudiantes vinculados
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <Card key={student.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    {student.photo_url ? (
                      <img 
                        src={`${BACKEND_URL}${student.photo_url}`} 
                        alt={student.full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserCheck className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{student.full_name}</CardTitle>
                      <p className="text-sm text-gray-600">{student.grade} - {student.section}</p>
                      <p className="text-xs text-gray-500">{student.student_id}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {student.stats ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Días Presente:</span>
                        <span className="font-semibold">{student.stats.present_days}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Días Ausente:</span>
                        <span className="font-semibold">{student.stats.absent_days}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tasa de Asistencia:</span>
                        <span className="font-semibold text-green-600">{student.stats.attendance_rate}%</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay datos de asistencia</p>
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

export default ParentDashboard;