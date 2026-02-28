'use client';

import { useEditMode } from '@/contexts/EditModeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function EditModeBanner() {
  const { isEditMode, setIsEditMode } = useEditMode();
  const { signOut } = useAuth();

  if (!isEditMode) {
    return null;
  }

  const handleCloseSession = async () => {
    try {
      // Desactivar modo edición en el navegador actual
      setIsEditMode(false);
      // Cerrar sesión del usuario
      await signOut();
      // Redirigir a la pantalla de inicio de sesión
      if (typeof window !== 'undefined') {
        window.location.href = '/aula-virtual';
      }
    } catch (error) {
      console.error('Error al cerrar sesión desde el banner de edición:', error);
    }
  };

  return (
    <div className="edit-mode-banner">
      <div className="edit-mode-banner-content">
        <span className="edit-mode-banner-text">
          Estás en <strong>modo edición</strong>. Una vez actualices los contenidos, por favor{' '}
          <strong>cierra la sesión</strong> para no dejar el sitio editable.
        </span>
        <button
          type="button"
          className="edit-mode-banner-button"
          onClick={handleCloseSession}
        >
          Cerrar sesión y salir de edición
        </button>
      </div>
    </div>
  );
}










