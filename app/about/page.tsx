'use client';

import Image from 'next/image';
import Link from 'next/link';
import '../css/about.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function About() {
  const { t } = useLanguage();
  
  return (
    <main className="about-main">
      <div className="about-container">
        {/* Hero Section */}
        <div className="about-hero">
          <h1 className="about-title">{t('about.title')}</h1>
          <p className="about-subtitle">{t('about.subtitle')}</p>
        </div>

        {/* Mission Section */}
        <div className="about-section">
          <div className="about-content">
            <div className="about-text">
              <h2 className="section-title">{t('about.missionTitle')}</h2>
              <div className="section-separator"></div>
              <p className="section-description">
                {t('about.missionDescription')}
              </p>
            </div>
            <div className="about-image-wrapper">
              <div className="about-image-placeholder">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Section */}
        <div className="about-section about-section-alt">
          <div className="about-content about-content-reverse">
            <div className="about-image-wrapper">
              <div className="about-image-placeholder">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="about-text">
              <h2 className="section-title">{t('about.visionTitle')}</h2>
              <div className="section-separator"></div>
              <p className="section-description">
                {t('about.visionDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="about-section">
          <div className="values-header">
            <h2 className="section-title">{t('about.valuesTitle')}</h2>
            <div className="section-separator"></div>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="value-title">{t('about.value1Title')}</h3>
              <p className="value-description">{t('about.value1Description')}</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="value-title">{t('about.value2Title')}</h3>
              <p className="value-description">{t('about.value2Description')}</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="value-title">{t('about.value3Title')}</h3>
              <p className="value-description">{t('about.value3Description')}</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="value-title">{t('about.value4Title')}</h3>
              <p className="value-description">{t('about.value4Description')}</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="about-cta">
          <h2 className="cta-title">{t('about.ctaTitle')}</h2>
          <p className="cta-description">{t('about.ctaDescription')}</p>
          <div className="cta-buttons">
            <Link href="/matriculas-presenciales" className="cta-button cta-button-primary">
              {t('about.ctaButton1')}
            </Link>
            <Link href="/aula-virtual" className="cta-button cta-button-secondary">
              {t('about.ctaButton2')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

