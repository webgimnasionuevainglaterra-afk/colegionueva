# Configuración de Variables de Entorno

## Crear archivo .env.local

Crea manualmente el archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pdhvrvawsguwnbnfokaa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkaHZydmF3c2d1d25ibmZva2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjM2NDgsImV4cCI6MjA4MzE5OTY0OH0.bIfT7nvNc6ewUms4nDsblYH6vtUGm-GCcjY3RD9JCm0
```

## Instalación del paquete

Ejecuta el siguiente comando:

```bash
npm install @supabase/supabase-js
```

## Verificación

Una vez creado el archivo `.env.local` e instalado el paquete, reinicia el servidor de desarrollo:

```bash
npm run dev
```

## Nota

El archivo `.env.local` está en `.gitignore` y no se subirá al repositorio por seguridad.










