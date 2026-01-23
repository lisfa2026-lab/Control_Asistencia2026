import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Download, FileText, Package } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Downloads() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/api/users?role=student`);
      const data = await res.json();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const downloadZip = () => {
    setLoading(true);
    const link = document.createElement("a");
    link.href = `${API}/api/download/proyecto`;
    link.download = "proyecto_LISFA.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Descarga iniciada - revisa tu carpeta de descargas");
    setLoading(false);
  };

  const downloadCarnet = (studentId, studentName) => {
    const link = document.createElement("a");
    link.href = `${API}/api/cards/generate/${studentId}`;
    link.download = `carnet_${studentName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Descargando carnet de ${studentName}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Centro de Descargas</h1>
          <p className="text-gray-600">LISFA - Sistema de Control de Asistencia</p>
        </div>

        {/* Descargar Proyecto ZIP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Proyecto Completo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Descarga el código fuente completo del proyecto (Frontend, Backend y documentación)
            </p>
            <Button 
              onClick={downloadZip} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="download-zip-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar proyecto_LISFA.zip (3.3 MB)
            </Button>
          </CardContent>
        </Card>

        {/* Descargar Carnets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Carnets de Estudiantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Descarga los carnets de identificación en formato PDF
            </p>
            <div className="space-y-2">
              {students.length === 0 ? (
                <p className="text-gray-500">No hay estudiantes registrados</p>
              ) : (
                students.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-gray-500">{student.category || student.grade || "Sin categoría"}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadCarnet(student.id, student.full_name)}
                      data-testid={`download-carnet-${student.id}`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Carnet PDF
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enlaces directos */}
        <Card>
          <CardHeader>
            <CardTitle>Enlaces Directos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">Si los botones no funcionan, usa estos enlaces:</p>
            <div className="space-y-1">
              <a 
                href={`${API}/api/download/proyecto`}
                className="block text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                → Descargar ZIP del proyecto
              </a>
              {students.map((student) => (
                <a 
                  key={student.id}
                  href={`${API}/api/cards/generate/${student.id}`}
                  className="block text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  → Carnet de {student.full_name}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
