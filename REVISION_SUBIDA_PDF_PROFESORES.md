# Revisión: Subida de Archivos PDF por Profesores

## 📋 Resumen Ejecutivo

He revisado la funcionalidad de subida de archivos PDF por parte de los profesores. Se encontraron **5 problemas críticos** que pueden estar causando que los profesores no puedan subir archivos.

---

## 🔍 Problemas Encontrados

### 1. ❌ **NO hay validación de tamaño de archivo**

**Ubicación:** `app/api/contenido/upload-files/route.ts`

**Problema:**
- No se valida el tamaño máximo de los archivos antes de subirlos
- Los PDFs grandes pueden causar timeouts o errores de memoria
- No hay límite configurado en Next.js para el tamaño del body

**Impacto:** Archivos grandes (>10MB) pueden fallar sin un mensaje claro

**Solución necesaria:**
- ✅ Agregar validación de tamaño máximo (100MB por archivo - coincide con el límite del bucket)
- Configurar límite en Next.js config
- Mostrar mensaje claro si el archivo es demasiado grande

---

### 2. ⚠️ **Validación silenciosa de archivos inválidos**

**Ubicación:** `app/api/contenido/upload-files/route.ts` (líneas 52-54)

**Problema:**
```typescript
if (!isValidType) {
  continue; // Saltar archivos no válidos
}
```
- Si un archivo no es válido, se salta **sin informar al usuario**
- El usuario puede pensar que la subida falló sin razón
- Si TODOS los archivos son inválidos, se devuelve un error genérico poco claro

**Impacto:** Los profesores no saben por qué sus archivos no se suben

**Solución necesaria:**
- Acumular archivos inválidos y reportarlos al final
- Mostrar mensajes específicos sobre qué archivos fallaron y por qué

---

### 3. 🔒 **Problemas potenciales con políticas RLS**

**Ubicación:** `supabase/create_contenido_bucket.sql`

**Problema:**
- Las políticas RLS requieren que el usuario esté autenticado (`auth.role() = 'authenticated'`)
- Si el usuario no tiene sesión activa o hay problemas de autenticación, la subida fallará
- El código usa `supabaseAdmin` (SERVICE_ROLE_KEY) que debería bypassear RLS, pero puede haber conflictos

**Impacto:** Subidas bloqueadas por permisos sin mensaje claro

**Solución necesaria:**
- Verificar que las políticas permitan subida con SERVICE_ROLE_KEY
- Mejorar mensajes de error para problemas de permisos

---

### 4. 📏 **No hay límite de tamaño en Next.js config**

**Ubicación:** `next.config.js`

**Problema:**
- No hay configuración de `bodyParser` o límite de tamaño del request body
- Next.js tiene un límite por defecto (probablemente 4.5MB) que puede bloquear archivos grandes
- No hay configuración de `maxDuration` para operaciones largas

**Impacto:** Archivos medianos/grandes pueden ser rechazados por Next.js antes de llegar a la API

**Solución necesaria:**
- Configurar límite de tamaño en `next.config.js`
- Agregar `maxDuration` para permitir subidas largas

---

### 5. 💬 **Mensajes de error poco claros**

**Ubicación:** `app/api/contenido/upload-files/route.ts` y `components/PeriodContentManager.tsx`

**Problema:**
- Los mensajes de error son genéricos
- No se especifica qué archivo falló o por qué
- Los profesores no saben si el problema es tamaño, formato, permisos, etc.

**Impacto:** Dificulta la resolución de problemas

**Solución necesaria:**
- Mensajes de error más específicos y descriptivos
- Incluir información sobre el archivo que falló

---

## ✅ Validaciones Actuales (Funcionando)

### Tipos de archivo permitidos:
- ✅ PDF: `application/pdf` o extensión `.pdf`
- ✅ Imágenes: `image/jpeg`, `image/jpg`, `image/png` o extensiones `.jpg`, `.jpeg`, `.png`

### Validación en el cliente:
- ✅ El input HTML tiene `accept=".pdf,.jpg,.jpeg,.png"` que filtra en el selector de archivos

### Validación en el servidor:
- ✅ Se valida tanto el MIME type como la extensión del archivo
- ✅ Se determina el content-type correcto si no viene en el archivo

---

## 🛠️ Soluciones Propuestas

### Solución 1: Agregar validación de tamaño de archivo

**Archivo:** `app/api/contenido/upload-files/route.ts`

```typescript
// ✅ IMPLEMENTADO - Tamaño máximo: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB en bytes

// Validar tamaño de archivo
if (file.size > MAX_FILE_SIZE) {
  const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024;
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
  invalidFiles.push({
    name: file.name,
    reason: `El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es ${maxSizeMB}MB.`
  });
  continue;
}
```

### Solución 2: Mejorar manejo de archivos inválidos

**Archivo:** `app/api/contenido/upload-files/route.ts`

```typescript
// Agregar al inicio del loop
const invalidFiles: Array<{ name: string; reason: string }> = [];

// Cambiar la validación silenciosa (línea 52-54)
if (!isValidType) {
  invalidFiles.push({
    name: file.name,
    reason: `Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG.`
  });
  continue;
}

// Al final, antes de devolver respuesta, reportar archivos inválidos
if (invalidFiles.length > 0 && uploadedFiles.length === 0) {
  return NextResponse.json(
    { 
      error: 'No se pudieron subir los archivos',
      invalidFiles: invalidFiles,
      message: `${invalidFiles.length} archivo(s) no válido(s). Ver detalles en invalidFiles.`
    },
    { status: 400 }
  );
}
```

### Solución 3: Configurar límites en Next.js

**Archivo:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... configuración existente ...
  
  // Configurar límite de tamaño del body (25MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  
  // Configurar límite para API routes
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
    responseLimit: '25mb',
  },
};
```

**Nota:** En Next.js 13+, las API routes no usan `bodyParser` directamente. Necesitamos usar `export const config` en la ruta.

### Solución 4: Agregar maxDuration a la ruta

**Archivo:** `app/api/contenido/upload-files/route.ts`

```typescript
// Agregar al inicio del archivo, después de los imports
export const maxDuration = 300; // 5 minutos para subidas grandes
export const runtime = 'nodejs';
```

### Solución 5: Mejorar mensajes de error en el cliente

**Archivo:** `components/PeriodContentManager.tsx`

```typescript
// Mejorar el manejo de errores (alrededor de línea 2084)
if (!uploadResponse.ok) {
  let errorMessage = `Error al subir archivos`;
  try {
    const errorData = await uploadResponse.json();
    if (errorData.invalidFiles && errorData.invalidFiles.length > 0) {
      // Mostrar detalles de archivos inválidos
      const invalidList = errorData.invalidFiles
        .map((f: any) => `- ${f.name}: ${f.reason}`)
        .join('\n');
      errorMessage = `No se pudieron subir algunos archivos:\n${invalidList}`;
    } else {
      errorMessage = errorData.error || errorData.message || errorMessage;
    }
  } catch {
    errorMessage = `Error ${uploadResponse.status}: ${uploadResponse.statusText}`;
  }
  alert(errorMessage);
  setUploading(false);
  return;
}
```

---

## 🔍 Verificaciones Necesarias

### 1. Verificar que el bucket existe en Supabase

**Pasos:**
1. Ve a Supabase Dashboard → Storage
2. Verifica que existe el bucket `contenido`
3. Si no existe, ejecuta el script: `supabase/create_contenido_bucket.sql`

### 2. Verificar políticas RLS del bucket

**Pasos:**
1. Ve a Supabase Dashboard → Storage → Policies
2. Verifica que el bucket `contenido` tiene políticas que permiten:
   - INSERT para usuarios autenticados
   - SELECT para público (lectura)
   - UPDATE para usuarios autenticados
   - DELETE para usuarios autenticados

### 3. Verificar tamaño de archivos que intentan subir

**Pregunta a los profesores:**
- ¿Qué tamaño tienen los PDFs que intentan subir?
- ¿Reciben algún mensaje de error específico?
- ¿En qué momento falla? (al seleccionar, al subir, después de subir)

---

## 📊 Estadísticas de Validaciones Actuales

| Validación | Estado | Detalles |
|------------|--------|----------|
| Tipo de archivo (MIME) | ✅ Funciona | Valida `application/pdf`, `image/jpeg`, etc. |
| Extensión de archivo | ✅ Funciona | Valida `.pdf`, `.jpg`, `.jpeg`, `.png` |
| Tamaño de archivo | ❌ **FALTA** | No hay validación |
| Límite Next.js | ❌ **FALTA** | No configurado |
| Mensajes de error | ⚠️ Mejorable | Genéricos, poco informativos |
| Manejo de archivos inválidos | ⚠️ Mejorable | Se saltan silenciosamente |

---

## 🚀 Plan de Acción Recomendado

### Prioridad Alta (Implementar inmediatamente):
1. ✅ Agregar validación de tamaño de archivo (100MB máximo - coincide con el límite del bucket)
2. ✅ Configurar `maxDuration` en la ruta API
3. ✅ Mejorar mensajes de error para archivos inválidos

### Prioridad Media:
4. ✅ Configurar límites en Next.js (si es necesario)
5. ✅ Mejorar feedback en el cliente sobre archivos inválidos

### Prioridad Baja:
6. ✅ Verificar y ajustar políticas RLS si es necesario
7. ✅ Agregar logging más detallado para debugging

---

## 📝 Notas Adicionales

- El código usa `supabaseAdmin` (SERVICE_ROLE_KEY) que debería bypassear RLS, pero es bueno verificar
- Los archivos se suben al bucket `contenido` en Supabase Storage
- El nombre del archivo se genera con timestamp + random para evitar colisiones
- Los archivos se almacenan en la ruta `contenido/{timestamp}_{random}_{nombre_original}`

---

## ❓ Preguntas para los Profesores

Para diagnosticar mejor el problema, pregunta a los profesores que reportan el error:

1. **¿Qué mensaje de error exacto ven?** (si hay alguno)
2. **¿Qué tamaño tienen los PDFs?** (en MB)
3. **¿En qué momento falla?**
   - Al seleccionar el archivo
   - Al hacer clic en "Crear" o "Guardar"
   - Después de esperar un tiempo
4. **¿Funciona con archivos pequeños?** (por ejemplo, < 1MB)
5. **¿Qué navegador están usando?** (Chrome, Firefox, Safari, etc.)
6. **¿Hay algún mensaje en la consola del navegador?** (F12 → Console)

---

## 🔧 Próximos Pasos

1. **Implementar las soluciones propuestas** (especialmente validación de tamaño)
2. **Probar con archivos de diferentes tamaños** (1MB, 5MB, 10MB, 20MB, 30MB, 40MB, 50MB, 80MB, 100MB, 105MB - este último debería ser rechazado)
3. **Verificar que el bucket existe y tiene permisos correctos**
4. **Recopilar información de los profesores** sobre los errores específicos
5. **Monitorear logs** después de implementar las mejoras

