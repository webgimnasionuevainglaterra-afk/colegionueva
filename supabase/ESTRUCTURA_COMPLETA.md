# Estructura Completa del Sistema Educativo

## Jerarquía de Datos

```
Curso
  └── Materia (con horas_totales de estudio)
      └── Periodo (1, 2, 3, 4)
          └── Tema
              └── Subtema
                  └── Contenido (video, archivo, foro)
```

## Descripción de Tablas

### 1. cursos
- `id` (UUID, PK)
- `nombre` (VARCHAR)
- `nivel` (Primaria, Bachillerato, Técnico, Profesional)
- `created_at`, `updated_at`

### 2. materias
- `id` (UUID, PK)
- `curso_id` (UUID, FK → cursos)
- `nombre` (VARCHAR)
- `descripcion` (TEXT)
- `horas_totales` (INTEGER) - Horas totales de estudio
- `created_at`, `updated_at`
- **Constraint único**: (curso_id, nombre)

### 3. periodos
- `id` (UUID, PK)
- `materia_id` (UUID, FK → materias)
- `numero_periodo` (INTEGER: 1, 2, 3, 4)
- `nombre` (VARCHAR) - Ej: "Primer Periodo", "Segundo Periodo"
- `fecha_inicio` (DATE)
- `fecha_fin` (DATE)
- `created_at`, `updated_at`
- **Constraint único**: (materia_id, numero_periodo)

### 4. temas
- `id` (UUID, PK)
- `periodo_id` (UUID, FK → periodos)
- `nombre` (VARCHAR)
- `descripcion` (TEXT)
- `orden` (INTEGER) - Para ordenar los temas
- `created_at`, `updated_at`

### 5. subtemas
- `id` (UUID, PK)
- `tema_id` (UUID, FK → temas)
- `nombre` (VARCHAR)
- `descripcion` (TEXT)
- `orden` (INTEGER) - Para ordenar los subtemas
- `created_at`, `updated_at`

### 6. contenido
- `id` (UUID, PK)
- `subtema_id` (UUID, FK → subtemas)
- `tipo` (VARCHAR: 'video', 'archivo', 'foro')
- `titulo` (VARCHAR)
- `descripcion` (TEXT)
- `url` (TEXT) - Para videos o enlaces
- `archivo_url` (TEXT) - Para archivos subidos
- `orden` (INTEGER) - Para ordenar el contenido
- `created_at`, `updated_at`

## Relaciones

- **CASCADE DELETE**: Al eliminar un elemento padre, se eliminan automáticamente todos sus hijos
  - Eliminar curso → elimina todas sus materias
  - Eliminar materia → elimina todos sus periodos
  - Eliminar periodo → elimina todos sus temas
  - Eliminar tema → elimina todos sus subtemas
  - Eliminar subtema → elimina todo su contenido

## Orden de Ejecución de Scripts SQL

1. `create_cursos_table.sql` - Crear tabla de cursos
2. `create_materias_table.sql` - Crear tabla de materias
3. `update_materias_structure.sql` - Actualizar estructura de materias (eliminar codigo y horas_semanales, agregar horas_totales)
4. `create_periodos_table.sql` - Crear tabla de periodos
5. `create_temas_table.sql` - Crear tabla de temas
6. `create_subtemas_table.sql` - Crear tabla de subtemas
7. `create_contenido_table.sql` - Crear tabla de contenido

## Notas Importantes

- Todas las tablas tienen RLS (Row Level Security) habilitado
- Solo los super administradores pueden crear, actualizar y eliminar
- Todos los usuarios autenticados pueden leer
- Todas las tablas tienen `created_at` y `updated_at` con triggers automáticos






