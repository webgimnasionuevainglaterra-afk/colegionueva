'use client';

import { useEffect, useState, useCallback } from 'react';
import StudentQuizViewer from './StudentQuizViewer';

interface Contenido {
  id: string;
  titulo: string;
  tipo: 'video' | 'archivo' | 'foro';
  descripcion: string | null;
  url: string | null;
  archivo_url: string | null;
  orden: number;
}

interface Subtema {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  contenido: Contenido[];
}

interface Tema {
  id: string;
  nombre: string;
  orden: number;
  subtemas: Subtema[];
  descripcion?: string | null;
}

interface Quiz {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  subtema_id: string;
  is_active?: boolean;
}

interface Periodo {
  id: string;
  nombre: string;
  numero_periodo: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  temas: Tema[];
}

interface StudentSubjectContentProps {
  subjectId: string | null;
  subjectName: string | null;
  selectedTemaFromSidebar?: { tema: Tema; periodoNombre: string } | null;
  onTemaClear?: () => void;
}

// Componente para mostrar el botón de disponibilidad del quiz con conteo regresivo
function QuizAvailabilityButton({ quiz, onStart }: { quiz: Quiz; onStart: () => void }) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const checkAvailability = () => {
      const ahora = new Date();
      // Asegurarse de que las fechas se parseen correctamente
      const fechaInicio = new Date(quiz.fecha_inicio);
      const fechaFin = new Date(quiz.fecha_fin);

      // Logs de depuración
      console.log('🕐 Verificando disponibilidad del quiz:', quiz.nombre);
      console.log('🕐 Fecha inicio (string):', quiz.fecha_inicio);
      console.log('🕐 Fecha inicio (Date):', fechaInicio);
      console.log('🕐 Fecha fin (string):', quiz.fecha_fin);
      console.log('🕐 Fecha fin (Date):', fechaFin);
      console.log('🕐 Ahora:', ahora);
      console.log('🕐 Ahora < Inicio?', ahora < fechaInicio);
      console.log('🕐 Ahora > Fin?', ahora > fechaFin);

      // Validar que las fechas sean válidas
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        console.error('❌ Fechas inválidas para el quiz:', quiz.nombre);
        setIsAvailable(false);
        setHasExpired(false);
        setTimeRemaining(null);
        return;
      }

      if (ahora < fechaInicio) {
        // Quiz aún no está disponible - calcular tiempo restante
        const diff = fechaInicio.getTime() - ahora.getTime();
        const seconds = Math.max(0, Math.floor(diff / 1000));
        console.log('⏰ Quiz no disponible aún. Tiempo restante:', seconds, 'segundos');
        setTimeRemaining(seconds);
        setIsAvailable(false);
        setHasExpired(false);
      } else if (ahora > fechaFin) {
        // Quiz ya expiró
        console.log('❌ Quiz ya expiró');
        setIsAvailable(false);
        setHasExpired(true);
        setTimeRemaining(null);
      } else {
        // Quiz está disponible
        console.log('✅ Quiz está disponible');
        setIsAvailable(true);
        setHasExpired(false);
        setTimeRemaining(null);
      }
    };

    // Verificar inmediatamente
    checkAvailability();

    // Actualizar cada segundo si el quiz no está disponible aún
    const interval = setInterval(() => {
      checkAvailability();
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz.fecha_inicio, quiz.fecha_fin, quiz.nombre]);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '0s';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  };

  if (isAvailable) {
    return (
      <button
        onClick={onStart}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: 500,
          width: '100%',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2563eb';
        }}
      >
        📝 Presentar Quiz
      </button>
    );
  }

  if (hasExpired) {
    return (
      <button
        disabled
        style={{
          padding: '0.75rem 1.5rem',
          background: '#9ca3af',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'not-allowed',
          fontSize: '0.95rem',
          fontWeight: 500,
          width: '100%',
        }}
      >
        ⏰ Quiz Finalizado
      </button>
    );
  }

  // Quiz aún no está disponible - mostrar conteo regresivo
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        disabled
        style={{
          padding: '0.75rem 1.5rem',
          background: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'not-allowed',
          fontSize: '0.95rem',
          fontWeight: 500,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <span>⏰ Disponible en:</span>
        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>
          {timeRemaining !== null && timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : 'Calculando...'}
        </span>
      </button>
      {timeRemaining !== null && timeRemaining > 0 && (
        <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', margin: 0 }}>
          Inicia: {new Date(quiz.fecha_inicio).toLocaleString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      )}
    </div>
  );
}

export default function StudentSubjectContent({ 
  subjectId, 
  subjectName, 
  selectedTemaFromSidebar,
  onTemaClear 
}: StudentSubjectContentProps) {
  console.log('🔍 StudentSubjectContent renderizado con props:', {
    subjectId,
    subjectName,
    selectedTemaFromSidebar,
    hasOnTemaClear: !!onTemaClear,
    temaId: selectedTemaFromSidebar?.tema?.id,
    temaNombre: selectedTemaFromSidebar?.tema?.nombre
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedContent, setSelectedContent] = useState<Contenido | null>(null);
  const [selectedTema, setSelectedTema] = useState<{ tema: Tema; periodoNombre: string } | null>(null);
  const [quizzesPorSubtema, setQuizzesPorSubtema] = useState<Record<string, Quiz[]>>({});
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [expandedPeriodoId, setExpandedPeriodoId] = useState<string | null>(null);
  
  // Función para toggle del acordeón de periodos
  const togglePeriodo = useCallback((periodoId: string) => {
    console.log('🔄 togglePeriodo llamado con periodoId:', periodoId);
    setExpandedPeriodoId((prev) => {
      const newValue = prev === periodoId ? null : periodoId;
      console.log('🔄 Estado anterior:', prev, '→ Nuevo estado:', newValue);
      return newValue;
    });
  }, []);
  
  // Debug: Ver cuando cambia el estado expandedPeriodoId
  useEffect(() => {
    console.log('📊 expandedPeriodoId cambió a:', expandedPeriodoId);
    console.log('📊 Periodos disponibles:', periodos.map(p => ({ id: p.id, nombre: p.nombre })));
  }, [expandedPeriodoId, periodos]);
  
  // Sincronizar tema seleccionado desde el sidebar
  useEffect(() => {
    console.log('🔄 selectedTemaFromSidebar cambió:', selectedTemaFromSidebar);
    if (selectedTemaFromSidebar && selectedTemaFromSidebar.tema && selectedTemaFromSidebar.tema.id) {
      console.log('✅ Estableciendo tema seleccionado:', selectedTemaFromSidebar);
      console.log('✅ Tema ID:', selectedTemaFromSidebar.tema.id);
      console.log('✅ Tema nombre:', selectedTemaFromSidebar.tema.nombre);
      console.log('✅ Tema tiene subtemas:', selectedTemaFromSidebar.tema.subtemas?.length || 0);
      // Solo actualizar si es diferente al estado actual
      setSelectedTema((prev) => {
        if (prev?.tema?.id !== selectedTemaFromSidebar.tema.id) {
          console.log('✅ Actualizando estado local con nuevo tema');
          return selectedTemaFromSidebar;
        }
        console.log('⏭️ Tema ya está en el estado, no actualizar');
        return prev;
      });
    } else {
      console.log('❌ Limpiando tema seleccionado - selectedTemaFromSidebar no es válido');
      setSelectedTema(null);
    }
  }, [selectedTemaFromSidebar]);

  useEffect(() => {
    if (!subjectId) {
      setPeriodos([]);
      setSelectedContent(null);
      // NO limpiar selectedTema si hay un tema seleccionado desde el sidebar
      // Solo limpiar si no hay tema seleccionado desde el sidebar
      if (!selectedTemaFromSidebar) {
        setSelectedTema(null);
      }
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedContent(null);
        // IMPORTANTE: NO limpiar selectedTema aquí porque podría estar seleccionado desde el sidebar
        // El tema seleccionado se maneja en el useEffect de selectedTemaFromSidebar

        const response = await fetch(`/api/estudiantes/get-materia-contenidos?materia_id=${subjectId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al cargar los contenidos de la materia');
        }

        setPeriodos(result.data || []);
      } catch (err: any) {
        console.error('Error al cargar contenidos de la materia:', err);
        setError(err.message || 'Error al cargar los contenidos de la materia');
        setPeriodos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId, selectedTemaFromSidebar]);

  // Cargar quices cuando se selecciona un tema
  useEffect(() => {
    const temaActual = selectedTemaFromSidebar || selectedTema;
    
    if (!temaActual) {
      setQuizzesPorSubtema({});
      return;
    }

    const fetchQuizzes = async () => {
      setLoadingQuizzes(true);
      const quizzes: Record<string, Quiz[]> = {};

      try {
        // Obtener quices de todos los subtemas del tema seleccionado
        const promises = temaActual.tema.subtemas.map(async (subtema) => {
          try {
            const response = await fetch(`/api/quizzes/get-quiz?subtema_id=${subtema.id}`);
            const result = await response.json();
            if (response.ok && result.data) {
              // Filtrar solo quices activos
              quizzes[subtema.id] = result.data.filter((q: Quiz) => q.is_active !== false);
            } else {
              quizzes[subtema.id] = [];
            }
          } catch (err) {
            console.error(`Error al cargar quices del subtema ${subtema.id}:`, err);
            quizzes[subtema.id] = [];
          }
        });

        await Promise.all(promises);
        setQuizzesPorSubtema(quizzes);
      } catch (err) {
        console.error('Error al cargar quices:', err);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
  }, [selectedTemaFromSidebar, selectedTema]);

  // ============================================
  // FUNCIONES AUXILIARES - DEBEN estar definidas antes de ser usadas
  // ============================================
  const getPeriodNumberName = (numero: number) => {
    const names = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto'];
    return names[numero] || `Periodo ${numero}`;
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
    
    // Si no es YouTube, devolver la URL original
    return url;
  };

  // ============================================
  // VERIFICACIÓN CRÍTICA: Si hay un tema seleccionado, MOSTRAR SOLO ESE TEMA
  // Esta verificación DEBE estar DESPUÉS de los hooks pero ANTES del return
  // ============================================
  
  // PRIORIDAD: selectedTemaFromSidebar tiene prioridad absoluta sobre selectedTema local
  // Esto asegura que cuando se selecciona un tema desde el sidebar, se muestre inmediatamente
  const temaParaMostrar = selectedTemaFromSidebar || selectedTema;
  
  // Validar que tenemos un tema válido con ID - validación MUY estricta
  const tieneTemaValido = !!(
    temaParaMostrar && 
    temaParaMostrar.tema && 
    temaParaMostrar.tema.id && 
    typeof temaParaMostrar.tema.id === 'string' &&
    temaParaMostrar.tema.id.length > 0 &&
    temaParaMostrar.periodoNombre &&
    typeof temaParaMostrar.periodoNombre === 'string'
  );
  
  // Log de depuración para ver qué está pasando
  console.log('🔍 ========== VERIFICACIÓN DE TEMA (AL INICIO DEL RENDER) ==========');
  console.log('🔍 selectedTemaFromSidebar:', selectedTemaFromSidebar);
  console.log('🔍 selectedTema local:', selectedTema);
  console.log('🔍 temaParaMostrar:', temaParaMostrar);
  console.log('🔍 tieneTemaValido:', tieneTemaValido);
  if (temaParaMostrar) {
    console.log('🔍 temaParaMostrar.tema:', temaParaMostrar.tema);
    console.log('🔍 temaParaMostrar.tema.id:', temaParaMostrar.tema?.id);
    console.log('🔍 temaParaMostrar.tema.nombre:', temaParaMostrar.tema?.nombre);
    console.log('🔍 temaParaMostrar.periodoNombre:', temaParaMostrar.periodoNombre);
    console.log('🔍 ⚠️ IMPORTANTE: Si tieneTemaValido es true, SOLO se mostrará este tema, NO otros temas');
  } else {
    console.log('🔍 ⚠️ ADVERTENCIA: temaParaMostrar es null/undefined - NO se mostrará tema individual');
  }
  
  // ============================================
  // SI HAY TEMA SELECCIONADO: RETORNAR INMEDIATAMENTE
  // NO EJECUTAR NINGÚN CÓDIGO DESPUÉS DE ESTE RETURN
  // ============================================
  if (tieneTemaValido) {
    // Si hay un quiz seleccionado, mostrar el visor de quiz
    if (selectedQuizId) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              zIndex: 100,
            }}
          >
            <button
              onClick={() => setSelectedQuizId(null)}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              ← Volver al tema
            </button>
          </div>
          <StudentQuizViewer
            quizId={selectedQuizId}
            onClose={() => setSelectedQuizId(null)}
            onComplete={(calificacion) => {
              console.log('Quiz completado con calificación:', calificacion);
              // Opcional: mostrar notificación o actualizar estado
            }}
          />
        </div>
      );
    }
    // FORZAR RETURN - NO CONTINUAR CON EL CÓDIGO DE ABAJO
    console.log('🎯 ========== RENDERIZANDO SOLO EL TEMA SELECCIONADO (RETORNO INMEDIATO) ==========');
    console.log('🎯 Tema ID:', temaParaMostrar.tema.id);
    console.log('🎯 Tema nombre:', temaParaMostrar.tema.nombre);
    console.log('🎯 Periodo:', temaParaMostrar.periodoNombre);
    console.log('🎯 Tema tiene subtemas:', temaParaMostrar.tema.subtemas?.length || 0);
    console.log('🎯 Usando selectedTemaFromSidebar?', !!selectedTemaFromSidebar);
    console.log('🎯 Usando selectedTema local?', !!selectedTema && !selectedTemaFromSidebar);
    console.log('🎯 NO se mostrarán otros temas, solo este:', temaParaMostrar.tema.nombre);
    console.log('🎯 ⚠️ IMPORTANTE: Este return DEBE ejecutarse y NO continuar con el código de abajo');
    
    // Asegurarse de que solo tenemos los subtemas de este tema específico
    // IMPORTANTE: El tema ya viene filtrado desde el sidebar (solo contiene el subtema seleccionado)
    // Solo necesitamos asegurarnos de que los subtemas sean válidos
    const temaFiltrado = {
      ...temaParaMostrar.tema,
      subtemas: (temaParaMostrar.tema.subtemas || []).filter((st: any) => {
        // Asegurar que solo tenemos subtemas válidos
        return st && st.id;
      })
    };
    
    console.log('🎯 Tema filtrado - cantidad de subtemas:', temaFiltrado.subtemas.length);
    console.log('🎯 ⚠️ IMPORTANTE: Si hay más de 1 subtema, debería haber solo 1 (el seleccionado)');
    
    console.log('🎯 Tema filtrado - solo subtemas de este tema:', temaFiltrado.subtemas.length);
    console.log('🎯 Nombres de subtemas:', temaFiltrado.subtemas.map((st: any) => st.nombre));
    console.log('🎯 RETORNANDO - NO se mostrarán otros temas del periodo');
    
    // RETORNAR INMEDIATAMENTE - NO continuar con el código de abajo que muestra todos los periodos
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Título del tema */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button
              onClick={() => {
                setSelectedTema(null);
                if (onTemaClear) {
                  onTemaClear();
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              ← Volver
            </button>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                padding: '0.25rem 0.5rem',
                background: '#f3f4f6',
                borderRadius: '4px',
              }}
            >
              {temaParaMostrar.periodoNombre}
            </div>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '0.75rem',
            }}
          >
            {temaParaMostrar.tema.nombre}
          </h1>
              {temaParaMostrar.tema.descripcion && (
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#4b5563',
                    lineHeight: '1.6',
                    maxWidth: '800px',
                  }}
                >
                  {temaParaMostrar.tema.descripcion}
                </p>
              )}
        </div>

        {/* Subtemas - SOLO los subtemas de este tema específico */}
        {temaFiltrado.subtemas && temaFiltrado.subtemas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {temaFiltrado.subtemas.map((subtema) => {
              console.log('🎯 Renderizando subtema:', subtema.nombre, 'del tema:', temaParaMostrar.tema.nombre);
              return (
                <div
                  key={subtema.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '2rem',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                >
                {/* Nombre del subtema */}
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '0.75rem',
                  }}
                >
                  {subtema.nombre}
                </h2>
                {subtema.descripcion && (
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#6b7280',
                      marginBottom: '1.5rem',
                      lineHeight: '1.6',
                    }}
                  >
                    {subtema.descripcion}
                  </p>
                )}

                {/* Contenidos del subtema */}
                {subtema.contenido && subtema.contenido.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '1.25rem',
                      }}
                    >
                      Contenidos
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {subtema.contenido.map((contenido) => (
                        <div
                          key={contenido.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            padding: '1.5rem',
                            background: '#f9fafb',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>
                              {contenido.tipo === 'video' && '🎥'}
                              {contenido.tipo === 'archivo' && '📎'}
                              {contenido.tipo === 'foro' && '💬'}
                            </span>
                            <h4
                              style={{
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                color: '#111827',
                              }}
                            >
                              {contenido.titulo}
                            </h4>
                          </div>
                          {contenido.descripcion && (
                            <p
                              style={{
                                fontSize: '0.95rem',
                                color: '#6b7280',
                                marginBottom: '1rem',
                                lineHeight: '1.6',
                              }}
                            >
                              {contenido.descripcion}
                            </p>
                          )}

                          {/* Video */}
                          {contenido.tipo === 'video' && contenido.url && (() => {
                            const embedUrl = getYouTubeEmbedUrl(contenido.url);
                            if (embedUrl) {
                              return (
                                <div
                                  style={{
                                    position: 'relative',
                                    paddingBottom: '56.25%',
                                    height: 0,
                                    overflow: 'hidden',
                                    borderRadius: '10px',
                                    background: '#000',
                                    marginBottom: '0.75rem',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                  }}
                                >
                                  <iframe
                                    src={embedUrl}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                    }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Archivos */}
                          {contenido.tipo === 'archivo' && contenido.archivo_url && (() => {
                            let files: string[] = [];
                            try {
                              const parsed = JSON.parse(contenido.archivo_url);
                              files = Array.isArray(parsed) ? parsed : [contenido.archivo_url];
                            } catch {
                              files = [contenido.archivo_url];
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {files.map((fileUrl, idx) => (
                                  <a
                                    key={idx}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.75rem 1.25rem',
                                      borderRadius: '8px',
                                      background: '#2563eb',
                                      color: 'white',
                                      fontSize: '0.95rem',
                                      textDecoration: 'none',
                                      width: 'fit-content',
                                      fontWeight: 500,
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#1d4ed8';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#2563eb';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
                                    📄 Ver archivo {files.length > 1 ? `${idx + 1}` : ''}
                                  </a>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quices del subtema */}
                {loadingQuizzes ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                    Cargando quices...
                  </div>
                ) : (
                  quizzesPorSubtema[subtema.id] && quizzesPorSubtema[subtema.id].length > 0 && (
                    <div>
                      <h3
                        style={{
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '1.25rem',
                        }}
                      >
                        Quices
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {quizzesPorSubtema[subtema.id].map((quiz) => (
                          <div
                            key={quiz.id}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '10px',
                              padding: '1.5rem',
                              background: '#fef3c7',
                            }}
                          >
                            <h4
                              style={{
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                color: '#92400e',
                                marginBottom: '0.75rem',
                              }}
                            >
                              📝 {quiz.nombre}
                            </h4>
                            {quiz.descripcion && (
                              <p
                                style={{
                                  fontSize: '0.95rem',
                                  color: '#78350f',
                                  marginBottom: '0.75rem',
                                  lineHeight: '1.6',
                                }}
                              >
                                {quiz.descripcion}
                              </p>
                            )}
                            <div
                              style={{
                                fontSize: '0.875rem',
                                color: '#92400e',
                                display: 'flex',
                                gap: '1.5rem',
                                marginBottom: '1rem',
                              }}
                            >
                              <div>
                                <strong>Fecha inicio:</strong> {new Date(quiz.fecha_inicio).toLocaleDateString()}
                              </div>
                              <div>
                                <strong>Fecha fin:</strong> {new Date(quiz.fecha_fin).toLocaleDateString()}
                              </div>
                            </div>
                            {/* Botón para presentar el quiz con conteo regresivo */}
                            <QuizAvailabilityButton
                              quiz={quiz}
                              onStart={() => setSelectedQuizId(quiz.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
                </div>
              );
            })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
              <p>Este tema no tiene subtemas aún.</p>
            </div>
          )}
        </div>
      );
    }

    // ============================================
    // SI LLEGAMOS AQUÍ, NO HAY TEMA SELECCIONADO
    // MOSTRAR LA VISTA NORMAL CON TODOS LOS PERIODOS
    // ============================================
    console.log('📋 ========== NO HAY TEMA SELECCIONADO - MOSTRANDO TODOS LOS PERIODOS ==========');
  console.log('📋 ⚠️ ADVERTENCIA: Si ves este log cuando hay un tema seleccionado, hay un problema');
  console.log('📋 selectedTemaFromSidebar:', selectedTemaFromSidebar);
  console.log('📋 selectedTema local:', selectedTema);
  console.log('📋 temaParaMostrar:', temaParaMostrar);
  console.log('📋 tieneTemaValido era:', tieneTemaValido);
  if (temaParaMostrar) {
    console.log('📋 ⚠️ PROBLEMA: Hay temaParaMostrar pero tieneTemaValido era false');
    console.log('📋 temaParaMostrar.tema:', temaParaMostrar.tema);
    console.log('📋 temaParaMostrar.tema.id:', temaParaMostrar.tema?.id);
    console.log('📋 temaParaMostrar.periodoNombre:', temaParaMostrar.periodoNombre);
  }

  if (!subjectId) {
    return (
      <div className="dashboard-welcome">
        <h1 className="welcome-title">Bienvenido a tu Aula Virtual</h1>
        <p className="welcome-description">
          A la izquierda selecciona una materia para ver sus periodos y contenidos.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Cargando contenidos de la materia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-welcome">
        <h1 className="welcome-title">{subjectName}</h1>
        <p className="welcome-description" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      </div>
    );
  }

  // Vista normal: mostrar todos los periodos con todos sus temas
  console.log('📋 Renderizando vista normal con todos los periodos');
  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
      {/* Lista de periodos/temas/subtemas/contenidos */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>
            {subjectName}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Haz clic en un tema para ver toda su información. Los periodos se muestran en orden.
          </p>
        </div>

        {periodos.length === 0 ? (
          <div className="dashboard-welcome">
            <p className="welcome-description">
              Todavía no hay contenidos publicados para esta materia.
            </p>
          </div>
        ) : (
          periodos.map((periodo) => (
            <div
              key={periodo.id}
              style={{
                marginBottom: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                background: 'white',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  console.log('🖱️ Click en periodo:', periodo.id);
                  togglePeriodo(periodo.id);
                }}
                style={{
                  width: '100%',
                  padding: '0.9rem 1rem',
                  border: 'none',
                  borderBottom: expandedPeriodoId === periodo.id ? '1px solid #f3f4f6' : 'none',
                  background: 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: '0.15rem',
                    }}
                  >
                    {periodo.nombre}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#6b7280',
                    }}
                  >
                    {getPeriodNumberName(periodo.numero_periodo)} periodo
                  </div>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: expandedPeriodoId === periodo.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease-in-out',
                    color: '#6b7280',
                    flexShrink: 0,
                  }}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedPeriodoId === periodo.id && (
              <div style={{ padding: '0.75rem 1rem 0.9rem 1rem' }}>
                {(!periodo.temas || periodo.temas.length === 0) && (
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: '#9ca3af',
                      marginBottom: 0,
                    }}
                  >
                    No hay temas cargados aún para este periodo.
                  </p>
                )}
                {periodo.temas?.map((tema) => (
                  <div key={tema.id} style={{ marginBottom: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setSelectedTema({ tema, periodoNombre: periodo.nombre });
                        setSelectedContent(null);
                      }}
                      style={{
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        color: '#111827',
                        marginBottom: '0.25rem',
                        background: selectedTema?.tema.id === tema.id ? '#eff6ff' : 'transparent',
                        border: selectedTema?.tema.id === tema.id ? '1px solid #3b82f6' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedTema?.tema.id !== tema.id) {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTema?.tema.id !== tema.id) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                    >
                      {tema.nombre}
                    </button>
                    {(!tema.subtemas || tema.subtemas.length === 0) && (
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: '#9ca3af',
                          marginLeft: '0.75rem',
                          marginBottom: 0,
                        }}
                      >
                        Sin subtemas.
                      </p>
                    )}
                    {tema.subtemas?.map((subtema) => (
                      <div
                        key={subtema.id}
                        style={{
                          marginLeft: '0.75rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#374151',
                            marginBottom: '0.2rem',
                          }}
                        >
                          {subtema.nombre}
                        </div>
                        {(!subtema.contenido || subtema.contenido.length === 0) && (
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: '#9ca3af',
                              marginLeft: '0.75rem',
                              marginBottom: 0,
                            }}
                          >
                            Sin contenidos.
                          </p>
                        )}
                        {subtema.contenido?.map((contenido) => (
                          <button
                            key={contenido.id}
                            onClick={() => setSelectedContent(contenido)}
                            style={{
                              marginLeft: '0.75rem',
                              marginTop: '0.15rem',
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              background:
                                selectedContent?.id === contenido.id ? '#eff6ff' : '#f9fafb',
                              color: '#111827',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 500,
                                marginRight: '0.4rem',
                              }}
                            >
                              {contenido.titulo}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                              }}
                            >
                              {contenido.tipo === 'video' 
                                ? 'Video' 
                                : (contenido.tipo === 'archivo' 
                                ? 'Archivo' 
                                : 'Foro')}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Panel de contenido seleccionado */}
      <div
        style={{
          width: '50%',
          minWidth: '400px',
          borderLeft: '1px solid #e5e7eb',
          paddingLeft: '1.5rem',
          paddingRight: '1rem',
          overflowY: 'auto',
        }}
      >
        {!selectedTema ? (
          !selectedContent ? (
          <div className="dashboard-welcome" style={{ paddingTop: '1.5rem' }}>
            <h2 className="welcome-title" style={{ fontSize: '1.2rem' }}>
                Selecciona un tema
            </h2>
            <p className="welcome-description">
                Haz clic en un tema de la lista para ver toda su información, contenidos y quices.
            </p>
          </div>
        ) : (
          <div style={{ paddingTop: '1.25rem' }}>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '0.4rem',
              }}
            >
              {selectedContent.titulo}
            </h2>
            {selectedContent.descripcion && (
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#4b5563',
                  marginBottom: '0.75rem',
                }}
              >
                {selectedContent.descripcion}
              </p>
            )}

            {selectedContent.tipo === 'video' && selectedContent.url && (() => {
              const embedUrl = getYouTubeEmbedUrl(selectedContent.url);
              if (!embedUrl) {
                return (
                  <div
                    style={{
                      padding: '2rem',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#6b7280',
                    }}
                  >
                    <p>URL de video no válida</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {selectedContent.url}
                    </p>
                  </div>
                );
              }
              return (
                <div
                  style={{
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: '8px',
                    background: '#000',
                  }}
                >
                  <iframe
                    src={embedUrl}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            })()}

            {selectedContent.tipo === 'archivo' && selectedContent.archivo_url && (
              <div style={{ marginTop: '0.75rem' }}>
                <a
                  href={Array.isArray(selectedContent.archivo_url) ? selectedContent.archivo_url[0] : selectedContent.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: 'white',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  Ver archivo
                </a>
              </div>
            )}

            {selectedContent.tipo === 'foro' && (
              <p
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.9rem',
                  color: '#4b5563',
                }}
              >
                Este es un foro. La funcionalidad completa del foro se implementará aquí.
              </p>
            )}
          </div>
          )
        ) : (
          <div style={{ paddingTop: '1.5rem' }}>
            {/* Título del tema */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <button
                  onClick={() => {
                    setSelectedTema(null);
                    if (onTemaClear) {
                      onTemaClear();
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  ← Volver
                </button>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    padding: '0.25rem 0.5rem',
                    background: '#f3f4f6',
                    borderRadius: '4px',
                  }}
                >
                  {selectedTema?.periodoNombre || ''}
                </div>
              </div>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '0.5rem',
                }}
              >
                {selectedTema?.tema.nombre || ''}
              </h1>
              {selectedTema?.tema.descripcion && (
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: '#4b5563',
                    lineHeight: '1.6',
                  }}
                >
                  {selectedTema.tema.descripcion}
                </p>
        )}
      </div>

            {/* Subtemas */}
            {selectedTema?.tema.subtemas && selectedTema.tema.subtemas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {selectedTema.tema.subtemas.map((subtema) => (
                  <div
                    key={subtema.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      background: 'white',
                    }}
                  >
                    {/* Nombre del subtema */}
                    <h2
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: '#111827',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {subtema.nombre}
                    </h2>
                    {subtema.descripcion && (
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: '#6b7280',
                          marginBottom: '1rem',
                        }}
                      >
                        {subtema.descripcion}
                      </p>
                    )}

                    {/* Contenidos del subtema */}
                    {subtema.contenido && subtema.contenido.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#374151',
                            marginBottom: '1rem',
                          }}
                        >
                          Contenidos
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {subtema.contenido.map((contenido) => (
                            <div
                              key={contenido.id}
                              style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '1rem',
                                background: '#f9fafb',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>
                                  {contenido.tipo === 'video' && '🎥'}
                                  {contenido.tipo === 'archivo' && '📎'}
                                  {contenido.tipo === 'foro' && '💬'}
                                </span>
                                <h4
                                  style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: '#111827',
                                  }}
                                >
                                  {contenido.titulo}
                                </h4>
                              </div>
                              {contenido.descripcion && (
                                <p
                                  style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    marginBottom: '0.75rem',
                                  }}
                                >
                                  {contenido.descripcion}
                                </p>
                              )}

                              {/* Video */}
                              {contenido.tipo === 'video' && contenido.url && (() => {
                                const embedUrl = getYouTubeEmbedUrl(contenido.url);
                                if (embedUrl) {
                                  return (
                                    <div
                                      style={{
                                        position: 'relative',
                                        paddingBottom: '56.25%',
                                        height: 0,
                                        overflow: 'hidden',
                                        borderRadius: '8px',
                                        background: '#000',
                                        marginBottom: '0.5rem',
                                      }}
                                    >
                                      <iframe
                                        src={embedUrl}
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          width: '100%',
                                          height: '100%',
                                          border: 'none',
                                        }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
    </div>
  );
}
                                return null;
                              })()}

                              {/* Archivos */}
                              {contenido.tipo === 'archivo' && contenido.archivo_url && (() => {
                                let files: string[] = [];
                                try {
                                  const parsed = JSON.parse(contenido.archivo_url);
                                  files = Array.isArray(parsed) ? parsed : [contenido.archivo_url];
                                } catch {
                                  files = [contenido.archivo_url];
                                }

                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {files.map((fileUrl, idx) => (
                                      <a
                                        key={idx}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          padding: '0.5rem 0.9rem',
                                          borderRadius: '6px',
                                          background: '#2563eb',
                                          color: 'white',
                                          fontSize: '0.85rem',
                                          textDecoration: 'none',
                                          width: 'fit-content',
                                        }}
                                      >
                                        📄 Ver archivo {files.length > 1 ? `${idx + 1}` : ''}
                                      </a>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quices del subtema */}
                    {loadingQuizzes ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                        Cargando quices...
                      </div>
                    ) : quizzesPorSubtema[subtema.id] && quizzesPorSubtema[subtema.id].length > 0 && (
                      <div>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#374151',
                            marginBottom: '1rem',
                          }}
                        >
                          Quices
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {quizzesPorSubtema[subtema.id].map((quiz) => (
                            <div
                              key={quiz.id}
                              style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '1rem',
                                background: '#fef3c7',
                              }}
                            >
                              <h4
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  color: '#92400e',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                📝 {quiz.nombre}
                              </h4>
                              {quiz.descripcion && (
                                <p
                                  style={{
                                    fontSize: '0.875rem',
                                    color: '#78350f',
                                    marginBottom: '0.5rem',
                                  }}
                                >
                                  {quiz.descripcion}
                                </p>
                              )}
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#92400e',
                                }}
                              >
                                <div>
                                  Fecha inicio: {new Date(quiz.fecha_inicio).toLocaleDateString()}
                                </div>
                                <div>
                                  Fecha fin: {new Date(quiz.fecha_fin).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                <p>Este tema no tiene subtemas aún.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


