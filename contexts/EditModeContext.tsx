'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface EditModeContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  showLockModal: boolean;
  setShowLockModal: (value: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);

  // Verificar si hay sesión de edición guardada
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEditMode = localStorage.getItem('editMode');
      if (savedEditMode === 'true') {
        setIsEditMode(true);
      }
    }
  }, []);

  // Guardar estado de edición en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isEditMode) {
        localStorage.setItem('editMode', 'true');
      } else {
        localStorage.removeItem('editMode');
      }
    }
  }, [isEditMode]);

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        setIsEditMode,
        showLockModal,
        setShowLockModal,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}

