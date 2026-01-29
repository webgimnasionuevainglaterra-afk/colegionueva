'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';

interface EditableTextProps {
  children: React.ReactNode;
  contentKey: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  onSave?: (content: string) => Promise<void>;
}

export default function EditableText({
  children,
  contentKey,
  tag = 'p',
  className = '',
  onSave,
}: EditableTextProps) {
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(children?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cargar contenido guardado desde la base de datos al montar el componente
  useEffect(() => {
    const loadSavedContent = async () => {
      try {
        const response = await fetch(`/api/content/save-editable-content?key=${contentKey}`);
        const data = await response.json();
        
        if (response.ok && data.success && data.data && data.data.content) {
          // Si hay contenido guardado, usarlo
          setContent(data.data.content);
        } else {
          // Si no hay contenido guardado, usar el children por defecto
          setContent(children?.toString() || '');
        }
      } catch (error) {
        console.error('Error al cargar contenido guardado:', error);
        // En caso de error, usar el children por defecto
        setContent(children?.toString() || '');
      } finally {
        setLoading(false);
      }
    };

    loadSavedContent();
  }, [contentKey]);

  // Actualizar si cambia children (solo si no hay contenido guardado)
  useEffect(() => {
    if (!loading) {
      // Solo actualizar si no hay contenido guardado en la BD
      const checkAndUpdate = async () => {
        try {
          const response = await fetch(`/api/content/save-editable-content?key=${contentKey}`);
          const data = await response.json();
          
          if (!(response.ok && data.success && data.data && data.data.content)) {
            // Solo actualizar si no hay contenido guardado
            setContent(children?.toString() || '');
          }
        } catch (error) {
          // En caso de error, usar el children por defecto
          setContent(children?.toString() || '');
        }
      };
      
      checkAndUpdate();
    }
  }, [children, contentKey, loading]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (isEditMode) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(content);
      } else {
        // Guardar en la API por defecto
        const response = await fetch('/api/content/save-editable-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: contentKey,
            type: 'text',
            content: content,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Error al guardar:', data);
          // Mostrar mensaje de error más específico
          if (data.error?.includes('no existe')) {
            alert('❌ Error: La tabla editable_content no existe en Supabase. Por favor, ejecuta el script SQL: supabase/create_editable_content_table.sql');
          } else if (data.error?.includes('permisos')) {
            alert('❌ Error de permisos. Verifica las políticas RLS de la tabla editable_content.');
          } else {
            alert(`❌ Error al guardar: ${data.error || 'Error desconocido'}`);
          }
          return;
        }

        console.log('✅ Contenido guardado exitosamente:', data);
      }
      setIsEditing(false);
      // Mostrar mensaje de éxito temporal
      const successMsg = document.createElement('div');
      successMsg.textContent = '✅ Guardado';
      successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 2000);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(`❌ Error al guardar el contenido: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(children?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Mientras carga, mostrar children por defecto
  if (loading) {
    const Tag = tag as any;
    return <Tag className={className}>{children}</Tag>;
  }

  if (!isEditMode) {
    // Cuando NO está en modo edición, mostrar el contenido guardado (o children si no hay guardado)
    const Tag = tag as any;
    return <Tag className={className}>{content}</Tag>;
  }

  if (isEditing) {
    return (
      <div className={`editable-text-editing ${className}`}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="editable-textarea"
          rows={tag === 'p' ? 3 : 1}
        />
        <div className="editable-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="editable-save-btn"
          >
            {saving ? 'Guardando...' : 'Guardar (Ctrl+Enter)'}
          </button>
          <button
            onClick={handleCancel}
            className="editable-cancel-btn"
          >
            Cancelar (Esc)
          </button>
        </div>
      </div>
    );
  }

  const Tag = tag as any;
  return (
    <Tag
      className={`editable-text ${className} ${isEditMode ? 'editable' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={isEditMode ? 'Doble clic para editar' : ''}
    >
      {content}
    </Tag>
  );
}

