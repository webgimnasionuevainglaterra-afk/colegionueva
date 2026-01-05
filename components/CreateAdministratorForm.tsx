'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/create-admin.css';

interface CreateAdministratorFormProps {
  onClose: () => void;
  onAdministratorCreated?: () => void;
}

export default function CreateAdministratorForm({ onClose, onAdministratorCreated }: CreateAdministratorFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    foto: null as File | null,
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        foto: file,
      }));

      // Crear preview
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
      // 1. Subir foto a Supabase Storage si existe
      let fotoUrl = null;
      if (formData.foto) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', formData.foto);

          const uploadResponse = await fetch('/api/admin/upload-photo', {
            method: 'POST',
            body: uploadFormData,
          });

          const contentType = uploadResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await uploadResponse.text();
            console.warn('Error al subir la imagen, continuando sin foto:', text);
            // Continuar sin foto si hay error
          } else if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json();
            console.warn('Error al subir la imagen, continuando sin foto:', uploadError.error);
            // Continuar sin foto si hay error (ej: bucket no existe)
          } else {
            const uploadData = await uploadResponse.json();
            fotoUrl = uploadData.url;
          }
        } catch (uploadErr: any) {
          console.warn('Error al subir la imagen, continuando sin foto:', uploadErr.message);
          // Continuar sin foto si hay error
        }
      }

      // 2. Obtener token de autenticación
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 3. Crear administrador
      const createResponse = await fetch('/api/admin/create-administrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          password: formData.password,
          foto_url: fotoUrl,
        }),
      });

      const contentType = createResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await createResponse.text();
        console.error('Respuesta no JSON:', text);
        throw new Error(`Error del servidor: ${createResponse.status} ${createResponse.statusText}. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurado en .env.local`);
      }

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Error al crear el administrador');
      }

      setSuccess(true);
      
      // Notificar que se creó un administrador para actualizar la lista
      if (onAdministratorCreated) {
        onAdministratorCreated();
      }

      // Limpiar formulario
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        foto: null,
      });
      setPreview(null);

      // Cerrar modal después de 2 segundos para que se vea el mensaje de éxito
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al crear administrador:', err);
      setError(err.message || 'Error al crear el administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Administrador</h2>
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
              Administrador creado exitosamente
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

          {/* Contraseña */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              className="form-input"
              placeholder="Mínimo 6 caracteres"
            />
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
              {loading ? 'Creando...' : 'Crear Administrador'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

