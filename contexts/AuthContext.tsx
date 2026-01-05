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
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

