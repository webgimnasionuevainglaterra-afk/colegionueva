'use client';

import { useState } from 'react';
import '../css/community.css';
import { useLanguage } from '@/contexts/LanguageContext';
import EditableText from '@/components/EditableText';
import EditableImage from '@/components/EditableImage';

export default function Community() {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Imágenes de ejemplo - puedes reemplazarlas con imágenes reales
  const galleryImages = [
    {
      id: 1,
      src: '/images/gallery/gallery-1.jpg',
      alt: 'Actividad escolar',
      title: 'Actividad Escolar',
      description: 'Estudiantes participando en actividades educativas'
    },
    {
      id: 2,
      src: '/images/gallery/gallery-2.jpg',
      alt: 'Evento deportivo',
      title: 'Evento Deportivo',
      description: 'Competencias deportivas intercolegiales'
    },
    {
      id: 3,
      src: '/images/gallery/gallery-3.jpg',
      alt: 'Ceremonia de graduación',
      title: 'Ceremonia de Graduación',
      description: 'Celebración de nuestros graduados'
    },
    {
      id: 4,
      src: '/images/gallery/gallery-4.jpg',
      alt: 'Taller educativo',
      title: 'Taller Educativo',
      description: 'Talleres prácticos para estudiantes'
    },
    {
      id: 5,
      src: '/images/gallery/gallery-5.jpg',
      alt: 'Actividad cultural',
      title: 'Actividad Cultural',
      description: 'Presentaciones artísticas y culturales'
    },
    {
      id: 6,
      src: '/images/gallery/gallery-6.jpg',
      alt: 'Excursión educativa',
      title: 'Excursión Educativa',
      description: 'Visitas educativas y excursiones'
    },
    {
      id: 7,
      src: '/images/gallery/gallery-7.jpg',
      alt: 'Feria de ciencias',
      title: 'Feria de Ciencias',
      description: 'Proyectos científicos estudiantiles'
    },
    {
      id: 8,
      src: '/images/gallery/gallery-8.jpg',
      alt: 'Actividad comunitaria',
      title: 'Actividad Comunitaria',
      description: 'Participación en actividades comunitarias'
    }
  ];

  const openModal = (index: number) => {
    setSelectedImage(index);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  };

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % galleryImages.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + galleryImages.length) % galleryImages.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  };

  return (
    <main className="community-main" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="community-container">
        <div className="community-hero">
          <EditableText contentKey="community-title" tag="h1" className="community-title">
            {t('community.title')}
          </EditableText>
          <EditableText contentKey="community-subtitle" tag="p" className="community-subtitle">
            {t('community.subtitle')}
          </EditableText>
        </div>

        <div className="gallery-section">
          <div className="gallery-grid">
            {galleryImages.map((image, index) => (
              <div
                key={image.id}
                className="gallery-item"
                onClick={() => openModal(index)}
              >
                <div className="gallery-image-wrapper">
                  <EditableImage
                    src={image.src}
                    alt={image.alt}
                    width={400}
                    height={400}
                    className="gallery-image"
                    contentKey={`community-gallery-${image.id}`}
                    unoptimized
                  />
                  <div className="gallery-overlay">
                    <div className="gallery-info">
                      <EditableText 
                        contentKey={`community-gallery-${image.id}-title`} 
                        tag="h3" 
                        className="gallery-item-title"
                      >
                        {image.title}
                      </EditableText>
                      <EditableText 
                        contentKey={`community-gallery-${image.id}-description`} 
                        tag="p" 
                        className="gallery-item-description"
                      >
                        {image.description}
                      </EditableText>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal para ver imagen en grande */}
      {selectedImage !== null && (
        <div className="gallery-modal" onClick={closeModal}>
          <button
            className="gallery-modal-close"
            onClick={closeModal}
            aria-label="Cerrar"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            className="gallery-modal-prev"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            aria-label="Imagen anterior"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="gallery-modal-next"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            aria-label="Imagen siguiente"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-modal-image-wrapper">
              <EditableImage
                src={galleryImages[selectedImage].src}
                alt={galleryImages[selectedImage].alt}
                width={1200}
                height={800}
                className="gallery-modal-image"
                contentKey={`community-gallery-${galleryImages[selectedImage].id}`}
                unoptimized
              />
            </div>
            <div className="gallery-modal-info">
              <EditableText 
                contentKey={`community-gallery-${galleryImages[selectedImage].id}-title`} 
                tag="h2" 
                className="gallery-modal-title"
              >
                {galleryImages[selectedImage].title}
              </EditableText>
              <EditableText 
                contentKey={`community-gallery-${galleryImages[selectedImage].id}-description`} 
                tag="p" 
                className="gallery-modal-description"
              >
                {galleryImages[selectedImage].description}
              </EditableText>
              <div className="gallery-modal-counter">
                {selectedImage + 1} / {galleryImages.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
