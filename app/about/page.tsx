'use client';

import Link from 'next/link';
import '../css/about.css';
import { useLanguage } from '@/contexts/LanguageContext';
import EditableText from '@/components/EditableText';
import EditableImage from '@/components/EditableImage';

export default function About() {
  const { t } = useLanguage();
  
  return (
    <main className="about-main">
      <div className="about-container">
        {/* Hero Section */}
        <div className="about-hero">
          <EditableText contentKey="about-title" tag="h1" className="about-title">
            {t('about.title')}
          </EditableText>
          <EditableText contentKey="about-subtitle" tag="p" className="about-subtitle">
            {t('about.subtitle')}
          </EditableText>
        </div>

        {/* Mission Section */}
        <div className="about-section">
          <div className="about-content">
            <div className="about-text">
              <EditableText contentKey="about-mission-title" tag="h2" className="section-title">
                {t('about.missionTitle')}
              </EditableText>
              <div className="section-separator"></div>
              <EditableText contentKey="about-mission-description" tag="p" className="section-description">
                {t('about.missionDescription')}
              </EditableText>
            </div>
            <div className="about-image-wrapper">
              <EditableImage
                src="/images/about/mission.jpg"
                alt="Misión"
                width={600}
                height={400}
                className="about-image"
                contentKey="about-mission-image"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Vision Section */}
        <div className="about-section about-section-alt">
          <div className="about-content about-content-reverse">
            <div className="about-image-wrapper">
              <EditableImage
                src="/images/about/vision.jpg"
                alt="Visión"
                width={600}
                height={400}
                className="about-image"
                contentKey="about-vision-image"
                unoptimized
              />
            </div>
            <div className="about-text">
              <EditableText contentKey="about-vision-title" tag="h2" className="section-title">
                {t('about.visionTitle')}
              </EditableText>
              <div className="section-separator"></div>
              <EditableText contentKey="about-vision-description" tag="p" className="section-description">
                {t('about.visionDescription')}
              </EditableText>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="about-section">
          <div className="values-header">
            <EditableText contentKey="about-values-title" tag="h2" className="section-title">
              {t('about.valuesTitle')}
            </EditableText>
            <div className="section-separator"></div>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <EditableText contentKey="about-value-1-title" tag="h3" className="value-title">
                {t('about.value1Title')}
              </EditableText>
              <EditableText contentKey="about-value-1-description" tag="p" className="value-description">
                {t('about.value1Description')}
              </EditableText>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <EditableText contentKey="about-value-2-title" tag="h3" className="value-title">
                {t('about.value2Title')}
              </EditableText>
              <EditableText contentKey="about-value-2-description" tag="p" className="value-description">
                {t('about.value2Description')}
              </EditableText>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <EditableText contentKey="about-value-3-title" tag="h3" className="value-title">
                {t('about.value3Title')}
              </EditableText>
              <EditableText contentKey="about-value-3-description" tag="p" className="value-description">
                {t('about.value3Description')}
              </EditableText>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <EditableText contentKey="about-value-4-title" tag="h3" className="value-title">
                {t('about.value4Title')}
              </EditableText>
              <EditableText contentKey="about-value-4-description" tag="p" className="value-description">
                {t('about.value4Description')}
              </EditableText>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="about-cta">
          <EditableText contentKey="about-cta-title" tag="h2" className="cta-title">
            {t('about.ctaTitle')}
          </EditableText>
          <EditableText contentKey="about-cta-description" tag="p" className="cta-description">
            {t('about.ctaDescription')}
          </EditableText>
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

