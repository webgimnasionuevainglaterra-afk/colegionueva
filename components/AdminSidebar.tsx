'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/admin-sidebar.css';

interface AdminSidebarProps {
  onStudentClick: (studentId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  tarjeta_identidad: string;
  is_active: boolean;
  is_online?: boolean;
  cursos: Array<{
    id: string;
    nombre: string;
    nivel: string;
  }>;
}

export default function AdminSidebar({ onStudentClick, isOpen = true, onClose }: AdminSidebarProps) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const queryParam = searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/admin/search-students${queryParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al buscar estudiantes');
      }

      if (result.success) {
        setEstudiantes(result.data || []);
      }
    } catch (err: any) {
      console.error('Error al buscar estudiantes:', err);
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar solo el estado online sin recargar toda la lista
  const updateOnlineStatus = useCallback(async () => {
    // No actualizar si hay búsqueda activa
    if (searchQuery) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Obtener todos los estudiantes (sin query) para actualizar solo el estado online
      const response = await fetch('/api/admin/search-students', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Solo actualizar el estado online, no recargar toda la lista si no hay cambios
        setEstudiantes(prev => {
          const nuevosEstudiantes = result.data || [];
          // Si la lista es la misma (mismo número de elementos y mismos IDs), solo actualizar is_online
          if (prev.length === nuevosEstudiantes.length && 
              prev.every((e, i) => e.id === nuevosEstudiantes[i]?.id)) {
            return prev.map((estudiante, i) => ({
              ...estudiante,
              is_online: nuevosEstudiantes[i]?.is_online
            }));
          }
          // Si hay cambios en la lista, actualizar todo
          return nuevosEstudiantes;
        });
      }
    } catch (err) {
      console.error('Error al actualizar estado online:', err);
    }
  }, [searchQuery]);

  // Cargar estudiantes inicialmente
  useEffect(() => {
    fetchStudents();
  }, []);

  // Actualizar el estado online periódicamente (cada 30 segundos, solo si no hay búsqueda activa)
  useEffect(() => {
    if (searchQuery) return; // No actualizar si hay búsqueda activa
    
    const refreshInterval = setInterval(() => {
      updateOnlineStatus();
    }, 30000); // 30 segundos (aumentado de 10 a 30)

    return () => {
      clearInterval(refreshInterval);
    };
  }, [searchQuery, updateOnlineStatus]);

  // Buscar estudiantes cuando cambia el query
  useEffect(() => {
    if (!searchQuery) {
      fetchStudents(); // Si se limpia la búsqueda, recargar lista completa
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchStudents();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
      <div className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="admin-sidebar-header">
          <h2 className="admin-sidebar-title">Buscar Estudiantes</h2>
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

        {/* Search Bar */}
        <div className="admin-sidebar-search">
          <div className="admin-search-input-wrapper">
            <svg className="admin-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="admin-search-clear"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="admin-sidebar-content">
          {loading ? (
            <div className="admin-sidebar-loading">
              <p>Buscando estudiantes...</p>
            </div>
          ) : estudiantes.length > 0 ? (
            <div className="admin-students-list">
              {estudiantes.map((estudiante) => (
                <div
                  key={estudiante.id}
                  onClick={() => {
                    onStudentClick(estudiante.id);
                    if (onClose) onClose(); // Cerrar sidebar en móvil
                  }}
                  className="admin-student-item"
                >
                  <div className="admin-student-photo" style={{ position: 'relative' }}>
                    {estudiante.foto_url ? (
                      <div style={{ position: 'relative' }}>
                        <Image
                          src={estudiante.foto_url}
                          alt={`${estudiante.nombre} ${estudiante.apellido}`}
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
                          className={`online-status-indicator ${estudiante.is_online ? 'online' : 'offline'}`}
                          title={estudiante.is_online ? 'En línea' : 'Desconectado'}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            zIndex: 10,
                            background: estudiante.is_online ? '#10b981' : '#ef4444',
                            boxShadow: estudiante.is_online 
                              ? '0 0 0 1px white, 0 0 3px rgba(16, 185, 129, 0.5)' 
                              : '0 0 0 1px white, 0 0 3px rgba(239, 68, 68, 0.5)',
                          }}
                        ></span>
                      </div>
                    ) : (
                      <div className="admin-student-photo-placeholder" style={{ position: 'relative' }}>
                        {estudiante.nombre.charAt(0)}
                        {estudiante.apellido.charAt(0)}
                        {/* Indicador de estado online */}
                        <span 
                          className={`online-status-indicator ${estudiante.is_online ? 'online' : 'offline'}`}
                          title={estudiante.is_online ? 'En línea' : 'Desconectado'}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            zIndex: 10,
                            background: estudiante.is_online ? '#10b981' : '#ef4444',
                            boxShadow: estudiante.is_online 
                              ? '0 0 0 1px white, 0 0 3px rgba(16, 185, 129, 0.5)' 
                              : '0 0 0 1px white, 0 0 3px rgba(239, 68, 68, 0.5)',
                          }}
                        ></span>
                      </div>
                    )}
                  </div>
                  <div className="admin-student-info">
                    <p className="admin-student-name">
                      {estudiante.nombre} {estudiante.apellido}
                    </p>
                    <p className="admin-student-cedula">Cédula: {estudiante.tarjeta_identidad}</p>
                    {estudiante.cursos.length > 0 && (
                      <p className="admin-student-courses">
                        {estudiante.cursos.length} curso{estudiante.cursos.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-sidebar-empty">
              <p>No se encontraron estudiantes</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
