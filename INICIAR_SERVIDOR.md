# 🚀 INSTRUCCIONES PARA INICIAR EL SERVIDOR

## ⚠️ IMPORTANTE

El servidor está configurado pero necesita ejecutarse desde tu terminal local para evitar restricciones del entorno de Cursor.

## 📋 PASOS:

### 1. Abre una terminal en tu Mac
- Presiona `Cmd + Espacio`
- Busca "Terminal"
- Ábrela

### 2. Navega al proyecto
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ColegioNueva
```

### 3. Inicia el servidor
```bash
npm run dev
```

### 4. Espera los mensajes:
Deberías ver algo como:
```
▲ Next.js 16.1.1
- Local:        http://localhost:3003

✓ Ready in Xs
```

### 5. Abre el navegador
Ve a: **http://localhost:3003**

## 🔧 Si no funciona:

### Verifica que el puerto esté libre:
```bash
lsof -ti:3003 | xargs kill -9
```

### Reinstala dependencias si es necesario:
```bash
npm install
```

### Verifica errores en la terminal
Los errores aparecerán en rojo en la terminal donde ejecutaste `npm run dev`

## ✅ El servidor está corriendo si:
- Ves "Ready" en la terminal
- Puedes acceder a http://localhost:3003 en el navegador
- No hay errores en rojo en la terminal

