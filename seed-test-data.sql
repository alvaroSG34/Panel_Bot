-- Script para insertar datos de prueba en la base de datos
-- Ejecutar: psql "postgresql://..." -f seed-test-data.sql

-- Semestres
INSERT INTO semestres (codigo, nombre, fecha_inicio, fecha_fin, activo) VALUES
('1-2024', 'Primer Semestre 2024', '2024-02-01', '2024-07-31', true),
('2-2024', 'Segundo Semestre 2024', '2024-08-01', '2024-12-31', false)
ON CONFLICT (codigo) DO NOTHING;

-- Materias
INSERT INTO materias (codigo_materia, nombre, nivel) VALUES
('INF120', 'INTRODUCCION A LA INFORMATICA', 'Básico'),
('INF121', 'PROGRAMACION I', 'Básico'),
('INF412', 'SISTEMAS DE INFORMACION II', 'Profesional'),
('MAT101', 'CALCULO I', 'Básico'),
('FIS101', 'FISICA I', 'Básico')
ON CONFLICT (codigo_materia) DO NOTHING;

-- Grupos
INSERT INTO grupos (codigo_grupo) VALUES
('SA'), ('SB'), ('SC'),
('5A'), ('5B'),
('7A'), ('7B')
ON CONFLICT (codigo_grupo) DO NOTHING;

-- Ofertas grupo_materia (necesitarás ajustar los JIDs reales de WhatsApp)
-- Estos JIDs son ejemplos, reemplazar con los reales obtenidos de npm run discover-groups
INSERT INTO grupo_materia (id_semestre, id_materia, id_grupo, jid_grupo_whatsapp, modalidad, horario)
SELECT 
    (SELECT id FROM semestres WHERE codigo = '1-2024'),
    (SELECT id FROM materias WHERE codigo_materia = 'INF120'),
    (SELECT id FROM grupos WHERE codigo_grupo = 'SA'),
    '120363422425868357@g.us',
    'Virtual',
    'Lun-Mie 08:00-10:00'
WHERE NOT EXISTS (
    SELECT 1 FROM grupo_materia 
    WHERE id_semestre = (SELECT id FROM semestres WHERE codigo = '1-2024')
    AND id_materia = (SELECT id FROM materias WHERE codigo_materia = 'INF120')
    AND id_grupo = (SELECT id FROM grupos WHERE codigo_grupo = 'SA')
);

INSERT INTO grupo_materia (id_semestre, id_materia, id_grupo, jid_grupo_whatsapp, modalidad, horario)
SELECT 
    (SELECT id FROM semestres WHERE codigo = '1-2024'),
    (SELECT id FROM materias WHERE codigo_materia = 'INF121'),
    (SELECT id FROM grupos WHERE codigo_grupo = '5A'),
    '120363333333333333@g.us',
    'Presencial',
    'Mar-Jue 14:00-16:00'
WHERE NOT EXISTS (
    SELECT 1 FROM grupo_materia 
    WHERE id_semestre = (SELECT id FROM semestres WHERE codigo = '1-2024')
    AND id_materia = (SELECT id FROM materias WHERE codigo_materia = 'INF121')
    AND id_grupo = (SELECT id FROM grupos WHERE codigo_grupo = '5A')
);

-- Estudiante de prueba
INSERT INTO estudiantes (numero_registro, nombre_estudiante, id_whatsapp, total_materias_registradas)
VALUES ('20240001', 'Juan Pérez Test', '59170000001@c.us', 2)
ON CONFLICT (numero_registro) DO NOTHING;

-- Verificar inserciones
SELECT 'Semestres:' as tabla, COUNT(*) as total FROM semestres
UNION ALL
SELECT 'Materias:', COUNT(*) FROM materias
UNION ALL
SELECT 'Grupos:', COUNT(*) FROM grupos
UNION ALL
SELECT 'Ofertas:', COUNT(*) FROM grupo_materia
UNION ALL
SELECT 'Estudiantes:', COUNT(*) FROM estudiantes;
