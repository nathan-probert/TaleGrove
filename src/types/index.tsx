export interface Book {
  id?: string;
  user_id?: string;
  title: string;
  author: string;
  rating?: number | null;
  notes?: string | null;
  isbn?: string | null;
  openlibrary_id?: string | null;
  cover_id?: number | null;
  completed: boolean;
  created_at?: string;
}
