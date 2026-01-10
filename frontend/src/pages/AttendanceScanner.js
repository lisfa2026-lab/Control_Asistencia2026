import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode } from "lucide-react";
import USBQRScanner from "@/components/USBQRScanner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AttendanceScanner = ({ user, onLogout }) => {
  const navigate = useNavigate();

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
                <QrCode className="w-6 h-6" style={{ color: '#1e3a5f' }} />
                <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f', fontFamily: 'Manrope, sans-serif' }}>
                  Registro de Asistencia
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <USBQRScanner user={user} />
      </div>
    </div>
  );
};

export default AttendanceScanner;