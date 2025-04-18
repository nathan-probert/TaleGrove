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
        book_id: bookData.book_id ?? null,
        isbn: bookData.isbn ?? null,
        cover_url: bookData.cover_url ?? null,
      },
    ])
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBook(bookId: string, userId: string) {
  console.log('Deleting book with ID:', bookId, 'for user ID:', userId);

  const { error, count } = await supabase
    .from('books')
    .delete({ count: 'exact' })
    .eq('book_id', bookId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }

  return (count ?? 0) > 0;
}

export async function checkIfBookInCollection(bookId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('books')
    .select('book_id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .limit(1);

  if (error) {
    console.error('Error checking book collection:', error);
    throw error;
  }

  return data !== null && data.length > 0;
}

export async function changeBookCover(bookId: string, userId: string, coverUrl: string) {
  console.log('Changing cover for book with ID:', bookId, 'to URL:', coverUrl, 'for user ID:', userId);
  const { error } = await supabase
    .from('books')
    .update({ cover_url: coverUrl })
    .eq('book_id', bookId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error changing book cover:', error);
    throw error;
  }
  return true;
}

export async function createFolder(name: string, userId: string, parentId: string | null = null) {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name, user_id: userId, parent_id: parentId }])
    .single();

  if (error) throw error;
  return data;
}

export async function addBookToFolder(bookId: string, folderId: string, userId: string) {
  const { data, error } = await supabase
    .from('folder_books')
    .insert([{ book_id: bookId, folder_id: folderId, user_id: userId }]);

  if (error) throw error;
  return data;
}

export async function removeBookFromFolder(bookId: string, folderId: string, userId: string) {
  const { error } = await supabase
    .from('folder_books')
    .delete()
    .eq('book_id', bookId)
    .eq('folder_id', folderId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

export async function getBooksInFolder(folderId: string, userId: string) {
  const { data, error } = await supabase
    .from('folder_books')
    .select('books(*)')
    .eq('folder_id', folderId)
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map(entry => entry.books) ?? [];
}

export async function getUserFolders(userId: string) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}
