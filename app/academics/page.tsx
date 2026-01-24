'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../css/academics.css';
import { useLanguage } from '@/contexts/LanguageContext';

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

interface CursosPorNivel {
  [key: string]: Curso[];
}

export default function Academics() {
  const { t } = useLanguage();
  const [cursosPorNivel, setCursosPorNivel] = useState<CursosPorNivel>({
    'Primaria': [],
    'Bachillerato': [],
    'Técnico': [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarCursos();
  }, []);

  const cargarCursos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/courses/get-courses-public');
      
      if (!response.ok) {
        throw new Error('Error al cargar los cursos');
      }

      const result = await response.json();

      if (result.success) {
        setCursosPorNivel(result.cursosPorNivel || {
          'Primaria': [],
          'Bachillerato': [],
          'Técnico': [],
        });
      } else {
        throw new Error(result.error || 'Error al cargar los cursos');
      }
    } catch (err: any) {
      console.error('Error al cargar cursos:', err);
      setError(err.message || 'Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const niveles = [
    { 
      key: 'Primaria', 
      label: t('academics.primary'), 
      icon: '📚',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1))'
    },
    { 
      key: 'Bachillerato', 
      label: t('academics.highSchool'), 
      icon: '🎓',
      color: '#9333ea',
      gradient: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(124, 58, 237, 0.1))'
    },
    { 
      key: 'Técnico', 
      label: t('academics.technical'), 
      icon: '🔧',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))'
    },
  ];

  if (loading) {
    return (
      <main className="academics-main">
        <div className="academics-container">
          <div className="loading-container">
            <p>Cargando oferta académica...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="academics-main">
        <div className="academics-container">
          <div className="error-container">
            <p>{error}</p>
            <button onClick={cargarCursos} className="retry-button">
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="academics-main">
      <div className="academics-container">
        {/* Hero Section */}
        <div className="academics-hero">
          <h1 className="academics-title">{t('academics.title')}</h1>
          <p className="academics-subtitle">{t('academics.subtitle')}</p>
        </div>

        {/* Niveles Académicos */}
        {niveles.map((nivel) => {
          const cursos = cursosPorNivel[nivel.key] || [];
          const tieneCursos = cursos.length > 0;
          const esTecnico = nivel.key === 'Técnico';

          return (
            <div key={nivel.key} className="nivel-section">
              <div className="nivel-header" style={{ background: nivel.gradient }}>
                <div className="nivel-header-content">
                  <div className="nivel-icon-wrapper" style={{ color: nivel.color }}>
                    <span className="nivel-icon">{nivel.icon}</span>
                  </div>
                  <div className="nivel-title-wrapper">
                    <h2 className="nivel-title">{nivel.label}</h2>
                    {tieneCursos && (
                      <span className="nivel-count">{cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="nivel-content">
                {esTecnico && !tieneCursos ? (
                  <div className="coming-soon-card">
                    <div className="coming-soon-icon">🚀</div>
                    <h3 className="coming-soon-title">{t('academics.comingSoon')}</h3>
                    <p className="coming-soon-description">{t('academics.comingSoonDescription')}</p>
                  </div>
                ) : tieneCursos ? (
                  <div className="cursos-grid">
                    {cursos.map((curso) => (
                      <div key={curso.id} className="curso-card">
                        <div className="curso-card-header" style={{ background: nivel.gradient }}>
                          <h3 className="curso-nombre">{curso.nombre}</h3>
                        </div>
                        <div className="curso-card-body">
                          <p className="curso-descripcion">{t('academics.courseDescription')}</p>
                          <Link href="/matriculas-presenciales" className="curso-button">
                            {t('academics.enrollNow')}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-courses">
                    <p>{t('academics.noCourses')}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* CTA Section */}
        <div className="academics-cta">
          <h2 className="cta-title">{t('academics.ctaTitle')}</h2>
          <p className="cta-description">{t('academics.ctaDescription')}</p>
          <div className="cta-buttons">
            <Link href="/matriculas-presenciales" className="cta-button cta-button-primary">
              {t('academics.ctaButton1')}
            </Link>
            <Link href="/about" className="cta-button cta-button-secondary">
              {t('academics.ctaButton2')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

