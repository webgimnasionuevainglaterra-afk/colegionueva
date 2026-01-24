'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { EditModeProvider } from '@/contexts/EditModeContext';
import ConditionalLayout from '@/components/ConditionalLayout';
import EditModeToggle from '@/components/EditModeToggle';
import LockModal from '@/components/LockModal';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <EditModeProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <EditModeToggle />
          <LockModal />
        </EditModeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}







