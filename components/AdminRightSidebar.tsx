'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/admin-sidebar.css';

interface AdminRightSidebarProps {
  onTeacherClick: (teacherId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface Profesor {
  id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  email: string;
  is_active: boolean;
  is_online?: boolean;
  cursos: Array<{
    id: string;
    nombre: string;
    nivel: string;
  }>;
}

export default function AdminRightSidebar({ onTeacherClick, isOpen = true, onClose }: AdminRightSidebarProps) {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
    
    // Actualizar el estado online periódicamente (cada 10 segundos)
    const refreshInterval = setInterval(() => {
      fetchTeachers();
    }, 10000); // 10 segundos

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/teachers/get-teachers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los profesores');
      }

      setProfesores(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener profesores:', err);
      setProfesores([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className={`admin-sidebar-overlay ${isOpen ? 'show' : ''}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`admin-right-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="admin-sidebar-header">
          <h2 className="admin-sidebar-title">Profesores</h2>
          {onClose && (
            <button
              className="admin-sidebar-close-btn"
              onClick={onClose}
              aria-label="Cerrar sidebar"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="admin-sidebar-content">
          {loading ? (
            <div className="admin-sidebar-loading">
              <p>Cargando profesores...</p>
            </div>
          ) : profesores.length > 0 ? (
            <div className="admin-teachers-list">
              {profesores.map((profesor) => (
                <div
                  key={profesor.id}
                  onClick={() => {
                    onTeacherClick(profesor.id);
                    if (onClose) onClose(); // Cerrar sidebar en móvil
                  }}
                  className="admin-teacher-item"
                >
                  <div className="admin-teacher-photo" style={{ position: 'relative' }}>
                    {profesor.foto_url ? (
                      <div style={{ position: 'relative' }}>
                        <Image
                          src={profesor.foto_url}
                          alt={`${profesor.nombre} ${profesor.apellido}`}
                          width={40}
                          height={40}
                          style={{
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                          unoptimized
                        />
                        {/* Indicador de estado online */}
                        <span 
                          className={`online-status-indicator ${profesor.is_online ? 'online' : 'offline'}`}
                          title={profesor.is_online ? 'En línea' : 'Desconectado'}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            zIndex: 10,
                            background: profesor.is_online ? '#10b981' : '#ef4444',
                            boxShadow: profesor.is_online 
                              ? '0 0 0 1px white, 0 0 3px rgba(16, 185, 129, 0.5)' 
                              : '0 0 0 1px white, 0 0 3px rgba(239, 68, 68, 0.5)',
                          }}
                        ></span>
                      </div>
                    ) : (
                      <div className="admin-teacher-photo-placeholder" style={{ position: 'relative' }}>
                        {profesor.nombre.charAt(0)}
                        {profesor.apellido.charAt(0)}
                        {/* Indicador de estado online */}
                        <span 
                          className={`online-status-indicator ${profesor.is_online ? 'online' : 'offline'}`}
                          title={profesor.is_online ? 'En línea' : 'Desconectado'}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            zIndex: 10,
                            background: profesor.is_online ? '#10b981' : '#ef4444',
                            boxShadow: profesor.is_online 
                              ? '0 0 0 1px white, 0 0 3px rgba(16, 185, 129, 0.5)' 
                              : '0 0 0 1px white, 0 0 3px rgba(239, 68, 68, 0.5)',
                          }}
                        ></span>
                      </div>
                    )}
                  </div>
                  <div className="admin-teacher-info">
                    <p className="admin-teacher-name">
                      {profesor.nombre} {profesor.apellido}
                    </p>
                    <p className="admin-teacher-email">{profesor.email}</p>
                    {profesor.cursos.length > 0 && (
                      <p className="admin-teacher-courses">
                        {profesor.cursos.length} curso{profesor.cursos.length !== 1 ? 's' : ''} asignado{profesor.cursos.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-sidebar-empty">
              <p>No hay profesores registrados</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
