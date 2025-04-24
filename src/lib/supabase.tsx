import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Book, Folder, BookStatus, UserBookData, BookRecommendation } from '@/types';
import { UserResponse } from '@supabase/supabase-js';

const supabase = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

export default supabase;

// Auth related functions
export async function signUpWithEmail(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password
  });
}

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

export async function getSession() {
  return await supabase.auth.getSession();
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
): Promise<UserResponse> {
  return await supabase.auth.updateUser(
    { password: newPassword }
  );
}

// Book related functions
export async function addBook(bookData: Book): Promise<Book> {
  // Remove the ID from the bookData object before inserting as it is auto-generated
  const { id, ...insertData } = bookData;

  const { data, error } = await supabase
    .from('books')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBook(bookId: string, userId: string) {

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

export async function checkIfBookInCollection(bookId: string, userId: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle(); // returns null if not found, without error

  if (error) {
    console.error('Error checking book collection:', error);
    throw error;
  }

  return data as Book | null;
}

export async function updateBookDetails(
  bookId: string,
  updates: { status: BookStatus; rating: number | null; notes: string },
  userId: string
) {
  const { data, error } = await supabase
    .from('books')
    .update({
      status: updates.status,
      rating: updates.rating,
      notes: updates.notes,
    })
    .eq('id', bookId)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function changeBookCover(bookId: string, userId: string, coverUrl: string) {
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

export async function getParentId(folderId: string, userId: string) {
  const { data, error } = await supabase
    .from('folders')
    .select('parent_id')
    .eq('id', folderId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data?.parent_id ?? null;
}

export async function getBooksInFolder(folderId: string, userId: string) {
  const { data, error } = await supabase
    .from('folder_books')
    .select('books(*)')
    .eq('folder_id', folderId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

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

export async function deleteFolder(folderId: string, userId: string) {
  // get books in the folder to be deleted
  const books = await getBooksInFolder(folderId, userId);
  if (books.length > 0) {
    throw new Error("Cannot delete folder with books in it. Please remove the books first.");
  }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId);


  if (error) throw error;
  return true;
}

export async function addFolderToFolder(folderId: string, newParentId: string | null, userId: string) {
  console.log("folder ID:", folderId);
  console.log("New parent ID:", newParentId);
  console.log("User ID:", userId);
  
  const { data, error } = await supabase
    .from('folders')
    .update({ parent_id: newParentId })
    .eq('id', folderId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) { throw error; }

  return data;
}


// Functions for ai recommendations
export async function getUsersBooks(userId: string, yearsToCheck: number = Infinity) {
  // const columnsToReturn = `title, author, date_read, status, rating, notes`; // match UserBookData type
  const columnsToReturn = `title, author, status, rating, notes`; // match UserBookData type

  let query = supabase.from('books').select(columnsToReturn).eq('user_id', userId);
  if (yearsToCheck !== Infinity) {
    const dateThreshold = new Date(Date.now() - yearsToCheck * 365 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gt('date_read', dateThreshold);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as UserBookData[];
}

export async function saveRecommendation(
  userId: string,
  recommendation: BookRecommendation
) {
  const insertData = {
    title: recommendation.title,
    author: recommendation.author,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('book_recommendations')
    .upsert(insertData)
    .select()
    .single();

  if (error) throw error;
  return true;
}

export async function getRecommendations(userId: string) {
  const { data, error } = await supabase
    .from('book_recommendations')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data as BookRecommendation[];
}

export async function reorderBookInFolder(draggedBookId: string, targetBookId: string, folderId: string | null, userId: string) {
  // Fetch all books in the folder
  const { data: folderBooks, error } = await supabase
    .from('folder_books')
    .select('id, book_id, sort_order, folder_id')
    .eq('folder_id', folderId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error || !folderBooks) return;

  const draggedIndex = folderBooks.findIndex((b) => b.book_id === draggedBookId);
  const targetIndex = folderBooks.findIndex((b) => b.book_id === targetBookId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // Move item in the array
  const [draggedBook] = folderBooks.splice(draggedIndex, 1);
  folderBooks.splice(targetIndex, 0, draggedBook);

  // Reassign order values
  const updates = folderBooks.map((b, index) => ({
    id: b.id,
    sort_order: index + 1,
    user_id: userId,
    folder_id: b.folder_id,
    book_id: b.book_id,
  }));

  const { error: updateError } = await supabase
    .from('folder_books')
    .upsert(updates, { 
      onConflict: 'id',
      ignoreDuplicates: false
  });

  if (updateError) {
      console.error('Failed to update order:', updateError);
  }
  return updates;
}
