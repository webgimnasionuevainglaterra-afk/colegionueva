import { supabase } from './supabase-client';

/**
 * Ejemplo de funciones helper para trabajar con Supabase
 * Puedes expandir estas funciones según tus necesidades
 */

// Ejemplo: Obtener datos de una tabla
export async function getTableData(tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*');
  
  if (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
  
  return data;
}

// Ejemplo: Insertar datos en una tabla
export async function insertData(tableName: string, data: any) {
  const { data: insertedData, error } = await supabase
    .from(tableName)
    .insert(data)
    .select();
  
  if (error) {
    console.error('Error inserting data:', error);
    throw error;
  }
  
  return insertedData;
}

// Ejemplo: Actualizar datos
export async function updateData(tableName: string, id: string, updates: any) {
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error updating data:', error);
    throw error;
  }
  
  return data;
}

// Ejemplo: Eliminar datos
export async function deleteData(tableName: string, id: string) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

// Ejemplo: Autenticación - Iniciar sesión
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing in:', error);
    throw error;
  }
  
  return data;
}

// Ejemplo: Autenticación - Registro
export async function signUp(email: string, password: string, metadata?: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  
  if (error) {
    console.error('Error signing up:', error);
    throw error;
  }
  
  return data;
}

// Ejemplo: Cerrar sesión
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Ejemplo: Obtener usuario actual
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    throw error;
  }
  
  return user;
}









