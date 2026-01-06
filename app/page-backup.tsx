'use client';

import Image from 'next/image';
import Link from 'next/link';
import '../css/home.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  return (
    <main className="home-main">
      <div className="home-container">
        <div className="cards-grid">
          {/* Tarjeta Matrículas Presenciales */}
          <div className="card card-presencial">
            <div className="card-overlay"></div>
            <div className="card-body">
              <h2 className="card-title">{t('home.presentialEnrollment')}</h2>
              <p className="card-description">
                {t('home.presentialDescription')}
              </p>
              <Link href="/matriculas-presenciales" className="card-button">
                {t('home.seeMore')}
              </Link>
            </div>
          </div>

          {/* Tarjeta Aula Virtual */}
          <div className="card card-virtual">
            <div className="card-overlay"></div>
            <div className="card-body">
              <h2 className="card-title">{t('home.virtualClassroom')}</h2>
              <p className="card-description">
                {t('home.virtualDescription')}
              </p>
              <Link href="/aula-virtual" className="card-button">
                {t('home.seeCourses')}
              </Link>
            </div>
          </div>
        </div>
        
        {/* Banner */}
        <div className="banner-container">
          <Image
            src="/images/banner.jpg"
            alt="Banner"
            width={1200}
            height={400}
            className="banner-image"
            priority
            unoptimized
          />
        </div>

        {/* Sección Video y Contenido */}
        <div className="video-section">
          <div className="video-content">
            <div className="video-text">
              <span className="video-badge">{t('home.digitalTransformation')}</span>
              <h2 className="video-title">{t('home.transformYourFuture')}</h2>
              <h3 className="video-subtitle">{t('home.transformSubtitle')}</h3>
              <p className="video-description">
                {t('home.transformDescription')}
              </p>
              <div className="video-features">
                <div className="video-feature">
                  <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('home.certificateOnCompletion')}</span>
                </div>
                <div className="video-feature">
                  <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('home.unlimitedAccess')}</span>
                </div>
              </div>
            </div>
            <div className="video-wrapper">
              <iframe
                className="video-iframe"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Video educativo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>

        {/* Galería de Imágenes */}
        <div className="gallery-section">
          <h2 className="gallery-title">{t('home.unforgettableMoments')}</h2>
          <div className="gallery-separator"></div>
          <div className="gallery-grid">
            <div className="gallery-item">
              <Image
                src="/images/gallery/img1.jpg"
                alt="Galería 1"
                width={400}
                height={300}
                className="gallery-image"
                unoptimized
              />
            </div>
            <div className="gallery-item">
              <Image
                src="/images/gallery/img2.jpg"
                alt="Galería 2"
                width={400}
                height={300}
                className="gallery-image"
                unoptimized
              />
            </div>
            <div className="gallery-item">
              <Image
                src="/images/gallery/img3.jpg"
                alt="Galería 3"
                width={400}
                height={300}
                className="gallery-image"
                unoptimized
              />
            </div>
            <div className="gallery-item">
              <Image
                src="/images/gallery/img4.jpg"
                alt="Galería 4"
                width={400}
                height={300}
                className="gallery-image"
                unoptimized
              />
            </div>
            <div className="gallery-item">
              <Image
                src="/images/gallery/img5.jpg"
                alt="Galería 5"
                width={400}
                height={300}
                className="gallery-image"
                unoptimized
              />
            </div>
            <div className="gallery-item">
              <Image
                src="/images/gallery/img6.jpg"
                alt="Galería 6"
                width={400}
                height={300}
                className="gallery-image"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Sección de Testimonios */}
        <div className="testimonials-section">
          <h2 className="testimonials-title">{t('home.whatStudentsSay')}</h2>
          <div className="testimonials-separator"></div>
          <div className="testimonials-carousel">
            <div className="testimonials-track">
              <div className="testimonial-card">
                <div className="testimonial-avatar" style={{ background: '#f97316' }}>
                  <span>AG</span>
                </div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="star-icon" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <h3 className="testimonial-name">{t('testimonials.anaGarcia')}</h3>
                <p className="testimonial-role">{t('testimonials.student')}</p>
                <p className="testimonial-quote">{t('testimonials.testimonial1')}</p>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-avatar" style={{ background: '#9333ea' }}>
                  <span>LF</span>
                </div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="star-icon" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <h3 className="testimonial-name">{t('testimonials.luisFernandez')}</h3>
                <p className="testimonial-role">{t('testimonials.student')}</p>
                <p className="testimonial-quote">{t('testimonials.testimonial2')}</p>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153))' }}>
                  <span>JM</span>
                </div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="star-icon" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <h3 className="testimonial-name">{t('testimonials.juanMartinez')}</h3>
                <p className="testimonial-role">{t('testimonials.student')}</p>
                <p className="testimonial-quote">{t('testimonials.testimonial3')}</p>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-avatar" style={{ background: '#3b82f6' }}>
                  <span>MR</span>
                </div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="star-icon" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <h3 className="testimonial-name">{t('testimonials.mariaRodriguez')}</h3>
                <p className="testimonial-role">{t('testimonials.student')}</p>
                <p className="testimonial-quote">{t('testimonials.testimonial4')}</p>
              </div>
              {/* Duplicar tarjetas para efecto infinito */}
              <div className="testimonial-card">
                <div className="testimonial-avatar" style={{ background: '#f97316' }}>
                  <span>AG</span>
                </div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="star-icon" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <h3 className="testimonial-name">{t('testimonials.anaGarcia')}</h3>
                <p className="testimonial-role">{t('testimonials.student')}</p>
                <p className="testimonial-quote">{t('testimonials.testimonial1')}</p>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-avatar" style={{ background: '#9333ea' }}>
                  <span>LF</span>
                </div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="star-icon" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <h3 className="testimonial-name">{t('testimonials.luisFernandez')}</h3>
                <p className="testimonial-role">{t('testimonials.student')}</p>
                <p className="testimonial-quote">{t('testimonials.testimonial2')}</p>
              </div>
            </div>
          </div>
          <div className="testimonials-button-container">
            <Link href="/matriculas" className="testimonials-button">
              {t('home.openEnrollment')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
