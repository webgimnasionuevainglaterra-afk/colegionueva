'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import '../app/css/administrators-list.css';
import EditTeacherForm from './EditTeacherForm';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
}

interface Teacher {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  foto_url: string | null;
  numero_celular: string | null;
  indicativo_pais: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  cursos: Course[];
}

export default function TeachersList() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/teachers/get-teachers');
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los profesores');
      }

      setTeachers(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener profesores:', err);
      setError(err.message || 'Error al cargar los profesores');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPhone = (indicativo: string, numero: string | null) => {
    if (!numero) return 'N/A';
    return `${indicativo} ${numero}`;
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${teacher.nombre} ${teacher.apellido}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teachers/delete-teacher?id=${teacher.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el profesor');
      }

      alert('Profesor eliminado exitosamente');
      fetchTeachers(); // Recargar la lista
    } catch (err: any) {
      console.error('Error al eliminar profesor:', err);
      alert(err.message || 'Error al eliminar el profesor');
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando profesores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={fetchTeachers} className="retry-button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="administrators-list-container">
      {teachers.length === 0 ? (
        <div className="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>No hay profesores registrados</p>
          <p className="empty-state-subtitle">Crea tu primer profesor usando el botón "Crear Profesor"</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="administrators-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Cursos Asignados</th>
                <th>Estado</th>
                <th>Fecha de Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>
                    <div className="avatar-container">
                      {teacher.foto_url ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                          <Image
                            src={teacher.foto_url}
                            alt={`${teacher.nombre} ${teacher.apellido}`}
                            width={40}
                            height={40}
                            className="avatar-image"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="avatar-placeholder small-avatar">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="name-cell">
                      <span className="name-text">
                        {teacher.nombre} {teacher.apellido}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="email-text">{teacher.email}</span>
                  </td>
                  <td>
                    <span className="phone-text">
                      {formatPhone(teacher.indicativo_pais, teacher.numero_celular)}
                    </span>
                  </td>
                  <td>
                    <div className="courses-cell">
                      {teacher.cursos.length === 0 ? (
                        <span className="no-courses">Sin cursos asignados</span>
                      ) : (
                        <div className="courses-badges">
                          {teacher.cursos.map((curso) => (
                            <span key={curso.id} className="course-badge">
                              {curso.nombre} ({curso.nivel})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${teacher.is_active ? 'active' : 'inactive'}`}>
                      {teacher.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <span className="date-text">{formatDate(teacher.created_at)}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit-btn"
                        title="Editar profesor"
                        onClick={() => handleEdit(teacher)}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="action-btn delete-btn"
                        title="Eliminar profesor"
                        onClick={() => handleDelete(teacher)}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de edición */}
      {editingTeacher && (
        <EditTeacherForm
          teacher={editingTeacher}
          onClose={() => setEditingTeacher(null)}
          onTeacherUpdated={() => {
            setEditingTeacher(null);
            fetchTeachers();
          }}
        />
      )}
    </div>
  );
}

