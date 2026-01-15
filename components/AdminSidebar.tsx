'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchStudents();
  }, []);

  // Buscar estudiantes cuando cambia el query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
                  <div className="admin-student-photo">
                    {estudiante.foto_url ? (
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
                    ) : (
                      <div className="admin-student-photo-placeholder">
                        {estudiante.nombre.charAt(0)}
                        {estudiante.apellido.charAt(0)}
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
