export interface Book {
  id?: string;
  user_id?: string;
  title: string;
  author: string;
  rating?: number | null;
  notes?: string | null;
  isbn?: string | null;
  book_id?: string | null;
  cover_url?: string | null;
  completed: boolean;
  created_at?: string;
}
