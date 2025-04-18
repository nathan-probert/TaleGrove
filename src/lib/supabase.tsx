import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Book, Folder } from '@/types';

const supabase = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

export default supabase;

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

export async function resetPasswordForEmail(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
  });

  if (error) {
    console.error('Password reset error:', error);
    throw new Error(error.message);
  }
  return true;
}

export async function updatePassword(
  newPassword: string
): Promise<boolean> {
  const { error } = await supabase.auth.updateUser(
    { password: newPassword }
  );

  if (error) {
    console.error('Password update error:', error);
    throw new Error(error.message);
  }

  return true;
}

export async function updateEmail(newEmail: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    console.error('Email update error:', error);
    throw new Error(error.message);
  }
  return true;
}

// Book related functions
export async function addBook(bookData: Book): Promise<Book> {
  bookData.id = undefined; // Ensure ID is not set, as it will be auto-generated by Supabase

  const { data, error } = await supabase
    .from('books')
    .insert([
      {
        title: bookData.title,
        author: bookData.author,
        user_id: bookData.user_id,
        status: bookData.status,
        rating: bookData.rating ?? null,
        notes: bookData.notes ?? null,
        book_id: bookData.book_id ?? null,
        isbn: bookData.isbn ?? null,
        cover_url: bookData.cover_url ?? null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBook(bookId: string, userId: string) {
  console.log('Deleting book with ID:', bookId, 'for user ID:', userId);

  const { error, count } = await supabase
    .from('books')
    .delete({ count: 'exact' })
    .eq('id', bookId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }

  return (count ?? 0) > 0;
}

export async function checkIfBookInCollection(bookId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('books')
    .select('id') // Select the primary key 'id'
    .eq('user_id', userId)
    .eq('book_id', bookId) // Filter by the external book_id
    .limit(1)
    .single(); // Use single() to get one record or null

  if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (No rows found)
    console.error('Error checking book collection:', error);
    throw error;
  }

  return data?.id ?? null; // Return the internal 'id' or null if not found
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

// helper to create slug
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphen
    .replace(/(^-|-$)+/g, '');   // trim hyphens
}

export async function createFolder(name: string, userId: string, parentId: string | null = null) {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name, user_id: userId, parent_id: parentId, slug: slugify(name) }])
    .single();

  if (error) throw error;
  return data;
}

export async function addBookToFolder(bookId: string, oldFolderId: string, folderId: string | null, userId: string) {
  let data: any = null;

  if (folderId !== "null") {
    const { data, error } = await supabase
      .from('folder_books')
      .insert([{ book_id: bookId, folder_id: folderId, user_id: userId }]);

    if (error) throw error;
  }

  // remove from old folder if it exists
  if (oldFolderId) {
    await supabase
      .from('folder_books')
      .delete()
      .eq('book_id', bookId)
      .eq('folder_id', oldFolderId)
      .eq('user_id', userId);
  }

  return data;
}

export async function addBookToFolders(bookId: string, folderIds: string[], userId: string) {
  const recordsToInsert = folderIds
    .filter(folderId => folderId && folderId.trim() !== "")
    .map(folderId => ({
      book_id: bookId,
      folder_id: folderId,
      user_id: userId,
    }));
  if (recordsToInsert.length === 0) return null;

  const { data, error } = await supabase
    .from('folder_books')
    .insert(recordsToInsert);

  if (error) {
    console.error('Error adding book to folders:', error);
    throw error;
  }

  return data;
}

export async function removeBookFromFolders(bookId: string, folderIds: string[], userId: string) {
  const { error } = await supabase
    .from('folder_books')
    .delete()
    .eq('book_id', bookId)
    .in('folder_id', folderIds)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing book from folders:', error);
    throw error;
  }
  return true;
}

export async function createRootFolder(userId: string) {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name: 'Root', user_id: userId, parent_id: null, slug: 'root' }])
    .single();

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

  return data?.map(entry => entry.books as unknown as Book) ?? [];
}

export async function getUserFolders(userId: string) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function fetchUserFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*') // Select all columns to match the Folder type
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch folders:', error);
    return [];
  }

  return data;
}

export async function getRootId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('folders')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', "root")
    .single();

  if (error) throw error;
  return data?.id ?? null;
}

export async function getFoldersFromBook(bookId: string, userId: string) {
  const { data, error } = await supabase
    .from('folder_books')
    .select('folders(*)')
    .eq('book_id', bookId)
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map(entry => entry.folders as unknown as Folder) ?? [];
}