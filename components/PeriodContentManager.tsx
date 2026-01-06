'use client';

import { useState, useEffect } from 'react';
import '../app/css/create-admin.css';
import '../app/css/course-subjects.css';

interface PeriodContentManagerProps {
  periodId: string;
  periodName: string;
  subjectName?: string;
  onClose: () => void;
}

interface Tema {
  id: string;
  periodo_id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
}

interface Subtema {
  id: string;
  tema_id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
}

interface Contenido {
  id: string;
  subtema_id: string;
  tipo: 'video' | 'archivo' | 'foro';
  titulo: string;
  descripcion?: string;
  url?: string;
  archivo_url?: string;
  orden: number;
}

export default function PeriodContentManager({ 
  periodId, 
  periodName,
  subjectName,
  onClose 
}: PeriodContentManagerProps) {
  const [activeView, setActiveView] = useState<'temas' | 'subtemas' | 'contenido'>('temas');
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [contenidoPorSubtema, setContenidoPorSubtema] = useState<Record<string, Contenido[]>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para selección
  const [selectedTema, setSelectedTema] = useState<string | null>(null);
  const [selectedSubtema, setSelectedSubtema] = useState<string | null>(null);
  
  // Estados para modales
  const [isCreateTemaModalOpen, setIsCreateTemaModalOpen] = useState(false);
  const [isCreateSubtemaModalOpen, setIsCreateSubtemaModalOpen] = useState(false);
  const [isCreateContenidoModalOpen, setIsCreateContenidoModalOpen] = useState(false);
  const [selectedSubtemaNombre, setSelectedSubtemaNombre] = useState<string>('');
  const [selectedSubtemaDescripcion, setSelectedSubtemaDescripcion] = useState<string>('');
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [editingSubtema, setEditingSubtema] = useState<Subtema | null>(null);

  // Cargar temas
  const fetchTemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/temas/get-temas?periodo_id=${periodId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar temas');
      }
      setTemas(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar temas');
    } finally {
      setLoading(false);
    }
  };

  // Cargar subtemas y su contenido
  const fetchSubtemas = async (temaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/subtemas/get-subtemas?tema_id=${temaId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar subtemas');
      }
      const subtemasData = result.data || [];
      setSubtemas(subtemasData);
      setSelectedTema(temaId);
      
      // Cargar contenido para cada subtema
      const contenidoMap: Record<string, Contenido[]> = {};
      for (const subtema of subtemasData) {
        try {
          const contenidoResponse = await fetch(`/api/contenido/get-contenido?subtema_id=${subtema.id}`);
          const contenidoResult = await contenidoResponse.json();
          if (contenidoResponse.ok && contenidoResult.data) {
            console.log('🟡 Contenido recibido para subtema', subtema.id, ':', contenidoResult.data);
            
            // Combinar registros relacionados (video + archivos del mismo subtema con títulos similares)
            const contenidoRaw = contenidoResult.data;
            const contenidoCombinado: Contenido[] = [];
            const procesados = new Set<string>();
            
            contenidoRaw.forEach((item: Contenido) => {
              if (procesados.has(item.id)) return;
              
              // Si es un video sin archivos, buscar si hay un registro de archivos relacionado
              if (item.tipo === 'video' && item.url && !item.archivo_url) {
                const tituloBase = item.titulo.replace(' (Video)', '').replace(' (Archivos)', '');
                const archivoRelacionado = contenidoRaw.find(
                  (other: Contenido) => 
                    other.id !== item.id &&
                    other.tipo === 'archivo' &&
                    !other.url &&
                    other.archivo_url &&
                    (other.titulo.replace(' (Video)', '').replace(' (Archivos)', '') === tituloBase || 
                     other.titulo === tituloBase)
                );
                
                if (archivoRelacionado) {
                  // Combinar: usar el registro del video pero agregar el archivo_url
                  contenidoCombinado.push({
                    ...item,
                    archivo_url: archivoRelacionado.archivo_url,
                  });
                  procesados.add(item.id);
                  procesados.add(archivoRelacionado.id);
                  console.log('🟢 Combinado video con archivos:', item.id, '+', archivoRelacionado.id);
                  return;
                }
              }
              
              // Si es un archivo sin video, buscar si hay un registro de video relacionado
              if (item.tipo === 'archivo' && item.archivo_url && !item.url) {
                const tituloBase = item.titulo.replace(' (Video)', '').replace(' (Archivos)', '');
                const videoRelacionado = contenidoRaw.find(
                  (other: Contenido) => 
                    other.id !== item.id &&
                    other.tipo === 'video' &&
                    other.url &&
                    !other.archivo_url &&
                    (other.titulo.replace(' (Video)', '').replace(' (Archivos)', '') === tituloBase ||
                     other.titulo === tituloBase)
                );
                
                if (videoRelacionado) {
                  // Combinar: usar el registro del video pero agregar el archivo_url
                  contenidoCombinado.push({
                    ...videoRelacionado,
                    archivo_url: item.archivo_url,
                  });
                  procesados.add(item.id);
                  procesados.add(videoRelacionado.id);
                  console.log('🟢 Combinado archivos con video:', item.id, '+', videoRelacionado.id);
                  return;
                }
              }
              
              // Si no hay relación, agregar el item tal cual
              contenidoCombinado.push(item);
              procesados.add(item.id);
            });
            
            contenidoMap[subtema.id] = contenidoCombinado;
            console.log('🟢 Contenido combinado final:', contenidoCombinado);
          }
        } catch (err) {
          console.error('🔴 Error al cargar contenido para subtema', subtema.id, ':', err);
          // Si falla cargar contenido de un subtema, continuar con los demás
          contenidoMap[subtema.id] = [];
        }
      }
      setContenidoPorSubtema(contenidoMap);
    } catch (err: any) {
      setError(err.message || 'Error al cargar subtemas');
    } finally {
      setLoading(false);
    }
  };

  // Cargar contenido
  const fetchContenido = async (subtemaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contenido/get-contenido?subtema_id=${subtemaId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar contenido');
      }
      setContenido(result.data || []);
      setSelectedSubtema(subtemaId);
    } catch (err: any) {
      setError(err.message || 'Error al cargar contenido');
    } finally {
      setLoading(false);
    }
  };

  // Función para convertir URL de YouTube a formato embed
  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // Detectar formato youtu.be
    const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch) {
      return `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
    }
    
    // Detectar formato youtube.com/watch?v=
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    
    // Detectar formato youtube.com/embed/
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return null;
  };

  useEffect(() => {
    if (activeView === 'temas') {
      fetchTemas();
    }
  }, [activeView, periodId]);

  // Crear tema
  const handleCreateTema = async (nombre: string, descripcion: string) => {
    try {
      const response = await fetch('/api/temas/create-tema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo_id: periodId,
          nombre,
          descripcion,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear tema');
      }
      await fetchTemas();
      setIsCreateTemaModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al crear tema');
    }
  };

  // Actualizar tema
  const handleUpdateTema = async (id: string, nombre: string, descripcion: string) => {
    try {
      const response = await fetch('/api/temas/update-tema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          nombre,
          descripcion,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar tema');
      }
      await fetchTemas();
      setEditingTema(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar tema');
    }
  };

  // Eliminar tema
  const handleDeleteTema = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este tema? Se eliminarán todos sus subtemas y contenido.')) {
      return;
    }
    try {
      const response = await fetch(`/api/temas/delete-tema?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Verificar si la respuesta tiene contenido antes de parsear JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al eliminar tema');
        }
      } else if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al eliminar tema');
      }
      
      await fetchTemas();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar tema');
    }
  };

  // Crear subtema
  const handleCreateSubtema = async (nombre: string, descripcion: string) => {
    if (!selectedTema) {
      alert('Por favor selecciona un tema primero');
      return;
    }
    try {
      const response = await fetch('/api/subtemas/create-subtema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema_id: selectedTema,
          nombre,
          descripcion,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear subtema');
      }
      await fetchSubtemas(selectedTema);
      setIsCreateSubtemaModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al crear subtema');
    }
  };

  // Eliminar subtema
  const handleDeleteSubtema = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este subtema? Se eliminará todo su contenido.')) {
      return;
    }
    try {
      const response = await fetch(`/api/subtemas/delete-subtema?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Verificar si la respuesta tiene contenido antes de parsear JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al eliminar subtema');
        }
      } else if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al eliminar subtema');
      }
      
      // Actualizar contenido por subtema eliminando el subtema eliminado
      setContenidoPorSubtema(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      
      if (selectedTema) {
        await fetchSubtemas(selectedTema);
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar subtema');
    }
  };

  // Crear contenido
  const handleCreateContenido = async (tipo: 'video' | 'archivo' | 'foro', titulo: string, descripcion: string, url?: string, archivos_urls?: string[]) => {
    if (!selectedSubtema) {
      alert('Por favor selecciona un subtema primero');
      return;
    }
    
    console.log('📥 handleCreateContenido recibió:', {
      tipo,
      titulo,
      descripcion,
      url,
      archivos_urls,
      archivos_urlsLength: archivos_urls?.length || 0
    });
    
    try {
      const promises: Promise<any>[] = [];
      const hasVideo = !!url;
      const hasArchivos = archivos_urls && archivos_urls.length > 0;
      const hasBoth = hasVideo && hasArchivos;
      
      console.log('🔍 Análisis:', { hasVideo, hasArchivos, hasBoth });

      // Obtener la descripción del subtema
      const subtemaDescripcion = subtemas.find(s => s.id === selectedSubtema)?.descripcion || descripcion || '';

      // Si hay video Y archivos, crear un solo registro con ambos
      if (hasVideo && hasArchivos) {
        const archivo_url = archivos_urls!.length === 1 
          ? archivos_urls![0] 
          : JSON.stringify(archivos_urls);

        console.log('🔵 Creando contenido con video Y archivos:', {
          url,
          archivo_url,
          archivos_urls,
          archivo_url_final: archivo_url
        });

        const combinedPromise = fetch('/api/contenido/create-contenido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtema_id: selectedSubtema,
            tipo: 'video',
            titulo,
            descripcion: subtemaDescripcion,
            url,
            archivo_url,
          }),
        });
        promises.push(combinedPromise);
      } else {
        // Si hay URL de video, crear registro de tipo 'video'
        if (hasVideo) {
          const videoPromise = fetch('/api/contenido/create-contenido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subtema_id: selectedSubtema,
              tipo: 'video',
              titulo,
              descripcion: subtemaDescripcion,
              url,
              archivo_url: null,
            }),
          });
          promises.push(videoPromise);
        }

        // Si hay archivos, crear registro de tipo 'archivo'
        if (hasArchivos) {
          const archivo_url = archivos_urls!.length === 1 
            ? archivos_urls![0] 
            : JSON.stringify(archivos_urls);

          const archivoPromise = fetch('/api/contenido/create-contenido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subtema_id: selectedSubtema,
              tipo: 'archivo',
              titulo,
              descripcion: subtemaDescripcion,
              url: null,
              archivo_url,
            }),
          });
          promises.push(archivoPromise);
        }
      }

      // Ejecutar todas las creaciones en paralelo
      const responses = await Promise.all(promises);
      
      // Verificar que todas las respuestas sean exitosas
      for (const response of responses) {
        const result = await response.json();
        console.log('📦 Respuesta de creación:', result);
        if (!response.ok) {
          throw new Error(result.error || 'Error al crear contenido');
        }
        // Verificar que el contenido se guardó con archivo_url
        if (result.data) {
          console.log('✅ Contenido creado:', {
            id: result.data.id,
            tipo: result.data.tipo,
            url: result.data.url,
            archivo_url: result.data.archivo_url
          });
        }
      }

      // Recargar subtemas para actualizar el contenido mostrado
      if (selectedTema) {
        console.log('🔄 Recargando subtemas...');
        await fetchSubtemas(selectedTema);
      }
      setIsCreateContenidoModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al crear contenido');
    }
  };

  // Actualizar orden del contenido
  const handleUpdateOrden = async (subtemaId: string, newOrder: Contenido[]) => {
    try {
      const items = newOrder.map((item, index) => ({
        id: item.id,
        orden: index,
      }));

      const response = await fetch('/api/contenido/update-orden', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el orden');
      }

      // Actualizar el estado local
      setContenidoPorSubtema(prev => ({
        ...prev,
        [subtemaId]: newOrder,
      }));
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el orden');
    }
  };

  // Manejar drag and drop
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, subtemaId: string, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const contenido = contenidoPorSubtema[subtemaId] || [];
    const dragIndex = contenido.findIndex(item => item.id === draggedItem);

    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedItem(null);
      return;
    }

    // Reordenar el array
    const newOrder = [...contenido];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    // Actualizar el orden en la base de datos
    handleUpdateOrden(subtemaId, newOrder);
    setDraggedItem(null);
  };

  // Eliminar contenido
  const handleDeleteContenido = async (id: string, subtemaId: string) => {
    if (!confirm('¿Estás seguro de eliminar este contenido?')) {
      return;
    }
    try {
      const response = await fetch(`/api/contenido/delete-contenido?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Verificar si la respuesta tiene contenido antes de parsear JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al eliminar contenido');
        }
      } else if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al eliminar contenido');
      }
      
      // Actualizar el estado local
      setContenidoPorSubtema(prev => {
        const updated = { ...prev };
        if (updated[subtemaId]) {
          updated[subtemaId] = updated[subtemaId].filter(item => item.id !== id);
          // Reordenar los elementos restantes
          updated[subtemaId] = updated[subtemaId].map((item, index) => ({
            ...item,
            orden: index,
          }));
          // Actualizar el orden en la base de datos
          if (updated[subtemaId].length > 0) {
            handleUpdateOrden(subtemaId, updated[subtemaId]);
          }
        }
        return updated;
      });

      // Recargar subtemas para actualizar
      if (selectedTema) {
        await fetchSubtemas(selectedTema);
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar contenido');
    }
  };

  // Renderizar vista de temas
  const renderTemasView = () => (
    <div className="content-section">
      <div className="subjects-header">
        <button
          className="create-subject-btn"
          onClick={() => setIsCreateTemaModalOpen(true)}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar Tema
        </button>
      </div>

      {loading && temas.length === 0 ? (
        <div className="loading-state">
          <p>Cargando temas...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
        </div>
      ) : temas.length === 0 ? (
        <div className="empty-state">
          <p>No hay temas creados aún</p>
          <span>Agrega temas usando el botón "Agregar Tema"</span>
        </div>
      ) : (
        <div className="subjects-list">
          {temas.map((tema) => (
            <div key={tema.id} className="subject-card">
              <div className="subject-info">
                <h3 className="subject-name">{tema.nombre}</h3>
                {tema.descripcion && (
                  <p className="subject-description">{tema.descripcion}</p>
                )}
              </div>
              <div className="subject-actions">
                <button
                  className="action-btn subjects-btn"
                  onClick={() => {
                    setActiveView('subtemas');
                    fetchSubtemas(tema.id);
                  }}
                  title="Gestionar subtemas"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
                <button
                  className="action-btn edit-btn"
                  onClick={() => setEditingTema(tema)}
                  title="Editar tema"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteTema(tema.id)}
                  title="Eliminar tema"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear tema */}
      {isCreateTemaModalOpen && (
        <CreateTemaModal
          onClose={() => setIsCreateTemaModalOpen(false)}
          onCreate={handleCreateTema}
        />
      )}

      {/* Modal editar tema */}
      {editingTema && (
        <EditTemaModal
          tema={editingTema}
          onClose={() => setEditingTema(null)}
          onUpdate={handleUpdateTema}
        />
      )}
    </div>
  );

  // Renderizar vista de subtemas
  const renderSubtemasView = () => (
    <div className="content-section">
      <div className="subjects-header">
        <button
          className="back-icon-btn"
          onClick={() => {
            setActiveView('temas');
            setSelectedTema(null);
            setSubtemas([]);
          }}
          title="Volver a Temas"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <button
          className="create-subject-btn"
          onClick={() => {
            if (!selectedTema) {
              alert('Por favor selecciona un tema primero desde la vista de Temas');
              return;
            }
            setIsCreateSubtemaModalOpen(true);
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar Subtema
        </button>
      </div>

      {!selectedTema ? (
        <div className="empty-state">
          <p>Por favor selecciona un tema desde la vista de Temas</p>
          <button
            className="action-btn"
            onClick={() => setActiveView('temas')}
          >
            Ir a Temas
          </button>
        </div>
      ) : loading && subtemas.length === 0 ? (
        <div className="loading-state">
          <p>Cargando subtemas...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
        </div>
      ) : subtemas.length === 0 ? (
        <div className="empty-state">
          <p>No hay subtemas creados aún</p>
          <span>Agrega subtemas usando el botón "Agregar Subtema"</span>
        </div>
      ) : (
        <div className="subjects-list">
          {subtemas.map((subtema) => (
            <div key={subtema.id} className="subject-card">
              <div className="subject-info">
                <h3 className="subject-name">{subtema.nombre}</h3>
                {subtema.descripcion && (
                  <p className="subject-description">{subtema.descripcion}</p>
                )}
              </div>
              {/* Mostrar contenido del subtema en tarjetas */}
              {contenidoPorSubtema[subtema.id] && contenidoPorSubtema[subtema.id].length > 0 && (
                <div className="contenido-cards-container" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                  <div className="contenido-cards-grid">
                    {contenidoPorSubtema[subtema.id].map((item, index) => {
                      console.log('📋 Item completo:', item);
                      console.log('📋 tipo:', item.tipo, 'url:', item.url, 'archivo_url:', item.archivo_url);
                      
                      let files: string[] = [];
                      if (item.archivo_url) {
                        try {
                          const parsed = JSON.parse(item.archivo_url);
                          files = Array.isArray(parsed) ? parsed : [item.archivo_url];
                        } catch {
                          files = [item.archivo_url];
                        }
                        console.log('✅ files parseados:', files);
                      } else {
                        console.log('❌ No hay archivo_url en el item');
                      }

                      const getFileType = (url: string): 'image' | 'pdf' | 'other' => {
                        const lowerUrl = url.toLowerCase();
                        if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png')) {
                          return 'image';
                        }
                        if (lowerUrl.includes('.pdf')) {
                          return 'pdf';
                        }
                        return 'other';
                      };

                      const getFileName = (url: string): string => {
                        try {
                          const urlObj = new URL(url);
                          const fileName = urlObj.pathname.split('/').pop() || 'archivo';
                          // Limpiar el nombre del archivo (remover timestamps y UUIDs del inicio)
                          const cleanedName = fileName.replace(/^\d+_[a-z0-9]+_/, '');
                          return cleanedName || fileName;
                        } catch {
                          return 'archivo';
                        }
                      };

                      return (
                        <div
                          key={item.id}
                          className="contenido-card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            handleDragOver(e, index);
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, subtema.id, index)}
                          style={{
                            opacity: draggedItem === item.id ? 0.5 : 1,
                            borderTop: dragOverIndex === index ? '3px solid #2563eb' : '1px solid #e5e7eb',
                          }}
                        >
                          <div className="contenido-card-header">
                            <div className="contenido-card-drag-handle">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', cursor: 'grab', color: '#9ca3af' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 12h16M4 16h16" />
                              </svg>
                            </div>
                            <span className="contenido-card-order">#{index + 1}</span>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDeleteContenido(item.id, subtema.id)}
                              title="Eliminar contenido"
                              style={{ marginLeft: 'auto', width: '32px', height: '32px' }}
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="contenido-card-body">
                            <h4 className="contenido-card-title">{item.titulo}</h4>
                            
                            {item.descripcion && (
                              <p className="contenido-card-description">{item.descripcion}</p>
                            )}

                            {/* Mostrar video si existe */}
                            {item.url && getYouTubeEmbedUrl(item.url) && (
                              <div className="contenido-card-video">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'block', textDecoration: 'none' }}
                                >
                                  <div className="video-preview-wrapper">
                                    <iframe
                                      className="video-preview-iframe"
                                      src={getYouTubeEmbedUrl(item.url) || ''}
                                      title={item.titulo}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                </a>
                              </div>
                            )}

                            {/* Mostrar archivos si existen - debajo del video */}
                            {files.length > 0 && (
                              <div className="contenido-card-files" style={{ marginTop: files.length > 0 && item.url && getYouTubeEmbedUrl(item.url) ? '1rem' : '0' }}>
                                <div className="files-grid">
                                  {files.map((fileUrl, idx) => {
                                    const fileType = getFileType(fileUrl);
                                    const fileName = getFileName(fileUrl);
                                    return (
                                      <a
                                        key={idx}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="file-display-item"
                                      >
                                        {fileType === 'image' ? (
                                          <div className="file-image-link">
                                            <img
                                              src={fileUrl}
                                              alt={fileName}
                                              className="file-thumbnail"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling?.nextElementSibling as HTMLElement;
                                                if (fallback) {
                                                  fallback.style.display = 'flex';
                                                }
                                              }}
                                            />
                                            <div className="file-overlay">
                                              <span className="file-name">{fileName}</span>
                                            </div>
                                            <div className="file-image-fallback">
                                              <div className="file-icon">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                  <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                              </div>
                                              <span className="file-name">{fileName}</span>
                                            </div>
                                          </div>
                                        ) : fileType === 'pdf' ? (
                                          <div className="file-pdf-link">
                                            <div className="file-icon">
                                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                              </svg>
                                            </div>
                                            <span className="file-name" title={fileName}>{fileName}</span>
                                          </div>
                                        ) : (
                                          <div className="file-other-link">
                                            <div className="file-icon">
                                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="17 8 12 3 7 8"></polyline>
                                                <line x1="12" y1="3" x2="12" y2="15"></line>
                                              </svg>
                                            </div>
                                            <span className="file-name" title={fileName}>{fileName}</span>
                                          </div>
                                        )}
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="subject-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={() => {
                    setSelectedSubtema(subtema.id);
                    setSelectedSubtemaNombre(subtema.nombre);
                    setSelectedSubtemaDescripcion(subtema.descripcion || '');
                    setIsCreateContenidoModalOpen(true);
                  }}
                  title="Agregar contenido (video y archivos)"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteSubtema(subtema.id)}
                  title="Eliminar subtema"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear subtema */}
      {isCreateSubtemaModalOpen && (
        <CreateSubtemaModal
          onClose={() => setIsCreateSubtemaModalOpen(false)}
          onCreate={handleCreateSubtema}
        />
      )}
    </div>
  );

  // Renderizar vista de contenido
  const renderContenidoView = () => (
    <div className="content-section">
      <div className="subjects-header">
        <button
          className="back-icon-btn"
          onClick={() => {
            setActiveView('subtemas');
            setSelectedSubtema(null);
            setContenido([]);
          }}
          title="Volver a Subtemas"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <button
          className="create-subject-btn"
          onClick={() => {
            if (!selectedSubtema) {
              alert('Por favor selecciona un subtema primero desde la vista de Subtemas');
              return;
            }
            setIsCreateContenidoModalOpen(true);
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar Contenido
        </button>
      </div>

      {!selectedSubtema ? (
        <div className="empty-state">
          <p>Por favor selecciona un subtema desde la vista de Subtemas</p>
          <button
            className="action-btn"
            onClick={() => setActiveView('subtemas')}
          >
            Ir a Subtemas
          </button>
        </div>
      ) : loading && contenido.length === 0 ? (
        <div className="loading-state">
          <p>Cargando contenido...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
        </div>
      ) : contenido.length === 0 ? (
        <div className="empty-state">
          <p>No hay contenido creado aún</p>
          <span>Agrega contenido usando el botón "Agregar Contenido"</span>
        </div>
      ) : (
        <div className="subjects-list">
          {contenido.map((item) => (
            <div key={item.id} className="subject-card">
              <div className="subject-info">
                <div className="subject-header">
                  <h3 className="subject-name">{item.titulo}</h3>
                  <span className={`content-type-badge ${item.tipo}`}>
                    {item.tipo === 'video' && '🎥'}
                    {item.tipo === 'archivo' && '📄'}
                    {item.tipo === 'foro' && '💬'}
                    {item.tipo}
                  </span>
                </div>
                {item.descripcion && (
                  <p className="subject-description">{item.descripcion}</p>
                )}
                {item.tipo === 'video' && item.url && getYouTubeEmbedUrl(item.url) && (
                  <div className="video-preview-container">
                    <div className="video-preview-wrapper">
                      <iframe
                        className="video-preview-iframe"
                        src={getYouTubeEmbedUrl(item.url) || ''}
                        title={item.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="content-link">
                      🔗 Abrir en YouTube
                    </a>
                  </div>
                )}
                {item.url && item.tipo !== 'video' && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="content-link">
                    🔗 {item.url}
                  </a>
                )}
                {item.tipo === 'video' && item.url && !getYouTubeEmbedUrl(item.url) && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="content-link">
                    🔗 {item.url}
                  </a>
                )}
                {item.archivo_url && (
                  <div className="files-display">
                    {(() => {
                      let files: string[] = [];
                      try {
                        // Intentar parsear como JSON (múltiples archivos)
                        const parsed = JSON.parse(item.archivo_url);
                        if (Array.isArray(parsed)) {
                          files = parsed;
                        } else {
                          files = [item.archivo_url];
                        }
                      } catch {
                        // Si no es JSON, es una URL simple
                        files = [item.archivo_url];
                      }

                      const getFileType = (url: string): 'image' | 'pdf' | 'other' => {
                        const lowerUrl = url.toLowerCase();
                        if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png')) {
                          return 'image';
                        }
                        if (lowerUrl.includes('.pdf')) {
                          return 'pdf';
                        }
                        return 'other';
                      };

                      const getFileName = (url: string): string => {
                        try {
                          const urlObj = new URL(url);
                          const pathname = urlObj.pathname;
                          const fileName = pathname.split('/').pop() || 'archivo';
                          return fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
                        } catch {
                          return 'archivo';
                        }
                      };

                      return (
                        <div className="files-grid">
                          {files.map((fileUrl: string, idx: number) => {
                            const fileType = getFileType(fileUrl);
                            const fileName = getFileName(fileUrl);
                            
                            return (
                              <div key={idx} className="file-display-item">
                                {fileType === 'image' ? (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-image-link"
                                  >
                                    <img
                                      src={fileUrl}
                                      alt={fileName}
                                      className="file-thumbnail"
                                      onError={(e) => {
                                        // Si falla la carga, mostrar fallback
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling?.nextElementSibling as HTMLElement;
                                        if (fallback) {
                                          fallback.style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <div className="file-overlay">
                                      <span className="file-name">{fileName}</span>
                                    </div>
                                    <div className="file-image-fallback">
                                      <div className="file-icon">🖼️</div>
                                      <span className="file-name">{fileName}</span>
                                    </div>
                                  </a>
                                ) : fileType === 'pdf' ? (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-pdf-link"
                                  >
                                    <div className="file-icon">📄</div>
                                    <span className="file-name">{fileName}</span>
                                  </a>
                                ) : (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-other-link"
                                  >
                                    <div className="file-icon">📎</div>
                                    <span className="file-name">{fileName}</span>
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="subject-actions">
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteContenido(item.id)}
                  title="Eliminar contenido"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container course-subjects-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 className="modal-title" style={{ textAlign: 'center' }}>Gestión de Contenido</h2>
            {subjectName && (
              <p className="modal-subtitle" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', marginTop: '0.5rem', textAlign: 'center' }}>
                Materia: {subjectName}
              </p>
            )}
            <p className="modal-subtitle" style={{ fontSize: '1rem', fontWeight: 600, color: '#6b7280', marginTop: subjectName ? '0.25rem' : '0', textAlign: 'center' }}>
              {periodName}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="content-tabs">
            <button
              className={`content-tab ${activeView === 'temas' ? 'active' : ''}`}
              onClick={() => setActiveView('temas')}
            >
              Temas
            </button>
            <button
              className={`content-tab ${activeView === 'subtemas' ? 'active' : ''}`}
              onClick={() => setActiveView('subtemas')}
            >
              Subtemas
            </button>
            <button
              className={`content-tab ${activeView === 'contenido' ? 'active' : ''}`}
              onClick={() => setActiveView('contenido')}
            >
              Contenido
            </button>
          </div>

          <div className="content-view">
            {activeView === 'temas' && renderTemasView()}
            {activeView === 'subtemas' && renderSubtemasView()}
            {activeView === 'contenido' && renderContenidoView()}
          </div>
        </div>
      </div>

      {/* Modal crear contenido - renderizado fuera del modal principal */}
      {isCreateContenidoModalOpen && (
        <CreateContenidoModal
          onClose={() => {
            setIsCreateContenidoModalOpen(false);
            setSelectedSubtemaNombre('');
            setSelectedSubtemaDescripcion('');
          }}
          onCreate={handleCreateContenido}
          subtemaNombre={selectedSubtemaNombre}
          subtemaDescripcion={selectedSubtemaDescripcion}
        />
      )}
    </div>
  );
}

// Componentes modales auxiliares
function CreateTemaModal({ onClose, onCreate }: { onClose: () => void; onCreate: (nombre: string, descripcion: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    onCreate(nombre.trim(), descripcion.trim());
    setNombre('');
    setDescripcion('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Tema</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nombre del Tema *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTemaModal({ tema, onClose, onUpdate }: { tema: Tema; onClose: () => void; onUpdate: (id: string, nombre: string, descripcion: string) => void }) {
  const [nombre, setNombre] = useState(tema.nombre);
  const [descripcion, setDescripcion] = useState(tema.descripcion || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    onUpdate(tema.id, nombre.trim(), descripcion.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Tema</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nombre del Tema *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSubtemaModal({ onClose, onCreate }: { onClose: () => void; onCreate: (nombre: string, descripcion: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    onCreate(nombre.trim(), descripcion.trim());
    setNombre('');
    setDescripcion('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Subtema</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nombre del Subtema *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateContenidoModal({ onClose, onCreate, subtemaNombre, subtemaDescripcion }: { onClose: () => void; onCreate: (tipo: 'video' | 'archivo' | 'foro', titulo: string, descripcion: string, url?: string, archivos_urls?: string[]) => void; subtemaNombre?: string; subtemaDescripcion?: string }) {
  const [url, setUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Función para convertir URL de YouTube a formato embed (local al modal)
  const getYouTubeEmbedUrlLocal = (url: string): string | null => {
    if (!url) return null;
    
    // Detectar formato youtu.be
    const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch) {
      return `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
    }
    
    // Detectar formato youtube.com/watch?v=
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    
    // Detectar formato youtube.com/embed/
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return null;
  };

  // Actualizar preview cuando cambia la URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    const embedUrl = getYouTubeEmbedUrlLocal(newUrl);
    setVideoPreviewUrl(embedUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Filtrar solo PDF, JPG, PNG
      const validFiles = files.filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
      });
      setSelectedFiles(validFiles);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que haya al menos URL de video o archivos
    if (!url.trim() && selectedFiles.length === 0) {
      alert('Debes proporcionar una URL de video o subir al menos un archivo');
      return;
    }

    let archivosUrls: string[] = [];

    // Subir archivos si hay
    if (selectedFiles.length > 0) {
      setUploading(true);
      try {
        const uploadFormData = new FormData();
        selectedFiles.forEach(file => {
          uploadFormData.append('files', file);
        });

        const uploadResponse = await fetch('/api/contenido/upload-files', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log('📦 Respuesta completa de upload:', uploadData);
          
          // La API devuelve { success: true, files: [{ url, name, path, type }] }
          // Necesitamos extraer solo las URLs
          if (uploadData.files && Array.isArray(uploadData.files)) {
            archivosUrls = uploadData.files.map((file: any) => file.url);
            console.log('✅ Archivos subidos exitosamente. URLs extraídas:', archivosUrls);
          } else if (uploadData.urls && Array.isArray(uploadData.urls)) {
            // Fallback por si acaso la API devuelve urls directamente
            archivosUrls = uploadData.urls;
            console.log('✅ Archivos subidos exitosamente (formato alternativo):', archivosUrls);
          } else {
            console.error('❌ Formato de respuesta inesperado:', uploadData);
            alert('Error: formato de respuesta inesperado al subir archivos');
            setUploading(false);
            return;
          }
          
          if (archivosUrls.length === 0) {
            console.error('❌ No se obtuvieron URLs de los archivos subidos');
            alert('Error: no se pudieron obtener las URLs de los archivos subidos');
            setUploading(false);
            return;
          }
        } else {
          const errorData = await uploadResponse.json();
          console.error('❌ Error al subir archivos:', errorData);
          alert(errorData.error || 'Error al subir archivos');
          setUploading(false);
          return;
        }
      } catch (err: any) {
        alert('Error al subir archivos: ' + err.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Si hay URL de video, crear como tipo 'video'
    // Si hay archivos pero no video, crear como tipo 'archivo'
    const tipo = url.trim() ? 'video' : 'archivo';
    const videoUrl = url.trim() || undefined;
    const titulo = subtemaNombre || 'Contenido';
    const descripcion = subtemaDescripcion || '';

    console.log('📤 Llamando onCreate con:', {
      tipo,
      titulo,
      descripcion,
      videoUrl,
      archivosUrls: archivosUrls.length > 0 ? archivosUrls : undefined,
      archivosUrlsLength: archivosUrls.length
    });

    onCreate(tipo, titulo, descripcion, videoUrl, archivosUrls.length > 0 ? archivosUrls : undefined);
    setUrl('');
    setSelectedFiles([]);
    setVideoPreviewUrl(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '600px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Contenido</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>URL del Video (opcional)</label>
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://youtube.com/watch?v=... o https://youtu.be/..."
            />
            {videoPreviewUrl && (
              <div className="video-preview-wrapper" style={{ marginTop: '1rem' }}>
                <iframe
                  className="video-preview-iframe"
                  src={videoPreviewUrl}
                  title="Vista previa del video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Subir Archivos (PDF, JPG, PNG) - Opcional</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="file-input"
            />
            {selectedFiles.length > 0 && (
              <div className="files-preview">
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Archivos seleccionados ({selectedFiles.length}):
                </p>
                <div className="files-list">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="remove-file-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={uploading}>Cancelar</button>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
