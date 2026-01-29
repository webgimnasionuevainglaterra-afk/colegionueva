# 🚨 INSTRUCCIONES URGENTES - SOLUCIÓN DEFINITIVA

## ⚠️ PROBLEMA IDENTIFICADO:

El servidor NO puede iniciarse desde Cursor debido a restricciones de permisos del sandbox. El error `ERR_CONNECTION_REFUSED` ocurre porque el servidor se cae inmediatamente después de intentar iniciar.

## ✅ SOLUCIÓN:

**DEBES ejecutar el servidor desde tu terminal local (fuera de Cursor)**

## 📋 PASOS EXACTOS:

### 1. Abre Terminal en tu Mac:
- Presiona `Cmd + Espacio`
- Escribe "Terminal"
- Presiona Enter

### 2. Ejecuta estos comandos UNO POR UNO:

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ColegioNueva
```

```bash
./iniciar-servidor.sh
```

### O alternativamente:

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ColegioNueva
HOSTNAME=localhost npm run dev
```

### 3. Espera a ver este mensaje:

```
✓ Ready in Xs
- Local:        http://localhost:3000
```

### 4. Abre tu navegador:

```
http://localhost:3000
```

## 🔍 VERIFICACIÓN:

Si el servidor está funcionando, deberías ver:
- **http://localhost:3000** → Página simple con texto
- **http://localhost:3000/test** → "Next.js está funcionando"

## ⚠️ SI SIGUE SIN FUNCIONAR:

Comparte el mensaje completo que aparece en la terminal donde ejecutaste `npm run dev`











