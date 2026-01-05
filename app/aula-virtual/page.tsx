'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../css/login.css';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function AulaVirtual() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(formData.email, formData.password);
      // Redirigir según el rol del usuario
      router.push('/dashboard');
    } catch (err: any) {
      // Traducir mensajes de error comunes
      let errorMessage = err.message || 'Error al iniciar sesión';
      
      if (err.message?.includes('Email logins are disabled') || err.message?.includes('email_disabled')) {
        errorMessage = 'Los inicios de sesión por email están deshabilitados. Por favor, habilita la autenticación por email en la configuración de Supabase (Authentication > Providers > Email).';
      } else if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')) {
        errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
      } else if (err.message?.includes('Email not confirmed') || err.message?.includes('email_not_confirmed')) {
        errorMessage = 'Email no confirmado. Por favor, verifica tu correo electrónico o contacta al administrador.';
      } else if (err.message?.includes('Too many requests')) {
        errorMessage = 'Demasiados intentos. Por favor, espera unos minutos antes de intentar nuevamente.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <main className="login-main">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">{t('login.title')}</h1>
            <p className="login-subtitle">{t('login.subtitle')}</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message" style={{ 
                color: '#ef4444', 
                backgroundColor: '#fee2e2', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t('login.email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {t('login.password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox-input" />
                <span>{t('login.rememberSession')}</span>
              </label>
              <Link href="/recuperar-contraseña" className="forgot-password">
                {t('login.forgotPassword')}
              </Link>
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Iniciando sesión...' : t('login.signIn')}
            </button>
          </form>
          <div className="login-footer">
            <p className="login-footer-text">
              {t('login.noAccount')}{' '}
              <Link href="/registro" className="login-footer-link">
                {t('login.registerHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

