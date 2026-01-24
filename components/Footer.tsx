'use client';

import Image from 'next/image';
import Link from 'next/link';
import '../css/footer.css';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-container">
          <div className="footer-content">
            {/* Columna Izquierda - Logo y Descripción */}
            <div className="footer-column footer-logo-column">
              <div className="footer-logo-wrapper">
                <Image
                  src="/images/logo.svg"
                  alt="Logo Nueva Inglaterra"
                  width={80}
                  height={80}
                  className="footer-logo"
                  unoptimized
                />
                <p className="footer-description">
                  {t('footer.description')}
                </p>
              </div>
            </div>

            {/* Columna Centro - Enlaces Rápidos */}
            <div className="footer-column">
              <h3 className="footer-title">{t('footer.quickLinks')}</h3>
              <ul className="footer-links">
                <li>
                  <Link href="/aula-virtual">{t('header.virtualClassroom')}</Link>
                </li>
                <li>
                  <Link href="/iniciar-sesion">{t('footer.logIn')}</Link>
                </li>
              </ul>
            </div>

            {/* Columna Derecha - Contacto */}
            <div className="footer-column">
              <h3 className="footer-title">{t('footer.contact')}</h3>
              <ul className="footer-contact">
                <li>{t('header.email')}</li>
                <li>{t('header.phone')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Inferior */}
      <div className="footer-bottom">
        <div className="footer-container">
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              © 2026 Nueva Inglaterra. Creada por{' '}
              <a 
                href="https://www.iddodevs.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-iddodevs-link"
              >
                Iddodevs
              </a>
            </p>
            <div className="footer-legal">
              <Link href="/privacidad">{t('footer.privacy')}</Link>
              <Link href="/terminos">{t('footer.terms')}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

