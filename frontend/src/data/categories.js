// Categorías disponibles para estudiantes y personal

export const CATEGORIAS_ESTUDIANTES = [
  "Párvulos",
  "Kinder",
  "Preparatoria",
  "1ro. Primaria",
  "2do. Primaria",
  "3ro. Primaria",
  "4to. Primaria",
  "5to. Primaria",
  "6to. Primaria",
  "1ro. Básico A",
  "1ro. Básico B",
  "2do. Básico A",
  "2do. Básico B",
  "3ro. Básico A",
  "3ro. Básico B",
  "4to. Bachillerato en Computación",
  "4to. Bachillerato en Diseño",
  "5to. Bachillerato en Computación",
  "5to. Bachillerato en Diseño"
];

export const CATEGORIAS_PERSONAL = [
  "Personal Administrativo",
  "Secretaria",
  "Personal de Biblioteca",
  "Personal de Servicio",
  "Personal de Librería",
  "Coordinación",
  "Docente"
];

export const getCategoriasByRole = (role) => {
  if (role === 'student') {
    return CATEGORIAS_ESTUDIANTES;
  } else if (['teacher', 'admin', 'staff'].includes(role)) {
    return CATEGORIAS_PERSONAL;
  }
  return [];
};