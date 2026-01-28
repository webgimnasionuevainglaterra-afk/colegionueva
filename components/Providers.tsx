'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { EditModeProvider } from '@/contexts/EditModeContext';
import ConditionalLayout from '@/components/ConditionalLayout';
import EditModeToggle from '@/components/EditModeToggle';
import LockModal from '@/components/LockModal';
import EditModeBanner from '@/components/EditModeBanner';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <EditModeProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <EditModeBanner />
          <EditModeToggle />
          <LockModal />
        </EditModeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}







