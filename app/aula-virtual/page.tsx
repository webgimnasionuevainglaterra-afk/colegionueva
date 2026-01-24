'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../css/login.css';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

export default function AulaVirtual() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
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
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="password-toggle-button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox-input" />
                <span>{t('login.rememberSession')}</span>
              </label>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="forgot-password"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {t('login.forgotPassword')}
              </button>
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Iniciando sesión...' : t('login.signIn')}
            </button>
          </form>
        </div>
      </div>

      {/* Modal de Recuperar Contraseña */}
      <ForgotPasswordModal 
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </main>
  );
}

