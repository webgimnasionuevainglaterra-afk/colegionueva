'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase-client';
import CreateAdministratorForm from '@/components/CreateAdministratorForm';
import AdministratorsList from '@/components/AdministratorsList';
import CreateCourseForm from '@/components/CreateCourseForm';
import CoursesList from '@/components/CoursesList';
import ContentManager from '@/components/ContentManager';
import CreateTeacherForm from '@/components/CreateTeacherForm';
import TeachersList from '@/components/TeachersList';
import StudentsManager from '@/components/StudentsManager';
import TeacherProgramsView from '@/components/TeacherProgramsView';
import TeacherReportsView from '@/components/TeacherReportsView';
import TeacherDashboard from '@/components/TeacherDashboard';
import TeacherSidebar from '@/components/TeacherSidebar';
import TeacherRightSidebar from '@/components/TeacherRightSidebar';
import StudentDetailView from '@/components/StudentDetailView';
import '../css/dashboard.css';
import '../css/teacher-sidebar.css';

interface AdministratorInfo {
  nombre: string;
  apellido: string;
  foto_url: string | null;
  role: string;
  is_online?: boolean;
}

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
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [isProgramsMenuOpen, setIsProgramsMenuOpen] = useState(false);
  const [isAdmissionsMenuOpen, setIsAdmissionsMenuOpen] = useState(false);
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [coursesRefreshKey, setCoursesRefreshKey] = useState(0);
  const [teachersRefreshKey, setTeachersRefreshKey] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

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
    }
  }, [userRole]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isCreateTeacherModalOpen, setIsCreateTeacherModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdministratorInfo | null>(null);
  const [loadingAdminInfo, setLoadingAdminInfo] = useState(true);

  useEffect(() => {
    console.log('🔍 Dashboard montado, user:', user?.id, 'loading:', loading);
    if (!loading && !user) {
      console.log('⚠️ No hay usuario, redirigiendo a /aula-virtual');
      router.push('/aula-virtual');
    }
  }, [user, loading, router]);

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
          // Si es estudiante, usar la API de estudiantes
          if (userRole === 'estudiante') {
            await fetch('/api/estudiantes/update-user-status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                isOnline: isOnline,
              }),
            });
          } else {
            // Para administradores y profesores, usar la API de admin
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
            });
          }
        }
      } catch (error) {
        console.error('Error al actualizar estado online:', error);
      }
    };

    // Marcar como online cuando se carga la página
    updateOnlineStatus(true);

    // Marcar como offline cuando se cierra la página o se desconecta
    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
        console.log('🔍 Iniciando fetchAdminInfo para usuario:', user.id);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error al obtener sesión:', sessionError);
          setLoadingAdminInfo(false);
          return;
        }

        const token = session?.access_token;

        if (!token) {
          console.warn('⚠️ No hay token de sesión disponible');
          setLoadingAdminInfo(false);
          return;
        }

        console.log('📡 Llamando a /api/admin/get-current-administrator');
        const response = await fetch('/api/admin/get-current-administrator', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('📥 Respuesta recibida:', response.status, response.statusText);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Datos del administrador:', result);
          if (result.success && result.data) {
            setAdminInfo({
              nombre: result.data.nombre || 'Usuario',
              apellido: result.data.apellido || '',
              foto_url: result.data.foto_url,
              role: result.data.role || 'Administrador',
              is_online: result.data.is_online !== undefined ? result.data.is_online : true,
            });
          }
        } else {
          const errorText = await response.text();
          console.error('❌ Error en respuesta:', response.status, errorText);
        }
      } catch (error: any) {
        console.error('❌ Error al obtener información del administrador:', error);
        console.error('❌ Stack trace:', error.stack);
      } finally {
        setLoadingAdminInfo(false);
      }
    };

    if (user) {
      fetchAdminInfo();
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
      if (!target.closest('.admissions-menu-dropdown')) {
        setIsAdmissionsMenuOpen(false);
      }
      if (!target.closest('.reports-menu-dropdown')) {
        setIsReportsMenuOpen(false);
      }
    };

    if (isSettingsOpen || isUsersMenuOpen || isProgramsMenuOpen || isAdmissionsMenuOpen || isReportsMenuOpen) {
      // Pequeño delay para evitar que se cierre inmediatamente al abrir
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isSettingsOpen, isUsersMenuOpen, isProgramsMenuOpen, isAdmissionsMenuOpen, isReportsMenuOpen]);

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
  ];

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
    setIsUsersMenuOpen(false);
    setIsProgramsMenuOpen(false);
    setIsAdmissionsMenuOpen(false);
    setIsReportsMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const programsMenuItems = [
    { id: 'grados', label: 'Gestionar Cursos' },
  ];

  const admissionsMenuItems = [
    { id: 'gestionar-estudiantes', label: 'Gestionar Estudiantes' },
  ];

  // Reportes diferentes según el rol
  const reportsMenuItems = userRole === 'profesor' 
    ? [
        { id: 'reportes-estudiantes', label: 'Reportes estudiantes' },
      ]
    : [
        { id: 'reportes-profesores', label: 'Reportes profesores' },
        { id: 'reportes-estudiantes', label: 'Reportes estudiantes' },
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
                src="/images/logo.jpg"
                alt="Logo"
                width={80}
                height={80}
                className="logo-image"
                unoptimized
              />
            </div>
          </div>
          <div className="header-right">
            <nav className={`header-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
              {/* Dashboard visible para todos */}
              <button
                className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  setActiveMenu('dashboard');
                  setIsMobileMenuOpen(false);
                }}
              >
                Dashboard
              </button>
              {/* Solo mostrar Gestionar Usuarios si no es profesor */}
              {userRole !== 'profesor' && (
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
              {/* Programas Educativos - visible para todos */}
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
              {/* Solo mostrar Admisiones si no es profesor */}
              {userRole !== 'profesor' && (
                <div className="admissions-menu-dropdown">
                  <button
                    className={`menu-item ${isAdmissionsMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsAdmissionsMenuOpen(!isAdmissionsMenuOpen)}
                  >
                    Admisiones
                    <svg
                      className="dropdown-arrow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        transform: isAdmissionsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isAdmissionsMenuOpen && (
                    <div className="users-menu">
                      {admissionsMenuItems.map((item) => (
                        <button
                          key={item.id}
                          className={`users-menu-item ${activeMenu === item.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveMenu(item.id);
                            setIsAdmissionsMenuOpen(false);
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
              {/* Reportes - visible para todos, pero con opciones diferentes */}
              <div className="reports-menu-dropdown">
                <button
                  className={`menu-item ${isReportsMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
                >
                  Reportes
                  <svg
                    className="dropdown-arrow"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{
                      transform: isReportsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isReportsMenuOpen && (
                  <div className="users-menu">
                    {reportsMenuItems.map((item) => (
                      <button
                        key={item.id}
                        className={`users-menu-item ${activeMenu === item.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveMenu(item.id);
                          setIsReportsMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            <button
              className="notifications-button"
              aria-label="Notificaciones"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
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
                      // Aquí puedes agregar la funcionalidad de ajustes si es necesario
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ajustes
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

      {/* Main Content */}
      <div className="dashboard-main" style={{
        display: 'flex',
        flexDirection: userRole === 'profesor' ? 'row' : 'column',
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

        {/* Content Area */}
        <main className={`dashboard-content ${userRole === 'profesor' ? (isRightSidebarOpen ? 'dashboard-content-with-both-sidebars' : 'dashboard-content-with-sidebar') : ''}`} style={{
          flex: 1,
          overflowY: 'auto',
          padding: userRole === 'profesor' && !selectedStudentId ? '2rem' : userRole === 'profesor' ? '0' : undefined,
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
          ) : activeMenu === 'gestionar-estudiantes' || activeMenu === 'alumnos' ? (
            <StudentsManager />
          ) : activeMenu === 'reportes-estudiantes' && userRole === 'profesor' ? (
            <TeacherReportsView />
          ) : activeMenu === 'dashboard' && userRole === 'profesor' ? (
            <TeacherDashboard />
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
      </div>

      {/* Footer fijo fuera del contenedor con overflow - solo para profesores */}
      {userRole === 'profesor' && (
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
              © {new Date().getFullYear()} Colegio Nueva Generación. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

