'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  mensaje_foro_id: string | null;
  contenido_id: string | null;
  created_at: string;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      cargarNotificaciones();
    }
  }, [isOpen]);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/notificaciones/get-notificaciones', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar notificaciones');
      }

      setNotificaciones(result.data || []);
    } catch (err: any) {
      console.error('Error al cargar notificaciones:', err);
      setError(err.message || 'Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (notificacionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/notificaciones/marcar-leida', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ notificacion_id: notificacionId }),
      });

      if (response.ok) {
        // Actualizar estado local
        setNotificaciones((prev) =>
          prev.map((notif) =>
            notif.id === notificacionId ? { ...notif, leida: true } : notif
          )
        );
      }
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
    }
  };

  const handleNotificacionClick = async (notificacion: Notificacion) => {
    // Marcar como leída
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.id);
    }

    // Navegar al enlace si existe
    if (notificacion.enlace) {
      onClose();
      router.push(notificacion.enlace);
    }
  };

  const formatearFecha = (fecha: string) => {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diffMs = ahora.getTime() - fechaNotif.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return fechaNotif.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida).length;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        right: 0,
        width: '400px',
        maxHeight: '600px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e5e7eb',
        zIndex: 10000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
          Notificaciones
          {notificacionesNoLeidas > 0 && (
            <span
              style={{
                marginLeft: '0.5rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {notificacionesNoLeidas}
            </span>
          )}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '500px',
        }}
      >
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            Cargando notificaciones...
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            {error}
          </div>
        ) : notificaciones.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No hay notificaciones
          </div>
        ) : (
          <div>
            {notificaciones.map((notificacion) => (
              <div
                key={notificacion.id}
                onClick={() => handleNotificacionClick(notificacion)}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  backgroundColor: notificacion.leida ? 'white' : '#f0f9ff',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = notificacion.leida ? '#f9fafb' : '#e0f2fe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = notificacion.leida ? 'white' : '#f0f9ff';
                }}
              >
                {!notificacion.leida && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                    }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                    {notificacion.titulo}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.8125rem', lineHeight: '1.4' }}>
                    {notificacion.mensaje}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {formatearFecha(notificacion.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



