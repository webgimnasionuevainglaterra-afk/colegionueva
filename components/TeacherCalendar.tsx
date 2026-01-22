'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/teacher-calendar.css';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'periodo' | 'quiz' | 'evaluacion';
  start: string;
  end: string;
  curso?: string;
  materia?: string;
  periodo?: string;
  subtema?: string;
}

export default function TeacherCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'periodo' | 'quiz' | 'evaluacion'>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/teachers/get-calendar-events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los eventos');
      }

      setEvents(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null): CalendarEvent[] => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      if (filterType !== 'all' && event.type !== filterType) return false;
      
      const eventStart = new Date(event.start).toISOString().split('T')[0];
      const eventEnd = new Date(event.end).toISOString().split('T')[0];
      
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'periodo':
        return '#3b82f6'; // Azul
      case 'quiz':
        return '#10b981'; // Verde
      case 'evaluacion':
        return '#f59e0b'; // Naranja
      default:
        return '#6b7280';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'periodo':
        return 'Periodo';
      case 'quiz':
        return 'Quiz';
      case 'evaluacion':
        return 'Evaluación';
      default:
        return type;
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const days = getDaysInMonth(currentDate);

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-loading">
          <p>Cargando eventos del calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title-section">
          <h2 className="calendar-title">Calendario Académico</h2>
          <p className="calendar-subtitle">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </p>
        </div>
        
        <div className="calendar-controls">
          <div className="calendar-filters">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Todos
            </button>
            <button
              className={`filter-btn ${filterType === 'periodo' ? 'active' : ''}`}
              onClick={() => setFilterType('periodo')}
              style={{ backgroundColor: filterType === 'periodo' ? '#3b82f6' : 'transparent', color: filterType === 'periodo' ? 'white' : '#3b82f6' }}
            >
              Periodos
            </button>
            <button
              className={`filter-btn ${filterType === 'quiz' ? 'active' : ''}`}
              onClick={() => setFilterType('quiz')}
              style={{ backgroundColor: filterType === 'quiz' ? '#10b981' : 'transparent', color: filterType === 'quiz' ? 'white' : '#10b981' }}
            >
              Quizzes
            </button>
            <button
              className={`filter-btn ${filterType === 'evaluacion' ? 'active' : ''}`}
              onClick={() => setFilterType('evaluacion')}
              style={{ backgroundColor: filterType === 'evaluacion' ? '#f59e0b' : 'transparent', color: filterType === 'evaluacion' ? 'white' : '#f59e0b' }}
            >
              Evaluaciones
            </button>
          </div>
          
          <div className="calendar-navigation">
            <button onClick={previousMonth} className="nav-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goToToday} className="today-btn">
              Hoy
            </button>
            <button onClick={nextMonth} className="nav-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
          <span>Periodos</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
          <span>Quizzes</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Evaluaciones</span>
        </div>
      </div>

      <div className="calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = day && 
            day.toDateString() === new Date().toDateString();
          const isCurrentMonth = day && 
            day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={index}
              className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
            >
              {day && (
                <>
                  <div className="day-number">{day.getDate()}</div>
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={event.id}
                        className="event-dot"
                        style={{ backgroundColor: getEventColor(event.type) }}
                        title={`${getEventTypeLabel(event.type)}: ${event.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="event-more">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <h3>{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)} className="close-btn">×</button>
            </div>
            <div className="event-modal-body">
              <div className="event-detail-row">
                <span className="event-detail-label">Tipo:</span>
                <span 
                  className="event-detail-value"
                  style={{ color: getEventColor(selectedEvent.type) }}
                >
                  {getEventTypeLabel(selectedEvent.type)}
                </span>
              </div>
              {selectedEvent.curso && (
                <div className="event-detail-row">
                  <span className="event-detail-label">Curso:</span>
                  <span className="event-detail-value">{selectedEvent.curso}</span>
                </div>
              )}
              {selectedEvent.materia && (
                <div className="event-detail-row">
                  <span className="event-detail-label">Materia:</span>
                  <span className="event-detail-value">{selectedEvent.materia}</span>
                </div>
              )}
              {selectedEvent.periodo && (
                <div className="event-detail-row">
                  <span className="event-detail-label">Periodo:</span>
                  <span className="event-detail-value">{selectedEvent.periodo}</span>
                </div>
              )}
              {selectedEvent.subtema && (
                <div className="event-detail-row">
                  <span className="event-detail-label">Subtema:</span>
                  <span className="event-detail-value">{selectedEvent.subtema}</span>
                </div>
              )}
              <div className="event-detail-row">
                <span className="event-detail-label">Fecha de inicio:</span>
                <span className="event-detail-value">
                  {new Date(selectedEvent.start).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="event-detail-row">
                <span className="event-detail-label">Fecha de fin:</span>
                <span className="event-detail-value">
                  {new Date(selectedEvent.end).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





