'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;
    let subscription: any = null;

    // Obtener sesión inicial de forma asíncrona y segura
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (mounted && !error) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchUserRole(session.user.id);
          }
        }
      } catch (error) {
        console.warn('Error al obtener sesión:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Escuchar cambios en la autenticación
    try {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchUserRole(session.user.id);
          } else {
            setUserRole(null);
          }
          setLoading(false);
        }
      });

      subscription = authSubscription;
    } catch (error) {
      console.warn('Error al suscribirse a cambios de auth:', error);
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {
          // Ignorar errores al desuscribirse
        }
      }
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Por ahora, verificamos si el usuario es el super admin por su UID
      // Más adelante podemos crear una tabla de roles en Supabase
      if (userId === 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42') {
        setUserRole('super_admin');
      } else {
        // Aquí puedes agregar lógica para obtener el rol desde una tabla de usuarios
        setUserRole('user');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Si el error es "Email not confirmed" y es el super admin, intentar confirmar automáticamente
      if ((error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) && 
          email === 'webgimnasionuevainglaterra@gmail.com') {
        try {
          // Intentar confirmar el email automáticamente
          const response = await fetch('/api/auth/confirm-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42' }),
          });
          
          if (response.ok) {
            // Reintentar el login después de confirmar
            const retry = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (retry.error) {
              throw retry.error;
            }
            
            if (retry.data.user) {
              await fetchUserRole(retry.data.user.id);
            }
            return;
          }
        } catch (confirmError) {
          // Si falla la confirmación automática, mostrar mensaje
          throw new Error('Email no confirmado. Por favor, confirma tu email manualmente en Supabase o contacta al administrador.');
        }
      }
      throw error;
    }

    if (data.user) {
      await fetchUserRole(data.user.id);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

