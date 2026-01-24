'use client';

import { useEditMode } from '@/contexts/EditModeContext';

export default function EditModeToggle() {
  const { isEditMode, setIsEditMode, setShowLockModal } = useEditMode();

  const handleToggle = () => {
    if (isEditMode) {
      // Desactivar modo edición
      setIsEditMode(false);
    } else {
      // Mostrar modal de contraseña
      setShowLockModal(true);
    }
  };

  return (
    <button
      className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`}
      onClick={handleToggle}
      title={isEditMode ? 'Desactivar modo edición' : 'Activar modo edición'}
    >
      {isEditMode ? (
        <>
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>Salir de Edición</span>
        </>
      ) : (
        <>
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Editar Página</span>
        </>
      )}
    </button>
  );
}

