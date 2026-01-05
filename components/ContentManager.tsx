'use client';

import { useState } from 'react';
import '../app/css/create-admin.css';
import '../app/css/course-subjects.css';

export default function ContentManager() {
  const [activeView, setActiveView] = useState<'temas' | 'subtemas' | 'contenido'>('temas');

  return (
    <div className="administrators-section">
      <div className="administrators-actions">
        <h2 className="section-title">Crear Contenidos</h2>
      </div>

      <div className="content-manager-container">
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
              <p className="coming-soon-desc">Aquí podrás crear y gestionar los temas de cada periodo</p>
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
  );
}

