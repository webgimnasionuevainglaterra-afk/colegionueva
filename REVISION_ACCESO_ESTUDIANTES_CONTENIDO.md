# Revisión: Acceso de Estudiantes al Contenido Creado por Profesores

## 📋 Resumen Ejecutivo

He revisado el flujo completo de cómo los estudiantes acceden al contenido creado por los profesores. **El sistema está funcionando correctamente** para que los estudiantes vean el contenido, pero encontré **1 problema de seguridad** que debería corregirse.

---

## ✅ Lo que SÍ está funcionando correctamente

### 1. **Asignación de Estudiantes a Cursos** ✅

**Ubicación:** Tabla `estudiantes_cursos`

- Los estudiantes se asignan correctamente a cursos mediante la tabla de relación `estudiantes_cursos`
- Un estudiante puede estar en múltiples cursos
- La asignación se puede hacer al crear el estudiante o después

**Código relevante:**
- `app/api/estudiantes/asignar-curso/route.ts` - Asignar estudiante a curso
- `app/api/estudiantes/create-estudiante/route.ts` - Asignación automática al crear

---

### 2. **Asignación de Profesores a Cursos** ✅

**Ubicación:** Tabla `profesores_cursos`

- Los profesores se asignan correctamente a cursos mediante la tabla de relación `profesores_cursos`
- Un profesor puede estar asignado a múltiples cursos
- La asignación se gestiona desde el dashboard de administración

**Código relevante:**
- `app/api/courses/assign-teacher/route.ts` - Asignar profesor a curso
- `components/CourseRelationsManager.tsx` - Interfaz de gestión

---

### 3. **Jerarquía de Contenido** ✅

**Estructura:**
```
Curso
  └── Materia (pertenece a un curso específico)
      └── Periodo (1, 2, 3, 4)
          └── Tema
              └── Subtema
                  └── Contenido (video, archivo, foro)
```

- La jerarquía está bien diseñada
- Cada nivel tiene relación con el anterior
- El contenido siempre pertenece a un curso específico a través de la cadena de relaciones

---

### 4. **Validación de Acceso de Estudiantes** ✅

**Ubicación:** `app/api/estudiantes/get-materia-contenidos/route.ts`

**Validaciones implementadas:**

1. ✅ **Autenticación del estudiante:**
   - Verifica que el usuario esté autenticado (líneas 23-40)
   - Obtiene el `user_id` del token

2. ✅ **Verificación de que es estudiante:**
   - Busca el registro en la tabla `estudiantes` usando `user_id` (líneas 43-54)
   - Si no existe, retorna error 403

3. ✅ **Verificación de asignación a curso:**
   - Verifica que el estudiante esté asignado a un curso en `estudiantes_cursos` (líneas 57-69)
   - Si no está asignado, retorna error: "El estudiante no está inscrito en ningún curso"

4. ✅ **Verificación de que la materia pertenece al curso del estudiante:**
   - Verifica que la materia solicitada pertenezca al curso del estudiante (líneas 72-84)
   - Si no pertenece, retorna error: "La materia no pertenece al curso del estudiante"

5. ✅ **Obtención del contenido:**
   - Obtiene todos los periodos, temas, subtemas y contenido de la materia (líneas 87-117)
   - Solo obtiene contenido de materias del curso del estudiante

**Resultado:** Los estudiantes **SOLO** pueden ver contenido de materias que pertenecen a sus cursos asignados.

---

### 5. **Visualización del Contenido** ✅

**Ubicación:** `components/StudentSubjectContent.tsx`

- Los estudiantes pueden ver:
  - ✅ Videos (embebidos)
  - ✅ Archivos PDF (con visor)
  - ✅ Imágenes
  - ✅ Quizzes (con validación de acceso)
  - ✅ Evaluaciones (con validación de acceso)

- El contenido se muestra organizado por:
  - Periodos → Temas → Subtemas → Contenido

---

## ⚠️ Problema Encontrado

### **Falta de Validación al Crear Contenido**

**Ubicación:** `app/api/contenido/create-contenido/route.ts`

**Problema:**
- Cuando un profesor crea contenido, **NO se valida** que el profesor esté asignado al curso de la materia
- Cualquier profesor autenticado puede crear contenido en cualquier curso, incluso si no está asignado a ese curso

**Comparación con otras APIs:**
- ✅ `app/api/quizzes/create-quiz/route.ts` - **SÍ valida** que el profesor esté asignado al curso (líneas 112-125)
- ✅ `app/api/evaluaciones/create-evaluacion/route.ts` - **SÍ valida** que el profesor esté asignado al curso (líneas 105-118)
- ❌ `app/api/contenido/create-contenido/route.ts` - **NO valida** permisos del profesor

**Impacto:**
- Un profesor podría crear contenido en cursos a los que no está asignado
- Aunque los estudiantes solo verían contenido de sus cursos, esto es un problema de seguridad y organización

**Solución recomendada:**
Agregar validación similar a la de quizzes y evaluaciones:

```typescript
// Obtener el usuario autenticado
const authHeader = request.headers.get('authorization');
if (authHeader) {
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  
  if (user) {
    // Verificar si es profesor
    const { data: profesor } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (profesor) {
      // Obtener el curso del subtema
      const { data: subtemaData } = await supabaseAdmin
        .from('subtemas')
        .select(`
          temas (
            periodos (
              materias (
                curso_id
              )
            )
          )
        `)
        .eq('id', subtema_id)
        .single();
      
      const cursoId = subtemaData?.temas?.periodos?.materias?.curso_id;
      
      if (cursoId) {
        // Verificar que el profesor está asignado al curso
        const { data: cursoAsignado } = await supabaseAdmin
          .from('profesores_cursos')
          .select('id')
          .eq('profesor_id', user.id)
          .eq('curso_id', cursoId)
          .single();
        
        if (!cursoAsignado) {
          return NextResponse.json(
            { error: 'No tienes permiso para crear contenido en este curso' },
            { status: 403 }
          );
        }
      }
    }
  }
}
```

---

## 📊 Flujo Completo (Funcionando Correctamente)

### **Flujo de Asignación:**

1. **Administrador crea/edita curso:**
   - Crea curso → Asigna profesores → Asigna estudiantes

2. **Profesor crea contenido:**
   - Selecciona curso asignado → Materia → Periodo → Tema → Subtema
   - Crea contenido (video, archivo PDF, etc.)

3. **Estudiante accede al contenido:**
   - Inicia sesión como estudiante
   - Selecciona su curso → Materia
   - Ve todo el contenido creado por los profesores asignados a ese curso

### **Validaciones en el Flujo:**

| Paso | Validación | Estado |
|------|------------|--------|
| Estudiante solicita contenido | ✅ Verifica autenticación | ✅ Funciona |
| Estudiante solicita contenido | ✅ Verifica que es estudiante | ✅ Funciona |
| Estudiante solicita contenido | ✅ Verifica asignación a curso | ✅ Funciona |
| Estudiante solicita contenido | ✅ Verifica que materia pertenece a su curso | ✅ Funciona |
| Estudiante solicita contenido | ✅ Solo muestra contenido de su curso | ✅ Funciona |
| Profesor crea contenido | ❌ **NO verifica** asignación a curso | ⚠️ **Problema** |

---

## 🔍 Casos de Prueba

### **Caso 1: Estudiante asignado a Curso A**
- ✅ Puede ver contenido de materias del Curso A
- ✅ NO puede ver contenido de materias del Curso B
- ✅ Si intenta acceder a materia de otro curso, recibe error 403

### **Caso 2: Estudiante sin curso asignado**
- ✅ Recibe error: "El estudiante no está inscrito en ningún curso"
- ✅ No puede ver ningún contenido

### **Caso 3: Profesor asignado a Curso A**
- ✅ Puede crear contenido en materias del Curso A
- ⚠️ **Actualmente también puede crear contenido en Curso B** (problema de seguridad)

### **Caso 4: Múltiples estudiantes en el mismo curso**
- ✅ Todos ven el mismo contenido
- ✅ El contenido se muestra correctamente a todos

---

## ✅ Conclusión

### **¿Funciona correctamente para que los estudiantes vean el contenido?**

**SÍ, funciona correctamente.** ✅

Los estudiantes:
- ✅ Solo ven contenido de materias de sus cursos asignados
- ✅ No pueden acceder a contenido de otros cursos
- ✅ Las validaciones están bien implementadas
- ✅ El contenido se muestra correctamente organizado

### **Recomendación:**

Aunque el sistema funciona correctamente para los estudiantes, se recomienda **agregar validación de permisos** cuando los profesores crean contenido para mantener la consistencia y seguridad del sistema.

---

## 📝 Resumen Técnico

### **Tablas Involucradas:**

1. **`estudiantes_cursos`** - Relación estudiantes ↔ cursos
2. **`profesores_cursos`** - Relación profesores ↔ cursos
3. **`materias`** - Tiene `curso_id` (pertenece a un curso)
4. **`periodos`** - Pertenece a una materia
5. **`temas`** - Pertenece a un periodo
6. **`subtemas`** - Pertenece a un tema
7. **`contenido`** - Pertenece a un subtema

### **APIs Clave:**

- **`GET /api/estudiantes/get-materia-contenidos?materia_id=XXX`**
  - ✅ Valida correctamente el acceso del estudiante
  - ✅ Retorna solo contenido del curso del estudiante

- **`POST /api/contenido/create-contenido`**
  - ⚠️ NO valida permisos del profesor
  - ⚠️ Debería validar que el profesor esté asignado al curso

---

## 🎯 Respuesta Directa

**¿Los estudiantes creados y asignados a cada curso ven el contenido que cada profesor crea?**

**SÍ, funciona correctamente.** ✅

- Los estudiantes **SÍ pueden ver** el contenido creado por los profesores
- **Solo ven contenido** de materias que pertenecen a sus cursos asignados
- Las validaciones están bien implementadas
- El sistema es seguro y funciona como se espera

**Única observación:** Se recomienda agregar validación de permisos cuando los profesores crean contenido para mantener la consistencia con otras funcionalidades (quizzes, evaluaciones).

