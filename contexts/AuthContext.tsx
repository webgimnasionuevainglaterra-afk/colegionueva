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
      // Verificar si el usuario es el super admin por su UID
      if (userId === 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42') {
        setUserRole('super_admin');
        return;
      }

      // Verificar si el usuario es un profesor
      const { data: profesor, error: profesorError } = await supabase
        .from('profesores')
        .select('id, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (!profesorError && profesor) {
        // Si el profesor está inactivo, no permitir acceso
        if (profesor.is_active === false) {
          setUserRole(null);
          return;
        }
        setUserRole('profesor');
        return;
      }

      // Verificar si el usuario es un estudiante
      const { data: estudiante, error: estudianteError } = await supabase
        .from('estudiantes')
        .select('id, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (!estudianteError && estudiante) {
        setUserRole('estudiante');
        return;
      }

      // Si no es ninguno de los anteriores, verificar si es administrador
      const { data: admin, error: adminError } = await supabase
        .from('administrators')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();

      if (!adminError && admin) {
        setUserRole(admin.role === 'super_admin' ? 'super_admin' : 'administrator');
        return;
      }

      // Por defecto, usuario sin rol específico
      setUserRole('user');
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
      // Verificar si el usuario es un estudiante y si está activo
      try {
        const { data: estudiante, error: estudianteError } = await supabase
          .from('estudiantes')
          .select('is_active')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // Si es un estudiante y está inactivo, cerrar sesión y lanzar error
        if (estudiante && estudiante.is_active === false) {
          await supabase.auth.signOut();
          throw new Error('Tu cuenta ha sido desactivada. Por favor, contacta al administrador para más información.');
        }
      } catch (checkError: any) {
        // Si el error es el que lanzamos nosotros (estudiante inactivo), propagarlo
        if (checkError.message?.includes('desactivada')) {
          throw checkError;
        }
        // Si es otro error (por ejemplo, no es estudiante), continuar normalmente
        console.warn('Error al verificar estado del estudiante:', checkError);
      }

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

