import supabase, { getBooksInFolder } from '@/lib/supabase';
import { Book } from '@/types';

export async function fetchUserBooksAndFolders(userId: string, parentFolderId: string) {
  // Fetch folders with the specified parent_id
  const foldersRes = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId);
  if (foldersRes.error) throw foldersRes.error;

  const folders = (foldersRes.data || [])
    .filter(folder => folder.parent_id === parentFolderId)
    .map(folder => ({ ...folder, isFolder: true }));

  // Now get the books in the folder
  const books: Book[] = await getBooksInFolder(parentFolderId, userId);

  return [...folders, ...books];
}


export const deleteUserBook = async (id: string) => {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
};