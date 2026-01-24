'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const topBar = document.querySelector('.top-bar');
      const topBarHeight = topBar ? topBar.offsetHeight : 60;
      setIsScrolled(scrollPosition >= topBarHeight);
    };

    // Ejecutar una vez al montar
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="header">
      {/* Top Bar - Contact Information */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="contact-info">
            <span className="contact-item">
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{t('header.phone')}</span>
            </span>
            <span className="contact-item">
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{t('header.email')}</span>
            </span>
            <span className="contact-item">
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{t('header.address')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <motion.nav 
        className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}
        initial={false}
        animate={{
          boxShadow: isScrolled 
            ? '0 4px 20px rgba(0, 0, 0, 0.15)' 
            : '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {isMobileMenuOpen && (
          <div 
            className="mobile-menu-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <div className="navbar-content">
          <div className="navbar-left">
            <Link href="/" className="logo-container" onClick={() => setIsMobileMenuOpen(false)}>
              <Image
                src="/images/logo.svg"
                alt="Colegio Nueva Logo"
                width={80}
                height={80}
                priority
              />
            </Link>
          </div>
          <div className="navbar-right">
            <ul className="nav-links">
              <li><Link href="/">{t('header.home')}</Link></li>
              <li><Link href="/about">{t('header.whoWeAre')}</Link></li>
              <li><Link href="/academics">{t('header.academicOffer')}</Link></li>
              <li><Link href="/community">{t('header.community')}</Link></li>
            </ul>
            <div className="language-selector">
              <button
                className={`lang-btn ${language === 'es' ? 'active' : ''}`}
                onClick={() => setLanguage('es')}
                aria-label="Español"
              >
                🇪🇸
              </button>
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
                aria-label="English"
              >
                🇬🇧
              </button>
            </div>
            <Link href="/aula-virtual" className="virtual-classroom-btn">
              {t('header.virtualClassroom')}
            </Link>
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="hamburger-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          {/* Mobile Menu */}
          <div className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            <div className="mobile-menu-header">
              <h2 className="mobile-menu-title">Menú</h2>
              <button 
                className="mobile-menu-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="mobile-nav-links">
              <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)}>{t('header.home')}</Link></li>
              <li><Link href="/about" onClick={() => setIsMobileMenuOpen(false)}>{t('header.whoWeAre')}</Link></li>
              <li><Link href="/academics" onClick={() => setIsMobileMenuOpen(false)}>{t('header.academicOffer')}</Link></li>
              <li><Link href="/community" onClick={() => setIsMobileMenuOpen(false)}>{t('header.community')}</Link></li>
            </ul>
            <div className="mobile-menu-actions">
              <div className="language-selector">
                <button
                  className={`lang-btn ${language === 'es' ? 'active' : ''}`}
                  onClick={() => setLanguage('es')}
                  aria-label="Español"
                >
                  🇪🇸
                </button>
                <button
                  className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en')}
                  aria-label="English"
                >
                  🇬🇧
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>
    </header>
  );
}

