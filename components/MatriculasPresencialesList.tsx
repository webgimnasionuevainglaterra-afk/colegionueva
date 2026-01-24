'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/matriculas-list.css';

interface Matricula {
  id: string;
  nombre_acudiente: string;
  nombre_estudiante: string;
  telefono_estudiante: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'completada';
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  cursos: {
    id: string;
    nombre: string;
  } | null;
}

export default function MatriculasPresencialesList() {
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [actualizando, setActualizando] = useState<string | null>(null);

  useEffect(() => {
    cargarMatriculas();
  }, [filtroEstado]);

  const cargarMatriculas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      const url = filtroEstado === 'todos' 
        ? '/api/matriculas-presenciales/get'
        : `/api/matriculas-presenciales/get?estado=${filtroEstado}`;

      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) {
        throw new Error('Error al cargar las matrículas');
      }

      const result = await response.json();

      if (result.success) {
        setMatriculas(result.matriculas || []);
      } else {
        throw new Error(result.error || 'Error al cargar las matrículas');
      }
    } catch (err: any) {
      console.error('Error al cargar matrículas:', err);
      setError(err.message || 'Error al cargar las matrículas');
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (matriculaId: string, nuevoEstado: string, observaciones?: string) => {
    try {
      setActualizando(matriculaId);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      const response = await fetch('/api/matriculas-presenciales/update', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: matriculaId,
          estado: nuevoEstado,
          observaciones: observaciones || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al actualizar la matrícula');
      }

      // Recargar matrículas
      await cargarMatriculas();
    } catch (err: any) {
      console.error('Error al actualizar matrícula:', err);
      setError(err.message || 'Error al actualizar la matrícula');
    } finally {
      setActualizando(null);
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'badge-warning';
      case 'aprobada':
        return 'badge-success';
      case 'rechazada':
        return 'badge-danger';
      case 'completada':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      case 'completada':
        return 'Completada';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="matriculas-list-container">
        <div className="loading-container">
          <p>Cargando matrículas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="matriculas-list-container">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={cargarMatriculas} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="matriculas-list-container">
      <div className="matriculas-header">
        <h2 className="matriculas-title">Matrículas Presenciales</h2>
        <div className="filtros-container">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filtro-select"
          >
            <option value="todos">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="completada">Completadas</option>
          </select>
        </div>
      </div>

      {matriculas.length === 0 ? (
        <div className="empty-state">
          <p>No hay matrículas {filtroEstado !== 'todos' ? `con estado "${getEstadoLabel(filtroEstado)}"` : ''}</p>
        </div>
      ) : (
        <div className="matriculas-table-container">
          <table className="matriculas-table">
            <thead>
              <tr>
                <th>Acudiente</th>
                <th>Estudiante</th>
                <th>Curso</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matriculas.map((matricula) => (
                <tr key={matricula.id}>
                  <td>{matricula.nombre_acudiente}</td>
                  <td>{matricula.nombre_estudiante}</td>
                  <td>{matricula.cursos?.nombre || 'N/A'}</td>
                  <td>{matricula.telefono_estudiante}</td>
                  <td>
                    <span className={`badge ${getEstadoBadgeClass(matricula.estado)}`}>
                      {getEstadoLabel(matricula.estado)}
                    </span>
                  </td>
                  <td>{formatearFecha(matricula.creado_en)}</td>
                  <td>
                    <div className="acciones-buttons">
                      {matricula.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => actualizarEstado(matricula.id, 'aprobada')}
                            disabled={actualizando === matricula.id}
                            className="btn-accion btn-aprobar"
                            title="Aprobar"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => actualizarEstado(matricula.id, 'rechazada')}
                            disabled={actualizando === matricula.id}
                            className="btn-accion btn-rechazar"
                            title="Rechazar"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      {matricula.estado === 'aprobada' && (
                        <button
                          onClick={() => actualizarEstado(matricula.id, 'completada')}
                          disabled={actualizando === matricula.id}
                          className="btn-accion btn-completar"
                          title="Marcar como completada"
                        >
                          ✓✓
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

