import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Download, Filter, Calendar, Users, BarChart3, Printer } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Reports({ user, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [gradeReport, setGradeReport] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // Filtros
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    grade: "",
    role: ""
  });

  useEffect(() => {
    fetchCategories();
    fetchGradeReport();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data.student || []);
    } catch (error) {
      console.error("Error loading categories");
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters.dateTo) params.append("date_to", filters.dateTo);
      if (filters.grade && filters.grade !== "all") params.append("grade", filters.grade);
      if (filters.role && filters.role !== "all") params.append("role", filters.role);

      const res = await axios.get(`${API}/reports/attendance?${params}`);
      setReportData(res.data);
      toast.success("Reporte generado");
    } catch (error) {
      toast.error("Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeReport = async () => {
    try {
      const res = await axios.get(`${API}/reports/by-grade?date=${filters.dateFrom}`);
      setGradeReport(res.data);
    } catch (error) {
      console.error("Error loading grade report");
    }
  };

  const exportPDF = () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append("date_from", filters.dateFrom);
    if (filters.dateTo) params.append("date_to", filters.dateTo);
    if (filters.grade && filters.grade !== "all") params.append("grade", filters.grade);
    
    window.open(`${API}/reports/export/pdf?${params}`, '_blank');
    toast.success("Descargando PDF...");
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append("date_from", filters.dateFrom);
    if (filters.dateTo) params.append("date_to", filters.dateTo);
    if (filters.grade) params.append("grade", filters.grade);
    
    window.open(`${API}/reports/export/csv?${params}`, '_blank');
    toast.success("Descargando CSV/Excel...");
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Reportes de Asistencia</h1>
              <p className="text-sm text-gray-500">Generar y exportar reportes en tiempo real</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Excel/CSV
            </Button>
            <Button onClick={exportPDF} className="bg-red-700 hover:bg-red-800">
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filtros */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Fecha Desde</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Hasta</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Grado/Categoría</Label>
                <Select value={filters.grade} onValueChange={(v) => setFilters({...filters, grade: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los grados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={filters.role} onValueChange={(v) => setFilters({...filters, role: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="student">Estudiantes</SelectItem>
                    <SelectItem value="teacher">Docentes</SelectItem>
                    <SelectItem value="admin">Administración</SelectItem>
                    <SelectItem value="staff">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReport} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? "Cargando..." : "Generar Reporte"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="print:hidden">
            <TabsTrigger value="summary">
              <BarChart3 className="h-4 w-4 mr-2" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="by-grade">
              <Users className="h-4 w-4 mr-2" /> Por Grado
            </TabsTrigger>
            <TabsTrigger value="detail">
              <Calendar className="h-4 w-4 mr-2" /> Detalle
            </TabsTrigger>
          </TabsList>

          {/* Resumen */}
          <TabsContent value="summary">
            {reportData ? (
              <div className="space-y-6">
                {/* Tarjetas de estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-blue-700">{reportData.stats.total}</p>
                      <p className="text-sm text-blue-600">Total Registros</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-green-700">{reportData.stats.present}</p>
                      <p className="text-sm text-green-600">Presentes</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-yellow-700">{reportData.stats.late}</p>
                      <p className="text-sm text-yellow-600">Tardanzas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-red-700">{reportData.stats.absent}</p>
                      <p className="text-sm text-red-600">Ausentes</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50">
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-purple-700">{reportData.stats.attendance_rate}%</p>
                      <p className="text-sm text-purple-600">% Asistencia</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Info de filtros */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">
                      <strong>Período:</strong> {reportData.filters_applied.date_from || 'Inicio'} al {reportData.filters_applied.date_to || 'Hoy'}
                      {reportData.filters_applied.grade && ` | Grado: ${reportData.filters_applied.grade}`}
                      {reportData.filters_applied.role && ` | Rol: ${reportData.filters_applied.role}`}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Seleccione filtros y presione "Generar Reporte"</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Por Grado */}
          <TabsContent value="by-grade">
            {gradeReport ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Asistencia por Grado - {gradeReport.date}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(gradeReport.grades).map(([grade, data]) => (
                        <div key={grade} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg">{grade}</h3>
                            <span className="text-sm text-gray-500">
                              {data.present + data.late}/{data.total} presentes
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center text-sm">
                            <div className="bg-blue-100 p-2 rounded">
                              <p className="font-bold text-blue-700">{data.total}</p>
                              <p className="text-blue-600">Total</p>
                            </div>
                            <div className="bg-green-100 p-2 rounded">
                              <p className="font-bold text-green-700">{data.present}</p>
                              <p className="text-green-600">Presentes</p>
                            </div>
                            <div className="bg-yellow-100 p-2 rounded">
                              <p className="font-bold text-yellow-700">{data.late}</p>
                              <p className="text-yellow-600">Tardanzas</p>
                            </div>
                            <div className="bg-red-100 p-2 rounded">
                              <p className="font-bold text-red-700">{data.absent}</p>
                              <p className="text-red-600">Ausentes</p>
                            </div>
                          </div>
                          {/* Lista de estudiantes */}
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                              Ver estudiantes ({data.students.length})
                            </summary>
                            <div className="mt-2 max-h-40 overflow-y-auto">
                              {data.students.map(s => (
                                <div key={s.id} className="flex justify-between py-1 text-sm border-b">
                                  <span>{s.name}</span>
                                  <span className={
                                    s.status === 'present' ? 'text-green-600' :
                                    s.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                                  }>
                                    {s.status === 'present' ? '✓ Presente' :
                                     s.status === 'late' ? '⏰ Tarde' : '✗ Ausente'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Cargando reporte por grado...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Detalle */}
          <TabsContent value="detail">
            {reportData && reportData.records.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Registros ({reportData.records.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Fecha</th>
                          <th className="p-2 text-left">Nombre</th>
                          <th className="p-2 text-left">Rol</th>
                          <th className="p-2 text-left">Entrada</th>
                          <th className="p-2 text-left">Salida</th>
                          <th className="p-2 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.records.slice(0, 100).map((r, i) => (
                          <tr key={r.id || i} className="border-b hover:bg-gray-50">
                            <td className="p-2">{r.date}</td>
                            <td className="p-2 font-medium">{r.user_name}</td>
                            <td className="p-2 capitalize">{r.user_role}</td>
                            <td className="p-2">{r.check_in_time?.slice(11, 19) || '-'}</td>
                            <td className="p-2">{r.check_out_time?.slice(11, 19) || '-'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                r.status === 'present' ? 'bg-green-100 text-green-700' :
                                r.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {r.status === 'present' ? 'Presente' :
                                 r.status === 'late' ? 'Tarde' : 'Ausente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No hay registros para mostrar</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
