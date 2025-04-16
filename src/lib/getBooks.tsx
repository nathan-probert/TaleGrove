import supabase from '@/lib/supabase';
import { Book } from '@/types';

export const fetchUserBooks = async (userId: string): Promise<Book[]> => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteUserBook = async (id: string) => {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
};