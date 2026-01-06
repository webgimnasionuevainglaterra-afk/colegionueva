'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ConditionalLayout from '@/components/ConditionalLayout';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </AuthProvider>
    </LanguageProvider>
  );
}

