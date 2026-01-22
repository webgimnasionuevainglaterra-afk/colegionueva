'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
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
  const [editingContenido, setEditingContenido] = useState<{ item: Contenido; subtemaNombre?: string; subtemaDescripcion?: string } | null>(null);
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState(false);
  const [selectedSubtemaForQuiz, setSelectedSubtemaForQuiz] = useState<string | null>(null);
  const [quizToEdit, setQuizToEdit] = useState<any | null>(null);
  const [isViewQuizzesModalOpen, setIsViewQuizzesModalOpen] = useState(false);
  const [selectedSubtemaForViewQuizzes, setSelectedSubtemaForViewQuizzes] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [isImportContenidosModalOpen, setIsImportContenidosModalOpen] = useState(false);

  // Cargar quizes de un subtema
  const fetchQuizzes = async (subtemaId: string) => {
    setLoadingQuizzes(true);
    try {
      const response = await fetch(`/api/quizzes/get-quiz?subtema_id=${subtemaId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar quizes');
      }
      setQuizzes(result.data || []);
    } catch (err: any) {
      console.error('Error al cargar quizes:', err);
      setQuizzes([]);
    } finally {
      setLoadingQuizzes(false);
    }
  };

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

  // Actualizar subtema
  const handleUpdateSubtema = async (id: string, nombre: string, descripcion: string) => {
    try {
      const response = await fetch('/api/subtemas/update-subtema', {
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
        throw new Error(result.error || 'Error al actualizar subtema');
      }
      if (selectedTema) {
        await fetchSubtemas(selectedTema);
      }
      setEditingSubtema(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar subtema');
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
  const handleDeleteContenido = async (id: string, subtemaId?: string) => {
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
      
      // Actualizar el estado local si tenemos el subtemaId
      if (subtemaId) {
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
      }

      // Recargar subtemas para asegurar sincronización
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="create-subject-btn"
            onClick={() => {
              if (!selectedTema) {
                alert('Por favor selecciona un tema primero desde la vista de Temas');
                return;
              }
              setIsCreateSubtemaModalOpen(true);
            }}
            style={{ flex: 1 }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Subtema
          </button>
          <button
            className="create-subject-btn"
            onClick={() => {
              // Descargar plantilla
              window.open('/api/contenido/download-template', '_blank');
            }}
            style={{ 
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              flex: 'none',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            title="Descargar Plantilla Excel"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar Plantilla</span>
          </button>
          <button
            className="create-subject-btn"
            onClick={() => {
              if (!periodId) {
                alert('Error: No se puede importar sin periodo');
                return;
              }
              setIsImportContenidosModalOpen(true);
            }}
            style={{ 
              backgroundColor: '#f59e0b',
              borderColor: '#f59e0b',
              flex: 'none',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            title="Importar desde Excel"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Importar Excel</span>
          </button>
        </div>
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
                            {/* Botón para editar este contenido (video + archivos) */}
                            <button
                              className="action-btn edit-btn"
                              onClick={() => {
                                setEditingContenido({
                                  item,
                                  subtemaNombre: subtema.nombre,
                                  subtemaDescripcion: subtema.descripcion,
                                });
                              }}
                              title="Editar contenido (video y archivos)"
                              style={{ marginLeft: 'auto', width: '32px', height: '32px' }}
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.5L19 9.5 14.5 5 4 15.5V20z" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="contenido-card-body">

                            {/* Mostrar video si existe */}
                            {item.url && getYouTubeEmbedUrl(item.url) && (
                              <div className="contenido-card-video">
                                <div className="video-preview-wrapper">
                                  <iframe
                                    className="video-preview-iframe"
                                    src={getYouTubeEmbedUrl(item.url) || ''}
                                    title={item.titulo}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="content-link"
                                  style={{ marginTop: '0.5rem', display: 'inline-block' }}
                                >
                                  🔗 Abrir en YouTube
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
                {/* 1. Cámara: subir/gestionar contenido del subtema */}
                <button
                  className="action-btn subjects-btn"
                  onClick={() => {
                    setSelectedSubtema(subtema.id);
                    setSelectedSubtemaNombre(subtema.nombre);
                    setSelectedSubtemaDescripcion(subtema.descripcion || '');
                    setIsCreateContenidoModalOpen(true);
                  }}
                  title="Contenido del subtema (video y archivos)"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2-2h6l2 2h4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </button>
                {/* 2. Examen */}
                <button
                  className="action-btn subjects-btn"
                  onClick={() => {
                    setSelectedSubtemaForQuiz(subtema.id);
                    setQuizToEdit(null);
                    setIsCreateQuizModalOpen(true);
                  }}
                  title="Crear/Editar examen del subtema"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4h10a1 1 0 011 1v15l-4-2-4 2-4-2-4 2V5a1 1 0 011-1h4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h3" />
                  </svg>
                </button>
                {/* 2.5. Ver quizes creados */}
                <button
                  className="action-btn subjects-btn"
                  onClick={async () => {
                    setSelectedSubtemaForViewQuizzes(subtema.id);
                    setIsViewQuizzesModalOpen(true);
                    await fetchQuizzes(subtema.id);
                  }}
                  title="Ver quizes creados del subtema"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                {/* 3. Editar subtema */}
                <button
                  className="action-btn edit-btn"
                  onClick={() => {
                    setEditingSubtema(subtema);
                  }}
                  title="Editar subtema"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.5L19 9.5 14.5 5 4 15.5V20z" />
                  </svg>
                </button>
                {/* 4. Eliminar subtema */}
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
      {/* Modal editar subtema */}
      {editingSubtema && (
        <EditSubtemaModal
          subtema={editingSubtema}
          onClose={() => setEditingSubtema(null)}
          onUpdate={handleUpdateSubtema}
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="create-subject-btn"
            onClick={() => {
              if (!selectedSubtema) {
                alert('Por favor selecciona un subtema primero desde la vista de Subtemas');
                return;
              }
              setIsCreateContenidoModalOpen(true);
            }}
            style={{ flex: 1 }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Contenido
          </button>
          <button
            className="create-subject-btn"
            onClick={() => {
              // Descargar plantilla con el nombre del tema
              const temaSeleccionado = temas.find(t => t.id === selectedTema);
              const temaNombre = temaSeleccionado?.nombre || '';
              const url = temaNombre 
                ? `/api/contenido/download-template?tema=${encodeURIComponent(temaNombre)}`
                : '/api/contenido/download-template';
              window.open(url, '_blank');
            }}
            style={{ 
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              flex: 'none',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            title="Descargar Plantilla Excel"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar Plantilla</span>
          </button>
          <button
            className="create-subject-btn"
            onClick={() => {
              if (!periodId) {
                alert('Error: No se puede importar sin periodo');
                return;
              }
              setIsImportContenidosModalOpen(true);
            }}
            style={{ 
              backgroundColor: '#f59e0b',
              borderColor: '#f59e0b',
              flex: 'none',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            title="Importar desde Excel"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Importar Excel</span>
          </button>
        </div>
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
      {/* Modal editar contenido */}
      {editingContenido && (
        <EditContenidoModal
          contenido={editingContenido.item}
          subtemaNombre={editingContenido.subtemaNombre}
          subtemaDescripcion={editingContenido.subtemaDescripcion}
          onClose={() => setEditingContenido(null)}
          onUpdated={async () => {
            if (selectedTema) {
              await fetchSubtemas(selectedTema);
            }
          }}
        />
      )}

      {/* Modal crear/editar quiz */}
      {isCreateQuizModalOpen && selectedSubtemaForQuiz && (
        <CreateQuizModal
          onClose={() => {
            setIsCreateQuizModalOpen(false);
            setSelectedSubtemaForQuiz(null);
            setQuizToEdit(null);
          }}
          subtemaId={selectedSubtemaForQuiz}
          quizToEdit={quizToEdit}
          onSuccess={() => {
            if (selectedTema) {
              fetchSubtemas(selectedTema);
            }
            if (selectedSubtemaForViewQuizzes) {
              fetchQuizzes(selectedSubtemaForViewQuizzes);
            }
            setQuizToEdit(null);
          }}
        />
      )}

      {/* Modal importar contenidos */}
      {isImportContenidosModalOpen && periodId && (
        <ImportContenidosModal
          periodId={periodId}
          periodName={periodName || ''}
          onClose={() => setIsImportContenidosModalOpen(false)}
          onContenidosImported={() => {
            if (selectedSubtema && selectedTema) {
              fetchSubtemas(selectedTema);
            }
            setIsImportContenidosModalOpen(false);
          }}
        />
      )}

      {/* Modal para ver quizes creados */}
      {isViewQuizzesModalOpen && selectedSubtemaForViewQuizzes && (
        <div className="modal-overlay" onClick={() => {
          setIsViewQuizzesModalOpen(false);
          setSelectedSubtemaForViewQuizzes(null);
          setQuizzes([]);
        }} style={{ zIndex: 2000 }}>
          <div className="modal-container" style={{ maxWidth: '800px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Quizes Creados</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsViewQuizzesModalOpen(false);
                setSelectedSubtemaForViewQuizzes(null);
                setQuizzes([]);
              }}>×</button>
            </div>
            <div className="modal-body">
              {loadingQuizzes ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Cargando quizes...</p>
              ) : quizzes.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>No hay quizes creados para este subtema.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: '#f9fafb',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                            {quiz.nombre}
                          </h3>
                          {quiz.descripcion && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                              {quiz.descripcion}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={async () => {
                              // Cargar el quiz completo para editar
                              try {
                                const response = await fetch(`/api/quizzes/get-quiz?quiz_id=${quiz.id}`);
                                const result = await response.json();
                                if (result.data) {
                                  setQuizToEdit(result.data);
                                  setSelectedSubtemaForQuiz(selectedSubtemaForViewQuizzes);
                                  setIsViewQuizzesModalOpen(false);
                                  setIsCreateQuizModalOpen(true);
                                }
                              } catch (err) {
                                console.error('Error al cargar quiz:', err);
                                alert('Error al cargar el quiz para editar');
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('¿Estás seguro de que deseas eliminar este quiz?')) {
                                try {
                                  const response = await fetch(`/api/quizzes/delete-quiz?id=${quiz.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (response.ok) {
                                    await fetchQuizzes(selectedSubtemaForViewQuizzes);
                                  } else {
                                    const result = await response.json();
                                    alert(result.error || 'Error al eliminar el quiz');
                                  }
                                } catch (err) {
                                  console.error('Error al eliminar quiz:', err);
                                  alert('Error al eliminar el quiz');
                                }
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <div>
                          <strong>Inicio:</strong> {new Date(quiz.fecha_inicio).toLocaleString('es-ES')}
                        </div>
                        <div>
                          <strong>Fin:</strong> {new Date(quiz.fecha_fin).toLocaleString('es-ES')}
                        </div>
                        <div>
                          <strong>Tiempo por pregunta:</strong> {quiz.tiempo_por_pregunta_segundos}s
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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

function EditSubtemaModal({ subtema, onClose, onUpdate }: { subtema: Subtema; onClose: () => void; onUpdate: (id: string, nombre: string, descripcion: string) => void }) {
  const [nombre, setNombre] = useState(subtema.nombre);
  const [descripcion, setDescripcion] = useState(subtema.descripcion || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    onUpdate(subtema.id, nombre.trim(), descripcion.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Subtema</h2>
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
            <button type="submit">Guardar</button>
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
          // Intentar obtener el mensaje de error de la respuesta
          let errorMessage = `Error ${uploadResponse.status}: ${uploadResponse.statusText || 'Error desconocido al subir archivos'}`;
          try {
            // Verificar si hay contenido en la respuesta antes de intentar parsearlo
            const responseText = await uploadResponse.text();
            
            if (responseText && responseText.trim().length > 0) {
              try {
                const errorData = JSON.parse(responseText);
                console.error('❌ Error al subir archivos (JSON):', errorData);
                // Solo usar errorData si tiene propiedades útiles
                if (errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0) {
                  errorMessage = errorData.error || errorData.message || errorMessage;
                } else if (typeof errorData === 'string') {
                  errorMessage = errorData;
                }
              } catch (jsonError) {
                // Si no es JSON válido, usar el texto directamente
                console.error('❌ Error al subir archivos (texto):', responseText);
                errorMessage = responseText || errorMessage;
              }
            } else {
              console.error('❌ Respuesta de error vacía. Status:', uploadResponse.status, 'StatusText:', uploadResponse.statusText);
            }
          } catch (parseError: any) {
            console.error('❌ Error al leer respuesta de error:', parseError);
            errorMessage = `Error ${uploadResponse.status}: ${uploadResponse.statusText || parseError.message || 'Error desconocido al subir archivos'}`;
          }
          alert(errorMessage);
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

function EditContenidoModal({
  contenido,
  subtemaNombre,
  subtemaDescripcion,
  onClose,
  onUpdated,
}: {
  contenido: Contenido;
  subtemaNombre?: string;
  subtemaDescripcion?: string;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}) {
  const [url, setUrl] = useState(contenido.url || '');
  const [currentFiles, setCurrentFiles] = useState<string[]>(() => {
    if (!contenido.archivo_url) return [];
    try {
      const parsed = JSON.parse(contenido.archivo_url);
      return Array.isArray(parsed) ? parsed : [contenido.archivo_url];
    } catch {
      return [contenido.archivo_url];
    }
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(() => {
    if (!contenido.url) return null;
    // Reutilizar lógica simple de embed
    const matchShort = contenido.url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (matchShort) return `https://www.youtube.com/embed/${matchShort[1]}`;
    const matchWatch = contenido.url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (matchWatch) return `https://www.youtube.com/embed/${matchWatch[1]}`;
    if (contenido.url.includes('youtube.com/embed/')) return contenido.url;
    return null;
  });

  const getYouTubeEmbedUrlLocal = (url: string): string | null => {
    if (!url) return null;
    const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch) return `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    if (url.includes('youtube.com/embed/')) return url;
    return null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    const embedUrl = getYouTubeEmbedUrlLocal(newUrl);
    setVideoPreviewUrl(embedUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeNewFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index: number) => {
    setCurrentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim() && currentFiles.length === 0 && selectedFiles.length === 0) {
      alert('Debes mantener una URL de video o al menos un archivo');
      return;
    }

    let nuevosArchivosUrls: string[] = [];

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
          console.log('📦 Respuesta completa de upload (editar):', uploadData);

          if (uploadData.files && Array.isArray(uploadData.files)) {
            nuevosArchivosUrls = uploadData.files.map((file: any) => file.url);
          } else if (uploadData.urls && Array.isArray(uploadData.urls)) {
            nuevosArchivosUrls = uploadData.urls;
          } else {
            console.error('❌ Formato de respuesta inesperado al editar:', uploadData);
            alert('Error: formato de respuesta inesperado al subir archivos');
            setUploading(false);
            return;
          }
        } else {
          // Intentar obtener el mensaje de error de la respuesta
          let errorMessage = 'Error al subir archivos';
          try {
            const contentType = uploadResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await uploadResponse.json();
              console.error('❌ Error al subir archivos (editar):', errorData);
              errorMessage = errorData.error || errorData.message || `Error ${uploadResponse.status}: ${uploadResponse.statusText}`;
            } else {
              // Si no es JSON, intentar leer como texto
              const errorText = await uploadResponse.text();
              console.error('❌ Error al subir archivos (editar, texto):', errorText);
              errorMessage = errorText || `Error ${uploadResponse.status}: ${uploadResponse.statusText}`;
            }
          } catch (parseError) {
            console.error('❌ Error al parsear respuesta de error (editar):', parseError);
            errorMessage = `Error ${uploadResponse.status}: ${uploadResponse.statusText || 'Error desconocido al subir archivos'}`;
          }
          alert(errorMessage);
          setUploading(false);
          return;
        }
      } catch (err: any) {
        console.error('❌ Error en catch al subir archivos (editar):', err);
        alert('Error al subir archivos: ' + (err.message || 'Error desconocido'));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const todasLasUrls = [...currentFiles, ...nuevosArchivosUrls];
    let archivo_url: string | null = null;
    if (todasLasUrls.length === 1) {
      archivo_url = todasLasUrls[0];
    } else if (todasLasUrls.length > 1) {
      archivo_url = JSON.stringify(todasLasUrls);
    }

    const tipo: 'video' | 'archivo' | 'foro' =
      url.trim() ? 'video' : todasLasUrls.length > 0 ? 'archivo' : contenido.tipo;

    try {
      const response = await fetch('/api/contenido/update-contenido', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contenido.id,
          tipo,
          titulo: contenido.titulo,
          descripcion: contenido.descripcion || subtemaDescripcion || '',
          url: url.trim() || null,
          archivo_url,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar contenido');
      }

      await onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar contenido');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '600px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Contenido</h2>
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

          {/* Archivos existentes */}
          {currentFiles.length > 0 && (
            <div className="form-group">
              <label>Archivos actuales</label>
              <ul className="files-list">
                {currentFiles.map((fileUrl, index) => (
                  <li key={index} className="file-item">
                    <span className="file-name">
                      {(() => {
                        try {
                          const urlObj = new URL(fileUrl);
                          return urlObj.pathname.split('/').pop() || 'archivo';
                        } catch {
                          return 'archivo';
                        }
                      })()}
                    </span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => removeExistingFile(index)}
                      aria-label="Quitar archivo"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nuevos archivos */}
          <div className="form-group">
            <label>Agregar nuevos archivos (PDF, JPG, PNG)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="file-input"
            />
            {selectedFiles.length > 0 && (
              <ul className="files-list">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => removeNewFile(index)}
                      aria-label="Quitar archivo"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={uploading}>
              Cancelar
            </button>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para crear/editar quiz
function CreateQuizModal({
  onClose,
  subtemaId,
  onSuccess,
  quizToEdit,
}: {
  onClose: () => void;
  subtemaId: string;
  onSuccess: () => void;
  quizToEdit?: any;
}) {
  const [nombre, setNombre] = useState(quizToEdit?.nombre || '');
  const [descripcion, setDescripcion] = useState(quizToEdit?.descripcion || '');
  const [fechaInicio, setFechaInicio] = useState(quizToEdit?.fecha_inicio ? new Date(quizToEdit.fecha_inicio).toISOString().slice(0, 16) : '');
  const [fechaFin, setFechaFin] = useState(quizToEdit?.fecha_fin ? new Date(quizToEdit.fecha_fin).toISOString().slice(0, 16) : '');
  // Calcular isActive inicial basado en fechas si no hay quiz para editar
  const calcularIsActiveInicial = () => {
    if (quizToEdit?.is_active !== undefined) {
      return quizToEdit.is_active;
    }
    // Si no hay fechas aún, por defecto true
    if (!fechaInicio || !fechaFin) {
      return true;
    }
    // Calcular basado en fechas: activo si la fecha actual está entre inicio y fin
    const ahora = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return ahora >= inicio && ahora <= fin;
  };
  
  const [isActive, setIsActive] = useState(calcularIsActiveInicial());
  const [isManuallySet, setIsManuallySet] = useState(quizToEdit?.is_active !== undefined);
  const [preguntas, setPreguntas] = useState<Array<{
    id?: string;
    pregunta_texto: string;
    tiempo_segundos: number;
    opciones: Array<{
      id?: string;
      texto: string;
      es_correcta: boolean;
      explicacion: string;
    }>;
  }>>(quizToEdit?.preguntas?.map((p: any) => ({
    id: p.id,
    pregunta_texto: p.pregunta_texto,
    tiempo_segundos: p.tiempo_segundos || 30,
    opciones: p.opciones?.map((o: any) => ({
      id: o.id,
      texto: o.texto,
      es_correcta: o.es_correcta,
      explicacion: o.explicacion || '',
    })) || [],
  })) || []);
  const [saving, setSaving] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Cargar datos del quiz si se está editando
  useEffect(() => {
    if (quizToEdit?.id) {
      setLoadingQuiz(true);
      fetch(`/api/quizzes/get-quiz?quiz_id=${quizToEdit.id}`)
        .then(res => res.json())
        .then(result => {
          if (result.data) {
            const quiz = result.data;
            setNombre(quiz.nombre);
            setDescripcion(quiz.descripcion || '');
            setFechaInicio(new Date(quiz.fecha_inicio).toISOString().slice(0, 16));
            setFechaFin(new Date(quiz.fecha_fin).toISOString().slice(0, 16));
            setIsActive(quiz.is_active !== undefined ? quiz.is_active : true);
            setIsManuallySet(quiz.is_active !== undefined);
            setPreguntas(quiz.preguntas?.map((p: any) => ({
              id: p.id,
              pregunta_texto: p.pregunta_texto,
              tiempo_segundos: p.tiempo_segundos || 30,
              opciones: p.opciones?.map((o: any) => ({
                id: o.id,
                texto: o.texto,
                es_correcta: o.es_correcta,
                explicacion: o.explicacion || '',
              })) || [],
            })) || []);
          }
        })
        .catch(err => {
          console.error('Error al cargar quiz:', err);
        })
        .finally(() => {
          setLoadingQuiz(false);
        });
    } else {
      // Establecer fechas por defecto (ahora y 7 días después) solo si no hay quiz para editar
      const ahora = new Date();
      const en7Dias = new Date();
      en7Dias.setDate(ahora.getDate() + 7);
      
      const formatoFecha = (fecha: Date) => {
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        return `${año}-${mes}-${dia}T${horas}:${minutos}`;
      };

      if (!fechaInicio) setFechaInicio(formatoFecha(ahora));
      if (!fechaFin) setFechaFin(formatoFecha(en7Dias));
    }
  }, [quizToEdit]);

  const agregarPregunta = () => {
    setPreguntas([...preguntas, {
      pregunta_texto: '',
      tiempo_segundos: 30,
      opciones: [
        { texto: '', es_correcta: false, explicacion: '' },
        { texto: '', es_correcta: false, explicacion: '' },
      ],
    }]);
  };

  const eliminarPregunta = (index: number) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

  const actualizarPregunta = (index: number, campo: string, valor: any) => {
    const nuevasPreguntas = [...preguntas];
    if (campo === 'pregunta_texto') {
      nuevasPreguntas[index].pregunta_texto = valor;
    } else if (campo === 'tiempo_segundos') {
      nuevasPreguntas[index].tiempo_segundos = parseInt(valor) || 30;
    }
    setPreguntas(nuevasPreguntas);
  };

  const agregarOpcion = (preguntaIndex: number) => {
    const nuevasPreguntas = [...preguntas];
    nuevasPreguntas[preguntaIndex].opciones.push({
      texto: '',
      es_correcta: false,
      explicacion: '',
    });
    setPreguntas(nuevasPreguntas);
  };

  const eliminarOpcion = (preguntaIndex: number, opcionIndex: number) => {
    const nuevasPreguntas = [...preguntas];
    if (nuevasPreguntas[preguntaIndex].opciones.length > 2) {
      nuevasPreguntas[preguntaIndex].opciones = nuevasPreguntas[preguntaIndex].opciones.filter((_, i) => i !== opcionIndex);
      setPreguntas(nuevasPreguntas);
    } else {
      alert('Cada pregunta debe tener al menos 2 opciones');
    }
  };

  const actualizarOpcion = (preguntaIndex: number, opcionIndex: number, campo: string, valor: any) => {
    const nuevasPreguntas = [...preguntas];
    if (campo === 'texto') {
      nuevasPreguntas[preguntaIndex].opciones[opcionIndex].texto = valor;
    } else if (campo === 'es_correcta') {
      // Solo una opción puede ser correcta por pregunta
      nuevasPreguntas[preguntaIndex].opciones.forEach((op, i) => {
        op.es_correcta = i === opcionIndex;
      });
    } else if (campo === 'explicacion') {
      nuevasPreguntas[preguntaIndex].opciones[opcionIndex].explicacion = valor;
    }
    setPreguntas(nuevasPreguntas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      alert('El nombre del quiz es requerido');
      return;
    }

    if (preguntas.length === 0) {
      alert('Debes agregar al menos una pregunta');
      return;
    }

    // Validar preguntas
    for (let i = 0; i < preguntas.length; i++) {
      const pregunta = preguntas[i];
      if (!pregunta.pregunta_texto.trim()) {
        alert(`La pregunta ${i + 1} no tiene texto`);
        return;
      }
      if (!pregunta.tiempo_segundos || pregunta.tiempo_segundos < 10) {
        alert(`La pregunta ${i + 1} debe tener al menos 10 segundos`);
        return;
      }
      if (pregunta.opciones.length < 2) {
        alert(`La pregunta ${i + 1} debe tener al menos 2 opciones`);
        return;
      }
      const tieneCorrecta = pregunta.opciones.some(op => op.es_correcta && op.texto.trim());
      if (!tieneCorrecta) {
        alert(`La pregunta ${i + 1} debe tener al menos una opción correcta`);
        return;
      }
      for (let j = 0; j < pregunta.opciones.length; j++) {
        if (!pregunta.opciones[j].texto.trim()) {
          alert(`La opción ${j + 1} de la pregunta ${i + 1} no tiene texto`);
          return;
        }
      }
    }

    if (!fechaInicio || !fechaFin) {
      alert('Debes especificar fecha de inicio y fin del quiz');
      return;
    }

    setSaving(true);
    try {
      const isEditing = quizToEdit?.id;
      const url = isEditing ? '/api/quizzes/update-quiz' : '/api/quizzes/create-quiz';
      const method = isEditing ? 'PUT' : 'POST';
      
      const body: any = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        is_active: isActive,
        preguntas: preguntas.map(p => ({
          id: p.id,
          pregunta_texto: p.pregunta_texto.trim(),
          tiempo_segundos: p.tiempo_segundos || 30,
          opciones: p.opciones.map(op => ({
            id: op.id,
            texto: op.texto.trim(),
            es_correcta: op.es_correcta,
            explicacion: op.explicacion.trim() || null,
          })),
        })),
      };

      if (isEditing) {
        body.quiz_id = quizToEdit.id;
      } else {
        body.subtema_id = subtemaId;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Error al ${isEditing ? 'actualizar' : 'crear'} el quiz`);
      }

      alert(`Quiz ${isEditing ? 'actualizado' : 'creado'} exitosamente`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || `Error al ${quizToEdit?.id ? 'actualizar' : 'crear'} el quiz`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{quizToEdit?.id ? 'Editar Quiz' : 'Crear Quiz'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nombre del Quiz *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Quiz sobre células"
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Descripción opcional del quiz"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Fecha/Hora de inicio *</label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha/Hora de fin *</label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  setIsManuallySet(true);
                }}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <span>Activar quiz (visible para estudiantes)</span>
            </label>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {isManuallySet 
                ? 'Estado establecido manualmente. El quiz se activará/desactivará según tu selección.'
                : `Estado automático: ${isActive ? 'Activo' : 'Inactivo'} (basado en las fechas de inicio y fin). Puedes cambiarlo manualmente si es necesario.`
              }
            </p>
            {!isManuallySet && (
              <p style={{ fontSize: '0.75rem', color: '#3b82f6', margin: '0.25rem 0 0 0', fontStyle: 'italic' }}>
                💡 El quiz se activará automáticamente cuando la fecha actual esté entre la fecha de inicio y fin.
              </p>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ margin: 0 }}>Preguntas *</label>
              <button
                type="button"
                onClick={agregarPregunta}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                + Agregar Pregunta
              </button>
            </div>

            {preguntas.length === 0 && (
              <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                No hay preguntas. Haz clic en "Agregar Pregunta" para comenzar.
              </p>
            )}

            {preguntas.map((pregunta, preguntaIndex) => (
              <div key={preguntaIndex} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                background: '#f9fafb',
                color: '#1f2937',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>Pregunta {preguntaIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => eliminarPregunta(preguntaIndex)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Texto de la pregunta *</label>
                  <textarea
                    value={pregunta.pregunta_texto}
                    onChange={(e) => actualizarPregunta(preguntaIndex, 'pregunta_texto', e.target.value)}
                    rows={2}
                    required
                    placeholder="Ej: ¿Cuál es la función principal de las mitocondrias?"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Tiempo para responder (segundos) *
                  </label>
                  <input
                    type="number"
                    value={pregunta.tiempo_segundos || 30}
                    onChange={(e) => actualizarPregunta(preguntaIndex, 'tiempo_segundos', e.target.value)}
                    min="10"
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>Opciones de respuesta *</label>
                    <button
                      type="button"
                      onClick={() => agregarOpcion(preguntaIndex)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      + Opción
                    </button>
                  </div>

                  {pregunta.opciones.map((opcion, opcionIndex) => (
                    <div key={opcionIndex} style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: opcion.es_correcta ? '#dcfce7' : 'white',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="radio"
                          checked={opcion.es_correcta}
                          onChange={() => actualizarOpcion(preguntaIndex, opcionIndex, 'es_correcta', true)}
                          style={{ marginTop: '0.25rem' }}
                        />
                        <label style={{ flex: 1, margin: 0, fontSize: '0.875rem', fontWeight: opcion.es_correcta ? 600 : 400 }}>
                          {opcion.es_correcta ? '✓ Respuesta correcta' : 'Marcar como correcta'}
                        </label>
                        {pregunta.opciones.length > 2 && (
                          <button
                            type="button"
                            onClick={() => eliminarOpcion(preguntaIndex, opcionIndex)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={opcion.texto}
                          onChange={(e) => actualizarOpcion(preguntaIndex, opcionIndex, 'texto', e.target.value)}
                          placeholder="Texto de la opción"
                          required
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Explicación (opcional)</label>
                        <textarea
                          value={opcion.explicacion}
                          onChange={(e) => actualizarOpcion(preguntaIndex, opcionIndex, 'explicacion', e.target.value)}
                          rows={2}
                          placeholder="Explicación de por qué esta respuesta es correcta o incorrecta"
                          style={{ fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving || loadingQuiz}>Cancelar</button>
            <button type="submit" disabled={saving || loadingQuiz || preguntas.length === 0}>
              {loadingQuiz ? 'Cargando...' : saving ? 'Guardando...' : quizToEdit?.id ? 'Actualizar Quiz' : 'Crear Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para importar contenidos desde Excel
function ImportContenidosModal({
  periodId,
  periodName,
  onClose,
  onContenidosImported,
}: {
  periodId: string;
  periodName: string;
  onClose: () => void;
  onContenidosImported: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setResultado(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/contenido/download-template', '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!archivo) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setImporting(true);
    setResultado(null);
    
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('periodo_id', periodId);

      // Crear un AbortController para manejar timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos de timeout

      let response: Response;
      try {
        response = await fetch('/api/contenido/importar-contenidos', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('La importación está tomando demasiado tiempo. Por favor, intenta con un archivo más pequeño o verifica tu conexión.');
        }
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          throw new Error('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
        }
        throw fetchError;
      }

      // Verificar si la respuesta es JSON válido
      let result: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Error del servidor: ${text || 'Respuesta inválida'}`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Error al importar contenidos');
      }

      setResultado(result);
      if (result.totalCreados > 0) {
        alert(`Se importaron ${result.totalCreados} contenidos exitosamente${result.totalErrores > 0 ? ` (${result.totalErrores} errores)` : ''}`);
        onContenidosImported();
      } else if (result.totalErrores > 0) {
        // Mostrar errores aunque no se hayan creado contenidos
        console.log('Errores de importación:', result.errores);
      }
    } catch (err: any) {
      console.error('Error al importar contenidos:', err);
      const errorMessage = err.message || 'Error al importar contenidos. Por favor, verifica el archivo e intenta nuevamente.';
      alert(errorMessage);
      setResultado(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '600px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Importar Contenidos - {periodName}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Archivo Excel (.xlsx) *</label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} required />
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              El archivo debe tener las columnas: Tema, Subtema, Tipo (video/archivo/foro), Título, Descripción (opcional), URL_Video (opcional), URL_Archivo (opcional)
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              📥 Descargar Plantilla Excel
            </button>
          </div>

          {resultado && (
            <div style={{ padding: '1rem', background: resultado.totalErrores > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Resultado de la importación:</p>
              <p>Contenidos creados: {resultado.totalCreados}</p>
              {resultado.totalErrores > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontWeight: 600, color: '#dc2626' }}>Errores: {resultado.totalErrores}</p>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {resultado.errores?.map((error: string, index: number) => (
                      <li key={index} style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={importing}>Cancelar</button>
            <button type="submit" disabled={importing || !archivo}>
              {importing ? 'Importando...' : 'Importar Contenidos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
