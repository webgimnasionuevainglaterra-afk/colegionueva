'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import '../app/css/create-admin.css';

interface Administrator {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  is_active: boolean;
}

interface EditAdministratorFormProps {
  administrator: Administrator;
  onClose: () => void;
  onAdministratorUpdated?: () => void;
}

export default function EditAdministratorForm({ 
  administrator, 
  onClose, 
  onAdministratorUpdated 
}: EditAdministratorFormProps) {
  const [formData, setFormData] = useState({
    nombre: administrator.nombre,
    apellido: administrator.apellido,
    email: administrator.email,
    foto: null as File | null,
    is_active: administrator.is_active,
  });
  const [preview, setPreview] = useState<string | null>(administrator.foto_url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      nombre: administrator.nombre,
      apellido: administrator.apellido,
      email: administrator.email,
      foto: null,
      is_active: administrator.is_active,
    });
    setPreview(administrator.foto_url);
  }, [administrator]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        foto: file,
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Subir foto si hay una nueva
      let fotoUrl = administrator.foto_url;
      if (formData.foto) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', formData.foto);

          const uploadResponse = await fetch('/api/admin/upload-photo', {
            method: 'POST',
            body: uploadFormData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            fotoUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.warn('Error al subir foto, continuando sin actualizar:', uploadErr);
        }
      }

      // 2. Actualizar administrador
      const updateResponse = await fetch('/api/admin/update-administrator', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: administrator.id,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          foto_url: fotoUrl,
          is_active: formData.is_active,
        }),
      });

      const contentType = updateResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await updateResponse.text();
        throw new Error(`Error del servidor: ${updateResponse.status} ${updateResponse.statusText}`);
      }

      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateData.error || 'Error al actualizar el administrador');
      }

      setSuccess(true);
      
      if (onAdministratorUpdated) {
        onAdministratorUpdated();
      }

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al actualizar administrador:', err);
      setError(err.message || 'Error al actualizar el administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Administrador</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Administrador actualizado exitosamente
            </div>
          )}

          <form onSubmit={handleSubmit} className="create-admin-form">
            {/* Foto */}
            <div className="form-group">
              <label htmlFor="foto" className="form-label">
                Foto
              </label>
              <div className="photo-upload-container">
                {preview ? (
                  <div className="photo-preview">
                    <Image
                      src={preview}
                      alt="Preview"
                      width={120}
                      height={120}
                      className="preview-image"
                      unoptimized
                    />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => {
                        setPreview(null);
                        setFormData(prev => ({ ...prev, foto: null }));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label htmlFor="foto" className="photo-upload-label">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Subir foto</span>
                  </label>
                )}
                <input
                  type="file"
                  id="foto"
                  name="foto"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="photo-input"
                />
              </div>
            </div>

            {/* Nombre */}
            <div className="form-group">
              <label htmlFor="nombre" className="form-label">
                Nombre *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Ingrese el nombre"
              />
            </div>

            {/* Apellido */}
            <div className="form-group">
              <label htmlFor="apellido" className="form-label">
                Apellido *
              </label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Ingrese el apellido"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Correo Electrónico *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Estado Activo */}
            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="checkbox-input"
                />
                <span style={{ marginLeft: '0.5rem' }}>Administrador activo</span>
              </label>
            </div>

            {/* Botones */}
            <div className="modal-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="submit-button"
              >
                {loading ? 'Actualizando...' : 'Actualizar Administrador'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}




