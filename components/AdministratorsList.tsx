'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import EditAdministratorForm from './EditAdministratorForm';
import '../app/css/administrators-list.css';

interface Administrator {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  role: string;
  created_at: string;
  is_active: boolean;
  is_online?: boolean;
  last_seen?: string;
}

export default function AdministratorsList() {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);

  const fetchAdministrators = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/get-administrators', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los administradores');
      }

      const admins = result.data || [];
      setAdministrators(admins);
    } catch (err: any) {
      console.error('Error al obtener administradores:', err);
      setError(err.message || 'Error al cargar los administradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdministrators();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = (admin: Administrator) => {
    setEditingAdmin(admin);
  };

  const handleDelete = async (id: string, nombre: string, apellido: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${nombre} ${apellido}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/delete-administrator?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el administrador');
      }

      // Actualizar la lista
      fetchAdministrators();
    } catch (err: any) {
      console.error('Error al eliminar administrador:', err);
      alert(err.message || 'Error al eliminar el administrador');
    }
  };

  if (loading) {
    return (
      <div className="administrators-list-loading">
        <p>Cargando administradores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="administrators-list-error">
        <p>{error}</p>
        <button onClick={fetchAdministrators} className="retry-button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="administrators-list-container">
      <div className="administrators-list-header">
        <h2 className="list-title">Lista de Administradores</h2>
        <div className="header-actions">
          <button onClick={fetchAdministrators} className="refresh-button">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {administrators.length === 0 ? (
        <div className="empty-state">
          <p>No hay administradores registrados aún.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="administrators-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha de Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {administrators.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div className="avatar-cell">
                      <div className="avatar-with-status">
                        {admin.foto_url ? (
                          <Image
                            src={admin.foto_url}
                            alt={`${admin.nombre} ${admin.apellido}`}
                            width={40}
                            height={40}
                            className="admin-avatar"
                            unoptimized
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {admin.nombre.charAt(0).toUpperCase()}
                            {admin.apellido.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span 
                          className={`online-status-indicator ${admin.is_online ? 'online' : 'offline'}`}
                          title={admin.is_online ? 'En línea' : 'Desconectado'}
                        ></span>
                      </div>
                    </div>
                  </td>
                  <td>{admin.nombre}</td>
                  <td>{admin.apellido}</td>
                  <td>{admin.email}</td>
                  <td>
                    <span className="role-badge">{admin.role}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${admin.is_active ? 'active' : 'inactive'}`}>
                      {admin.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{formatDate(admin.created_at)}</td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="action-button edit" 
                        title="Editar"
                        onClick={() => handleEdit(admin)}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        className="action-button delete" 
                        title="Eliminar"
                        onClick={() => handleDelete(admin.id, admin.nombre, admin.apellido)}
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

      {editingAdmin && (
        <EditAdministratorForm
          administrator={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onAdministratorUpdated={() => {
            fetchAdministrators();
            setEditingAdmin(null);
          }}
        />
      )}
    </div>
  );
}

