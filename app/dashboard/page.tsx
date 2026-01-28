'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase-client';
import CreateAdministratorForm from '@/components/CreateAdministratorForm';
import AdministratorsList from '@/components/AdministratorsList';
import CreateCourseForm from '@/components/CreateCourseForm';
import CoursesList from '@/components/CoursesList';
import ContentManager from '@/components/ContentManager';
import ContentStructureManager from '@/components/ContentStructureManager';
import CreateTeacherForm from '@/components/CreateTeacherForm';
import TeachersList from '@/components/TeachersList';
import StudentsManager from '@/components/StudentsManager';
import StudentsListManager from '@/components/StudentsListManager';
import TeacherProgramsView from '@/components/TeacherProgramsView';
import TeacherReportsView from '@/components/TeacherReportsView';
import TeacherDashboard from '@/components/TeacherDashboard';
import TeacherCalendar from '@/components/TeacherCalendar';
import AdminCalendar from '@/components/AdminCalendar';
import EvaluationsResultsView from '@/components/EvaluationsResultsView';
import TeacherSidebar from '@/components/TeacherSidebar';
import TeacherRightSidebar from '@/components/TeacherRightSidebar';
import StudentSidebar from '@/components/StudentSidebar';
import StudentRightSidebar from '@/components/StudentRightSidebar';
import StudentInstitutionalVideo from '@/components/StudentInstitutionalVideo';
import StudentSubjectContent from '@/components/StudentSubjectContent';
import StudentDetailView from '@/components/StudentDetailView';
import TeacherDetailView from '@/components/TeacherDetailView';
import StudentGradesView from '@/components/StudentGradesView';
import InstitutionalVideoManager from '@/components/InstitutionalVideoManager';
import AdminSidebar from '@/components/AdminSidebar';
import AdminRightSidebar from '@/components/AdminRightSidebar';
import MatriculasPresencialesList from '@/components/MatriculasPresencialesList';
import AdminDashboard from '@/components/AdminDashboard';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import '../css/dashboard.css';
import '../css/teacher-sidebar.css';
import '../css/admin-sidebar.css';
import '../css/admin-dashboard.css';

interface AdministratorInfo {
  nombre: string;
  apellido: string;
  foto_url: string | null;
  role: string;
  is_online?: boolean;
}

// Utilidad simple para logs de depuración: solo loguea si no estamos en producción.
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export default function Dashboard() {
  const { user, loading, userRole, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [dashboardError, setDashboardError] = useState<Error | null>(null);

  // Manejo de errores global
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error capturado:', event.error);
      if (event.error) {
        setDashboardError(event.error);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [isProgramsMenuOpen, setIsProgramsMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [coursesRefreshKey, setCoursesRefreshKey] = useState(0);
  const [teachersRefreshKey, setTeachersRefreshKey] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isStudentSidebarOpen, setIsStudentSidebarOpen] = useState(false);
  const [isStudentRightSidebarOpen, setIsStudentRightSidebarOpen] = useState(false);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [isAdminRightSidebarOpen, setIsAdminRightSidebarOpen] = useState(false);
  const [selectedStudentSubjectId, setSelectedStudentSubjectId] = useState<string | null>(null);
  const [selectedStudentSubjectName, setSelectedStudentSubjectName] = useState<string | null>(null);
  const [selectedTema, setSelectedTema] = useState<{ tema: any; periodoNombre: string } | null>(null);
  const [selectedEvaluacionId, setSelectedEvaluacionId] = useState<string | null>(null);
  const [selectedContenidoId, setSelectedContenidoId] = useState<string | null>(null);
  const [selectedMensajeId, setSelectedMensajeId] = useState<string | null>(null);
  const [cargandoContenidoDesdeNotificacion, setCargandoContenidoDesdeNotificacion] = useState(false);
  const [urlParamsProcesados, setUrlParamsProcesados] = useState(false);
  const searchParams = useSearchParams();

  // Debug: Verificar cuando cambia selectedTema (solo en desarrollo)
  useEffect(() => {
    debugLog('🔍 Dashboard - selectedTema cambió:', selectedTema);
    if (selectedTema) {
      debugLog('🔍 Dashboard - Tema seleccionado:', selectedTema.tema.nombre);
      debugLog('🔍 Dashboard - Periodo:', selectedTema.periodoNombre);
    }
  }, [selectedTema]);

  // Callback para manejar la selección de tema - usar useCallback para mantener la referencia estable
  const handleTemaSelect = useCallback((tema: any, periodoNombre: string) => {
    debugLog('📋 ========== CALLBACK onTemaSelect LLAMADO ==========');
    debugLog('📋 Dashboard recibió tema:', tema);
    debugLog('📋 Tema ID:', tema?.id);
    debugLog('📋 Tema nombre:', tema?.nombre);
    debugLog('📋 Periodo:', periodoNombre);
    debugLog('📋 Tema tiene subtemas?', tema?.subtemas?.length || 0);
    debugLog('📋 Subtemas:', tema?.subtemas);
    
    // Validar que el tema existe y tiene la estructura correcta
    if (!tema || !tema.id) {
      console.error('❌ Error: El tema no tiene la estructura correcta:', tema);
      return;
    }
    
    // Crear una copia profunda del tema para asegurar que React detecte el cambio
    const temaData = { 
      tema: { 
        ...tema,
        subtemas: tema.subtemas ? tema.subtemas.map((st: any) => ({ ...st })) : []
      }, 
      periodoNombre 
    };
    
    debugLog('📋 Estableciendo selectedTema:', temaData);
    
    // Usar una función de actualización para asegurar que se actualice correctamente
    setSelectedTema((prevState) => {
      debugLog('📋 setSelectedTema - Estado anterior:', prevState);
      debugLog('📋 setSelectedTema - Nuevo estado:', temaData);
      return temaData;
    });
    
    debugLog('📋 setSelectedTema llamado, debería actualizar el estado');
  }, []);

  // Detectar tamaño de pantalla y ajustar sidebars
  useEffect(() => {
    if (userRole === 'profesor') {
      const checkScreenSize = () => {
        if (window.innerWidth >= 768) {
          setIsSidebarOpen(true); // Abrir en desktop
          setIsRightSidebarOpen(true); // Abrir sidebar derecho en desktop
        } else {
          setIsSidebarOpen(false); // Cerrar en móvil
          setIsRightSidebarOpen(false); // Cerrar sidebar derecho en móvil
        }
      };
      
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      
      return () => window.removeEventListener('resize', checkScreenSize);
    } else if (userRole === 'super_admin') {
      const checkScreenSize = () => {
        if (window.innerWidth >= 768) {
          setIsAdminSidebarOpen(true); // Abrir en desktop
          setIsAdminRightSidebarOpen(true); // Abrir sidebar derecho en desktop
        } else {
          setIsAdminSidebarOpen(false); // Cerrar en móvil
          setIsAdminRightSidebarOpen(false); // Cerrar sidebar derecho en móvil
        }
      };
      
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      
      return () => window.removeEventListener('resize', checkScreenSize);
    } else if (userRole === 'estudiante') {
      const checkScreenSize = () => {
        if (window.innerWidth >= 768) {
          setIsStudentSidebarOpen(true);
        } else {
          setIsStudentSidebarOpen(false);
        }
      };

      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);

      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, [userRole]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isCreateTeacherModalOpen, setIsCreateTeacherModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdministratorInfo | null>(null);
  const [loadingAdminInfo, setLoadingAdminInfo] = useState(true);

  useEffect(() => {
    debugLog('🔍 Dashboard montado, user:', user?.id, 'loading:', loading);
    if (!loading && !user) {
      debugLog('⚠️ No hay usuario, redirigiendo a /aula-virtual');
      router.push('/aula-virtual');
    }
  }, [user, loading, router]);

  // Manejar parámetros de URL para abrir contenido desde notificaciones
  // Este useEffect se ejecuta SOLO UNA VEZ cuando la página se carga
  useEffect(() => {
    // Solo procesar si el usuario ya está cargado y no hemos procesado los parámetros
    if (loading || !userRole || urlParamsProcesados) {
      return;
    }

    // Leer parámetros de la URL usando searchParams de Next.js
    const contenidoId = searchParams.get('contenido_id');
    const mensajeId = searchParams.get('mensaje_id');
    const temaId = searchParams.get('tema_id');
    const materiaId = searchParams.get('materia_id');
    
    // Si no hay parámetros, marcar como procesado y salir
    if (!contenidoId && !temaId) {
      setUrlParamsProcesados(true);
      return;
    }
    
    debugLog('🔍 Procesando parámetros de URL:', { contenidoId, mensajeId, temaId, materiaId });
    
    // Si hay tema_id y materia_id pero no contenido_id, necesitamos buscar el contenido
    // Esto es para notificaciones antiguas o enlaces alternativos
    if ((userRole === 'profesor' || userRole === 'estudiante') && temaId && materiaId && !contenidoId) {
      debugLog('⚠️ URL tiene tema_id y materia_id pero no contenido_id, buscando contenido...');
      
      // Marcar que estamos cargando
      setCargandoContenidoDesdeNotificacion(true);
      
      // Asegurar que el menú activo sea 'dashboard'
      if (activeMenu !== 'dashboard') {
        setActiveMenu('dashboard');
      }
      
      // Buscar el contenido del tema y cargarlo directamente
      const buscarYcargarContenido = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setCargandoContenidoDesdeNotificacion(false);
            return;
          }

          // Obtener el nombre de la materia directamente desde Supabase
          let materiaNombre = 'Materia';
          try {
            const { data: materiaData } = await supabase
              .from('materias')
              .select('nombre')
              .eq('id', materiaId)
              .single();
            
            if (materiaData && materiaData.nombre) {
              materiaNombre = materiaData.nombre;
            }
          } catch (err) {
            console.warn('⚠️ No se pudo obtener el nombre de la materia:', err);
          }

          // Usar la nueva API que obtiene el contenido directamente por tema_id
          debugLog('📥 Obteniendo contenido por tema_id:', temaId);
          
          const response = await fetch(
            `/api/contenido/get-contenido-by-tema?tema_id=${temaId}`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );

          const result = await response.json();
          debugLog('📥 Resultado de get-contenido-by-tema:', { 
            ok: response.ok, 
            status: response.status,
            error: result.error,
            tieneData: !!result.data,
            tieneTema: !!result.data?.tema
          });
          
          if (!response.ok) {
            console.error('❌ Error en la respuesta de la API:', result.error);
            console.error('❌ Status:', response.status);
            setCargandoContenidoDesdeNotificacion(false);
            return;
          }
          
          if (response.ok && result.data && result.data.tema) {
            const temaData = result.data.tema;
            
            // Buscar el primer contenido del tema
            let contenidoEncontrado = null;
            let subtemaConContenido = null;
            
            for (const subtema of temaData.subtemas || []) {
              if (subtema.contenido && subtema.contenido.length > 0) {
                contenidoEncontrado = subtema.contenido[0];
                subtemaConContenido = subtema;
                break;
              }
            }
            
            if (contenidoEncontrado) {
              debugLog('✅ Contenido encontrado para tema:', contenidoEncontrado.id);
              
              const periodoNombre = temaData.periodos?.nombre || 'Periodo';
              const materiaIdFromTema = temaData.periodos?.materias?.id || materiaId;
              const materiaNombreFromTema = temaData.periodos?.materias?.nombre || materiaNombre;
              
              // Establecer el contenido y tema directamente
              setSelectedStudentSubjectId(materiaIdFromTema);
              setSelectedStudentSubjectName(materiaNombreFromTema);
              setSelectedContenidoId(contenidoEncontrado.id);
              if (mensajeId) {
                setSelectedMensajeId(mensajeId);
              }
              
              // Crear el tema con solo el subtema que contiene este contenido
              const temaConSubtema = {
                ...temaData,
                subtemas: [{
                  ...subtemaConContenido,
                  contenido: [contenidoEncontrado]
                }]
              };
              
              debugLog('✅ Estableciendo tema desde tema_id/materia_id:', {
                temaId: temaConSubtema.id,
                temaNombre: temaConSubtema.nombre,
                subtemasCount: temaConSubtema.subtemas?.length,
                periodoNombre: periodoNombre
              });
              
              setSelectedTema({
                tema: temaConSubtema,
                periodoNombre: periodoNombre
              });
              
              setCargandoContenidoDesdeNotificacion(false);
              setUrlParamsProcesados(true);
              
              // Limpiar parámetros de URL
              setTimeout(() => {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('tema_id');
                newUrl.searchParams.delete('materia_id');
                newUrl.searchParams.delete('mensaje_id');
                window.history.replaceState({}, '', newUrl.toString());
                debugLog('🧹 Parámetros de URL limpiados (tema_id/materia_id)');
              }, 1000);
            } else {
              console.warn('⚠️ No se encontró contenido para el tema especificado');
              setCargandoContenidoDesdeNotificacion(false);
              setUrlParamsProcesados(true);
            }
          } else {
            console.error('❌ Error al obtener contenido:', result.error);
            setCargandoContenidoDesdeNotificacion(false);
            setUrlParamsProcesados(true);
          }
        } catch (err) {
          console.error('❌ Error al buscar contenido:', err);
          setCargandoContenidoDesdeNotificacion(false);
          setUrlParamsProcesados(true);
        }
      };

      buscarYcargarContenido();
      return;
    }
    
    // Solo procesar si es profesor o estudiante y hay contenido_id
    if ((userRole === 'profesor' || userRole === 'estudiante') && contenidoId) {
      // Evitar procesar múltiples veces el mismo contenido
      if (selectedContenidoId === contenidoId && selectedTema) {
        debugLog('ℹ️ Contenido ya está cargado, saltando...');
        setUrlParamsProcesados(true);
        return;
      }

      debugLog('✅ Contenido ID encontrado, cargando contenido...');
      
      // Marcar que estamos cargando contenido desde notificación
      setCargandoContenidoDesdeNotificacion(true);
      
      // Asegurar que el menú activo sea 'dashboard' para que se muestre el contenido
      if (activeMenu !== 'dashboard') {
        console.log('🔄 Cambiando activeMenu a dashboard');
        setActiveMenu('dashboard');
      }
      
      setSelectedContenidoId(contenidoId);
      if (mensajeId) {
        setSelectedMensajeId(mensajeId);
      }
      
      // Cargar el contenido y abrir el tema correspondiente
      const cargarContenido = async () => {
        try {
          debugLog('📥 Iniciando carga de contenido...');
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('❌ No hay sesión activa');
            setCargandoContenidoDesdeNotificacion(false);
            return;
          }

          const response = await fetch(
            `/api/contenido/get-contenido-by-id?contenido_id=${contenidoId}`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );

          const result = await response.json();
          debugLog('📥 Respuesta de API:', { ok: response.ok, error: result.error, tieneData: !!result.data });
          
          if (response.ok && result.data) {
            const contenido = result.data;
            debugLog('📥 Contenido cargado:', {
              id: contenido.id,
              titulo: contenido.titulo,
              tieneSubtemas: !!contenido.subtemas,
              tieneTemas: !!contenido.subtemas?.temas,
              tienePeriodos: !!contenido.subtemas?.temas?.periodos,
              tieneMaterias: !!contenido.subtemas?.temas?.periodos?.materias
            });
            
            const materiaId = contenido.subtemas?.temas?.periodos?.materias?.id;
            const materiaNombre = contenido.subtemas?.temas?.periodos?.materias?.nombre;
            
            debugLog('📥 Materia ID:', materiaId, 'Nombre:', materiaNombre);
            
            if (materiaId) {
              debugLog('✅ Estableciendo materia seleccionada:', materiaId, materiaNombre);
              setSelectedStudentSubjectId(materiaId);
              setSelectedStudentSubjectName(materiaNombre);
              
              // Crear el tema con solo el subtema que contiene este contenido
              const tema = contenido.subtemas?.temas;
              if (tema) {
                const temaConSubtema = {
                  ...tema,
                  subtemas: [{
                    ...contenido.subtemas,
                    contenido: [contenido]
                  }]
                };
                
                const periodoNombre = contenido.subtemas?.temas?.periodos?.nombre || 'Periodo';
                debugLog('✅ Estableciendo tema seleccionado:', {
                  temaId: temaConSubtema.id,
                  temaNombre: temaConSubtema.nombre,
                  subtemasCount: temaConSubtema.subtemas?.length,
                  periodoNombre,
                  tieneContenido: temaConSubtema.subtemas?.[0]?.contenido?.length > 0
                });
                
                // Establecer el tema
                setSelectedTema({
                  tema: temaConSubtema,
                  periodoNombre: periodoNombre
                });
                
                // Marcar que terminamos de cargar
                setCargandoContenidoDesdeNotificacion(false);
                
                // Limpiar parámetros de URL después de procesarlos exitosamente
                setTimeout(() => {
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.delete('contenido_id');
                  newUrl.searchParams.delete('mensaje_id');
                  window.history.replaceState({}, '', newUrl.toString());
                  console.log('🧹 Parámetros de URL limpiados');
                }, 1000);
              } else {
                console.warn('⚠️ No se encontró el tema en el contenido');
                setCargandoContenidoDesdeNotificacion(false);
              }
            } else {
              console.warn('⚠️ No se encontró la materia en el contenido');
              setCargandoContenidoDesdeNotificacion(false);
            }
          } else {
            console.error('❌ Error al cargar contenido:', result.error);
            setCargandoContenidoDesdeNotificacion(false);
          }
        } catch (err) {
          console.error('❌ Error al cargar contenido desde URL:', err);
          setCargandoContenidoDesdeNotificacion(false);
        } finally {
          setUrlParamsProcesados(true);
        }
      };

      cargarContenido();
    } else {
      // Si no hay parámetros para procesar, marcar como procesado
      setUrlParamsProcesados(true);
    }
  }, [userRole, loading]); // Solo ejecutar cuando cambien userRole o loading (carga inicial)

  // Error boundary manual
  if (dashboardError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: '#1f2937',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>
          Error en el Dashboard
        </h1>
        <pre style={{
          background: '#374151',
          padding: '1rem',
          borderRadius: '8px',
          maxWidth: '800px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {dashboardError.message}
          {dashboardError.stack && `\n\n${dashboardError.stack}`}
        </pre>
        <button
          onClick={() => {
            setDashboardError(null);
            window.location.reload();
          }}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Recargar página
        </button>
      </div>
    );
  }

  // Actualizar estado online cuando el usuario está conectado
  useEffect(() => {
    if (!user) return;

    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (token) {
          // Usar la API de admin que ahora soporta todos los tipos de usuario
          await fetch('/api/admin/update-user-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: user.id,
              isOnline: isOnline,
            }),
          }).catch((error) => {
            console.error('Error al actualizar estado online:', error);
          });
        }
      } catch (error) {
        console.error('Error al actualizar estado online:', error);
      }
    };

    // Marcar como online cuando se carga la página
    updateOnlineStatus(true);

    // Heartbeat: actualizar estado online cada 30 segundos mientras el usuario está activo
    const heartbeatInterval = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000); // 30 segundos

    // Marcar como offline cuando se cierra la página o se desconecta
    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    // Detectar cuando la página pierde el foco (pestaña inactiva)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Opcional: marcar como offline cuando la pestaña está oculta
        // updateOnlineStatus(false);
      } else {
        // Marcar como online cuando la pestaña vuelve a estar visible
        updateOnlineStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateOnlineStatus(false);
    };
  }, [user, userRole]);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      if (!user) {
        setLoadingAdminInfo(false);
        return;
      }

      try {
        // Obtener sesión y refrescar si es necesario
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error al obtener sesión:', sessionError);
          setLoadingAdminInfo(false);
          return;
        }

        // Si no hay sesión, intentar refrescar
        if (!session) {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshedSession) {
            console.warn('⚠️ No se pudo refrescar la sesión');
            setLoadingAdminInfo(false);
            return;
          }
          session = refreshedSession;
        }

        const token = session?.access_token;

        if (!token) {
          console.warn('⚠️ No hay token de sesión disponible');
          setLoadingAdminInfo(false);
          return;
        }

        const response = await fetch('/api/admin/get-current-administrator', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setAdminInfo({
              nombre: result.data.nombre || 'Usuario',
              apellido: result.data.apellido || '',
              foto_url: result.data.foto_url,
              role: result.data.role || 'Administrador',
              is_online: result.data.is_online !== undefined ? result.data.is_online : false,
            });
          }
        } else if (response.status === 401) {
          // Si el token es inválido, intentar refrescar la sesión
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession) {
            // Reintentar con el nuevo token
            const retryResponse = await fetch('/api/admin/get-current-administrator', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshedSession.access_token}`,
              },
            });
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              if (retryResult.success && retryResult.data) {
                setAdminInfo({
                  nombre: retryResult.data.nombre || 'Usuario',
                  apellido: retryResult.data.apellido || '',
                  foto_url: retryResult.data.foto_url,
                  role: retryResult.data.role || 'Administrador',
                  is_online: retryResult.data.is_online !== undefined ? retryResult.data.is_online : false,
                });
              }
            }
          }
        }
      } catch (error: any) {
        // Silenciar errores de red o de autenticación - no son críticos para el funcionamiento
        console.debug('Error al obtener información del administrador:', error);
      } finally {
        setLoadingAdminInfo(false);
      }
    };

    if (user) {
      fetchAdminInfo();
      
      // Actualizar el estado del perfil periódicamente (cada 10 segundos)
      const refreshInterval = setInterval(() => {
        fetchAdminInfo();
      }, 10000); // 10 segundos

      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.settings-dropdown')) {
        setIsSettingsOpen(false);
      }
      if (!target.closest('.users-menu-dropdown')) {
        setIsUsersMenuOpen(false);
      }
      if (!target.closest('.programs-menu-dropdown')) {
        setIsProgramsMenuOpen(false);
      }
    };

    if (isSettingsOpen || isUsersMenuOpen || isProgramsMenuOpen) {
      // Pequeño delay para evitar que se cierre inmediatamente al abrir
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isSettingsOpen, isUsersMenuOpen, isProgramsMenuOpen]);

  // Abrir automáticamente el modal de crear curso cuando se selecciona "Crear Cursos"
  useEffect(() => {
    if (activeMenu === 'crear-cursos' && !isCreateCourseModalOpen) {
      setIsCreateCourseModalOpen(true);
    }
  }, [activeMenu, isCreateCourseModalOpen]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/aula-virtual');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const usersMenuItems = [
    { id: 'administradores', label: 'Crear Administradores' },
    { id: 'profesores', label: 'Crear Profesores' },
    { id: 'alumnos', label: 'Crear Alumnos' },
    { id: 'gestionar-alumnos', label: 'Gestionar Alumnos' },
  ];

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
    setIsUsersMenuOpen(false);
    setIsProgramsMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const programsMenuItems =
    userRole === 'profesor'
      ? [
          { id: 'crear-cursos', label: 'Crear Cursos' },
          { id: 'grados', label: 'Gestionar Cursos' },
          { id: 'calendario', label: 'Calendario' },
          { id: 'evaluaciones', label: 'Evaluaciones' },
        ]
      : userRole === 'estudiante'
      ? []
      : [
          { id: 'crear-cursos', label: 'Crear Cursos' },
          { id: 'grados', label: 'Gestionar Cursos' },
          { id: 'gestionar-contenidos', label: 'Gestionar Contenidos' },
          { id: 'video-institucional', label: 'Video Institucional' },
          { id: 'matriculas-presenciales', label: 'Matrículas Presenciales' },
          { id: 'calendario', label: 'Calendario' },
        ];


  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="header-left">
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menú"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="header-logo">
              <Image
                src="/images/logovirtual.svg"
                alt="Logo"
                width={265}
                height={98}
                className="logo-image"
                unoptimized
              />
            </div>
          </div>
          <div className="header-right">
            <nav className={`header-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
              {/* Dashboard visible para todos */}
              <button
                className={`menu-item ${activeMenu === 'dashboard' && !selectedTeacherId && !selectedStudentId ? 'active' : ''}`}
                onClick={() => {
                  setActiveMenu('dashboard');
                  setIsMobileMenuOpen(false);
                  // Limpiar selecciones para volver al dashboard principal
                  setSelectedTeacherId(null);
                  setSelectedStudentId(null);
                  // Si es estudiante, limpiar el tema seleccionado para mostrar el video institucional
                  if (userRole === 'estudiante') {
                    setSelectedTema(null);
                    setSelectedStudentSubjectId(null);
                    setSelectedStudentSubjectName(null);
                  }
                }}
              >
                Dashboard
              </button>
              {/* Mis Calificaciones - solo para estudiantes */}
              {userRole === 'estudiante' && (
                <button
                  className={`menu-item ${activeMenu === 'mis-calificaciones' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveMenu('mis-calificaciones');
                    setIsMobileMenuOpen(false);
                    // Limpiar selección de contenido/tema para que no interfiera
                    setSelectedTema(null);
                    setSelectedEvaluacionId(null);
                    setSelectedContenidoId(null);
                    setSelectedMensajeId(null);
                  }}
                >
                  Mis calificaciones
                </button>
              )}
              {/* Solo mostrar Gestionar Usuarios para administradores */}
              {userRole !== 'profesor' && userRole !== 'estudiante' && (
                <div className="users-menu-dropdown">
                  <button
                    className={`menu-item ${isUsersMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsUsersMenuOpen(!isUsersMenuOpen)}
                  >
                    Gestionar Usuarios
                    <svg
                      className="dropdown-arrow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        transform: isUsersMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isUsersMenuOpen && (
                    <div className="users-menu">
                      {usersMenuItems.map((item) => (
                        <button
                          key={item.id}
                          className={`users-menu-item ${activeMenu === item.id ? 'active' : ''}`}
                          onClick={() => handleMenuClick(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Programas Educativos - oculto para estudiantes */}
              {userRole !== 'estudiante' && (
                <div className="programs-menu-dropdown">
                  <button
                    className={`menu-item ${isProgramsMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsProgramsMenuOpen(!isProgramsMenuOpen)}
                  >
                    Programas Educativos
                    <svg
                      className="dropdown-arrow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        transform: isProgramsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isProgramsMenuOpen && (
                    <div className="users-menu">
                      {programsMenuItems.map((item) => (
                        <button
                          key={item.id}
                          className={`users-menu-item ${activeMenu === item.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveMenu(item.id);
                            setIsProgramsMenuOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
            {isMobileMenuOpen && (
              <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}
            <div className="user-info">
              <div className="user-avatar-container">
                <div className="user-avatar">
                  {adminInfo?.foto_url ? (
                    <Image
                      src={adminInfo.foto_url}
                      alt={`${adminInfo.nombre} ${adminInfo.apellido}`}
                      width={40}
                      height={40}
                      className="avatar-image"
                      unoptimized
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {adminInfo ? 
                        `${adminInfo.nombre.charAt(0).toUpperCase()}${adminInfo.apellido.charAt(0).toUpperCase()}` :
                        'U'
                      }
                    </div>
                  )}
                </div>
                {user && adminInfo && (
                  <span 
                    className={`online-status-indicator ${adminInfo.is_online !== false ? 'online' : 'offline'}`} 
                    title={adminInfo.is_online !== false ? 'En línea' : 'Desconectado'}
                  ></span>
                )}
              </div>
              {!loadingAdminInfo && adminInfo && (
                <div className="user-details">
                  <span className="user-name">{adminInfo.nombre} {adminInfo.apellido}</span>
                  <span className="user-role">{adminInfo.role}</span>
                </div>
              )}
              {loadingAdminInfo && (
                <div className="user-details">
                  <span className="user-name">Cargando...</span>
                  <span className="user-role">...</span>
                </div>
              )}
            </div>
            <div className="settings-dropdown">
              <button
                className="settings-button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                aria-label="Configuración"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {isSettingsOpen && (
                <div className="settings-menu" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="settings-menu-item"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsChangePasswordOpen(true);
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Cambiar Contraseña
                  </button>
                  <button 
                    className="settings-menu-item" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsOpen(false);
                      handleSignOut();
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Cambiar Contraseña */}
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Main Content */}
      <div className="dashboard-main" style={{
        display: 'flex',
        flexDirection: (userRole === 'profesor' || userRole === 'super_admin' || userRole === 'estudiante') ? 'row' : 'column',
        height: 'calc(100vh - 80px)',
      }}>
        {/* Sidebar para profesores */}
        {userRole === 'profesor' && (
          <>
            <TeacherSidebar
              onStudentClick={(studentId) => {
                setSelectedStudentId(studentId);
                setIsSidebarOpen(false); // Cerrar sidebar en móvil al seleccionar estudiante
              }}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
            {/* Botón para abrir sidebar en móvil */}
            {!selectedStudentId && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="teacher-floating-btn"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Sidebar izquierdo para super administrador */}
        {userRole === 'super_admin' && activeMenu === 'dashboard' && (
          <>
            <AdminSidebar
              onStudentClick={(studentId) => {
                setSelectedStudentId(studentId);
                setIsAdminSidebarOpen(false); // Cerrar sidebar en móvil
              }}
              isOpen={isAdminSidebarOpen}
              onClose={() => setIsAdminSidebarOpen(false)}
            />
            {/* Botón para abrir sidebar izquierdo en móvil */}
            {!selectedStudentId && (
              <button
                onClick={() => setIsAdminSidebarOpen(true)}
                className="admin-floating-btn-left"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Sidebar izquierdo para estudiantes */}
        {userRole === 'estudiante' && (
          <>
            <StudentSidebar
              isOpen={isStudentSidebarOpen}
              onClose={() => setIsStudentSidebarOpen(false)}
              selectedSubjectId={selectedStudentSubjectId}
              onSubjectSelect={(id, name) => {
                debugLog('📚 Materia seleccionada:', id, name);
                setSelectedStudentSubjectId(id);
                setSelectedStudentSubjectName(name);
                setSelectedTema(null); // Limpiar tema cuando se cambia de materia
                setIsStudentRightSidebarOpen(true);
              }}
            />
            {!isStudentSidebarOpen && (
              <button
                onClick={() => setIsStudentSidebarOpen(true)}
                className="teacher-floating-btn"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ width: '24px', height: '24px' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Content Area */}
        <main className={`dashboard-content ${
          userRole === 'profesor' 
            ? (isRightSidebarOpen ? 'dashboard-content-with-both-sidebars' : 'dashboard-content-with-sidebar')
            : userRole === 'super_admin' && activeMenu === 'dashboard'
            ? (isAdminRightSidebarOpen ? 'dashboard-content-with-both-sidebars' : 'dashboard-content-with-sidebar')
            : userRole === 'estudiante'
            ? (isStudentRightSidebarOpen ? 'dashboard-content-with-both-sidebars' : 'dashboard-content-with-sidebar')
            : ''
        }`} style={{
          flex: 1,
          overflowY: 'auto',
          padding: (userRole === 'profesor' && !selectedStudentId) || (userRole === 'super_admin' && activeMenu === 'dashboard') ? '2rem' : userRole === 'profesor' ? '0' : undefined,
        }}>
          {/* Vista de detalle del estudiante para profesores */}
          {userRole === 'profesor' && selectedStudentId ? (
            <StudentDetailView
              studentId={selectedStudentId}
              onClose={() => setSelectedStudentId(null)}
            />
          ) : activeMenu === 'administradores' ? (
            <div className="administrators-section">
              <div className="administrators-actions">
                <h2 className="section-title">Gestionar Administradores</h2>
                <button 
                  className="create-button"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Administrador
                </button>
              </div>
              <AdministratorsList key={refreshKey} />
              {isCreateModalOpen && (
                <CreateAdministratorForm 
                  onClose={() => setIsCreateModalOpen(false)}
                  onAdministratorCreated={() => {
                    setRefreshKey(prev => prev + 1);
                    setIsCreateModalOpen(false);
                  }}
                />
              )}
            </div>
          ) : activeMenu === 'crear-cursos' ? (
            isCreateCourseModalOpen && (
              <CreateCourseForm 
                onClose={() => {
                  setIsCreateCourseModalOpen(false);
                  setActiveMenu('grados');
                }}
                onCourseCreated={() => {
                  setCoursesRefreshKey(prev => prev + 1);
                  setIsCreateCourseModalOpen(false);
                  setActiveMenu('grados');
                }}
              />
            )
          ) : activeMenu === 'grados' && userRole === 'profesor' ? (
            <TeacherProgramsView />
          ) : activeMenu === 'grados' ? (
            <div className="administrators-section">
              <div className="administrators-actions">
                <h2 className="section-title">Gestionar Cursos</h2>
                <button 
                  className="create-button"
                  onClick={() => setIsCreateCourseModalOpen(true)}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Curso
                </button>
              </div>
              <CoursesList key={coursesRefreshKey} />
              {isCreateCourseModalOpen && (
                <CreateCourseForm 
                  onClose={() => setIsCreateCourseModalOpen(false)}
                  onCourseCreated={() => {
                    setCoursesRefreshKey(prev => prev + 1);
                    setIsCreateCourseModalOpen(false);
                  }}
                />
              )}
            </div>
          ) : activeMenu === 'video-institucional' && userRole === 'super_admin' ? (
            <InstitutionalVideoManager />
          ) : activeMenu === 'matriculas-presenciales' && userRole === 'super_admin' ? (
            <MatriculasPresencialesList />
          ) : activeMenu === 'profesores' ? (
            <div className="administrators-section">
              <div className="administrators-actions">
                <h2 className="section-title">Gestionar Profesores</h2>
                <button 
                  className="create-button"
                  onClick={() => setIsCreateTeacherModalOpen(true)}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Profesor
                </button>
              </div>
              <TeachersList key={teachersRefreshKey} />
              {isCreateTeacherModalOpen && (
                <CreateTeacherForm 
                  onClose={() => setIsCreateTeacherModalOpen(false)}
                  onTeacherCreated={() => {
                    setTeachersRefreshKey(prev => prev + 1);
                    setIsCreateTeacherModalOpen(false);
                  }}
                />
              )}
            </div>
          ) : activeMenu === 'gestionar-alumnos' ? (
            <StudentsListManager />
          ) : activeMenu === 'gestionar-estudiantes' || activeMenu === 'alumnos' ? (
            <StudentsManager />
          ) : activeMenu === 'reportes-estudiantes' && userRole === 'profesor' ? (
            <TeacherReportsView />
          ) : activeMenu === 'calendario' && userRole === 'profesor' ? (
            <TeacherCalendar />
          ) : activeMenu === 'evaluaciones' && userRole === 'profesor' ? (
            <EvaluationsResultsView />
          ) : activeMenu === 'dashboard' && userRole === 'profesor' ? (
            (() => {
              // Si estamos cargando contenido desde notificación, mostrar loading
              if (cargandoContenidoDesdeNotificacion) {
                debugLog('⏳ Cargando contenido desde notificación...');
                return (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '400px',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                      Cargando contenido...
                    </div>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #2563eb',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                  </div>
                );
              }
              
              // Verificar si hay un tema seleccionado (por ejemplo, desde una notificación)
              const tieneTema = selectedTema && selectedTema.tema && selectedTema.tema.id;
              const tieneEvaluacion = selectedEvaluacionId !== null && selectedEvaluacionId !== undefined;
              
              debugLog('🎯 Dashboard profesor - Verificando renderizado:', {
                tieneTema,
                tieneEvaluacion,
                cargandoContenidoDesdeNotificacion,
                selectedTema: selectedTema ? { 
                  id: selectedTema.tema?.id, 
                  nombre: selectedTema.tema?.nombre,
                  tieneSubtemas: selectedTema.tema?.subtemas?.length > 0,
                  subtemasCount: selectedTema.tema?.subtemas?.length
                } : null,
                selectedEvaluacionId,
                selectedStudentSubjectId,
                selectedStudentSubjectName,
                selectedContenidoId,
                selectedMensajeId,
                activeMenu
              });
              
              // Si hay tema o evaluación, mostrar StudentSubjectContent
              if (tieneTema || tieneEvaluacion) {
                debugLog('✅ Dashboard profesor - RENDERIZANDO StudentSubjectContent');
                debugLog('✅ Props que se pasan a StudentSubjectContent:', {
                  subjectId: selectedStudentSubjectId,
                  subjectName: selectedStudentSubjectName,
                  temaId: selectedTema?.tema?.id,
                  temaNombre: selectedTema?.tema?.nombre,
                  contenidoId: selectedContenidoId,
                  mensajeId: selectedMensajeId
                });
                return (
                  <StudentSubjectContent
                    key={`content-${selectedTema?.tema?.id || selectedEvaluacionId || selectedContenidoId || 'default'}`}
                    subjectId={selectedStudentSubjectId}
                    subjectName={selectedStudentSubjectName}
                    selectedTemaFromSidebar={selectedTema}
                    onTemaClear={() => {
                      setSelectedTema(null);
                      setCargandoContenidoDesdeNotificacion(false);
                      setSelectedContenidoId(null);
                      setSelectedMensajeId(null);
                    }}
                    selectedEvaluacionId={selectedEvaluacionId}
                    onEvaluacionClear={() => {
                      setSelectedEvaluacionId(null);
                    }}
                    selectedContenidoId={selectedContenidoId}
                    selectedMensajeId={selectedMensajeId}
                  />
                );
              } else {
                // Si no hay tema seleccionado, mostrar el dashboard normal del profesor
                debugLog('ℹ️ Dashboard profesor - Mostrando TeacherDashboard (no hay tema seleccionado)');
                debugLog('ℹ️ Razón:', {
                  selectedTemaEsNull: selectedTema === null,
                  selectedTemaNoTieneTema: !selectedTema?.tema,
                  selectedTemaNoTieneId: !selectedTema?.tema?.id,
                  selectedEvaluacionIdEsNull: selectedEvaluacionId === null
                });
                return (
                  <TeacherDashboard 
                    onContenidoSelect={(contenidoId: string) => {
                      // Manejar selección de contenido sin recargar página
                      setSelectedContenidoId(contenidoId);
                      setActiveMenu('dashboard');
                      
                      // Cargar contenido directamente
                      const cargarContenidoDirecto = async () => {
                        try {
                          setCargandoContenidoDesdeNotificacion(true);
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) return;

                          const response = await fetch(
                            `/api/contenido/get-contenido-by-id?contenido_id=${contenidoId}`,
                            {
                              headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                              },
                            }
                          );

                          const result = await response.json();
                          
                          if (response.ok && result.data) {
                            const contenido = result.data;
                            const materiaId = contenido.subtemas?.temas?.periodos?.materias?.id;
                            const materiaNombre = contenido.subtemas?.temas?.periodos?.materias?.nombre;
                            
                            if (materiaId) {
                              setSelectedStudentSubjectId(materiaId);
                              setSelectedStudentSubjectName(materiaNombre);
                              
                              const tema = contenido.subtemas?.temas;
                              if (tema) {
                                const temaConSubtema = {
                                  ...tema,
                                  subtemas: [{
                                    ...contenido.subtemas,
                                    contenido: [contenido]
                                  }]
                                };
                                
                                const periodoNombre = contenido.subtemas?.temas?.periodos?.nombre || 'Periodo';
                                setSelectedTema({
                                  tema: temaConSubtema,
                                  periodoNombre: periodoNombre
                                });
                              }
                            }
                          }
                        } catch (err) {
                          console.error('Error al cargar contenido:', err);
                        } finally {
                          setCargandoContenidoDesdeNotificacion(false);
                        }
                      };
                      
                      cargarContenidoDirecto();
                    }}
                  />
                );
              }
            })()
          ) : activeMenu === 'dashboard' && userRole === 'super_admin' && selectedStudentId ? (
            <StudentDetailView
              studentId={selectedStudentId}
              onClose={() => setSelectedStudentId(null)}
            />
          ) : activeMenu === 'dashboard' && userRole === 'super_admin' && selectedTeacherId ? (
            <TeacherDetailView
              teacherId={selectedTeacherId}
              onClose={() => setSelectedTeacherId(null)}
            />
          ) : activeMenu === 'gestionar-contenidos' && userRole === 'super_admin' ? (
            <ContentStructureManager />
          ) : activeMenu === 'calendario' && userRole === 'super_admin' ? (
            <AdminCalendar />
          ) : activeMenu === 'dashboard' && userRole === 'super_admin' ? (
            <AdminDashboard />
          ) : activeMenu === 'mis-calificaciones' && userRole === 'estudiante' ? (
            <StudentGradesView />
          ) : activeMenu === 'dashboard' && userRole === 'estudiante' ? (
            (() => {
              // Verificar si hay un tema seleccionado o una evaluación seleccionada
              const tieneTema = selectedTema && selectedTema.tema && selectedTema.tema.id;
              const tieneEvaluacion = selectedEvaluacionId !== null && selectedEvaluacionId !== undefined;
              
              debugLog('🔍 Dashboard - Verificación de tema y evaluación:', {
                selectedTema,
                tieneTema,
                temaId: selectedTema?.tema?.id,
                temaNombre: selectedTema?.tema?.nombre,
                selectedEvaluacionId,
                tieneEvaluacion,
                esNull: selectedTema === null,
                esUndefined: selectedTema === undefined
              });
              
              // Si hay tema o evaluación, mostrar StudentSubjectContent
              if (tieneTema || tieneEvaluacion) {
                debugLog('🎯 Dashboard renderizando StudentSubjectContent con tema:', selectedTema, 'o evaluación:', selectedEvaluacionId);
                return (
                  <StudentSubjectContent
                    key={`content-${selectedTema?.tema?.id || selectedEvaluacionId || selectedContenidoId || 'default'}`}
                    subjectId={selectedStudentSubjectId}
                    subjectName={selectedStudentSubjectName}
                    selectedTemaFromSidebar={selectedTema}
                    onTemaClear={() => {
                      debugLog('🔄 Limpiando tema desde dashboard');
                      setSelectedTema(null);
                    }}
                    selectedEvaluacionId={selectedEvaluacionId}
                    onEvaluacionClear={() => {
                      debugLog('🔄 Limpiando evaluación desde dashboard');
                      setSelectedEvaluacionId(null);
                    }}
                    selectedContenidoId={selectedContenidoId}
                    selectedMensajeId={selectedMensajeId}
                  />
                );
              } else {
                debugLog('📺 Dashboard mostrando StudentInstitutionalVideo (no hay tema ni evaluación seleccionada)');
                debugLog('📺 selectedTema valor:', selectedTema);
                debugLog('📺 selectedTema.tema valor:', selectedTema?.tema);
                debugLog('📺 selectedEvaluacionId valor:', selectedEvaluacionId);
                return (
                  <StudentInstitutionalVideo 
                    onContenidoSelect={(contenidoId: string) => {
                      // Manejar selección de contenido sin recargar página
                      setSelectedContenidoId(contenidoId);
                      setActiveMenu('dashboard');
                      
                      // Cargar contenido directamente
                      const cargarContenidoDirecto = async () => {
                        try {
                          setCargandoContenidoDesdeNotificacion(true);
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) return;

                          const response = await fetch(
                            `/api/contenido/get-contenido-by-id?contenido_id=${contenidoId}`,
                            {
                              headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                              },
                            }
                          );

                          const result = await response.json();
                          
                          if (response.ok && result.data) {
                            const contenido = result.data;
                            const materiaId = contenido.subtemas?.temas?.periodos?.materias?.id;
                            const materiaNombre = contenido.subtemas?.temas?.periodos?.materias?.nombre;
                            
                            if (materiaId) {
                              setSelectedStudentSubjectId(materiaId);
                              setSelectedStudentSubjectName(materiaNombre);
                              
                              const tema = contenido.subtemas?.temas;
                              if (tema) {
                                const temaConSubtema = {
                                  ...tema,
                                  subtemas: [{
                                    ...contenido.subtemas,
                                    contenido: [contenido]
                                  }]
                                };
                                
                                const periodoNombre = contenido.subtemas?.temas?.periodos?.nombre || 'Periodo';
                                setSelectedTema({
                                  tema: temaConSubtema,
                                  periodoNombre: periodoNombre
                                });
                              }
                            }
                          }
                        } catch (err) {
                          console.error('Error al cargar contenido:', err);
                        } finally {
                          setCargandoContenidoDesdeNotificacion(false);
                        }
                      };
                      
                      cargarContenidoDirecto();
                    }}
                  />
                );
              }
            })()
          ) : activeMenu === 'dashboard' ? (
            <div className="dashboard-welcome">
              <h1 className="welcome-title">
                Bienvenido al Panel de Administración
              </h1>
              <p className="welcome-description">
                Selecciona una opción del menú superior para comenzar a gestionar la plataforma.
              </p>
            </div>
          ) : (
            <div className="dashboard-welcome">
              <h1 className="welcome-title">
                Bienvenido al Panel de Administración
              </h1>
              <p className="welcome-description">
                Selecciona una opción del menú superior para comenzar a gestionar la plataforma.
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar para profesores - Quizzes y Evaluaciones */}
        {userRole === 'profesor' && (
          <TeacherRightSidebar
            isOpen={isRightSidebarOpen}
            onClose={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* Right Sidebar para super administrador - Profesores */}
        {userRole === 'super_admin' && activeMenu === 'dashboard' && (
          <>
            <AdminRightSidebar
              onTeacherClick={(teacherId) => {
                setSelectedTeacherId(teacherId);
                setIsAdminRightSidebarOpen(false); // Cerrar sidebar en móvil
              }}
              isOpen={isAdminRightSidebarOpen}
              onClose={() => setIsAdminRightSidebarOpen(false)}
            />
            {/* Botón para abrir sidebar derecho en móvil */}
            {!selectedTeacherId && (
              <button
                onClick={() => setIsAdminRightSidebarOpen(true)}
                className="admin-floating-btn-right"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Right Sidebar para estudiantes */}
        {userRole === 'estudiante' && (
          <StudentRightSidebar
            isOpen={isStudentRightSidebarOpen}
            onClose={() => setIsStudentRightSidebarOpen(false)}
            subjectId={selectedStudentSubjectId}
            subjectName={selectedStudentSubjectName}
            onTemaSelect={handleTemaSelect}
            onEvaluacionSelect={(evaluacionId) => {
              debugLog('🔄 Seleccionando evaluación desde sidebar:', evaluacionId);
              setSelectedEvaluacionId(evaluacionId);
            }}
          />
        )}
      </div>

      {/* Footer fijo fuera del contenedor con overflow - para profesores y super administradores */}
      {(userRole === 'profesor' || userRole === 'super_admin') && (
        <footer 
          className="dashboard-footer" 
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            background: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            padding: '1.5rem 0',
            zIndex: 1000,
            boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.05)',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
          }}
        >
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 2rem',
            textAlign: 'center',
          }}>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              margin: 0,
              fontWeight: 500,
            }}>
              © {new Date().getFullYear()} Nueva Inglaterra. Creada por{' '}
              <a 
                href="https://www.iddodevs.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: 'inherit', 
                  textDecoration: 'underline',
                  transition: 'opacity 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Iddodevs
              </a>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

