import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Book } from '@/types';


// Create a singleton Supabase client
const supabase = createPagesBrowserClient();

export default supabase;

// Optional: add some helper functions if you want
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function addBook(bookData: Book) {
  const { data, error } = await supabase
    .from('books')
    .insert([
      {
        title: bookData.title,
        author: bookData.author,
        user_id: bookData.user_id,
        completed: bookData.completed,
        rating: bookData.completed ? bookData.rating ?? null : null,
        notes: bookData.completed ? bookData.notes ?? null : null,
        openlibrary_id: bookData.openlibrary_id ?? null,
        isbn: bookData.isbn ?? null,
        cover_id: bookData.cover_id ?? null,
      },
    ])
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
  return true;
}