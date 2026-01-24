'use client';

import { useState } from 'react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('El correo electrónico es requerido');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/recuperar-contraseña', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar la solicitud');
      }

      setSuccess(true);
      setEmail('');

      // Cerrar el modal después de 3 segundos
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la contraseña temporal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            Recuperar Contraseña
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Ingresa tu correo electrónico y te enviaremos una contraseña temporal
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.75rem',
              background: '#d1fae5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              color: '#065f46',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            ✓ Se ha enviado una contraseña temporal a tu correo electrónico. Por favor, revisa tu bandeja de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem',
              }}
            >
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#111827',
              }}
              placeholder="tu@correo.com"
              disabled={loading || success}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                background: loading || success ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading || success ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Enviando...' : success ? '✓ Enviado' : 'Enviar Contraseña Temporal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

