'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

interface Mensaje {
  id: string;
  contenido_id: string;
  autor_id: string;
  contenido: string;
  respuesta_a: string | null;
  es_pregunta: boolean;
  respondido: boolean;
  editado: boolean;
  eliminado: boolean;
  created_at: string;
  updated_at: string;
  autor: {
    nombre: string;
    tipo: 'estudiante' | 'profesor';
  } | null;
  respuestas?: Mensaje[];
}

interface ForumViewProps {
  contenidoId: string;
  contenidoTitulo?: string;
  mensajeIdInicial?: string | null;
}

export default function ForumView({ contenidoId, contenidoTitulo, mensajeIdInicial }: ForumViewProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [respondiendoA, setRespondiendoA] = useState<string | null>(null);
  const [editandoMensaje, setEditandoMensaje] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState('');
  const [esPregunta, setEsPregunta] = useState(false);
  const [userRole, setUserRole] = useState<'estudiante' | 'profesor' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    verificarRolUsuario();
    cargarMensajes();
  }, [contenidoId]);

  const verificarRolUsuario = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      // Obtener nombre del usuario desde user_metadata
      const nombreCompleto = session.user.user_metadata?.nombre && session.user.user_metadata?.apellido
        ? `${session.user.user_metadata.nombre} ${session.user.user_metadata.apellido}`.trim()
        : session.user.email?.split('@')[0] || 'Usuario';
      setUserName(nombreCompleto);

      const { data: estudiante } = await supabase
        .from('estudiantes')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (estudiante) {
        setUserRole('estudiante');
        return;
      }

      const { data: profesor } = await supabase
        .from('profesores')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profesor) {
        setUserRole('profesor');
      }
    } catch (err) {
      console.error('Error al verificar rol:', err);
    }
  };

  const cargarMensajes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch(`/api/foros/get-mensajes?contenido_id=${contenidoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar mensajes');
      }

      setMensajes(result.data || []);

      // Si hay un mensajeIdInicial, hacer scroll a ese mensaje después de cargar
      if (mensajeIdInicial) {
        setTimeout(() => {
          const elemento = document.getElementById(`mensaje-${mensajeIdInicial}`);
          if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elemento.style.backgroundColor = '#fef3c7';
            setTimeout(() => {
              elemento.style.backgroundColor = '';
            }, 3000);
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('Error al cargar mensajes:', err);
      setError(err.message || 'Error al cargar los mensajes del foro');
    } finally {
      setLoading(false);
    }
  };

  const crearMensaje = async () => {
    if (!nuevoMensaje.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('No hay sesión activa');
      return;
    }

    const textoMensaje = nuevoMensaje.trim();
    const esPreguntaFinal = esPregunta && !respondiendoA;
    const respuestaAId = respondiendoA;

    // Limpiar el formulario inmediatamente (optimistic update)
    setNuevoMensaje('');
    setRespondiendoA(null);
    setEsPregunta(false);

    // Crear mensaje optimista (temporal) para mostrar inmediatamente
    const mensajeOptimista: Mensaje = {
      id: `temp-${Date.now()}`,
      contenido_id: contenidoId,
      autor_id: userId || '',
      contenido: textoMensaje,
      respuesta_a: respuestaAId,
      es_pregunta: esPreguntaFinal,
      respondido: false,
      editado: false,
      eliminado: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      autor: {
        id: userId || '',
        nombre: userName || (userRole === 'profesor' ? 'Profesor' : 'Estudiante'),
        tipo: userRole || 'estudiante',
      },
    };

    // Agregar mensaje optimista a la lista inmediatamente
    if (respuestaAId) {
      // Si es respuesta, agregar al hilo correspondiente
      setMensajes((prev) => {
        return prev.map((mensaje) => {
          if (mensaje.id === respuestaAId) {
            return {
              ...mensaje,
              respuestas: [...(mensaje.respuestas || []), mensajeOptimista],
            };
          }
          return mensaje;
        });
      });
    } else {
      // Si es mensaje principal, agregar al inicio
      setMensajes((prev) => [mensajeOptimista, ...prev]);
    }

    // Enviar al servidor en segundo plano
    try {
      const response = await fetch('/api/foros/create-mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          contenido_id: contenidoId,
          contenido_texto: textoMensaje,
          respuesta_a: respuestaAId,
          es_pregunta: esPreguntaFinal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Si falla, remover el mensaje optimista y mostrar error
        setMensajes((prev) => {
          if (respuestaAId) {
            return prev.map((mensaje) => {
              if (mensaje.id === respuestaAId) {
                return {
                  ...mensaje,
                  respuestas: mensaje.respuestas?.filter((r) => r.id !== mensajeOptimista.id) || [],
                };
              }
              return mensaje;
            });
          } else {
            return prev.filter((m) => m.id !== mensajeOptimista.id);
          }
        });
        throw new Error(result.error || 'Error al crear mensaje');
      }

      // Reemplazar mensaje optimista con el real del servidor
      // En lugar de recargar todos los mensajes, solo actualizar el optimista con el real
      if (result.data) {
        setMensajes((prev) => {
          if (respuestaAId) {
            // Si es respuesta, reemplazar en el hilo
            return prev.map((mensaje) => {
              if (mensaje.id === respuestaAId) {
                return {
                  ...mensaje,
                  respuestas: mensaje.respuestas?.map((r) => 
                    r.id === mensajeOptimista.id ? result.data : r
                  ) || [],
                };
              }
              return mensaje;
            });
          } else {
            // Si es mensaje principal, reemplazar en la lista
            return prev.map((m) => m.id === mensajeOptimista.id ? result.data : m);
          }
        });
      } else {
        // Si no viene el mensaje en la respuesta, recargar todos
        await cargarMensajes();
      }
    } catch (err: any) {
      console.error('Error al crear mensaje:', err);
      setError(err.message || 'Error al crear el mensaje');
      // El mensaje optimista ya fue removido arriba si hubo error
    }
  };

  const actualizarMensaje = async (mensajeId: string) => {
    if (!textoEditando.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/foros/update-mensaje', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mensaje_id: mensajeId,
          contenido_texto: textoEditando.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar mensaje');
      }

      setEditandoMensaje(null);
      setTextoEditando('');
      await cargarMensajes();
    } catch (err: any) {
      console.error('Error al actualizar mensaje:', err);
      setError(err.message || 'Error al actualizar el mensaje');
    }
  };

  const eliminarMensaje = async (mensajeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch(`/api/foros/delete-mensaje?mensaje_id=${mensajeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar mensaje');
      }

      await cargarMensajes();
    } catch (err: any) {
      console.error('Error al eliminar mensaje:', err);
      setError(err.message || 'Error al eliminar el mensaje');
    }
  };

  const iniciarEdicion = (mensaje: Mensaje) => {
    setEditandoMensaje(mensaje.id);
    setTextoEditando(mensaje.contenido);
  };

  const cancelarEdicion = () => {
    setEditandoMensaje(null);
    setTextoEditando('');
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    console.log('🔍 ForumView estado:', {
      contenidoId,
      loading,
      error,
      mensajesCount: mensajes.length,
      userRole,
      userId,
    });
  }, [contenidoId, loading, error, mensajes.length, userRole, userId]);

  if (loading) {
    console.log('⏳ ForumView: Mostrando estado de carga');
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Cargando mensajes del foro...
      </div>
    );
  }

  if (error && mensajes.length === 0) {
    console.log('❌ ForumView: Mostrando error:', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  console.log('✅ ForumView: Renderizando foro con', mensajes.length, 'mensajes');

  return (
    <div style={{ padding: '1.5rem' }}>
      {contenidoTitulo && (
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          Foro: {contenidoTitulo}
        </h2>
      )}

      {error && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Formulario para nuevo mensaje */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          {respondiendoA ? 'Responder' : userRole === 'estudiante' ? 'Hacer una pregunta o comentario' : 'Responder'}
        </h3>
        
        {respondiendoA && (
          <button
            onClick={() => {
              setRespondiendoA(null);
              setEsPregunta(false);
            }}
            style={{
              marginBottom: '0.75rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              color: '#6b7280',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancelar respuesta
          </button>
        )}

        {userRole === 'estudiante' && !respondiendoA && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              checked={esPregunta}
              onChange={(e) => setEsPregunta(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              Marcar como pregunta (el profesor será notificado)
            </span>
          </label>
        )}

        <textarea
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder={respondiendoA ? 'Escribe tu respuesta...' : 'Escribe tu mensaje...'}
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            marginBottom: '0.75rem',
            color: '#111827',
            backgroundColor: '#ffffff',
          }}
        />

        <button
          onClick={crearMensaje}
          disabled={!nuevoMensaje.trim()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: nuevoMensaje.trim() ? 'pointer' : 'not-allowed',
            opacity: nuevoMensaje.trim() ? 1 : 0.5,
          }}
        >
          {respondiendoA ? 'Enviar respuesta' : 'Publicar mensaje'}
        </button>
      </div>

      {/* Lista de mensajes */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          Mensajes ({mensajes.length})
        </h3>

        {mensajes.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No hay mensajes aún. ¡Sé el primero en comentar!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {mensajes.map((mensaje) => (
              <div key={mensaje.id} id={`mensaje-${mensaje.id}`}>
                <MensajeCard
                  mensaje={mensaje}
                  userRole={userRole}
                  userId={userId}
                  onResponder={() => setRespondiendoA(mensaje.id)}
                  onEditar={() => iniciarEdicion(mensaje)}
                  onEliminar={() => eliminarMensaje(mensaje.id)}
                  editando={editandoMensaje === mensaje.id}
                  textoEditando={textoEditando}
                  onTextoEditandoChange={setTextoEditando}
                  onGuardarEdicion={() => actualizarMensaje(mensaje.id)}
                  onCancelarEdicion={cancelarEdicion}
                  formatearFecha={formatearFecha}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MensajeCardProps {
  mensaje: Mensaje;
  userRole: 'estudiante' | 'profesor' | null;
  userId: string | null;
  onResponder: () => void;
  onEditar: () => void;
  onEliminar: () => void;
  editando: boolean;
  textoEditando: string;
  onTextoEditandoChange: (texto: string) => void;
  onGuardarEdicion: () => void;
  onCancelarEdicion: () => void;
  formatearFecha: (fecha: string) => string;
}

function MensajeCard({
  mensaje,
  userRole,
  userId,
  onResponder,
  onEditar,
  onEliminar,
  editando,
  textoEditando,
  onTextoEditandoChange,
  onGuardarEdicion,
  onCancelarEdicion,
  formatearFecha,
}: MensajeCardProps) {
  const esMiMensaje = mensaje.autor_id === userId;

  return (
    <div style={{
      padding: '1rem',
      borderRadius: '8px',
      backgroundColor: mensaje.es_pregunta ? '#eff6ff' : '#ffffff',
      border: `1px solid ${mensaje.es_pregunta ? '#3b82f6' : '#e5e7eb'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, color: '#111827' }}>
              {mensaje.autor?.nombre || 'Usuario'}
            </span>
            <span style={{
              padding: '0.125rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: mensaje.autor?.tipo === 'profesor' ? '#dbeafe' : '#f3f4f6',
              color: mensaje.autor?.tipo === 'profesor' ? '#1e40af' : '#4b5563',
            }}>
              {mensaje.autor?.tipo === 'profesor' ? '👨‍🏫 Profesor' : '👨‍🎓 Estudiante'}
            </span>
            {mensaje.es_pregunta && (
              <span style={{
                padding: '0.125rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: '#fef3c7',
                color: '#92400e',
              }}>
                ❓ Pregunta
              </span>
            )}
            {mensaje.respondido && mensaje.es_pregunta && (
              <span style={{
                padding: '0.125rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: '#d1fae5',
                color: '#065f46',
              }}>
                ✅ Respondida
              </span>
            )}
            {mensaje.editado && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                (editado)
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {formatearFecha(mensaje.created_at)}
          </div>
        </div>
      </div>

      {editando ? (
        <div>
          <textarea
            value={textoEditando}
            onChange={(e) => onTextoEditandoChange(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              marginBottom: '0.75rem',
              color: '#111827',
              backgroundColor: '#ffffff',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onGuardarEdicion}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Guardar
            </button>
            <button
              onClick={onCancelarEdicion}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '0.75rem', color: '#111827', whiteSpace: 'pre-wrap' }}>
            {mensaje.contenido}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {userRole && (
              <>
                {userRole === 'estudiante' && (
                  <button
                    onClick={onResponder}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#2563eb',
                      border: '1px solid #2563eb',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Responder
                  </button>
                )}
                {userRole === 'profesor' && (
                  <button
                    onClick={onResponder}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Responder
                  </button>
                )}
                {esMiMensaje && (
                  <>
                    <button
                      onClick={onEditar}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={onEliminar}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Respuestas */}
          {mensaje.respuestas && mensaje.respuestas.length > 0 && (
        <div style={{ marginTop: '1rem', paddingLeft: '1.5rem', borderLeft: '2px solid #e5e7eb' }}>
          {mensaje.respuestas.map((respuesta) => (
            <MensajeCard
              key={respuesta.id}
              mensaje={respuesta}
              userRole={userRole}
              userId={userId}
              onResponder={onResponder}
              onEditar={onEditar}
              onEliminar={onEliminar}
              editando={false}
              textoEditando=""
              onTextoEditandoChange={() => {}}
              onGuardarEdicion={() => {}}
              onCancelarEdicion={() => {}}
              formatearFecha={formatearFecha}
            />
          ))}
        </div>
      )}
    </div>
  );
}

