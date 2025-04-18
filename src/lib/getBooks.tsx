import supabase from '@/lib/supabase';
import { Book } from '@/types';

export async function fetchUserBooksAndFolders(userId: string, parentFolderId: string | null = null) {
  // Fetch folders with the specified parent_id
  let foldersQuery = supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId);

  if (parentFolderId === null) {
    foldersQuery = foldersQuery.is('parent_id', null);
  } else {
    foldersQuery = foldersQuery.eq('parent_id', parentFolderId);
  }

  const foldersRes = await foldersQuery;
  if (foldersRes.error) throw foldersRes.error;

  const folders = (foldersRes.data || []).map(folder => ({ ...folder, isFolder: true }));

  let books: Book[] = [];

  if (parentFolderId === null) {
    // Fetch all user's book IDs
    const allBooksRes = await supabase
      .from('books')
      .select('id')
      .eq('user_id', userId);

    if (allBooksRes.error) throw allBooksRes.error;

    const allUserBookIds = new Set((allBooksRes.data || []).map(b => b.id));

    // Fetch all book_ids that are in any folder
    const userFoldersRes = await supabase.from('folders').select('id').eq('user_id', userId);
    if (userFoldersRes.error) throw userFoldersRes.error;

    const userFolderIds = (userFoldersRes.data || []).map(f => f.id);

    let bookIdsInFolders = new Set<string>();
    if (userFolderIds.length > 0) {
      const bookLinksRes = await supabase
        .from('folder_books')
        .select('book_id')
        .in('folder_id', userFolderIds);

      if (bookLinksRes.error) throw bookLinksRes.error;

      bookIdsInFolders = new Set((bookLinksRes.data || []).map(link => link.book_id));
    }

    const rootBookIds = [...allUserBookIds].filter(id => !bookIdsInFolders.has(id));

    if (rootBookIds.length > 0) {
      const rootBooksRes = await supabase
        .from('books')
        .select('*')
        .in('id', rootBookIds);

      if (rootBooksRes.error) throw rootBooksRes.error;
      books = rootBooksRes.data || [];
    }
  } else {
    // Inside a folder: get book_ids from the join table for this folder
    const bookLinksRes = await supabase
      .from('folder_books')
      .select('book_id')
      .eq('folder_id', parentFolderId);

    if (bookLinksRes.error) throw bookLinksRes.error;

    const bookIds = (bookLinksRes.data || []).map(link => link.book_id);

    if (bookIds.length > 0) {
      const booksRes = await supabase
        .from('books')
        .select('*')
        .in('id', bookIds);

      if (booksRes.error) throw booksRes.error;
      books = booksRes.data || [];
    }
  }

  return [...folders, ...books];
}


export const deleteUserBook = async (id: string) => {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
};