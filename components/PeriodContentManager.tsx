'use client';

import { useState } from 'react';
import '../app/css/create-admin.css';
import '../app/css/course-subjects.css';

interface PeriodContentManagerProps {
  periodId: string;
  periodName: string;
  onClose: () => void;
}

export default function PeriodContentManager({ 
  periodId, 
  periodName, 
  onClose 
}: PeriodContentManagerProps) {
  const [activeView, setActiveView] = useState<'temas' | 'subtemas' | 'contenido'>('temas');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container course-subjects-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Crear Contenido</h2>
            <p className="modal-subtitle">{periodName}</p>
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
            {activeView === 'temas' && (
              <div className="content-section">
                <p className="coming-soon">Gestión de Temas - Próximamente</p>
                <p className="coming-soon-desc">Aquí podrás crear y gestionar los temas de este periodo</p>
              </div>
            )}
            {activeView === 'subtemas' && (
              <div className="content-section">
                <p className="coming-soon">Gestión de Subtemas - Próximamente</p>
                <p className="coming-soon-desc">Aquí podrás crear y gestionar los subtemas de cada tema</p>
              </div>
            )}
            {activeView === 'contenido' && (
              <div className="content-section">
                <p className="coming-soon">Gestión de Contenido - Próximamente</p>
                <p className="coming-soon-desc">Aquí podrás agregar videos, archivos y foros a cada subtema</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

