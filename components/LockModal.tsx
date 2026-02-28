'use client';

import { useState } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';

export default function LockModal() {
  const { showLockModal, setShowLockModal, setIsEditMode } = useEditMode();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/verify-super-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsEditMode(true);
        setShowLockModal(false);
        setPassword('');
      } else {
        setError(data.error || 'Contraseña incorrecta');
      }
    } catch (err) {
      setError('Error al verificar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!showLockModal) return null;

  return (
    <div className="lock-modal-overlay" onClick={() => setShowLockModal(false)}>
      <div className="lock-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="lock-modal-header">
          <svg
            className="lock-icon"
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
          <h2>Modo de Edición</h2>
          <p>Ingrese la contraseña del super administrador para activar el modo de edición</p>
        </div>

        <form onSubmit={handleSubmit} className="lock-modal-form">
          <div className="lock-modal-input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese la contraseña"
              autoFocus
              required
            />
          </div>

          {error && <div className="lock-modal-error">{error}</div>}

          <div className="lock-modal-actions">
            <button
              type="button"
              onClick={() => {
                setShowLockModal(false);
                setPassword('');
                setError('');
              }}
              className="lock-modal-cancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="lock-modal-submit"
            >
              {loading ? 'Verificando...' : 'Activar Edición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










