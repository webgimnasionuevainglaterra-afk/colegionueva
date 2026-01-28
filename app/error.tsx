'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('❌ Error capturado en Error Boundary:', error);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Digest:', error.digest);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      background: '#1f2937',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>
        Algo salió mal
      </h1>
      <div style={{
        background: '#374151',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fbbf24' }}>
          Detalles del Error:
        </h2>
        <pre style={{
          background: '#1f2937',
          padding: '1rem',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {error.message || 'Error desconocido'}
        </pre>
        {error.stack && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#9ca3af', marginBottom: '0.5rem' }}>
              Ver stack trace completo
            </summary>
            <pre style={{
              background: '#1f2937',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.75rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '400px'
            }}>
              {error.stack}
            </pre>
          </details>
        )}
        {error.digest && (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          Intentar de nuevo
        </button>
        <button
          onClick={() => window.location.href = '/aula-virtual'}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}









