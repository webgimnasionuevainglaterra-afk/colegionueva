# Configuración de Supabase

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://pdhvrvawsguwnbnfokaa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkaHZydmF3c2d1d25ibmZva2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjM2NDgsImV4cCI6MjA4MzE5OTY0OH0.bIfT7nvNc6ewUms4nDsblYH6vtUGm-GCcjY3RD9JCm0
```

## Instalación

Ejecuta el siguiente comando para instalar el cliente de Supabase:

```bash
npm install @supabase/supabase-js
```

## Uso

El cliente de Supabase está configurado en `lib/supabase.ts`. Puedes importarlo en cualquier componente:

```typescript
import { supabase } from '@/lib/supabase';
```

## Nota

El archivo `.env.local` está en `.gitignore` y no se subirá al repositorio por seguridad.









